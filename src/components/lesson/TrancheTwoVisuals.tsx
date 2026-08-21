"use client";

import { useMemo, useState } from "react";
import styles from "./TrancheTwoVisuals.module.css";

export type ListingSection = {
  id: string;
  label: string;
  role: string;
  content: string;
  effect: string;
};

export type AnnotatedListingCanvasProps = {
  id: string;
  title: string;
  sections: ListingSection[];
  prompt?: string;
};

export function AnnotatedListingCanvas({ id, title, sections, prompt }: AnnotatedListingCanvasProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Audit the listing surface</p>
        <h3 id={`${id}-title`}>{title}</h3>
        {prompt ? <p className={styles.subhead}>{prompt}</p> : null}
      </div>
      <div className={styles.listingLayout}>
        <div className={styles.listingMock} aria-label="Annotated listing preview">
          <div className={styles.imageRail}>
            <span className={styles.imageThumbActive}>01</span>
            <span>02</span><span>03</span><span>04</span><span>05</span>
          </div>
          <div className={styles.productImage}>
            <span className={styles.productSilhouette} aria-hidden="true" />
            <small>MAIN IMAGE<br />CTR SURFACE</small>
          </div>
          <div className={styles.productCopy}>
            <span className={styles.productBrand}>BRAND</span>
            <strong>{sections.find((section) => section.id === "title")?.content ?? "Product title"}</strong>
            <span className={styles.starLine}>★★★★☆ · 4.6 · 500 reviews</span>
            <ul>
              {sections.filter((section) => section.id.startsWith("bullet")).slice(0, 3).map((section) => <li key={section.id}>{section.content}</li>)}
            </ul>
          </div>
        </div>
        <div className={styles.annotationPanel}>
          <div className={styles.annotationTabs} role="tablist" aria-label="Listing sections">
            {sections.map((section) => {
              const selected = section.id === active?.id;
              return <button key={section.id} type="button" role="tab" aria-selected={selected} aria-controls={`${id}-annotation-${section.id}`} onClick={() => setActiveId(section.id)} className={`${styles.annotationTab} ${selected ? styles.annotationTabActive : ""}`}>{section.label}</button>;
            })}
          </div>
          {active ? (
            <article id={`${id}-annotation-${active.id}`} className={styles.annotationDetail} role="tabpanel" tabIndex={0} aria-live="polite">
              <p className={styles.panelLabel}>{active.role}</p>
              <h4>{active.label}</h4>
              <p><strong>Current pattern:</strong> {active.content}</p>
              <p className={styles.effectLine}><strong>PPC job:</strong> {active.effect}</p>
            </article>
          ) : <p className={styles.emptyState}>Add a listing section to annotate.</p>}
        </div>
      </div>
    </section>
  );
}

export type HierarchyNode = {
  id: string;
  label: string;
  type: "account" | "campaign" | "ad-group" | "target";
  detail?: string;
  children?: HierarchyNode[];
};

export type HierarchyBuilderProps = {
  id: string;
  title: string;
  root: HierarchyNode;
  note?: string;
};

function HierarchyBranch({ node, depth = 0 }: { node: HierarchyNode; depth?: number }) {
  return (
    <li className={styles.hierarchyNode}>
      <details open={depth < 2}>
        <summary>
          <span className={`${styles.nodeBadge} ${styles[`node-${node.type}`]}`}>{node.type.replace("-", " ")}</span>
          <strong>{node.label}</strong>
          {node.detail ? <small>{node.detail}</small> : null}
        </summary>
        {node.children?.length ? <ul>{node.children.map((child) => <HierarchyBranch key={child.id} node={child} depth={depth + 1} />)}</ul> : null}
      </details>
    </li>
  );
}

export function HierarchyBuilder({ id, title, root, note }: HierarchyBuilderProps) {
  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Build the structure</p>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <div className={styles.hierarchyLegend} aria-label="Hierarchy levels">
        <span><i className={`${styles.nodeBadge} ${styles["node-account"]}`} /> Account</span>
        <span><i className={`${styles.nodeBadge} ${styles["node-campaign"]}`} /> Campaign</span>
        <span><i className={`${styles.nodeBadge} ${styles["node-ad-group"]}`} /> Ad group</span>
        <span><i className={`${styles.nodeBadge} ${styles["node-target"]}`} /> Target</span>
      </div>
      <div className={styles.hierarchyCanvas}>
        <ul className={styles.hierarchyTree}><HierarchyBranch node={root} /></ul>
      </div>
      {note ? <p className={styles.note}><strong>Structure cue:</strong> {note}</p> : null}
    </section>
  );
}

