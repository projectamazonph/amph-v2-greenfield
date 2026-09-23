import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

const mocks = vi.hoisted(() => {
  const state = { container: {} as Record<string, unknown> };
  return {
    state,
    requireAdmin: vi.fn(),
    buildContainer: vi.fn(() => state.container),
  };
});

vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.requireAdmin,
  getSessionUserId: vi.fn(),
}));
vi.mock("@/composition/container", () => ({ buildContainer: mocks.buildContainer }));

import { adminUpdateUserAction } from "../adminUpdateUser.action";
import { adminSetUserPasswordAction } from "../adminSetUserPassword.action";
import { adminDeleteUserAction } from "../adminDeleteUser.action";
import { adminForceSignOutAction } from "../adminForceSignOut.action";

function useCase(name: string, result: unknown = Result.ok({})) {
  const execute = vi.fn().mockResolvedValue(result);
  mocks.state.container = { [name]: { execute } };
  return execute;
}

describe("admin user management action boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    mocks.state.container = {};
  });

  it("injects the admin actor and maps success for all four actions", async () => {
    const update = useCase("adminUpdateUser", Result.ok({ userId: "user-1" }));
    expect(
      await adminUpdateUserAction({ userId: "user-1", firstName: "Ana", role: "INSTRUCTOR" }),
    ).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({
      userId: "user-1",
      firstName: "Ana",
      role: "INSTRUCTOR",
      actorId: "admin-1",
    });

    const password = useCase(
      "adminSetUserPassword",
      Result.ok({ userId: "user-1", sessionsRevoked: true }),
    );
    expect(
      await adminSetUserPasswordAction({
        userId: "user-1",
        newPassword: "Str0ng!Pass",
        sendNotificationEmail: true,
      }),
    ).toEqual({ ok: true });
    expect(password).toHaveBeenCalledWith({
      userId: "user-1",
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: true,
      actorId: "admin-1",
    });

    const del = useCase("adminDeleteUser", Result.ok({ userId: "user-1" }));
    expect(await adminDeleteUserAction({ userId: "user-1" })).toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith({ userId: "user-1", actorId: "admin-1" });

    const signOut = useCase("adminForceSignOut", Result.ok({ userId: "user-1" }));
    expect(await adminForceSignOutAction({ userId: "user-1" })).toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledWith({ userId: "user-1", actorId: "admin-1" });
  });

  it("maps use-case failures to a flat public error kind", async () => {
    useCase("adminUpdateUser", Result.err({ kind: "cannot_change_own_role" }));
    expect(await adminUpdateUserAction({ userId: "admin-1", role: "STUDENT" })).toEqual({
      ok: false,
      error: "cannot_change_own_role",
    });

    useCase("adminSetUserPassword", Result.err({ kind: "weak_password", score: 1 }));
    expect(
      await adminSetUserPasswordAction({
        userId: "user-1",
        newPassword: "abc",
        sendNotificationEmail: false,
      }),
    ).toEqual({ ok: false, error: "weak_password" });

    useCase("adminDeleteUser", Result.err({ kind: "cannot_delete_self" }));
    expect(await adminDeleteUserAction({ userId: "admin-1" })).toEqual({
      ok: false,
      error: "cannot_delete_self",
    });

    useCase("adminForceSignOut", Result.err({ kind: "db_error", message: "boom" }));
    expect(await adminForceSignOutAction({ userId: "user-1" })).toEqual({
      ok: false,
      error: "db_error",
    });
  });

  it("requires an admin session before the container is touched", async () => {
    const execute = useCase("adminUpdateUser");
    mocks.requireAdmin.mockRejectedValue(new Error("forbidden"));

    await expect(adminUpdateUserAction({ userId: "user-1", firstName: "Ana" })).rejects.toThrow(
      "forbidden",
    );
    await expect(
      adminSetUserPasswordAction({
        userId: "user-1",
        newPassword: "Str0ng!Pass",
        sendNotificationEmail: false,
      }),
    ).rejects.toThrow("forbidden");
    await expect(adminDeleteUserAction({ userId: "user-1" })).rejects.toThrow("forbidden");
    await expect(adminForceSignOutAction({ userId: "user-1" })).rejects.toThrow("forbidden");

    expect(execute).not.toHaveBeenCalled();
  });
});
