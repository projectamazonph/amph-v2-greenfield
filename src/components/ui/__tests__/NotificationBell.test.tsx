import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { NotificationBell } from "../NotificationBell";

vi.mock("server-only", () => ({}));

const actions = {
  list: vi.fn(async () => ({
    ok: true as const,
    value: { notifications: [], unreadCount: 0 },
  })),
  markRead: vi.fn(async () => ({ ok: true as const, value: { id: "n-1" } })),
  markAllRead: vi.fn(async () => ({ ok: true as const, value: { marked: 0 } })),
};

describe("NotificationBell", () => {
  it("renders a bell button labelled for assistive tech", () => {
    const html = renderToString(<NotificationBell actions={actions} />);
    expect(html).toContain("Notifications");
    expect(html).toContain("aria-label");
  });

  it("renders no badge on first paint (poll fills it in)", () => {
    const html = renderToString(<NotificationBell actions={actions} />);
    // The badge only appears after the client poll resolves.
    expect(html).not.toContain("9+");
  });

  it("renders static without actions (unit-test and fallback path)", () => {
    const html = renderToString(<NotificationBell />);
    expect(html).toContain("Notifications");
  });
});
