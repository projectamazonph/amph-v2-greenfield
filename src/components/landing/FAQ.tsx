/**
 * FAQ — landing page section 7.
 * Real questions the audience asks, in plain language.
 * Uses native <details>/<summary> for collapse/expand without JS.
 */

import styles from "./FAQ.module.css";

interface QA {
  q: string;
  a: string;
}

const FAQ: ReadonlyArray<QA> = [
  {
    q: "Can I pay in installments?",
    a: "No. One-time only. If ₱2,999 is too much right now, this isn't the right time. We don't want you paying for something you can't finish.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes, on completion. We list it on your profile, and it's recognized in our hiring pipeline (we hire from this audience ourselves).",
  },
  {
    q: "Is there a refund?",
    a: "Yes, 7 days, no questions asked, if you've done less than 25% of the course. Past 25%, the content has been delivered; we don't refund.",
  },
  {
    q: "Do I need to be in the Philippines to take this?",
    a: "Yes. The course is built around the PH VA market: real ₱ rates, real client briefs, real workflow expectations. The lessons don't translate to other markets.",
  },
  {
    q: "What if I get stuck?",
    a: "Email us. We respond within 1 business day. Ultimate tier gets a faster channel and weekly live Q&A.",
  },
  {
    q: "Do you teach seller-side or agency-side?",
    a: "Agency-side. We teach the work VAs do for clients, not the work sellers do for their own products. If you want to launch your own Amazon product, this is the wrong course.",
  },
];

export function FAQSection() {
  return (
    <section className={styles.section} aria-labelledby="faq-heading">
      <div className={styles.inner}>
        <h2 id="faq-heading" className={styles.heading}>
          Common questions
        </h2>
        <div className={styles.list}>
          {FAQ.map((item) => (
            <details key={item.q} className={styles.item}>
              <summary className={styles.summary}>{item.q}</summary>
              <p className={styles.answer}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
