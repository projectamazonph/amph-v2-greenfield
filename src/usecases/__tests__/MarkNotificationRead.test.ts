import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

describe("MarkNotificationRead", () => {
  it("marks the caller's item read", async () => {
    const c = buildTestContainer();
    const created = await c.notifyUser.execute({
      actorId: "system",
      userId: "user-1",
      type: "announcement",
      title: "Heads up",
      body: "New live class.",
      href: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const marked = await c.markNotificationRead.execute({
      actorId: "user-1",
      notificationId: created.value.id,
    });
    expect(marked.ok).toBe(true);
    if (!marked.ok) return;
    expect(marked.value.readAt).not.toBeNull();
  });

  it("rejects a non-owner", async () => {
    const c = buildTestContainer();
    const created = await c.notifyUser.execute({
      actorId: "system",
      userId: "user-1",
      type: "announcement",
      title: "Heads up",
      body: "New live class.",
      href: null,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const marked = await c.markNotificationRead.execute({
      actorId: "user-9",
      notificationId: created.value.id,
    });
    expect(marked.ok).toBe(false);
    if (marked.ok) return;
    expect(marked.error.kind).toBe("not_owner");
  });

  it("returns not_found for an unknown id", async () => {
    const c = buildTestContainer();
    const marked = await c.markNotificationRead.execute({
      actorId: "user-1",
      notificationId: "missing",
    });
    expect(marked.ok).toBe(false);
    if (marked.ok) return;
    expect(marked.error.kind).toBe("not_found");
  });
});
