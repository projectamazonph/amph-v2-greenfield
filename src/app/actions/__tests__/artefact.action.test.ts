import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionUserId, save, submit, list } = vi.hoisted(() => ({
  getSessionUserId: vi.fn<() => Promise<string | null>>(),
  save: vi.fn(),
  submit: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    saveArtefact: { execute: save },
    submitArtefact: { execute: submit },
    listStudentArtefacts: { execute: list },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { listArtefactsAction, saveArtefactAction, submitArtefactAction } from "../artefact.action";

const saveInput = {
  courseId: "course-1",
  kind: "decision-log",
  title: "First bid decision",
  scenarioRef: "bid-elevator:beginner-1",
  rationale: "Lowered the bid because ACoS exceeded 30%.",
};

beforeEach(() => {
  getSessionUserId.mockReset();
  save.mockReset();
  submit.mockReset();
  list.mockReset();
});

describe("saveArtefactAction", () => {
  it("requires authentication", async () => {
    getSessionUserId.mockResolvedValue(null);
    const result = await saveArtefactAction(saveInput);
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects an unknown kind before touching the use case", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    const result = await saveArtefactAction({ ...saveInput, kind: "quiz" });
    expect(result).toEqual({ ok: false, error: { kind: "invalid_kind" } });
    expect(save).not.toHaveBeenCalled();
  });

  it("saves with the session identity and returns the id", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    save.mockResolvedValue({
      ok: true,
      value: { id: "a-1", status: "DRAFT" },
    });
    const result = await saveArtefactAction(saveInput);
    expect(result).toEqual({ ok: true, value: { id: "a-1", status: "DRAFT" } });
    expect(save).toHaveBeenCalledWith({
      actorId: "user-1",
      artefactId: undefined,
      courseId: "course-1",
      kind: "decision-log",
      title: "First bid decision",
      scenarioRef: "bid-elevator:beginner-1",
      payload: { rationale: "Lowered the bid because ACoS exceeded 30%." },
    });
  });

  it("maps use-case errors through", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    save.mockResolvedValue({ ok: false, error: { kind: "not_found" } });
    const result = await saveArtefactAction({ ...saveInput, artefactId: "missing" });
    expect(result).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});

describe("submitArtefactAction", () => {
  it("requires authentication", async () => {
    getSessionUserId.mockResolvedValue(null);
    const result = await submitArtefactAction("a-1");
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(submit).not.toHaveBeenCalled();
  });

  it("submits with the session identity", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    submit.mockResolvedValue({
      ok: true,
      value: { id: "a-1", status: "SUBMITTED" },
    });
    const result = await submitArtefactAction("a-1");
    expect(result).toEqual({ ok: true, value: { id: "a-1", status: "SUBMITTED" } });
    expect(submit).toHaveBeenCalledWith({ actorId: "user-1", artefactId: "a-1" });
  });
});

describe("listArtefactsAction", () => {
  it("requires authentication", async () => {
    getSessionUserId.mockResolvedValue(null);
    const result = await listArtefactsAction();
    expect(result).toEqual({ ok: false, error: { kind: "unauthorized" } });
    expect(list).not.toHaveBeenCalled();
  });

  it("lists the caller's artefacts", async () => {
    getSessionUserId.mockResolvedValue("user-1");
    list.mockResolvedValue({
      ok: true,
      value: [
        {
          id: "a-1",
          kind: "decision-log",
          title: "First bid decision",
          status: "DRAFT",
          createdAt: new Date("2026-09-16T00:00:00.000Z"),
        },
      ],
    });
    const result = await listArtefactsAction({ kind: "decision-log" });
    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: "a-1",
          kind: "decision-log",
          title: "First bid decision",
          status: "DRAFT",
          createdAt: "2026-09-16T00:00:00.000Z",
        },
      ],
    });
    expect(list).toHaveBeenCalledWith({ actorId: "user-1", kind: "decision-log" });
  });
});
