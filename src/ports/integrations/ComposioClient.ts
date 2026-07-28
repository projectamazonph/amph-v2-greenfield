/**
 * ComposioClient — port for the Composio integration SDK.
 *
 * What is Composio?
 *   Third-party tool router: 1000+ toolkits (Gmail, Slack, Linear,
 *   GitHub, Notion, etc.) behind one session API. Our admin panel
 *   will use this to let operators connect external accounts on
 *   behalf of AMPH users.
 *
 * Why a port?
 *   ADR-014 — boundary types are Result<T, E>, never throws.
 *   ADR-016 — domain/ports/usecases must not import SDK code.
 *   The `@composio/core` package lives only behind
 *   `infra/integrations/ComposioClientAdapter`. Every other layer
 *   depends on this interface.
 *
 * ADR-019 — every port has a Fake* implementation for tests. See
 * `src/infra/integrations/InMemoryComposioClient.ts`.
 */

import type { Result } from "@/domain/shared/Result";

/**
 * Options for `createSession`. Mirrors the subset of
 * `@composio/core` ToolRouterCreateSessionConfig that we actually
 * use. New flags should be added here, not imported from the SDK.
 */
export interface ComposioSessionOptions {
  /**
   * Restrict the session to specific toolkits (e.g. ["gmail",
   * "slack"]). Empty/undefined means "all toolkits the user has
   * connected accounts for".
   */
  readonly toolkits?: readonly string[];

  /**
   * If true, the session will block until the user finishes any
   * required OAuth/connect flow before returning. Defaults to false
   * (return immediately with a sessionId; the UI polls).
   *
   * Maps to the SDK's `manageConnections: { waitForConnections: true }`.
   */
  readonly waitForConnections?: boolean;
}

export interface ComposioSession {
  /** Stable id we can persist and reuse with `useSession()`. */
  readonly sessionId: string;
  /** Redirect URL for the hosted connect flow (when available). */
  readonly redirectUrl: string | undefined;
  /** Server-issued URL the agent hits to discover tools. */
  readonly mcpUrl: string | undefined;
}

export type ComposioError =
  | { kind: "invalid_user_id"; message: string }
  | { kind: "configuration_error"; message: string }
  | { kind: "connection_request_timeout"; message: string }
  | { kind: "connection_request_failed"; message: string }
  | { kind: "sdk_error"; message: string };

export interface ComposioClient {
  /**
   * Create a Composio tool-router session for one of our users.
   * Returns a stable sessionId plus the URLs the admin UI needs to
   * drive the connect flow.
   *
   * Adapter contract:
   *  - Boot fails if the API key is missing — the production
   *    container constructs this at module load.
   *  - SDK errors are caught and mapped to ComposioError variants;
   *    this method never throws.
   */
  createSession(
    userId: string,
    options?: ComposioSessionOptions,
  ): Promise<Result<ComposioSession, ComposioError>>;

  /**
   * Reuse a previously created session. Returns Err if the id is
   * unknown or expired.
   */
  useSession(sessionId: string): Promise<Result<ComposioSession, ComposioError>>;
}
