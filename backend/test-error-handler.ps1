# PowerShell script to test Express error handler
# Run this after starting your backend server

$baseUrl = "http://localhost:3001"
$testEndpoints = @(
    @{name="Sync Error (400)"; url="/api/test-errors/test-sync-error"},
    @{name="Async Error (500)"; url="/api/test-errors/test-async-error"},
    @{name="Unexpected Error (500)"; url="/api/test-errors/test-unexpected-error"},
    @{name="Unauthorized (401)"; url="/api/test-errors/test-401"},
    @{name="Forbidden (403)"; url="/api/test-errors/test-403"},
    @{name="Not Found (404)"; url="/api/test-errors/test-404"},
    @{name="Validation Error (422)"; url="/api/test-errors/test-422"},
    @{name="JSON Error"; url="/api/test-errors/test-json-error"},
    @{name="404 Non-existent Route"; url="/api/test-errors/route-that-does-not-exist"}
)

Write-Host "`n=== Testing Express Error Handler ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Yellow

foreach ($test in $testEndpoints) {
    Write-Host "Testing: $($test.name)" -ForegroundColor Green
    Write-Host "  URL: $baseUrl$($test.url)" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$($test.url)" -Method GET -ErrorAction Stop
        Write-Host "  ✓ Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorBody = $_.ErrorDetails.Message
        
        Write-Host "  ✓ Status: $statusCode (Expected Error)" -ForegroundColor Yellow
        Write-Host "  Response: $errorBody" -ForegroundColor Gray
        
        # Check if response is JSON and properly formatted
        try {
            $json = $errorBody | ConvertFrom-Json
            
            # Verify required fields
            if ($json.success -eq $false -and $json.message -and $json.requestId) {
                Write-Host "  ✓ Proper error format (success, message, requestId)" -ForegroundColor Green
            }
            
            # Check for stack trace exposure
            if ($json.stack -and $env:NODE_ENV -eq "production") {
                Write-Host "  ⚠ WARNING: Stack trace exposed in production!" -ForegroundColor Red
            } elseif ($json.stack) {
                Write-Host "  ✓ Stack trace included (dev mode)" -ForegroundColor Cyan
            } else {
                Write-Host "  ✓ No stack trace (secure)" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ✗ Response is not valid JSON!" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Start-Sleep -Milliseconds 500
}

Write-Host "=== Test Complete ===" -ForegroundColor Cyan
Write-Host "`nWhat to look for:" -ForegroundColor Yellow
Write-Host "  1. All errors return JSON (not HTML)" -ForegroundColor Gray
Write-Host "  2. 'success: false' in all error responses" -ForegroundColor Gray
Write-Host "  3. 'requestId' present for tracking" -ForegroundColor Gray
Write-Host "  4. No stack traces in production" -ForegroundColor Gray
Write-Host "  5. Appropriate HTTP status codes" -ForegroundColor Gray
Write-Host "  6. User-friendly error messages`n" -ForegroundColor Gray
