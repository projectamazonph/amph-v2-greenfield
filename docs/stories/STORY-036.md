# STORY-036 — Simulator Infrastructure

## Status


**Status:** ✅ Done (see PR commits listed in the broader story-status audit at docs/sprint-11/SESSION-SUMMARY-2026-07-21.md)
- [ ] Doc written (you are here)
- [ ] Tests written (Red)
- [ ] Production code written (Green)
- [ ] Refactored
- [ ] Committed, PR open

## Context

STORY-036 lays the **core simulator infrastructure**: the `Simulator` port, the `SimulatorScenario` domain model, and a `SimulatorRegistry` that holds all available simulator implementations.

Simulators are the interactive Amazon PPC training tools at the heart of the course product. Each simulator:

- Accepts structured input (`TIn`)
- Runs a scoring algorithm
- Returns structured output (`TOut`)

Four simulators are planned:

1. **Bid Elevator** — adjust keyword bids to maximize ROAS
2. **STR Triage** — categorize search term reports
3. **Campaign Builder** — build a campaign structure from requirements
4. **Listing Audit + Keyword Research** — audit a listing and suggest keywords

This story only builds the **plumbing**. No simulator UI, no scoring algorithms, no pages. The plumbing enables all four in future stories without touching the architecture.

## Acceptance Criteria

1. `Simulator<TIn, TOut>` interface in `src/ports/simulator/` — `name`, `run(input: TIn): Promise<TOut>`
2. `SimulatorScenario` domain model in `src/domain/entities/SimulatorScenario.ts` — immutable entity with `id`, `simulatorId`, `name`, `description`, `inputSchema`, `outputSchema`
3. `SimulatorRegistry` port in `src/ports/simulator/SimulatorRegistry.ts` — `register(simulator)`, `get(id): Simulator | null`, `list(): Simulator[]`
4. `InMemorySimulatorRegistry` in `src/infra/simulator/InMemorySimulatorRegistry.ts` — the test + dev adapter
5. Both registries are **already wired** into the `AppContainer` and `TestContainer`
6. All four planned simulators are **stubbed** as `StubSimulator<TIn, TOut>` with a `run()` that throws `"Not implemented yet — see STORY-037+"` — this is intentional; it lets the registry be complete without blocking on UI work
7. Unit tests for `SimulatorScenario` entity
8. Unit tests for `InMemorySimulatorRegistry`
9. Container wiring tests (same pattern as `AwardBadge`)

## Code Shape

```
src/
  ports/
    simulator/
      Simulator.ts           # Simulator<TIn, TOut> interface
      SimulatorRegistry.ts   # SimulatorRegistry port
  domain/
    entities/
      SimulatorScenario.ts   # SimulatorScenario entity + createSimulatorScenario()
  infra/
    simulator/
      InMemorySimulatorRegistry.ts
      StubSimulator.ts       # generic stub, used for all 4 simulators

tests/
  unit/
    domain/
      entities/
        SimulatorScenario.test.ts
    infra/
      simulator/
        InMemorySimulatorRegistry.test.ts
    composition/
      container.test.ts       # add simulator wiring cases
```

**No pages, no API routes, no UI.** This story is pure infrastructure.

## Design Notes

- `Simulator<TIn, TOut>` is a **generic interface** — TypeScript generics let each simulator be type-safe without a shared schema
- `SimulatorScenario` is **immutable** — created once per scenario, never mutated. The registry owns the scenario catalog
- The stub simulators are intentional placeholders — future stories (`STORY-037+`) replace them with real implementations
- The registry pattern lets future stories add `runSimulator(id, input)` to the container as a use case without changing the architecture

## Schema Shape (SimulatorScenario entity)

```typescript
type SimulatorId = "bid-elevator" | "str-triage" | "campaign-builder" | "listing-audit";

interface SimulatorScenario {
  readonly id: string;
  readonly simulatorId: SimulatorId;
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>; // JSON Schema — used by UI
  readonly outputSchema: Record<string, unknown>; // JSON Schema — used by UI
  readonly difficulty: "beginner" | "intermediate" | "advanced";
  readonly estimatedMinutes: number;
}
```

## Prisma

No new Prisma models in this story. `SimulatorScenario` is seeded via a future migration if it needs persistence. For now it lives in-memory in the registry.

## Testing Strategy

- `SimulatorScenario` tests: entity creation, invalid simulatorId
- `InMemorySimulatorRegistry` tests: register, get, list, get-not-found
- Container tests: registry wired, all 4 stubs registered
