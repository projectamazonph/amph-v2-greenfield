/**
 * /tools/ad-console — embedded Amazon Ad Console.
 *
 * Unlike the 5 practice simulators (formative-only, synthetic data),
 * this embeds a real external campaign-management tool
 * (amazon-ad-console.vercel.app) that connects to a student's own
 * live Amazon Advertising account. Actions taken inside it are real
 * and immediate — there is no "practice mode" here, so the guide
 * copy on this page leads with that distinction rather than treating
 * it like another simulator.
 *
 * AMPH does not proxy, store, or see anything entered inside the
 * embedded console — it's a same-origin-isolated iframe to a
 * separate site. See src/proxy.ts for the frame-src CSP allowance
 * required for the embed to load at all.
 */

import Link from "next/link";
import { StudentShell } from "@/components/student/StudentShell";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const AD_CONSOLE_URL = "https://amazon-ad-console.vercel.app";

export default async function AdConsolePage() {
  return (
    <StudentShell>
      <main className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/tools">← Tools</Link>
          <span aria-hidden="true"> / </span>
          <span>Amazon Ad Console</span>
        </nav>

        <header className={styles.header}>
          <span className={styles.eyebrow}>External tool · Live account</span>
          <h1 className={styles.title}>Amazon Ad Console</h1>
          <p className={styles.brief}>
            A real campaign-management dashboard for your own Amazon Advertising account — not a
            practice simulator. Sign in with your Amazon Ads credentials inside the frame below to
            view and manage real Sponsored Products campaigns, bids, and keywords.
          </p>
        </header>

        <section className={styles.guide} aria-labelledby="guide-heading">
          <h2 id="guide-heading" className={styles.guideTitle}>
            How to use this
          </h2>
          <ol className={styles.guideList}>
            <li>
              Sign in inside the console below with your own Amazon Advertising account. AMPH does
              not see or store your Amazon login or ad account data — the console runs in an
              isolated frame, separate from this site.
            </li>
            <li>
              Open an existing campaign to review bids, search terms, and spend, or use the
              console&apos;s own campaign builder to set one up from scratch.
            </li>
            <li>
              Practice a change in the Bid Elevator or Campaign Builder simulator first if
              you&apos;re unsure — then apply the same logic here once you&apos;re confident.
            </li>
            <li>
              This is a production tool. Bid, budget, and keyword changes you make here affect real
              ad spend immediately and generally can&apos;t be undone — there&apos;s no reset button
              like the simulators have.
            </li>
          </ol>
          <p className={styles.guideNote}>
            If the console below appears blank or refuses to load, open it directly in a new tab
            instead — some external tools block being embedded inside another site&apos;s page.
          </p>
        </section>

        <div className={styles.frameToolbar}>
          <a
            href={AD_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openLink}
          >
            Open in new tab ↗
          </a>
        </div>

        <div className={styles.frameWrap}>
          {/*
            Scripts/forms/same-origin (scoped to the console's own origin,
            not ours) so the SPA and its login flow work; popups so an
            Amazon OAuth-style sign-in can open in a new window; top
            navigation only on user activation so the console can't
            silently redirect the whole tab out from under the student.
          */}
          <iframe
            className={styles.frame}
            src={AD_CONSOLE_URL}
            title="Amazon Ad Console"
            allow="clipboard-write"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </div>
      </main>
    </StudentShell>
  );
}
