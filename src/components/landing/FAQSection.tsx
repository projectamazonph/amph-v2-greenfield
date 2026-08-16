import Link from "next/link";
import { Reveal } from "./Reveal";
import shared from "./shared.module.css";
import styles from "./FAQSection.module.css";

interface QA {
  q: string;
  a: React.ReactNode;
}

const FAQ: readonly QA[] = [
  {
    q: "Can I pay in installments?",
    a: "No. One-time only. If ₱2,999 is too much right now, this isn't the right time. We don't want you paying for something you can't finish.",
  },
  {
    q: "Do I get a certificate?",
    a: (
      <>
        Yes, on completion. We list it on your profile, and it&rsquo;s{" "}
        <span className={styles.tl}>recognized by our hiring team</span>. We hire from this
        audience ourselves.
      </>
    ),
  },
  {
    q: "Is there a refund?",
    a: "Yes, 7 days, no questions asked, if you've done less than 25% of the course. Past 25%, the content has been delivered, so we don't refund.",
  },
  {
    q: "Do I need to be in the Philippines to take this?",
    a: "Yes. The course is built around the PH VA market: real ₱ rates, real client briefs, real workflow expectations. The lessons don't translate cleanly to other markets.",
  },
  {
    q: "What if I get stuck?",
    a: "Email us. We respond within 1 business day. The Ultimate tier gets a faster channel and weekly live Q&A with Ryan.",
  },
  {
    q: "Do you teach seller-side or agency-side?",
    a: (
      <>
        Agency-side. We teach the work VAs do <em>for clients</em>, not the work sellers do for
        their own products. If you want to launch your own Amazon product, this is the wrong course.
      </>
    ),
  },
];

export function FAQSection() {
  return (
    <section className={shared.sec} id="faq">
      <div className={shared.wrap}>
        <div className={shared.secHead}>
          <div className={shared.stickyCol}>
            <span className={shared.secNum}>§08 / QUESTIONS</span>
            <h2 className={shared.secTitle}>Plain answers.</h2>
          </div>
          <p className={shared.secLede}>
            The questions we hear most from VAs weighing the jump into Amazon ads.{" "}
            <span className={styles.tl}>Walang shortcut, may process.</span>
          </p>
        </div>

        <Reveal className={styles.list}>
          {FAQ.map((item) => (
            <details key={item.q} className={styles.item}>
              <summary className={styles.summary}>
                {item.q}
                <span className={styles.icon} aria-hidden="true" />
              </summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </Reveal>

        <p className={styles.moreLink}>
          Want the longer, harder answers, including what I still haven&rsquo;t fixed?{" "}
          <Link href="/faq">Read the full FAQ</Link>
        </p>
      </div>
    </section>
  );
}
