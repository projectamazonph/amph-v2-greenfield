"use client";

/**
 * WelcomeStepper — client-side 5-step first-run walkthrough (STORY-146).
 *
 * State model:
 * - `step` (0..STEPS.length - 1) is the source of truth for which slide
 *   is showing. It is mirrored to the URL fragment (`#step-N`) and to
 *   `localStorage` so that a refresh (or a back-button) lands the user
 *   on the same step they were on.
 * - On the final step, the primary CTA calls `completeWelcomeAction()`
 *   and, on success, clears localStorage and routes to `/dashboard`.
 * - The "Skip tour" link does the same: it short-circuits the rest of
 *   the tour, marks welcome complete, and routes to `/dashboard`.
 *
 * The stepper is intentionally dependency-light: no analytics, no
 * keyboard shortcuts, no per-step images. Future iterations can swap
 * any single step's body for richer content without changing the
 * shell.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeWelcomeAction } from "@/app/actions/welcome.action";
import styles from "./WelcomeStepper.module.css";

const STEPS = [
  {
    title: "Welcome to AMPH Academy",
    body: "You're joining 500+ Filipino VAs learning real Amazon PPC work. This quick 5-step tour shows you where everything is so you can start learning today.",
  },
  {
    title: "Your dashboard is your home base",
    body: "When you log in, you'll always land here. It shows your progress, what to do next, and quick links to your courses and tools.",
  },
  {
    title: "Courses and lessons — how learning works here",
    body: "Browse the catalog, pick a course, watch short lessons, finish a quick quiz. Each lesson is 5–15 minutes. Your progress saves automatically.",
  },
  {
    title: "Simulators — practice without burning real ad spend",
    body: "Five free tools: bid elevator, campaign builder, listing audit, STR triage, keyword research. Each gives you a score so you know where to focus.",
  },
  {
    title: "You're ready to start",
    body: "Pick a course that matches your goal. You can change it any time. Welcome to AMPH.",
  },
] as const;

const STORAGE_KEY = "amph.welcome.inProgress";

export interface WelcomeStepperProps {
  firstName: string;
}

export function WelcomeStepper({ firstName }: WelcomeStepperProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Restore from localStorage on mount. We only restore intermediate
  // steps (0..STEPS.length - 2); if the user already finished the tour
  // (last step), they would have been redirected by the server page
  // before we ever render.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const n = parseInt(stored, 10);
        if (Number.isFinite(n) && n >= 0 && n < STEPS.length - 1) {
          setStep(n);
        }
      }
    } catch {
      /* localStorage may be blocked; ignore */
    }
  }, []);

  // Persist current step + URL fragment on every change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(step));
    } catch {
      /* ignore */
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#step-${step}`);
    }
  }, [step]);

  async function handleFinish() {
    setSubmitting(true);
    const result = await completeWelcomeAction();
    setSubmitting(false);
    if (result.ok) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.push("/dashboard");
    } else {
      // The server-action failure path: still route to /dashboard so
      // the user isn't trapped on the tour. The server-side
      // `welcomeCompletedAt === null` check on the next request will
      // simply show the tour again if the action's underlying use case
      // didn't actually persist the timestamp.
      router.push("/dashboard");
    }
  }

  const total = STEPS.length;
  const isLast = step === total - 1;
  const current = STEPS[step]!;
  // Personalize the first slide so it doesn't read like a stock email.
  const body = step === 0 ? current.body.replace("You're", `${firstName}, you're`) : current.body;

  return (
    <section className={styles.wrapper} aria-labelledby="welcome-step-title">
      <nav className={styles.dots} aria-label="Welcome walkthrough steps">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === step ? styles.dotActive : ""}`}
            aria-current={i === step ? "step" : undefined}
          />
        ))}
      </nav>

      <p className={styles.eyebrow}>
        Step {step + 1} of {total}
      </p>
      <h1 id="welcome-step-title" className={styles.title}>
        {current.title}
      </h1>
      <p className={styles.body}>{body}</p>

      <div className={styles.controls}>
        {step > 0 && (
          <button type="button" className={styles.back} onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            className={styles.primary}
            onClick={handleFinish}
            disabled={submitting}
          >
            {submitting ? "Finishing…" : "Take me to my dashboard"}
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={() => setStep(step + 1)}>
            {step === 0 ? "Start the tour" : "Next"}
          </button>
        )}
      </div>

      {!isLast && (
        <button type="button" className={styles.skip} onClick={handleFinish}>
          Skip tour
        </button>
      )}
    </section>
  );
}
