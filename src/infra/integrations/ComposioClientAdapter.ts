/**
 * ComposioClientAdapter — real adapter wrapping `@composio/core`.
 *
 * Implements `ComposioClient` from `@/ports/integrations/ComposioClient`.
 * This is the production adapter; the test uses `vi.mock` to intercept the
 * SDK import so it can run without a live Composio API key.
 *
 * Lifecycle:
 *  - Throws at construction if `COMPOSIO_API_KEY` is missing or blank.
 *  - `createSession` / `useSession` never throw — all error paths return
 *    a typed `ComposioError` variant via `Result.err(...)`.
 *
 * ADR-014: boundary types are `Result<T, E>`, never throws.
 * ADR-016: `@composio/core` lives only in this file.
 */

import { Result } from "@/domain/shared/Result";
import type {
  ComposioClient,
  ComposioError,
  ComposioSession,
  ComposioSessionOptions,
} from "@/ports/integrations/ComposioClient";

// @composio/core is mocked in tests via vi.mock(...)
const { Composio, ComposioError: SdkComposioError } = require("@composio/core") as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Composio: new (apiKey: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComposioError: new (message: string) => any;
};

export class ComposioClientAdapter implements ComposioClient {
  private readonly sdk: InstanceType<typeof Composio>;

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      throw new Error(
        "COMPOSIO_API_KEY is not set. " +
          "Add it to .env.local to enable the Composio integration.",
      );
    }
    this.sdk = new Composio(apiKey);
  }

  async createSession(
    userId: string,
    options?: ComposioSessionOptions,
  ): Promise<Result<ComposioSession, ComposioError>> {
    if (!userId || !userId.trim()) {
      return Result.err({
        kind: "invalid_user_id",
        message: "userId must be a non-empty string",
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkOptions: any = {};
      if (options?.toolkits?.length) {
        sdkOptions.toolkits = [...options.toolkits];
      }
      if (options?.waitForConnections !== undefined) {
        sdkOptions.manageConnections = { waitForConnections: options.waitForConnections };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkResult = (await this.sdk.create(userId, sdkOptions)) as any;

      return Result.ok({
        sessionId: sdkResult.sessionId,
        redirectUrl: sdkResult.url,
        mcpUrl: sdkResult.mcp?.url,
      });
    } catch (err) {
      // The Composio SDK throws typed subclasses of ComposioError.
      // Map them to our typed variants; unknown errors become sdk_error.
      if (err instanceof SdkComposioError) {
        const name: string = (err as unknown as { name: string }).name ?? "";
        if (name === "ConnectionRequestTimeoutError") {
          return Result.err({
            kind: "connection_request_timeout",
            message: err.message,
          });
        }
        if (name === "ConnectionRequestError") {
          return Result.err({
            kind: "connection_request_failed",
            message: err.message,
          });
        }
      }
      return Result.err({
        kind: "sdk_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async useSession(sessionId: string): Promise<Result<ComposioSession, ComposioError>> {
    if (!sessionId || !sessionId.trim()) {
      return Result.err({
        kind: "invalid_user_id",
        message: "sessionId must be a non-empty string",
      });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkResult = (await this.sdk.use(sessionId)) as any;
      return Result.ok({
        sessionId: sdkResult.sessionId,
        redirectUrl: sdkResult.url,
        mcpUrl: sdkResult.mcp?.url,
      });
    } catch (err) {
      return Result.err({
        kind: "sdk_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
