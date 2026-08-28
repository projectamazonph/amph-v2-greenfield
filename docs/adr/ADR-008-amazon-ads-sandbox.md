# ADR-008: Amazon Ads Sandbox Strategy

## Status

ACCEPTED

## Context

STORY-089 requires a connected-account simulator variant that allows students to authenticate with a real Amazon Ads API endpoint while maintaining complete isolation from production accounts and data. We need to choose a sandbox strategy that:

1. Provides real Amazon Ads API access
2. Is completely isolated from production
3. Is cost-effective (preferably free)
4. Allows automated testing
5. Minimizes credential management overhead

## Decision

We will use **Amazon Ads Developer Account with Dedicated Test Profile** as our sandbox strategy.

## Options Considered

### Option 1: Amazon Ads Developer Account with Test Profile

**Description**: Use Amazon's official developer program which provides access to sandbox environments through a dedicated test profile.

**Pros**:
- Official Amazon-supported solution
- Free tier available for development/testing
- Test entities are automatically isolated from production
- Can create test campaigns, ad groups, keywords with $0 budgets
- Real API responses with realistic data structures
- No risk of affecting production accounts

**Cons**:
- Requires manual setup in Amazon Ads Developer Console
- Credentials must be carefully managed
- Rate limits still apply (though higher than production)

### Option 2: Mock Server (e.g., MSW, WireMock)

**Description**: Create a mock server that simulates Amazon Ads API responses.

**Pros**:
- Complete control over responses
- No external dependencies
- Fast and reliable
- Easy to test

**Cons**:
- Not real API access - doesn't teach real authentication
- Responses may not match actual API behavior
- Doesn't demonstrate rate limits, latency, real error modes
- Requires ongoing maintenance to match API changes

### Option 3: LocalStack / Mockoon for Amazon Ads

**Description**: Use a local mocking tool to simulate Amazon Ads API.

**Pros**:
- Can run locally
- Some tools provide realistic responses

**Cons**:
- Amazon Ads API is complex - no complete mock exists
- Still not real API access
- Same limitations as Option 2

### Option 4: Shared Production Account with Prefix Isolation

**Description**: Use a real production Amazon Ads account but prefix all test entities.

**Pros**:
- Real API access
- No additional account setup

**Cons**:
- **HIGH RISK**: Any bug could affect production
- Even with prefixes, mistakes can happen
- Violates principle of complete isolation
- Not acceptable for security requirements

## Decision Rationale

We chose **Option 1 (Amazon Ads Developer Account with Test Profile)** because:

1. **Real API Access**: Students get authentic Amazon Ads API experience including OAuth flows, real data structures, and actual rate limits.

2. **Complete Isolation**: Amazon Ads explicitly states that test profiles are isolated from production. All test entities (campaigns, ad groups, etc.) exist only in the test environment.

3. **Cost-Effective**: Developer accounts are free for development/testing purposes. Test campaigns can have $0 budgets.

4. **Security**: Credentials are for a dedicated test account that has no access to production. Even if compromised, the blast radius is limited to the test environment.

5. **Maintainability**: Amazon maintains the sandbox environment, reducing our maintenance burden.

6. **Authenticity**: Students learn real-world skills they can apply to actual Amazon Ads management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Amazon Ads Developer Account                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                 Production Profile                        ││
│  │  (NOT USED - read-only access for reference only)       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              TEST_PROFILE_ID (Sandbox)                   ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ ││
│  │  │ TEST_Campaign │  │ TEST_AdGroup │  │ TEST_Keyword │ ││
│  │  │   (Budget: 0) │  │              │  │              │ ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘ ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Our Application                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ConnectedAccountSimulator                               ││
│  │    - OAuth 2.0 flow with PKCE                            ││
│  │    - Token management                                   ││
│  │    - Request signing                                    ││
│  │    - Sandbox validation (account/profile ID checks)      ││
│  │    - Entity prefix validation                           ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Sandbox Setup

### Step 1: Create Amazon Ads Developer Account

