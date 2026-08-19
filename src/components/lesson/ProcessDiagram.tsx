// src/components/lesson/ProcessDiagram.tsx
/**
 * ProcessDiagram - visual ordered-list of steps. CSS-only flow.
 *
 * Server component. Renders <ol>; each step gets an icon slot, label, and
 * optional hint. Decision rule: if a step needs more than icon + label, it
 * doesn't belong here.
 */

import type { ReactElement } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import styles from "./ProcessDiagram.module.css";

export interface ProcessStep {
  readonly id: string;
  readonly label: string;
}

export interface ProcessDiagramProps {
  id: string;
  title: string;
  steps: readonly ProcessStep[];
  layout?: "horizontal" | "vertical";
  hint?: string;
}

export function ProcessDiagram(props: ProcessDiagramProps): ReactElement {
  const { id, title, steps, layout = "horizontal", hint } = props;
  if (steps.length < 2) {
    throw new Error("ProcessDiagram requires at least 2 steps.");
  }
  return (
    <figure id={id} className={styles.figure}>
      <figcaption className={styles.title}>{title}</figcaption>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <ol className={`${styles.list} ${styles[layout]}`} aria-label="Lesson process steps">
        {steps.map((step, index) => (
          <li key={step.id} className={styles.item}>
            <span className={styles.bullet} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.label}>{step.label}</span>
            {layout === "horizontal" && index < steps.length - 1 ? (
              <ArrowRight size={16} weight="bold" aria-hidden="true" className={styles.connector} />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
