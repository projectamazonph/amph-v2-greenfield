/**
 * Hero — landing page section 1.
 * Above-the-fold: 5-second answer to "what is this / who for / how much".
 * No hero image, no video. Per design brief: "the design is dense."
 */

import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-headline">
      <div className={styles.inner}>
        <span className={styles.eyebrow}>
          Training — Philippines — Amazon Ads
        </span>
        <h1 id="hero-headline" className={styles.headline}>
          The Amazon ads training built for Filipino VAs who want to charge
          ₱60k+/month.
        </h1>
        <p className={styles.subhead}>
          Three courses, practice tools, certificates recognized in
          our hiring pipeline. One-time payment via PayMongo. No subscription.
        </p>
        <div className={styles.ctaRow}>
          <a href="#pricing" className={styles.ctaPrimary}>
            See the courses
          </a>
          <a href="/login" className={styles.ctaSecondary}>
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}
