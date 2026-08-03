"use client";

/**
 * LiveClassRecordingButton — student-facing "watch recording" control on
 * the live-class detail page. Opens the recording, then marks it watched
 * (awarding XP once) via a server action.
 *
 * STORY-100.
 */

import { useState, useTransition } from "react";
import { markLiveClassRecordingWatchedAction } from "@/app/actions/markLiveClassRecordingWatched.action";
import { Button } from "@/components/ui/Button";

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
      <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="primary" size="md">
          Watch recording
        </Button>
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
