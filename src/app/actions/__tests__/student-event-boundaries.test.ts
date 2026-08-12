import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getSessionUserId: vi.fn(),
  headers: vi.fn(),
  buildContainer: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
  revalidatePath: vi.fn(),
  clearAuthCookie: vi.fn(),
  container: {} as Record<string, unknown>,
  startExecute: vi.fn(),
  saveExecute: vi.fn(),
  submitExecute: vi.fn(),
  StartSimulatorAttempt: vi.fn(),
  SaveSimulatorDecision: vi.fn(),
  SubmitSimulatorAttempt: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/composition/container", () => ({ buildContainer: mocks.buildContainer }));
vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
  getSessionUserId: mocks.getSessionUserId,
  clearAuthCookie: mocks.clearAuthCookie,
}));
vi.mock("@/usecases/StartSimulatorAttempt", () => ({
  StartSimulatorAttempt: mocks.StartSimulatorAttempt,
}));
vi.mock("@/usecases/SaveSimulatorDecision", () => ({
  SaveSimulatorDecision: mocks.SaveSimulatorDecision,
}));
vi.mock("@/usecases/SubmitSimulatorAttempt", () => ({
  SubmitSimulatorAttempt: mocks.SubmitSimulatorAttempt,
}));

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "../authPasswordReset.action";
import { deleteAccountAction } from "../deleteAccount.action";
import { exportUserDataAction } from "../exportUserData.action";
import {
  cancelLiveClassRsvpAction,
  rsvpLiveClassAction,
} from "../liveClassRsvp.action";
import { markLiveClassRecordingWatchedAction } from "../markLiveClassRecordingWatched.action";
import { resendVerificationAction } from "../resendVerification.action";
import { saveSimulatorDecision } from "../saveSimulatorDecision.action";
import { startSimulatorAttempt } from "../startSimulatorAttempt.action";
import { submitSimulatorAttempt } from "../submitSimulatorAttempt.action";
import { verifyEmailAction } from "../verifyEmail.action";

