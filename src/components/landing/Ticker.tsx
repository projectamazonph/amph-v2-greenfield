import styles from "./Ticker.module.css";

const METRICS = [
  { label: "ACoS", value: "24.3% ▼" },
  { label: "TACoS", value: "11.8%" },
  { label: "CTR", value: "0.41%" },
  { label: "CPC", value: "$0.78" },
  { label: "CVR", value: "12.6%" },
  { label: "Impressions", value: "48,210" },
  { label: "Search terms triaged", value: "312" },
  { label: "Bids adjusted", value: "57" },
  { label: "Waste cut", value: "−18%", accent: true },
];

function TickerSet() {
  return (
    <span className={styles.set}>
      {METRICS.map((m) => (
        <span key={m.label}>
          {m.label} {m.accent ? <em>{m.value}</em> : <b>{m.value}</b>}
        </span>
      ))}
    </span>
  );
}

/**
 * Illustrative-metrics marquee, purely decorative (aria-hidden). CSS-only
 * animation, no client JS needed to pause on hover.
 */
export function Ticker() {
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerIn}>
        <span className={styles.tag}>Sample metrics</span>
        <div className={styles.track}>
          <TickerSet />
          <TickerSet />
        </div>
      </div>
    </div>
  );
}
