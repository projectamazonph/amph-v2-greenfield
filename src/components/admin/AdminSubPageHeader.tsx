/**
 * AdminSubPageHeader — L5 fix: consolidate the repeated back-link + TopBar
 * pattern across admin sub-pages.
 *
 * Replaces:
 *   <Link href="/admin/..." className={styles.backLink}>
 *     <ArrowLeft size={16} aria-hidden /> Back to ...
 *   </Link>
 *   <TopBar title="..." subtitle="..." />
 *
 * Usage:
 *   import { AdminSubPageHeader } from "@/components/admin/AdminSubPageHeader";
 *   <AdminSubPageHeader
 *     title="Add student"
 *     backHref="/admin/users"
 *     backLabel="Back to users"
 *     subtitle="Grant a subscription tier without going through checkout."
 *   />
 */

import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import styles from "./AdminSubPageHeader.module.css";

export interface AdminSubPageHeaderProps {
  title: string;
  backHref: string;
  backLabel: string;
  subtitle?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

export function AdminSubPageHeader({
  title,
  backHref,
  backLabel,
  subtitle,
  breadcrumb,
  actions,
}: AdminSubPageHeaderProps) {
  return (
    <>
      <Link href={backHref} className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden /> {backLabel}
      </Link>
      <TopBar title={title} subtitle={subtitle} breadcrumb={breadcrumb} actions={actions} />
    </>
  );
}
