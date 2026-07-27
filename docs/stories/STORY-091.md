# STORY-091 — Admin Quiz CRUD + Quiz Repository Gap

**Status:** 🟡 In Progress (US-003 complete; US-004/005/006 pending)

## Coverage in the Sprint-7/9 PRD

This story covers the quiz-admin track in
`.archon/ralph/sprints-6-7-9-completeness-gaps/prd.md`:

| US     | Title                                                                   | Status     |
| ------ | ----------------------------------------------------------------------- | ---------- |
| US-003 | Quiz repository: add update/delete/findAll + fix order persistence bug  | ✅ Done    |
| US-004 | Quiz admin use cases + audit actions + container wiring                 | ⏳ Pending |
| US-005 | Quiz admin server actions                                               | ⏳ Pending |
| US-006 | Quiz admin pages: list, create, edit with nested question/option editor | ⏳ Pending |

## US-003 — Quiz repository: add update/delete/findAll + fix order persistence bug

### Scope

1. **Add three methods to the `IQuizRepository` port**: `findAll()`, `update(quiz)`, `delete(id)`. Add a `not_found` variant to `QuizRepositoryError` (matches the pattern in `ICertificateRepository` and others).
2. **Implement the three methods in `InMemoryQuizRepository`**: full CRUD with `not_found` semantics on miss.
3. **Implement the three methods in `PrismaQuizRepository`**: `update` uses `$transaction` to atomic-replace the children; `delete` relies on the Prisma schema's `onDelete: Cascade`; `findAll` mirrors `findByCourseId` without the `where` filter.
4. **Fix the `order: 0` bug in `PrismaQuizRepository.create`**: questions and options were both hardcoded to `order: 0`, which made the `orderBy: { order: 'asc' }` clauses in `findById`/`findByCourseId` a no-op (every row had the same order). Now they use the array index — `qIndex` for questions, `oIndex` for options.

### Out of scope (deferred to other US)

- `findByCourseId` is untouched. US-003 only adds the missing methods and fixes the order bug.
- The `order` fix is a behavior change for any caller that depended on the (broken) old behavior. There are no such callers in the repo today — `findById` and `findByCourseId` are the only readers, and both use `orderBy: { order: 'asc' }`, which is the correct behavior once `order` is set.

### Verification

- `pnpm tsc --noEmit` clean (no new errors)
- `pnpm test:arch` 511/511 pass
- `pnpm lint` clean
- `pnpm vitest run src/infra/repositories/__tests__/InMemoryQuizRepository.test.ts src/infra/repositories/__tests__/PrismaQuizRepository.test.ts src/domain/entities/__tests__/Quiz.test.ts` — 40/40 pass
- The new `PrismaQuizRepository` test file (hand-rolled fake PrismaClient) specifically asserts that:
  - question 0 has `order=0`, question 1 has `order=1` (proves the bug fix)
  - options within a question have orders `[0, 1]` and `[0, 1, 2]` (proves the bug fix for options)
  - `findById` round-trips the question/option order
  - `update` replaces both rows and children in a single transaction
  - `delete` cascades to questions and options
  - `update` and `delete` return `not_found` on miss
  - `create` maps a thrown error to `db_error`

### Files

- `src/ports/repositories/IQuizRepository.ts` — port expansion
- `src/infra/repositories/InMemoryQuizRepository.ts` — adapter impl
- `src/infra/repositories/PrismaQuizRepository.ts` — adapter impl + order fix
- `src/infra/repositories/__tests__/InMemoryQuizRepository.test.ts` — new tests
- `src/infra/repositories/__tests__/PrismaQuizRepository.test.ts` — **new file** (was missing; the Prisma adapter had no unit tests before this)
