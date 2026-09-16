import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { NotificationBell } from "../NotificationBell";

vi.mock("server-only", () => ({}));

vi.mock("@/app/actions/notification.action", () => ({
  listNotificationsAction: vi.fn(async () => ({
    ok: true,
    value: { notifications: [], unreadCount: 0 },
  })),
  markNotificationReadAction: vi.fn(async () => ({ ok: true, value: { id: "n-1" } })),
  markAllNotificationsReadAction: vi.fn(async () => ({ ok: true, value: { marked: 0 } })),
}));

describe("NotificationBell", () => {
  it("renders a bell button labelled for assistive tech", () => {
    const html = renderToString(<NotificationBell />);
    expect(html).toContain("Notifications");
    expect(html).toContain("aria-label");
  });

  it("renders no badge on first paint (poll fills it in)", () => {
    const html = renderToString(<NotificationBell />);
    // The badge only appears after the client poll resolves.
    expect(html).not.toContain("9+");
  });
});
