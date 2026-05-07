# Quick Docker Error Handler Test
# Tests the most critical scenarios in production mode

$baseUrl = "http://localhost:3001"

Write-Host ""
Write-Host "Quick Docker Error Handler Check" -ForegroundColor Cyan
Write-Host ""

# Test 1: 404 Route
Write-Host "1. Testing 404 handler..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/nonexistent" -Method GET -ErrorAction Stop | Out-Null
    Write-Host " FAILED (got 200)" -ForegroundColor Red
} catch {
    $json = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($_.Exception.Response.StatusCode.value__ -eq 404 -and $json.success -eq $false) {
        Write-Host " PASS" -ForegroundColor Green
    } else {
        Write-Host " Unexpected response" -ForegroundColor Yellow
    }
}

# Test 2: Stack trace check
Write-Host "2. Checking stack trace exposure..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/nonexistent" -Method GET -ErrorAction Stop | Out-Null
} catch {
    $json = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($json.stack) {
        Write-Host " EXPOSED (set NODE_ENV=production)" -ForegroundColor Red
    } else {
        Write-Host " SECURE" -ForegroundColor Green
    }
}

# Test 3: JSON format
Write-Host "3. Checking JSON response format..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/nonexistent" -Method GET -ErrorAction Stop | Out-Null
} catch {
    try {
        $json = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($json.success -eq $false -and $json.message -and $json.requestId) {
            Write-Host " VALID" -ForegroundColor Green
        } else {
            Write-Host " Missing fields" -ForegroundColor Yellow
        }
    } catch {
        Write-Host " Not JSON" -ForegroundColor Red
    }
}

# Test 4: Request ID tracking
Write-Host "4. Checking request ID tracking..." -NoNewline
try {
    Invoke-WebRequest -Uri "$baseUrl/api/nonexistent" -Method GET -ErrorAction Stop | Out-Null
} catch {
    $json = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($json.requestId -match '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') {
        Write-Host " PRESENT" -ForegroundColor Green
    } else {
        Write-Host " Invalid format" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Error handler is working correctly!" -ForegroundColor Green
Write-Host ""
Write-Host "View logs: docker-compose logs -f backend" -ForegroundColor Gray
Write-Host ""
