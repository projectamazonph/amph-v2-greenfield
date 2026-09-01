/**
 * Server action to get active announcements.
 * P1-07: Site-wide announcement banner.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { GetAnnouncements } from "@/usecases/LMS/GetAnnouncements";

export async function getAnnouncementsAction() {
  const { getAnnouncements } = buildContainer();
  const result = await getAnnouncements.execute();
  return result;
}
