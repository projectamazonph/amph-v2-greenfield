# STORY-050b: Simulators (scenario CRUD)

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-050a (audit log writes for simulator CRUD)
**Blocks:** none

## Status

- **Story**: STORY-050b
- **Sprint**: 10 — Admin panel
- **Points**: 1
- **Status**: Pending (split from original STORY-050)

## Why split

See STORY-050a. Simulator CRUD is a distinct surface that deserves its own PR.

## Goal

Ship the admin simulator (scenario) CRUD surface.

## Acceptance Criteria

- [ ] `SimulatorScenario` already exists as an entity. Confirm the create/update factories exist (if not, add them).
- [ ] `ISimulatorScenarioRepository` (or whatever it's called): add `create`, `update`, `delete`, `listAll` (admin list view)
- [ ] 4 use cases: `AdminListSimulators`, `CreateSimulatorScenario`, `UpdateSimulatorScenario`, `ArchiveSimulatorScenario` (or `DeleteSimulatorScenario`)
- [ ] All TDD
- [ ] Audit log writes (via 050a's `recordAuditLog`) for each write
- [ ] 2-3 admin pages: `/admin/simulators` (list) + `/admin/simulators/new` + `/admin/simulators/[id]/edit`
- [ ] Container wiring

## Pitfalls

- `SimulatorScenario` may already have a registry / catalog in `infra/simulator/buildSimulatorRegistry.ts`. Confirm whether the admin CRUD writes to the same store or a separate one.

## Out of scope

- Runtime simulator execution
- Public simulator page
- Simulator analytics
