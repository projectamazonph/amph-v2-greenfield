/**
 * Server action to get current maintenance status.
 * P1-08: Maintenance mode / kill switch.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { GetMaintenance } from "@/usecases/LMS/GetMaintenance";

export async function getMaintenanceAction() {
  const { getMaintenance } = buildContainer();
  const result = await getMaintenance.execute();
  return result;
}