1. Go to [Amazon Ads Developer Console](https://developer.amazon.com/amazon-ads)
2. Sign up for a developer account
3. Create a new application
4. Note the Client ID and Client Secret

### Step 2: Create Test Profile

1. Log in to Amazon Ads console with the developer account
2. Navigate to Profile Management
3. Create a new profile named "Sandbox Test Profile"
4. Note the Profile ID
5. Ensure the profile has no access to production campaigns

### Step 3: Configure Test Entities

All test entities must be prefixed with `TEST_` or `SANDBOX_`:
- Campaigns: `TEST_<name>`
- Ad Groups: `TEST_<name>`
- Keywords: Can use any names (contained within test ad groups)
- Budgets: $0 daily budget

### Step 4: Store Credentials Securely

Store in AWS Secrets Manager:

```bash
# Sandbox account credentials
AMAZON_ADS_SANDBOX_CLIENT_ID=...           # From developer console
AMAZON_ADS_SANDBOX_CLIENT_SECRET=...       # From developer console
AMAZON_ADS_SANDBOX_REFRESH_TOKEN=...        # Obtained via OAuth flow
AMAZON_ADS_SANDBOX_PROFILE_ID=...           # Test profile ID
AMAZON_ADS_SANDBOX_ACCOUNT_ID=...           # Account ID for validation
```

Rotation schedule: Every 90 days

## Validation Rules

Every API request must pass these validations:

### Rule 1: Account ID Validation
```typescript
if (response.accountId !== SANDBOX_ACCOUNT_ID) {
  throw new SandboxValidationError("Account ID mismatch");
}
```

### Rule 2: Profile ID Validation
```typescript
if (response.profileId !== SANDBOX_PROFILE_ID) {
  throw new SandboxValidationError("Profile ID mismatch");
}
```

### Rule 3: Entity Prefix Validation (for write operations)
```typescript
function validateEntityName(entityType: string, name: string): boolean {
  const requiredPrefixes = ["TEST_", "SANDBOX_"];
  return requiredPrefixes.some(prefix => name.startsWith(prefix));
}
```

### Rule 4: Budget Validation (for campaign creation)
```typescript
if (request.budgetAmount > 0) {
  throw new SandboxValidationError("Test campaigns must have $0 budget");
}
```

## OAuth Flow

### Authorization Code Flow with PKCE

```
┌─────────┐     ┌─────────┐     ┌─────────────┐     ┌─────────┐
│ Student │     │ Browser │     │   Our      │     │ Amazon  │
│ Browser │     │  (SPA)  │     │   Server   │     │  Ads    │
└────┬────┘     └────┬────┘     └──────┬──────┘     └────┬────┘
     │              │              │               │
     │  1. Start    │              │               │
     │────────────▶│              │               │
     │              │              │               │
     │  2. Redirect │              │               │
     │     to Auth │              │               │
     │◀────────────│────────────▶│               │
     │              │              │               │
     │  3. Auth    │              │               │
     │     Code    │              │               │
     │◀────────────│─────────────│               │
     │              │              │               │
     │              │  4. Exchange │               │
     │              │     Code    │               │
     │              │◀────────────│────────────▶│
     │              │              │               │
     │              │  5. Tokens  │               │
     │              │◀────────────│               │
     │              │              │               │
     │  6. Complete │              │               │
     │◀────────────│              │               │
```

### PKCE Implementation

```typescript
// Step 1: Generate code verifier and challenge
const codeVerifier = generateRandomString(64);
const codeChallenge = base64UrlEncode(sha256(codeVerifier));

// Step 2: Redirect to Amazon with challenge
const authUrl = new URL("https://www.amazon.com/ap/oa");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("code_challenge", codeChallenge);
authUrl.searchParams.set("code_challenge_method", "S256");
authUrl.searchParams.set("state", state);
authUrl.searchParams.set("scope", "cpc_advertising:campaign_management");

// Step 3: Exchange code for tokens
const response = await fetch("https://api.amazon.com/auth/o2/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code_verifier: codeVerifier,
  }),
});
```

## Token Management

### Storage

- **Access Token**: HTTP-only, Secure, SameSite=Strict cookie (1 hour expiry)
- **Refresh Token**: Encrypted in server-side session (Redis)
- **Session State**: Server-side only, never exposed to client

### Refresh Flow

```typescript
async function refreshAccessToken(refreshToken: string): Promise<Tokens> {
  const response = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  
  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken, // Use new if provided
    expiresIn: tokens.expires_in,
  };
}
```

## Rate Limiting

### Per-User Limits

- 10 requests/second per user
- 100 requests/minute per user
- Burst: 20 requests

### Global Limits

- 100 requests/second total
- 1000 requests/minute total

### Amazon Ads API Limits

Respect Amazon's limits:
- Campaigns: 100 req/sec
- Ad Groups: 100 req/sec
- Keywords: 100 req/sec
- Reports: 50 req/sec

## Error Handling

### Sandbox-Specific Errors

```typescript
class SandboxValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxValidationError";
  }
}

class SandboxUnavailableError extends Error {
  constructor(cause?: Error) {
    super("Sandbox environment is unavailable");
    this.name = "SandboxUnavailableError";
    this.cause = cause;
  }
}
```

### Fallback Strategy

```typescript
async function withSandboxFallback<T>(
  operation: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isSandboxUnavailable(error)) {
      console.warn("Sandbox unavailable, falling back to synthetic mode");
      return fallback();
    }
    throw error;
  }
}
```

## Monitoring

### Metrics

- `connected_account.auth.success` - Successful authentications
- `connected_account.auth.failure` - Failed authentications
- `connected_account.api.requests` - Total API requests
- `connected_account.api.errors` - API errors by type
- `connected_account.rate_limit.hits` - Rate limit hits
- `connected_account.fallback.used` - Fallback to synthetic mode

### Alerts

- P1: Sandbox unavailable for >5 minutes
- P2: Authentication failure rate >10%
- P3: Rate limit hits >100/hour

## Security Considerations

### Credential Protection

1. **Never in code**: Credentials never committed to git
2. **Encrypted at rest**: All credentials encrypted in AWS Secrets Manager
3. **Injected at runtime**: Credentials injected as environment variables
4. **Short-lived**: Access tokens expire in 1 hour
5. **No logging**: Credentials never logged, even in debug mode

### PII Protection

1. **Scrub responses**: Remove any PII from API responses before storage
2. **No student data in sandbox**: Students cannot create entities with their own data
3. **Audit logging**: All sandbox operations logged without PII

### Network Security

1. **HTTPS only**: All communication over HTTPS
2. **CORS restricted**: Only allow requests from our domain
3. **CSRF protection**: Use SameSite cookies and CSRF tokens

## Migration Path

### Phase 1: Read-Only Mode
- Students can view sandbox campaigns
- No write operations allowed
- Minimal risk

### Phase 2: Write Mode (Prefixed)
- Students can create prefixed entities
- All writes validated for prefix
- Budget limited to $0

### Phase 3: Full Feature Set
- All Amazon Ads API operations supported
- Full validation in place

## Rollback Plan

1. **Immediate**: Disable feature flag
2. **Short-term**: All requests fall back to synthetic mode
3. **Long-term**: Remove sandbox integration, use mocks only

## Alternatives Rejected

### Alternative: Use Amazon's "Test Accounts" Feature
Some Amazon Ads accounts have a "test account" toggle. However:
- Not available to all account types
- Limited functionality
- Still requires production account access

### Alternative: Third-Party Mock Services
Services like Mockoon or Prism could mock the API. However:
- Not real API access
- Requires ongoing maintenance
- Doesn't teach authentication

### Alternative: Record/Replay Real API Calls
Record real API calls and replay them. However:
- Stale data
- Doesn't handle dynamic scenarios
- Privacy concerns with recorded data

## Conclusion

The Amazon Ads Developer Account with Test Profile approach provides the best balance of authenticity, security, and maintainability for STORY-089's connected-account simulator variant.
