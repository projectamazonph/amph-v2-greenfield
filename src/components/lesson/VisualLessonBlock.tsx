"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./VisualLessonBlock.module.css";

type VisualKind =
  | "diagnostic-map"
  | "metric-matrix"
  | "worked-example"
  | "decision-tree"
  | "pattern-board"
  | "practice-workbench"
  | "recommendation-builder";

type Metric = {
  label: string;
  family: "traffic" | "conversion" | "economics";
  question: string;
  formula: string;
  lever: string;
};

type CaseData = {
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  adSales: number;
  totalSales: number;
  price: number;
  targetAcos?: number;
};

type DecisionStep = {
  number: number;
  title: string;
  question: string;
  evidence: string;
  action: string;
};

type Pattern = {
  signal: string;
  firstCheck: string;
  lever: string;
  avoid: string;
};

type VisualData = {
  metrics?: Metric[];
  case?: CaseData;
  steps?: DecisionStep[];
  patterns?: Pattern[];
  prompt?: string;
  answer?: string;
  sentence?: string;
};

export interface VisualLessonBlockProps {
  id: string;
  kind: VisualKind;
  title: string;
  body: string;
}

function useRevealOnce() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined" || !ref.current) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

function readData(body: string): VisualData {
  try {
    return JSON.parse(body) as VisualData;
  } catch {
    return {};
  }
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number) {
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

function VisualShell({ id, title, eyebrow, children }: { id: string; title: string; eyebrow: string; children: ReactNode }) {
  const { ref, revealed } = useRevealOnce();
  return (
    <section ref={ref} id={id} className={`${styles.visual} ${revealed ? styles.revealed : ""}`} aria-labelledby={`${id}-title`}>
      <div className={styles.visualHeader}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h3 id={`${id}-title`} className={styles.visualTitle}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DiagnosticMap({ id, title }: { id: string; title: string }) {
  const stages = [
    { label: "Impression", detail: "Did Amazon show the ad?", metric: "Reach", tone: "orange" },
    { label: "Click", detail: "Did the result earn attention?", metric: "CTR / CPC", tone: "blue" },
    { label: "Order", detail: "Did the visit convert?", metric: "CVR", tone: "green" },
    { label: "Sale", detail: "Did the economics work?", metric: "ACoS / ROAS / TACoS", tone: "purple" },
  ];
  return (
    <VisualShell id={id} title={title} eyebrow="Diagnostic map">
      <div className={styles.mapLegend} aria-label="Metric groups">
        <span><i className={`${styles.legendDot} ${styles.orange}`} /> Traffic</span>
        <span><i className={`${styles.legendDot} ${styles.green}`} /> Conversion</span>
        <span><i className={`${styles.legendDot} ${styles.purple}`} /> Economics</span>
      </div>
      <ol className={styles.path}>
        {stages.map((stage, index) => (
          <li key={stage.label} className={`${styles.pathStage} ${styles[`tone-${stage.tone}`]}`}>
            <div className={styles.stageIndex}>{index + 1}</div>
            <div className={styles.stageCopy}>
              <strong>{stage.label}</strong>
              <span>{stage.detail}</span>
              <em>{stage.metric}</em>
            </div>
            {index < stages.length - 1 && <span className={styles.pathArrow} aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
      <p className={styles.visualTakeaway}><strong>Operating rule:</strong> locate the broken handoff before choosing the lever.</p>
    </VisualShell>
  );
}

function MetricMatrix({ id, title, metrics }: { id: string; title: string; metrics: Metric[] }) {
  return (
    <VisualShell id={id} title={title} eyebrow="Metric matrix">
      <div className={styles.metricGrid}>
        {metrics.map((metric) => (
          <article key={metric.label} className={`${styles.metricTile} ${styles[`family-${metric.family}`]}`}>
            <div className={styles.metricTileTop}>
              <span className={styles.metricLabel}>{metric.label}</span>
              <span className={styles.metricFamily}>{metric.family}</span>
            </div>
            <p className={styles.metricQuestion}>{metric.question}</p>
            <code>{metric.formula}</code>
            <p className={styles.metricLever}><span>First lever:</span> {metric.lever}</p>
          </article>
        ))}
      </div>
      <table className={styles.dataTable}>
        <caption>Use the question column before touching the bid</caption>
        <thead><tr><th>Metric</th><th>Question</th><th>First investigation</th></tr></thead>
        <tbody>{metrics.map((metric) => <tr key={`${metric.label}-row`}><th scope="row">{metric.label}</th><td>{metric.question}</td><td>{metric.lever}</td></tr>)}</tbody>
      </table>
    </VisualShell>
  );
}

function WorkedExample({ id, title, data }: { id: string; title: string; data: CaseData }) {
  const metrics = useMemo(() => ({
    cpc: data.spend / data.clicks,
    ctr: data.clicks / data.impressions * 100,
    cvr: data.orders / data.clicks * 100,
    acos: data.spend / data.adSales * 100,
    tacos: data.spend / data.totalSales * 100,
    roas: data.adSales / data.spend,
  }), [data]);
  const target = data.targetAcos ?? 30;
  const gap = metrics.acos - target;
  const stages = [
    ["Impressions", data.impressions.toLocaleString(), "Reach"],
    ["Clicks", data.clicks.toLocaleString(), formatPercent(metrics.ctr) + " CTR"],
    ["Orders", data.orders.toLocaleString(), formatPercent(metrics.cvr) + " CVR"],
    ["Ad sales", formatMoney(data.adSales), metrics.roas.toFixed(2) + "x ROAS"],
  ];
  return (
    <VisualShell id={id} title={title} eyebrow="Worked example">
      <div className={styles.exampleSummary}>
        <div><span>Observed ACoS</span><strong>{formatPercent(metrics.acos)}</strong></div>
        <div><span>Target ACoS</span><strong>{formatPercent(target)}</strong></div>
        <div className={gap > 0 ? styles.negative : styles.positive}><span>Gap to target</span><strong>{gap > 0 ? "+" : ""}{formatPercent(gap)}</strong></div>
      </div>
      <div className={styles.funnel} aria-label="Coffee grinder funnel from impressions to ad sales">
        {stages.map(([label, value, note], index) => (
          <div key={label} className={styles.funnelStage}>
            <div className={styles.funnelNumber}>{value}</div>
            <strong>{label}</strong>
            <span>{note}</span>
            {index < stages.length - 1 && <span className={styles.funnelArrow} aria-hidden="true">↓</span>}
          </div>
        ))}
      </div>
      <table className={styles.dataTable}>
        <caption>Coffee-grinder case: calculated outputs</caption>
        <thead><tr><th>Metric</th><th>Formula</th><th>Result</th><th>What it tells you</th></tr></thead>
        <tbody>
          <tr><th scope="row">CPC</th><td>192 ÷ 160</td><td>{formatMoney(metrics.cpc)}</td><td>Cost of each click</td></tr>
          <tr><th scope="row">CTR</th><td>160 ÷ 20,000</td><td>{formatPercent(metrics.ctr)}</td><td>Traffic appeal</td></tr>
          <tr><th scope="row">CVR</th><td>8 ÷ 160</td><td>{formatPercent(metrics.cvr)}</td><td>Listing and intent fit</td></tr>
          <tr><th scope="row">ACoS</th><td>192 ÷ 320</td><td>{formatPercent(metrics.acos)}</td><td>Ad efficiency against target</td></tr>
          <tr><th scope="row">TACoS</th><td>192 ÷ 800</td><td>{formatPercent(metrics.tacos)}</td><td>Store-level ad burden</td></tr>
          <tr><th scope="row">ROAS</th><td>320 ÷ 192</td><td>{metrics.roas.toFixed(2)}x</td><td>Sales returned per peso spent</td></tr>
        </tbody>
      </table>
      <p className={styles.visualTakeaway}><strong>Readout:</strong> {gap > 0 ? "cost is above the supplied target, but the first cause still depends on objective, data window, traffic, and conversion evidence." : "the result is below the supplied target; confirm the objective and data window before scaling."}</p>
    </VisualShell>
  );
}

function DecisionTree({ id, title, steps }: { id: string; title: string; steps: DecisionStep[] }) {
  return (
    <VisualShell id={id} title={title} eyebrow="Decision sequence">
      <ol className={styles.decisionList}>
        {steps.map((step) => (
          <li key={step.number} className={styles.decisionStep}>
            <div className={styles.decisionNumber}>{step.number}</div>
            <div className={styles.decisionContent}>
              <h4>{step.title}</h4>
              <p><strong>Ask:</strong> {step.question}</p>
              <p><strong>Evidence:</strong> {step.evidence}</p>
              <p className={styles.decisionAction}><strong>Then:</strong> {step.action}</p>
            </div>
          </li>
        ))}
      </ol>
    </VisualShell>
  );
}

function PatternBoard({ id, title, patterns }: { id: string; title: string; patterns: Pattern[] }) {
  return (
    <VisualShell id={id} title={title} eyebrow="Pattern library">
      <div className={styles.patternBoard} role="region" aria-label="Signal to action pattern library" tabIndex={0}>
        <table className={styles.dataTable}>
          <caption>Start with the first check, not the loudest metric</caption>
          <thead><tr><th>Signal</th><th>First check</th><th>Likely lever</th><th>Do not do first</th></tr></thead>
          <tbody>{patterns.map((pattern) => <tr key={pattern.signal}><th scope="row">{pattern.signal}</th><td>{pattern.firstCheck}</td><td>{pattern.lever}</td><td>{pattern.avoid}</td></tr>)}</tbody>
        </table>
      </div>
    </VisualShell>
  );
}

function PracticeWorkbench({ id, title, data, prompt, answer }: { id: string; title: string; data: CaseData; prompt: string; answer: string }) {
  const [checked, setChecked] = useState(false);
  const ctr = data.clicks / data.impressions * 100;
  const cvr = data.orders / data.clicks * 100;
  const acos = data.spend / data.adSales * 100;
  return (
    <VisualShell id={id} title={title} eyebrow="Practice workbench">
      <div className={styles.practiceGrid}>
        <div className={styles.practiceCase}>
          <p className={styles.practiceLabel}>Case file</p>
          <h4>{prompt}</h4>
          <dl className={styles.caseFacts}>
            <div><dt>Impressions</dt><dd>{data.impressions.toLocaleString()}</dd></div>
            <div><dt>Clicks</dt><dd>{data.clicks.toLocaleString()}</dd></div>
            <div><dt>Orders</dt><dd>{data.orders.toLocaleString()}</dd></div>
            <div><dt>Spend</dt><dd>{formatMoney(data.spend)}</dd></div>
            <div><dt>Ad sales</dt><dd>{formatMoney(data.adSales)}</dd></div>
            <div><dt>Target ACoS</dt><dd>{formatPercent(data.targetAcos ?? 25)}</dd></div>
          </dl>
        </div>
        <div className={styles.practiceAction}>
          <p className={styles.practiceLabel}>Make the call</p>
          <p>Calculate CTR, CVR, and ACoS. Then name the first question you would investigate before changing the bid.</p>
          <div className={styles.formulaStack} aria-label="Practice calculations">
            <code>CTR = {formatPercent(ctr)}</code>
            <code>CVR = {formatPercent(cvr)}</code>
            <code>ACoS = {formatPercent(acos)}</code>
          </div>
          <button type="button" className={styles.revealButton} onClick={() => setChecked((value) => !value)} aria-expanded={checked} aria-controls={`${id}-feedback`}>
            {checked ? "Hide feedback" : "Check the diagnosis"}
          </button>
          <div id={`${id}-feedback`} className={styles.feedback} aria-live="polite" hidden={!checked}>
            <strong>Coach feedback:</strong> {answer}
          </div>
        </div>
      </div>
    </VisualShell>
  );
}

function RecommendationBuilder({ id, title, sentence }: { id: string; title: string; sentence: string }) {
  const parts = sentence.split("|").filter(Boolean);
  return (
    <VisualShell id={id} title={title} eyebrow="Client language">
      <div className={styles.recommendation}>
        {parts.map((part, index) => <span key={`${part}-${index}`} className={styles.recommendationPart}><b>{index + 1}</b>{part}</span>)}
      </div>
      <p className={styles.visualTakeaway}>A defensible recommendation names the target, pattern, next check, action boundary, and review date.</p>
    </VisualShell>
  );
}

export function VisualLessonBlock({ id, kind, title, body }: VisualLessonBlockProps) {
  const data = readData(body);
  if (kind === "diagnostic-map") return <DiagnosticMap id={id} title={title} />;
  if (kind === "metric-matrix") return <MetricMatrix id={id} title={title} metrics={data.metrics ?? []} />;
  if (kind === "worked-example") return <WorkedExample id={id} title={title} data={data.case ?? { impressions: 0, clicks: 0, spend: 0, orders: 0, adSales: 0, totalSales: 0, price: 0 }} />;
  if (kind === "decision-tree") return <DecisionTree id={id} title={title} steps={data.steps ?? []} />;
  if (kind === "pattern-board") return <PatternBoard id={id} title={title} patterns={data.patterns ?? []} />;
  if (kind === "practice-workbench") return <PracticeWorkbench id={id} title={title} data={data.case ?? { impressions: 0, clicks: 0, spend: 0, orders: 0, adSales: 0, totalSales: 0, price: 0 }} prompt={data.prompt ?? "Work the case."} answer={data.answer ?? "State the objective, data window, evidence, next check, and review date."} />;
  if (kind === "recommendation-builder") return <RecommendationBuilder id={id} title={title} sentence={data.sentence ?? "|Target|Pattern|Next check|Review date|"} />;
  return null;
}
