# Student event coverage

**Last reviewed:** 2026-08-13

Student-facing mutations and event handlers require boundary tests in addition
to use-case tests. Each boundary test covers authentication, the success path,
and the user-visible failure mapping where the boundary exposes one.

| Surface | Boundary coverage |
| --- | --- |
| Auth, reset, verification, account export and deletion | `src/app/actions/__tests__/student-event-boundaries.test.ts` and auth route/form tests |
| Checkout, enrollment, lessons, quizzes and refunds | Existing action and route suites under `src/app/actions/__tests__` and `src/app/api` |
| Simulator lifecycle, grading and feedback | `student-event-boundaries.test.ts`, `simulator-grading.action.test.ts`, and tool action suites |
| Live-class RSVP, cancellation, recording and watched state | `student-event-boundaries.test.ts` and student control tests |
| Resource download, certificate PDF and email verification routes | `src/app/api/__tests__/student-event-routes.test.ts` |
| Login, signup, RSVP, recording and data-export controls | `src/components/student/__tests__/student-event-controls.test.tsx` and existing checkout/enrollment tests |

Future student events must add a boundary test beside the action, route, or
component. Cover ownership or enrollment checks, the successful side effect,
and each public error mapping. Run the full unit, coverage, type, lint, and
architecture gates before opening a pull request.
