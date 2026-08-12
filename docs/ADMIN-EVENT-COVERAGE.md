# Admin event coverage

**Last reviewed:** 2026-08-13

Admin mutations and event controls require a boundary contract in addition to
use-case tests. The boundary tests verify the session gate, actor propagation,
input normalization, success mapping, and public error mapping where the
action exposes one.

| Surface | Boundary coverage |
| --- | --- |
| Course, module, and lesson CRUD | `src/app/actions/__tests__/admin-pure-actions.action.test.ts` |
| Simulator scenario draft, publish, archive, update, and reorder flows | `admin-pure-actions.action.test.ts` |
| Badge, discount, subscription, live-class, resource, and email-template actions | `admin-wrapper-actions.action.test.ts` |
| Audit-log and refund list/process actions | `admin-wrapper-actions.action.test.ts` |
| Quiz, certificate, enrollment, impersonation, and two-factor actions | Existing focused suites under `src/app/actions/__tests__` |
| Stop-impersonation recovery and confirmation controls | `stop-impersonating.action.test.ts` and `src/components/admin/__tests__/admin-event-controls.test.tsx` |

`admin-action-coverage.inventory.test.ts` keeps the tracked admin action list
connected to at least one boundary test file. New admin actions must be added
to that inventory and receive a focused success, authorization, and failure
contract before they are considered complete. Run the focused admin suites,
full unit and coverage runs, TypeScript, ESLint, architecture, and production
build checks before opening a pull request.
