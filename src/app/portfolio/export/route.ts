/**
 * GET /portfolio/export
 *
 * Downloads the caller's artefacts as JSON. Owner-scoped: only rows
 * whose userId matches the session user are included. Unauthenticated
 * callers get 401.
 */

import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const container = buildContainer();
  const result = await container.listStudentArtefacts.execute({ actorId: userId });
  if (!result.ok) {
    return NextResponse.json({ error: "Failed to export portfolio" }, { status: 500 });
  }

  const dateStr = new Date().toISOString().split("T")[0];
  const headers = new Headers();
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Content-Disposition", `attachment; filename="portfolio-artefacts-${dateStr}.json"`);

  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      artefacts: result.value.map((a) => ({
        id: a.id,
        kind: a.kind,
        title: a.title,
        scenarioRef: a.scenarioRef,
        payload: a.payload,
        status: a.status,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    },
    null,
    2,
  );

  return new NextResponse(body, { headers });
}
