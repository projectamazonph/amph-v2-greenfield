/**
 * StubOAuthBroker — scripted IOAuthBroker for tests (P1-04, PR-D).
 *
 * Queued exchange/profile results let route and use-case tests
 * drive success and failure paths without HTTP. The authorize URL
 * is deterministic so start-route tests can assert the redirect.
 */

import { Result } from "@/domain/shared/Result";
import type {
  AuthorizeUrlInput,
  ExchangeCodeInput,
  IOAuthBroker,
  OAuthBrokerError,
  OAuthProfile,
  OAuthTokens,
} from "@/ports/auth/IOAuthBroker";
import type { OAuthProvider } from "@/domain/entities/OAuthAccount";

export class StubOAuthBroker implements IOAuthBroker {
  readonly provider: OAuthProvider;
  readonly authorizeUrls: string[] = [];
  readonly exchanged: ExchangeCodeInput[] = [];
  readonly profileRequests: string[] = [];
  exchangeQueue: Result<OAuthTokens, OAuthBrokerError>[] = [];
  profileQueue: Result<OAuthProfile, OAuthBrokerError>[] = [];

  constructor(provider: OAuthProvider = "google") {
    this.provider = provider;
  }

  buildAuthorizeUrl(input: AuthorizeUrlInput): string {
    const url =
      `https://stub-oauth.example/authorize?provider=${this.provider}` +
      `&state=${encodeURIComponent(input.state)}` +
      `&challenge=${encodeURIComponent(input.codeChallenge)}` +
      `&redirect=${encodeURIComponent(input.redirectUri)}`;
    this.authorizeUrls.push(url);
    return url;
  }

  async exchangeCode(input: ExchangeCodeInput): Promise<Result<OAuthTokens, OAuthBrokerError>> {
    this.exchanged.push(input);
    const next = this.exchangeQueue.shift();
    if (!next) throw new Error("StubOAuthBroker: exchangeQueue is empty");
    return next;
  }

  async fetchProfile(accessToken: string): Promise<Result<OAuthProfile, OAuthBrokerError>> {
    this.profileRequests.push(accessToken);
    const next = this.profileQueue.shift();
    if (!next) throw new Error("StubOAuthBroker: profileQueue is empty");
    return next;
  }
}
