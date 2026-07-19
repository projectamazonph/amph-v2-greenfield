# Architecture diagrams

Wiring diagrams for AMPH, drawn against what is actually in the repo right now. Use these diagrams as implementation snapshots, then confirm against the source files before making architectural changes.

| File | What it shows |
|---|---|
| [`01-layer-wiring.md`](./01-layer-wiring.md) | The current five-layer dependency graph and the remaining production persistence gaps in `src/composition/container.ts`. |
| [`02-admin-panel-wiring.md`](./02-admin-panel-wiring.md) | The currently implemented `/admin/*` wiring: route gates, pages, server actions, and use cases. |
| [`03-site-map.md`](./03-site-map.md) | Active route map across public, student, and admin surfaces, with build-state grouping. |

For low-fidelity screen wireframes, see [`docs/ui-specs/wireframes/`](../ui-specs/wireframes/README.md).
