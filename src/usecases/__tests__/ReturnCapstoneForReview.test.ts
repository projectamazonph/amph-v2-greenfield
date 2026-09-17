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

describe("ReturnCapstoneForReview", () => {
  it("returns a SUBMITTED row with the note and audits", async () => {
    const c = buildTestContainer();
    const row = await submitCapstone(c);
    const returned = await c.returnCapstoneForReview.execute({
      actorId: "admin-1",
      submissionId: row.id,
      note: "Fix the readout.",
    });
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    expect(returned.value.status).toBe("NEEDS_REVISION");
    expect(returned.value.reviewerNote).toBe("Fix the readout.");
  });

  it("rejects a blank note", async () => {
    const c = buildTestContainer();
    const row = await submitCapstone(c);
    const returned = await c.returnCapstoneForReview.execute({
      actorId: "admin-1",
      submissionId: row.id,
      note: "   ",
    });
    expect(returned.ok).toBe(false);
    if (returned.ok) return;
    expect(returned.error.kind).toBe("missing_note");
  });

  it("returns not_found for an unknown id", async () => {
    const c = buildTestContainer();
    const returned = await c.returnCapstoneForReview.execute({
      actorId: "admin-1",
      submissionId: "missing",
      note: "Note.",
    });
    expect(returned.ok).toBe(false);
    if (returned.ok) return;
    expect(returned.error.kind).toBe("not_found");
  });
});
