# STORY-044 — RevokeCertificate on Refund + Revocation Badge

## Status

- **Story**: STORY-044
- **Sprint**: 9 — Certificates + Email
- **Points**: 1
- **Status**: Done (commit e692235). RevokeCertificate use case also got Tier B test coverage in PR #69.

## Overview

Ship the ability to revoke a certificate. The HTML page (STORY-043) already
shows the REVOKED badge when a cert is in that state, so the "revocation
badge" UX is already in place — this story wires up the actual revocation
flow.

Two callers will revoke a cert:

- **Admin** (manual, e.g. fraud / chargeback) — via a server action
- **System** (auto, on refund processed) — wired in STORY-049
  (admin payments/refunds) when the refund processor lands

This story ships:

- `RevokeCertificate` use case
- `revokeCertificateAction` server action for admin use
- Container wiring for both

**Out of scope:**

- The actual admin UI for revoking — STORY-050 (admin panel)
- The auto-revoke-on-refund wiring — STORY-049 (when the refund
  processor use case lands)
- Audit log entry for the revocation — could be added now, but
  `AuditLog` writes are typically done by the caller, not the use case.
  Deferred to whichever story (049 or 050) calls into this.
- Re-issuance flow — deferred (separate use case)
- Email notification on revocation — STORY-045

## 1. Use Case — RevokeCertificate

```typescript
// src/usecases/RevokeCertificate.ts

export interface RevokeCertificateInput {
  certificateId: string;
  reason: string;        // human-readable, e.g. "refund_issued"
  revokedBy: string;     // userId of the admin OR "system" for auto
}

export type RevokeCertificateError =
  | { kind: "certificate_not_found" }
  | { kind: "invalid_reason" }     // empty/whitespace reason
  | { kind: "invalid_revoked_by" } // empty
  | { kind: "already_revoked" }    // idempotent guard
  | { kind: "db_error"; message: string };

export type RevokeCertificateResult = Result<
  { certificate: Certificate; wasAlreadyRevoked: boolean },
  RevokeCertificateError
>;

export interface RevokeCertificateDeps {
  certificateRepo: ICertificateRepository;
  clock: Clock;
}
```

**Flow:**

1. Validate `revokedBy` non-empty → `invalid_revoked_by`
2. Validate `reason` non-empty after trim → `invalid_reason`
3. Find certificate by id → `certificate_not_found`
4. If `status === "revoked"` → return `{ certificate, wasAlreadyRevoked: true }`
   (idempotent — admin retries are safe)
5. Transition via `revokeCertificate(cert, clock.now(), reason)` →
   should not fail because we already checked status
6. Persist via `certificateRepo.update(cert)` → `db_error` on failure
7. Return `{ certificate, wasAlreadyRevoked: false }`

**Why `wasAlreadyRevoked`?** Callers (admin UI, audit logs) need to know
whether this call actually did the work, or was a no-op retry. Returning
the flag in the success path keeps it in the `Result.ok` channel rather
than forcing every caller to inspect `certificate.status` after the fact.

**Idempotency strategy:** Domain layer already guards double-revoke
(`revokeCertificate` returns `invalid_status_transition`). The use case
checks `status === "revoked"` BEFORE calling the domain transition, so
the domain error never fires in practice. This keeps the use case
defensive without hiding bugs.

## 2. Server Action

```typescript
// src/app/actions/revokeCertificate.action.ts

"use server";

import { buildContainer } from "@/composition/container";

export type RevokeCertificateActionInput = {
  certificateId: string;
  reason: string;
};

export type RevokeCertificateActionError =
  | { kind: "unauthorized" }
  | { kind: "certificate_not_found" }
  | { kind: "invalid_reason" }
  | { kind: "db_error"; message: string };

export type RevokeCertificateActionResult = Result<
  { certificateId: string; wasAlreadyRevoked: boolean },
  RevokeCertificateActionError
>;

export async function revokeCertificateAction(
  input: RevokeCertificateActionInput,
): Promise<RevokeCertificateActionResult> { ... }
```

