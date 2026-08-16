"use client";

import { useEffect, useRef, useState } from "react";
import { PUBLIC_CURRICULUM_CLAIMS } from "@/domain/curriculum/PublicCurriculumClaims";
import styles from "./StatsStrip.module.css";

interface Stat {
  to: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub: string;
}

const STATS: Stat[] = [
  {
    to: PUBLIC_CURRICULUM_CLAIMS.modules.length,
    label: "Modules",
    sub: "Foundations + Mastery, in order",
  },
  {
    to: Object.keys(PUBLIC_CURRICULUM_CLAIMS.simulators).length,
    label: "Practice tools",
    sub: "Formative simulator practice",
  },
  {
    to: Object.values(PUBLIC_CURRICULUM_CLAIMS.courses).reduce(
      (total, course) => total + course.plannedMinutes,
      0,
    ),
    suffix: "m",
    label: "Planned lessons",
    sub: "Source estimate; practice adds time",
  },
  { to: 2500, prefix: "₱", label: "Specialist lift", sub: "What specialists charge over juniors" },
];

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplay(Math.round(to).toLocaleString("en-US"));
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const duration = 1200;
          let start: number | null = null;
          function step(ts: number) {
            if (start === null) start = ts;
            const p = Math.min(1, (ts - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(to * eased).toLocaleString("en-US"));
            if (p < 1) raf = requestAnimationFrame(step);
          }
          raf = requestAnimationFrame(step);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return <span ref={ref}>{display}</span>;
}

export function StatsStrip() {
  return (
    <section className={styles.stats} aria-label="Program at a glance">
      <div className={styles.statsIn}>
        {STATS.map((stat) => (
          <div className={styles.stat} key={stat.label}>
            <div className={styles.value}>
              {stat.prefix ? <span className={styles.affix}>{stat.prefix}</span> : null}
              <CountUp to={stat.to} />
              {stat.suffix ? <span className={styles.suffix}>{stat.suffix}</span> : null}
            </div>
            <div className={styles.key}>{stat.label}</div>
            <div className={styles.sub}>{stat.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
