/**
 * AnnouncementBanner - Site-wide announcement banner component.
 * P1-07: Site-wide announcement banner.
 */

"use client";

import { useEffect, useState } from "react";
import { Card } from "@astryxdesign/core";
import { getAnnouncementsAction, dismissAnnouncementAction } from "@/app/actions/LMS";
import { Announcement } from "@/domain/entities/LMS/Announcement";
import styles from "./AnnouncementBanner.module.css";

const SEVERITY_COLORS = {
  info: { bg: "var(--c-info-soft)", text: "var(--c-info)" },
  warning: { bg: "var(--c-warning-soft)", text: "var(--c-warning)" },
  critical: { bg: "var(--c-error-soft)", text: "var(--c-error)" },
} as const;

const DISMISSED_KEY = "dismissedAnnouncements";

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<readonly Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const result = await getAnnouncementsAction();
        if (result.ok) {
          // Filter out dismissed announcements
          const dismissedIds = getDismissedIds();
          setAnnouncements(
            result.value.filter((a) => !dismissedIds.includes(a.id))
          );
        }
      } catch {
        // Silently fail - banner is optional
      } finally {
        setIsLoading(false);
      }
    }
    loadAnnouncements();
  }, []);

  const handleDismiss = async (announcementId: string) => {
    try {
      await dismissAnnouncementAction(announcementId);
      // Mark as dismissed in localStorage
      const dismissedIds = getDismissedIds();
      dismissedIds.push(announcementId);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedIds));
      // Remove from state
      setAnnouncements((prev) =>
        prev.filter((a) => a.id !== announcementId)
      );
    } catch {
      // Silently fail
    }
  };

  if (isLoading || announcements.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {announcements.map((announcement) => {
        const colors = SEVERITY_COLORS[announcement.severity] ?? SEVERITY_COLORS.info;
        return (
          <Card
            key={announcement.id}
            padding={4}
            className={styles.banner}
            style={{
              background: colors.bg,
              borderColor: colors.text,
            }}
          >
            <div className={styles.content}>
              <span className={styles.title}>
                {announcement.title}
              </span>
              <span className={styles.message}>
                {announcement.content}
              </span>
            </div>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => handleDismiss(announcement.id)}
              aria-label="Dismiss announcement"
            >
              &times;
            </button>
          </Card>
        );
      })}
    </div>
  );
}

function getDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
