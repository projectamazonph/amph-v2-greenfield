# Docstring Coverage Implementation Plan

**Date:** 2026-07-30
**Status:** Ready for implementation
**Scope:** Port layer (`src/ports/`) JSDoc compliance

---

## Current State

### Audit Summary

| Category | Count | Percentage |
|----------|-------|------------|
| Total port files (non-test) | 48 | 100% |
| Files with complete JSDoc | 43 | 89.6% |
| Files with partial JSDoc | 5 | 10.4% |
| Files with no methods (types only) | 0 | 0% |

### Files Requiring JSDoc

| File | Methods | JSDoc | Gap | Priority |
|------|---------|-------|-----|----------|
| `src/ports/observability/Logger.ts` | 5 | 1 | 4 | High |
| `src/ports/repositories/CourseRepository.ts` | 7 | 6 | 1 | Medium |
| `src/ports/repositories/IQuizAttemptRepository.ts` | 6 | 4 | 3 | Medium |
| `src/ports/repositories/IQuizRepository.ts` | 6 | 4 | 3 | Medium |
| `src/ports/repositories/OrderRepository.ts` | 8 | 7 | 1 | Medium |

**Total methods needing JSDoc: 12**

---

## JSDoc Standard (from `docs/build-spec.md`)

Every port method JSDoc must document:

1. **Input shape** — What parameters are accepted, their types, constraints
2. **Output shape** — What the method returns, including Result wrapper
3. **Error cases** — Which discriminated union variants can be returned
4. **Idempotency** — Whether calling twice with same input has same effect
5. **Postconditions** — What is guaranteed after the method succeeds

### Template

```typescript
/**
 * Brief description of what the method does.
 *
 * @param paramName - Description of parameter, constraints, format
 * @returns Description of return value
 * @throws Never throws (returns Result.err instead)
 *
 * Errors:
 * - `error_kind` — When condition X occurs
 * - `another_error` — When condition Y occurs
 *
 * Idempotent: Yes/No — explanation
 * Postconditions: What is guaranteed after success
 */
```

---

## Implementation Plan

### Phase 1: Logger Port (High Priority)

**File:** `src/ports/observability/Logger.ts`

Current state: 5 methods, 1 JSDoc (interface-level only)

Methods needing JSDoc:
1. `debug(message, context?)` — Log at DEBUG level
2. `info(message, context?)` — Log at INFO level
3. `warn(message, context?)` — Log at WARN level
4. `error(message, context?)` — Log at ERROR level
5. `child(bindings)` — Create scoped logger

### Phase 2: Repository Ports (Medium Priority)

#### CourseRepository.ts
Missing JSDoc:
- `findById(id)` — Find course by ID

#### IQuizAttemptRepository.ts
Missing JSDoc:
- `findById(id)` — Find attempt by ID
- `findByUserAndQuiz(userId, quizId)` — Find attempts by user+quiz
- `findLatestByUserAndQuiz(userId, quizId)` — Find most recent attempt

#### IQuizRepository.ts
Missing JSDoc:
- `create(quiz)` — Persist new quiz
- `findById(id)` — Find quiz by ID
- `findByCourseId(courseId)` — Find quizzes for a course

#### OrderRepository.ts
Missing JSDoc:
- `create(order)` — Persist new order

---

## Verification Checklist

After implementation, verify:

- [ ] All 48 port files have JSDoc on every method
- [ ] JSDoc includes input shape, output shape, error cases
- [ ] JSDoc notes idempotency where applicable
- [ ] JSDoc states postconditions
- [ ] No `@throws` annotations (ports return Result, never throw)
- [ ] ESLint passes (no new warnings)
- [ ] TypeScript compiles cleanly

---

## References

- `docs/build-spec.md` — Section 2: Layer 2 (Ports), Contract
- `AGENTS.md` — LSP principle: "documented in the port's JSDoc"
- `SESSION-HANDOVER.md` — "this repo's documented default is no comments unless the WHY is non-obvious"

---

## Out of Scope

- **Implementation files** (`src/infra/`, `src/usecases/`, `src/app/`) — Comments follow "the why, not the what" convention; not every method needs JSDoc
- **Domain files** (`src/domain/`) — Pure functions; tests are the documentation
- **Test files** — No JSDoc required
