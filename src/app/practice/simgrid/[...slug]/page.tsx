/**
 * /practice/simgrid/[...slug] — Task 8 of the 2026-09-30 SimGrid
 * integration plan.
 *
 * Server component. Auth gate + manifest lookup + iframe host for the
 * 12 vendored SimGrid simulators surfaced on /practice/simgrid
 * (Task 7). The vendored static site is served from
 * public/simgrid-v1/ under the AMPH origin; this page is the AMPH-
 * branded wrapper that:
 *
 *   1. Authenticates the visitor. Anonymous requests are redirected
 *      to /login?redirect=<encoded currentPath> so the learner lands
 *      back here after signing in. The query-param name is `redirect`
 *      (NOT `returnTo`) because src/lib/auth.ts:160-167's
 *      `requireAuth(currentPath)` builds `/login?redirect=...` and the
 *      /login route reads `redirect` to send the user back. Using a
 *      different name would silently break the round-trip.
 *   2. Resolves the simulator from the manifest
 *      (src/lib/simgrid/manifest.ts:167, `getSimgridSimulatorByFile`).
 *      Unknown files return notFound() — Next renders the 404 page.
 *   3. Mounts <SimgridFrame simulatorId=... src=... title=...>
 *      inside <StudentShell>. The src wires the bridge params the
 *      vendored site reads (simhubBridgeToken, simhubReturnOrigin).
 *      The bridge token matches SIMGRID_BRIDGE_TOKEN
 *      (src/lib/simgrid/protocol.ts:26) so the listener inside
 *      SimgridFrame can prove the message came from our iframe.
 *
 * Catch-all `[...slug]` (not single `[file]`) so future nested paths
 * (e.g. /practice/simgrid/<file>.html/variant) still resolve here
 * without restructuring. The page joins the slug segments with `/`
 * and treats the result as the vendored filename — the canonical
 * link shape from the practice hub already includes the `.html`
 * suffix (see src/components/simgrid/SimgridPracticeGrid.tsx), so
 * no extension is appended here.
 *
 * Return-origin derivation:
 *   The vendored site reads ?simhubReturnOrigin=... and uses it as
 *   the postMessage targetOrigin (an absolute URL). For same-origin
 *   delivery the value is functionally informational (the browser
 *   delivers the message either way) but pinning it to our
 *   configured origin means the bridge code can't be repurposed
 *   against a cross-origin deployment without a code change. We
 *   reuse NEXT_PUBLIC_APP_URL (the existing env var that
 *   buildAppUrl() in src/domain/shared/AppUrl.ts already normalizes
 *   for the retired Vercel hostname) rather than introducing a new
 *   NEXT_PUBLIC_AMPH_ORIGIN.
 */

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { StudentShell } from "@/components/student/StudentShell";
import { SimgridFrame } from "@/components/simgrid/SimgridFrame";
import { getSimgridSimulatorByFile } from "@/lib/simgrid/manifest";
import { getSessionUserId } from "@/lib/auth";
import { SIMGRID_BRIDGE_TOKEN } from "@/lib/simgrid/protocol";

import styles from "./page.module.css";

export const dynamic = "force-dynamic";

interface Props {
  readonly params: Promise<{ slug: string[] }> | { slug: string[] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const file = (slug ?? []).join("/");
  const meta = getSimgridSimulatorByFile(file);
  return {
    title: meta ? `${meta.title} | SimGrid Practice` : "SimGrid Practice",
  };
}

export default async function PracticeSimgridSimulatorPage({ params }: Props) {
  const { slug } = await Promise.resolve(params);
  // The URL is /practice/simgrid/<file>.html; the catch-all route
  // receives the segments AFTER the parent path, so slug is
  // ["<file>.html"] for the canonical link shape (the practice hub
  // cards in src/components/simgrid/SimgridPracticeGrid.tsx point at
  // /practice/simgrid/<file>.html with the .html intact).
  const file = (slug ?? []).join("/");

  const userId = await getSessionUserId();
  if (!userId) {
    redirect(`/login?redirect=${encodeURIComponent(`/practice/simgrid/${file}`)}`);
  }

  const meta = getSimgridSimulatorByFile(file);
  if (!meta) notFound();

  const returnOrigin = process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
  const src =
    `/simgrid-v1/${meta.file}` +
    `?simhubBridgeToken=${encodeURIComponent(SIMGRID_BRIDGE_TOKEN)}` +
    `&simhubReturnOrigin=${encodeURIComponent(returnOrigin)}`;

  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <SimgridFrame simulatorId={meta.id} src={src} title={`${meta.title} — SimGrid Practice`} />
      </main>
    </StudentShell>
  );
}
