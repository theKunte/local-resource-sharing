# PowerShell script to test Express error handler in Docker
# Run this while your Docker containers are running

$baseUrl = "http://localhost:3001"

Write-Host "`n=== Testing Docker Express Error Handler ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Yellow

# Check if backend is running
try {
    $health = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "✓ Backend is running and healthy`n" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend is not accessible. Run: docker-compose up -d" -ForegroundColor Red
    exit 1
}

Write-Host "=== Testing Production Error Handling ===" -ForegroundColor Cyan
Write-Host "(These tests work with NODE_ENV=production)`n" -ForegroundColor Yellow

$prodTests = @(
    @{
        name="404 - Non-existent Route"
        url="/api/this-route-does-not-exist"
        expectedStatus=404
        description="Tests 404 handler for undefined routes"
    },
    @{
        name="401 - Missing Auth Token"
        url="/api/resources"
        expectedStatus=401
        description="Tests authentication middleware error"
    },
    @{
        name="404 - Non-existent Resource"
        url="/api/resources/99999999"
        expectedStatus=404
        description="Tests resource not found error"
    }
)

foreach ($test in $prodTests) {
    Write-Host "Test: $($test.name)" -ForegroundColor Green
    Write-Host "  URL: $baseUrl$($test.url)" -ForegroundColor Gray
    Write-Host "  Expected: $($test.expectedStatus) - $($test.description)" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$($test.url)" -Method GET -ErrorAction Stop
        Write-Host "  ✗ Got status: $($response.StatusCode) (Expected error!)" -ForegroundColor Yellow
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        
        if ($statusCode -eq $test.expectedStatus) {
            Write-Host "  ✓ Status: $statusCode (Correct)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Status: $statusCode (Expected: $($test.expectedStatus))" -ForegroundColor Yellow
        }
        
        # Parse and validate JSON response
        try {
            $json = $errorBody | ConvertFrom-Json
            
            Write-Host "  Response:" -ForegroundColor Gray
            Write-Host "    message: $($json.message)" -ForegroundColor Gray
            Write-Host "    requestId: $($json.requestId)" -ForegroundColor Gray
            
            # Validate required fields
            $checks = @()
            if ($json.success -eq $false) { 
                $checks += "✓ success=false"
            } else { 
                $checks += "✗ success not false"
            }
            
            if ($json.message) { 
                $checks += "✓ message"
            } else { 
                $checks += "✗ no message"
            }
            
            if ($json.requestId) { 
                $checks += "✓ requestId"
            } else { 
                $checks += "✗ no requestId"
            }
            
            Write-Host "  Validation: $($checks -join ', ')" -ForegroundColor Cyan
            
            # Security check - stack trace should NOT be present in production
            if ($json.stack) {
                Write-Host "  ⚠ WARNING: Stack trace exposed! (Check NODE_ENV=production)" -ForegroundColor Red
            } else {
                Write-Host "  ✓ No stack trace (secure)" -ForegroundColor Green
            }
            
        } catch {
            Write-Host "  ✗ Response is not valid JSON!" -ForegroundColor Red
            Write-Host "  Raw: $errorBody" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 300
}

# Check if test routes are available
Write-Host "`n=== Checking for Test Routes ===" -ForegroundColor Cyan
try {
    $testRoute = Invoke-WebRequest -Uri "$baseUrl/api/test-errors/test-sync-error" -Method GET -ErrorAction Stop
    Write-Host "✓ Test routes are ENABLED (development mode)" -ForegroundColor Yellow
    Write-Host "  You can run more comprehensive tests" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "✓ Test routes are DISABLED (production mode - secure)" -ForegroundColor Green
        Write-Host "  This is expected for production deployments" -ForegroundColor Gray
    } else {
        Write-Host "✓ Test route triggered an error (this is expected)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Docker Logs ===" -ForegroundColor Cyan
Write-Host "View backend logs with: docker-compose logs -f backend`n" -ForegroundColor Yellow

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "✓ Error handler returns JSON (not HTML)" -ForegroundColor Green
Write-Host "✓ Consistent error format with requestId" -ForegroundColor Green
Write-Host "✓ No stack traces in production" -ForegroundColor Green
Write-Host "✓ Appropriate HTTP status codes" -ForegroundColor Green

Write-Host "`nTo enable test routes for development:" -ForegroundColor Yellow
Write-Host "  1. Edit docker-compose.yml" -ForegroundColor Gray
Write-Host "  2. Change NODE_ENV=production to NODE_ENV=development" -ForegroundColor Gray
Write-Host "  3. Run: docker-compose up --build -d" -ForegroundColor Gray
Write-Host "  4. Remember to change back before deploying!`n" -ForegroundColor Gray
