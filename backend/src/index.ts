import express from "express";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import helmet from "helmet";
import prisma from "./prisma";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Route imports
import resourceRoutes from "./routes/resources";
import groupRoutes from "./routes/groups";
import authRoutes from "./routes/auth";
import borrowRequestRoutes from "./routes/borrowRequests";
import loanRoutes from "./routes/loans";
import notificationRoutes from "./routes/notifications";
import userRoutes from "./routes/users";
import testErrorRoutes from "./routes/testErrors";

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

// Compression is now handled by the nginx reverse proxy layer.
app.use(compression());

// Test database connection on startup
prisma
  .$connect()
  .then(() => console.log("âœ… Database connected"))
  .catch((error) => {
    console.error("âŒ Database connection failed:", error);
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
    console.log("âœ… Firebase Admin initialized");
  } catch (error) {
    console.error("âŒ Firebase Admin initialization error:", error);
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
  max: 200,
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

// Health check endpoint for load balancers and orchestrators
app.get("/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected",
    });
  } catch (error) {
    // Return unhealthy status but don't throw to error handler
    // Health checks should be handled directly
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "disconnected",
    });
  }
});

// Mount routes
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
  console.log("⚠️  Test error routes enabled at /api/test-errors");
}

// 404 handler - must come AFTER all valid routes
app.use(notFoundHandler);

// Global error handler - must be LAST middleware (after 404 handler)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

// Graceful shutdown handler
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received, starting graceful shutdown...`);

  server.close(() => {
    console.log("HTTP server closed");

    prisma
      .$disconnect()
      .then(() => {
        console.log("Database connection closed");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Error during shutdown:", error);
        process.exit(1);
      });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
}

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Global error handlers to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("âŒ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  console.error("Time:", new Date().toISOString());

  // Critical errors that require shutdown
  if (
    error.message &&
    (error.message.includes("FATAL") ||
      error.message.includes("Cannot read properties of null") ||
      error.message.includes("ECONNREFUSED"))
  ) {
    console.error("Critical error detected, initiating graceful shutdown...");
    prisma.$disconnect().finally(() => process.exit(1));
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: any, promise) => {
  console.error("âŒ Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  console.error("Stack:", reason?.stack);
  console.error("Time:", new Date().toISOString());

  // Don't exit on promise rejections, but log them
  // In production, you might want to send alerts for these
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("âŒ Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  console.error("Time:", new Date().toISOString());
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\nSIGINT received, closing server gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});
