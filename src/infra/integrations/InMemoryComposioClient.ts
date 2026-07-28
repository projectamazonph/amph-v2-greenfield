/**
 * InMemoryComposioClient — test fake for ComposioClient.
 *
 * Records every created/reused session in a public `sessions` array
 * so tests can assert against them ("exactly one session was created
 * for user X with toolkits Y and Z").
 *
 * No external I/O. Safe in unit tests, storybook, local dev.
 *
 * Failure injection: tests can call `setFailure(...)` to make the
 * next call return the chosen error kind without monkey-patching.
 */

import { Result } from "@/domain/shared/Result";
import type {
  ComposioClient,
  ComposioError,
  ComposioSession,
  ComposioSessionOptions,
} from "@/ports/integrations/ComposioClient";

export interface RecordedSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly toolkits: readonly string[] | undefined;
  readonly waitForConnections: boolean;
  readonly createdAt: Date;
}

export class InMemoryComposioClient implements ComposioClient {
  public readonly sessions: RecordedSession[] = [];
  private nextId = 1;
  /**
   * If set, the next call returns this error and then clears. Lets
   * tests assert error paths without rebuilding the fake.
   */
  private pendingFailure: ComposioError | null = null;

  async createSession(
    userId: string,
    options?: ComposioSessionOptions,
  ): Promise<Result<ComposioSession, ComposioError>> {
    const failure = this.consumeFailure();
    if (failure) return Result.err(failure);
    if (!userId || userId.trim().length === 0) {
      return Result.err({
        kind: "invalid_user_id",
        message: "userId must be a non-empty string",
      });
    }
    const sessionId = `cs_test_${this.nextId++}`;
    this.sessions.push({
      sessionId,
      userId,
      toolkits: options?.toolkits,
      waitForConnections: options?.waitForConnections ?? false,
      createdAt: new Date(),
    });
    return Result.ok({
      sessionId,
      redirectUrl: `https://connect.composio.dev/test/${sessionId}`,
      mcpUrl: `https://mcp.composio.dev/test/${sessionId}`,
    });
  }

  async useSession(sessionId: string): Promise<Result<ComposioSession, ComposioError>> {
    const failure = this.consumeFailure();
    if (failure) return Result.err(failure);
    const found = this.sessions.find((s) => s.sessionId === sessionId);
    if (!found) {
      return Result.err({
        kind: "sdk_error",
        message: `unknown session: ${sessionId}`,
      });
    }
    return Result.ok({
      sessionId: found.sessionId,
      redirectUrl: `https://connect.composio.dev/test/${found.sessionId}`,
      mcpUrl: `https://mcp.composio.dev/test/${found.sessionId}`,
    });
  }

  /** Make the next call fail with the given error, then clear. */
  setFailure(error: ComposioError): void {
    this.pendingFailure = error;
  }

  /** Reset the in-memory state between tests. */
  clear(): void {
    this.sessions.length = 0;
    this.nextId = 1;
    this.pendingFailure = null;
  }

  private consumeFailure(): ComposioError | null {
    const f = this.pendingFailure;
    this.pendingFailure = null;
    return f;
  }
}
