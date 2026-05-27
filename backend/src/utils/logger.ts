/**
 * Structured Logging Utility with Pino
 * Provides high-performance, production-ready logging with security considerations
 * Features: JSON-first, automatic redaction, correlation IDs, minimal overhead
 */

import pino from "pino";

type LogLevel = "info" | "warn" | "error" | "security" | "audit" | "debug";

interface LogContext {
  userId?: string;
  ip?: string;
  endpoint?: string;
  action?: string;
  resourceId?: string;
  requestId?: string;
  [key: string]: any;
}

// Create Pino logger instance with production-ready config
const pinoLogger = pino({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Production: JSON output for log platforms
  // Development: Pretty-printed with colors
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },

  // Automatically redact sensitive fields
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "apiKey",
      "api_key",
      "secret",
      "privateKey",
      "private_key",
      "firebase_private_key",
      "*.password",
      "*.token",
      "*.secret",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    remove: true, // Remove instead of replace with [Redacted]
  },

  // Base context added to all logs
  base: {
    service: "gearshare-backend",
    environment: process.env.NODE_ENV || "development",
  },

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  info(message: string, context?: LogContext): void {
    pinoLogger.info(context || {}, message);
  }

  debug(message: string, context?: LogContext): void {
    pinoLogger.debug(context || {}, message);
  }

  warn(message: string, context?: LogContext): void {
    pinoLogger.warn(context || {}, message);
  }

  error(message: string, error?: any, context?: LogContext): void {
    const errorContext = {
      ...context,
      err: error, // Pino will serialize this properly
    };
    pinoLogger.error(errorContext, message);
  }

  security(message: string, context: LogContext): void {
    // Security events are always logged
    pinoLogger.warn(
      {
        ...context,
        type: "security",
      },
      message,
    );
  }

  audit(action: string, context: LogContext): void {
    // Audit logs for tracking important actions
    pinoLogger.info(
      {
        ...context,
        type: "audit",
      },
      action,
    );
  }

  // HTTP request logging helper (use pino-http middleware instead)
  http(req: any, res: any, responseTime: number): void {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;

    const level =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    pinoLogger[level](
      {
        method,
        url,
        statusCode,
        responseTime: `${responseTime}ms`,
        ip,
        userAgent: headers["user-agent"],
        userId: req.user?.uid,
        requestId: req.id,
      },
      "HTTP Request",
    );
  }

  // Database operation logging helper
  database(
    operation: string,
    model: string,
    duration?: number,
    error?: Error,
  ): void {
    if (error) {
      this.error(`Database ${operation} failed`, error, {
        operation,
        model,
        duration,
      });
    } else {
      this.debug(`Database ${operation}`, {
        operation,
        model,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }

  // Create child logger with additional context (useful for request-scoped logging)
  child(bindings: Record<string, any>) {
    return pinoLogger.child(bindings);
  }
}

// Export both the logger instance and the raw Pino logger for pino-http
export { Logger, LogContext };
export const logger = new Logger();
export const rawPinoLogger = pinoLogger;
