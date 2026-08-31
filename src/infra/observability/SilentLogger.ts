/**
 * SilentLogger — no-op Logger port adapter for tests.
 *
 * Implements every method as a void. Useful for tests that don't need
 * to assert log output. For tests that DO want to assert log output, use
 * `TestLogger` from the same directory, which buffers entries.
 */

import type { Logger, LogContext } from "@/ports/observability/Logger";

export class SilentLogger implements Logger {
  debug(_message: string, _context?: LogContext): void {}
  info(_message: string, _context?: LogContext): void {}
  warn(_message: string, _context?: LogContext): void {}
  error(_message: string, _context?: LogContext): void {}
  child(_bindings?: LogContext): Logger {
    return this;
  }
}
