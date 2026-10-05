"use client";

/**
 * PracticeFrame — Task 14 (simulator UI refactor).
 *
 * Client component. Hosts the vendored SimGrid static site in an
 * iframe and mirrors the round-completion postMessage into AMPH via
 * `recordSimgridProgressAction` (src/app/actions/simgridProgress.action).
 *
 * Wire format (locked in src/lib/simgrid/protocol.ts, reviewed in
 * src/lib/simgrid/__tests__/protocol.test.ts):
 *   window.parent.postMessage({
 *     source: 'simhub-static-bridge',
 *     kind: 'simulator_attempt',
 *     token: <string from ?simhubBridgeToken=...>,
 *     attempt: { simulatorId, scenarioVersion, rubricVersion,
 *                score, passed, completedAt, scenarioId?, policyVersion? }
 *   }, returnOrigin)
 *
 * Defence-in-depth checks before calling the server action:
 *   1. event.origin === window.location.origin (same-origin iframe;
 *      the iframe is served from /simgrid-v1/ on the AMPH origin so
 *      this passes for legitimate messages and rejects any cross-
 *      origin message that might share the listener with the page).
 *   2. isSimgridBridgeMessage(event.data) — structural validation of
 *      source/kind/token type and the full attempt shape.
 *   3. event.data.token === SIMGRID_BRIDGE_TOKEN — proves the iframe
 *      received our token in the query string (the only place we
 *      embed it). Defends against a same-origin page that forges a
 *      message without the token.
 *   4. event.data.attempt.simulatorId === props.simulatorId — the
 *      iframe is mounted for exactly one simulator, so a message
 *      claiming to be from a different one is rejected even if the
 *      other checks pass.
 *
 * The iframe is sandboxed WITHOUT `allow-top-navigation` /
 * `allow-top-navigation-by-user-activation` so the vendored site
 * cannot navigate the parent tab away. Scripts, same-origin,
 * forms, and popups are allowed so the simulator SPA works and a
 * vendored "open in new tab" affordance can spawn a popup. The
 * `referrerPolicy="no-referrer"` strips any Referer header the
 * iframe would otherwise emit to the same origin.
 *
 * The status line is `aria-live="polite"` so screen readers
 * announce the last-attempt summary once the iframe finishes a
 * round. It never includes a score-as-certification framing
 * (STORY-078); the only verbs are "scored" and "in progress".
 *
 * Layout: the wrapper page (src/app/practice/[...slug]/page.tsx) sets
 * min-height on its main; this frame fills the page width and
 * `flex: 1` so the iframe height is driven by the page's
 * min-height, not by a fixed viewport calc. The previous
 * `height: calc(100dvh - 220px)` was clipping tall simulators like
 * BuyBox Dojo and showing empty space on shorter ones.
 */

import { useEffect, useState } from "react";

import { recordSimgridProgressAction } from "@/app/actions/simgridProgress.action";
import { SIMGRID_BRIDGE_TOKEN, isSimgridBridgeMessage } from "@/lib/simgrid/protocol";
import type { SimgridSimulatorId } from "@/domain/simgrid";

import styles from "./PracticeFrame.module.css";

export interface PracticeFrameProps {
  readonly simulatorId: SimgridSimulatorId;
  readonly src: string;
  readonly title: string;
}

export function PracticeFrame(props: PracticeFrameProps) {
  const [lastEvent, setLastEvent] = useState<{
    readonly simulatorId: SimgridSimulatorId;
    readonly score: number;
    readonly passed: boolean;
  } | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!isSimgridBridgeMessage(event.data)) return;
      if (event.data.token !== SIMGRID_BRIDGE_TOKEN) return;
      if (event.data.attempt.simulatorId !== props.simulatorId) return;

      setLastEvent({
        simulatorId: event.data.attempt.simulatorId,
        score: event.data.attempt.score,
        passed: event.data.attempt.passed,
      });

      // Fire-and-forget: the server action returns a Result and the
      // round already completed client-side. Surfacing a toast would
      // be noisy; the student's progress is in the dashboard anyway.
      void recordSimgridProgressAction({ attempt: event.data.attempt });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [props.simulatorId]);

  return (
    <div className={styles.frame} data-testid="practice-frame">
      <iframe
        src={props.src}
        title={props.title}
        className={styles.iframe}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        referrerPolicy="no-referrer"
      />
      <p className={styles.status} aria-live="polite">
        {lastEvent
          ? `Last attempt: ${lastEvent.simulatorId} scored ${lastEvent.score} (${lastEvent.passed ? "passed" : "in progress"})`
          : "Practice running. Your best score shows on your dashboard."}
      </p>
    </div>
  );
}
