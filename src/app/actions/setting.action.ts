/**
 * setting.action.ts — P1-05 (PR-C slice 3).
 *
 * Server action wrapper around `SetSetting`. Resolves the calling
 * admin via `requireAdmin` and forwards the input. Follows the
 * codebase's `useActionState` shape so the settings form can render
 * inline errors.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";

export type SetSettingFormResult =
  | { kind: "success" }
  | { kind: "error"; error: string; message?: string };

const ERROR_MESSAGE: Record<string, string> = {
  invalid_key: "Keys use lowercase letters, digits, dots, and underscores.",
  invalid_value: "Value must be valid JSON.",
  invalid_description: "Keep the description under 280 characters.",
  db_error: "Database error. Please try again.",
  unknown: "Something went wrong. Please try again.",
};

function mapError(kind: string): string {
  return ERROR_MESSAGE[kind] ?? ERROR_MESSAGE.unknown ?? "Something went wrong.";
}

function parseValue(raw: FormDataEntryValue | null): { ok: true; value: unknown } | { ok: false } {
  if (typeof raw !== "string") return { ok: false };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * Server action used by the admin settings form. Reads `key`,
 * `value` (JSON text), and an optional `description` from the
 * FormData. Creates the row or replaces it when the key exists.
 */
export async function setSettingAction(
  _prevState: SetSettingFormResult | null,
  formData: FormData,
): Promise<SetSettingFormResult> {
  const admin = await requireAdmin();

  const key = String(formData.get("key") ?? "").trim();
  const descriptionRaw = formData.get("description");
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim() !== ""
      ? descriptionRaw.trim()
      : null;

  const parsed = parseValue(formData.get("value"));
  if (!parsed.ok) {
    return { kind: "error", error: "invalid_value", message: mapError("invalid_value") };
  }

  const container = buildContainer();
  const result = await container.setSetting.execute({
    actorId: admin.id,
    key,
    value: parsed.value,
    description,
  });

  if (!result.ok) {
    return { kind: "error", error: result.error.kind, message: mapError(result.error.kind) };
  }

  redirect("/admin/settings?saved=1");
}
