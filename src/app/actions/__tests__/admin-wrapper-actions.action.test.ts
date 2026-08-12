import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

const mocks = vi.hoisted(() => {
  const state = { container: {} as Record<string, unknown> };
  return {
    state,
    requireAdmin: vi.fn(),
    getSessionUserId: vi.fn(),
    buildContainer: vi.fn(() => state.container),
    execute: vi.fn(),
    newId: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.requireAdmin,
  getSessionUserId: mocks.getSessionUserId,
}));
vi.mock("@/composition/container", () => ({ buildContainer: mocks.buildContainer }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/app/actions/resourceFileUpload.helper", () => ({
  uploadResourceFile: vi.fn(),
}));

import { adminGrantSubscriptionAction } from "../adminGrantSubscription.action";
import { archiveBadgeAction } from "../archiveBadge.action";
import { archiveDiscountCodeAction } from "../archiveDiscountCode.action";
import { createBadgeAction } from "../createBadge.action";
import { createDiscountCodeAction } from "../createDiscountCode.action";
import { createLiveClassAction } from "../createLiveClass.action";
import { createResourceAction } from "../createResource.action";
import { deleteLiveClassAction } from "../deleteLiveClass.action";
import { deleteResourceAction } from "../deleteResource.action";
import { listAuditLogsAction } from "../listAuditLogs.action";
import { listRefundRequestsAction } from "../listRefundRequests.action";
import { processRefundRequestAction } from "../processRefundRequest.action";
import { purgeResourceAction } from "../purgeResource.action";
import { updateBadgeAction } from "../updateBadge.action";
import { updateDiscountCodeAction } from "../updateDiscountCode.action";
import { updateEmailTemplateAction } from "../updateEmailTemplate.action";
import { updateLiveClassAction } from "../updateLiveClass.action";
import { updateResourceAction } from "../updateResource.action";

function useCase(name: string, result: unknown = Result.ok({})) {
  const execute = vi.fn().mockResolvedValue(result);
  mocks.state.container = { [name]: { execute } };
  return execute;
}

function adminUser() {
  return { id: "admin-1", role: "ADMIN" as const };
}

