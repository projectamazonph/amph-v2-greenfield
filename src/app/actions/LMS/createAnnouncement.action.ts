/**
 * Server action to create a new announcement.
 * P1-07: Site-wide announcement banner.
 * Admin-only action.
 */

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { CreateAnnouncement } from "@/usecases/LMS/CreateAnnouncement";
import type { CreateAnnouncementInput } from "@/usecases/LMS/CreateAnnouncement";

export async function createAnnouncementAction(input: CreateAnnouncementInput) {
  const admin = await requireAdmin();
  const { createAnnouncement } = buildContainer();
  const result = await createAnnouncement.execute({
    ...input,
    createdById: admin.id,
  });
  if (!result.ok) {
    // TODO: Handle error appropriately
    console.error("Failed to create announcement:", result.error);
  }
  redirect("/admin/announcements");
}
