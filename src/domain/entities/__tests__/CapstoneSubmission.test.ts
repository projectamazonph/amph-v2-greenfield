import { describe, expect, it } from "vitest";
import {
  createCapstone,
  isCapstoneStatus,
  passCapstone,
  returnCapstoneForRevision,
  submitCapstone,
} from "@/domain/entities/CapstoneSubmission";

const NOW = new Date("2026-09-17T00:00:00.000Z");
const ARTEFACT_IDS = ["a-1", "a-2", "a-3", "a-4", "a-5", "a-6"];

function draft() {
  const result = createCapstone({
    id: "cap-1",
    userId: "user-1",
    courseId: "course-1",
    createdById: "user-1",
    createdAt: NOW,
  });
  if (!result.ok) throw new Error("fixture");
  return result.value;
}

function submitted() {
  const result = submitCapstone(draft(), {
    submittedById: "user-1",
    artefactIds: ARTEFACT_IDS,
    missingKinds: [],
    submittedAt: NOW,
  });
  if (!result.ok) throw new Error("fixture");
  return result.value;
}

describe("isCapstoneStatus", () => {
  it("accepts the four statuses and rejects anything else", () => {
    for (const status of ["DRAFT", "SUBMITTED", "NEEDS_REVISION", "PASSED"]) {
      expect(isCapstoneStatus(status)).toBe(true);
    }
    expect(isCapstoneStatus("GRADED")).toBe(false);
    expect(isCapstoneStatus("")).toBe(false);
  });
});

describe("createCapstone", () => {
  it("creates a DRAFT with no artefacts", () => {
    const row = draft();
    expect(row.status).toBe("DRAFT");
    expect(row.artefactIds).toEqual([]);
    expect(row.submittedAt).toBeNull();
  });

  it("defaults createdAt to now when absent", () => {
    const result = createCapstone({
      id: "cap-2",
      userId: "user-1",
      courseId: null,
      createdById: "user-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.createdAt instanceof Date).toBe(true);
    expect(result.value.courseId).toBeNull();
  });

  it("rejects a blank userId", () => {
    expect(
      createCapstone({ id: "cap-3", userId: "  ", courseId: null, createdById: "user-1" }),
    ).toEqual({ ok: false, error: { kind: "invalid_user_id" } });
  });
});

describe("submitCapstone", () => {
  it("submits a DRAFT with the artefact snapshot", () => {
    const row = submitted();
    expect(row.status).toBe("SUBMITTED");
    expect(row.artefactIds).toEqual(ARTEFACT_IDS);
    expect(row.submittedAt).toEqual(NOW);
  });

  it("re-submits after NEEDS_REVISION and clears the note", () => {
    const returned = returnCapstoneForRevision(submitted(), {
      reviewerId: "reviewer-1",
      note: "Fix the readout.",
      decidedAt: NOW,
    });
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    const resubmitted = submitCapstone(returned.value, {
      submittedById: "user-1",
      artefactIds: ARTEFACT_IDS,
      missingKinds: [],
      submittedAt: NOW,
    });
    expect(resubmitted.ok).toBe(true);
    if (!resubmitted.ok) return;
    expect(resubmitted.value.status).toBe("SUBMITTED");
    expect(resubmitted.value.reviewerNote).toBeNull();
  });

  it("rejects a non-owner", () => {
    expect(
      submitCapstone(draft(), {
        submittedById: "user-9",
        artefactIds: ARTEFACT_IDS,
        missingKinds: [],
        submittedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "not_owner" } });
  });

  it("rejects a second submit without revision", () => {
    expect(
      submitCapstone(submitted(), {
        submittedById: "user-1",
        artefactIds: ARTEFACT_IDS,
        missingKinds: [],
        submittedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "invalid_status" } });
  });

  it("rejects when kinds are missing", () => {
    expect(
      submitCapstone(draft(), {
        submittedById: "user-1",
        artefactIds: ["a-1"],
        missingKinds: ["keyword-plan"],
        submittedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "not_ready", missingKinds: ["keyword-plan"] } });
  });

  it("rejects an empty artefact list", () => {
    expect(
      submitCapstone(draft(), {
        submittedById: "user-1",
        artefactIds: [],
        missingKinds: [],
        submittedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "not_ready", missingKinds: [] } });
  });
});

describe("returnCapstoneForRevision", () => {
  it("returns a SUBMITTED row with the note", () => {
    const result = returnCapstoneForRevision(submitted(), {
      reviewerId: "reviewer-1",
      note: "  Fix the readout.  ",
      decidedAt: NOW,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("NEEDS_REVISION");
    expect(result.value.reviewerNote).toBe("Fix the readout.");
    expect(result.value.decidedById).toBe("reviewer-1");
  });

  it("rejects a DRAFT", () => {
    expect(
      returnCapstoneForRevision(draft(), {
        reviewerId: "reviewer-1",
        note: "Note.",
        decidedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "invalid_status" } });
  });

  it("rejects a blank note", () => {
    expect(
      returnCapstoneForRevision(submitted(), {
        reviewerId: "reviewer-1",
        note: "   ",
        decidedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "missing_note" } });
  });
});

describe("passCapstone", () => {
  it("passes a SUBMITTED row with six artefacts", () => {
    const result = passCapstone(submitted(), { reviewerId: "reviewer-1", decidedAt: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("PASSED");
    expect(result.value.decidedById).toBe("reviewer-1");
  });

  it("rejects a DRAFT", () => {
    expect(passCapstone(draft(), { reviewerId: "reviewer-1", decidedAt: NOW })).toEqual({
      ok: false,
      error: { kind: "invalid_status" },
    });
  });

  it("rejects fewer than six artefacts", () => {
    const partial = submitCapstone(draft(), {
      submittedById: "user-1",
      artefactIds: ["a-1", "a-2"],
      missingKinds: [],
      submittedAt: NOW,
    });
    // NOTE: the domain submitter does not count kinds — the use case
    // checks readiness via checkCapstoneReadiness. A two-id submit
    // with empty missingKinds is a caller bug the pass gate catches.
    expect(partial.ok).toBe(true);
    if (!partial.ok) return;
    expect(passCapstone(partial.value, { reviewerId: "reviewer-1", decidedAt: NOW })).toEqual({
      ok: false,
      error: { kind: "missing_artefacts" },
    });
  });
});
