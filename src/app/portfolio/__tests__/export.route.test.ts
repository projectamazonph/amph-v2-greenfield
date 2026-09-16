import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

const mocks = vi.hoisted(() => ({
  getSessionUserId: vi.fn(),
  buildContainer: vi.fn(),
  listStudentArtefacts: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionUserId: mocks.getSessionUserId }));
vi.mock("@/composition/container", () => ({ buildContainer: mocks.buildContainer }));

import { GET as exportPortfolio } from "../export/route";

function artefact(id: string, userId: string, title: string) {
  return {
    id,
    userId,
    courseId: "course-1",
    kind: "decision-log" as const,
    title,
    scenarioRef: null,
    payload: { rationale: "Reason." },
    status: "DRAFT" as const,
    submittedAt: null,
    createdAt: new Date("2026-09-16T00:00:00.000Z"),
    updatedAt: new Date("2026-09-16T00:00:00.000Z"),
    deletedAt: null,
    createdById: userId,
    updatedById: userId,
  };
}

beforeEach(() => {
  mocks.getSessionUserId.mockReset();
  mocks.buildContainer.mockReset();
  mocks.listStudentArtefacts.mockReset();
  mocks.buildContainer.mockImplementation(() => ({
    listStudentArtefacts: { execute: mocks.listStudentArtefacts },
  }));
});

describe("portfolio export route", () => {
  it("returns 401 without a session", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    const response = await exportPortfolio();
    expect(response.status).toBe(401);
    expect(mocks.buildContainer).not.toHaveBeenCalled();
  });

  it("exports only the caller's artefacts as a JSON download", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.listStudentArtefacts.mockResolvedValue(
      Result.ok([artefact("a-1", "user-1", "Mine"), artefact("a-2", "user-1", "Mine too")]),
    );
    const response = await exportPortfolio();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
    expect(response.headers.get("Content-Disposition")).toContain("portfolio-artefacts-");
    const body = (await response.json()) as {
      artefacts: { id: string; title: string }[];
    };
    expect(body.artefacts.map((a) => a.id)).toEqual(["a-1", "a-2"]);
    expect(mocks.listStudentArtefacts).toHaveBeenCalledWith({ actorId: "user-1" });
  });

  it("returns 500 when the list fails", async () => {
    mocks.getSessionUserId.mockResolvedValue("user-1");
    mocks.listStudentArtefacts.mockResolvedValue(Result.err({ kind: "db_error", message: "down" }));
    const response = await exportPortfolio();
    expect(response.status).toBe(500);
  });
});
