/**
 * Server action to toggle maintenance mode.
 * P1-08: Maintenance mode / kill switch.
 * Admin-only action.
 */

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { ToggleMaintenance } from "@/usecases/LMS/ToggleMaintenance";
import type { ToggleMaintenanceInput } from "@/usecases/LMS/ToggleMaintenance";

export async function toggleMaintenanceAction(input: ToggleMaintenanceInput) {
  await requireAdmin();
  const { toggleMaintenance } = buildContainer();
  const result = await toggleMaintenance.execute(input);
  if (!result.ok) {
    // TODO: Handle error appropriately
    console.error("Failed to toggle maintenance:", result.error);
  }
  redirect("/admin/maintenance");
}