export type FunnelStage = {
  id: string;
  label: string;
  role: string;
  formats: string[];
  question: string;
};

export type FunnelCanvasProps = {
  id: string;
  title: string;
  stages: FunnelStage[];
  note?: string;
};

export function FunnelCanvas({ id, title, stages, note }: FunnelCanvasProps) {
  const [activeId, setActiveId] = useState(stages[0]?.id ?? "");
  const active = stages.find((stage) => stage.id === activeId) ?? stages[0];

  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Route the ad format</p>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <div className={styles.funnelStages} role="tablist" aria-label="Full-funnel stages">
        {stages.map((stage, index) => {
          const selected = stage.id === active?.id;
          return <button key={stage.id} type="button" role="tab" aria-selected={selected} aria-controls={`${id}-stage-${stage.id}`} onClick={() => setActiveId(stage.id)} className={`${styles.funnelStage} ${selected ? styles.funnelStageActive : ""}`}><span className={styles.funnelStageNumber}>{index + 1}</span><strong>{stage.label}</strong><small>{stage.role}</small></button>;
        })}
      </div>
      {active ? (
        <div id={`${id}-stage-${active.id}`} className={styles.funnelDetail} role="tabpanel" tabIndex={0} aria-live="polite">
          <div><p className={styles.panelLabel}>Stage {stages.findIndex((stage) => stage.id === active.id) + 1}</p><h4>{active.question}</h4></div>
          <div><span className={styles.panelLabel}>Formats that fit</span><ul className={styles.formatList}>{active.formats.map((format) => <li key={format}>{format}</li>)}</ul></div>
        </div>
      ) : null}
      {note ? <p className={styles.note}><strong>Funnel cue:</strong> {note}</p> : null}
    </section>
  );
}

export type CompetitiveGap = {
  id: string;
  label: string;
  values: string[];
  signal: string;
  action: string;
};

export type CompetitiveGapMatrixProps = {
  id: string;
  title: string;
  dimensions: string[];
  competitors: CompetitiveGap[];
  note?: string;
  revealMode?: "always" | "after-choice";
};

