import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { CheckCourseAccess } from "@/usecases/CheckCourseAccess";
import type { IAccessPolicy } from "@/ports/access/IAccessPolicy";
import type { AccessDecision } from "@/domain/values/AccessDecision";

describe("CheckCourseAccess", () => {
  let mockPolicy: IAccessPolicy;
  let useCase: CheckCourseAccess;

  const USER_ID = "user_01";
  const COURSE_ID = "course_01";

  beforeEach(() => {
    mockPolicy = {
      canAccess: vi.fn(),
    };
    useCase = new CheckCourseAccess(mockPolicy);
  });

  async function checkAccess() {
    return useCase.execute({ userId: USER_ID, courseId: COURSE_ID });
  }

  // ── happy path ─────────────────────────────────────────────

  it("returns ALLOWED when policy allows access", async () => {
    const decision: AccessDecision = { kind: "allowed" };
    vi.mocked(mockPolicy.canAccess).mockResolvedValue(decision);

    const result = await checkAccess();
    if (!Result.isOk(result)) throw new Error("expected ok");
    expect(result.value).toEqual(decision);
  });

  it("returns ALLOWED_PREVIEW when preview allowed", async () => {
    const decision: AccessDecision = { kind: "allowed_preview", previewLessonCount: 2 };
    vi.mocked(mockPolicy.canAccess).mockResolvedValue(decision);

    const result = await checkAccess();
    if (!Result.isOk(result)) throw new Error("expected ok");
    expect(result.value).toEqual(decision);
  });

  // ── denied decisions ──────────────────────────────────────

  it("returns error when DENIED_TIER", async () => {
    const decision: AccessDecision = {
      kind: "denied_tier",
      userTier: "STARTER",
      requiredTier: "PRO",
    };
    vi.mocked(mockPolicy.canAccess).mockResolvedValue(decision);

    const result = await checkAccess();
    if (!Result.isErr(result)) throw new Error("expected err");
    expect(result.error.kind).toBe("access_denied");
    expect(result.error.tier).toBe("STARTER");
  });

  it("returns error when DENIED_NOT_ENROLLED", async () => {
    vi.mocked(mockPolicy.canAccess).mockResolvedValue({ kind: "denied_not_enrolled" });

    const result = await checkAccess();
    if (!Result.isErr(result)) throw new Error("expected err");
    expect(result.error.kind).toBe("access_denied");
  });

  it("returns error when DENIED_NOT_AUTHENTICATED", async () => {
    vi.mocked(mockPolicy.canAccess).mockResolvedValue({ kind: "denied_not_authenticated" });

    const result = await checkAccess();
    if (!Result.isErr(result)) throw new Error("expected err");
    expect(result.error.kind).toBe("access_denied");
  });

  // ── calls policy with correct inputs ─────────────────────

  it("passes userId and courseId to policy", async () => {
    vi.mocked(mockPolicy.canAccess).mockResolvedValue({ kind: "allowed" });

    await checkAccess();

    expect(mockPolicy.canAccess).toHaveBeenCalledOnce();
    expect(mockPolicy.canAccess).toHaveBeenCalledWith(USER_ID, COURSE_ID);
  });
});
