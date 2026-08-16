"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./BidElevator.module.css";
import {
  AOV,
  SEARCH_TERM_ROWS,
  type TermState,
  ownAcos,
  computeBidElevator,
  type AggregateMetrics,
  clamp,
  lerp,
  niceStep,
  formatInt,
  formatUsd,
} from "./bidElevator.logic";

const DEFAULTS = { budget: 120, bid: 0.85, targetPct: 30 };

// Canvas 2D can't read CSS custom properties directly, so these are the
// fallback values for --ink-900 / --accent / --ink-500 / --border in
// globals.css; the actual tokens are read at runtime in the resize effect
// below (same approach as the --font-mono lookup) so a token change there
// doesn't silently drift from what the canvas draws.
const FALLBACK_COLORS = { ink: "#171717", orange: "#FF6B35", muted: "#737373", border: "#E5E5E0" };

const STATE_LABEL: Record<TermState, string> = { auto: "Auto", exact: "Exact", neg: "Neg" };
const STATE_ORDER: readonly TermState[] = ["auto", "exact", "neg"];

function defaultStates(): Record<string, TermState> {
  return Object.fromEntries(SEARCH_TERM_ROWS.map((r) => [r.id, "auto" as TermState]));
}

export function BidElevator() {
  const [budget, setBudget] = useState(DEFAULTS.budget);
  const [bid, setBid] = useState(DEFAULTS.bid);
  const [targetPct, setTargetPct] = useState(DEFAULTS.targetPct);
  const [states, setStates] = useState<Record<string, TermState>>(defaultStates);

  const targetRef = useRef<{ metrics: AggregateMetrics; tgt: number }>({
    metrics: computeBidElevator(
      SEARCH_TERM_ROWS,
      defaultStates(),
      DEFAULTS.budget,
      DEFAULTS.bid,
      DEFAULTS.targetPct,
    ),
    tgt: DEFAULTS.targetPct,
  });
  const dispRef = useRef({ imp: 0, clk: 0, spend: 0, ord: 0, sales: 0, ctr: 0, cvr: 0, acos: 0 });
  const dispBarsRef = useRef<Record<string, { spend: number; sales: number }>>({});
  const sizeRef = useRef({ cw: 0, ch: 0 });
  const monoFontRef = useRef("monospace");
  const colorsRef = useRef(FALLBACK_COLORS);

  const kImpRef = useRef<HTMLDivElement>(null);
  const kClkRef = useRef<HTMLDivElement>(null);
  const kCtrRef = useRef<HTMLDivElement>(null);
  const kSpendRef = useRef<HTMLDivElement>(null);
  const kOrdRef = useRef<HTMLDivElement>(null);
  const kCvrRef = useRef<HTMLDivElement>(null);
  const kSalesRef = useRef<HTMLDivElement>(null);
  const kAcosRef = useRef<HTMLDivElement>(null);
  const kAcosBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Recompute the target metrics whenever an input changes. The animation
  // loop below reads this ref every frame, so it never sees a stale value.
  useEffect(() => {
    targetRef.current = {
      metrics: computeBidElevator(SEARCH_TERM_ROWS, states, budget, bid, targetPct),
      tgt: targetPct,
    };
  }, [budget, bid, targetPct, states]);

  const drawChart = useCallback((metrics: AggregateMetrics, tgt: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const { cw, ch } = sizeRef.current;
    if (!canvas || !ctx || !cw) return;
    const mono = monoFontRef.current;
    const { ink, orange, muted, border } = colorsRef.current;

    ctx.clearRect(0, 0, cw, ch);
    const view = metrics.view;
    const padL = 42;
    const padR = 12;
    const padT = 14;
    const padB = 34;
    const plotW = cw - padL - padR;
    const plotH = ch - padT - padB;
    let maxV = 0;
    for (const v of view) maxV = Math.max(maxV, v.spend, v.sales);
    const axisMax = niceStep(maxV * 1.12) || 10;
    const y = (v: number) => padT + plotH - (clamp(v, 0, axisMax) / axisMax) * plotH;

    ctx.font = `9px ${mono}`;
    ctx.textBaseline = "middle";
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const val = (axisMax * i) / ticks;
      const gy = y(val);
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(cw - padR, gy);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(`$${Math.round(val)}`, padL - 7, gy);
    }

    if (view.length === 0) {
      ctx.fillStyle = muted;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `11px ${mono}`;
      ctx.fillText("All terms negated. Set one back to Auto or Exact to model it.", cw / 2, ch / 2);
      return;
    }

    const n = view.length;
    const slot = plotW / n;
    const bw = Math.min(20, slot * 0.3);
    ctx.textBaseline = "alphabetic";
    view.forEach((v, idx) => {
      const bars = dispBarsRef.current;
      const db = bars[v.id] ?? { spend: 0, sales: 0 };
      bars[v.id] = db;
      db.spend = lerp(db.spend, v.spend, 0.18);
      db.sales = lerp(db.sales, v.sales, 0.18);
      const cx = padL + slot * idx + slot / 2;
      const xS = cx - bw - 2;
      const xA = cx + 2;
      const hS = (db.spend / axisMax) * plotH;
      ctx.fillStyle = ink;
      ctx.fillRect(xS, padT + plotH - hS, bw, hS);
      const hA = (db.sales / axisMax) * plotH;
      ctx.fillStyle = orange;
      ctx.fillRect(xA, padT + plotH - hA, bw, hA);

      const be = v.breakEven;
      const clamped = be > axisMax;
      const hy = y(clamped ? axisMax : be);
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = orange;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - slot * 0.34, hy);
      ctx.lineTo(cx + slot * 0.34, hy);
      ctx.stroke();
      ctx.restore();
      if (clamped) {
        ctx.fillStyle = orange;
        ctx.font = `9px ${mono}`;
        ctx.textAlign = "center";
        ctx.fillText("▲", cx, hy - 4);
      }

      ctx.font = `9px ${mono}`;
      ctx.textAlign = "center";
      ctx.fillStyle = v.acos !== null && v.acos <= tgt ? ink : orange;
      ctx.fillText(
        v.acos !== null ? `${v.acos.toFixed(0)}%` : "—",
        cx,
        padT - 2 < 10 ? 10 : padT - 2,
      );

      ctx.fillStyle = muted;
      ctx.font = `8.5px ${mono}`;
      const label = v.term.length > 11 ? `${v.term.slice(0, 10)}…` : v.term;
      ctx.fillText(label, cx, ch - 12);
    });
  }, []);

  const writeKpis = useCallback(() => {
    const disp = dispRef.current;
    const { metrics } = targetRef.current;
    if (kImpRef.current) kImpRef.current.textContent = formatInt(disp.imp);
    if (kClkRef.current) kClkRef.current.textContent = formatInt(disp.clk);
    if (kSpendRef.current) kSpendRef.current.textContent = formatUsd(disp.spend);
    if (kOrdRef.current) kOrdRef.current.textContent = formatInt(disp.ord);
    if (kSalesRef.current) kSalesRef.current.textContent = formatUsd(disp.sales);
    if (kCtrRef.current)
      kCtrRef.current.textContent = `CTR ${disp.ctr > 0 ? `${disp.ctr.toFixed(2)}%` : "—"}`;
    if (kCvrRef.current)
      kCvrRef.current.textContent = `CVR ${disp.cvr > 0 ? `${disp.cvr.toFixed(1)}%` : "—"}`;
    if (kAcosRef.current) {
      kAcosRef.current.textContent = metrics.acos === null ? "—" : `${disp.acos.toFixed(1)}%`;
    }
    if (kAcosBoxRef.current) {
      const ok = metrics.acos !== null && disp.acos <= targetRef.current.tgt;
      kAcosBoxRef.current.classList.toggle(styles.ok!, ok);
    }
  }, []);

  // Resize the canvas backing store to match its CSS box (device-pixel aware).
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { cw, ch };
    }
    const rootStyle = getComputedStyle(document.documentElement);
    const monoVar = rootStyle.getPropertyValue("--font-mono").trim();
    if (monoVar) monoFontRef.current = monoVar;
    const ink = rootStyle.getPropertyValue("--ink-900").trim();
    const orange = rootStyle.getPropertyValue("--accent").trim();
    const muted = rootStyle.getPropertyValue("--ink-500").trim();
    const border = rootStyle.getPropertyValue("--border").trim();
    colorsRef.current = {
      ink: ink || FALLBACK_COLORS.ink,
      orange: orange || FALLBACK_COLORS.orange,
      muted: muted || FALLBACK_COLORS.muted,
      border: border || FALLBACK_COLORS.border,
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // The interpolation + redraw loop runs continuously so KPI numbers and
  // bars ease toward whatever the sliders currently target. Pause the
  // loop while the canvas is offscreen so the page does not pay for a
  // 60fps draw it cannot show. Resumes on the next visible observation.
  // Falls back to a continuous loop when IntersectionObserver is not
  // available (older browsers, tests, SSR) so the demo still animates.
  useEffect(() => {
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function frame() {
      raf = 0;
      const t = reduced ? 1 : 0.16;
      const { metrics } = targetRef.current;
      const disp = dispRef.current;
      disp.imp = lerp(disp.imp, metrics.imp, t);
      disp.clk = lerp(disp.clk, metrics.clk, t);
      disp.spend = lerp(disp.spend, metrics.spend, t);
      disp.ord = lerp(disp.ord, metrics.ord, t);
      disp.sales = lerp(disp.sales, metrics.sales, t);
      disp.ctr = lerp(disp.ctr, metrics.ctr, t);
      disp.cvr = lerp(disp.cvr, metrics.cvr, t);
      disp.acos = lerp(disp.acos, metrics.acos === null ? disp.acos : metrics.acos, t);
      writeKpis();
      drawChart(metrics, targetRef.current.tgt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf === 0) raf = requestAnimationFrame(frame);
    }

    function stop() {
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    if (typeof IntersectionObserver === "undefined") {
      start();
      return stop;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      start();
      return stop;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.01 },
    );
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [writeKpis, drawChart]);

  function setRowState(id: string, s: TermState) {
    setStates((prev) => ({ ...prev, [id]: s }));
  }

  function handleReset() {
    setBudget(DEFAULTS.budget);
    setBid(DEFAULTS.bid);
    setTargetPct(DEFAULTS.targetPct);
    setStates(defaultStates());
  }

  return (
    <div className={styles.sim}>
      <div className={styles.bar}>
        <span className={styles.barTitle}>
          <i>●</i> Bid Elevator · public preview
        </span>
        <span className={styles.barModel}>
          MODEL · illustrative · updates live · not a forecast
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.controls}>
          <div className={styles.ctrl}>
            <div className={styles.ctrlHead}>
              <label htmlFor="bidElevatorBudget">Daily budget</label>
              <span className={styles.val}>${budget}</span>
            </div>
            <input
              id="bidElevatorBudget"
              type="range"
              min={20}
              max={400}
              step={5}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className={styles.range}
            />
            <div className={styles.scale}>
              <span>$20</span>
              <span>$400</span>
            </div>
          </div>

          <div className={styles.ctrl}>
            <div className={styles.ctrlHead}>
              <label htmlFor="bidElevatorBid">Default bid</label>
              <span className={styles.val}>${bid.toFixed(2)}</span>
            </div>
            <input
              id="bidElevatorBid"
              type="range"
              min={0.3}
              max={2.0}
              step={0.05}
              value={bid}
              onChange={(e) => setBid(Number(e.target.value))}
              className={styles.range}
            />
            <div className={styles.scale}>
              <span>$0.30</span>
              <span>$2.00</span>
            </div>
          </div>

          <div className={styles.ctrl}>
            <div className={styles.ctrlHead}>
              <label htmlFor="bidElevatorTarget">Target ACoS</label>
              <span className={styles.val}>
                {targetPct}
                <small>%</small>
              </span>
            </div>
            <input
              id="bidElevatorTarget"
              type="range"
              min={10}
              max={60}
              step={1}
              value={targetPct}
              onChange={(e) => setTargetPct(Number(e.target.value))}
              className={styles.range}
            />
            <div className={styles.scale}>
              <span>10%</span>
              <span>60%</span>
            </div>
          </div>

          <button type="button" className={styles.resetBtn} onClick={handleReset}>
            ↺ Reset worksheet
          </button>
        </div>

        <div className={styles.main}>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <small>Impressions</small>
              <div className={styles.kpiValue} ref={kImpRef}>
                0
              </div>
              <div className={styles.kpiVs}>auction wins</div>
            </div>
            <div className={styles.kpi}>
              <small>Clicks</small>
              <div className={styles.kpiValue} ref={kClkRef}>
                0
              </div>
              <div className={styles.kpiVs} ref={kCtrRef}>
                CTR —
              </div>
            </div>
            <div className={styles.kpi}>
              <small>Spend</small>
              <div className={styles.kpiValue} ref={kSpendRef}>
                $0
              </div>
              <div className={styles.kpiVs}>of budget</div>
            </div>
            <div className={styles.kpi}>
              <small>Orders</small>
              <div className={styles.kpiValue} ref={kOrdRef}>
                0
              </div>
              <div className={styles.kpiVs} ref={kCvrRef}>
                CVR —
              </div>
            </div>
            <div className={styles.kpi}>
              <small>Sales</small>
              <div className={styles.kpiValue} ref={kSalesRef}>
                $0
              </div>
              <div className={styles.kpiVs}>@ ${AOV} AOV</div>
            </div>
            <div className={[styles.kpi, styles.acos].join(" ")} ref={kAcosBoxRef}>
              <small>ACoS</small>
              <div className={styles.kpiValue} ref={kAcosRef}>
                —
              </div>
              <div className={styles.kpiVs}>
                target <b>{targetPct}%</b>
              </div>
            </div>
          </div>

          <div className={styles.chartBox}>
            <div className={styles.chartLeg}>
              <span className={styles.legSpend}>
                <i /> Spend
              </span>
              <span className={styles.legSales}>
                <i /> Sales
              </span>
              <span className={styles.legHurdle}>
                <i /> Break-even hurdle @ target
              </span>
            </div>
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>

          <div className={styles.harvest}>
            <h3>
              Search-term harvest: <b>promote winners, cut the waste</b>
            </h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                {/* M-R30 fix: <caption className="sr-only"> provides WCAG 1.3.1
                    accessible name; scope="col" on every header associates cells
                    with their column header for screen readers. */}
                <caption className="sr-only">Search-term harvest — promote winners, cut the waste</caption>
                <thead>
                  <tr>
                    <th scope="col">Search term</th>
                    <th scope="col">Clk</th>
                    <th scope="col">Spend</th>
                    <th scope="col">Sales</th>
                    <th scope="col">ACoS</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {SEARCH_TERM_ROWS.map((row) => {
                    const state = states[row.id];
                    const acos = ownAcos(row);
                    return (
                      <tr key={row.id} className={state === "neg" ? styles.rowNeg : ""}>
                        <td>{row.term}</td>
                        <td>{row.clk}</td>
                        <td>${Math.round(row.clk * row.cpc)}</td>
                        <td>${Math.round(row.clk * row.cvr * AOV)}</td>
                        <td
                          className={[styles.acosCell, acos > 30 ? styles.bad : styles.good].join(
                            " ",
                          )}
                        >
                          {acos.toFixed(0)}%
                        </td>
                        <td>
                          <span className={styles.seg}>
                            {STATE_ORDER.map((s) => (
                              <button
                                key={s}
                                type="button"
                                className={state === s ? styles.on : ""}
                                data-state={s}
                                aria-pressed={state === s}
                                onClick={() => setRowState(row.id, s)}
                              >
                                {STATE_LABEL[s]}
                              </button>
                            ))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
