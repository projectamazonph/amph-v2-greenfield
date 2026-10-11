/**
 * /help — LEARN-045: a lightweight help route.
 *
 * Public page, same StudentShell(requireAuth=false) pattern as
 * /faq and /courses: signed-out visitors get the public header,
 * signed-in students still see their sidebar. The support email
 * is read from the site settings with a fallback to
 * support@projectamazonph.online, the same fallback /maintenance
 * uses, so the page keeps working when the DB is unhealthy.
 *
 * Three sections, in this order:
 *   1. Common blockers, grouped by surface.
 *   2. Escalation boundaries, as a numbered vertical timeline
 *      (cheap path first, paid support last).
 *   3. Approved support path, an orange-accent card with the
 *      email, response window, and "what to include" checklist.
 *
 * The page does not promise real-time support, instant chat, or
 * 24/7 coverage. That promise is enforced in
 * __tests__/help-page.test.ts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { StudentShell } from "@/components/student/StudentShell";
import { buildContainer } from "@/composition/container";
import {
  HELP_BLOCKERS,
  HELP_ESCALATION,
  HELP_HERO,
  HELP_SUPPORT,
  type BlockerSurface,
} from "./helpContent";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Help | Project Amazon PH Academy",
  description:
    "If something is in your way on Project Amazon PH Academy, here are the common blockers, the escalation path, and the approved way to email support.",
};

const FALLBACK_CONTACT_EMAIL = "support@projectamazonph.online";

const SURFACE_LABELS: Record<BlockerSurface, string> = {
  account: "Account",
  lesson: "Lesson",
  worksheet: "Worksheet",
  simulator: "Simulator",
  quiz: "Quiz",
  payment: "Payment",
};

/**
 * Best-effort support email. Mirrors the readSupportEmail helper
 * in /maintenance. Any failure (no row, wrong shape, DB down)
 * resolves to the fallback so a help page whose whole job is
 * unblocking people never blocks on the DB.
 */
async function readSupportEmail(): Promise<string> {
  try {
    const container = buildContainer();
    const result = await container.getSetting.execute({
      key: "support_email",
      narrow: (value: unknown) =>
        typeof value === "string" && value.includes("@") ? value : null,
      defaultValue: FALLBACK_CONTACT_EMAIL,
    });
    return result.ok ? result.value : FALLBACK_CONTACT_EMAIL;
  } catch {
    return FALLBACK_CONTACT_EMAIL;
  }
}

export default async function HelpPage() {
  const contactEmail = await readSupportEmail();
  const whatToInclude = [
    HELP_SUPPORT.whatToInclude[0]?.replace(/your account/gi, "this account") ??
      HELP_SUPPORT.whatToInclude[0] ??
      "",
    ...HELP_SUPPORT.whatToInclude.slice(1),
  ];

  return (
    <StudentShell requireAuth={false}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <section className={styles.hero} aria-labelledby="help-hero-title">
          <span className={styles.eyebrow}>{HELP_HERO.eyebrow}</span>
          <h1 id="help-hero-title" className={styles.heroTitle}>
            {HELP_HERO.title}
          </h1>
          <p className={styles.heroSubtitle}>{HELP_HERO.subtitle}</p>
        </section>

        <section
          className={styles.blockers}
          aria-labelledby="help-blockers-title"
        >
          <header className={styles.sectionHead}>
            <span className={styles.sectionNumber}>01</span>
            <div className={styles.sectionHeadText}>
              <h2 id="help-blockers-title" className={styles.sectionTitle}>
                Common blockers
              </h2>
              <p className={styles.sectionSubtitle}>
                The cases I have seen most often, grouped by the part of the
                platform they live in. Pick the one that matches what you are
                seeing.
              </p>
            </div>
          </header>

          <ul className={styles.blockerGrid}>
            {HELP_BLOCKERS.map((blocker, index) => (
              <li key={blocker.label} className={styles.blockerCard}>
                <div className={styles.blockerCardTop}>
                  <span className={styles.blockerOrdinal}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.blockerSurface}>
                    {SURFACE_LABELS[blocker.surface]}
                  </span>
                </div>
                <h3 className={styles.blockerLabel}>{blocker.label}</h3>
                <p className={styles.blockerDescription}>
                  {blocker.description}
                </p>
                <p className={styles.blockerNextStep}>
                  <span className={styles.blockerNextStepLabel}>Try this:</span>{" "}
                  {blocker.nextStepHref ? (
                    <Link
                      href={blocker.nextStepHref}
                      className={styles.blockerLink}
                    >
                      {blocker.nextStep}
                    </Link>
                  ) : (
                    blocker.nextStep
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className={styles.escalation}
          aria-labelledby="help-escalation-title"
        >
          <header className={styles.sectionHead}>
            <span className={styles.sectionNumber}>02</span>
            <div className={styles.sectionHeadText}>
              <h2 id="help-escalation-title" className={styles.sectionTitle}>
                Escalation boundaries
              </h2>
              <p className={styles.sectionSubtitle}>
                Where to go first, second, and last. The order is the contract:
                try the cheapest path first, then the community, then paid
                support.
              </p>
            </div>
          </header>

          <ol className={styles.escalationList}>
            {HELP_ESCALATION.map((level) => (
              <li
                key={level.level}
                className={styles.escalationItem}
                data-level={level.level}
              >
                <div className={styles.escalationBadge}>
                  <span className={styles.escalationLevel}>
                    {String(level.level).padStart(2, "0")}
                  </span>
                  <span className={styles.escalationRibbon} aria-hidden="true" />
                </div>
                <div className={styles.escalationBody}>
                  <h3 className={styles.escalationLabel}>{level.label}</h3>
                  <p className={styles.escalationDescription}>
                    {level.description}
                  </p>
                  <p className={styles.escalationTurnaround}>
                    <span className={styles.escalationTurnaroundLabel}>
                      Turnaround:
                    </span>{" "}
                    {level.turnaround}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.support}
          aria-labelledby="help-support-title"
        >
          <header className={styles.sectionHead}>
            <span className={styles.sectionNumber}>03</span>
            <div className={styles.sectionHeadText}>
              <h2 id="help-support-title" className={styles.sectionTitle}>
                The approved support path
              </h2>
              <p className={styles.sectionSubtitle}>
                Email is the only support channel. There is no live chat, no
                24/7 line, and no support team. A clear message gets a faster
                reply than a short one.
              </p>
            </div>
          </header>

          <article className={styles.supportCard}>
            <header className={styles.supportCardHead}>
              <span className={styles.supportKicker}>Email support</span>
              <a
                className={styles.supportEmail}
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
              <p className={styles.supportResponseWindow}>
                <span className={styles.supportResponseWindowLabel}>
                  First reply:
                </span>{" "}
                {HELP_SUPPORT.responseWindow}
              </p>
              <p className={styles.supportDescription}>
                {HELP_SUPPORT.description}
              </p>
            </header>

            <div className={styles.supportCardBody}>
              <h3 className={styles.supportChecklistTitle}>
                What to include
              </h3>
              <ol className={styles.supportChecklist}>
                {whatToInclude.map((item) => (
                  <li key={item} className={styles.supportChecklistItem}>
                    {item}
                  </li>
                ))}
              </ol>

              <p className={styles.supportNote}>
                Mark the subject line{" "}
                <span className={styles.supportTag}>URGENT</span> only when
                your account is actually locked. Subject lines are read in
                order, before the body.
              </p>
            </div>
          </article>
        </section>
      </main>
    </StudentShell>
  );
}
