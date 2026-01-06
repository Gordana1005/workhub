export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  correlationId?: string;
  userId?: string;
  workspaceId?: string;
  [key: string]: any;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

class Logger {
  private correlationId: string;

  constructor() {
    this.correlationId = generateId();
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: context?.correlationId || this.correlationId,
      ...context,
    };

    if (process.env.NODE_ENV === 'production') {
      // In production, send to logging service
      // For now, we'll just use console but structure it properly
      // Can integrate with Axiom, Logtail, or other free services later
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Silently fail - don't break app if logging fails
        console.error('Failed to send log');
      });
    } else {
      // In development, use console with nice formatting
      const emoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        debug: '🔍',
      }[level];
      
      console[level === 'error' ? 'error' : 'log'](
        `${emoji} [${level.toUpperCase()}]`,
        message,
        context || ''
      );
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, { 
      ...context, 
      error: error?.message,
      stack: error?.stack 
    });
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  // Create a new logger with a fresh correlation ID
  createChild(): Logger {
    return new Logger();
  }
}

export const logger = new Logger();
