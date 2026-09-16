import { describe, expect, it } from "vitest";
import { FixedClock } from "@/ports/system/Clock";
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

describe("ListStudentArtefacts", () => {
  it("lists only the caller's artefacts, newest first", async () => {
    const c = buildTestContainer();
    await c.saveArtefact.execute(input({ title: "Older" }));
    (c.clock as FixedClock).advance(1000);
    await c.saveArtefact.execute(input({ title: "Newer" }));
    await c.saveArtefact.execute(input({ actorId: "user-2", title: "Someone else" }));
    const listed = await c.listStudentArtefacts.execute({ actorId: "user-1" });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.map((a) => a.title)).toEqual(["Newer", "Older"]);
  });

  it("filters by kind", async () => {
    const c = buildTestContainer();
    await c.saveArtefact.execute(input({ kind: "keyword-plan", title: "Plan" }));
    await c.saveArtefact.execute(input({ kind: "decision-log", title: "Log" }));
    const listed = await c.listStudentArtefacts.execute({
      actorId: "user-1",
      kind: "keyword-plan",
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.map((a) => a.title)).toEqual(["Plan"]);
  });
});
