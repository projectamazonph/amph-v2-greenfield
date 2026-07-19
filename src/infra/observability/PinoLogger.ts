/**
 * PinoLogger — STORY-052.
 *
 * Production adapter for the Logger port. Redacts common secret field
 * names and lazy-initializes the Pino instance so builds don't crash
 * when logging env vars are absent.
 */

import type { Logger, LogContext } from "@/ports/observability/Logger";

// Pino is imported lazily to keep the module loadable during `next build`
// even if LOG_LEVEL or other runtime env vars are unset.
type PinoLogFn = (ctx: Record<string, unknown>, msg: string) => void;
type PinoInstance = {
  debug: PinoLogFn;
  info: PinoLogFn;
  warn: PinoLogFn;
  error: PinoLogFn;
  child: (bindings: Record<string, unknown>) => PinoInstance;
};

const REDACT_PATHS = [
  "password",
  "token",
  "secret",
  "cookie",
  "authorization",
  "apiKey",
  "api_key",
  "*.password",
  "*.token",
  "*.secret",
  "*.cookie",
  "*.authorization",
];

export class PinoLogger implements Logger {
  private instance: PinoInstance | null = null;

  constructor(private readonly level: string = "info") {}

  private getClient(): PinoInstance {
    if (this.instance) return this.instance;
    const pino = require("pino") as typeof import("pino");
    this.instance = pino({
      level: this.level,
      redact: {
        paths: REDACT_PATHS,
        censor: "[REDACTED]",
      },
    }) as PinoInstance;
    return this.instance;
  }

  debug(message: string, context?: LogContext): void {
    this.getClient().debug({ ...context }, message);
  }

  info(message: string, context?: LogContext): void {
    this.getClient().info({ ...context }, message);
  }

  warn(message: string, context?: LogContext): void {
    this.getClient().warn({ ...context }, message);
  }

  error(message: string, context?: LogContext): void {
    this.getClient().error({ ...context }, message);
  }

  child(bindings: LogContext): Logger {
    const childLogger = new PinoLogger(this.level);
    childLogger.instance = this.getClient().child(bindings as Record<string, unknown>);
    return childLogger;
  }
}
