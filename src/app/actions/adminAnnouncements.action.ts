/**
 * adminAnnouncements.action.ts — server actions for the admin UI.
 *
 * P1-07 (P4 PR-A). 5-line shims to use cases; requireAdmin() is
 * enforced at this boundary so the use cases can stay auth-agnostic.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAnnouncementAction(input: {
  title: string;
  body: string;
  level: string;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  dismissible?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const actor = await requireAdmin();
  const container = buildContainer();
  const result = await container.adminCreateAnnouncement.execute({
    ...input,
    actorId: actor.id,
  });
  if (!result.ok) {
    return { ok: false, message: humanizeError(result.error.kind) };
  }
  revalidatePath("/admin/announcements");
  return { ok: true, id: result.value.announcementId };
}

export async function updateAnnouncementAction(input: {
  id: string;
  title?: string;
  body?: string;
  level?: "INFO" | "WARNING" | "CRITICAL";
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  dismissible?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const actor = await requireAdmin();
  const container = buildContainer();
  const result = await container.adminUpdateAnnouncement.execute({
    ...input,
    actorId: actor.id,
  });
  if (!result.ok) {
    return { ok: false, message: humanizeError(result.error.kind) };
  }
  revalidatePath("/admin/announcements");
  revalidatePath(`/admin/announcements/${input.id}/edit`);
  return { ok: true };
}

export async function setAnnouncementActiveAction(input: {
  id: string;
  active: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const actor = await requireAdmin();
  const container = buildContainer();
  const result = await container.adminSetAnnouncementActive.execute({
    id: input.id,
    active: input.active,
    actorId: actor.id,
  });
  if (!result.ok) {
    return { ok: false, message: humanizeError(result.error.kind) };
  }
  revalidatePath("/admin/announcements");
  return { ok: true };
}

/** User-facing: dismisses a banner. Called by the banner UI. */
export async function dismissAnnouncementAction(input: {
  announcementId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const { getSessionUser } = await import("@/lib/auth");
  const user = await getSessionUser();
  if (!user) {
    // Anonymous dismissals are sessionStorage-only on the client;
    // reaching here anonymously is a misrouted call — fail closed.
    return { ok: false, message: "Login required to dismiss." };
  }
  const container = buildContainer();
  const result = await container.dismissAnnouncement.execute({
    userId: user.id,
    announcementId: input.announcementId,
  });
  if (!result.ok) {
    return { ok: false, message: "Could not dismiss." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

function humanizeError(kind: string): string {
  switch (kind) {
    case "invalid_title":
      return "Title is required and must be under 120 characters.";
    case "invalid_body":
      return "Body cannot be empty.";
    case "invalid_level":
      return "Level must be INFO, WARNING, or CRITICAL.";
    case "invalid_window":
      return "End time must be after the start time.";
    case "not_found":
      return "Announcement not found.";
    default:
      return "Something went wrong.";
  }
}
