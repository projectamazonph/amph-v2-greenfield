import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

describe("MarkAllNotificationsRead", () => {
  it("marks every unread row and reports the count", async () => {
    const c = buildTestContainer();
    for (const title of ["One", "Two", "Three"]) {
      const created = await c.notifyUser.execute({
        actorId: "system",
        userId: "user-1",
        type: "announcement",
        title,
        body: "Body.",
        href: null,
      });
      expect(created.ok).toBe(true);
    }
    const cleared = await c.markAllNotificationsRead.execute({ actorId: "user-1" });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.value.marked).toBe(3);

    const listed = await c.listNotifications.execute({ actorId: "user-1" });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.unreadCount).toBe(0);
  });

  it("reports zero when nothing is unread", async () => {
    const c = buildTestContainer();
    const cleared = await c.markAllNotificationsRead.execute({ actorId: "user-1" });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.value.marked).toBe(0);
  });
});
