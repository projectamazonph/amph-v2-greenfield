import React from "react";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./Proof.module.css";

export function Proof() {
  return (
    <section className={shared.sec} id="proof">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§07 / WHAT YOU CAN SHOW</span>
            <h2 className={shared.secTitle}>
              A certificate that opens doors, not one that sits idle.
            </h2>
          </div>
          <p className={shared.secLede}>
            On completion you get a certificate listed on your profile and{" "}
            <b>recognized in our hiring pipeline</b>, plus the artefacts below: real, reviewable
            work a hiring manager or client can open and judge for themselves.
          </p>
        </div>

        <Reveal className={styles.grid}>
          <article className={styles.card}>
            <span className={styles.fig}>ARTEFACT 01</span>
            <h3>A campaign audit</h3>
            <p>
              A structured read of a campaign&rsquo;s health, with the issues ranked by impact and
              the fix written next to each.
            </p>
            <div className={styles.mini}>
              {/* S7 fix: use CSS custom properties instead of raw hex for design token alignment */}
              <svg viewBox="0 0 200 54" preserveAspectRatio="none" fill="none" aria-hidden="true"
                style={{
                  "--bar-light": "var(--border)",
                  "--bar-dark": "var(--ink-900)",
                  "--bar-accent": "var(--accent)",
                  "--bar-mid": "var(--ink-500)",
                } as React.CSSProperties}>
                <line x1="0" y1="44" x2="200" y2="44" stroke="var(--bar-light)" />
                <rect x="8" y="20" width="14" height="24" fill="var(--bar-dark)" />
                <rect x="34" y="10" width="14" height="34" fill="var(--bar-accent)" />
                <rect x="60" y="28" width="14" height="16" fill="var(--bar-dark)" />
                <rect x="86" y="6" width="14" height="38" fill="var(--bar-accent)" />
                <rect x="112" y="32" width="14" height="12" fill="var(--bar-mid)" />
                <rect x="138" y="16" width="14" height="28" fill="var(--bar-dark)" />
                <rect x="164" y="24" width="14" height="20" fill="var(--bar-accent)" />
              </svg>
            </div>
          </article>

          <article className={styles.card}>
            <span className={styles.fig}>ARTEFACT 02</span>
            <h3>A triaged search-term report</h3>
            <p>
              A harvested, pruned term list: exact matches locked, negatives justified, waste
              explained line by line.
            </p>
            <div className={styles.mini}>
              <svg
                viewBox="0 0 200 54"
                preserveAspectRatio="none"
                fill="none"
                strokeWidth="2"
                aria-hidden="true"
                style={{
                  "--bar-light": "var(--border)",
                  "--bar-accent": "var(--accent)",
                  "--bar-mid": "var(--ink-500)",
                } as React.CSSProperties}
              >
                <line x1="6" y1="12" x2="150" y2="12" stroke="var(--bar-light)" />
                <line x1="6" y1="24" x2="120" y2="24" stroke="var(--bar-light)" />
                <line x1="6" y1="36" x2="170" y2="36" stroke="var(--bar-light)" />
                <line x1="6" y1="48" x2="96" y2="48" stroke="var(--bar-light)" />
                <path d="M176 10 l4 4 l8 -8" stroke="var(--bar-accent)" />
                <path d="M176 34 l4 4 l8 -8" stroke="var(--bar-accent)" />
                <path d="M150 22 l8 8 M158 22 l-8 8" stroke="var(--bar-mid)" />
              </svg>
            </div>
          </article>

          <article className={styles.card}>
            <span className={styles.fig}>ARTEFACT 03</span>
            <h3>A bid log with rationale</h3>
            <p>
              Every bid move you made, the data you saw, and the reason: the paper trail a client
              trusts more than a result.
            </p>
            <div className={styles.mini}>
              <svg viewBox="0 0 200 54" preserveAspectRatio="none" fill="none" aria-hidden="true"
                style={{
                  "--bar-light": "var(--border)",
                  "--bar-dark": "var(--ink-900)",
                  "--bar-accent": "var(--accent)",
                } as React.CSSProperties}>
                <polyline
                  points="6,40 40,30 74,34 108,18 142,22 176,8"
                  stroke="var(--bar-accent)"
                  strokeWidth="2"
                  fill="none"
                />
                <circle cx="108" cy="18" r="3" fill="var(--bar-dark)" />
                <circle cx="176" cy="8" r="3" fill="var(--bar-dark)" />
                <line x1="6" y1="48" x2="194" y2="48" stroke="var(--bar-light)" />
              </svg>
            </div>
          </article>

          <p className={styles.note}>
            <b>Honesty note:</b> verified student outcomes, when published, come only from the
            approved proof library with consent. We&rsquo;d rather show you the work you&rsquo;ll
            make than invent a result we can&rsquo;t stand behind.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
