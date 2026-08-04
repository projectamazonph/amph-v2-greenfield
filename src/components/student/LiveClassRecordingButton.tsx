"use client";

/**
 * LiveClassRecordingButton — student-facing "watch recording" controls on
 * the live-class detail page. Two separate controls, not one combined
 * action: a link that opens the recording in a new tab, and a distinct
 * "Mark as watched" button the student clicks afterward to record it
 * (awarding XP once) via a server action.
 *
 * STORY-100.
 */

import { useState, useTransition } from "react";
import { markLiveClassRecordingWatchedAction } from "@/app/actions/markLiveClassRecordingWatched.action";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";

export interface LiveClassRecordingButtonProps {
  liveClassId: string;
  recordingUrl: string;
  alreadyWatched: boolean;
  xpAmount: number;
}

export function LiveClassRecordingButton({
  liveClassId,
  recordingUrl,
  alreadyWatched,
  xpAmount,
}: LiveClassRecordingButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [watched, setWatched] = useState(alreadyWatched);

  function handleMarkWatched() {
    startTransition(async () => {
      const result = await markLiveClassRecordingWatchedAction(liveClassId);
      if (result.ok) {
        setWatched(true);
      }
    });
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      {/*
        A native <button> (what Button always renders) can't legally nest
        inside an <a> — invalid interactive-in-interactive HTML, broken
        tab order and screen-reader announcement. Style the anchor
        directly with Button's own CSS module classes instead of nesting
        a Button component inside it.
      */}
      <a
        href={recordingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={[buttonStyles.btn, buttonStyles.primary, buttonStyles.md].join(" ")}
      >
        Watch recording
      </a>
      {watched ? (
        <span data-testid="live-class-recording-watched" style={{ color: "var(--ink-500)" }}>
          ✓ Marked as watched
        </span>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleMarkWatched}
          disabled={isPending}
          data-testid="live-class-mark-watched"
        >
          {isPending ? "Saving..." : `Mark as watched (+${xpAmount} XP)`}
        </Button>
      )}
    </div>
  );
}
