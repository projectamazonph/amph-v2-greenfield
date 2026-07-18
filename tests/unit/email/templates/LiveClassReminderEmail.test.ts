/**
 * LiveClassReminderEmail render test.
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveClassReminderEmail } from "@/infra/email/templates/LiveClassReminderEmail";

describe("LiveClassReminderEmail", () => {
  it("renders the recipient, class title, time, and join CTA", () => {
    const html = renderToStaticMarkup(
      LiveClassReminderEmail({
        firstName: "Maria",
        classTitle: "PPC Deep Dive",
        startsAt: new Date("2026-08-01T15:00:00Z"),
        joinUrl: "https://amph.example.com/live/abc",
        minutesUntilStart: 15,
      }),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("PPC Deep Dive");
    expect(html).toContain("Join Live Class");
    expect(html).toContain("https://amph.example.com/live/abc");
  });

  it("formats the time label correctly for 15 minutes", () => {
    const html = renderToStaticMarkup(
      LiveClassReminderEmail({
        firstName: "X",
        classTitle: "X",
        startsAt: new Date(),
        joinUrl: "https://x.com",
        minutesUntilStart: 15,
      }),
    );
    expect(html).toContain("15 minutes");
  });

  it("formats the time label correctly for 1 hour", () => {
    const html = renderToStaticMarkup(
      LiveClassReminderEmail({
        firstName: "X",
        classTitle: "X",
        startsAt: new Date(),
        joinUrl: "https://x.com",
        minutesUntilStart: 60,
      }),
    );
    expect(html).toContain("1 hour");
    expect(html).not.toContain("1 hours");
  });

  it("formats the time label correctly for 2+ hours", () => {
    const html = renderToStaticMarkup(
      LiveClassReminderEmail({
        firstName: "X",
        classTitle: "X",
        startsAt: new Date(),
        joinUrl: "https://x.com",
        minutesUntilStart: 120,
      }),
    );
    expect(html).toContain("2 hours");
  });
});
