/**
 * TopBar — admin page header.
 *
 * Per design spec §9: H1 + optional subtitle on the left, action
 * buttons on the right. Padding --space-8 0 header block, --space-6 0
 * between header and content.
 *
 * Server component. Breadcrumb is a separate row above (or below)
 * the title; the page passes it as a child or via the breadcrumb prop.
 */

import type { ReactNode } from "react";
import styles from "./TopBar.module.css";

export interface TopBarProps {
  title: string;
  subtitle?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

export function TopBar({ title, subtitle, breadcrumb, actions }: TopBarProps) {
  return (
    <header className={styles.header}>
      {breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}
      <div className={styles.row}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}
