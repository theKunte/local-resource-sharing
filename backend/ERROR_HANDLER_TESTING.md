# Testing the Express Error Handler

## Docker Setup

Your app runs in Docker with `NODE_ENV=production`, which means:

- ✅ Stack traces are hidden (secure)
- ❌ Test routes are disabled by default
- ✅ Error handler works in production mode

### Option 1: Test in Production Mode (Recommended)

Test the error handler with real endpoints to verify production behavior:

```powershell
# Rebuild and start containers
docker-compose up --build -d

# Test with a real endpoint that might error
# Example: Try accessing a non-existent resource
curl http://localhost:3001/api/resources/99999
```

### Option 2: Enable Test Routes Temporarily

To enable test error routes in Docker, temporarily modify `docker-compose.yml`:

```yaml
backend:
  environment:
    - NODE_ENV=development # Change from production to development
```

Then rebuild:

```powershell
docker-compose up --build -d
docker-compose logs -f backend  # Should show "Test error routes enabled"
```

⚠️ **Remember to change back to production before deploying!**

## Automated Testing (Docker)

Run the Docker-specific test script:

```powershell
.\test-docker-errors.ps1
```

This will test all error scenarios and verify:

- ✅ JSON responses (not HTML)
- ✅ Consistent error format
- ✅ Request ID tracking
- ✅ Proper HTTP status codes
- ✅ No stack trace leakage in production

Or run the local test script if test routes are enabled:

```powershell
cd backend
.\test-error-handler.ps1
```

## Manual Testing with curl (Docker)

### Test with Real Endpoints (Production Mode)

These work without test routes and verify real production behavior:

```bash
# Test 404 - Non-existent route
curl http://localhost:3001/api/nonexistent

# Test 404 - Non-existent resource
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/resources/99999

# Test 401 - Missing authentication
curl http://localhost:3001/api/resources

# Test CORS error (from browser console)
fetch('http://localhost:3001/api/resources', {
  headers: { 'Origin': 'http://evil-site.com' }
})
```

### Test with Test Routes (Development Mode)

If you enabled test routes (NODE_ENV=development):

```bash
# Test 1: Sync Error (400)
curl http://localhost:3001/api/test-errors/test-sync-error

# Test 2: Async Error (500)
curl http://localhost:3001/api/test-errors/test-async-error

# Test 3: Unexpected Error (500)
curl http://localhost:3001/api/test-errors/test-unexpected-error

# Test 4: 404 Not Found
curl http://localhost:3001/api/test-errors/nonexistent

# Test 5: Different Status Codes
curl http://localhost:3001/api/test-errors/test-401  # Unauthorized
curl http://localhost:3001/api/test-errors/test-403  # Forbidden
curl http://localhost:3001/api/test-errors/test-404  # Not Found
curl http://localhost:3001/api/test-errors/test-422  # Validation Error
```

## What Good Responses Look Like

### Development Mode Response:

````json
{
  "success": false,
  "message": "This is a test synchronous error",
  "requestId": "abc123-def456-...",
  "stack": "Error: This is a test synchronous error\n    at ...",
  "error": "This is a test synchronous error"
}Docker Logs

Watch Docker logs for structured error logs with request context:
```powershell
# Follow backend logs
docker-compose logs -f backend

# View recent logs
docker-compose logs --tail=50 backend
````

You should see structured error logs:

```
[WARN] Operational error occurred {
  requestId: "...",
  method: "GET",
  url: "/api/resources/99999",
  statusCode: 404bc123-def456-..."
}
```

## Checking Server Logs

Watch your terminal for structured error logs with request context:

```
[WARN] Operational error occurred {
  requestId: "...",
  method: "GET",
  url: "/api/test-errors/test-sync-error",
  statusCode: 400,
  ...
}
```

## Using in Your Code

### Throw operational errors:

```typescript
import { AppError } from "../middleware/errorHandler";

// In your route handler:
if (!resource) {
  throw new AppError("Resource not found", 404);
}
```

### Wrap async handlers:

```typescript
import { asyncHandler } from "../middleware/errorHandler";

router.get(
  "/route",
  asyncHandler(async (req, res) => {
    const data = await someAsyncOperation();
    res.json(data);
    // Any thrown errors are automatically caught and passed to error handler
  }),
);
```

## Security Checklist

- [ ] Set `NODE_ENV=production` before deploying
- [ ] Verify no stack traces in production responses
- [ ] Check server logs capture full error details
- [ ] Test error responses return JSON (not HTML)
- [ ] Confirm 404s don't expose route structure
- [ ] Remove or disable test routes in production

## Common Issues

**Issue:** Still seeing HTML error pages
**Fix:** Ensure error handler is registered LAST (after all routes)

**Issue:** Stack traces in production
**Fix:** Set `NODE_ENV=production` environment variable

**Issue:** Async errors not caught
**Fix:** Use `asyncHandler` wrapper or try/catch in async routes
