#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive Docker API Testing Script
.DESCRIPTION
    Tests all v1 API endpoints with pagination, validates response formats,
    checks deprecation headers, and verifies error handling.
.EXAMPLE
    .\test-docker-api.ps1
#>

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001"
$passCount = 0
$failCount = 0
$testResults = @()

# ANSI color codes
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-TestHeader {
    param([string]$Message)
    Write-Host "`n$Blue═══════════════════════════════════════════════════════════$Reset" -ForegroundColor Blue
    Write-Host "$Blue  $Message$Reset" -ForegroundColor Blue
    Write-Host "$Blue═══════════════════════════════════════════════════════════$Reset" -ForegroundColor Blue
}

function Write-Pass {
    param([string]$Message)
    Write-Host "  ${Green}✓ PASS${Reset}: $Message" -ForegroundColor Green
    $script:passCount++
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  ${Red}✗ FAIL${Reset}: $Message" -ForegroundColor Red
    $script:failCount++
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ${Yellow}ℹ INFO${Reset}: $Message" -ForegroundColor Yellow
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200,
        [switch]$CheckPagination,
        [switch]$CheckDeprecation,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    try {
        $params = @{
            Uri = "$baseUrl$Url"
            Method = $Method
            UseBasicParsing = $true
            Headers = $Headers
            ErrorAction = 'Stop'
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params
        
        # Check status code
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Pass "$Name returned $ExpectedStatus"
        } else {
            Write-Fail "$Name returned $($response.StatusCode), expected $ExpectedStatus"
            return $false
        }
        
        # Check pagination format
        if ($CheckPagination -and $response.StatusCode -eq 200) {
            $content = $response.Content | ConvertFrom-Json
            
            if ($content.data -and $content.pagination) {
                Write-Pass "$Name has correct pagination structure"
                
                $page = $content.pagination
                if ($page.page -and $page.limit -and $page.PSObject.Properties['total'] -and $page.totalPages -ne $null) {
                    Write-Pass "$Name pagination has all required fields (page, limit, total, totalPages)"
                } else {
                    Write-Fail "$Name pagination missing fields. Found: $($page | ConvertTo-Json -Compress)"
                }
                
                if ($content.data -is [array]) {
                    Write-Pass "$Name data is an array with $($content.data.Count) items"
                } else {
                    Write-Fail "$Name data is not an array"
                }
            } else {
                Write-Fail "$Name missing 'data' or 'pagination' fields"
            }
        }
        
        # Check deprecation headers
        if ($CheckDeprecation) {
            if ($response.Headers["Deprecation"] -eq "true") {
                Write-Pass "$Name has Deprecation header"
            } else {
                Write-Fail "$Name missing Deprecation header"
            }
            
            if ($response.Headers["X-API-Warn"]) {
                Write-Pass "$Name has X-API-Warn header: $($response.Headers['X-API-Warn'])"
            } else {
                Write-Fail "$Name missing X-API-Warn header"
            }
        }
        
        return $true
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Pass "$Name returned expected error $ExpectedStatus"
            
            # Check error response format
            try {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
                
                if ($errorBody.error) {
                    Write-Pass "$Name error response has 'error' field"
                    
                    # Ensure no stack traces in production
                    $errorJson = $errorBody | ConvertTo-Json -Depth 5
                    if ($errorJson -match "(at\s+\S+\.\S+\s+\()" -or $errorJson -match "Error:\s+at\s+") {
                        Write-Fail "$Name error exposes stack trace"
                    } else {
                        Write-Pass "$Name error does not expose stack trace"
                    }
                } else {
                    Write-Fail "$Name error response missing 'error' field"
                }
            } catch {
                Write-Info "$Name could not parse error response"
            }
            
            return $true
        } else {
            Write-Fail "$Name threw exception: $($_.Exception.Message)"
            return $false
        }
    }
}

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

Write-Host "`n$Green╔═══════════════════════════════════════════════════════════╗$Reset"
Write-Host "$Green║       Docker API Testing Script - API Improvements       ║$Reset"
Write-Host "$Green╚═══════════════════════════════════════════════════════════╝$Reset`n"

Write-Info "Testing Docker API at: $baseUrl"
Write-Info "Ensure docker-compose is running: docker-compose up -d`n"

# Check if server is reachable
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -UseBasicParsing -TimeoutSec 5
    Write-Pass "Server is reachable (health check passed)"
} catch {
    Write-Fail "Cannot reach server at $baseUrl. Is docker-compose running?"
    Write-Host "`nRun: docker-compose up -d`n" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Test 1: API v1 Versioned Endpoints
# ============================================================================
Write-TestHeader "Test 1: API v1 Versioned Endpoints"

Test-Endpoint -Name "GET /api/v1/resources" `
    -Url "/api/v1/resources?page=1&limit=10" `
    -CheckPagination

Test-Endpoint -Name "GET /api/v1/resources (default pagination)" `
    -Url "/api/v1/resources" `
    -CheckPagination

Test-Endpoint -Name "GET /api/v1/groups" `
    -Url "/api/v1/groups?page=1&limit=5" `
    -CheckPagination

Test-Endpoint -Name "GET /api/v1/borrow-requests" `
    -Url "/api/v1/borrow-requests?page=1&limit=10" `
    -ExpectedStatus 401 # Requires auth

# ============================================================================
# Test 2: Legacy API with Deprecation Headers
# ============================================================================
Write-TestHeader "Test 2: Legacy API Deprecation Headers"

Test-Endpoint -Name "GET /api/resources (legacy)" `
    -Url "/api/resources?page=1&limit=10" `
    -CheckDeprecation `
    -CheckPagination

Test-Endpoint -Name "GET /api/groups (legacy)" `
    -Url "/api/groups" `
    -CheckDeprecation `
    -CheckPagination

# ============================================================================
# Test 3: Pagination Parameters
# ============================================================================
Write-TestHeader "Test 3: Pagination Parameters"

Test-Endpoint -Name "GET /api/v1/resources (page=2, limit=5)" `
    -Url "/api/v1/resources?page=2&limit=5" `
    -CheckPagination

Test-Endpoint -Name "GET /api/v1/resources (limit=100 max)" `
    -Url "/api/v1/resources?page=1&limit=100" `
    -CheckPagination

# Test that limit is capped at 100
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/resources?limit=200" -UseBasicParsing
    $content = $response.Content | ConvertFrom-Json
    if ($content.pagination.limit -le 100) {
        Write-Pass "Pagination limit correctly capped at 100 (requested 200, got $($content.pagination.limit))"
    } else {
        Write-Fail "Pagination limit not capped (got $($content.pagination.limit))"
    }
} catch {
    Write-Info "Could not test pagination limit cap"
}

