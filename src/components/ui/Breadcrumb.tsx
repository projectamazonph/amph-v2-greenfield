/**
 * Breadcrumb — accessible page breadcrumb.
 *
 * Used by tool pages to provide consistent navigation back to /tools.
 * Renders a <nav aria-label="Breadcrumb"> wrapping an <ol> so screen
 * readers announce the position-set semantics. The current page is
 * marked with aria-current="page".
 *
 * Pattern: <Breadcrumb items={[{ href, label }, { label: 'Current' }]} />
 *
 * Pure presentational. The wider breadcrumb (courses/lessons) lives
 * on the lesson page and uses a different markup; this component is
 * scoped to short parent/child paths.
 */

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import styles from "./Breadcrumb.module.css";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={[styles.breadcrumb, className].filter(Boolean).join(" ")}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1 && !item.href;
          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {item.href && !isCurrent ? (
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.current} aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {index < items.length - 1 ? (
                <CaretRight size={12} aria-hidden className={styles.separator} />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
