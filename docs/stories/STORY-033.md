# STORY-033 — Wire RecordQuizAttempt + Quiz Submission API

## Status

- **Story**: STORY-033
- **Sprint**: 7 — Quizzes + Gamification
- **Points**: 2
- **Status**: In Progress
- **Depends on**: STORY-032 (RecordQuizAttempt use case)

## Overview

STORY-032 shipped the `RecordQuizAttempt` use case in isolation, but the
downstream wiring was deferred:

1. **Container wiring** — `RecordQuizAttempt` not registered in
   `src/composition/container.ts`. The repos (`quizRepo`, `quizAttemptRepo`,
   `xpEventRepo`, `userRepo`, `idGen`, `clock`) are all there, but the use case
   itself isn't.
2. **No transport** — there is no way for a client to submit a quiz attempt.

This story closes both gaps:

- **Container**: add `recordQuizAttempt: RecordQuizAttempt` to `AppContainer`,
  in both `buildProductionContainer()` and `buildTestContainer()`. Also expose
  `xpEventRepo` on `TestContainer` (already on `AppContainer`) so the use case
  can be constructed in tests.
- **API route**: `POST /api/quizzes/[quizId]/attempt` — a Next.js route handler
  that:
  - Reads the authenticated user from the `amph_session` JWT cookie
  - Parses + validates the request body with Zod
  - Calls the use case via the container
  - Maps the result to an HTTP response (200/400/401/404)

## 1. Container changes

```typescript
// src/composition/container.ts

export interface AppContainer {
  // ... existing
  recordQuizAttempt: RecordQuizAttempt;
}

// In buildProductionContainer():
recordQuizAttempt: new RecordQuizAttempt({
  quizRepo,
  quizAttemptRepo,
  xpEventRepo,
  userRepo,
  idGen,
  clock,
}),

// In buildTestContainer() — same, with in-memory adapters
```

The production container gets `xpEventRepo` from a new
`PrismaXPEventRepository` instance. Wait — `PrismaXPEventRepository` exists but
isn't wired today. This story also wires it.

## 2. API Route

`src/app/api/quizzes/[quizId]/attempt/route.ts`

```
POST /api/quizzes/{quizId}/attempt
Cookie: amph_session=...   (JWT, set by middleware on authed pages)

Request body:
{
  "answers": [
    { "questionId": "q1", "selectedOptionId": "o1" },
    { "questionId": "q2", "selectedOptionId": "o3" }
  ]
}

Responses:
  200  { attempt, score, passed, xpAwarded }
  400  { error: "validation_error" | "invalid_answer", ... }
  401  { error: "unauthorized" }
  500  { error: "internal_error" }
```

The handler is split (per project convention) into:

- `route.ts` — thin Next.js handler: auth, parse, call, map result
- `processQuizAttempt.ts` — pure function: takes deps + input → result, no
  HTTP awareness. This is the testable unit.

### Auth

`/api/*` is not in `PROTECTED_PREFIXES` in `src/middleware.ts`, so the route
must verify the JWT itself. Use `JoseJwtService` (the same adapter the
middleware uses) with `JWT_SECRET`.

Failure modes:

- Cookie missing → 401 `unauthorized`
- JWT verify fails → 401 `unauthorized`
- Verified payload has no `sub` → 401 `unauthorized`

### Validation

Zod schema:

```typescript
const AttemptBody = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionId: z.string().min(1),
      }),
    )
    .min(1),
});
```

Empty answers array is rejected at the schema level (a quiz attempt with
zero answers is meaningless and would return `score: null, passed: null`
unhelpfully).

## 3. Tests

### Container tests

`tests/unit/composition/container.test.ts`

- `recordQuizAttempt` is a `RecordQuizAttempt` instance on both production
  and test containers
- The use case is constructed with the right deps (sanity: a successful
  attempt reaches the `quizAttemptRepo` and updates the row)

### API route tests

`src/app/api/quizzes/[quizId]/attempt/__tests__/processQuizAttempt.test.ts`

Following the `processWebhookEvent` pattern: a pure function
`processQuizAttempt(deps, input)` is exported and unit-tested without HTTP.

Cases:

- Happy path: 3 questions, all answered correctly, score 100, passed true,
  xpAwarded 20, attempt persisted as `completed`
- Partial: 2 of 3 questions answered, attempt persisted as `in_progress`,
  score null, passed null, xpAwarded 0
- Quiz not found: returns `{ ok: false, status: 404, error: "quiz_not_found" }`
- Invalid question id: returns `{ ok: false, status: 400,
error: { kind: "invalid_answer", ... } }`
- Invalid option id: same
- Empty answers array: returns `{ ok: false, status: 400,
error: "validation_error" }`
- Auth failure (no userId): returns `{ ok: false, status: 401,
error: "unauthorized" }`
- Failed quiz (score < passingScore): passed false, xpAwarded 0, attempt
  still persisted as `completed` (so the student sees their score)

The route handler itself is tested only for HTTP-layer concerns (status
code mapping). Business logic is in `processQuizAttempt`.

## 4. Files

| File                                                                        | Change                                                                                                   |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/composition/container.ts`                                              | Add `recordQuizAttempt` to `AppContainer` + both builders; add `xpEventRepo` (Prisma + InMemory) to both |
| `src/app/api/quizzes/[quizId]/attempt/route.ts`                             | New route handler                                                                                        |
| `src/app/api/quizzes/[quizId]/attempt/processQuizAttempt.ts`                | New pure handler function                                                                                |
| `src/app/api/quizzes/[quizId]/attempt/__tests__/processQuizAttempt.test.ts` | New tests                                                                                                |
| `tests/unit/composition/container.test.ts`                                  | New tests                                                                                                |

## 5. Design decisions

- **Pure-function handler** — same pattern as the PayMongo webhook route.
  The route is a 5-line HTTP wrapper; the logic is in a separately
  testable function. Avoids the brittleness of mocking `NextRequest`.
- **Route does its own auth** — `/api/*` is not protected by middleware
  today. Adding the route to `PROTECTED_PREFIXES` would also redirect
  unauth'd API callers to `/login`, which is wrong (they should get
  JSON 401, not an HTML redirect). The route verifies the JWT itself.
- **Zod for input validation** — matches the FEATURES.md security section
  ("Zod at every server action and route handler").
- **Empty answers rejected at the route** — the use case handles
  `answers: []` gracefully (returns in-progress attempt with
  score/passed null), but for a quiz submission endpoint the empty case
  is almost certainly a client bug, so we fail fast.
- **`xpEventRepo` exposed on `TestContainer`** — the test container
  already lists repos explicitly, so we just add it. Keeps parity
  between prod/test containers for the repos the use case needs.

## 6. Out of scope

- Quiz listing / fetching (separate stories)
- Quiz editor / admin (separate story)
- The actual quiz UI page (separate story — this story only ships the
  API)
- Re-attempt rate limiting (FEATURES.md mentions 24h between attempts;
  this is a follow-on)
