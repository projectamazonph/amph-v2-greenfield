/**
 * SessionDismissGate — client island around the dismiss button.
 *
 * P1-07 (P4 PR-A). Logged-in users call dismissAnnouncementAction;
 * anonymous users store the announcement id in sessionStorage so the
 * banner stays hidden across page navigations within the session.
 * Either path calls `onDismissed()` to hide the row client-side
 * without a full page reload.
 */

"use client";

import { useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { dismissAnnouncementAction } from "@/app/actions/adminAnnouncements.action";
import styles from "./SiteAnnouncementBanner.module.css";

const STORAGE_KEY = "amph_dismissed_announcements";

export function SessionDismissGate({
  announcementId,
  isLoggedIn,
}: {
  announcementId: string;
  isLoggedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onDismiss() {
    if (isLoggedIn) {
      startTransition(async () => {
        await dismissAnnouncementAction({ announcementId });
        hideRow(announcementId);
      });
    } else {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        const list = raw ? (JSON.parse(raw) as string[]) : [];
        if (!list.includes(announcementId)) {
          list.push(announcementId);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        }
      } catch {
        // sessionStorage unavailable (e.g. private mode); fall through.
      }
      hideRow(announcementId);
    }
  }

  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss announcement"
      className={styles.dismiss}
      disabled={pending}
    >
      <X size={16} weight="bold" />
    </button>
  );
}

function hideRow(id: string): void {
  const el = document.querySelector<HTMLElement>(
    `[data-announcement-id="${id}"]`,
  );
  if (el) el.style.display = "none";
}
