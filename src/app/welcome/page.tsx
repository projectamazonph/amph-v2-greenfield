/**
 * /welcome — first-run welcome walkthrough (STORY-129).
 *
 * No-tier signups land here from `/api/auth/signup` (Task 8). The page is
 * an async server component: it authenticates the visitor, then either
 * short-circuits to `/dashboard` (if `welcomeCompletedAt` is already set)
 * or renders the client `WelcomeStepper`.
 *
 * The stepper owns step state, URL fragment, and localStorage persistence;
 * this page just resolves "should we show the tour at all?".
 */

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { hasCompletedWelcome } from "@/domain/entities/User";
import { WelcomeStepper } from "./WelcomeStepper";
import styles from "./page.module.css";

export const metadata = { title: "Welcome to AMPH Academy" };
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await requireAuth();

  // If they already finished, send them to the dashboard rather than re-show
  // the tour. The user object returned by `requireAuth()` already carries
  // `welcomeCompletedAt`, but we re-fetch via `userRepo.findById` to keep
  // parity with how `getSessionUser()` resolves the entity and to surface
  // a stale-cookie / deleted-account case as a "go to dashboard" fallback
  // rather than rendering with phantom data.
  const found = await buildContainer().userRepo.findById(user.id);
  if (found.ok && hasCompletedWelcome(found.value)) {
    redirect("/dashboard");
  }

  return (
    <main id="main-content" tabIndex={-1} className={styles.page}>
      <WelcomeStepper firstName={user.firstName} />
    </main>
  );
}
