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

describe("SubmitArtefact", () => {
  it("locks a DRAFT for review", async () => {
    const c = buildTestContainer();
    const created = await c.saveArtefact.execute(input());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = await c.submitArtefact.execute({
      actorId: "user-1",
      artefactId: created.value.id,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.value.status).toBe("SUBMITTED");
    expect(submitted.value.submittedAt).not.toBeNull();
  });

  it("rejects submission by a non-owner", async () => {
    const c = buildTestContainer();
    const created = await c.saveArtefact.execute(input());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = await c.submitArtefact.execute({
      actorId: "user-9",
      artefactId: created.value.id,
    });
    expect(submitted.ok).toBe(false);
    if (submitted.ok) return;
    expect(submitted.error.kind).toBe("not_owner");
  });

  it("rejects revision after submit", async () => {
    const c = buildTestContainer();
    const created = await c.saveArtefact.execute(input());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = await c.submitArtefact.execute({
      actorId: "user-1",
      artefactId: created.value.id,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    const revised = await c.saveArtefact.execute({
      ...input({ title: "Too late" }),
      artefactId: created.value.id,
    });
    expect(revised.ok).toBe(false);
    if (revised.ok) return;
    expect(revised.error.kind).toBe("invalid_status");
  });

  it("returns not_found for an unknown artefactId", async () => {
    const c = buildTestContainer();
    const result = await c.submitArtefact.execute({ actorId: "user-1", artefactId: "missing" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });
});
