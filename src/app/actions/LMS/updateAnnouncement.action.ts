/**
 * Server action to update an announcement.
 * P1-07: Site-wide announcement banner.
 * Admin-only action.
 */

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { UpdateAnnouncement } from "@/usecases/LMS/UpdateAnnouncement";
import type { UpdateAnnouncementInput } from "@/usecases/LMS/UpdateAnnouncement";

export async function updateAnnouncementAction(input: UpdateAnnouncementInput) {
  await requireAdmin();
  const { updateAnnouncement } = buildContainer();
  const result = await updateAnnouncement.execute(input);
  if (!result.ok) {
    console.error("Failed to update announcement:", result.error);
  }
  redirect("/admin/announcements");
}