# ============================================================================
# Test 4: New Paginated Endpoints
# ============================================================================
Write-TestHeader "Test 4: New Paginated Endpoints (API Improvements)"

# These endpoints were added in the API improvements branch
Test-Endpoint -Name "GET /api/v1/groups/:id/members" `
    -Url "/api/v1/groups/test-group-id/members?page=1&limit=10" `
    -ExpectedStatus 404 # Expected since test-group-id doesn't exist

Test-Endpoint -Name "GET /api/v1/groups/:id/resources" `
    -Url "/api/v1/groups/test-group-id/resources?page=1&limit=10" `
    -ExpectedStatus 404

Test-Endpoint -Name "GET /api/v1/resources/:id/groups" `
    -Url "/api/v1/resources/test-resource-id/groups?page=1&limit=10" `
    -ExpectedStatus 404

Test-Endpoint -Name "GET /api/v1/users/:id/groups" `
    -Url "/api/v1/users/test-user-id/groups?page=1&limit=10" `
    -CheckPagination # Public endpoint, should work

# ============================================================================
# Test 5: Error Handling
# ============================================================================
Write-TestHeader "Test 5: Error Handling"

Test-Endpoint -Name "GET /api/v1/nonexistent" `
    -Url "/api/v1/nonexistent" `
    -ExpectedStatus 404

Test-Endpoint -Name "GET /api/v1/borrow-requests (no auth)" `
    -Url "/api/v1/borrow-requests" `
    -ExpectedStatus 401

Test-Endpoint -Name "POST /api/v1/resources (no auth)" `
    -Url "/api/v1/resources" `
    -Method "POST" `
    -Body @{ title = "Test" } `
    -ExpectedStatus 401

# ============================================================================
# Test 6: Response Format Consistency
# ============================================================================
Write-TestHeader "Test 6: Response Format Consistency"

# Test that all list endpoints use "data" field (not "requests", "resources", etc.)
$endpoints = @(
    "/api/v1/resources",
    "/api/v1/groups"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -UseBasicParsing
        $content = $response.Content | ConvertFrom-Json
        
        if ($content.data) {
            Write-Pass "$endpoint uses 'data' field"
        } else {
            Write-Fail "$endpoint does not use 'data' field"
        }
        
        if ($content.requests -or $content.resources -or $content.groups) {
            Write-Fail "$endpoint uses non-standard field names"
        }
    } catch {
        Write-Info "Could not test $endpoint"
    }
}

# ============================================================================
# Test 7: Rate Limiting
# ============================================================================
Write-TestHeader "Test 7: Rate Limiting Headers"

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/resources" -UseBasicParsing
    
    if ($response.Headers["X-RateLimit-Limit"]) {
        Write-Pass "Rate limit headers present: Limit=$($response.Headers['X-RateLimit-Limit']), Remaining=$($response.Headers['X-RateLimit-Remaining'])"
    } else {
        Write-Info "No rate limit headers found (may not be configured)"
    }
} catch {
    Write-Info "Could not test rate limiting"
}

# ============================================================================
# Test 8: CORS Headers
# ============================================================================
Write-TestHeader "Test 8: CORS Headers"

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/v1/resources" -UseBasicParsing
    
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Pass "CORS headers present: $($response.Headers['Access-Control-Allow-Origin'])"
    } else {
        Write-Info "No CORS headers found"
    }
} catch {
    Write-Info "Could not test CORS headers"
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n$Blue═══════════════════════════════════════════════════════════$Reset" -ForegroundColor Blue
Write-Host "$Blue                      TEST SUMMARY                      $Reset" -ForegroundColor Blue
Write-Host "$Blue═══════════════════════════════════════════════════════════$Reset" -ForegroundColor Blue

$total = $passCount + $failCount
$passRate = if ($total -gt 0) { [math]::Round(($passCount / $total) * 100, 1) } else { 0 }

Write-Host "`n  Total Tests: $total"
Write-Host "  ${Green}Passed: $passCount${Reset}" -ForegroundColor Green
Write-Host "  ${Red}Failed: $failCount${Reset}" -ForegroundColor Red
Write-Host "  Pass Rate: $passRate%`n"

if ($failCount -eq 0) {
    Write-Host "$Green✓ All tests passed! API is working correctly.$Reset`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$Red✗ Some tests failed. Review the output above.$Reset`n" -ForegroundColor Red
    exit 1
}
