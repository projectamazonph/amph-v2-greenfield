/**
 * /maintenance — P1-08 (P4 PR-A) static 503 page.
 *
 * Served by the proxy (`src/proxy.ts`) whenever the kill switch
 * is engaged. Plain HTML so the page works without the DB, the
 * admin session, or any framework state.
 *
 * The page is a server component because that's the cheapest
 * path in the Next App Router — it runs through the same RSC
 * pipeline as every other page, but it does no data fetching.
 * The proxy's `NextResponse.rewrite` to this URL preserves the
 * 503 status code, so crawlers and clients see the correct
 * response code.
 */

import styles from "./page.module.css";

export const metadata = {
  title: "We'll be right back — Project Amazon PH Academy",
  robots: { index: false, follow: false },
};

const FALLBACK_CONTACT_EMAIL = "support@projectamazonph.online";

export default function MaintenancePage() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <p className={styles.kicker}>Maintenance in progress</p>
        <h1 className={styles.heading}>We'll be right back.</h1>
        <p className={styles.body}>
          Project Amazon PH Academy is briefly offline for scheduled maintenance.
          Your progress is safe. Please reload in a few minutes — most maintenance
          windows complete in under thirty minutes.
        </p>
        <p className={styles.body}>
          If you need urgent help during the window, email{" "}
          <a className={styles.link} href={`mailto:${FALLBACK_CONTACT_EMAIL}`}>
            {FALLBACK_CONTACT_EMAIL}
          </a>
          .
        </p>
        <p className={styles.signoff}>— The Project Amazon PH Academy team</p>
      </div>
    </main>
  );
}