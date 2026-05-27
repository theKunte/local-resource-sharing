# Application Monitoring & Health Checks

This document describes the monitoring infrastructure for the GearShare backend application.

## Table of Contents

- [Health Check Endpoints](#health-check-endpoints)
- [Logging System](#logging-system)
- [Future Monitoring Components](#future-monitoring-components)
- [Production Best Practices](#production-best-practices)

---

## Health Check Endpoints

The application exposes two endpoints for monitoring and orchestration:

### `/health` - Liveness Probe

**Purpose:** Determine if the application is alive and functioning  
**Usage:** Load balancers, Kubernetes liveness probes, uptime monitors

**Response Format:**

```json
{
  "status": "healthy", // healthy | degraded | unhealthy
  "timestamp": "2026-05-21T22:32:53.395Z",
  "uptime": 8, // seconds since startup
  "responseTime": "18ms", // total health check duration
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy", // healthy | degraded | unhealthy
      "responseTime": 18 // milliseconds
    },
    "firebase": {
      "status": "healthy"
    },
    "memory": {
      "status": "healthy",
      "usage": 13, // MB used
      "limit": 31 // MB total heap
    },
    "backup": {
      "status": "healthy", // healthy | degraded | unhealthy
      "lastBackup": "backup_20260527_020000.sql",
      "age": "5h", // time since last backup
      "totalBackups": 10 // number of backups retained
    }
  }
}
```

**Status Codes:**

- `200 OK` - Application is healthy
- `503 Service Unavailable` - Application is unhealthy (should be restarted)

**Health Criteria:**

- **Database:**
  - `healthy` - Connection successful, response time < 1000ms
  - `degraded` - Connection successful, response time ≥ 1000ms
  - `unhealthy` - Connection failed

- **Firebase:**
  - `healthy` - Firebase Admin SDK initialized
  - `unhealthy` - Firebase Admin SDK not available

- **Memory:**
  - `healthy` - Heap usage < 90%
  - `degraded` - Heap usage 90-95%
  - `unhealthy` - Heap usage > 95%

- **Backup:**
  - `healthy` - Last backup < 36 hours old
  - `degraded` - Last backup 36-72 hours old OR no backups exist
  - `unhealthy` - Last backup > 72 hours old

### `/readiness` - Readiness Probe

**Purpose:** Determine if the application is ready to receive traffic  
**Usage:** Kubernetes readiness probes, deployment health checks

**Response Format:**

```json
{
  "status": "ready",
  "timestamp": "2026-05-21T22:33:02.020Z"
}
```

**Status Codes:**

- `200 OK` - Application is ready to receive traffic
- `503 Service Unavailable` - Application is not ready (wait before routing traffic)

**Readiness Criteria:**

- Database connection is active
- Firebase Admin SDK is initialized
- All critical dependencies are available

### Implementation Details

Both endpoints are registered **before** CORS middleware to ensure they are accessible by:

- Load balancers (which don't send `Origin` headers)
- Container orchestrators (Kubernetes, Docker Swarm, ECS)
- Uptime monitoring services (UptimeRobot, Pingdom, etc.)
- Internal health checkers

Both endpoints are **excluded from HTTP request logging** to reduce noise in logs.

---

## Logging System

The application uses [Pino](https://getpino.io) for high-performance structured logging.

**See [LOGGING.md](./LOGGING.md) for comprehensive documentation.**

### Key Features

- 🚀 **10x faster** than Winston, 5x faster than Bunyan
- 📊 **Structured JSON** output for log aggregation
- 🔒 **Automatic redaction** of sensitive data (passwords, tokens, etc.)
- 🔗 **Request correlation IDs** for tracing requests across services
- 🎨 **Pretty-printing** in development with `pino-pretty`
- ⚡ **Async I/O** - doesn't block the event loop

### Log Levels

```
fatal → error → warn → info → debug → trace
```

### Quick Start

```typescript
import logger from "./utils/logger";

// Basic logging
logger.info("User logged in", { userId: "123", method: "google" });
logger.error("Database connection failed", error);

// Domain-specific logging
logger.security("Failed login attempt", { ip: "1.2.3.4", userId: "123" });
logger.audit("Password changed", { userId: "123", timestamp: Date.now() });
logger.database("Slow query detected", { query: "SELECT...", duration: 1234 });

// Request-scoped logging with correlation ID
const requestLogger = logger.child({ requestId: req.id });
requestLogger.info("Processing request");
```

---

## Automated Database Backups

The application includes a comprehensive backup system with both manual and automated options.

### Docker-Based Automated Backups

A dedicated backup container runs automatically in the Docker Compose stack:

**Features:**

- 🔄 **Automatic daily backups** - Creates pg_dump backups at 2 AM
- 🗄️ **Automatic cleanup** - Keeps last 10 backups (configurable)
- 📊 **Backup monitoring** - `/health` endpoint tracks backup freshness
- 🔒 **Read-only access** - Backup container has read-only access to database volume
- 🐳 **Cross-platform** - Works on Windows, Linux, macOS

**Configuration:**

```yaml
# docker-compose.yml
backup:
  image: postgres:16-alpine
  volumes:
    - db_data:/var/lib/postgresql/data:ro # Read-only
    - ./backend/backups:/backups
  environment:
    - POSTGRES_USER=${POSTGRES_USER:-appuser}
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    - POSTGRES_DB=${POSTGRES_DB:-localresourcesharing}
  depends_on:
    postgres:
      condition: service_healthy
```

**Backup Location:** `backend/backups/backup_YYYYMMDD_HHMMSS.sql`

**Retention Policy:** Last 10 backups retained automatically

### Manual Backup Commands

**Create backup anytime:**

```bash
cd backend
npm run db:backup
```

**Restore from latest backup:**

```bash
cd backend
npm run db:restore
```

**Restore from specific backup:**

```powershell
cd backend
.\scripts\restore-db.ps1 -BackupFile ".\backups\backup_20260527_020000.sql"
```

**List available backups:**

```powershell
cd backend
.\scripts\restore-db.ps1  # Shows list of available backups
```

**Check database contents:**

```bash
cd backend
npm run db:check
```

### Windows Task Scheduler (Alternative)

For Windows-only environments, you can use Task Scheduler instead of the Docker backup container:

```powershell
cd backend
.\scripts\auto-backup-cron.ps1
```

This creates a scheduled task that runs daily at 2 AM.

### Backup Monitoring

The `/health` endpoint includes backup status:

```json
{
  "status": "healthy",
  "checks": {
    "backup": {
      "status": "healthy",
      "lastBackup": "backup_20260527_020000.sql",
      "age": "5h",
      "totalBackups": 10
    }
  }
}
```

**Health Criteria:**

- `healthy` - Last backup < 36 hours old
- `degraded` - Last backup 36-72 hours old OR no backups exist
- `unhealthy` - Last backup > 72 hours old

This allows monitoring systems to alert if backups are failing.

### Best Practices

**Before Risky Operations:**

Always create a manual backup before:

- Database migrations
- Schema changes
- Upgrading Docker containers
- Testing cleanup scripts
- Removing Docker volumes (`docker compose down -v`)

```bash
npm run db:backup  # Quick safety backup
```

**Production Recommendations:**

1. **Off-site backups** - Upload to cloud storage (S3, Azure Blob, Google Cloud Storage)
2. **Backup verification** - Periodically restore backups to test integrity
3. **Multi-region replication** - For critical production systems
4. **Backup encryption** - Encrypt backups at rest and in transit
5. **Backup alerts** - Monitor backup failures via `/health` endpoint

**Example: Upload to Azure Blob Storage**

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import fs from "fs";
import path from "path";

async function uploadBackupToCloud(backupFile: string) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!,
  );

  const containerClient = blobServiceClient.getContainerClient("backups");
  const blockBlobClient = containerClient.getBlockBlobClient(
    path.basename(backupFile),
  );

  const uploadBlobResponse = await blockBlobClient.uploadFile(backupFile);
  console.log(`Backup uploaded to Azure: ${uploadBlobResponse.requestId}`);
}
```

### Documentation

- [QUICK_RECOVERY.md](../QUICK_RECOVERY.md) - Quick reference for daily operations
- [DATA_PROTECTION.md](../DATA_PROTECTION.md) - Comprehensive backup guide

---

## Future Monitoring Components

### Error Tracking (Recommended: Sentry)

**Why:** Track and aggregate errors in production  
**Free Tier:** 5,000 errors/month  
**Implementation:**

```bash
npm install @sentry/node @sentry/integrations
```

**Benefits:**

- Error grouping and deduplication
- Stack traces with source maps
- Release tracking and regression detection
- Performance monitoring (transactions, spans)
- User context and breadcrumbs

### Metrics & Observability (Recommended: Prometheus)

**Why:** Track application metrics over time  
**Free/Open Source**  
**Metrics to Track:**

- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database query duration
- Active connections
- Business metrics (loans created, items shared, etc.)

**Implementation:**

```bash
npm install prom-client
```

**Endpoint:** `GET /metrics` (Prometheus scrape format)

### Log Aggregation (Recommended: BetterStack/LogTail)

**Why:** Centralize logs, search, and analyze  
**Free Tier:** 1 GB logs/month, 7 days retention  
**Integration:** Stream Pino JSON logs via Vector or Fluentd

**Benefits:**

- Centralized log search across all services
- Saved searches and alerts
- Dashboard visualizations
- Correlation with error tracking

### Uptime Monitoring (Recommended: UptimeRobot)

**Why:** Monitor endpoint availability  
**Free Tier:** 50 monitors, 5-minute checks  
**Monitor:** `GET /health` endpoint

**Benefits:**

- Email/SMS alerts on downtime
- Public status page
- Response time tracking
- SSL certificate monitoring

---

## Production Best Practices

### Orchestrator Configuration

#### Docker Compose

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
```

#### Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gearshare-backend
spec:
  containers:
    - name: backend
      image: gearshare-backend:latest
      livenessProbe:
        httpGet:
          path: /health
          port: 3001
        initialDelaySeconds: 30
        periodSeconds: 30
        timeoutSeconds: 5
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /readiness
          port: 3001
        initialDelaySeconds: 10
        periodSeconds: 10
        timeoutSeconds: 3
        failureThreshold: 3
```

### Load Balancer Health Checks

**AWS Application Load Balancer:**

- Health check path: `/health`
- Healthy threshold: 2 consecutive successes
- Unhealthy threshold: 3 consecutive failures
- Timeout: 5 seconds
- Interval: 30 seconds

**NGINX:**

```nginx
upstream backend {
  server backend:3001 max_fails=3 fail_timeout=30s;
}

location /health {
  proxy_pass http://backend/health;
  proxy_connect_timeout 5s;
  proxy_read_timeout 5s;
}
```

### Monitoring Strategy

**Recommended Layers:**

1. **Health Checks** (Current) - Is the app alive?
2. **Structured Logging** (Current) - What is happening?
3. **Error Tracking** (Next) - What went wrong?
4. **Metrics** (Next) - How is performance?
5. **Log Aggregation** (Next) - What patterns exist?
6. **Uptime Monitoring** (Next) - Is the service accessible?

**Alerting Priorities:**

1. **Critical** (Page on-call)
   - Health check failures (> 2 minutes)
   - Error rate spike (> 5% of requests)
   - Database connection failures
   - Memory usage > 95%

2. **Warning** (Slack/Email)
   - Degraded health check (slow database)
   - Error rate elevated (> 1% of requests)
   - Memory usage > 90%
   - Slow requests (p99 > 3 seconds)

3. **Info** (Dashboard only)
   - New deployments
   - Configuration changes
   - Scheduled maintenance

### Log Retention Strategy

**Production:**

- **Hot storage** (7 days) - Full search, all logs
- **Warm storage** (30 days) - Compressed, searchable
- **Cold storage** (90 days) - Archived, audit only
- **Deletion** (after 90 days) - GDPR compliance

**Development:**

- Rotate logs daily, keep 7 days

### Security Considerations

**Health Check Endpoints:**

- ✅ No authentication required (public endpoints)
- ✅ No sensitive data exposed
- ✅ Rate limiting not applied (allows monitoring systems)
- ⚠️ Don't expose internal IPs or hostnames
- ⚠️ Don't expose database credentials or tokens

**Logging:**

- ✅ Automatic redaction of sensitive fields
- ✅ Request correlation IDs (not user IDs)
- ⚠️ Don't log passwords, tokens, or PII
- ⚠️ Sanitize error messages (no file paths)

---

## Troubleshooting

### Health Check Returns 503

**Symptoms:** `/health` returns `unhealthy` status

**Check:**

1. Examine the `checks` object in the response
2. Identify which dependency is `unhealthy`
3. Check Docker logs: `docker-compose logs backend`

**Common Causes:**

- Database connection failed (check PostgreSQL container)
- Firebase Admin not initialized (check environment variables)
- Memory exhaustion (restart container)

### High Memory Usage

**Symptoms:** `checks.memory.status = "degraded"` or `"unhealthy"`

**Actions:**

1. Check for memory leaks: `docker stats`
2. Increase container memory limit in `docker-compose.yml`
3. Analyze heap dumps: `node --inspect` + Chrome DevTools

### Slow Database Checks

**Symptoms:** `checks.database.responseTime > 1000ms`

**Actions:**

1. Check database connection pool configuration
2. Analyze slow queries: Enable Prisma query logging
3. Scale database resources
4. Add read replicas for high traffic

---

## Next Steps

1. ✅ **Health Checks** - Implemented
2. ✅ **Structured Logging (Pino)** - Implemented
3. ✅ **Database Backup Automation** - Implemented
4. ⏳ **Error Tracking (Sentry)** - TODO (defer until ~50+ users)
5. ⏳ **Metrics Endpoint (Prometheus)** - TODO (defer until traffic patterns emerge)
6. ⏳ **Log Aggregation (BetterStack)** - TODO (defer until scale increases)
7. ⏳ **Uptime Monitoring (UptimeRobot)** - TODO (defer until production deployment)
8. ⏳ **Grafana Dashboards** - TODO (defer until metrics collection is active)

---

## Resources

- [Pino Documentation](https://getpino.io)
- [Sentry Node.js SDK](https://docs.sentry.io/platforms/node/)
- [Prometheus Node.js Client](https://github.com/sigs/prom-client)
- [BetterStack Logs](https://betterstack.com/logs)
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [12-Factor App: Logs](https://12factor.net/logs)
