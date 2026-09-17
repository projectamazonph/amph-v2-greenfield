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

async function submitSixArtefacts(c: ReturnType<typeof buildTestContainer>, actorId = "user-1") {
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
}

describe("SubmitCapstone", () => {
  it("submits when all six kinds are SUBMITTED", async () => {
    const c = buildTestContainer();
    await submitSixArtefacts(c);
    const result = await c.submitCapstone.execute({
      actorId: "user-1",
      courseId: null,
      requiredKinds: [...KINDS],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("SUBMITTED");
    expect(result.value.artefactIds).toHaveLength(6);
  });

  it("rejects with the missing list when kinds are absent", async () => {
    const c = buildTestContainer();
    const result = await c.submitCapstone.execute({
      actorId: "user-1",
      courseId: null,
      requiredKinds: [...KINDS],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_ready");
    if (result.error.kind !== "not_ready") return;
    expect(result.error.missingKinds).toHaveLength(6);
  });

  it("re-submits a fresh DRAFT after a PASSED row (new attempt)", async () => {
    const c = buildTestContainer();
    await submitSixArtefacts(c);
    const first = await c.submitCapstone.execute({
      actorId: "user-1",
      courseId: null,
      requiredKinds: [...KINDS],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    // Simulate a pass by directly updating the row, then submit again:
    // a PASSED learner starts a new DRAFT rather than mutating history.
    const stored = await c.capstoneRepo.findById(first.value.id);
    expect(stored.ok).toBe(true);
    if (!stored.ok || !stored.value) return;
    const passed = { ...stored.value, status: "PASSED" as const };
    await c.capstoneRepo.update(passed);
    const second = await c.submitCapstone.execute({
      actorId: "user-1",
      courseId: null,
      requiredKinds: [...KINDS],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.id).not.toBe(first.value.id);
    expect(second.value.status).toBe("SUBMITTED");
  });
});
