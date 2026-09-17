import { describe, expect, it } from "vitest";
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

async function submitCapstone(c: ReturnType<typeof buildTestContainer>) {
  for (const kind of KINDS) {
    const saved = await c.saveArtefact.execute({
      actorId: "user-1",
      courseId: null,
      kind,
      title: `${kind} evidence`,
      scenarioRef: null,
      payload: { rationale: `Reason for ${kind}.` },
    });
    if (!saved.ok) throw new Error(`seed save failed for ${kind}`);
    const submitted = await c.submitArtefact.execute({
      actorId: "user-1",
      artefactId: saved.value.id,
    });
    if (!submitted.ok) throw new Error(`seed submit failed for ${kind}`);
  }
  const result = await c.submitCapstone.execute({
    actorId: "user-1",
    courseId: null,
    requiredKinds: [...KINDS],
  });
  if (!result.ok) throw new Error("seed capstone submit failed");
  return result.value;
}

describe("PassCapstoneReview", () => {
  it("passes a SUBMITTED row with six artefacts and audits", async () => {
    const c = buildTestContainer();
    const row = await submitCapstone(c);
    const passed = await c.passCapstoneReview.execute({
      actorId: "admin-1",
      submissionId: row.id,
    });
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    expect(passed.value.status).toBe("PASSED");
    expect(passed.value.decidedById).toBe("admin-1");
  });

  it("returns not_found for an unknown id", async () => {
    const c = buildTestContainer();
    const passed = await c.passCapstoneReview.execute({
      actorId: "admin-1",
      submissionId: "missing",
    });
    expect(passed.ok).toBe(false);
    if (passed.ok) return;
    expect(passed.error.kind).toBe("not_found");
  });
});
