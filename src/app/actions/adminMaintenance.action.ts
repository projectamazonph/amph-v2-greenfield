/**
 * adminMaintenance.action.ts — P1-08 (P4 PR-A).
 *
 * Server action wrapper around `AdminToggleMaintenance`. Resolves
 * the calling admin via `requireAdmin` and forwards the input.
 *
 * The action signature follows the codebase's `useActionState`
 * shape so the client form can render inline errors.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export interface ToggleMaintenanceFormInput {
  enabled: string;
  message?: string;
}

export type ToggleMaintenanceFormResult =
  | { kind: "success"; enabled: boolean }
  | { kind: "error"; error: string; message?: string };

const ERROR_MESSAGE: Record<string, string> = {
  invalid_input: "Check your message — keep it under 500 characters.",
  db_error: "Database error. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

function mapError(kind: string, message?: string): string {
  if (kind === "invalid_input" && message) return message;
  return ERROR_MESSAGE[kind] ?? ERROR_MESSAGE.unknown ?? "Something went wrong.";
}

/**
 * Server action used by the admin/maintenance form.
 *
 * Reads `enabled` and optional `message` from the FormData. The
 * client passes `enabled` as the literal string "on" (from a
 * checkbox) or anything else (off).
 */
export async function toggleMaintenanceAction(
  _prevState: ToggleMaintenanceFormResult | null,
  formData: FormData,
): Promise<ToggleMaintenanceFormResult> {
  const admin = await requireAdmin(undefined, true);

  const enabled = formData.get("enabled") === "on";
  const rawMessage = formData.get("message");
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

  const container = buildContainer();
  const result = await container.adminToggleMaintenance.execute({
    actorId: admin.id,
    enabled,
    message: message.length > 0 ? message : null,
  });

  if (!result.ok) {
    return {
      kind: "error",
      error: result.error.kind,
      message: mapError(result.error.kind, result.error.message),
    };
  }

  // On success, revalidate so the next server-component render of
  // /admin/maintenance sees the updated row immediately.
  redirect("/admin/maintenance?saved=1");
}