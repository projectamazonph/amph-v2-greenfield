/**
 * /admin/announcements/new — admin create form wrapper.
 *
 * P1-07 (P4 PR-A). Server component that hands off to the
 * client form.
 */

import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { AnnouncementForm } from "../AnnouncementForm";
import { requireAdmin } from "@/lib/auth";
import styles from "../page.module.css";

export default async function NewAnnouncementPage() {
  await requireAdmin();
  return (
    <main className={styles.page}>
      <Link href="/admin/announcements" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to announcements
      </Link>
      <h1 className={styles.title}>New announcement</h1>
      <AnnouncementForm
        initial={{
          title: "",
          body: "",
          level: "INFO",
          isActive: false,
          startsAt: "",
          endsAt: "",
          dismissible: true,
        }}
      />
    </main>
  );
}
