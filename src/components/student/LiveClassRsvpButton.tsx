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

import { useTransition } from "react";
import {
  cancelLiveClassRsvpAction,
  rsvpLiveClassAction,
} from "@/app/actions/liveClassRsvp.action";
import { Button } from "@/components/ui/Button";

export interface LiveClassRsvpButtonProps {
  liveClassId: string;
  isRegistered: boolean;
}

export function LiveClassRsvpButton({
  liveClassId,
  isRegistered,
}: LiveClassRsvpButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleRsvp() {
    startTransition(async () => {
      await rsvpLiveClassAction(liveClassId);
    });
  }

  function handleCancel() {
    startTransition(async () => {
      await cancelLiveClassRsvpAction(liveClassId);
    });
  }

  if (isRegistered) {
    return (
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
    );
  }

  return (
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
  );
}