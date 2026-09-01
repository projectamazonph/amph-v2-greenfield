/**
 * Server action to dismiss an announcement for the current user.
 * P1-07: Site-wide announcement banner.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { DismissAnnouncement } from "@/usecases/LMS/DismissAnnouncement";
import { getSessionUserId } from "@/lib/auth";

export async function dismissAnnouncementAction(announcementId: string) {
  const userId = await getSessionUserId();
  const { dismissAnnouncement } = buildContainer();
  const result = await dismissAnnouncement.execute({
    announcementId,
    userId,
  });
  return result;
}
