"use client";

import { useMemo, useState } from "react";
import styles from "./TrancheOneVisuals.module.css";

export type ComparisonTableRow = {
  label: string;
  values: string[];
  emphasis?: "neutral" | "positive" | "warning" | "negative";
};

export type ComparisonTableProps = {
  id: string;
  title: string;
  caption?: string;
  columns: string[];
  rows: ComparisonTableRow[];
  highlightedColumn?: number;
  note?: string;
};

export function ComparisonTable({ id, title, caption, columns, rows, highlightedColumn, note }: ComparisonTableProps) {
  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Compare and choose</p>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={`${title} table`}>
        <table className={styles.comparisonTable}>
          <caption>{caption ?? title}</caption>
          <thead>
            <tr>
              <th scope="col">Dimension</th>
              {columns.map((column, index) => (
                <th key={column} scope="col" className={highlightedColumn === index ? styles.highlightedHeader : undefined}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className={row.emphasis ? styles[row.emphasis] : undefined}>
                <th scope="row">{row.label}</th>
                {columns.map((column, index) => (
                  <td key={`${row.label}-${column}`} className={highlightedColumn === index ? styles.highlightedCell : undefined}>
                    {row.values[index] ?? "Not specified"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className={styles.note}><strong>Decision cue:</strong> {note}</p> : null}
    </section>
  );
}

export type FormulaLadderStep = {
  label: string;
  expression: string;
  explanation?: string;
};

export type FormulaLadderProps = {
  id: string;
  title: string;
  steps: FormulaLadderStep[];
  result?: { label: string; value: string; context?: string };
  note?: string;
};

export function FormulaLadder({ id, title, steps, result, note }: FormulaLadderProps) {
  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Calculate and inspect</p>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <ol className={styles.formulaLadder} aria-label={`${title} calculation steps`}>
        {steps.map((step, index) => (
          <li key={`${step.label}-${index}`} className={styles.formulaStep}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <div className={styles.formulaCopy}>
              <strong>{step.label}</strong>
              <code>{step.expression}</code>
              {step.explanation ? <p>{step.explanation}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      {result ? (
        <div className={styles.formulaResult} role="status">
          <span>{result.label}</span>
          <strong>{result.value}</strong>
          {result.context ? <p>{result.context}</p> : null}
        </div>
      ) : null}
      {note ? <p className={styles.note}><strong>Readout:</strong> {note}</p> : null}
    </section>
  );
}

export type ClassificationCategory = {
  id: string;
  label: string;
  description?: string;
};

export type ClassificationItem = {
  id: string;
  label: string;
  categoryId: string;
  rationale?: string;
};

export type RevealMode = "always" | "after-choice";

export type ClassificationBoardProps = {
  id: string;
  title: string;
  categories: ClassificationCategory[];
  items: ClassificationItem[];
  prompt?: string;
  revealMode?: RevealMode;
};

export function ClassificationBoard({ id, title, categories, items, prompt, revealMode = "always" }: ClassificationBoardProps) {
  const [showRationales, setShowRationales] = useState(revealMode !== "after-choice");
  const grouped = useMemo(
    () => categories.map((category) => ({ category, items: items.filter((item) => item.categoryId === category.id) })),
    [categories, items],
  );

  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Classify and route</p>
        <h3 id={`${id}-title`}>{title}</h3>
        {prompt ? <p className={styles.subhead}>{prompt}</p> : null}
      </div>
      <div className={styles.classificationToolbar}>
        <span>{items.length} items routed</span>
        <button type="button" className={styles.ghostButton} onClick={() => setShowRationales((visible) => !visible)} aria-expanded={showRationales}>
          {showRationales ? "Hide rationales" : "Show rationales"}
        </button>
      </div>
      <div className={styles.classificationGrid}>
        {grouped.map(({ category, items: categoryItems }) => (
          <article key={category.id} className={styles.classificationLane}>
            <header>
              <h4>{category.label}</h4>
              {category.description ? <p>{category.description}</p> : null}
            </header>
            <ul>
              {categoryItems.length > 0 ? categoryItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>
                  {showRationales && item.rationale ? <span>{item.rationale}</span> : null}
                </li>
              )) : <li className={styles.emptyLane}>No items routed yet.</li>}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export type DecisionFlowStep = {
  id: string;
  label: string;
  question: string;
  evidence: string;
  action: string;
};

export type DecisionFlowProps = {
  id: string;
  title: string;
  steps: DecisionFlowStep[];
  initialStep?: number;
  revealMode?: RevealMode;
};

export function DecisionFlow({ id, title, steps, initialStep = 0, revealMode = "always" }: DecisionFlowProps) {
  const safeInitial = Math.min(Math.max(initialStep, 0), Math.max(steps.length - 1, 0));
  const [activeIndex, setActiveIndex] = useState(safeInitial);
  const [showCoach, setShowCoach] = useState(revealMode !== "after-choice");
  const active = steps[activeIndex];

  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Sequence and diagnose</p>
        <h3 id={`${id}-title`}>{title}</h3>
        {revealMode === "after-choice" ? <button type="button" className={styles.ghostButton} onClick={() => setShowCoach((visible) => !visible)} aria-expanded={showCoach}>{showCoach ? "Hide coach rationale" : "Reveal coach rationale"}</button> : null}
      </div>
      <div className={styles.flowLayout}>
        <ol className={styles.flowSteps} aria-label={`${title} steps`} role="tablist" aria-orientation="vertical">
          {steps.map((step, index) => {
            const selected = index === activeIndex;
            return (
              <li key={step.id}>
                <button type="button" role="tab" aria-selected={selected} aria-controls={`${id}-panel-${step.id}`} onClick={() => setActiveIndex(index)} className={`${styles.flowButton} ${selected ? styles.flowButtonActive : ""}`}>
                  <span className={styles.stepNumber}>{index + 1}</span>
                  <span>{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {active ? (
          <div id={`${id}-panel-${active.id}`} className={styles.flowPanel} role="tabpanel" aria-live="polite" tabIndex={0}>
            <p className={styles.panelLabel}>Question {activeIndex + 1}</p>
            <h4>{active.question}</h4>
            {showCoach ? <><p><strong>Evidence to inspect:</strong> {active.evidence}</p><p className={styles.actionLine}><strong>Decision boundary:</strong> {active.action}</p></> : <p className={styles.actionLine}><strong>Your move:</strong> State the evidence you would inspect and the smallest safe action before revealing the coach rationale.</p>}
          </div>
        ) : <p className={styles.emptyState}>Add at least one decision step.</p>}
      </div>
    </section>
  );
}

export type SimulationRubricCriterion = {
  id: string;
  label: string;
  lookFor: string;
  commonError?: string;
};

export type SimulationRubricProps = {
  id: string;
  title: string;
  scenario: string;
  criteria: SimulationRubricCriterion[];
  submission?: string;
};

export function SimulationRubric({ id, title, scenario, criteria, submission }: SimulationRubricProps) {
  const [checked, setChecked] = useState<string[]>([]);
  const complete = criteria.filter((criterion) => checked.includes(criterion.id)).length;
  const progress = criteria.length === 0 ? 0 : Math.round((complete / criteria.length) * 100);

  function toggleCriterion(criterionId: string) {
    setChecked((current) => current.includes(criterionId) ? current.filter((idValue) => idValue !== criterionId) : [...current, criterionId]);
  }

  return (
    <section className={styles.block} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.blockHeader}>
        <p className={styles.eyebrow}>Simulation preparation</p>
        <h3 id={`${id}-title`}>{title}</h3>
      </div>
      <div className={styles.scenarioBox}>
        <span className={styles.panelLabel}>Scenario brief</span>
        <p>{scenario}</p>
        {submission ? <p className={styles.submission}><strong>Submit:</strong> {submission}</p> : null}
      </div>
      <div className={styles.rubricHeader}>
        <div>
          <strong>{complete} of {criteria.length} criteria reviewed</strong>
          <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Simulation readiness">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className={styles.progressValue}>{progress}%</span>
      </div>
      <ul className={styles.rubricList}>
        {criteria.map((criterion) => {
          const isChecked = checked.includes(criterion.id);
          return (
            <li key={criterion.id} className={isChecked ? styles.criterionChecked : undefined}>
              <label>
                <input type="checkbox" checked={isChecked} onChange={() => toggleCriterion(criterion.id)} />
                <span>
                  <strong>{criterion.label}</strong>
                  <small>{criterion.lookFor}</small>
                  {criterion.commonError ? <em>Common error: {criterion.commonError}</em> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
