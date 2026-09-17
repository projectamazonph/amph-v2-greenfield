import { describe, expect, it } from "vitest";
import { FixedClock } from "@/ports/system/Clock";
import { buildTestContainer } from "@/composition/container.test";
import type { ArtefactKind } from "@/domain/entities/LearnerArtefact";

const KINDS: readonly ArtefactKind[] = [
  "listing-audit",
  "keyword-plan",
  "campaign-map",
  "decision-log",
  "triage-report",
  "weekly-readout",
];

async function submitCapstone(c: ReturnType<typeof buildTestContainer>, actorId: string) {
  for (const kind of KINDS) {
    const saved = await c.saveArtefact.execute({
      actorId,
      courseId: null,
      kind,
      title: `${kind} evidence`,
      scenarioRef: null,
      payload: { rationale: `Reason for ${kind}.` },
    });
    if (!saved.ok) throw new Error(`seed save failed for ${kind}`);
    const submitted = await c.submitArtefact.execute({
      actorId,
      artefactId: saved.value.id,
    });
    if (!submitted.ok) throw new Error(`seed submit failed for ${kind}`);
  }
  const result = await c.submitCapstone.execute({
    actorId,
    courseId: null,
    requiredKinds: [...KINDS],
  });
  if (!result.ok) throw new Error("seed capstone submit failed");
  return result.value;
}

describe("ListCapstoneReviewQueue", () => {
  it("lists SUBMITTED rows oldest-first", async () => {
    const c = buildTestContainer();
    await submitCapstone(c, "user-1");
    (c.clock as FixedClock).advance(1000);
    await submitCapstone(c, "user-2");
    const queue = await c.listCapstoneReviewQueue.execute();
    expect(queue.ok).toBe(true);
    if (!queue.ok) return;
    expect(queue.value.map((r) => r.userId)).toEqual(["user-1", "user-2"]);
  });

  it("returns an empty queue when nothing is submitted", async () => {
    const c = buildTestContainer();
    const queue = await c.listCapstoneReviewQueue.execute();
    expect(queue.ok).toBe(true);
    if (!queue.ok) return;
    expect(queue.value).toEqual([]);
  });
});