export function CompetitiveGapMatrix({ id, title, dimensions, competitors, note, revealMode = "always" }: CompetitiveGapMatrixProps) {
  const [activeId, setActiveId] = useState(competitors[0]?.id ?? "");
  const [showCoach, setShowCoach] = useState(revealMode !== "after-choice");
  const active = competitors.find((competitor) => competitor.id === activeId) ?? competitors[0];
  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Inspect the competitive gap</p>
        <h3 id={`${id}-title`}>{title}</h3>
        {revealMode === "after-choice" ? <button type="button" className={styles.revealButton} onClick={() => setShowCoach((visible) => !visible)} aria-expanded={showCoach}>{showCoach ? "Hide coach rationale" : "Reveal coach rationale"}</button> : null}
      </div>
      <div className={styles.competitiveTableWrap} tabIndex={0} role="region" aria-label={`${title} matrix`}>
        <table className={styles.competitiveTable}>
          <caption>Compare evidence dimensions before choosing an action.</caption>
          <thead><tr><th scope="col">Competitor</th>{dimensions.map((dimension) => <th key={dimension} scope="col">{dimension}</th>)}</tr></thead>
          <tbody>{competitors.map((competitor) => <tr key={competitor.id} className={competitor.id === active?.id ? styles.competitorActive : ""}><th scope="row"><button type="button" className={styles.competitorButton} aria-pressed={competitor.id === active?.id} onClick={() => setActiveId(competitor.id)}>{competitor.label}</button></th>{dimensions.map((dimension, index) => <td key={`${competitor.id}-${dimension}`}>{competitor.values[index] ?? "Not observed"}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {active ? <div className={styles.competitiveReadout} role="status"><div><span className={styles.panelLabel}>Selection</span><strong>{active.label}</strong></div>{showCoach ? <div><span className={styles.panelLabel}>Coach rationale</span><p>{active.signal}</p><p className={styles.actionLine}>{active.action}</p></div> : <div><span className={styles.panelLabel}>Your move</span><p>State whether this competitor creates an opportunity, vulnerability, or contested area before revealing the coach rationale.</p></div>}</div> : null}
      {note ? <p className={styles.note}><strong>Market cue:</strong> {note}</p> : null}
    </section>
  );
}

export type InsightRoute = {
  id: string;
  signal: string;
  implication: string;
  evidence: string;
  action: string;
  owner?: string;
};

export type InsightRouterProps = {
  id: string;
  title: string;
  routes: InsightRoute[];
  revealMode?: "always" | "after-choice";
};

export function InsightRouter({ id, title, routes, revealMode = "always" }: InsightRouterProps) {
  const [activeId, setActiveId] = useState(routes[0]?.id ?? "");
  const [showCoach, setShowCoach] = useState(revealMode !== "after-choice");
  const active = routes.find((route) => route.id === activeId) ?? routes[0];
  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Route insight to action</p>
        <h3 id={`${id}-title`}>{title}</h3>
        {revealMode === "after-choice" ? <button type="button" className={styles.revealButton} onClick={() => setShowCoach((visible) => !visible)} aria-expanded={showCoach}>{showCoach ? "Hide coach rationale" : "Reveal coach rationale"}</button> : null}
      </div>
      <div className={styles.insightRoutes} role="tablist" aria-label="Competitive insight routes">
        {routes.map((route, index) => <button key={route.id} type="button" role="tab" aria-selected={route.id === active?.id} aria-controls={`${id}-route-${route.id}`} onClick={() => setActiveId(route.id)} className={`${styles.insightRouteButton} ${route.id === active?.id ? styles.insightRouteActive : ""}`}><span>{index + 1}</span>{route.signal}</button>)}
      </div>
      {active ? <div id={`${id}-route-${active.id}`} className={styles.insightDetail} role="tabpanel" tabIndex={0} aria-live="polite">{showCoach ? <><div><span className={styles.panelLabel}>Implication</span><p>{active.implication}</p></div><div><span className={styles.panelLabel}>Evidence next</span><p>{active.evidence}</p></div><div><span className={styles.panelLabel}>Action</span><p className={styles.actionLine}>{active.action}</p></div>{active.owner ? <span className={styles.ownerTag}>Owner: {active.owner}</span> : null}</> : <div><span className={styles.panelLabel}>Your move</span><p>Choose the next evidence check and bounded action before revealing the coach rationale.</p></div>}</div> : null}
    </section>
  );
}

export type TimelineRow = {
  id: string;
  label: string;
  values: string[];
  tone?: "accent" | "success" | "info" | "warning";
  note?: string;
};

export type TimelineCalendarProps = {
  id: string;
  title: string;
  periods: string[];
  rows: TimelineRow[];
  caption?: string;
  note?: string;
};

export function TimelineCalendar({ id, title, periods, rows, caption, note }: TimelineCalendarProps) {
  const [activePeriod, setActivePeriod] = useState(0);
  const periodLabel = periods[activePeriod] ?? periods[0] ?? "Current period";
  const highlightedRows = useMemo(() => rows.filter((row) => row.values[activePeriod]), [rows, activePeriod]);

  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Plan across time</p>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <div className={styles.timelineToolbar}>
        <span>Inspect period: <strong>{periodLabel}</strong></span>
        <div className={styles.periodButtons} role="tablist" aria-label="Timeline periods">
          {periods.map((period, index) => <button key={period} type="button" role="tab" aria-selected={index === activePeriod} onClick={() => setActivePeriod(index)} className={index === activePeriod ? styles.periodActive : ""}>{period}</button>)}
        </div>
      </div>
      <div className={styles.timelineWrap} tabIndex={0} role="region" aria-label={`${title} timeline`}>
        <table className={styles.timelineTable}>
          <caption>{caption ?? title}</caption>
          <thead><tr><th scope="col">Workstream</th>{periods.map((period) => <th key={period} scope="col">{period}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><th scope="row"><span className={`${styles.toneBar} ${styles[`tone-${row.tone ?? "accent"}`]}`} />{row.label}{row.note ? <small>{row.note}</small> : null}</th>{periods.map((period, index) => <td key={`${row.id}-${period}`} className={index === activePeriod ? styles.periodCellActive : ""}>{row.values[index] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className={styles.periodReadout} role="status"><strong>{periodLabel}</strong><span>{highlightedRows.map((row) => `${row.label}: ${row.values[activePeriod]}`).join(" · ")}</span></div>
      {note ? <p className={styles.note}><strong>Planning cue:</strong> {note}</p> : null}
    </section>
  );
}
