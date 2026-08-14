# Architecture documentation index

**Reviewed:** 2026-08-14 against `6c61fc3`

These diagrams describe the current repository wiring, not the original greenfield target. The source of truth is `src/composition/container.ts` and the route tree under `src/app/`.

| File                                                     | Current subject                                         |
| -------------------------------------------------------- | ------------------------------------------------------- |
| [`01-layer-wiring.md`](./01-layer-wiring.md)             | Production and test dependency direction                |
| [`02-admin-panel-wiring.md`](./02-admin-panel-wiring.md) | Implemented admin route and use-case wiring             |
| [`03-site-map.md`](./03-site-map.md)                     | Current public, student, API, and admin route inventory |

Target design material remains in `docs/build-spec.md`. Historical audits preserve findings as of their dates; use `STATE.md` and `docs/README.md` for current status.
