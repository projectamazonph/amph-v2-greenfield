/**
 * ImpersonationBanner — sticky top banner shown when an admin is
 * impersonating another user.
 *
 * STORY-047. Server component.
 *
 * Detects impersonation by the presence of the `amph_admin_session`
 * cookie (planted by the impersonateUserAction when the admin starts
 * impersonating). When present, the banner shows the target user's
 * info and a "Stop impersonating" form button.
 *
 * The banner reads:
 *   - The `amph_admin_session` cookie (presence = impersonation active)
 *   - The current session user (the target of impersonation) via
 *     `getSessionUser`
 *   - A "Stop impersonating" server action form
 *
 * The banner lives at the app level (root layout) so it shows on
 * every page. It's hidden by default (returns null) when no
 * impersonation is active.
 */

import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import { userFullName } from "@/domain/entities/User";
import { stopImpersonatingAction } from "@/app/actions/stopImpersonating.action";
import styles from "./ImpersonationBanner.module.css";

function getAdminSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-amph_admin_session"
    : "amph_admin_session";
}

export async function ImpersonationBanner() {
  const cookieJar = await cookies();
  const adminSession = cookieJar.get(getAdminSessionCookieName());

  // No backup cookie → not impersonating
  if (!adminSession?.value) {
    return null;
  }

  // Get the current (impersonated) user
  const targetUser = await getSessionUser();
  if (!targetUser) {
    return null;
  }

  const targetName = userFullName(targetUser);

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden>
          ⚠
        </span>
        <span className={styles.text}>
          You are impersonating <strong>{targetName}</strong> ({targetUser.email}).
        </span>
        <form
          action={async () => {
            "use server";
            await stopImpersonatingAction();
          }}
          className={styles.form}
        >
          <button type="submit" className={styles.stopButton}>
            Stop impersonating
          </button>
        </form>
      </div>
    </div>
  );
}
