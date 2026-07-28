"use client";

/**
 * NavSidebar — admin navigation sidebar.
 *
 * Per design spec §9.1: 240px fixed-left, brand + nav items + user card
 * at the bottom. Active state uses a full-pill accent background
 * (not just a left border) for clearer at-a-glance scanning.
 *
 * Client component so the active state stays in sync with the current
 * path during client-side navigation (Next.js App Router default).
 *
 * SOLID: this is a pure presentational component. It receives the
 * current user (already loaded by the layout) and reads the current
 * path via `usePathname()`. It doesn't know anything about auth
 * (lib/auth), container (composition), or domain.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Users,
  BookOpen,
  Files,
  CurrencyDollar,
  ArrowsCounterClockwise,
  CalendarDots,
  GameController,
  Star,
  Question,
  Certificate,
  Gear,
} from "@phosphor-icons/react/dist/ssr";
import type { User } from "@/domain/entities/User";
import { UserCard } from "./UserCard";
import styles from "./NavSidebar.module.css";
import type { ComponentType, SVGProps } from "react";

export interface NavItem {
  href: string;
  label: string;
  // Phosphor icon component. Picked at module load so we don't pay a
  // per-render import cost.
  icon: ComponentType<
    SVGProps<SVGSVGElement> & {
      weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
      size?: number | string;
    }
  >;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: SquaresFour },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/content", label: "Content", icon: Files },
  { href: "/admin/payments", label: "Payments", icon: CurrencyDollar },
  { href: "/admin/refunds", label: "Refunds", icon: ArrowsCounterClockwise },
  { href: "/admin/live-classes", label: "Live Classes", icon: CalendarDots },
  { href: "/admin/simulators", label: "Simulators", icon: GameController },
  { href: "/admin/badges", label: "Badges", icon: Star },
  { href: "/admin/quizzes", label: "Quizzes", icon: Question },
  { href: "/admin/certificates", label: "Certificates", icon: Certificate },
  { href: "/admin/settings", label: "Settings", icon: Gear },
] as const;

export interface NavSidebarProps {
  user: User;
}

export function NavSidebar({ user }: NavSidebarProps) {
  // Reads the live path so client navigation updates the active item
  // without a full page reload. Falls back to "/" if the path is null
  // (e.g. during the first render on the server).
  const pathname = usePathname() ?? "/";

  return (
    <aside className={styles.sidebar} aria-label="Admin navigation">
      <Link href="/admin" className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          <span className={styles.brandMarkSquare} />
          <span className={styles.brandMarkSquare} />
          <span className={styles.brandMarkSquare} />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>Project Amazon PH Academy</span>
          <span className={styles.brandSub}>Admin console</span>
        </span>
        <span className={styles.adminBadge}>Admin</span>
      </Link>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={isActive}
              className={[styles.item, isActive ? styles.active : ""].filter(Boolean).join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.icon} aria-hidden>
                <Icon size={18} weight={isActive ? "fill" : "regular"} />
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
