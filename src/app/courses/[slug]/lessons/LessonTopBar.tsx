"use client";

/**
 * LessonTopBar — thin utility nav shown on lesson pages.
 *
 * Problem: lesson pages replace the full student sidebar (Dashboard, Tools,
 * Notifications, Profile) with the curriculum sidebar. Users have no way to
 * escape the lesson without scrolling to the bottom or clicking the breadcrumb.
 *
 * Solution: a compact top strip above the hero with icon links to the most
 * important destinations. Collapses to a hamburger menu on mobile, mirrors the
 * StudentShell nav items for consistency.
 *
 * Story: TBD (lesson page UX)
 */

import Link from "next/link";
import { useState } from "react";
import { House, Compass, Lightning, Bell, User, List, X } from "@phosphor-icons/react/dist/ssr";
import styles from "./LessonTopBar.module.css";

interface LessonTopBarProps {
  courseSlug: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/courses", label: "Courses", icon: Compass },
  { href: "/tools", label: "Tools", icon: Lightning },
] as const;

export function LessonTopBar({ courseSlug }: LessonTopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={styles.bar} role="banner">
      <div className={styles.inner}>
        {/* Left: hamburger + destination links */}
        <nav className={styles.left} aria-label="Lesson utilities">
          {/* Mobile hamburger */}
          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="lesson-topbar-mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <List size={20} />}
          </button>

          {/* Desktop icon links */}
          <ul className={styles.navList} role="list">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={styles.navItem} aria-label={label}>
                  <Icon size={18} weight="regular" aria-hidden />
                  <span className={styles.navLabel}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right: notifications + profile */}
        <div className={styles.right}>
          <Link href="/notifications" className={styles.iconBtn} aria-label="Notifications">
            <Bell size={18} weight="regular" aria-hidden />
          </Link>
          <Link href="/profile" className={styles.iconBtn} aria-label="Profile">
            <User size={18} weight="regular" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <nav
          id="lesson-topbar-mobile-menu"
          className={styles.mobileMenu}
          aria-label="Lesson utilities (mobile)"
        >
          <ul role="list">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={styles.mobileNavItem}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/notifications"
                className={styles.mobileNavItem}
                onClick={() => setMobileOpen(false)}
              >
                <Bell size={18} aria-hidden />
                Notifications
              </Link>
            </li>
            <li>
              <Link
                href="/profile"
                className={styles.mobileNavItem}
                onClick={() => setMobileOpen(false)}
              >
                <User size={18} aria-hidden />
                Profile
              </Link>
            </li>
            <li>
              <Link
                href={`/courses/${courseSlug}`}
                className={styles.mobileNavItem}
                onClick={() => setMobileOpen(false)}
              >
                <Compass size={18} aria-hidden />
                Course home
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
