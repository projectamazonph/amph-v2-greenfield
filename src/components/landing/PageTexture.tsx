import styles from "./PageTexture.module.css";

/**
 * Decorative simulator ambient layer. It stays outside the document flow and
 * never carries information needed to use the landing page.
 */
export function PageTexture() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <span className={[styles.utilityDot, styles.utilityDotTop].join(" ")} />
      <span className={[styles.utilityDot, styles.utilityDotBottom].join(" ")} />
      <span className={styles.utilityLine} />
    </div>
  );
}