describe("admin server-action wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue(adminUser());
    mocks.getSessionUserId.mockResolvedValue("admin-1");
    mocks.state.container = {};
  });

  it("injects the admin actor when granting a subscription", async () => {
    const execute = useCase("adminGrantSubscription", Result.ok({ userId: "student-1", isNewUser: true }));
    const result = await adminGrantSubscriptionAction({ email: "student@example.com", subscriptionTier: "PRO" });
    expect(execute).toHaveBeenCalledWith({ email: "student@example.com", subscriptionTier: "PRO", actorId: "admin-1" });
    expect(result).toEqual({ ok: true, userId: "student-1", isNewUser: true });
  });

  it("maps badge and discount archive results", async () => {
    const badgeExecute = useCase("adminArchiveBadge", Result.ok({ badgeSlug: "first-quiz-pass" }));
    expect(await archiveBadgeAction("first-quiz-pass")).toEqual({ ok: true, badgeSlug: "first-quiz-pass" });
    expect(badgeExecute).toHaveBeenCalledWith({ slug: "first-quiz-pass", actorId: "admin-1" });

    const discountExecute = useCase("adminArchiveDiscountCode", Result.ok({ discountCodeId: "discount-1" }));
    expect(await archiveDiscountCodeAction("discount-1")).toEqual({ ok: true, discountCodeId: "discount-1" });
    expect(discountExecute).toHaveBeenCalledWith({ id: "discount-1", actorId: "admin-1" });
  });

  it("maps badge creation and preserves use-case errors", async () => {
    const execute = useCase("adminCreateBadge", Result.ok({ badge: { slug: "first-quiz-pass" } }));
    const input = { slug: "first-quiz-pass", name: "First", description: "Pass", iconName: "Trophy", xpReward: 10 };
    expect(await createBadgeAction(input)).toEqual({ ok: true, badgeSlug: "first-quiz-pass" });
    expect(execute).toHaveBeenCalledWith({ ...input, actorId: "admin-1" });

    useCase("adminCreateBadge", Result.err({ kind: "slug_taken" }));
    expect(await createBadgeAction(input)).toEqual({ ok: false, error: "slug_taken" });
  });

  it("normalizes discount-code dates and defaults course ids", async () => {
    const execute = useCase("adminCreateDiscountCode", Result.ok({ discountCodeId: "discount-1" }));
    const input = {
      code: "SAVE20",
      type: "PERCENTAGE" as const,
      value: 20,
      validFrom: "2026-08-01T00:00:00.000Z",
      validUntil: null,
    };
    expect(await createDiscountCodeAction(input)).toEqual({ ok: true, discountCodeId: "discount-1" });
    expect(execute).toHaveBeenCalledWith({
      ...input,
      maxUses: null,
      validFrom: new Date(input.validFrom),
      validUntil: null,
      courseIds: [],
      actorId: "admin-1",
    });
  });

  it("generates an id and injects the actor for live-class creation", async () => {
    mocks.state.container = { idGen: { newId: mocks.newId }, createLiveClass: { execute: mocks.execute } };
    mocks.newId.mockReturnValue("live-1");
    mocks.execute.mockResolvedValue(Result.ok({ liveClassId: "live-1" }));
    const input = {
      courseId: "course-1",
      title: "Office hours",
      scheduledAt: new Date("2099-01-01T00:00:00.000Z"),
      durationMinutes: 60,
      instructorId: "instructor-1",
      meetingUrl: "https://meet.example.com/live-1",
    };
    expect(await createLiveClassAction(input)).toEqual({ ok: true, liveClassId: "live-1" });
    expect(mocks.execute).toHaveBeenCalledWith({ ...input, id: "live-1", actorId: "admin-1" });
  });

  it("requires a file URL when creating a resource", async () => {
    mocks.state.container = { idGen: { newId: () => "resource-1" }, createResource: { execute: mocks.execute } };
    const result = await createResourceAction({
      title: "Guide",
      description: "A guide",
      category: "guide",
      fileType: "pdf",
      accessTier: "PREVIEW",
    });
    expect(result).toEqual({ ok: false, error: { kind: "invalid_file_url" } });
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it("maps delete, purge, and live-class update results", async () => {
    const deleteLive = useCase("deleteLiveClass", Result.ok({ liveClassId: "live-1" }));
    expect(await deleteLiveClassAction({ id: "live-1" })).toEqual({ ok: true, liveClassId: "live-1" });
    expect(deleteLive).toHaveBeenCalledWith({ id: "live-1", actorId: "admin-1" });

    const deleteResource = useCase("deleteResource", Result.ok({ resourceId: "resource-1" }));
    expect(await deleteResourceAction({ id: "resource-1" })).toEqual({ ok: true, resourceId: "resource-1" });

    const purge = useCase("purgeResource", Result.ok({ resourceId: "resource-1" }));
    expect(await purgeResourceAction({ id: "resource-1" })).toEqual({ ok: true, resourceId: "resource-1" });

    const update = useCase("updateLiveClass", Result.ok({ liveClassId: "live-1" }));
    const patch = { title: "Updated" };
    expect(await updateLiveClassAction({ id: "live-1", patch })).toEqual({ ok: true, liveClassId: "live-1" });
    expect(update).toHaveBeenCalledWith({ id: "live-1", patch, actorId: "admin-1" });
  });

  it("maps badge, discount, and email-template updates", async () => {
    const badge = useCase("adminUpdateBadge", Result.ok({ badge: { slug: "first-quiz-pass" } }));
    const badgeInput = { slug: "first-quiz-pass" as const, patch: { xpReward: 20 } };
    expect(await updateBadgeAction(badgeInput)).toEqual({ ok: true, badgeSlug: "first-quiz-pass" });
    expect(badge).toHaveBeenCalledWith({ ...badgeInput, actorId: "admin-1" });

    const discount = useCase("adminUpdateDiscountCode", Result.ok({ discountCodeId: "discount-1" }));
    const discountInput = { id: "discount-1", patch: { code: "SAVE20", validFrom: "2026-08-01T00:00:00.000Z", validUntil: null } };
    expect(await updateDiscountCodeAction(discountInput)).toEqual({ ok: true, discountCodeId: "discount-1" });
    expect(discount).toHaveBeenCalledWith({
      id: "discount-1",
      patch: { code: "SAVE20", type: undefined, value: undefined, maxUses: undefined, validFrom: new Date("2026-08-01T00:00:00.000Z"), validUntil: undefined, courseIds: undefined },
      actorId: "admin-1",
    });

    const email = useCase("updateEmailTemplate", Result.ok({}));
    const emailInput = { type: "welcome", subject: "Welcome", headline: "Hi", introBody: "Hello", ctaLabel: "Start" };
    expect(await updateEmailTemplateAction(emailInput)).toEqual({ ok: true });
    expect(email).toHaveBeenCalledWith({ ...emailInput, actorId: "admin-1" });
  });

  it("authorizes audit-log and refund list actions and serializes dates", async () => {
    const occurredAt = new Date("2026-08-01T00:00:00.000Z");
    mocks.state.container = {
      userRepo: { findById: vi.fn().mockResolvedValue(Result.ok({ role: "ADMIN" })) },
      listAuditLogs: { execute: vi.fn().mockResolvedValue(Result.ok({ entries: [{ id: "log-1", actorId: "admin-1", action: "course.created", targetType: "course", targetId: "course-1", metadata: {}, occurredAt }], nextCursor: null, total: 1 })) },
    };
    expect(await listAuditLogsAction({})).toEqual({ ok: true, value: { entries: [{ id: "log-1", actorId: "admin-1", action: "course.created", targetType: "course", targetId: "course-1", metadata: {}, occurredAt: occurredAt.toISOString() }], nextCursor: null, total: 1 } });

    const listRefunds = vi.fn().mockResolvedValue(Result.ok({ orders: [{ id: "order-1", userId: "student-1", courseId: "course-1", totalMinor: 1000, currency: "PHP", refundReason: "duplicate", refundRequestedAt: occurredAt, refundProcessedAt: null, refundAmountMinor: null, status: "pending" }], users: new Map([["student-1", { email: "student@example.com" }]]), nextCursor: null, total: 1 }));
    mocks.state.container = { userRepo: { findById: vi.fn().mockResolvedValue(Result.ok({ role: "ADMIN" })) }, listRefundRequests: { execute: listRefunds } };
    expect(await listRefundRequestsAction({ status: "pending" })).toEqual({ ok: true, value: { orders: [{ id: "order-1", userId: "student-1", userEmail: "student@example.com", courseId: "course-1", totalMinor: 1000, currency: "PHP", refundReason: "duplicate", refundRequestedAt: occurredAt.toISOString(), refundProcessedAt: null, refundAmountMinor: null, status: "pending" }], nextCursor: null, total: 1 } });
    expect(listRefunds).toHaveBeenCalledWith({ status: "pending" });
  });

  it("requires an admin for processing a refund request", async () => {
    const execute = vi.fn().mockResolvedValue(Result.ok({ refundId: "refund-1" }));
    mocks.state.container = { userRepo: { findById: vi.fn().mockResolvedValue(Result.ok({ role: "ADMIN" })) }, adminProcessRefund: { execute } };
    expect(await processRefundRequestAction({ orderId: "order-1" })).toEqual({ ok: true, value: { orderId: "order-1", refundId: "refund-1" } });
    expect(execute).toHaveBeenCalledWith({ orderId: "order-1", actorId: "admin-1" });

    mocks.getSessionUserId.mockResolvedValue(null);
    expect(await processRefundRequestAction({ orderId: "order-1" })).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("replaces a resource file through the upload helper before updating", async () => {
    const upload = await import("@/app/actions/resourceFileUpload.helper");
    vi.mocked(upload.uploadResourceFile).mockResolvedValue({ ok: true, fileUrl: "https://cdn.example.com/new.pdf", fileKey: "resource-1/new.pdf" });
    const execute = useCase("updateResource", Result.ok({ resourceId: "resource-1" }));
    const file = new File(["pdf"], "guide.pdf", { type: "application/pdf" });
    expect(await updateResourceAction({ id: "resource-1", patch: { title: "Guide" }, file })).toEqual({ ok: true, resourceId: "resource-1" });
    expect(execute).toHaveBeenCalledWith({ id: "resource-1", patch: { title: "Guide", fileUrl: "https://cdn.example.com/new.pdf", fileKey: "resource-1/new.pdf" }, actorId: "admin-1" });
  });
});
