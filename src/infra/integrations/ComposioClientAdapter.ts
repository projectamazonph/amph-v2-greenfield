/**
 * ComposioClientAdapter — production adapter for ComposioClient.
 *
 * Wraps `@composio/core` (the official SDK). The SDK is heavy: it
 * pulls in `@composio/client`, `pusher-js`, `openai` (peer), `zod`,
 * and friends. We isolate that here so the rest of the app only
 * sees the Result-shaped port.
 *
 * Lazy initialization: the SDK client is created on first use, not at
 * composition boot. This means a missing COMPOSIO_API_KEY causes the
 * action to return an error rather than crashing the worker process.
 *
 * Runtime contract:
 *   createSession / useSession never throw. SDK errors are caught
 *   and mapped to ComposioError variants so callers stay in
 *   Result-land (ADR-014).
 */

import { Composio, ComposioError } from "@composio/core";
import { Result } from "@/domain/shared/Result";
import type {
  ComposioClient,
  ComposioError as PortComposioError,
  ComposioSession,
  ComposioSessionOptions,
} from "@/ports/integrations/ComposioClient";

export class ComposioClientAdapter implements ComposioClient {
  private readonly apiKey: string;
  private _client: Composio | null = null;

  constructor(apiKey: string) {
    // Store the key — client is created lazily on first use.
    this.apiKey = apiKey;
  }

  private getClient(): Composio {
    if (!this._client) {
      if (!this.apiKey || this.apiKey.trim().length === 0) {
        throw new Error(
          "ComposioClientAdapter: COMPOSIO_API_KEY is missing. " +
            "Set it in .env.local before starting the server.",
        );
      }
      this._client = new Composio({ apiKey: this.apiKey });
    }
    return this._client;
  }

  async createSession(
    userId: string,
    options?: ComposioSessionOptions,
  ): Promise<Result<ComposioSession, PortComposioError>> {
    if (!userId || userId.trim().length === 0) {
      return Result.err({
        kind: "invalid_user_id",
        message: "userId must be a non-empty string",
      });
    }
    try {
      const client = this.getClient();
      // SDK option shape mirrors our port option shape almost 1:1.
      const sdkOptions = {
        ...(options?.toolkits ? { toolkits: [...options.toolkits] } : {}),
        manageConnections: options?.waitForConnections
          ? { waitForConnections: true }
          : undefined,
      };
      const session = await client.create(userId, sdkOptions);
      return Result.ok(this.toPortSession(session));
    } catch (err) {
      return Result.err(this.mapError(err));
    }
  }

  async useSession(
    sessionId: string,
  ): Promise<Result<ComposioSession, PortComposioError>> {
    if (!sessionId || sessionId.trim().length === 0) {
      return Result.err({
        kind: "invalid_user_id",
        message: "sessionId must be a non-empty string",
      });
    }
    try {
      const client = this.getClient();
      const session = await client.use(sessionId);
      return Result.ok(this.toPortSession(session));
    } catch (err) {
      return Result.err(this.mapError(err));
    }
  }

  /**
   * Project a SDK Session object down to our port's flat shape.
   * The SDK's type is generic and depends on the provider; we cast
   * to `unknown` then read the well-known fields. Anything new on
   * the SDK that we want to expose MUST be added here — never
   * leak the SDK type out through the port.
   */
  private toPortSession(session: unknown): ComposioSession {
    const s = session as {
      sessionId?: unknown;
      url?: unknown;
      mcp?: { url?: unknown } | undefined;
    };
    return {
      sessionId: typeof s.sessionId === "string" ? s.sessionId : "",
      redirectUrl: typeof s.url === "string" ? s.url : undefined,
      mcpUrl:
        s.mcp && typeof s.mcp === "object" && typeof s.mcp.url === "string"
          ? s.mcp.url
          : undefined,
    };
  }

  /**
   * Map any thrown value to one of our typed variants. The SDK
   * throws a hierarchy of classes that all extend `ComposioError`.
   * Anything else (network, abort, etc.) becomes `sdk_error`.
   */
  private mapError(err: unknown): PortComposioError {
    if (err instanceof ComposioError) {
      const name = err.constructor.name;
      if (name === "ConnectionRequestTimeoutError") {
        return {
          kind: "connection_request_timeout",
          message: err.message,
        };
      }
      if (name === "ConnectionRequestFailedError") {
        return {
          kind: "connection_request_failed",
          message: err.message,
        };
      }
      return { kind: "sdk_error", message: err.message };
    }
    return {
      kind: "sdk_error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}