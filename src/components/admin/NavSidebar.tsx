/**
 * NavSidebar — admin navigation sidebar.
 *
 * Per design spec §9.1: 240px fixed-left, brand + nav items + user card
 * at the bottom. Active state has 2px --accent left border. Hover
 * washes bg to --surface-2.
 *
 * Server component. Takes the current pathname (from proxy/middleware
 * x-pathname header) to compute active state.
 *
 * SOLID: this is a pure presentational component. It receives the
 * current user (already loaded by the layout) and the current path
 * (already known). It doesn't know anything about auth (lib/auth),
 * container (composition), or domain.
 */

import Link from "next/link";
import type { User } from "@/domain/entities/User";
import { UserCard } from "./UserCard";
import styles from "./NavSidebar.module.css";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // single emoji or short text; future: replace with <Icon>
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "▦" },
  { href: "/admin/users", label: "Users", icon: "◉" },
  { href: "/admin/courses", label: "Courses", icon: "▤" },
  { href: "/admin/content", label: "Content", icon: "▥" },
  { href: "/admin/payments", label: "Payments", icon: "₱" },
  { href: "/admin/refunds", label: "Refunds", icon: "↺" },
  { href: "/admin/live-classes", label: "Live Classes", icon: "▣" },
  { href: "/admin/simulators", label: "Simulators", icon: "▧" },
  { href: "/admin/badges", label: "Badges", icon: "★" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
] as const;

export interface NavSidebarProps {
  user: User;
  currentPath?: string;
}

export function NavSidebar({ user, currentPath }: NavSidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label="Admin navigation">
      <div className={styles.brand}>
        <span className={styles.brandName}>Project Amazon PH Academy</span>
        <span className={styles.adminBadge}>Admin</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== "/admin" && currentPath?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[styles.item, isActive ? styles.active : ""].filter(Boolean).join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.icon} aria-hidden>
                {item.icon}
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <UserCard user={user} />
      </div>
    </aside>
  );
}
