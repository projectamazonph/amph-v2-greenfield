import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

function input(overrides: Record<string, unknown> = {}) {
  return {
    actorId: "user-1",
    courseId: "course-1",
    kind: "decision-log" as const,
    title: "First bid decision",
    scenarioRef: "bid-elevator:beginner-1",
    payload: { rationale: "Lowered the bid because ACoS exceeded 30%." },
    ...overrides,
  };
}

describe("SaveArtefact", () => {
  it("creates a DRAFT artefact", async () => {
    const c = buildTestContainer();
    const result = await c.saveArtefact.execute(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("DRAFT");
    expect(result.value.userId).toBe("user-1");
    expect(result.value.title).toBe("First bid decision");
  });

  it("revises a draft the caller owns", async () => {
    const c = buildTestContainer();
    const created = await c.saveArtefact.execute(input());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const revised = await c.saveArtefact.execute({
      ...input({ title: "Revised title", payload: { rationale: "New reason." } }),
      artefactId: created.value.id,
    });
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.value.title).toBe("Revised title");
  });

  it("rejects revision of another student's artefact", async () => {
    const c = buildTestContainer();
    const created = await c.saveArtefact.execute(input());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const revised = await c.saveArtefact.execute({
      ...input({ actorId: "user-2" }),
      artefactId: created.value.id,
    });
    expect(revised.ok).toBe(false);
    if (revised.ok) return;
    expect(revised.error.kind).toBe("not_owner");
  });

  it("returns not_found for an unknown artefactId", async () => {
    const c = buildTestContainer();
    const result = await c.saveArtefact.execute({
      ...input(),
      artefactId: "missing",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });
});
