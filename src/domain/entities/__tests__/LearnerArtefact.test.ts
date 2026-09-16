import { describe, expect, it } from "vitest";
import {
  createArtefact,
  isArtefactKind,
  isArtefactStatus,
  reviseArtefact,
  submitArtefact,
} from "@/domain/entities/LearnerArtefact";

const NOW = new Date("2026-09-16T00:00:00.000Z");

function validParams() {
  return {
    id: "art-1",
    userId: "user-1",
    courseId: "course-1",
    kind: "decision-log",
    title: "First bid decision",
    scenarioRef: "bid-elevator:beginner-1",
    payload: {
      rationale: "Lowered the bid because ACoS exceeded 30%.",
      fields: { kw: "bamboo board" },
    },
    createdById: "user-1",
    createdAt: NOW,
  };
}

describe("isArtefactKind", () => {
  it("accepts the six kinds and rejects anything else", () => {
    for (const kind of [
      "decision-log",
      "listing-audit",
      "keyword-plan",
      "campaign-map",
      "triage-report",
      "weekly-readout",
    ]) {
      expect(isArtefactKind(kind)).toBe(true);
    }
    expect(isArtefactKind("quiz")).toBe(false);
    expect(isArtefactKind("")).toBe(false);
  });
});

describe("isArtefactStatus", () => {
  it("accepts DRAFT and SUBMITTED, rejects anything else", () => {
    expect(isArtefactStatus("DRAFT")).toBe(true);
    expect(isArtefactStatus("SUBMITTED")).toBe(true);
    expect(isArtefactStatus("GRADED")).toBe(false);
    expect(isArtefactStatus("")).toBe(false);
  });
});

describe("createArtefact", () => {
  it("creates a DRAFT with trimmed fields", () => {
    const result = createArtefact({ ...validParams(), title: "  Padded title  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("DRAFT");
    expect(result.value.title).toBe("Padded title");
    expect(result.value.submittedAt).toBeNull();
    expect(result.value.payload.rationale).toBe("Lowered the bid because ACoS exceeded 30%.");
  });

  it("accepts a null courseId and a null scenarioRef", () => {
    const result = createArtefact({ ...validParams(), courseId: null, scenarioRef: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.courseId).toBeNull();
    expect(result.value.scenarioRef).toBeNull();
  });

  it("omits optional payload fields when absent", () => {
    const result = createArtefact({
      ...validParams(),
      payload: { rationale: "Explained the reason." },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.payload).toEqual({ rationale: "Explained the reason." });
  });

  it("keeps an explicit payload scenarioRef", () => {
    const result = createArtefact({
      ...validParams(),
      payload: { rationale: "Reason.", scenarioRef: "listing-audit:seed-1" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.payload.scenarioRef).toBe("listing-audit:seed-1");
  });

  it("rejects a blank userId", () => {
    expect(createArtefact({ ...validParams(), userId: "  " })).toEqual({
      ok: false,
      error: { kind: "invalid_user_id" },
    });
  });

  it("rejects an unknown kind", () => {
    expect(createArtefact({ ...validParams(), kind: "quiz-attempt" })).toEqual({
      ok: false,
      error: { kind: "invalid_kind" },
    });
  });

  it("rejects a blank title", () => {
    expect(createArtefact({ ...validParams(), title: "   " })).toEqual({
      ok: false,
      error: { kind: "invalid_title" },
    });
  });

  it("rejects a blank rationale", () => {
    expect(createArtefact({ ...validParams(), payload: { rationale: "  " } })).toEqual({
      ok: false,
      error: { kind: "invalid_rationale" },
    });
  });

  it("defaults createdAt to now when absent", () => {
    const params = validParams();
    const { createdAt: _ignored, ...withoutCreatedAt } = params;
    const result = createArtefact(withoutCreatedAt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.createdAt instanceof Date).toBe(true);
  });
});

describe("reviseArtefact", () => {
  it("revises a DRAFT owned by the caller", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const revised = reviseArtefact(created.value, {
      revisedById: "user-1",
      title: "Revised title",
      payload: { rationale: "New reason." },
      revisedAt: new Date("2026-09-17T00:00:00.000Z"),
    });
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.value.title).toBe("Revised title");
    expect(revised.value.payload.rationale).toBe("New reason.");
    expect(revised.value.status).toBe("DRAFT");
  });

  it("rejects revision by a non-owner", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      reviseArtefact(created.value, {
        revisedById: "user-2",
        title: "Hijack",
        payload: { rationale: "Mine now." },
        revisedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "not_owner" } });
  });

  it("rejects revision of a SUBMITTED artefact", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = submitArtefact(created.value, { submittedById: "user-1", submittedAt: NOW });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(
      reviseArtefact(submitted.value, {
        revisedById: "user-1",
        title: "Too late",
        payload: { rationale: "Locked." },
        revisedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "invalid_status" } });
  });

  it("rejects a blank revised title", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      reviseArtefact(created.value, {
        revisedById: "user-1",
        title: "  ",
        payload: { rationale: "Kept." },
        revisedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "invalid_title" } });
  });

  it("rejects a blank revised rationale", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      reviseArtefact(created.value, {
        revisedById: "user-1",
        title: "Kept",
        payload: { rationale: "" },
        revisedAt: NOW,
      }),
    ).toEqual({ ok: false, error: { kind: "invalid_rationale" } });
  });

  it("keeps explicit scenarioRef and fields on revise", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const revised = reviseArtefact(created.value, {
      revisedById: "user-1",
      title: "Revised",
      payload: {
        rationale: "Updated reason.",
        scenarioRef: "campaign-builder:seed-2",
        fields: { budget: "1500" },
      },
      revisedAt: NOW,
    });
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;
    expect(revised.value.payload.scenarioRef).toBe("campaign-builder:seed-2");
    expect(revised.value.payload.fields).toEqual({ budget: "1500" });
  });
});

describe("submitArtefact", () => {
  it("locks a DRAFT for review", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const submitted = submitArtefact(created.value, {
      submittedById: "user-1",
      submittedAt: NOW,
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.value.status).toBe("SUBMITTED");
    expect(submitted.value.submittedAt).toEqual(NOW);
  });

  it("rejects submission by a non-owner", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(submitArtefact(created.value, { submittedById: "user-9", submittedAt: NOW })).toEqual({
      ok: false,
      error: { kind: "not_owner" },
    });
  });

  it("rejects double submission", () => {
    const created = createArtefact(validParams());
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const once = submitArtefact(created.value, { submittedById: "user-1", submittedAt: NOW });
    expect(once.ok).toBe(true);
    if (!once.ok) return;
    expect(submitArtefact(once.value, { submittedById: "user-1", submittedAt: NOW })).toEqual({
      ok: false,
      error: { kind: "invalid_status" },
    });
  });
});
