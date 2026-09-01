/**
 * ConnectedAccountSession - represents a user's authenticated session with Amazon Ads sandbox.
 * STORY-089: Connected-Account Simulator (variant)
 *
 * Pure domain - no side effects, no external dependencies.
 */

import { Result } from "@/domain/shared/Result";

export interface ConnectedAccountSession {
  readonly id: string;
  readonly userId: string;
  readonly amazonAdsAccountId: string;
  readonly amazonAdsProfileId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenExpiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ConnectedAccountSessionError =
  | { kind: "invalid_user_id" }
  | { kind: "invalid_account_id" }
  | { kind: "invalid_profile_id" }
  | { kind: "invalid_token" };

export interface CreateConnectedAccountSessionParams {
  readonly id: string;
  readonly userId: string;
  readonly amazonAdsAccountId: string;
  readonly amazonAdsProfileId: string;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenExpiresAt: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

/**
 * Validate and create a new ConnectedAccountSession.
 * All fields are required and must be non-empty (except tokens which are validated for format).
 */
export function createConnectedAccountSession(
  params: CreateConnectedAccountSessionParams,
): Result<ConnectedAccountSession, ConnectedAccountSessionError> {
  if (typeof params.userId !== "string" || params.userId.trim().length === 0) {
    return Result.err({ kind: "invalid_user_id" });
  }

  if (typeof params.amazonAdsAccountId !== "string" || params.amazonAdsAccountId.trim().length === 0) {
    return Result.err({ kind: "invalid_account_id" });
  }

  if (typeof params.amazonAdsProfileId !== "string" || params.amazonAdsProfileId.trim().length === 0) {
    return Result.err({ kind: "invalid_profile_id" });
  }

  if (typeof params.accessToken !== "string" || params.accessToken.length === 0) {
    return Result.err({ kind: "invalid_token" });
  }

  if (typeof params.refreshToken !== "string" || params.refreshToken.length === 0) {
    return Result.err({ kind: "invalid_token" });
  }

  if (!(params.tokenExpiresAt instanceof Date) || isNaN(params.tokenExpiresAt.getTime())) {
    return Result.err({ kind: "invalid_token" });
  }

  const now = params.updatedAt ?? params.createdAt ?? new Date();

  return Result.ok({
    id: params.id,
    userId: params.userId.trim(),
    amazonAdsAccountId: params.amazonAdsAccountId.trim(),
    amazonAdsProfileId: params.amazonAdsProfileId.trim(),
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    tokenExpiresAt: params.tokenExpiresAt,
    createdAt: params.createdAt ?? now,
    updatedAt: now,
  });
}

/**
 * Check if a session's access token is expired or about to expire.
 */
export function isTokenExpired(session: ConnectedAccountSession, bufferSeconds: number = 60): boolean {
  const now = new Date();
  const expiry = new Date(session.tokenExpiresAt.getTime() - bufferSeconds * 1000);
  return now >= expiry;
}

/**
 * Rehydrate a session from persisted plain data.
 */
export function hydrateConnectedAccountSession(plain: ConnectedAccountSession): ConnectedAccountSession {
  return {
    ...plain,
    tokenExpiresAt: new Date(plain.tokenExpiresAt),
    createdAt: new Date(plain.createdAt),
    updatedAt: new Date(plain.updatedAt),
  };
}
