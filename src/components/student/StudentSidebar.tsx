"use client";

/**
 * StudentSidebar — student-facing navigation sidebar.
 *
 * Mirrors the admin NavSidebar pattern but with student-appropriate
 * navigation: Dashboard, My Courses, Tools, Certificates, Profile.
 *
 * Client component so the active state stays in sync with the current
 * path during client-side navigation.
 *
 * Pure presentational — receives user data, reads pathname via usePathname().
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  BookOpen,
  GameController,
  Certificate,
  UserCircle,
  SignOut,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";
import styles from "./StudentSidebar.module.css";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<
    SVGProps<SVGSVGElement> & {
      weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
      size?: number | string;
    }
  >;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: SquaresFour },
  { href: "/courses", label: "My Courses", icon: BookOpen },
  { href: "/tools", label: "Simulators", icon: GameController },
  { href: "/resources", label: "Download center", icon: DownloadSimple },
  { href: "/certificates", label: "Certificates", icon: Certificate },
  { href: "/profile", label: "Profile", icon: UserCircle },
] as const;

export interface StudentSidebarProps {
  user: {
    firstName: string;
    lastName?: string | null;
    role: string;
  };
}

function initials(firstName: string, lastName?: string | null): string {
  return firstName.charAt(0).toUpperCase() + (lastName?.charAt(0).toUpperCase() ?? "");
}

export function StudentSidebar({ user }: StudentSidebarProps) {
  const pathname = usePathname() ?? "/";

  return (
    <aside id="student-sidebar" className={styles.sidebar} aria-label="Student navigation">
      {/* Brand */}
      <Link href="/dashboard" className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          <span className={styles.brandMarkSquare} />
          <span className={styles.brandMarkSquare} />
          <span className={styles.brandMarkSquare} />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>Amazon PH Academy</span>
          <span className={styles.brandSub}>Student</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
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

      {/* User card at bottom */}
      <div className={styles.footer}>
        <div className={styles.userCard}>
          <div className={styles.avatar} aria-hidden>
            {initials(user.firstName, user.lastName)}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {user.firstName} {user.lastName}
            </div>
            <div className={styles.userRole}>{user.role}</div>
          </div>
          <form action="/api/auth/logout" method="post" className={styles.logoutForm}>
            <button
              type="submit"
              className={styles.logoutButton}
              aria-label="Log out"
              title="Log out"
            >
              <SignOut size={16} weight="bold" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
