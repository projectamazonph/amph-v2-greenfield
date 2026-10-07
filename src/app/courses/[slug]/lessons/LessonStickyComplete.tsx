"use client";

/**
 * LessonStickyComplete — sticky floating completion CTA.
 *
 * Appears at the bottom of the viewport once the user has scrolled
 * past the hero section. Disappears when the user is near the completion
 * card so the two don't double-up.
 *
 * Replaces the need to scroll to y≈3282 to find the action.
 */

import { useEffect, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/Button";
import styles from "./LessonStickyComplete.module.css";

interface LessonStickyCompleteProps {
  /** The server action to call on submit */
  action: () => void;
  isCompleted: boolean;
  /** Selector or element of the completion card — hide when near it */
  completionCardSelector?: string;
}

function SubmitButton({ isCompleted }: { isCompleted: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      variant={isCompleted ? "secondary" : "primary"}
      size="sm"
      type="submit"
      disabled={pending || isCompleted}
      aria-busy={pending}
    >
      {pending ? (
        "Saving…"
      ) : isCompleted ? (
        <>
          <CheckCircle size={16} weight="fill" aria-hidden />
          Completed
        </>
      ) : (
        <>
          Mark complete
          <ArrowRight size={16} aria-hidden />
        </>
      )}
    </Button>
  );
}

export function LessonStickyComplete({
  action,
  isCompleted,
  completionCardSelector = "[data-completion-card]",
}: LessonStickyCompleteProps) {
  const [visible, setVisible] = useState(false);

  const update = useCallback(() => {
    const hero = document.querySelector("[data-lesson-hero]");
    const card = document.querySelector(completionCardSelector);
    const scrollY = window.scrollY;
    const viewportH = window.innerHeight;

    // Show once past the hero (approx 600px)
    const pastHero = scrollY > 600;

    // Hide when the completion card is near the viewport bottom
    let nearCard = false;
    if (card) {
      const cardRect = card.getBoundingClientRect();
      nearCard = cardRect.top < viewportH + 200;
    }

    setVisible(pastHero && !nearCard && !isCompleted);
  }, [isCompleted, completionCardSelector]);

  useEffect(() => {
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [update]);

  if (!visible) return null;

  return (
    <div className={styles.sticky} role="complementary" aria-label="Lesson completion">
      <div className={styles.inner}>
        <p className={styles.copy}>{isCompleted ? "Step recorded." : "Finish this step?"}</p>
        <form action={action}>
          <SubmitButton isCompleted={isCompleted} />
        </form>
      </div>
    </div>
  );
}
