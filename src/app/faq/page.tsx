/**
 * /faq — the long-form, skeptical-buyer FAQ.
 *
 * This is deliberately separate from the short accordion at /#faq
 * (src/components/landing/FAQSection.tsx). That one answers the six
 * questions people ask most before checkout. This one is Ryan's own
 * answer to the harder question underneath all of those: "should I
 * trust this platform at all." Written in first person, on purpose.
 *
 * Public page, same StudentShell(requireAuth=false) pattern as
 * /courses: signed-out visitors get the public header, signed-in
 * students still see their sidebar.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { StudentShell } from "@/components/student/StudentShell";
import { FAQ_ITEMS } from "./faqContent";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "FAQ | Project Amazon PH Academy",
  description:
    "Ten honest questions to ask before you pay for Project Amazon PH Academy, answered plainly, including what still isn't finished.",
};

export default function FaqPage() {
  return (
    <StudentShell requireAuth={false}>
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <section className={styles.hero}>
          <span className={styles.eyebrow}>Before you pay</span>
          <h1 className={styles.heroTitle}>
            10 questions I&rsquo;d ask before paying for Project Amazon PH Academy
          </h1>
          <p className={styles.heroSubtitle}>
            I&rsquo;m Ryan. I built this platform. Here are the questions a skeptical VA should ask
            before handing over ₱2,999, answered the way I&rsquo;d answer them to a friend,
            including the parts I haven&rsquo;t finished yet.
          </p>
        </section>

        <section className={styles.list}>
          {FAQ_ITEMS.map((item) => (
            <article key={item.n} className={styles.item} id={`q${item.n}`}>
              <div className={styles.itemHead}>
                <span className={styles.itemNumber}>{String(item.n).padStart(2, "0")}</span>
                <h2 className={styles.itemQuestion}>{item.q}</h2>
              </div>

              <div className={styles.itemBody}>
                {item.a.map((paragraph, i) => (
                  <p key={i} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}

                {(item.fixed || item.open) && (
                  <div className={styles.status}>
                    {item.fixed && (
                      <p className={styles.statusLine}>
                        <span className={styles.statusLabel}>What I&rsquo;ve fixed:</span>{" "}
                        {item.fixed}
                      </p>
                    )}
                    {item.open && (
                      <p className={styles.statusLine}>
                        <span className={`${styles.statusLabel} ${styles.statusLabelOpen}`}>
                          What I still need to fix:
                        </span>{" "}
                        {item.open}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.position}>
          <h2 className={styles.positionTitle}>My honest position</h2>
          <p className={styles.paragraph}>
            Project Amazon PH Academy is not a shortcut, a job guarantee, or a perfect replacement
            for real account experience.
          </p>
          <p className={styles.paragraph}>
            It&rsquo;s a training environment where you learn the concepts, practice the decisions,
            get told plainly when you&rsquo;re wrong, and build real confidence before you&rsquo;re
            responsible for a client&rsquo;s advertising budget. The list above is dated on purpose.
            When something on it gets fixed, this page changes, not just the product.
          </p>
          <div className={styles.positionActions}>
            <Link href="/courses" className={styles.positionLink}>
              See the courses
            </Link>
            <Link href="/tools" className={styles.positionLinkGhost}>
              Try a simulator
            </Link>
          </div>
        </section>
      </main>
    </StudentShell>
  );
}
