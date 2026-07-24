# Architecture diagrams

Wiring diagrams for Project Amazon PH Academy, drawn against what is actually in the repo — not the aspirational target design in `docs/build-spec.md`. See `CLAUDE.md` §"Known gaps" for the prose version of the same facts.

| File                                                     | What it shows                                                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`01-layer-wiring.md`](./01-layer-wiring.md)             | The five-layer dependency graph as wired in `src/composition/container.ts` today, including the two production gaps (in-memory course/order repos, webhook bypassing the container). |
| [`02-admin-panel-wiring.md`](./02-admin-panel-wiring.md) | The planned Sprint 10 admin panel wiring per `docs/admin-backend.md` — nothing here is built yet.                                                                                    |
| [`03-site-map.md`](./03-site-map.md)                     | Every route across public/student/admin, color-coded by build status.                                                                                                                |

For the corresponding low-fidelity screen wireframes, see [`docs/ui-specs/wireframes/`](../ui-specs/wireframes/README.md).
