# Layouts — Shared Shells

## Root layout

`src/app/layout.tsx` — global font loader, html shell, providers, route protection via
`src/proxy.ts`. Holds the entire app; nothing renders without it.

## Landing TopBar (client component)

`src/components/landing/TopBar.tsx` — sticky white top bar with scroll-aware elevation,
scroll progress bar, Manila clock, brand mark, in-page nav links (`#method`, `#simulator`,
`#curriculum`, `#pricing`, `#faq`), login link, and primary CTA to `COURSES_URL`. Mobile
collapses into a burger drawer.

Key visual notes:
- Background `--c-card`, border-bottom `--c-border-2` once `.scrolled` kicks in (y > 8px).
- Brand: `Logo` component with tagline "Amazon ads · practice-first".
- Top-right meta block: green dot for MNL, mono clock (updates every 15s).
- Primary CTA: orange `btn` with `→` arrow, slides 3px on hover.
- Mobile drawer slides in from the right at `≤900px`.

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { COURSES_URL } from "./constants";
import { Logo } from "./Logo";
import shared from "./shared.module.css";
import styles from "./TopBar.module.css";

const NAV_LINKS = [
  { href: "#method", label: "Method" },
  { href: "#simulator", label: "Simulators" },
  { href: "#curriculum", label: "Curriculum" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function TopBar() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState("--:--");

  const loginLink = { href: "/login", label: "Log in" };

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 8);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (y / h) * 100 : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function tick() {
      try {
        setClock(
          new Date().toLocaleTimeString("en-GB", {
            timeZone: "Asia/Manila",
            hour: "2-digit",
            minute: "2-digit",
          }) + " MNL",
        );
      } catch {
        setClock("--:--");
      }
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className={styles.progress} style={{ width: `${progress}%` }} aria-hidden="true" />
      <header className={[styles.topbar, scrolled ? styles.scrolled : ""].join(" ")}>
        <div className={[shared.wrap, styles.topbarIn].join(" ")}>
          <a href="#top" className={styles.brand}>
            <Logo tagline="Amazon ads · practice-first" />
          </a>

          <nav
            id="landing-nav"
            className={[styles.nav, menuOpen ? styles.navOpen : ""].join(" ")}
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <Link
              href={loginLink.href}
              className={styles.loginLink}
              onClick={() => setMenuOpen(false)}
            >
              {loginLink.label}
            </Link>
            <a
              className={[shared.btn, shared.btnPrimary, styles.navCtaMobile].join(" ")}
              href={COURSES_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              See the courses
            </a>
          </nav>

          <div className={styles.barMeta}>
            <span className={styles.loc}><i /> MNL</span>
            <span className={styles.clk}>{clock}</span>
          </div>

          <a
            className={[shared.btn, shared.btnPrimary, styles.navCta].join(" ")}
            href={COURSES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            See the courses <span className={shared.arr}>→</span>
          </a>

          <button
            type="button"
            className={styles.burger}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="landing-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>
    </>
  );
}
```

## Landing Footer (server component)

`src/components/landing/Footer.tsx` — three-column link list (Course / Project / Enrol), an
accessibility-friendly architecture table (sr-only caption + `scope="col"` headers), and the
one-line payment meta block.

```tsx
import Link from "next/link";
import { COURSES_URL } from "./constants";
import { Logo } from "./Logo";
import shared from "./shared.module.css";
import styles from "./Footer.module.css";

const ARCHITECTURE = [
  { level: "Master", name: "Project Amazon PH", used: "Social, tools, community, this site" },
  {
    level: "Product",
    name: "Project Amazon PH Academy",
    used: "Courses, simulators, certificates, receipts",
  },
  { level: "Personal", name: "Ryan Roland Dabao", used: "LinkedIn & expert-led mentorship" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={[shared.wrap, styles.in].join(" ")}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Logo />
            <p>
              Amazon ads training that helps Filipino VAs become specialists clients can see.
              One-time payment, no subscription.
            </p>
          </div>

          <div className={styles.col}>
            <h2>Course</h2>
            <a href="#method">The method</a>
            <a href="#simulator">Simulators</a>
            <a href="#curriculum">Curriculum</a>
            <a href="#pricing">Pricing</a>
          </div>

          <div className={styles.col}>
            <h2>Project</h2>
            <a href="#whofor">Who it's for</a>
            <a href="#mentor">Mentor</a>
            <a href="#proof">What you can show</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className={styles.col}>
            <h2>Enrol</h2>
            <a href={COURSES_URL} target="_blank" rel="noopener noreferrer">See the courses</a>
            <a href="#curriculum">See what's inside</a>
            <Link href="/login">Sign in</Link>
            <a href="#top">Back to top</a>
          </div>
        </div>

        <div className={styles.arch} role="region"
             aria-label="Project architecture table, scrollable on small screens" tabIndex={0}>
          <table>
            <caption className="sr-only">Project architecture — what each level is used for</caption>
            <thead>
              <tr><th scope="col">Level</th><th scope="col">Name</th><th scope="col">Used for</th></tr>
            </thead>
            <tbody>
              {ARCHITECTURE.map((row) => (
                <tr key={row.level}>
                  <td>{row.level}</td><td>{row.name}</td><td>{row.used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.bottom}>
          <span>© 2026 Project Amazon PH · ₱2,999 / ₱5,999 / ₱9,999 · one-time via PayMongo · <b>no subscription</b></span>
          <span>Alt: Project Amazon PH. Amazon PPC skills and training for Filipino VAs.</span>
        </div>
      </div>
    </footer>
  );
}
```

## Admin shell

`src/app/admin/layout.tsx` + the navy sidebar (240px sticky, `--c-navy-2 → --c-navy-3` gradient).
Active item uses orange wash + 3px orange leading indicator. Section labels in `--c-shell-faint`.
The same sidebar collapses into a drawer on mobile via `MobileNavToggle`.

## Student dashboard shell

Lives inside `src/app/dashboard/page.tsx` directly (no separate layout file). `StudentSidebar`
renders on the left at desktop; mobile uses `MobileNavToggle`. Content area gets the standard
`--c-bg` canvas with `--content-px` side padding and `--content-pb` bottom padding.