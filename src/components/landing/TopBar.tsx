"use client";

import { useEffect, useState } from "react";
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
          <a href="#top" className={styles.brand} aria-label="Project Amazon PH home">
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
            <a
              href={loginLink.href}
              className={styles.loginLink}
              onClick={() => setMenuOpen(false)}
            >
              {loginLink.label}
            </a>
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
            <span className={styles.loc}>
              <i /> MNL
            </span>
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
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>
    </>
  );
}
