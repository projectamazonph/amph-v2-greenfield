"use client";

/**
 * LiveClassRsvpButton — client component used on the live-class detail
 * page. Renders either an "RSVP" or "Cancel RSVP" button depending on
 * the user's current registration state. On click it calls the
 * corresponding server action and re-renders via the parent's
 * `revalidatePath`.
 *
 * STORY-091.
 */

import { useState, useTransition } from "react";
import { cancelLiveClassRsvpAction, rsvpLiveClassAction } from "@/app/actions/liveClassRsvp.action";
import { Button } from "@/components/ui/Button";
import { studentErrorCopy } from "@/lib/studentErrorCopy";

export interface LiveClassRsvpButtonProps {
  liveClassId: string;
  isRegistered: boolean;
}

export function LiveClassRsvpButton({ liveClassId, isRegistered }: LiveClassRsvpButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRsvp() {
    startTransition(async () => {
      setError(null);
      try {
        const result = await rsvpLiveClassAction(liveClassId);
        if (!result.ok) setError(rsvpErrorMessage(result.error));
      } catch {
        setError(studentErrorCopy.rsvp);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      setError(null);
      try {
        const result = await cancelLiveClassRsvpAction(liveClassId);
        if (!result.ok) setError(rsvpErrorMessage(result.error));
      } catch {
        setError(studentErrorCopy.rsvp);
      }
    });
  }

  if (isRegistered) {
    return (
      <div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={handleCancel}
          disabled={isPending}
          data-testid="live-class-cancel-rsvp"
        >
          {isPending ? "Cancelling..." : "Cancel RSVP"}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleRsvp}
        disabled={isPending}
        data-testid="live-class-rsvp"
      >
        {isPending ? "RSVPing..." : "RSVP for this class"}
      </Button>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}

function rsvpErrorMessage(error: string): string {
  switch (error) {
    case "unauthenticated":
      return "Your session expired. Sign in again to continue.";
    case "course_access_required":
      return "Active enrollment in this course is required.";
    case "class_unavailable":
    case "class_not_found":
      return "This class is no longer available for RSVP.";
    case "not_registered":
      return "No active RSVP was found.";
    default:
      return studentErrorCopy.rsvp;
  }
}
