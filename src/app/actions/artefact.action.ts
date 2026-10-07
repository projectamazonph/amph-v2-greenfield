/**
 * artefact actions — LEARN-033 (STORY-135).
 *
 * Server action shims over SaveArtefact / SubmitArtefact /
 * ListStudentArtefacts. Each action resolves the caller via
 * `getSessionUserId` and forwards the input; the use case owns
 * ownership checks and validation. The UI for these actions lands
 * in LEARN-034 (tool-debrief autosave) and LEARN-035 (portfolio).
 */

"use server";

import { revalidatePath } from "next/cache";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { isArtefactKind, type ArtefactKind } from "@/domain/entities/LearnerArtefact";

export type ArtefactActionResult<T> =
  { ok: true; value: T } | { ok: false; error: { kind: string; message?: string } };

export interface SaveArtefactActionInput {
  artefactId?: string;
  courseId: string | null;
  kind: string;
  title: string;
  scenarioRef: string | null;
  rationale: string;
  fields?: Record<string, string>;
}

export async function saveArtefactAction(
  input: SaveArtefactActionInput,
): Promise<ArtefactActionResult<{ id: string; status: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  if (!isArtefactKind(input.kind)) {
    return { ok: false, error: { kind: "invalid_kind" } };
  }
  const kind: ArtefactKind = input.kind;
  const container = buildContainer();
  const result = await container.saveArtefact.execute({
    actorId: userId,
    artefactId: input.artefactId,
    courseId: input.courseId,
    kind,
    title: input.title,
    scenarioRef: input.scenarioRef,
    payload: {
      rationale: input.rationale,
      ...(input.fields !== undefined ? { fields: input.fields } : {}),
    },
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  revalidatePath("/portfolio");
  return { ok: true, value: { id: result.value.id, status: result.value.status } };
}

export async function submitArtefactAction(
  artefactId: string,
): Promise<ArtefactActionResult<{ id: string; status: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const result = await container.submitArtefact.execute({
    actorId: userId,
    artefactId,
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  revalidatePath("/portfolio");
  return { ok: true, value: { id: result.value.id, status: result.value.status } };
}

export async function listArtefactsAction(filter?: {
  kind?: string;
  status?: "DRAFT" | "SUBMITTED";
  courseId?: string;
}): Promise<
  ArtefactActionResult<
    readonly { id: string; kind: string; title: string; status: string; createdAt: string }[]
  >
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const kind = filter?.kind !== undefined && isArtefactKind(filter.kind) ? filter.kind : undefined;
  const container = buildContainer();
  const result = await container.listStudentArtefacts.execute({
    actorId: userId,
    ...(kind !== undefined ? { kind } : {}),
    ...(filter?.status !== undefined ? { status: filter.status } : {}),
    ...(filter?.courseId !== undefined ? { courseId: filter.courseId } : {}),
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  return {
    ok: true,
    value: result.value.map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}