function formData(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

beforeEach(() => {
  for (const mock of [
    mocks.getSessionUser,
    mocks.getSessionUserId,
    mocks.headers,
    mocks.buildContainer,
    mocks.revalidatePath,
    mocks.clearAuthCookie,
    mocks.startExecute,
    mocks.saveExecute,
    mocks.submitExecute,
  ]) mock.mockReset();
  mocks.redirect.mockClear();
  mocks.StartSimulatorAttempt.mockReset().mockImplementation(function () {
    return { execute: mocks.startExecute };
  });
  mocks.SaveSimulatorDecision.mockReset().mockImplementation(function () {
    return { execute: mocks.saveExecute };
  });
  mocks.SubmitSimulatorAttempt.mockReset().mockImplementation(function () {
    return { execute: mocks.submitExecute };
  });
  mocks.container = {};
  mocks.buildContainer.mockImplementation(() => mocks.container);
  mocks.headers.mockResolvedValue({ get: () => "203.0.113.8, 10.0.0.1" });
});

describe("student authentication and account actions", () => {
  it("requests a reset without revealing whether an account exists", async () => {
    const execute = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    mocks.container = { requestPasswordReset: { execute } };

    await expect(
      requestPasswordResetAction({ kind: "idle" }, formData({ email: "student@example.com" })),
    ).resolves.toEqual({ kind: "sent" });
    expect(execute).toHaveBeenCalledWith({
      email: "student@example.com",
      ip: "203.0.113.8",
    });
  });

  it("maps reset validation, rate limiting, and success states", async () => {
    const resetAt = new Date(Date.now() + 60_000);
    const execute = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: { kind: "rate_limited", resetAt } })
      .mockResolvedValueOnce({ ok: false, error: { kind: "invalid_email" } })
      .mockResolvedValueOnce({ ok: false, error: { kind: "weak_password" } })
      .mockResolvedValueOnce({ ok: true, value: undefined });
    mocks.container = {
      requestPasswordReset: { execute },
      resetPassword: { execute },
    };

    await expect(
      requestPasswordResetAction({ kind: "idle" }, formData({ email: "student@example.com" })),
    ).resolves.toMatchObject({ kind: "rate_limited" });
    await expect(
      requestPasswordResetAction({ kind: "idle" }, formData({ email: "bad" })),
    ).resolves.toEqual({ kind: "validation_failed", message: "Email format is invalid" });
    await expect(
      resetPasswordAction({ kind: "idle" }, formData({ token: "t", newPassword: "weak" })),
    ).resolves.toEqual({ kind: "weak_password", message: "The new password is too weak." });
    await expect(
      resetPasswordAction({ kind: "idle" }, formData({ token: "t", newPassword: "Strong!123" })),
    ).resolves.toEqual({ kind: "success" });
  });

  it("protects account deletion and clears the session on success", async () => {
    mocks.getSessionUserId.mockResolvedValueOnce(null);
    await expect(deleteAccountAction(formData({ password: "secret" }))).rejects.toThrow(
      "REDIRECT:/login",
    );

    const execute = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    mocks.getSessionUserId.mockResolvedValue("student-1");
    mocks.container = { deleteUserAccount: { execute } };
    await expect(deleteAccountAction(formData({ password: "secret" }))).rejects.toThrow(
      "REDIRECT:/?accountDeleted=1",
    );
    expect(execute).toHaveBeenCalledWith({ userId: "student-1", password: "secret" });
    expect(mocks.clearAuthCookie).toHaveBeenCalledOnce();
  });

  it("returns account data only for an authenticated student and audits export", async () => {
    mocks.getSessionUserId.mockResolvedValueOnce(null);
    await expect(exportUserDataAction()).resolves.toEqual({
      ok: false,
      error: "not_authenticated",
    });

    const exportExecute = vi.fn().mockResolvedValue({
      ok: true,
      value: { profile: { id: "student-1" } },
    });
    const auditExecute = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    mocks.getSessionUserId.mockResolvedValue("student-1");
    mocks.container = {
      exportUserData: { execute: exportExecute },
      recordAuditLog: { execute: auditExecute },
    };
    await expect(exportUserDataAction()).resolves.toEqual({
      ok: true,
      data: { profile: { id: "student-1" } },
    });
    expect(auditExecute).toHaveBeenCalledWith({
      actorId: "student-1",
      action: "user.data_exported",
      targetType: "user",
      targetId: "student-1",
      metadata: {},
    });
  });

  it("maps verification and resend events to stable redirects", async () => {
    await expect(verifyEmailAction(formData({}))).rejects.toThrow(
      "REDIRECT:/verify-email?error=missing-token",
    );

    const verifyExecute = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    mocks.container = { verifyEmail: { execute: verifyExecute } };
    await expect(verifyEmailAction(formData({ token: "valid" }))).rejects.toThrow(
      "REDIRECT:/dashboard?welcome=1",
    );

    mocks.getSessionUser.mockResolvedValue(null);
    await expect(resendVerificationAction()).rejects.toThrow(
      "REDIRECT:/login?redirect=/verify-email/sent",
    );
    mocks.getSessionUser.mockResolvedValue({ id: "student-1" });
    const resendExecute = vi.fn().mockResolvedValue({
      ok: true,
      value: { sent: true, retryAfter: new Date("2030-01-01T00:00:00.000Z") },
    });
    mocks.container = { resendVerification: { execute: resendExecute } };
    await expect(resendVerificationAction()).rejects.toThrow(
      "REDIRECT:/verify-email/sent?status=sent",
    );
  });
});

