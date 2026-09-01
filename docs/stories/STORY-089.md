# STORY-089: Connected-Account Simulator (variant)

## Summary

A simulator variant where students authenticate with a **real but safe Amazon Ads sandbox account** to perform operations against live Amazon Ads API endpoints, while maintaining strict isolation from production credentials and data.

## Problem Statement

Current simulators (Bid Elevator, STR Triage, Campaign Builder, Listing Audit) use synthetic data and mocked responses. While excellent for teaching fundamentals, they cannot:

- Demonstrate real API latency, rate limits, and error modes
- Teach authentication/authorization flows
- Show real campaign/keyword/ad group data structures
- Enable testing against actual Amazon Ads API constraints

The audit flags this as a gap: "Documented in the audit as a planned simulator variant where students connect to a real, safe Amazon environment, but no story doc, no code, and no test scaffolding exist on `main`."

## Threat Model

### Assets to Protect

1. **Production Amazon Ads accounts** - Must never be accessible or discoverable
2. **Student credentials** - Must never be stored or logged
3. **Sandbox account credentials** - Must be rotated, encrypted at rest, and injected at runtime
4. **Student data privacy** - No PII may leak through API calls or logs

### Attack Surface

| Threat | Mitigation |
|--------|------------|
| Student submits malicious payload to sandbox API | Input validation, request signing, rate limiting |
| Sandbox credentials leaked via client-side code | Credentials injected server-side only, never exposed to browser |
| Production credentials used in sandbox | Separate AWS account, separate IAM roles, explicit account ID validation |
| Student credentials stored in database | OAuth flow with short-lived tokens only, no credential persistence |
| API responses contain production data | Sandbox account has no production data; all entities prefixed for identification |

### Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Student   │───▶│ OAuth Flow  │───▶│ Amazon Ads API   │  │
│  │   UI        │    │ (PKCE)      │    │ (Sandbox Account)│  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server (Next.js)                           │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                  │
│  │ Token Exchange  │───▶│ Sandbox          │                  │
│  │ (Server-side)   │    │ Credential       │                  │
│  │                 │    │ Injection        │                  │
│  └─────────────────┘    └─────────────────┘                  │
│                        │                                      │
│                        ▼                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            ConnectedAccountSimulator                 │    │
│  │  - Validates sandbox account isolation               │    │
│  │  - Applies rate limiting                            │    │
│  │  - Sanitizes all requests/responses                │    │
│  │  - Logs without PII                                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Required Amazon Ads API Capabilities

### Minimum Viable Scope

| API | Purpose | Rate Limit Considerations |
|-----|---------|---------------------------|
| `GET /v13/campaigns` | List campaigns | 100 req/second |
| `GET /v13/campaigns/{campaignId}` | Get campaign details | 100 req/second |
| `POST /v13/campaigns` | Create campaign | 50 req/second |
| `PUT /v13/campaigns/{campaignId}` | Update campaign | 50 req/second |
| `GET /v13/adGroups` | List ad groups | 100 req/second |
| `GET /v13/keywords` | List keywords | 100 req/second |
| `GET /v13/targets` | List targeting | 100 req/second |
| `GET /v2/budgets` | Get budget info | 100 req/second |

### Nice-to-Have (Future)

| API | Purpose |
|-----|---------|
| `GET /v13/reports` | Pull performance reports |
| `POST /v13/bidding` | Adjust bids |
| `POST /v13/negativeKeywords` | Manage negatives |

## Sandbox Environment Choice

See [ADR-008: Amazon Ads Sandbox Strategy](./../adr/ADR-008-amazon-ads-sandbox.md) for the detailed decision.

**Chosen Approach: Dedicated Developer Account with Test Profile**

