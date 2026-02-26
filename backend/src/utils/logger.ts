/**
 * Structured Logging Utility
 * Provides consistent logging with security considerations
 */

type LogLevel = 'info' | 'warn' | 'error' | 'security' | 'audit';

interface LogContext {
  userId?: string;
  ip?: string;
  endpoint?: string;
  action?: string;
  resourceId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(this.sanitizeContext(context))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };
    
    // Remove sensitive fields in production
    if (!this.isDevelopment) {
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.privateKey;
      delete sanitized.secret;
    }
    
    return sanitized;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: this.isDevelopment ? error?.stack : error?.message,
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  security(message: string, context: LogContext): void {
    // Security events are always logged with full context
    console.warn(this.formatMessage('security', message, context));
  }

  audit(action: string, context: LogContext): void {
    // Audit logs for tracking important actions
    console.log(this.formatMessage('audit', action, context));
  }
}

export { Logger };
export const logger = new Logger();
