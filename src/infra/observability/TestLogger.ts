/**
 * TestLogger — STORY-052.
 *
 * In-memory adapter for the Logger port. Buffers every log line so
 * tests can assert what was logged without writing to stdout/files.
 */

import type { Logger, LogContext } from "@/ports/observability/Logger";

export interface LogEntry {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
  readonly context: LogContext | undefined;
}

export class TestLogger implements Logger {
  readonly entries: LogEntry[] = [];

  debug(message: string, context?: LogContext): void {
    this.entries.push({ level: "debug", message, context });
  }

  info(message: string, context?: LogContext): void {
    this.entries.push({ level: "info", message, context });
  }

  warn(message: string, context?: LogContext): void {
    this.entries.push({ level: "warn", message, context });
  }

  error(message: string, context?: LogContext): void {
    this.entries.push({ level: "error", message, context });
  }

  child(): Logger {
    return this;
  }

  clear(): void {
    this.entries.length = 0;
  }
}
