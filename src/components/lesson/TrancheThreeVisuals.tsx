"use client";

import { useMemo, useState } from "react";
import styles from "./TrancheThreeVisuals.module.css";

export type PathwayStep = { id: string; label: string; purpose: string; action: string; status?: "done" | "current" | "next" };
export type LessonPathwayProps = { id: string; title: string; steps: PathwayStep[]; note?: string };

export function LessonPathway({ id, title, steps, note }: LessonPathwayProps) {
  const [activeId, setActiveId] = useState(steps.find((step) => step.status === "current")?.id ?? steps[0]?.id ?? "");
  const active = steps.find((step) => step.id === activeId) ?? steps[0];
  return <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.header}><p className={styles.eyebrow}>See the learning path</p><h3 id={`${id}-title`}>{title}</h3></div>
    <div className={styles.pathway} role="tablist" aria-label="Lesson pathway">{steps.map((step, index) => <button key={step.id} type="button" role="tab" aria-selected={step.id === active?.id} aria-controls={`${id}-${step.id}`} onClick={() => setActiveId(step.id)} className={`${styles.pathStep} ${step.id === active?.id ? styles.pathStepActive : ""}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step.label}</strong><small>{step.status ?? "next"}</small></button>)}</div>
    {active ? <div id={`${id}-${active.id}`} className={styles.detail} role="tabpanel" tabIndex={0} aria-live="polite"><span className={styles.label}>Purpose</span><h4>{active.purpose}</h4><p><strong>Do this:</strong> {active.action}</p></div> : null}
    {note ? <p className={styles.note}><strong>Habit:</strong> {note}</p> : null}
  </section>;
}

export type BriefField = { id: string; label: string; prompt: string; example?: string; required?: boolean };
export type SimulationBriefBuilderProps = { id: string; title: string; fields: BriefField[]; note?: string };

export function SimulationBriefBuilder({ id, title, fields, note }: SimulationBriefBuilderProps) {
  const [checked, setChecked] = useState<string[]>([]);
  const completed = fields.filter((field) => checked.includes(field.id)).length;
  const toggle = (fieldId: string) => setChecked((current) => current.includes(fieldId) ? current.filter((idValue) => idValue !== fieldId) : [...current, fieldId]);
  return <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.header}><p className={styles.eyebrow}>Prepare before the simulator</p><h3 id={`${id}-title`}>{title}</h3></div>
    <div className={styles.progressLine}><span>Brief readiness</span><strong>{completed}/{fields.length}</strong><div className={styles.progressTrack}><span style={{ width: `${fields.length ? (completed / fields.length) * 100 : 0}%` }} /></div></div>
    <div className={styles.briefFields}>{fields.map((field) => <label key={field.id} className={`${styles.briefField} ${checked.includes(field.id) ? styles.briefFieldDone : ""}`}><input type="checkbox" checked={checked.includes(field.id)} onChange={() => toggle(field.id)} /><span><strong>{field.label}{field.required ? " *" : ""}</strong><small>{field.prompt}</small>{field.example ? <em>Example: {field.example}</em> : null}</span></label>)}</div>
    {note ? <p className={styles.note}><strong>Submission cue:</strong> {note}</p> : null}
  </section>;
}

export type PortfolioCampaign = { id: string; label: string; purpose: string; budget: string; bidLogic: string };
export type PortfolioGroup = { id: string; label: string; share: string; purpose: string; campaigns: PortfolioCampaign[] };
export type PortfolioMapProps = { id: string; title: string; groups: PortfolioGroup[]; note?: string };

export function PortfolioMap({ id, title, groups, note }: PortfolioMapProps) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");
  const active = groups.find((group) => group.id === activeId) ?? groups[0];
  return <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.header}><p className={styles.eyebrow}>Control budget at the right level</p><h3 id={`${id}-title`}>{title}</h3></div>
    <div className={styles.portfolioStrip} role="tablist" aria-label="Portfolio groups">{groups.map((group) => <button key={group.id} type="button" role="tab" aria-selected={group.id === active?.id} onClick={() => setActiveId(group.id)} className={`${styles.portfolioTab} ${group.id === active?.id ? styles.portfolioTabActive : ""}`}><strong>{group.share}</strong><span>{group.label}</span></button>)}</div>
    {active ? <div className={styles.portfolioDetail} role="tabpanel" tabIndex={0} aria-live="polite"><div><span className={styles.label}>Portfolio job</span><h4>{active.purpose}</h4><p>{active.label} holds {active.share} of the planned spend.</p></div><div className={styles.campaignStack}>{active.campaigns.map((campaign) => <article key={campaign.id} className={styles.campaignRow}><strong>{campaign.label}</strong><span>{campaign.purpose}</span><small>{campaign.budget} · {campaign.bidLogic}</small></article>)}</div></div> : null}
    {note ? <p className={styles.note}><strong>Control cue:</strong> {note}</p> : null}
  </section>;
}

export type SeasonalPhase = { id: string; label: string; timing: string; goal: string; actions: string[]; risk: string };
export type SeasonalCalendarProps = { id: string; title: string; phases: SeasonalPhase[]; note?: string };

export function SeasonalCalendar({ id, title, phases, note }: SeasonalCalendarProps) {
  const [activeId, setActiveId] = useState(phases[0]?.id ?? "");
  const active = phases.find((phase) => phase.id === activeId) ?? phases[0];
  return <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.header}><p className={styles.eyebrow}>Plan around the event</p><h3 id={`${id}-title`}>{title}</h3></div>
    <div className={styles.seasonRail} role="tablist" aria-label="Seasonal phases">{phases.map((phase, index) => <button key={phase.id} type="button" role="tab" aria-selected={phase.id === active?.id} onClick={() => setActiveId(phase.id)} className={`${styles.seasonPhase} ${phase.id === active?.id ? styles.seasonPhaseActive : ""}`}><span>0{index + 1}</span><strong>{phase.label}</strong><small>{phase.timing}</small></button>)}</div>
    {active ? <div className={styles.seasonDetail} role="tabpanel" tabIndex={0} aria-live="polite"><div><span className={styles.label}>Goal</span><h4>{active.goal}</h4><span className={styles.label}>Risk to manage</span><p>{active.risk}</p></div><div><span className={styles.label}>Actions</span><ol>{active.actions.map((action) => <li key={action}>{action}</li>)}</ol></div></div> : null}
    {note ? <p className={styles.note}><strong>Seasonality cue:</strong> {note}</p> : null}
  </section>;
}

export type EvidenceEntry = { id: string; source: string; signal: string; implication: string; nextCheck: string };
export type EvidenceLedgerProps = { id: string; title: string; entries: EvidenceEntry[]; note?: string };

export function EvidenceLedger({ id, title, entries, note }: EvidenceLedgerProps) {
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");
  const active = entries.find((entry) => entry.id === activeId) ?? entries[0];
  return <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.header}><p className={styles.eyebrow}>Build the evidence chain</p><h3 id={`${id}-title`}>{title}</h3></div>
    <div className={styles.ledgerGrid} role="tablist" aria-label="Evidence sources">{entries.map((entry) => <button key={entry.id} type="button" role="tab" aria-selected={entry.id === active?.id} onClick={() => setActiveId(entry.id)} className={`${styles.ledgerItem} ${entry.id === active?.id ? styles.ledgerItemActive : ""}`}><span>{entry.source}</span><strong>{entry.signal}</strong></button>)}</div>
    {active ? <div className={styles.evidenceDetail} role="tabpanel" tabIndex={0} aria-live="polite"><div><span className={styles.label}>Signal</span><h4>{active.signal}</h4></div><div><span className={styles.label}>PPC implication</span><p>{active.implication}</p></div><div><span className={styles.label}>Next evidence check</span><p>{active.nextCheck}</p></div></div> : null}
    {note ? <p className={styles.note}><strong>Evidence cue:</strong> {note}</p> : null}
  </section>;
}

export type SovBand = { id: string; label: string; range: string; posture: string; actions: string[] };
export type SovPositionerProps = { id: string; title: string; bands: SovBand[]; note?: string };

export function SovPositioner({ id, title, bands, note }: SovPositionerProps) {
  const [activeId, setActiveId] = useState(bands[0]?.id ?? "");
  const active = bands.find((band) => band.id === activeId) ?? bands[0];
  const position = useMemo(() => bands.findIndex((band) => band.id === active?.id), [bands, active]);
  return <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
    <div className={styles.header}><p className={styles.eyebrow}>Place the account on the spectrum</p><h3 id={`${id}-title`}>{title}</h3></div>
    <div className={styles.sovSpectrum} aria-label="Share of voice strategy spectrum">{bands.map((band, index) => <button key={band.id} type="button" aria-pressed={band.id === active?.id} onClick={() => setActiveId(band.id)} className={`${styles.sovBand} ${band.id === active?.id ? styles.sovBandActive : ""}`}><span>{band.range}</span><strong>{band.label}</strong><small>{index === position ? "Selected posture" : "Select"}</small></button>)}</div>
    {active ? <div className={styles.sovDetail} role="status"><div><span className={styles.label}>Posture</span><h4>{active.posture}</h4></div><div><span className={styles.label}>Next actions</span><ul>{active.actions.map((action) => <li key={action}>{action}</li>)}</ul></div></div> : null}
    {note ? <p className={styles.note}><strong>SOV cue:</strong> {note}</p> : null}
  </section>;
}
