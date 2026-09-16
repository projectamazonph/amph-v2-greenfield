import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

async function notify(
  c: ReturnType<typeof buildTestContainer>,
  overrides: Record<string, unknown> = {},
) {
  return c.notifyUser.execute({
    actorId: "system",
    userId: "user-1",
    type: "course_complete",
    title: "Course complete",
    body: "Done.",
    href: "/certificates",
    ...overrides,
  });
}

describe("ListNotifications", () => {
  it("returns unread-first with the badge count", async () => {
    const c = buildTestContainer();
    const first = await notify(c, { title: "Older unread" });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = await notify(c, { title: "Newer unread" });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const read = await c.markNotificationRead.execute({
      actorId: "user-1",
      notificationId: first.value.id,
    });
    expect(read.ok).toBe(true);

    const listed = await c.listNotifications.execute({ actorId: "user-1" });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.unreadCount).toBe(1);
    expect(listed.value.notifications.map((n) => n.title)).toEqual([
      "Newer unread",
      "Older unread",
    ]);
  });

  it("never leaks another student's rows", async () => {
    const c = buildTestContainer();
    await notify(c, { userId: "user-2", title: "Someone else" });
    const listed = await c.listNotifications.execute({ actorId: "user-1" });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.value.notifications).toEqual([]);
    expect(listed.value.unreadCount).toBe(0);
  });
});
