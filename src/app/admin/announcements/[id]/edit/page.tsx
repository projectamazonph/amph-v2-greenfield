/**
 * /admin/announcements/[id]/edit — admin edit form wrapper.
 *
 * P1-07 (P4 PR-A). Server component that loads the existing row
 * and seeds the form.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { buildContainer } from "@/composition/container";
import { requireAdmin } from "@/lib/auth";
import { AnnouncementForm } from "../../AnnouncementForm";
import styles from "../../page.module.css";

export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const container = buildContainer();
  const result = await container.announcementRepo.findById(id);
  if (!result.ok || !result.value) notFound();
  const a = result.value;
  return (
    <main className={styles.page}>
      <Link href="/admin/announcements" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to announcements
      </Link>
      <h1 className={styles.title}>Edit announcement</h1>
      <AnnouncementForm
        initial={{
          id: a.id,
          title: a.title,
          body: a.body,
          level: a.level,
          isActive: a.isActive,
          startsAt: a.startsAt ? toLocal(a.startsAt) : "",
          endsAt: a.endsAt ? toLocal(a.endsAt) : "",
          dismissible: a.dismissible,
        }}
      />
    </main>
  );
}

function toLocal(d: Date): string {
  // datetime-local needs "YYYY-MM-DDTHH:mm" in local time, not UTC.
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
