import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

describe("GetCapstoneStatus", () => {
  it("reports not-ready with the missing list for a fresh learner", async () => {
    const c = buildTestContainer();
    const result = await c.getCapstoneStatus.execute({
      actorId: "user-1",
      requiredKinds: [
        "listing-audit",
        "keyword-plan",
        "campaign-map",
        "decision-log",
        "triage-report",
        "weekly-readout",
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.submission).toBeNull();
    expect(result.value.ready).toBe(false);
    expect(result.value.missingKinds).toHaveLength(6);
    expect(result.value.requiredKinds).toHaveLength(6);
  });

  it("reports ready once all six kinds are SUBMITTED", async () => {
    const c = buildTestContainer();
    const kinds = [
      "listing-audit",
      "keyword-plan",
      "campaign-map",
      "decision-log",
      "triage-report",
      "weekly-readout",
    ] as const;
    for (const kind of kinds) {
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
    const result = await c.getCapstoneStatus.execute({
      actorId: "user-1",
      requiredKinds: [
        "listing-audit",
        "keyword-plan",
        "campaign-map",
        "decision-log",
        "triage-report",
        "weekly-readout",
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ready).toBe(true);
    expect(result.value.missingKinds).toEqual([]);
    expect(result.value.submittedKinds).toHaveLength(6);
  });

  it("returns the latest submission row once submitted", async () => {
    const c = buildTestContainer();
    const kinds = [
      "listing-audit",
      "keyword-plan",
      "campaign-map",
      "decision-log",
      "triage-report",
      "weekly-readout",
    ] as const;
    for (const kind of kinds) {
      const saved = await c.saveArtefact.execute({
        actorId: "user-1",
        courseId: null,
        kind,
        title: `${kind} evidence`,
        scenarioRef: null,
        payload: { rationale: `Reason for ${kind}.` },
      });
      if (!saved.ok) throw new Error("seed");
      await c.submitArtefact.execute({ actorId: "user-1", artefactId: saved.value.id });
    }
    const submitted = await c.submitCapstone.execute({
      actorId: "user-1",
      courseId: null,
      requiredKinds: [
        "listing-audit",
        "keyword-plan",
        "campaign-map",
        "decision-log",
        "triage-report",
        "weekly-readout",
      ],
    });
    expect(submitted.ok).toBe(true);
    const status = await c.getCapstoneStatus.execute({
      actorId: "user-1",
      requiredKinds: [
        "listing-audit",
        "keyword-plan",
        "campaign-map",
        "decision-log",
        "triage-report",
        "weekly-readout",
      ],
    });
    expect(status.ok).toBe(true);
    if (!status.ok) return;
    expect(status.value.submission?.status).toBe("SUBMITTED");
  });
});
