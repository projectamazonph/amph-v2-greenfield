/**
 * GET /api/resources/[id]/download — download-center download link.
 *
 * STORY-098. There's no file-storage layer in this codebase, so a
 * resource's actual bytes live at an externally-hosted `fileUrl`.
 * This route is the choke point between "student clicks Download" and
 * that external URL: it re-checks (server-side, not just in the UI)
 * that the resource is published and the signed-in student's
 * subscription tier actually meets the resource's access tier, then
 * records the download (audit log + counter) before redirecting.
 *
 * Thin by design — all the logic lives in RecordResourceDownload so
 * it's unit-testable without HTTP.
 */
import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: { kind: "unauthenticated" } }, { status: 401 });
  }

  const container = buildContainer();
  const result = await container.recordResourceDownload.execute({
    resourceId: id,
    userId: user.id,
    subscriptionTier: user.subscriptionTier,
  });

  if (!result.ok) {
    const status =
      result.error.kind === "not_found"
        ? 404
        : result.error.kind === "access_denied" || result.error.kind === "not_published"
          ? 403
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.redirect(result.value.fileUrl);
}
