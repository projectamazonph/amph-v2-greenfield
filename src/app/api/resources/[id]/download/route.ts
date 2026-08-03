/**
 * GET /api/resources/[id]/download — download-center download link.
 *
 * STORY-098. A resource's actual bytes live either at a root-relative
 * `/downloads/...` or `/uploads/...` path (pre-installed static
 * assets, or a file uploaded via `LocalFileStorage`) or an absolute
 * URL (an admin-pasted external link, or a Vercel Blob URL). This
 * route is the choke point between "student clicks Download" and
 * that URL: it re-checks (server-side, not just in the UI) that the
 * resource is published and the signed-in student's subscription
 * tier actually meets the resource's access tier, then records the
 * download (audit log + counter) before redirecting.
 *
 * Thin by design — all the logic lives in RecordResourceDownload so
 * it's unit-testable without HTTP. The only HTTP-specific piece is
 * resolving a relative fileUrl to an absolute one, since
 * `NextResponse.redirect` requires an absolute URL.
 */
import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: Request,
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

  const absoluteUrl = new URL(result.value.fileUrl, req.url).toString();
  return NextResponse.redirect(absoluteUrl);
}
