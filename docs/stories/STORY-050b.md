# STORY-050b: Admin simulator scenarios CRUD

**Sprint:** 10
**Points:** 1
**Epic:** Admin panel
**Depends on:** STORY-050a (audit log + recordAuditLog)
**Blocks:** none

## Status

- **Story**: STORY-050b
- **Sprint**: 10 — Admin panel
- **Points**: 1
- **Status**: In progress (split from original STORY-050)

## Goal

Ship the admin simulator scenario CRUD surface.

`SimulatorScenario` is an immutable entity (the factory validates difficulty + simulatorId). The admin can create new scenarios, update fields on existing ones, and archive scenarios they no longer want. The scenarios are stored in a dedicated `ISimulatorScenarioRepository` — separate from the `SimulatorRegistry` which holds the runtime `Simulator<>` instances.

## Acceptance Criteria

### Port (NEW)

- [ ] `src/ports/repositories/ISimulatorScenarioRepository.ts`:
  - `listAll(simulatorId?): Promise<Result<SimulatorScenario[], RepositoryError>>`
  - `findById(id): Promise<Result<SimulatorScenario | null, RepositoryError>>`
  - `create(scenario: SimulatorScenario): Promise<Result<SimulatorScenario, SimulatorScenarioError | db_error>>`
  - `update(scenario: SimulatorScenario): Promise<Result<SimulatorScenario, SimulatorScenarioError | db_error>>`
  - `archive(id): Promise<Result<void, not_found | db_error>>`

### Infra (NEW)

- [ ] `src/infra/simulator/InMemorySimulatorScenarioRepository.ts`: implements ISimulatorScenarioRepository
- [ ] `src/infra/simulator/PrismaSimulatorScenarioRepository.ts`: stub (throws unimplemented — same pattern as PrismaAuditLog)

### Use cases (NEW — all TDD)

- [ ] `AdminListScenarios` (4-5 tests): list all scenarios, filter by simulatorId, sort by difficulty, empty, error
- [ ] `GetSimulatorScenario` (3-4 tests): happy path, not found, db_error
- [ ] `CreateSimulatorScenario` (5-6 tests): happy path, all validation errors, duplicate id, persistence
- [ ] `UpdateSimulatorScenario` (5-6 tests): happy path, all validation errors, not found, persistence
- [ ] `ArchiveSimulatorScenario` (3-4 tests): happy path, not found, persistence
- [ ] All 5 use cases call `recordAuditLog` on success:
  - `CreateSimulatorScenario` → `simulator.created`
  - `UpdateSimulatorScenario` → `simulator.updated`
  - `ArchiveSimulatorScenario` → `simulator.archived`

### Server actions (NEW)

- [ ] `src/app/actions/createSimulatorScenario.action.ts`
- [ ] `src/app/actions/updateSimulatorScenario.action.ts`
- [ ] `src/app/actions/archiveSimulatorScenario.action.ts`

### Pages (NEW)

- [ ] `src/app/admin/simulators/page.tsx` — list with simulatorId filter + "Add scenario" button
- [ ] `src/app/admin/simulators/new/page.tsx` — create form (simulatorId dropdown, name, description, difficulty, estimatedMinutes, JSON schema fields)
- [ ] `src/app/admin/simulators/[id]/edit/page.tsx` — edit form pre-populated

### Container (MODIFIED)

- [ ] `AppContainer` + `TestContainer`: wire `scenarioRepo` + the 5 use cases
- [ ] The `SimulatorRegistry` stays unchanged — it's for runtime execution, not admin CRUD

### Quality gate

- [ ] `tsc --noEmit` clean
- [ ] `vitest run` — 1236 + new tests passing
- [ ] `pnpm build` succeeds

## Pitfalls

- **`SimulatorScenario` is immutable** — the entity factory returns an immutable object. The `update` repository stores a frozen copy. Don't try to mutate it in place.
- **Schema fields** — `inputSchema` and `outputSchema` are `Record<string, unknown>`. The admin form can have two JSON textarea fields for these; validation is minimal (must be valid JSON when parsed).
- **simulatorId is a controlled enum** — `createSimulatorScenario` already validates it. Don't let the admin type arbitrary simulator IDs.
- **recordAuditLog actorId** — the server actions inject `actorId` from the session, same pattern as the course actions.

## Out of scope

- Runtime simulator execution (the `SimulatorRegistry` + `Simulator<>` interface is separate)
- Public scenario listing page
- Scenario analytics
- Bulk import/export
