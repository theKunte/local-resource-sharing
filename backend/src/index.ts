import express from "express";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import helmet from "helmet";
import pinoHttp from "pino-http";
import fs from "fs";
import path from "path";
import prisma from "./prisma";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { rawPinoLogger, logger } from "./utils/logger";

// Route imports
import resourceRoutes from "./routes/resources";
import groupRoutes from "./routes/groups";
import authRoutes from "./routes/auth";
import borrowRequestRoutes from "./routes/borrowRequests";
import loanRoutes from "./routes/loans";
import notificationRoutes from "./routes/notifications";
import userRoutes from "./routes/users";
import testErrorRoutes from "./routes/testErrors";

// v1 API routes
import * as v1Routes from "./routes/v1";

dotenv.config();

// Validate required environment variables on startup
const requiredEnvVars = [
  "DATABASE_URL",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "ALLOWED_ORIGINS",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);

if (missingEnvVars.length > 0) {
  console.error("âŒ Missing required environment variables:");
  missingEnvVars.forEach((varName) => console.error(`   - ${varName}`));
  console.error("\nPlease create a .env file based on .env.example");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust one proxy hop (nginx) so req.ip reflects the real client IP.
// Without this, all requests appear to come from the Docker gateway IP,
// collapsing all users into one shared rate-limit bucket.
app.set("trust proxy", 1);

// Request ID tracking - must be first middleware
app.use(requestIdMiddleware);

// HTTP request logging with Pino - automatic correlation IDs
app.use(
  pinoHttp({
    logger: rawPinoLogger,
    // Custom request ID from our middleware
    genReqId: (req) => req.id,
    // Redact sensitive headers
    redact: ["req.headers.authorization", "req.headers.cookie"],
    // Custom log message
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    // Don't log health checks to reduce noise
    autoLogging: {
      ignore: (req) => req.url === "/health" || req.url === "/readiness",
    },
  }),
);

// Compression is now handled by the nginx reverse proxy layer.
app.use(compression());

// ===== Health and Readiness Endpoints (Must be before CORS) =====
// These endpoints should be accessible by load balancers and orchestrators
// without CORS restrictions or authentication

// Health check endpoint for load balancers and orchestrators
app.get("/health", async (req, res, _next) => {
  const checks: {
    database: { status: string; responseTime: number };
    firebase: { status: string };
    memory: { status: string; usage: number; limit: number };
    backup: {
      status: string;
      lastBackup: string | null;
      age: string | null;
      totalBackups: number;
    };
  } = {
    database: { status: "unknown", responseTime: 0 },
    firebase: { status: "unknown" },
    memory: { status: "unknown", usage: 0, limit: 0 },
    backup: { status: "unknown", lastBackup: null, age: null, totalBackups: 0 },
  };

  let overallStatus = "healthy";
  const startTime = Date.now();

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database.responseTime = Date.now() - dbStart;
    checks.database.status =
      checks.database.responseTime < 1000 ? "healthy" : "degraded";
  } catch (error) {
    checks.database.status = "unhealthy";
    overallStatus = "unhealthy";
    logger.error("Health check: Database connection failed", error);
  }

  // Check Firebase Admin availability
  try {
    const firebaseApp = admin.app();
    checks.firebase.status = firebaseApp ? "healthy" : "unhealthy";
    if (!firebaseApp) {
      overallStatus = "unhealthy";
    }
  } catch (error) {
    checks.firebase.status = "unhealthy";
    overallStatus = "unhealthy";
    logger.error("Health check: Firebase Admin unavailable", error);
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercentage = (memUsedMB / memLimitMB) * 100;

  checks.memory.usage = memUsedMB;
  checks.memory.limit = memLimitMB;
  checks.memory.status = memPercentage > 90 ? "degraded" : "healthy";

  if (memPercentage > 95) {
    checks.memory.status = "unhealthy";
    overallStatus = "unhealthy";
  }

  // Check backup freshness
  try {
    const backupDir = path.join(__dirname, "../backups");
    if (fs.existsSync(backupDir)) {
      const backups = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith("backup_") && f.endsWith(".sql"))
        .sort()
        .reverse();

      checks.backup.totalBackups = backups.length;

      if (backups.length > 0) {
        const lastBackupFile = backups[0];
        const lastBackupPath = path.join(backupDir, lastBackupFile);
        const lastBackupTime = fs.statSync(lastBackupPath).mtime;
        const ageMs = Date.now() - lastBackupTime.getTime();
        const ageHours = Math.floor(ageMs / 3600000);

        checks.backup.lastBackup = lastBackupFile;
        checks.backup.age =
          ageHours < 24 ? `${ageHours}h` : `${Math.floor(ageHours / 24)}d`;

        // Backup is healthy if < 36 hours old (allows for daily backup + buffer)
        // Degraded if 36-72 hours old, unhealthy if > 72 hours
        if (ageMs < 36 * 3600000) {
          checks.backup.status = "healthy";
        } else if (ageMs < 72 * 3600000) {
          checks.backup.status = "degraded";
          if (overallStatus === "healthy") overallStatus = "degraded";
        } else {
          checks.backup.status = "unhealthy";
          overallStatus = "unhealthy";
        }
      } else {
        // No backups exist - degraded (not critical, but concerning)
        checks.backup.status = "degraded";
        checks.backup.age = "never";
        if (overallStatus === "healthy") overallStatus = "degraded";
      }
    } else {
      // Backup directory doesn't exist - degraded
      checks.backup.status = "degraded";
      checks.backup.age = "no backup directory";
      if (overallStatus === "healthy") overallStatus = "degraded";
    }
  } catch (error) {
    checks.backup.status = "unknown";
    logger.error("Health check: Backup check failed", error);
  }

  const responseTime = Date.now() - startTime;
  const statusCode = overallStatus === "healthy" ? 200 : 503;

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    responseTime: `${responseTime}ms`,
    version: process.env.npm_package_version || "unknown",
    checks,
  };

  res.status(statusCode).json(response);
});

