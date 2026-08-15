/**
 * LiveClassRecordingButton.test.tsx — M-14 audit fix verification.
 *
 * The M-14 audit found that the "Mark as watched" button toggles a loading
 * state on click but the transition is silent for screen-reader users:
 * `aria-busy` was already on the button but no polite announcement region
 * announced the loading text. Sighted users see the button text change
 * from "Mark as watched (+N XP)" to "Saving..."; AT users only hear the
 * new label if they re-focus the button, which they almost never do.
 *
 * The fix adds a visually-hidden `role="status" aria-live="polite"`
 * region that copies the same wording (empty in idle state so it does
 * not pollute the announcement queue at page load). These tests verify
 * the structural contract: the region is always rendered, the ARIA
 * attributes are correct, the visually-hidden class is applied, and the
 * idle state has no announcement text.
 *
 * The server action module is mocked so the test can run in the node
 * environment without pulling in `next/headers` and the composition
 * container. The pattern mirrors `student-event-controls.test.tsx`
 * which already tests this component in the same test setup.
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/markLiveClassRecordingWatched.action", () => ({
  markLiveClassRecordingWatchedAction: vi.fn(),
}));

import { LiveClassRecordingButton } from "../LiveClassRecordingButton";

describe("LiveClassRecordingButton (M-14)", () => {
  const baseProps = {
    liveClassId: "class-1",
    recordingUrl: "https://video.example/recording",
    xpAmount: 25,
  };

  it("renders the mark-watched button with aria-busy=false in idle state", () => {
    const html = renderToString(
      createElement(LiveClassRecordingButton, { ...baseProps, alreadyWatched: false }),
    );

    // The mark-watched button is the one with the testid. Extract it
    // and confirm aria-busy is present and equals "false" until the
    // student clicks. (audit item: ensure aria-busy is wired.)
    const buttonTag = html.match(
      /<button[^>]*\bdata-testid="live-class-mark-watched"[^>]*>/,
    );
    expect(buttonTag).not.toBeNull();
    expect(buttonTag![0]).toContain('aria-busy="false"');
  });

  it("renders an aria-live polite region for the loading announcement (M-14)", () => {
    const html = renderToString(
      createElement(LiveClassRecordingButton, { ...baseProps, alreadyWatched: false }),
    );

    // The region is always rendered (not conditional) so the live region
    // is attached to the DOM before the click event fires. Sighted users
    // never see it; assistive tech reads it when its content changes.
    expect(html).toMatch(
      /<span[^>]*\brole="status"[^>]*\baria-live="polite"[^>]*>[\s\S]*?<\/span>/,
    );
  });

  it("marks the aria-live region as visually hidden so sighted users never see it (M-14)", () => {
    const html = renderToString(
      createElement(LiveClassRecordingButton, { ...baseProps, alreadyWatched: false }),
    );

    // The region must apply the visually-hidden class defined in the
    // component's local CSS module. Without sr-only behaviour, the
    // "Saving..." text would appear visually on the page next to the
    // button row, which is not the intent. React renders className
    // before role/aria-live, so the regex matches the class attribute
    // anywhere in the span tag.
    const regionTag = html.match(
      /<span[^>]*\brole="status"[^>]*\baria-live="polite"[^>]*>/,
    );
    expect(regionTag).not.toBeNull();
    const classMatch = regionTag![0].match(/\bclass="([^"]+)"/);
    expect(classMatch).not.toBeNull();
    expect(classMatch![1]).toContain("visuallyHidden");
  });

  it("renders the aria-live region empty in idle state so it does not announce on page load (M-14)", () => {
    const html = renderToString(
      createElement(LiveClassRecordingButton, { ...baseProps, alreadyWatched: false }),
    );

    // The region is empty until isPending flips true. The trigger
    // wording is intentionally NOT present in the idle render — adding
    // it would cause every screen reader to read "Saving your watch
    // progress..." the moment the page mounts.
    const regionMatch = html.match(
      /<span[^>]*\brole="status"[^>]*\baria-live="polite"[^>]*>([\s\S]*?)<\/span>/,
    );
    expect(regionMatch).not.toBeNull();
    const regionContent = regionMatch![1] ?? "";
    expect(regionContent.trim()).toBe("");
    expect(html).not.toContain("Saving your watch progress...");
  });

  it("still renders the watched-state status span when alreadyWatched is true", () => {
    const html = renderToString(
      createElement(LiveClassRecordingButton, { ...baseProps, alreadyWatched: true }),
    );

    // The watched status span is the existing role="status" surface
    // and must keep rendering. The new aria-live region is independent
    // and continues to render (empty) alongside it.
    expect(html).toContain('data-testid="live-class-recording-watched"');
    expect(html).toMatch(/<span[^>]*\brole="status"[^>]*>[\s\S]*?Marked as watched[\s\S]*?<\/span>/);
    // The polite live region is still present.
    expect(html).toMatch(/<span[^>]*\brole="status"[^>]*\baria-live="polite"[^>]*>/);
  });

  it("renders the recording link with the correct target and rel attributes", () => {
    const html = renderToString(
      createElement(LiveClassRecordingButton, { ...baseProps, alreadyWatched: false }),
    );

    // Watch link is the anchor that opens the recording in a new tab.
    // The Mark-as-watched button is a separate control — they are not
    // nested, per the comment in the component.
    expect(html).toMatch(
      /<a[^>]*\bhref="https:\/\/video\.example\/recording"[^>]*\btarget="_blank"[^>]*\brel="noopener noreferrer"/,
    );
  });
});
