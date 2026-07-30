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
  /**
   * Log at DEBUG level. Intended for verbose diagnostic output that is
   * typically suppressed in production. Use for tracing code paths,
   * variable values, and intermediate state during development.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured metadata (key-value pairs)
   *
   * Idempotent: Yes — logging has no side effects beyond the log output.
   * Postconditions: Message is written to the underlying transport.
   */
  debug(message: string, context?: LogContext): void;

  /**
   * Log at INFO level. Intended for normal operational events:
   * request completion, job execution, state transitions. These are
   * the "heartbeat" of the application and should be noisy enough to
   * reconstruct a timeline of user actions.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured metadata (key-value pairs)
   *
   * Idempotent: Yes — logging has no side effects beyond the log output.
   * Postconditions: Message is written to the underlying transport.
   */
  info(message: string, context?: LogContext): void;

  /**
   * Log at WARN level. Intended for unexpected but recoverable
   * conditions: deprecated API usage, retryable failures, validation
   * mismatches that fell back to defaults. Warnings should not page
   * on-call but should be visible in dashboards.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured metadata (key-value pairs)
   *
   * Idempotent: Yes — logging has no side effects beyond the log output.
   * Postconditions: Message is written to the underlying transport.
   */
  warn(message: string, context?: LogContext): void;

  /**
   * Log at ERROR level. Intended for failures that require attention:
   * unhandled exceptions, failed external calls, data integrity
   * violations. Errors should trigger alerts and be investigated.
   *
   * @param message - Human-readable log message
   * @param context - Optional structured metadata (key-value pairs)
   *
   * Idempotent: Yes — logging has no side effects beyond the log output.
   * Postconditions: Message is written to the underlying transport.
   */
  error(message: string, context?: LogContext): void;

  /**
   * Create a child logger with pre-bound context fields. The child
   * inherits the parent's transport and log level. Every log line
   * from the child includes the bound fields automatically.
   *
   * Use cases: request-scoped loggers with `requestId`, user-scoped
   * loggers with `userId`, module-scoped loggers with `component`.
   *
   * @param bindings - Key-value pairs to attach to every log line
   * @returns A new Logger instance with the bindings applied
   *
   * Idempotent: Yes — creating a child does not mutate the parent.
   * Postconditions: Returned logger writes to the same transport as the parent.
   */
  child(bindings: LogContext): Logger;
}
