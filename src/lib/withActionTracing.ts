/**
 * withActionTracing — STORY-052.
 *
 * Higher-order helper that wraps a server action with structured
 * logging: start, success/failure, duration, and error details.
 *
 * Preserves the wrapped function's signature and never swallows
 * Next.js control-flow errors (NEXT_REDIRECT).
 */

import type { Logger } from "@/ports/observability/Logger";

export interface ActionTraceOptions {
  logger: Logger;
  actionName: string;
  userId?: string;
}

export function withActionTracing<
  Args extends unknown[],
  Return,
>(
  fn: (...args: Args) => Promise<Return>,
  options: ActionTraceOptions,
): (...args: Args) => Promise<Return> {
  return async (...args: Args): Promise<Return> => {
    const start = Date.now();
    const { logger, actionName, userId } = options;
    logger.info(`action.start`, { action: actionName, userId });

    try {
      const result = await fn(...args);
      logger.info(`action.success`, {
        action: actionName,
        userId,
        durationMs: Date.now() - start,
      });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const isRedirect = error.message.includes("NEXT_REDIRECT");
      logger.error(`action.error`, {
        action: actionName,
        userId,
        durationMs: Date.now() - start,
        error: isRedirect ? "NEXT_REDIRECT" : error.message,
      });
      throw err;
    }
  };
}
