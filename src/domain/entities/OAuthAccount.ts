/**
 * OAuthAccount — social-login linkage (P1-04).
 *
 * A row links a user to one provider identity. Providers match the
 * schema allowlist; only google has a wired broker in this slice,
 * and the use-case layer refuses the rest with
 * `provider_not_configured`.
 */

import { Result } from "@/domain/shared/Result";

export const OAUTH_PROVIDERS = ["google", "facebook", "github"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export interface OAuthAccount {
  readonly id: string;
  readonly userId: string;
  readonly provider: OAuthProvider;
  readonly providerUserId: string;
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly expiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreateOAuthAccountError =
  | { kind: "invalid_user_id" }
  | { kind: "invalid_provider" }
  | { kind: "invalid_provider_user_id" };

export function createOAuthAccount(params: {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  createdAt?: Date;
}): Result<OAuthAccount, CreateOAuthAccountError> {
  if (!params.userId.trim()) {
    return Result.err({ kind: "invalid_user_id" });
  }
  if (!isOAuthProvider(params.provider)) {
    return Result.err({ kind: "invalid_provider" });
  }
  if (!params.providerUserId.trim()) {
    return Result.err({ kind: "invalid_provider_user_id" });
  }
  const now = params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    userId: params.userId,
    provider: params.provider,
    providerUserId: params.providerUserId,
    accessToken: params.accessToken ?? null,
    refreshToken: params.refreshToken ?? null,
    expiresAt: params.expiresAt ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export type RefreshOAuthTokensError = { kind: "invalid_expires_at" };

/**
 * Replace stored tokens after a successful login. A NaN expiry is
 * rejected so a corrupt broker response cannot poison the row.
 */
export function refreshOAuthTokens(
  account: OAuthAccount,
  params: { accessToken: string | null; expiresAt: Date | null; updatedAt: Date },
): Result<OAuthAccount, RefreshOAuthTokensError> {
  if (params.expiresAt !== null && Number.isNaN(params.expiresAt.getTime())) {
    return Result.err({ kind: "invalid_expires_at" });
  }
  return Result.ok({
    ...account,
    accessToken: params.accessToken,
    expiresAt: params.expiresAt,
    updatedAt: params.updatedAt,
  });
}
