"use client";

/**
 * NavSidebar — admin navigation sidebar with section grouping.
 *
 * Per design spec §9.1: 240px fixed-left, brand + nav items + user card
 * at the bottom. Items are grouped into logical sections (Overview,
 * Content, Operations, System) with monospace labels for quick scanning.
 *
 * Active state uses a full-pill accent background for clearer at-a-glance
 * scanning.
 *
 * Client component so the active state stays in sync with the current
 * path during client-side navigation (Next.js App Router default).
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
  Envelope,
} from "@phosphor-icons/react/dist/ssr";
import type { User } from "@/domain/entities/User";
import { UserCard } from "./UserCard";
import styles from "./NavSidebar.module.css";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
    size?: number | string;
  }
>;

export interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  /** Optional badge count rendered as a small pill at the right of the item. */
  badge?: number;
}

interface NavSection {
  label: string;
  items: readonly NavItem[];
}

const NAV_SECTIONS: readonly NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: SquaresFour }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
      { href: "/admin/content", label: "Content", icon: Files },
      { href: "/admin/simulators", label: "Simulators", icon: GameController },
      { href: "/admin/quizzes", label: "Quizzes", icon: Question },
      { href: "/admin/badges", label: "Badges", icon: Star },
      { href: "/admin/email-templates", label: "Email templates", icon: Envelope },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/payments", label: "Payments", icon: CurrencyDollar },
      { href: "/admin/refunds", label: "Refunds", icon: ArrowsCounterClockwise, badge: 3 },
      { href: "/admin/live-classes", label: "Live Classes", icon: CalendarDots },
      { href: "/admin/certificates", label: "Certificates", icon: Certificate },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: Gear }],
  },
] as const;

export interface NavSidebarProps {
  user: User;
}

export function NavSidebar({ user }: NavSidebarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <aside id="admin-sidebar" className={styles.sidebar} aria-label="Admin navigation">
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
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className={styles.section}>
            <div className={styles.sectionLabel}>{section.label}</div>
            {section.items.map((item) => {
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
                  {item.badge ? (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        padding: "1px 6px",
                        borderRadius: "10px",
                      }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <UserCard user={user} />
      </div>
    </aside>
  );
}
