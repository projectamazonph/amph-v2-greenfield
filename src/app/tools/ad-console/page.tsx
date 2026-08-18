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
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { StudentShell } from "@/components/student/StudentShell";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const AD_CONSOLE_URL = "https://amazon-ad-console.vercel.app";

export default async function AdConsolePage() {
  return (
    <StudentShell>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Amazon Ad Console" }]} />

        <header className={styles.header}>
          <span className={styles.eyebrow}>Live account tool</span>
          <h1 className={styles.title}>Amazon Ad Console</h1>
          <p className={styles.brief}>
            Use your own Amazon Advertising account to review and manage live campaigns, bids, and
            keywords. This is not a practice simulator.
          </p>
        </header>

        <section className={styles.guide} aria-labelledby="guide-heading">
          <h2 id="guide-heading" className={styles.guideTitle}>
            Before you change anything
          </h2>
          <ol className={styles.guideList}>
            <li>
              Sign in inside the console with your own Amazon Advertising account. AMPH does not
              see or store your Amazon login or ad account data.
            </li>
            <li>
              Review the campaign, search terms, and spend before you change a bid, budget, or
              keyword.
            </li>
            <li>
              If you are unsure, test the decision in Bid Elevator or Campaign Builder first.
            </li>
            <li>
              Changes here affect real ad spend immediately. There is no simulator reset button.
            </li>
          </ol>
          <p className={styles.guideNote}>
            If the console is blank, open it directly in a new tab. Some external tools block
            embedded pages.
          </p>
        </section>

        <div className={styles.frameToolbar}>
          <a
            href={AD_CONSOLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.openLink}
          >
            <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
            Open in new tab
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