describe("student live-class actions", () => {
  it("requires a session before RSVP, cancellation, or recording progress", async () => {
    mocks.getSessionUserId.mockResolvedValue(null);
    await expect(rsvpLiveClassAction("class-1")).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    await expect(cancelLiveClassRsvpAction("class-1")).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
    await expect(markLiveClassRecordingWatchedAction("class-1")).resolves.toEqual({
      ok: false,
      error: "unauthenticated",
    });
  });

  it("RSVPs, cancels, marks recordings watched, and revalidates student views", async () => {
    mocks.getSessionUserId.mockResolvedValue("student-1");
    const rsvp = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    const cancel = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    const watched = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    mocks.container = {
      rsvpLiveClass: { execute: rsvp },
      cancelLiveClassRsvp: { execute: cancel },
      markLiveClassRecordingWatched: { execute: watched },
    };

    await expect(rsvpLiveClassAction("class-1")).resolves.toEqual({ ok: true });
    await expect(cancelLiveClassRsvpAction("class-1")).resolves.toEqual({ ok: true });
    await expect(markLiveClassRecordingWatchedAction("class-1")).resolves.toEqual({ ok: true });
    expect(rsvp).toHaveBeenCalledWith({ userId: "student-1", liveClassId: "class-1" });
    expect(cancel).toHaveBeenCalledWith({ userId: "student-1", liveClassId: "class-1" });
    expect(watched).toHaveBeenCalledWith({ userId: "student-1", liveClassId: "class-1" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("maps live-class access and lifecycle errors", async () => {
    mocks.getSessionUserId.mockResolvedValue("student-1");
    const rsvp = vi.fn().mockResolvedValueOnce({ ok: false, error: { kind: "not_found" } });
    const cancel = vi.fn().mockResolvedValueOnce({ ok: false, error: { kind: "not_registered" } });
    const watched = vi.fn().mockResolvedValueOnce({
      ok: false,
      error: { kind: "recording_not_available" },
    });
    mocks.container = {
      rsvpLiveClass: { execute: rsvp },
      cancelLiveClassRsvp: { execute: cancel },
      markLiveClassRecordingWatched: { execute: watched },
    };
    await expect(rsvpLiveClassAction("class-1")).resolves.toEqual({
      ok: false,
      error: "class_not_found",
    });
    await expect(cancelLiveClassRsvpAction("class-1")).resolves.toEqual({
      ok: false,
      error: "not_registered",
    });
    await expect(markLiveClassRecordingWatchedAction("class-1")).resolves.toEqual({
      ok: false,
      error: "recording_not_available",
    });
  });
});

describe("student simulator attempt actions", () => {
  it("rejects unauthenticated attempt events", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    await expect(
      startSimulatorAttempt({ simulatorId: "bid-elevator", scenarioId: "scenario-1" }),
    ).resolves.toEqual({ error: "unauthenticated" });
    await expect(
      saveSimulatorDecision({ attemptId: "attempt-1", decisionData: {} }),
    ).resolves.toEqual({ error: "unauthenticated" });
    await expect(submitSimulatorAttempt({ attemptId: "attempt-1" })).resolves.toEqual({
      error: "unauthenticated",
    });
  });

  it("starts, saves, and submits an owned attempt", async () => {
    const startedAt = new Date("2030-01-01T00:00:00.000Z");
    const savedAt = new Date("2030-01-02T00:00:00.000Z");
    const submittedAt = new Date("2030-01-03T00:00:00.000Z");
    const findByAttemptId = vi.fn().mockResolvedValue({
      ok: true,
      value: { attemptId: "attempt-1", userId: "student-1" },
    });
    mocks.getSessionUser.mockResolvedValue({ id: "student-1" });
    mocks.container = {
      simulatorAttemptRepo: { findByAttemptId },
      scorePolicyRepo: {},
      scenarioRepo: {},
      idGen: {},
      clock: {},
      recordAuditLog: {},
    };
    mocks.startExecute.mockResolvedValue({
      ok: true,
      value: {
        attemptId: "attempt-1",
        scenarioId: "scenario-1",
        status: "in_progress",
        seed: "seed-1",
        startedAt,
      },
    });
    mocks.saveExecute.mockResolvedValue({ ok: true, value: { revision: 2, savedAt } });
    mocks.submitExecute.mockResolvedValue({ ok: true, value: { status: "submitted", submittedAt } });

    await expect(
      startSimulatorAttempt({ simulatorId: "bid-elevator", scenarioId: "scenario-1" }),
    ).resolves.toMatchObject({ attemptId: "attempt-1", startedAt: startedAt.toISOString() });
    await expect(
      saveSimulatorDecision({ attemptId: "attempt-1", decisionData: { bid: 1 } }),
    ).resolves.toEqual({ revision: 2, savedAt: savedAt.toISOString() });
    await expect(submitSimulatorAttempt({ attemptId: "attempt-1" })).resolves.toEqual({
      status: "submitted",
      submittedAt: submittedAt.toISOString(),
    });
  });

  it("blocks cross-student simulator mutations", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "student-1" });
    const findByAttemptId = vi.fn().mockResolvedValue({
      ok: true,
      value: { attemptId: "attempt-1", userId: "other-student" },
    });
    mocks.container = { simulatorAttemptRepo: { findByAttemptId }, clock: {} };
    await expect(
      saveSimulatorDecision({ attemptId: "attempt-1", decisionData: {} }),
    ).resolves.toEqual({ error: "forbidden" });
    await expect(submitSimulatorAttempt({ attemptId: "attempt-1" })).resolves.toEqual({
      error: "forbidden",
    });
    expect(mocks.SaveSimulatorDecision).not.toHaveBeenCalled();
    expect(mocks.SubmitSimulatorAttempt).not.toHaveBeenCalled();
  });
});