// Readiness check endpoint for Kubernetes and load balancers
// Returns 200 only when the app is ready to accept traffic
app.get("/readiness", async (req, res, _next) => {
  try {
    // Quick database check (must respond fast)
    await prisma.$queryRaw`SELECT 1`;

    // Check if Firebase Admin is initialized
    const firebaseApp = admin.app();
    if (!firebaseApp) {
      throw new Error("Firebase Admin not initialized");
    }

    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.warn("Readiness check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      status: "not_ready",
      timestamp: new Date().toISOString(),
    });
  }
});

// Test database connection on startup
prisma
  .$connect()
  .then(() => logger.info("Database connected"))
  .catch((error) => {
    logger.error("Database connection failed", error);
    process.exit(1);
  });

// Initialize Firebase Admin SDK for token verification
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    logger.info("Firebase Admin initialized");
  } catch (error) {
    logger.error("Firebase Admin initialization error", error);
  }
}

// Security headers - protect against common vulnerabilities
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// Restricted CORS - only allow specific origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:5173",
  "http://localhost:5174",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin && process.env.NODE_ENV === "production") {
        return callback(new Error("Not allowed by CORS - no origin header"));
      }

      if (!origin && process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      if (origin && allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many auth attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);
app.use("/api/auth/", authLimiter);
app.use(express.json({ limit: "100kb" }));

// Root route
app.get("/", (req, res) => {
  res.send(
    "<h2>Local Resource Sharing API is running.<br>Use <code>/api/resources</code> to access resources.</h2>",
  );
});

// Mount routes

// v1 API routes (current/recommended)
app.use("/api/v1/resources", v1Routes.resourceRoutes);
app.use("/api/v1/groups", v1Routes.groupRoutes);
app.use("/api/v1", v1Routes.authRoutes);
app.use("/api/v1/borrow-requests", v1Routes.borrowRequestRoutes);
app.use("/api/v1/loans", v1Routes.loanRoutes);
app.use("/api/v1/notifications", v1Routes.notificationRoutes);
app.use("/api/v1/users", v1Routes.userRoutes);

// Legacy unversioned routes (deprecated - maintained for backward compatibility)
// Add deprecation warning header
app.use("/api", (req, res, next) => {
  // Only add warning to non-v1 routes
  if (!req.path.startsWith("/v1/")) {
    res.setHeader("Deprecation", "true");
    res.setHeader(
      "X-API-Warn",
      "Unversioned API endpoints are deprecated. Please use /api/v1/ instead.",
    );
  }
  next();
});

app.use("/api/resources", resourceRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api", authRoutes);
app.use("/api/borrow-requests", borrowRequestRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);

// Test routes for error handler (development only)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test-errors", testErrorRoutes);
  logger.warn("Test error routes enabled", { endpoint: "/api/test-errors" });
}

// 404 handler - must come AFTER all valid routes
app.use(notFoundHandler);

// Global error handler - must be LAST middleware (after 404 handler)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info("Backend server started", {
    port: PORT,
    environment: process.env.NODE_ENV,
  });
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  logger.info("Graceful shutdown initiated", { signal });

  server.close(() => {
    logger.info("HTTP server closed");

    prisma
      .$disconnect()
      .then(() => {
        logger.info("Database connection closed");
        process.exit(0);
      })
      .catch((error) => {
        logger.error("Error during shutdown", error);
        process.exit(1);
      });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
}

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Global error handlers to prevent crashes
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error, { fatal: true });

  // Critical errors that require shutdown
  if (
    error.message &&
    (error.message.includes("FATAL") ||
      error.message.includes("Cannot read properties of null") ||
      error.message.includes("ECONNREFUSED"))
  ) {
    logger.error("Critical error detected, initiating shutdown", error);
    prisma.$disconnect().finally(() => process.exit(1));
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise) => {
  logger.error("Unhandled Promise Rejection", reason, {
    promise: promise.toString(),
    fatal: false,
  });

  // Don't exit on promise rejections, but log them
  // In production, you might want to send alerts for these
});
