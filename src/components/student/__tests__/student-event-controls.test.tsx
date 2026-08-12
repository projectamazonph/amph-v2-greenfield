import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/liveClassRsvp.action", () => ({
  rsvpLiveClassAction: vi.fn(),
  cancelLiveClassRsvpAction: vi.fn(),
}));
vi.mock("@/app/actions/markLiveClassRecordingWatched.action", () => ({
  markLiveClassRecordingWatchedAction: vi.fn(),
}));
vi.mock("@/app/actions/exportUserData.action", () => ({
  exportUserDataAction: vi.fn(),
}));

import { LiveClassRecordingButton } from "../LiveClassRecordingButton";
import { LiveClassRsvpButton } from "../LiveClassRsvpButton";
import { ExportDataButton } from "../../profile/ExportDataButton";
import { LoginForm } from "../../../app/login/LoginForm";
import { SignupForm } from "../../../app/signup/SignupForm";

describe("student event controls", () => {
  it("renders RSVP and cancellation events for their current state", () => {
    const available = renderToString(
      createElement(LiveClassRsvpButton, { liveClassId: "class-1", isRegistered: false }),
    );
    expect(available).toContain('data-testid="live-class-rsvp"');
    expect(available).toContain("RSVP for this class");

    const registered = renderToString(
      createElement(LiveClassRsvpButton, { liveClassId: "class-1", isRegistered: true }),
    );
    expect(registered).toContain('data-testid="live-class-cancel-rsvp"');
    expect(registered).toContain("Cancel RSVP");
  });

  it("renders recording watch and mark-watched events", () => {
    const unwatched = renderToString(
      createElement(LiveClassRecordingButton, {
        liveClassId: "class-1",
        recordingUrl: "https://video.example/recording",
        alreadyWatched: false,
        xpAmount: 25,
      }),
    );
    expect(unwatched).toContain('href="https://video.example/recording"');
    expect(unwatched).toContain('data-testid="live-class-mark-watched"');
    expect(unwatched).toContain("Mark as watched (+25 XP)");

    const watched = renderToString(
      createElement(LiveClassRecordingButton, {
        liveClassId: "class-1",
        recordingUrl: "https://video.example/recording",
        alreadyWatched: true,
        xpAmount: 25,
      }),
    );
    expect(watched).toContain('data-testid="live-class-recording-watched"');
    expect(watched).not.toContain('data-testid="live-class-mark-watched"');
  });

  it("renders the account export event target", () => {
    const html = renderToString(createElement(ExportDataButton));
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toContain("Download my data (JSON)");
  });
});

describe("student authentication form events", () => {
  it("posts login to its route and preserves the return path", () => {
    const html = renderToString(
      createElement(LoginForm, { redirectTo: "/courses/ppc-101", errorKind: null }),
    );
    expect(html).toMatch(/<form[^>]*action="\/api\/auth\/login"[^>]*method="POST"/);
    expect(html).toMatch(/name="redirectTo"[^>]+value="\/courses\/ppc-101"/);
    expect(html).toMatch(/href="\/reset-password"/);
  });

  it("renders login errors and the two-factor input", () => {
    const html = renderToString(
      createElement(LoginForm, { redirectTo: "/dashboard", errorKind: "invalid_totp_code" }),
    );
    expect(html).toContain("That code didn");
    expect(html).toMatch(/name="totpCode"/);
    expect(html).toMatch(/action="\/api\/auth\/login"/);
  });

  it("posts signup and preserves a selected pricing tier", () => {
    const html = renderToString(
      createElement(SignupForm, { errorKind: null, tierSlug: "mastery" }),
    );
    expect(html).toMatch(/<form[^>]*action="\/api\/auth\/signup"[^>]*method="POST"/);
    expect(html).toMatch(/name="tier"[^>]+value="mastery"/);
    expect(html).toContain("Create account and continue");
  });
});
