# Architecture documentation index

These diagrams describe the current repository wiring, not the original greenfield target. The source of truth is `src/composition/container.ts` and the route tree under `src/app/`.

| File                                                     | Current subject                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`01-layer-wiring.md`](./01-layer-wiring.md)             | Production and test dependency direction, including the known adapter gaps |
| [`02-admin-panel-wiring.md`](./02-admin-panel-wiring.md) | Implemented admin route and use-case wiring                                |
| [`03-site-map.md`](./03-site-map.md)                     | Current public, student, API, and admin route inventory                    |

Target design material remains in `docs/build-spec.md`. When target design and source differ, record the difference in `docs/audit-2026-07-27-completeness-review.md` rather than treating the target as shipped behavior.