Thin wrapper around `RevokeCertificate.execute` that:

1. Extracts the calling user from the session cookie (via JoseJwtService
   — same pattern as the quiz attempt route).
2. Loads the user via the container's `userRepo` and checks `role === "ADMIN"`.
   On non-admin → `unauthorized`.
3. Calls `container.revokeCertificate.execute({ certificateId, reason, revokedBy: userId })`.
4. Maps use-case errors to action errors (renames `invalid_revoked_by` →
   swallowed, since we only call with `revokedBy: userId` which is non-empty
   by construction).

**Why a server action, not a route handler?** Admin actions in this
codebase are server actions (see `signup.action.ts`). Server actions
work well with the container pattern and let the admin UI be a plain
form. The admin UI itself is STORY-050.

**Admin auth:** The role check lives in the action, not the use case.
The use case accepts any `revokedBy` string (including `"system"`)
because future callers will be system processes. The action enforces
that callers are admins.

## 3. Container Wiring

```typescript
// In AppContainer:
revokeCertificate: RevokeCertificate;
```

No new ports or adapters — uses the existing `ICertificateRepository`
+ `Clock`. Same wiring in both prod and test containers.

## 4. Tests

- `RevokeCertificate.test.ts` — unit tests:
  - happy path: returns the revoked cert with `wasAlreadyRevoked: false`
  - already revoked: returns the same cert with `wasAlreadyRevoked: true`
    (idempotent)
  - cert not found → `certificate_not_found`
  - empty reason → `invalid_reason`
  - whitespace-only reason → `invalid_reason`
  - empty `revokedBy` → `invalid_revoked_by`
  - update fails → `db_error` (with the original repo message)
  - domain `invalid_status_transition` is unreachable (covered indirectly
    via the `already_revoked` short-circuit)
- `revokeCertificateAction.test.ts` — integration-ish tests:
  - admin user → success
  - non-admin user → `unauthorized`
  - unauthenticated → `unauthorized`
  - missing session cookie → `unauthorized`
  - use case errors propagate correctly
  - happy path returns the certificateId
- `container.test.ts` — wiring test

The server action tests use vitest with mocked cookies/headers — same
pattern as the existing action tests if any exist. Will check the
existing patterns before writing.

## 5. Files

| File | Change |
|---|---|
| `docs/stories/STORY-044.md` | New — this doc |
| `src/usecases/RevokeCertificate.ts` | New — use case |
| `src/app/actions/revokeCertificate.action.ts` | New — server action |
| `src/composition/container.ts` | Wire `revokeCertificate` |
| `tests/unit/usecases/RevokeCertificate.test.ts` | New — use case tests |
| `tests/unit/actions/revokeCertificateAction.test.ts` | New — action tests |
| `tests/unit/composition/container.test.ts` | Add wiring test |

## 6. Design Decisions

- **Idempotent on already-revoked** — admin retries are safe; returns
  `wasAlreadyRevoked: true` so callers can log appropriately.
- **`revokedBy` is a string, not a UserId type** — allows `"system"`
  for future automated callers. The action enforces the admin contract;
  the use case stays generic.
- **No email notification here** — that's STORY-045. The revocation is
  recorded; the email goes out when the email infra is built.
- **No audit log entry here** — the audit log is the caller's
  responsibility (either the action or the future refund processor
  writes it with the revocation context). Avoids pulling `AuditLog`
  into every use case that mutates state.
- **Server action rather than route handler** — matches the admin
  pattern in `signup.action.ts`. STORY-050 will call this from a form.
- **Domain guard (`revokeCertificate`) is the second line of defense** —
  the use case pre-checks status so the domain error never fires in
  normal flow. If a future caller bypasses the use case, the domain
  layer still protects against double-revoke.
