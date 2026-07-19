/**
 * Logger port — STORY-052.
 *
 * The application-layer contract for structured logging.
 * Domain and use case code depend on this interface, never on a
 * concrete logging library.
 */

export interface LogContext {
  readonly [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
}