- Amazon provides [Developer Accounts](https://developer.amazon.com/alexa/console/aa) with access to sandbox environments
- Create a dedicated test profile within the developer account
- Use test-only entities (campaigns prefixed with `TEST_`, budgets with $0)
- All test entities are automatically isolated from production

### Sandbox Account Setup

```bash
# AWS credentials for sandbox account (stored in AWS Secrets Manager)
# Rotation: Every 90 days
# Access: Only the simulator service role
AMAZON_ADS_SANDBOX_CLIENT_ID=...     # From Amazon Ads Developer Console
AMAZON_ADS_SANDBOX_CLIENT_SECRET=... # From Amazon Ads Developer Console
AMAZON_ADS_SANDBOX_REFRESH_TOKEN=...  # Long-lived refresh token
AMAZON_ADS_SANDBOX_PROFILE_ID=...     # Test profile ID
AMAZON_ADS_SANDBOX_ACCOUNT_ID=...     # Test account ID
```

### Account Validation

Every request must validate:
1. The account ID matches `AMAZON_ADS_SANDBOX_ACCOUNT_ID`
2. The profile ID matches `AMAZON_ADS_SANDBOX_PROFILE_ID`
3. All entity names are prefixed with `TEST_` or `SANDBOX_`

## Authentication Flow

### OAuth 2.0 with PKCE

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ Student │     │   Client    │     │   Server    │
│ Browser │     │ (Next.js)   │     │ (Next.js)   │
└────┬────┘     └──────┬──────┘     └──────┬──────┘
     │                  │                  │
     │  1. Start Auth   │                  │
     │─────────────────▶│                  │
     │                  │                  │
     │  2. Redirect to   │                  │
     │     Amazon Auth  │                  │
     │◀─────────────────│                  │
     │                  │                  │
     │  3. Auth Code    │                  │
     │─────────────────▶│                  │
     │                  │                  │
     │                  │  4. Exchange     │
     │                  │     Code + PKCE  │
     │                  │────────────────▶│
     │                  │                  │
     │                  │  5. Access Token │
     │                  │◀─────────────────│
     │                  │                  │
     │  6. Complete     │                  │
     │◀─────────────────│                  │
     │                  │                  │
```

### Token Management

- **Access Token**: Short-lived (1 hour), stored in HTTP-only cookie
- **Refresh Token**: Long-lived, stored in encrypted server-side session
- **PKCE**: Required for all OAuth flows to prevent code interception

## Fallback Behaviour

### Sandbox Unavailable

1. **Transient errors** (5xx, rate limits): Retry with exponential backoff (max 3 attempts)
2. **Authentication errors** (401/403): Clear session, redirect to re-authenticate
3. **Permanent errors** (sandbox account suspended): 
   - Show maintenance message
   - Fall back to synthetic simulator mode
   - Log error to monitoring (without credentials)

### Feature Flag

```typescript
// src/domain/features.ts
const FEATURES = {
  CONNECTED_ACCOUNT_SIMULATOR: {
    enabled: false, // Default: disabled
    description: "Enable connected account simulator (STORY-089)",
    riskLevel: "high",
    rollout: "admin-only", // Only admins can enable for their account
  },
} as const;
```

### Graceful Degradation

```
┌─────────────────────────────────────────────────────────┐
│                    Feature Flag Check                      │
└─────────────────────────────────────────────────────────┘
                           │
              ┌────────────────────┬────────────────────┐
              ▼                    ▼                    ▼
        ┌───────────┐          ┌───────────┐      ┌───────────┐
        │  Enabled  │          │ Disabled  │      │  Error    │
        └────┬──────┘          └────┬──────┘      └────┬──────┘
             │                     │                  │
             ▼                     ▼                  ▼
   ┌───────────────┐    ┌───────────────┐    ┌─────────────┐
   │ Real Sandbox │    │ Synthetic    │    │ Maintenance │
   │   Simulator   │    │ Simulator    │    │   Message   │
   └───────────────┘    └───────────────┘    └─────────────┘
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  POST /api/simulators/connected-account/auth/start           │    │
│  │  GET  /api/simulators/connected-account/auth/callback       │    │
│  │  POST /api/simulators/connected-account/attempt/start       │    │
│  │  GET  /api/simulators/connected-account/campaigns/list      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Use Cases                                    │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │  StartOAuthFlow           │  │  ExchangeAuthCode         │      │
│  │  GenerateAuthURL          │  │  ValidateState            │      │
│  │  StoreSessionState       │  │  ExchangeCodeForToken     │      │
│  └─────────────────────────┘  │  StoreTokens              │      │
│                                    └─────────────────────────┘      │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │  ListCampaigns            │  │  CreateCampaign           │      │
│  │  ValidateSandboxIsolation │  │  ValidateEntityPrefix     │      │
│  │  ApplyRateLimiting       │  │  SanitizeRequest          │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Adapters                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AmazonAdsApiClient                                      │    │
│  │    - Signed requests                                     │    │
│  │    - Retry logic                                         │    │
│  │    - Response validation                                 │    │
│  │    - PII scrubbing                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  OAuthTokenRepository                                    │    │
│  │    - Encrypted token storage                            │    │
│  │    - Server-side session management                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AWS Secrets Manager                                     │    │
│  │    - Sandbox credentials                                │    │
│  │    - Automatic rotation                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Redis                                                  │    │
│  │    - Rate limiting counters                             │    │
│  │    - Session storage                                     │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Domain Model

### Entities

```typescript
// src/domain/entities/ConnectedAccountSession.ts
interface ConnectedAccountSession {
  readonly id: string;
  readonly userId: string;
  readonly amazonAdsAccountId: string;
  readonly amazonAdsProfileId: string;
  readonly accessToken: string; // Encrypted
  readonly refreshToken: string; // Encrypted
  readonly tokenExpiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// src/domain/entities/ConnectedAccountAttempt.ts
interface ConnectedAccountAttempt {
  readonly id: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly action: ConnectedAccountAction;
  readonly requestPayload: Record<string, unknown>; // Sanitized
  readonly responsePayload: Record<string, unknown>; // Sanitized
  readonly status: "pending" | "success" | "failed";
  readonly errorMessage?: string;
  readonly createdAt: Date;
}

type ConnectedAccountAction =
  | "list_campaigns"
  | "get_campaign"
  | "create_campaign"
  | "update_campaign"
  | "list_ad_groups"
  | "list_keywords";
```

## Rate Limiting

### Strategy

1. **Per-user rate limiting**: 10 requests/second per user
2. **Global rate limiting**: 100 requests/second across all users
3. **Per-endpoint limits**: Respect Amazon Ads API limits

### Implementation

```typescript
// src/infra/rateLimiter/ConnectedAccountRateLimiter.ts
interface RateLimitConfig {
  userLimit: { requests: number; windowMs: number };
  globalLimit: { requests: number; windowMs: number };
}

class ConnectedAccountRateLimiter {
  private userCounters: Map<string, { count: number; resetAt: Date }>;
  private globalCounter: { count: number; resetAt: Date };

  async checkRateLimit(userId: string): Promise<Result<void, RateLimitError>> {
    // Check user limit
    // Check global limit
    // Return error if exceeded
  }
}
```

## Error Handling

### Error Classification

| Type | Example | User Message | Log Level |
|------|---------|--------------|-----------|
| Transient | 429 Too Many Requests | "API is busy, please retry" | Warn |
| Authentication | 401 Unauthorized | "Session expired, please re-authenticate" | Info |
| Validation | Entity not prefixed | "Invalid request: entity must be prefixed" | Warn |
| Sandbox | Account mismatch | "Sandbox unavailable" | Error |
| Unknown | 500 Internal Error | "Something went wrong" | Error |

### Error Response Format

```typescript
interface ConnectedAccountError {
  readonly kind:
    | "authentication_required"
    | "rate_limit_exceeded"
    | "validation_error"
    | "sandbox_unavailable"
    | "api_error"
    | "unknown_error";
  readonly message: string;
  readonly details?: Record<string, string>;
  readonly retryable: boolean;
}
```

## Testing Strategy

### Unit Tests

- Token exchange logic
- Request signing
- Response validation
- PII scrubbing
- Rate limiting

### Integration Tests (Mocked Amazon API)

- Full OAuth flow
- Campaign CRUD operations
- Error scenarios

### E2E Tests (Sandbox Account)

- Real authentication
- Real API calls (behind feature flag)
- Performance testing

## Rollout Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Create sandbox Amazon Ads account
- [ ] Set up credentials in AWS Secrets Manager
- [ ] Implement OAuth token exchange
- [ ] Implement token storage

### Phase 2: Core Simulator (Week 2)
- [ ] Implement AmazonAdsApiClient
- [ ] Implement sandbox validation
- [ ] Implement rate limiting
- [ ] Add feature flag

### Phase 3: UI Integration (Week 3)
- [ ] Create connected account auth flow UI
- [ ] Create campaign list view
- [ ] Create campaign detail view
- [ ] Add fallback UI

### Phase 4: Testing & Hardening (Week 4)
- [ ] Security review
- [ ] Load testing
- [ ] Error scenario testing
- [ ] Documentation

## Open Questions

1. **Should we support multiple sandbox accounts?** (For different regions)
2. **Should we allow students to use their own sandbox credentials?** (Security implications)
3. **How do we handle API version changes?** (Amazon Ads API versions periodically)
4. **Should we cache API responses?** (For performance and rate limit management)

## References

- [Amazon Ads API Documentation](https://developer.amazon.com/amazon-ads/api)
- [Amazon Ads OAuth 2.0](https://developer.amazon.com/docs/login-with-amazon/authorization-code-grant.html)
- [ADR-008: Amazon Ads Sandbox Strategy](./../adr/ADR-008-amazon-ads-sandbox.md)
- [Security Review Checklist](../../security/REVIEW_CHECKLIST.md)
