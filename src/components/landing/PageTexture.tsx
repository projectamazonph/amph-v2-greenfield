import styles from "./PageTexture.module.css";

function RegisterMark({ size, className }: { size: number; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <path d={`M${size / 2} 2v${size - 4}M2 ${size / 2}h${size - 4}`} />
        <circle cx={size / 2} cy={size / 2} r={size / 5} />
      </svg>
    </div>
  );
}

/**
 * Purely decorative background: a faint dot-grid, a subtle noise wash, and
 * two drifting "register mark" icons, echoing the printer's-waybill motif
 * the rest of the page draws on. Fixed to the viewport, sits at z-index 0
 * behind the .contentLayer wrapper in page.tsx.
 */
export function PageTexture() {
  return (
    <div aria-hidden="true">
      <div className={styles.grid} />
      <div className={styles.noise} />
      <RegisterMark size={46} className={[styles.reg, styles.r1].join(" ")} />
      <RegisterMark size={38} className={[styles.reg, styles.r2].join(" ")} />
    </div>
  );
}
