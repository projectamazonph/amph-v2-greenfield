import { describe, expect, it } from "vitest";
import { buildTestContainer } from "@/composition/container.test";

function input(overrides: Record<string, unknown> = {}) {
  return {
    actorId: "system",
    userId: "user-1",
    type: "course_complete" as const,
    title: "Course complete",
    body: "You finished every lesson.",
    href: "/certificates",
    ...overrides,
  };
}

describe("NotifyUser", () => {
  it("creates an unread notification", async () => {
    const c = buildTestContainer();
    const result = await c.notifyUser.execute(input());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe("user-1");
    expect(result.value.readAt).toBeNull();
  });

  it("rejects an unknown type", async () => {
    const c = buildTestContainer();
    const result = await c.notifyUser.execute({
      ...input(),
      type: "sms" as unknown as "course_complete",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_type");
  });

  it("rejects a blank title", async () => {
    const c = buildTestContainer();
    const result = await c.notifyUser.execute({ ...input(), title: "  " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_title");
  });
});
