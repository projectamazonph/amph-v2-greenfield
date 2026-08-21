# Active Lesson Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four shippable lesson primitives (SelfCheck, TradeOffTable, ProcessDiagram, PitfallCallout) and apply them to Module 1, executing the LEARN-020 to LEARN-029 active-practice contract without changing the renderer runtime, the domain layer, or any public claim.

**Architecture:** A new `src/components/lesson/` directory holds four React components. A new `src/lib/mdx/directive-plugin.ts` parses `:::trade-off`, `:::process`, `:::callout` fences and `<SelfCheck>` JSX inside the existing `react-markdown` + `remark-gfm` pipeline (no new dependency; `remark-directive` is not in `pnpm-lock.yaml`). `scripts/validate-lesson-production.ts` extends its schema to assert block shape, IDs, and voice compliance. Module 1 MDX files are updated with the new blocks. Authoring lives under `content/curriculum/AUTHORING.md`. Two story files capture the roll.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, React 19, CSS Modules with design tokens (`src/styles/tokens.css`), Phosphor icons, `react-markdown` + `remark-gfm`, Vitest + Testing Library, Playwright, custom remark plugin (no new package).

---

## File Structure

```
NEW
src/components/lesson/                          (new directory)
  SelfCheck.tsx                                 (client component, useState)
  SelfCheck.module.css
  TradeOffTable.tsx                             (server component)
  TradeOffTable.module.css
  ProcessDiagram.tsx                            (server component)
  ProcessDiagram.module.css
  PitfallCallout.tsx                            (server component)
  PitfallCallout.module.css
  index.ts
  __tests__/
    SelfCheck.test.tsx
    TradeOffTable.test.tsx
    ProcessDiagram.test.tsx
    PitfallCallout.test.tsx
    a11y.test.tsx
src/lib/mdx/
  directive-plugin.ts                           (remark plugin, server-safe)
src/lib/mdx/__tests__/
  directive-plugin.test.ts
tests/e2e/
  lesson-blocks.spec.ts
content/curriculum/
  AUTHORING.md
docs/stories/
  STORY-<next-available>-component-primitives.md
  STORY-<next-available+1>-module-1-active-pass.md

CHANGED
src/app/courses/[slug]/lessons/LessonContent.tsx       (extend renderer)
src/app/courses/[slug]/lessons/LessonContent.module.css  (add tokens)
src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx  (extend)
scripts/validate-lesson-production.ts                  (extend schema)
content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx
content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx
content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx
content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx
content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx
docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md
FEATURES.md
CHANGELOG.md
content/README.md   (mention AUTHORING.md)
```

---

## Task 1: Scaffold the lesson component directory

**Files:**

- Create: `src/components/lesson/index.ts`

- [ ] **Step 1: Create the directory and barrel**

```ts
// src/components/lesson/index.ts
// Barrel for lesson authoring primitives.
// All components are MDX-emitted by name; this index lets users import
// from "@/components/lesson" outside the renderer if needed.

export { SelfCheck } from "./SelfCheck";
export { TradeOffTable } from "./TradeOffTable";
export { ProcessDiagram } from "./ProcessDiagram";
export { PitfallCallout } from "./PitfallCallout";
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: PASS (the module-only file errors on missing exports, which is expected and is fixed in Tasks 2-5).

Run: `pnpm lint`
Expected: WARN at most (no errors yet because the files don't exist).

- [ ] **Step 3: Commit**

```bash
git add src/components/lesson/index.ts
git commit -m "feat(lesson): scaffold components/lesson barrel"
```

---

## Task 2: TradeOffTable component (server) + test

**Files:**

- Create: `src/components/lesson/TradeOffTable.tsx`
- Create: `src/components/lesson/TradeOffTable.module.css`
- Create: `src/components/lesson/__tests__/TradeOffTable.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/lesson/__tests__/TradeOffTable.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TradeOffTable } from "../TradeOffTable";

describe("TradeOffTable", () => {
  it("renders rectangular columns + rows", () => {
    const html = renderToString(
      <TradeOffTable
        id="big-six"
        title="The Big Six"
        caption="What each metric answers"
        columns={["Metric", "What it answers"]}
        rows={[
          { label: "CPC", value: "How much per click" },
          { label: "CTR", value: "How often the ad gets clicked" },
        ]}
      />,
    );
    expect(html).toContain('id="big-six"');
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain("The Big Six");
    expect(html).toContain("What each metric answers");
    expect(html).toContain("CPC");
    expect(html).toContain("How much per click");
    expect(html).toContain('scope="col"');
  });

  it("renders pairs form with row scope headers", () => {
    const html = renderToString(
      <TradeOffTable
        id="what-each-tells-you"
        title="What each tells you"
        pairs={[
          { label: "CPC", value: "Average cost per click" },
          { label: "CTR", value: "Share of impressions that become clicks" },
        ]}
      />,
    );
    expect(html).toContain('scope="row"');
    expect(html).toContain("Average cost per click");
    expect(html).toContain("Share of impressions that become clicks");
  });

  it("warns and renders placeholder for empty rows", () => {
    const html = renderToString(
      <TradeOffTable id="empty" title="Empty table" columns={["A"]} rows={[]} />,
    );
    expect(html).toMatch(/no rows|no data|empty/i);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run src/components/lesson/__tests__/TradeOffTable.test.tsx`
Expected: FAIL with `Failed to resolve import "../TradeOffTable"`.

- [ ] **Step 3: Implement TradeOffTable.tsx**

```tsx
// src/components/lesson/TradeOffTable.tsx
/**
 * TradeOffTable — tabular comparison for concepts, definitions, or trade-offs.
 *
 * Server component. Two rendering forms: rectangular (columns + rows) and
 * pairs (key/value). Native HTML table with caption and scoped headers.
 * On screens < 640px, the wrapper allows horizontal scroll (no clipped cells).
 */

import type { ReactElement } from "react";
import styles from "./TradeOffTable.module.css";

export interface TradeOffRow {
  readonly label: string;
  readonly value: string;
}

export interface TradeOffTableProps {
  id: string;
  title: string;
  caption?: string;
  columns?: readonly string[];
  rows?: readonly TradeOffRow[];
  pairs?: readonly TradeOffRow[];
}

function hasData(props: TradeOffTableProps): boolean {
  if (props.pairs && props.pairs.length > 0) return true;
  if (props.rows && props.rows.length > 0) return true;
  return false;
}

export function TradeOffTable(props: TradeOffTableProps): ReactElement {
  const { id, title, caption, columns, rows, pairs } = props;

  if (!hasData(props)) {
    return (
      <figure id={id} className={styles.placeholder}>
        <figcaption className={styles.title}>{title}</figcaption>
        <p className={styles.empty}>No rows to display.</p>
      </figure>
    );
  }

  return (
    <figure id={id} className={styles.figure} aria-label={title}>
      <figcaption className={styles.title}>{title}</figcaption>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {caption ? <caption className={styles.caption}>{caption}</caption> : null}
          <thead>
            {columns ? (
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            ) : null}
          </thead>
          <tbody>
            {pairs
              ? pairs.map((pair) => (
                  <tr key={pair.label}>
                    <th scope="row">{pair.label}</th>
                    <td>{pair.value}</td>
                  </tr>
                ))
              : (rows ?? []).map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
```

- [ ] **Step 4: Implement TradeOffTable.module.css**

```css
/* src/components/lesson/TradeOffTable.module.css
   Field Manual workbook row: dense type, off-white, 1px border separator. */

.figure {
  margin: var(--space-6) 0;
  font-family: var(--font-body);
}

.title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-h3);
  margin: 0 0 var(--space-2);
  color: var(--ink-900);
}

.caption {
  caption-side: top;
  text-align: left;
  color: var(--ink-500);
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0 0 var(--space-2);
}

.tableWrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body);
}

.table th,
.table td {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}

.table thead th {
  background: var(--surface-2);
  color: var(--ink-500);
  font-weight: 500;
  font-size: var(--text-caption);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}

.table tbody tr:last-child th,
.table tbody tr:last-child td {
  border-bottom: 0;
}

.table tbody th {
  font-weight: 500;
  color: var(--ink-900);
  white-space: nowrap;
}

.table tbody td {
  color: var(--ink-700);
}

.placeholder {
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin: var(--space-6) 0;
  background: var(--surface-2);
  color: var(--ink-500);
}

.empty {
  margin: var(--space-2) 0 0;
  font-size: var(--text-body-sm);
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/lesson/__tests__/TradeOffTable.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/lesson/TradeOffTable.tsx src/components/lesson/TradeOffTable.module.css src/components/lesson/__tests__/TradeOffTable.test.tsx
git commit -m "feat(lesson): add TradeOffTable primitive"
```

---

## Task 3: PitfallCallout component (server) + test

**Files:**

- Create: `src/components/lesson/PitfallCallout.tsx`
- Create: `src/components/lesson/PitfallCallout.module.css`
- Create: `src/components/lesson/__tests__/PitfallCallout.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/lesson/__tests__/PitfallCallout.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PitfallCallout } from "../PitfallCallout";

describe("PitfallCallout", () => {
  it("renders info variant with title and body", () => {
    const html = renderToString(
      <PitfallCallout id="note-1" variant="info" title="Note">
        <p>Body copy here.</p>
      </PitfallCallout>,
    );
    expect(html).toContain('role="note"');
    expect(html).toContain("Note");
    expect(html).toContain("Body copy here.");
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("accepts warning and pitfall variants without crash", () => {
    for (const variant of ["warning", "pitfall"] as const) {
      const html = renderToString(
        <PitfallCallout id={`x-${variant}`} variant={variant}>
          <p>Watch out.</p>
        </PitfallCallout>,
      );
      expect(html).toContain('role="note"');
      expect(html).toContain("Watch out.");
    }
  });

  it("renders title as an h3", () => {
    const html = renderToString(
      <PitfallCallout id="titled" variant="pitfall" title="Don't do this">
        <p>Because.</p>
      </PitfallCallout>,
    );
    expect(html).toMatch(/<h3[^>]*>Don't do this<\/h3>/);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run src/components/lesson/__tests__/PitfallCallout.test.tsx`
Expected: FAIL with import error.

- [ ] **Step 3: Implement PitfallCallout.tsx**

```tsx
// src/components/lesson/PitfallCallout.tsx
/**
 * PitfallCallout — Field Manual callout: info | warning | pitfall.
 *
 * Server component. Renders <aside role="note"> with token-driven color and
 * a Phosphor icon (decorative). Not dismissible — these are part of the lesson.
 */

import type { ReactElement, ReactNode } from "react";
import { Info, Warning, Prohibit } from "@phosphor-icons/react/dist/ssr";
import styles from "./PitfallCallout.module.css";

export type PitfallVariant = "info" | "warning" | "pitfall";

export interface PitfallCalloutProps {
  id: string;
  variant?: PitfallVariant;
  title?: string;
  children: ReactNode;
}

function variantIcon(variant: PitfallVariant): ReactElement {
  switch (variant) {
    case "warning":
      return <Warning size={20} weight="fill" aria-hidden="true" />;
    case "pitfall":
      return <Prohibit size={20} weight="fill" aria-hidden="true" />;
    case "info":
    default:
      return <Info size={20} weight="fill" aria-hidden="true" />;
  }
}

export function PitfallCallout(props: PitfallCalloutProps): ReactElement {
  const { id, variant = "info", title, children } = props;
  return (
    <aside id={id} role="note" className={`${styles.callout} ${styles[variant]}`}>
      <span className={styles.iconSlot}>{variantIcon(variant)}</span>
      <div className={styles.body}>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        <div className={styles.content}>{children}</div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement PitfallCallout.module.css**

```css
/* src/components/lesson/PitfallCallout.module.css
   Note-style callout. WCAG AA against --surface-1. */

.callout {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin: var(--space-6) 0;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--ink-300);
  background: var(--surface-1);
  font-family: var(--font-body);
}

.iconSlot {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--ink-700);
}

.body {
  flex: 1 1 auto;
}

.title {
  margin: 0 0 var(--space-2);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-body);
  color: var(--ink-900);
}

.content {
  font-size: var(--text-body);
  color: var(--ink-700);
  line-height: 1.6;
}

.content > :first-child {
  margin-top: 0;
}
.content > :last-child {
  margin-bottom: 0;
}

/* Variants */
.info {
  border-left-color: var(--accent);
}
.info .iconSlot {
  background: var(--accent-soft);
  color: var(--accent);
}

.warning {
  border-left-color: var(--warning);
}
.warning .iconSlot {
  background: color-mix(in srgb, var(--warning) 12%, var(--surface-1));
  color: var(--warning);
}

.pitfall {
  border-left-color: var(--danger);
}
.pitfall .iconSlot {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface-1));
  color: var(--danger);
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/lesson/__tests__/PitfallCallout.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/lesson/PitfallCallout.tsx src/components/lesson/PitfallCallout.module.css src/components/lesson/__tests__/PitfallCallout.test.tsx
git commit -m "feat(lesson): add PitfallCallout primitive"
```

---

## Task 4: ProcessDiagram component (server) + test

**Files:**

- Create: `src/components/lesson/ProcessDiagram.tsx`
- Create: `src/components/lesson/ProcessDiagram.module.css`
- Create: `src/components/lesson/__tests__/ProcessDiagram.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/lesson/__tests__/ProcessDiagram.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProcessDiagram } from "../ProcessDiagram";

describe("ProcessDiagram", () => {
  it("renders ordered list with step labels", () => {
    const html = renderToString(
      <ProcessDiagram
        id="work-loop"
        title="Your work loop"
        steps={[
          { id: "s1", label: "Read" },
          { id: "s2", label: "Decide" },
          { id: "s3", label: "Change" },
          { id: "s4", label: "Explain" },
        ]}
      />,
    );
    expect(html).toContain('id="work-loop"');
    expect(html).toContain("<ol");
    expect(html).toContain("Your work loop");
    expect(html).toContain("Read");
    expect(html).toContain("Decide");
    expect(html).toContain("Change");
    expect(html).toContain("Explain");
    expect(html).toContain('aria-label="Lesson process steps"');
  });

  it("renders hint when provided", () => {
    const html = renderToString(
      <ProcessDiagram
        id="hinted"
        title="Loop"
        steps={[{ id: "s1", label: "Step 1" }]}
        hint="A short note about the loop."
      />,
    );
    expect(html).toContain("A short note about the loop.");
  });

  it("rejects fewer than two steps at author time", () => {
    expect(() =>
      renderToString(
        <ProcessDiagram id="lone" title="Lone" steps={[{ id: "only", label: "Only" }]} />,
      ),
    ).toThrow(/at least 2 steps/i);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run src/components/lesson/__tests__/ProcessDiagram.test.tsx`
Expected: FAIL with import error.

- [ ] **Step 3: Implement ProcessDiagram.tsx**

```tsx
// src/components/lesson/ProcessDiagram.tsx
/**
 * ProcessDiagram — visual ordered-list of steps. CSS-only flow.
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
  hint?: string;
}

export function ProcessDiagram(props: ProcessDiagramProps): ReactElement {
  const { id, title, steps, hint } = props;
  if (steps.length < 2) {
    throw new Error("ProcessDiagram requires at least 2 steps.");
  }
  return (
    <figure id={id} className={styles.figure}>
      <figcaption className={styles.title}>{title}</figcaption>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <ol className={styles.list} aria-label="Lesson process steps">
        {steps.map((step, index) => (
          <li key={step.id} className={styles.item}>
            <span className={styles.bullet} aria-hidden="true">
              {index + 1}
            </span>
            <span className={styles.label}>{step.label}</span>
            {index < steps.length - 1 ? (
              <ArrowRight size={16} weight="bold" aria-hidden="true" className={styles.connector} />
            ) : null}
          </li>
        ))}
      </ol>
    </figure>
  );
}
```

- [ ] **Step 4: Implement ProcessDiagram.module.css**

```css
/* src/components/lesson/ProcessDiagram.module.css
   Ordered step row that wraps on mobile. */

.figure {
  margin: var(--space-6) 0;
  font-family: var(--font-body);
}

.title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-h3);
  margin: 0 0 var(--space-2);
  color: var(--ink-900);
}

.hint {
  font-size: var(--text-body-sm);
  color: var(--ink-500);
  margin: 0 0 var(--space-3);
}

.list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  padding: var(--space-3);
}

.item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-2);
  border-radius: var(--radius-sm);
  color: var(--ink-900);
}

.bullet {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.label {
  font-size: var(--text-body);
  font-weight: 500;
}

.connector {
  color: var(--ink-300);
  margin: 0 var(--space-1);
}

@media (max-width: 640px) {
  .list {
    flex-direction: column;
    align-items: stretch;
  }
  .connector {
    display: none;
  }
  .item + .item {
    border-top: 1px dashed var(--border);
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/lesson/__tests__/ProcessDiagram.test.tsx`
Expected: PASS (3/3).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/lesson/ProcessDiagram.tsx src/components/lesson/ProcessDiagram.module.css src/components/lesson/__tests__/ProcessDiagram.test.tsx
git commit -m "feat(lesson): add ProcessDiagram primitive"
```

---

## Task 5: SelfCheck component (client) + test

**Files:**

- Create: `src/components/lesson/SelfCheck.tsx`
- Create: `src/components/lesson/SelfCheck.module.css`
- Create: `src/components/lesson/__tests__/SelfCheck.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/lesson/__tests__/SelfCheck.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelfCheck } from "../SelfCheck";

describe("SelfCheck", () => {
  it("renders prompt and options", () => {
    render(
      <SelfCheck
        id="sc-1"
        prompt="Which metric answers 'how much per click'?"
        options={[
          { id: "a", label: "CPC" },
          { id: "b", label: "CTR" },
        ]}
        answer="a"
        explain="CPC is cost per click."
      />,
    );
    expect(screen.getByText(/how much per click/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CPC" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CTR" })).toBeInTheDocument();
  });

  it("marks correct answer green on submit", async () => {
    const user = userEvent.setup();
    render(
      <SelfCheck
        id="sc-2"
        prompt="Pick CPC."
        options={[
          { id: "a", label: "CPC" },
          { id: "b", label: "CTR" },
        ]}
        answer="a"
        explain="It's the cost per click."
      />,
    );
    await user.click(screen.getByRole("radio", { name: "CPC" }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText(/cost per click/i)).toBeInTheDocument();
  });

  it("marks incorrect answer red on submit", async () => {
    const user = userEvent.setup();
    render(
      <SelfCheck
        id="sc-3"
        prompt="Pick CPC."
        options={[
          { id: "a", label: "CPC" },
          { id: "b", label: "CTR" },
        ]}
        answer="a"
        explain="It's the cost per click."
      />,
    );
    await user.click(screen.getByRole("radio", { name: "CTR" }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it("does not persist selection across remounts", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <SelfCheck
        id="sc-4"
        prompt="Pick CPC."
        options={[
          { id: "a", label: "CPC" },
          { id: "b", label: "CTR" },
        ]}
        answer="a"
        explain="It's the cost per click."
      />,
    );
    await user.click(screen.getByRole("radio", { name: "CPC" }));
    unmount();
    render(
      <SelfCheck
        id="sc-4"
        prompt="Pick CPC."
        options={[
          { id: "a", label: "CPC" },
          { id: "b", label: "CTR" },
        ]}
        answer="a"
        explain="It's the cost per click."
      />,
    );
    expect(screen.getByRole("radio", { name: "CPC" })).not.toBeChecked();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm vitest run src/components/lesson/__tests__/SelfCheck.test.tsx`
Expected: FAIL with import error.

- [ ] **Step 3: Implement SelfCheck.tsx**

```tsx
// src/components/lesson/SelfCheck.tsx
"use client";

/**
 * SelfCheck — short, in-line "check your understanding" question.
 *
 * Client component. State is session-only; selection is NOT persisted
 * (no localStorage, no DB). On submit, the user sees whether they picked
 * the right answer along with the explanation. No grading, no XP, no analytics.
 */

import { useId, useState, type ReactElement } from "react";
import { CheckCircle, XCircle, ArrowClockwise } from "@phosphor-icons/react";
import styles from "./SelfCheck.module.css";

export interface SelfCheckOption {
  readonly id: string;
  readonly label: string;
}

export interface SelfCheckProps {
  id: string;
  prompt: string;
  options: readonly SelfCheckOption[];
  answer: string;
  explain: string;
}

type FeedbackState = "idle" | "correct" | "incorrect";

export function SelfCheck(props: SelfCheckProps): ReactElement {
  const { id, prompt, options, answer, explain } = props;
  const baseId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>("idle");

  const inputName = `${baseId}-${id}`;

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selected === null) return;
    setFeedback(selected === answer ? "correct" : "incorrect");
  }

  function onReset(): void {
    setSelected(null);
    setFeedback("idle");
  }

  return (
    <section
      id={id}
      className={`${styles.selfCheck} ${feedback !== "idle" ? styles[feedback] : ""}`}
      aria-labelledby={`${id}-prompt`}
    >
      <form onSubmit={onSubmit}>
        <h3 id={`${id}-prompt`} className={styles.prompt}>
          {prompt}
        </h3>
        <fieldset className={styles.fieldset}>
          <legend className="visually-hidden">Answer choices</legend>
          {options.map((option) => (
            <label key={option.id} className={styles.option}>
              <input
                type="radio"
                name={inputName}
                value={option.id}
                checked={selected === option.id}
                onChange={() => {
                  setSelected(option.id);
                  if (feedback !== "idle") setFeedback("idle");
                }}
                disabled={feedback === "correct"}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <div className={styles.actions}>
          {feedback === "idle" ? (
            <button type="submit" className={styles.submit} disabled={selected === null}>
              Check answer
            </button>
          ) : (
            <button type="button" className={styles.reset} onClick={onReset}>
              <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
              Try again
            </button>
          )}
        </div>
        {feedback === "correct" ? (
          <p className={styles.feedback} role="status">
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            <span>Correct. {explain}</span>
          </p>
        ) : null}
        {feedback === "incorrect" ? (
          <p className={styles.feedback} role="status">
            <XCircle size={18} weight="fill" aria-hidden="true" />
            <span>Not quite. {explain}</span>
          </p>
        ) : null}
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Implement SelfCheck.module.css**

```css
/* src/components/lesson/SelfCheck.module.css
   Workbook-style check box. Not a graded quiz. */

.selfCheck {
  margin: var(--space-6) 0;
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-1);
  font-family: var(--font-body);
}

.prompt {
  margin: 0 0 var(--space-4);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-body);
  color: var(--ink-900);
  line-height: 1.4;
}

.fieldset {
  border: 0;
  padding: 0;
  margin: 0 0 var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  cursor: pointer;
  font-size: var(--text-body);
  color: var(--ink-900);
}

.option:hover {
  border-color: var(--ink-300);
}

.option input[type="radio"] {
  flex: 0 0 auto;
  accent-color: var(--accent);
  width: 18px;
  height: 18px;
}

.option input[type="radio"]:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.options input[type="radio"]:disabled {
  cursor: default;
}

.actions {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.submit,
.reset {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: var(--surface-1);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-body-sm);
  cursor: pointer;
}

.submit:hover,
.reset:hover {
  background: color-mix(in srgb, var(--accent) 88%, var(--ink-900));
}

.submit:disabled {
  background: var(--surface-2);
  border-color: var(--border);
  color: var(--ink-500);
  cursor: not-allowed;
}

.reset {
  background: var(--surface-1);
  color: var(--accent);
  border: 1px solid var(--accent);
}

.reset:hover {
  background: var(--accent-soft);
}

.feedback {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-body-sm);
  line-height: 1.5;
}

.feedback svg {
  flex: 0 0 auto;
  margin-top: 2px;
}

.correct .feedback {
  background: color-mix(in srgb, var(--success) 12%, var(--surface-1));
  color: var(--success);
  border: 1px solid var(--success);
}

.incorrect .feedback {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface-1));
  color: var(--danger);
  border: 1px solid var(--danger);
}

/* After a correct answer, dim the wrong options for clarity */
.correct .option:has(input:not(:checked)) {
  opacity: 0.5;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/components/lesson/__tests__/SelfCheck.test.tsx`
Expected: PASS (4/4).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/lesson/SelfCheck.tsx src/components/lesson/SelfCheck.module.css src/components/lesson/__tests__/SelfCheck.test.tsx
git commit -m "feat(lesson): add SelfCheck primitive"
```

---

## Task 6: a11y tests for all lesson primitives

**Files:**

- Create: `src/components/lesson/__tests__/a11y.test.tsx`

- [ ] **Step 1: Confirm vitest-axe is installed**

Run: `pnpm ls vitest-axe`
Expected: shows `vitest-axe 0.1.0` or similar. If not present, install:

```bash
pnpm add -D vitest-axe @testing-library/jest-dom
```

If this changes `package.json` and `pnpm-lock.yaml`, commit them after the install.

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/lesson/__tests__/a11y.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TradeOffTable } from "../TradeOffTable";
import { PitfallCallout } from "../PitfallCallout";
import { ProcessDiagram } from "../ProcessDiagram";
import { SelfCheck } from "../SelfCheck";

describe("lesson primitives a11y", () => {
  it("TradeOffTable has no axe violations", async () => {
    const { container } = render(
      <TradeOffTable
        id="a11y-tot"
        title="The Big Six"
        pairs={[
          { label: "CPC", value: "Cost per click" },
          { label: "CTR", value: "Click-through rate" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("PitfallCallout has no axe violations", async () => {
    const { container } = render(
      <PitfallCallout id="a11y-pc" variant="warning" title="Watch out">
        <p>Body copy.</p>
      </PitfallCallout>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ProcessDiagram has no axe violations", async () => {
    const { container } = render(
      <ProcessDiagram
        id="a11y-pd"
        title="Loop"
        steps={[
          { id: "s1", label: "Read" },
          { id: "s2", label: "Decide" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SelfCheck has no axe violations", async () => {
    const { container } = render(
      <SelfCheck
        id="a11y-sc"
        prompt="Pick CPC."
        options={[
          { id: "a", label: "CPC" },
          { id: "b", label: "CTR" },
        ]}
        answer="a"
        explain="It's cost per click."
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm vitest run src/components/lesson/__tests__/a11y.test.tsx`
Expected: FAIL — vitest-axe may not be installed, or tests fail because `--extend-expect` is missing.

- [ ] **Step 4: Extend vitest setup to wire vitest-axe**

Modify `vitest.setup.ts` to add the matcher:

```ts
// vitest.setup.ts
// Add this import at the top
import "vitest-axe/extend-expect";
```

Keep the rest of the file unchanged.

- [ ] **Step 5: Re-run test, verify it passes**

Run: `pnpm vitest run src/components/lesson/__tests__/a11y.test.tsx`
Expected: PASS (4/4). If a violation fires, fix the underlying component (not the test).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/lesson/__tests__/a11y.test.tsx vitest.setup.ts package.json pnpm-lock.yaml
git commit -m "test(lesson): add a11y tests for lesson primitives"
```

---

## Task 7: MDX directive plugin (hand-rolled) + test

**Files:**

- Create: `src/lib/mdx/directive-plugin.ts`
- Create: `src/lib/mdx/__tests__/directive-plugin.test.ts`

- [ ] **Step 1: Confirm `remark-directive` is not in the lockfile**

Run: `grep -E "remark-directive|mdast-util-directive|micromark-extension-directive" pnpm-lock.yaml`
Expected: no matches. If any appear, stop and surface to the user — the spec said no new dependency.

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/mdx/__tests__/directive-plugin.test.ts
import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { directivePlugin, parseDirectiveAttrs } from "../directive-plugin";

// We test the plugin by running it on a parsed AST and verifying the
// directive paragraphs are converted to html nodes with data-amph-block.

function run(source: string) {
  const tree = unified().use(remarkParse).parse(source);
  unified().use(directivePlugin).runSync(tree);
  return tree;
}

describe("directivePlugin", () => {
  it("parseDirectiveAttrs parses quoted and unquoted values", () => {
    expect(parseDirectiveAttrs('id="x" title="Big Six"')).toEqual({
      id: "x",
      title: "Big Six",
    });
    expect(parseDirectiveAttrs('steps="A|B|C"')).toEqual({ steps: "A|B|C" });
  });

  it("converts :::trade-off paragraph to html node", () => {
    const tree = run(
      `:::trade-off{id="big-six" title="The Big Six" columns="A,B" rows="C,D;E,F"}\nColumn A\nColumn B\n:::`,
    );
    const node = tree.children[0] as any;
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="trade-off"');
    expect(node.value).toContain('data-amph-id="big-six"');
    expect(node.value).toContain('data-amph-title="The Big Six"');
    expect(node.value).toContain('data-amph-columns="A,B"');
  });

  it("converts :::process to html node", () => {
    const tree = run(
      `:::process{id="loop" title="Your work loop" steps="Read|Decide|Change|Explain"}`,
    );
    const node = tree.children[0] as any;
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="process"');
    expect(node.value).toContain('data-amph-steps="Read');
  });

  it("converts :::callout to html node with inner content", () => {
    const tree = run(`:::callout{variant="info" title="Note"}\nWatch this: prices will move.\n:::`);
    const node = tree.children[0] as any;
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="callout"');
    expect(node.value).toContain('data-amph-variant="info"');
    expect(node.value).toContain('data-amph-title="Note"');
    expect(node.value).toContain("prices will move");
  });

  it("leaves regular paragraphs alone", () => {
    const tree = run(`A plain paragraph with no directive.`);
    const node = tree.children[0] as any;
    expect(node.type).toBe("paragraph");
  });

  it("preserves leading paragraphs before a directive", () => {
    const tree = run(`Intro text.\n\n:::trade-off{id="x" title="T"}\nStuff\n:::`);
    expect(tree.children).toHaveLength(2);
    expect((tree.children[0] as any).type).toBe("paragraph");
    expect((tree.children[1] as any).type).toBe("html");
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm vitest run src/lib/mdx/__tests__/directive-plugin.test.ts`
Expected: FAIL with import error.

- [ ] **Step 4: Implement directive-plugin.ts**

```ts
// src/lib/mdx/directive-plugin.ts
/**
 * directivePlugin — hand-rolled remark plugin for `:::name{...}` fences.
 *
 * Why hand-rolled: `remark-directive` is not in `pnpm-lock.yaml`, and the spec
 * forbids adding a new dependency. The plugin supports three blocks:
 *   :::trade-off{id="..." title="..." columns="A,B" rows="A,B;C,D"}
 *   :::process{id="..." title="..." steps="A|B|C" hint="..."}
 *   :::callout{variant="info|warning|pitfall" title="..."}body:::
 *
 * Scope: a directive must occupy an entire paragraph. This matches the
 * common case (a block on its own line) and is the same constraint that
 * remark-directive has for the simplest form.
 *
 * Output: the directive paragraph is replaced with an `html` node whose
 * value is a <div data-amph-block="..."> with all attributes serialized as
 * data-amph-* attributes. The renderer (LessonContent.tsx) maps div with
 * data-amph-block to the appropriate React component.
 */

import { visit } from "unist-util-visit";
import type { Root, Html, Paragraph, Text } from "mdast";

const FENCE_OPEN = /^:::([a-z-]+)(?:\{([^}]*)\})?\s*$/;
const FENCE_CLOSE = /^:::\s*$/;

export function parseDirectiveAttrs(s: string): Record<string, string> {
  if (!s) return {};
  const result: Record<string, string> = {};
  const re = /([a-zA-Z][\w-]*)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[m[1]] = value;
  }
  return result;
}

function attrsToData(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => `data-amph-${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
}

export function directivePlugin() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.children.length !== 1) return;
      const child = node.children[0];
      if (child.type !== "text") return;
      const lines = (child as Text).value.split(/\n/);
      const openMatch = lines[0].match(FENCE_OPEN);
      if (!openMatch) return;
      const name = openMatch[1];
      const attrs = parseDirectiveAttrs(openMatch[2] ?? "");
      let closeIdx = -1;
      for (let i = lines.length - 1; i > 0; i--) {
        if (FENCE_CLOSE.test(lines[i])) {
          closeIdx = i;
          break;
        }
      }
      if (closeIdx === -1) return;
      const inner = lines.slice(1, closeIdx).join("\n");
      const attrsSerialized = attrsToData(attrs);
      const innerHtml = inner ? `<div>${inner.replace(/</g, "&lt;")}</div>` : "";
      const replacement: Html = {
        type: "html",
        value: `<div data-amph-block="${name}" ${attrsSerialized}>${innerHtml}</div>`,
      } as unknown as Html;
      (parent.children as unknown[])[index] = replacement;
    });
  };
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `pnpm vitest run src/lib/mdx/__tests__/directive-plugin.test.ts`
Expected: PASS (6/6).

- [ ] **Step 6: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS. If `unified` or `unist-util-visit` are not direct deps, add them:

```bash
pnpm add -D unified unist-util-visit
```

Re-run typecheck; commit `package.json` and `pnpm-lock.yaml` if changed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mdx/directive-plugin.ts src/lib/mdx/__tests__/directive-plugin.test.ts package.json pnpm-lock.yaml
git commit -m "feat(mdx): add directive plugin for :::trade-off, :::process, :::callout"
```

---

## Task 8: Extend LessonContent renderer to recognize blocks

**Files:**

- Modify: `src/app/courses/[slug]/lessons/LessonContent.tsx`
- Modify: `src/app/courses/[slug]/lessons/LessonContent.module.css`
- Modify: `src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx`

- [ ] **Step 1: Read the current renderer**

Read `src/app/courses/[slug]/lessons/LessonContent.tsx` and locate the `components` mapping passed to `react-markdown`. Confirm the import path for `react-markdown` and `remark-gfm`.

- [ ] **Step 2: Write the failing test**

```tsx
// src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx
// Add new tests to the existing test file. Keep existing tests, append.
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { LessonContent } from "../LessonContent";

describe("LessonContent renderer", () => {
  it("renders :::trade-off as TradeOffTable", () => {
    const source = `:::trade-off{id="big-six" title="The Big Six" pairs="CPC,Cost per click;CTR,Click-through rate"}`;
    const { container } = render(<LessonContent source={source} />);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.textContent).toContain("Cost per click");
  });

  it("renders :::process as ProcessDiagram", () => {
    const source = `:::process{id="loop" title="Loop" steps="Read|Decide|Change|Explain"}`;
    const { container } = render(<LessonContent source={source} />);
    expect(container.querySelector("ol")).toBeInTheDocument();
    expect(container.textContent).toContain("Read");
    expect(container.textContent).toContain("Explain");
  });

  it("renders :::callout as PitfallCallout", () => {
    const source = `:::callout{variant="warning" title="Be careful"}\nWatch this.\n:::`;
    const { container } = render(<LessonContent source={source} />);
    expect(container.querySelector('aside[role="note"]')).toBeInTheDocument();
    expect(container.textContent).toContain("Be careful");
    expect(container.textContent).toContain("Watch this");
  });

  it("renders plain markdown unchanged", () => {
    const source = `A regular paragraph with **bold** text.`;
    const { container } = render(<LessonContent source={source} />);
    expect(container.querySelector("strong")).toBeInTheDocument();
    expect(container.querySelector("table")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm vitest run src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx`
Expected: FAIL — the new tests don't yet recognize directive HTML.

- [ ] **Step 4: Add `directivePlugin` to the remark pipeline**

Open `src/app/courses/[slug]/lessons/LessonContent.tsx`. Find the existing `remarkPlugins` array (or where `react-markdown` is configured). Add `directivePlugin` to it:

```tsx
import { directivePlugin } from "@/lib/mdx/directive-plugin";
// ...

// In the ReactMarkdown component's remarkPlugins prop:
remarkPlugins={[remarkGfm, directivePlugin]}
```

If `remarkPlugins` is not yet an array, configure it as one.

- [ ] **Step 5: Add component mappings for `data-amph-block` divs**

In the same file, find the `components` prop of `ReactMarkdown`. Add a `div` mapper that reads `data-amph-block` and renders the appropriate primitive:

```tsx
import { TradeOffTable } from "@/components/lesson/TradeOffTable";
import { ProcessDiagram } from "@/components/lesson/ProcessDiagram";
import { PitfallCallout } from "@/components/lesson/PitfallCallout";
// ...

function parsePairs(raw: string): { label: string; value: string }[] {
  return raw.split(";").map((pair) => {
    const [label, value] = pair.split(",").map((s) => s.trim());
    return { label: label ?? "", value: value ?? "" };
  });
}

function renderAmphDiv(props: any) {
  const block = props["data-amph-block"];
  if (block === "trade-off") {
    const pairs = parsePairs(props["data-amph-pairs"] ?? "");
    const columns = props["data-amph-columns"]
      ? props["data-amph-columns"].split(",").map((s: string) => s.trim())
      : undefined;
    const rows = props["data-amph-rows"] ? parsePairs(props["data-amph-rows"]) : undefined;
    return (
      <TradeOffTable
        id={props["data-amph-id"]}
        title={props["data-amph-title"]}
        caption={props["data-amph-caption"]}
        columns={columns}
        rows={rows}
        pairs={pairs.length > 0 ? pairs : undefined}
      />
    );
  }
  if (block === "process") {
    const labels = (props["data-amph-steps"] ?? "").split("|").map((s: string) => s.trim());
    const steps = labels.filter(Boolean).map((label: string, i: number) => ({
      id: `step-${i + 1}`,
      label,
    }));
    return (
      <ProcessDiagram
        id={props["data-amph-id"]}
        title={props["data-amph-title"]}
        steps={steps}
        hint={props["data-amph-hint"]}
      />
    );
  }
  if (block === "callout") {
    const innerText = props.children?.toString() ?? "";
    return (
      <PitfallCallout
        id={props["data-amph-id"] ?? "callout"}
        variant={props["data-amph-variant"] ?? "info"}
        title={props["data-amph-title"]}
      >
        {innerText}
      </PitfallCallout>
    );
  }
  return <div {...props} />;
}

const components = {
  // ... existing
  div: renderAmphDiv,
};
```

If the file already has a `components` object, merge `div` into it. If `div` is mapped elsewhere, replace it.

- [ ] **Step 6: Run the new tests, verify they pass**

Run: `pnpm vitest run src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx`
Expected: PASS — all new tests pass.

- [ ] **Step 7: Run the full lesson-related suite**

Run: `pnpm vitest run src/components/lesson src/lib/mdx src/app/courses/[slug]/lessons`
Expected: PASS for all.

- [ ] **Step 8: Run typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/courses/[slug]/lessons/LessonContent.tsx src/app/courses/[slug]/lessons/LessonContent.module.css src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx
git commit -m "feat(lesson): render trade-off, process, callout blocks in lessons"
```

---

## Task 9: Apply blocks to Lesson 1.1 (Read PPC data before you change it)

**Files:**

- Modify: `content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx`

- [ ] **Step 1: Read the existing lesson**

Read `content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx` to find the location where the new "active practice" section should be inserted. Best practice: insert right before the closing `## Check your understanding` if present, or right after the Big Six table.

- [ ] **Step 2: Add a TradeOffTable rendering of "The Big Six"**

If the lesson already uses a markdown table for "The Big Six", replace it with the directive block. Otherwise, append the following block at the end of the "Big Six" section:

```md
:::trade-off{id="big-six" title="The Big Six metrics" pairs="CPC,How much per click;CTR,Share of impressions that become clicks;Conversion rate,Share of clicks that buy;ACoS,Ad spend as a share of ad sales;ROAS,Sales returned per peso spent;TACoS,Ad spend as a share of total store sales"}
:::
```

- [ ] **Step 3: Add a ProcessDiagram for the work loop**

After the Big Six block, add:

```md
:::process{id="work-loop" title="Your work loop" steps="Read|Decide|Change|Explain" hint="Same loop. Every change. Every week."}
:::
```

- [ ] **Step 4: Add a SelfCheck prompt**

After the work loop, add:

```jsx
<SelfCheck
  id="sc-1-1"
  prompt="Which metric answers 'how much you earn back per peso spent on ads'?"
  answer="e"
  options={[
    { id: "a", label: "CPC" },
    { id: "b", label: "CTR" },
    { id: "c", label: "ACoS" },
    { id: "d", label: "TACoS" },
    { id: "e", label: "ROAS" },
  ]}
  explain="ROAS is Sales divided by Ad Spend. ACoS is the inverse; TACoS is total store sales, not just ad sales."
/>
```

- [ ] **Step 5: Run the lesson validator**

Run: `pnpm validate:lesson-production content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx`
Expected: PASS. If the validator complains about the new blocks, see Task 14.

- [ ] **Step 6: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx
git commit -m "docs(curriculum): add active-practice blocks to lesson 1.1"
```

---

## Task 10: Apply blocks to Lesson 1.2 (CPC + CTR)

**Files:**

- Modify: `content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx`

- [ ] **Step 1: Read the existing lesson**

Read `content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx` and find the natural insertion point. The lesson is about CPC and CTR; the blocks surface the contrast between them.

- [ ] **Step 2: Add a TradeOffTable that contrasts CPC and CTR**

Append at the end of the "What CPC and CTR tell you" section (or wherever the lesson introduces both metrics):

```md
:::trade-off{id="cpc-vs-ctr" title="CPC vs CTR" pairs="CPC,Average cost per click (higher means you pay more per click);CTR,Share of impressions that become clicks (higher means your ad is more interesting)"}
:::
```

- [ ] **Step 3: Add a PitfallCallout**

After the trade-off, add:

```md
:::callout{variant="pitfall" title="Don't read CTR in isolation"}
A high CTR with a low conversion rate means the ad attracts clicks but doesn't buy. CTR is a top-of-funnel signal. Always pair it with conversion rate and ACoS.
:::
```

- [ ] **Step 4: Add a SelfCheck prompt**

```jsx
<SelfCheck
  id="sc-1-2"
  prompt="Your CPC rose 20% this week. What does CPC alone tell you?"
  answer="b"
  options={[
    { id: "a", label: "The ad is performing worse" },
    {
      id: "b",
      label: "Clicks now cost more; whether that's bad depends on what buyers do after the click",
    },
    { id: "c", label: "Sales dropped" },
    { id: "d", label: "The campaign is failing" },
  ]}
  explain="CPC measures cost, not outcome. Always pair CPC with conversion rate and ACoS before declaring a campaign healthy or sick."
/>
```

- [ ] **Step 5: Run validator and tests**

Run: `pnpm validate:lesson-production content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content/curriculum/modules/1-foundations/1.2-cpc-ctr.mdx
git commit -m "docs(curriculum): add active-practice blocks to lesson 1.2"
```

---

## Task 11: Apply blocks to Lesson 1.3 (ACoS / TACoS / profitability)

**Files:**

- Modify: `content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx`

- [ ] **Step 1: Read the existing lesson**

Read `content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx`. Find the section that introduces the three profitability metrics.

- [ ] **Step 2: Add a TradeOffTable**

```md
:::trade-off{id="acos-tacos-roas" title="ACoS vs TACoS vs ROAS" pairs="ACoS,Ad spend divided by ad sales (lower is better, campaign-level);TACoS,Ad spend divided by total store sales (lower is better, account-level);ROAS,Ad sales divided by ad spend (higher is better, the inverse of ACoS)"}
:::
```

- [ ] **Step 3: Add a ProcessDiagram for the profitability decision**

```md
:::process{id="profit-decide" title="Decide if a campaign is profitable" steps="Compute ACoS|Look at TACoS|Compare to break-even|Make a call" hint="ACoS alone lies. TACoS places the spend in context."}
:::
```

- [ ] **Step 4: Add a PitfallCallout**

```md
:::callout{variant="warning" title="Low ACoS is not always good"}
A 5% ACoS on a campaign that drives 1% of total sales is vanity. Always check TACoS and revenue contribution, not just ACoS.
:::
```

- [ ] **Step 5: Add a SelfCheck prompt**

```jsx
<SelfCheck
  id="sc-1-3"
  prompt="Which pair gives the cleanest signal of whether ads are profitable for the account as a whole?"
  answer="c"
  options={[
    { id: "a", label: "ACoS only" },
    { id: "b", label: "ROAS only" },
    { id: "c", label: "ACoS plus TACoS" },
    { id: "d", label: "CPC plus CTR" },
  ]}
  explain="ACoS shows campaign efficiency; TACoS shows ads' share of total revenue. Together they answer 'are ads profitable for the account.'"
/>
```

- [ ] **Step 6: Run validator and tests**

Run: `pnpm validate:lesson-production content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add content/curriculum/modules/1-foundations/1.3-acos-tacos-profitability.mdx
git commit -m "docs(curriculum): add active-practice blocks to lesson 1.3"
```

---

## Task 12: Apply blocks to Lesson 1.4 (ROAS)

**Files:**

- Modify: `content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx`

- [ ] **Step 1: Read the existing lesson**

Read `content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx`. Find the section where ROAS is defined.

- [ ] **Step 2: Add a TradeOffTable for ROAS interpretations**

```md
:::trade-off{id="roas-bands" title="Reading ROAS bands" pairs="ROAS 1,You break even on ad spend (no profit, no loss);ROAS 3,A common short-term target for new products;ROAS 5 plus,Strong return; usually signals a winner"}
:::
```

- [ ] **Step 3: Add a PitfallCallout**

```md
:::callout{variant="info" title="ROAS is not profit"}
ROAS returns ad sales, not net profit. A ROAS of 5 with a 30% cost of goods still leaves you with margins to check.
:::
```

- [ ] **Step 4: Add a SelfCheck prompt**

```jsx
<SelfCheck
  id="sc-1-4"
  prompt="A product has 25% margin after fees. What ROAS keeps you at break-even on contribution margin?"
  answer="d"
  options={[
    { id: "a", label: "ROAS 1" },
    { id: "b", label: "ROAS 2" },
    { id: "c", label: "ROAS 3" },
    { id: "d", label: "ROAS 4" },
  ]}
  explain="Break-even ROAS equals 1 divided by margin. With 25% margin, that's 1 / 0.25 = 4. Below 4, you lose money on every sale."
/>
```

- [ ] **Step 5: Run validator and tests**

Run: `pnpm validate:lesson-production content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx && pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx
git commit -m "docs(curriculum): add active-practice blocks to lesson 1.4"
```

---

## Task 13: Apply blocks to Lesson 1.5 (Metrics in practice)

**Files:**

- Modify: `content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx`

- [ ] **Step 1: Read the existing lesson**

Read `content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx`. Find the section that synthesizes the previous four lessons.

- [ ] **Step 2: Add a ProcessDiagram for the weekly metric review**

```md
:::process{id="weekly-review" title="Weekly metric review" steps="Pull the Big Six|Compare to last week|Spot anomalies|Decide which to act on|Log the decision" hint="If you can't name the decision, you didn't actually review."}
:::
```

- [ ] **Step 3: Add a TradeOffTable for what to look at first**

```md
:::trade-off{id="what-first" title="Which metric to look at first" pairs="Conversion rate gone down,Check the listing and the price first;CTR gone down,Check the creative and the keyword;ACoS gone up but TACoS stable,The campaign mix shifted; both ACoS and TACoS up,Account-level problem"}
:::
```

- [ ] **Step 4: Add a PitfallCallout**

```md
:::callout{variant="pitfall" title="Don't change five things at once"}
Stack ranking helps. Change one bid, one keyword, or one creative at a time. Wait 7 days. Compare. Otherwise you can't tell what worked.
:::
```

- [ ] **Step 5: Add a SelfCheck prompt**

```jsx
<SelfCheck
  id="sc-1-5"
  prompt="ACoS rose 30% this week. TACoS is flat. What is the most likely cause?"
  answer="b"
  options={[
    { id: "a", label: "A competitor drove up CPC across the account" },
    { id: "b", label: "Your campaign mix shifted toward higher-ACoS campaigns" },
    { id: "c", label: "Organic sales dropped" },
    { id: "d", label: "Your account is failing" },
  ]}
  explain="If TACoS is flat, the account-level spend share is unchanged. The shift must be inside the mix — campaigns rebalancing toward higher-ACoS targets."
/>
```

- [ ] **Step 6: Run validator and tests**

Run: `pnpm validate:lesson-production content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx
git commit -m "docs(curriculum): add active-practice blocks to lesson 1.5"
```

---

## Task 14: Extend validate-lesson-production to assert block shape

**Files:**

- Modify: `scripts/validate-lesson-production.ts`

- [ ] **Step 1: Read the existing validator**

Read `scripts/validate-lesson-production.ts`. Find where lesson files are scanned and where existing checks (e.g., heading structure, voice) are enforced.

- [ ] **Step 2: Add a `validateActivePracticeBlocks` function**

Append the following function to `scripts/validate-lesson-production.ts` (before the existing `main` function):

```ts
import { parseDirectiveAttrs } from "../src/lib/mdx/directive-plugin";

interface BlockIssue {
  file: string;
  line: number;
  message: string;
}

function validateActivePracticeBlocks(source: string, file: string): BlockIssue[] {
  const issues: BlockIssue[] = [];
  const lines = source.split(/\r?\n/);
  const idPattern = /^[a-z][a-z0-9-]*$/;
  const seenIds = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const openMatch = line.match(/^:::([a-z-]+)(?:\{([^}]*)\})?\s*$/);
    if (!openMatch) continue;
    const name = openMatch[1];
    const attrs = parseDirectiveAttrs(openMatch[2] ?? "");
    const lineNo = i + 1;

    // Block must be recognized
    if (!["trade-off", "process", "callout"].includes(name)) {
      issues.push({ file, line: lineNo, message: `Unknown directive block: ${name}` });
    }

    // id required, lowercase kebab, unique per lesson
    const id = attrs.id;
    if (!id) {
      issues.push({ file, line: lineNo, message: `${name} is missing required 'id' attribute` });
    } else if (!idPattern.test(id)) {
      issues.push({
        file,
        line: lineNo,
        message: `${name} id '${id}' must be lowercase kebab-case`,
      });
    } else if (seenIds.has(id)) {
      issues.push({ file, line: lineNo, message: `Duplicate block id '${id}' in lesson` });
    } else {
      seenIds.add(id);
    }

    // trade-off requires title plus pairs or rows
    if (name === "trade-off") {
      if (!attrs.title) {
        issues.push({ file, line: lineNo, message: "trade-off requires a 'title' attribute" });
      }
      if (!attrs.pairs && !attrs.rows) {
        issues.push({ file, line: lineNo, message: "trade-off requires 'pairs' or 'rows'" });
      }
    }
    // process requires title and steps
    if (name === "process") {
      if (!attrs.title) {
        issues.push({ file, line: lineNo, message: "process requires a 'title' attribute" });
      }
      if (!attrs.steps) {
        issues.push({ file, line: lineNo, message: "process requires a 'steps' attribute" });
      } else {
        const steps = attrs.steps
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);
        if (steps.length < 2) {
          issues.push({ file, line: lineNo, message: "process needs at least 2 steps" });
        }
      }
    }
    // callout requires variant
    if (name === "callout") {
      const variant = attrs.variant ?? "info";
      if (!["info", "warning", "pitfall"].includes(variant)) {
        issues.push({
          file,
          line: lineNo,
          message: `callout variant must be info|warning|pitfall, got ${variant}`,
        });
      }
    }
  }

  // Voice check: no em dashes in block content
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^:::|:::$/) && lines[i].includes("\u2014")) {
      issues.push({
        file,
        line: i + 1,
        message: "Block content uses em-dash; voice guide forbids it",
      });
    }
  }

  return issues;
}
```

- [ ] **Step 3: Wire the validator into the main loop**

In the existing `main` function (or wherever lesson files are processed), after the existing checks, call the new validator:

```ts
// Inside the per-file check loop, after the existing checks:
const source = readFileSync(filePath, "utf8");
const blockIssues = validateActivePracticeBlocks(source, filePath);
for (const issue of blockIssues) {
  console.error(`[${issue.file}:${issue.line}] ${issue.message}`);
  process.exitCode = 1;
}
```

- [ ] **Step 4: Run the validator against the curriculum**

Run: `pnpm validate:lesson-production`
Expected: PASS for all lessons. If a Module 1 lesson fails, fix the content (do not weaken the validator).

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-lesson-production.ts
git commit -m "feat(validator): validate active-practice block shape and IDs"
```

---

## Task 15: Write the AUTHORING.md lesson-block guide

**Files:**

- Create: `content/curriculum/AUTHORING.md`

- [ ] **Step 1: Create the file**

Create `content/curriculum/AUTHORING.md` with the following content:

````markdown
# Lesson block authoring

This is the contract for adding active-practice blocks to MDX lessons. The
renderer module (`src/app/courses/[slug]/lessons/LessonContent.tsx`) recognizes
three fence blocks and one JSX component.

## When to use what

- `TradeOffTable` — when two or more concepts deserve a side-by-side comparison
  (definitions, scenarios, before/after, metric bands).
- `ProcessDiagram` — when a sequence of steps is the whole point (read-decide-change-explain,
  weekly review, decide-if-profitable).
- `PitfallCallout` — when a learner will likely misread the lesson without a warning
  (don't read CTR in isolation, low ACoS is not always good).
- `SelfCheck` — end-of-section "check your understanding" prompt. Use sparingly.
  One per lesson at most. Two if the lesson is long.

Decision rule: if you can do it with a heading and a paragraph, do not reach
for a block. Blocks exist because the type or the layout earns them.

## Block 1: TradeOffTable

```md
:::trade-off{id="big-six" title="The Big Six metrics" pairs="CPC,How much per click;CTR,Share of impressions that become clicks;ACoS,Ad spend as a share of ad sales;ROAS,Sales returned per peso spent;TACoS,Ad spend as a share of total store sales"}
:::
```
````

Attributes:

- `id` (required): lowercase kebab, unique within the lesson.
- `title` (required): the question or topic the table answers.
- `caption` (optional): a small uppercase line above the table.
- `pairs` (optional): semicolon-separated `label,value` pairs for the simple form.
- `rows` (optional): semicolon-separated `label,value` pairs (same format as `pairs`).
- `columns` (optional): comma-separated column headers for the rectangular form.

Use `pairs` for two-column "what each tells you" tables. Use `rows`/`columns`
only when you genuinely need more than two columns (rare).

## Block 2: ProcessDiagram

```md
:::process{id="work-loop" title="Your work loop" steps="Read|Decide|Change|Explain" hint="Same loop. Every change. Every week."}
:::
```

Attributes:

- `id` (required): lowercase kebab, unique within the lesson.
- `title` (required): the name of the loop or sequence.
- `steps` (required): pipe-separated list of short labels. Minimum 2, ideally 3 to 6.
- `hint` (optional): one short sentence (under 100 chars) shown above the diagram.

Each step should be a verb or imperative. If a step needs more than four words,
it belongs in a paragraph, not in a process.

## Block 3: PitfallCallout

```md
:::callout{variant="warning" title="Don't read CTR in isolation"}
A high CTR with a low conversion rate means the ad attracts clicks but doesn't buy.
:::
```

Attributes:

- `id` (required): lowercase kebab, unique within the lesson.
- `variant` (optional, default `info`): one of `info | warning | pitfall`.
  - `info` — neutral note.
  - `warning` — something to watch out for.
  - `pitfall` — common mistake to avoid.
- `title` (optional): short label (under 60 chars).

The body is regular markdown. Keep it under three short paragraphs.

## Block 4: SelfCheck (JSX)

```jsx
<SelfCheck
  id="sc-1-1"
  prompt="Which metric answers 'how much you earn back per peso spent on ads'?"
  answer="e"
  options={[
    { id: "a", label: "CPC" },
    { id: "b", label: "CTR" },
    { id: "c", label: "ACoS" },
    { id: "d", label: "TACoS" },
    { id: "e", label: "ROAS" },
  ]}
  explain="ROAS is Sales divided by Ad Spend. ACoS is the inverse; TACoS is total store sales, not just ad sales."
/>
```

Props:

- `id` (required): lowercase kebab, unique within the lesson.
- `prompt` (required): the question. One sentence.
- `options` (required): 2 to 6 options. Each has a `label` and a single-letter `id`.
- `answer` (required): the `id` of the correct option.
- `explain` (required): one or two sentences. Shown after the user submits.

SelfCheck is formative only. We do not record the result. We do not grade.

## Voice reminders

- No em dashes. Use periods, commas, parentheses.
- No AI-slop phrases. See `docs/voice-guide.md`.
- Direct, plain-spoken, Filipino VA audience.
- Money in PHP (`₱`). Never `$`.

````

- [ ] **Step 2: Reference AUTHORING.md in content/README.md**

Find the README at `content/README.md` and add a new line near the top:

```markdown
- For lesson block syntax (TradeOffTable, ProcessDiagram, PitfallCallout, SelfCheck), see [AUTHORING.md](./AUTHORING.md).
````

- [ ] **Step 3: Run lint to ensure the new MDX hint typechecks**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add content/curriculum/AUTHORING.md content/README.md
git commit -m "docs(curriculum): add AUTHORING.md for lesson block syntax"
```

---

## Task 16: Write the component-primitives story

**Files:**

- Create: `docs/stories/STORY-<next-available>-component-primitives.md`

Before writing, choose the next story ID at PR-open time. The current highest
story ID in `docs/stories/` is the previous number plus one. Use that ID.

- [ ] **Step 1: Read the story ID convention**

List `docs/stories/` to find the highest existing ID. The new stories will use
the next two IDs.

- [ ] **Step 2: Write the story file**

```markdown
# Story <NEXT_ID>: Active-lesson component primitives

## Status

Done (in this PR).

## Context

LEARN-020 to LEARN-029 (the active-practice contract) called for tables,
diagrams, callouts, and a "check your understanding" prompt. The renderer
already imports `react-markdown` + `remark-gfm`, but ships no blocks. This
story adds four shippable primitives plus the directive plumbing.

## What ships

- `src/components/lesson/TradeOffTable.tsx` — server-rendered table with
  `pairs` and `columns + rows` forms. Native `<table>` for a11y.
- `src/components/lesson/ProcessDiagram.tsx` — server-rendered ordered list
  with circular number badges and a connector arrow. Wraps on mobile.
- `src/components/lesson/PitfallCallout.tsx` — server-rendered `<aside
role="note">` with `info`, `warning`, and `pitfall` variants. Phosphor icons.
- `src/components/lesson/SelfCheck.tsx` — client component with session-only
  state. No persistence.
- `src/lib/mdx/directive-plugin.ts` — hand-rolled remark plugin. No new
  dependency. Emits `<div data-amph-block="...">` HTML nodes.
- `src/app/courses/[slug]/lessons/LessonContent.tsx` — extended with the
  directive plugin and a `data-amph-block` div mapper.

## Non-goals

- Grading, XP, leaderboard, analytics events.
- A new domain entity, a new port method, a new simulator.
- New public claims.
- A new external dependency. The plugin is hand-rolled.

## Acceptance criteria

- All four components render to clean HTML (no console errors).
- All four components pass `vitest-axe` zero-violation tests.
- The directive plugin parses `:::trade-off`, `:::process`, `:::callout`
  fences and turns them into the right React element.
- The renderer integration test passes (LessonContent.test.tsx).
- ESLint, typecheck, and `pnpm test` all pass.

## Definition of Done

- [ ] Code reviewed.
- [ ] Tests added or updated.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.
- [ ] Five small commits (one per component plus the renderer + plugin).
- [ ] `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` updated.
- [ ] `FEATURES.md` updated.
- [ ] `CHANGELOG.md` updated.
```

- [ ] **Step 3: Commit**

```bash
git add docs/stories/STORY-<next-id>-component-primitives.md
git commit -m "docs(story): add component primitives story"
```

---

## Task 17: Write the Module 1 active-pass story

**Files:**

- Create: `docs/stories/STORY-<next-available+1>-module-1-active-pass.md`

- [ ] **Step 1: Write the story file**

```markdown
# Story <NEXT_ID + 1>: Module 1 active-practice pass

## Status

Done (in this PR).

## Context

Module 1 (Foundations) teaches the Big Six metrics. With the new primitives
shippable, this story applies them to the five Module 1 lessons. Each lesson
gets one SelfCheck prompt and at least one of: TradeOffTable, ProcessDiagram,
or PitfallCallout.

## What ships

- Updated `content/curriculum/modules/1-foundations/1.1-...mdx`.
- Updated `content/curriculum/modules/1-foundations/1.2-...mdx`.
- Updated `content/curriculum/modules/1-foundations/1.3-...mdx`.
- Updated `content/curriculum/modules/1-foundations/1.4-...mdx`.
- Updated `content/curriculum/modules/1-foundations/1.5-...mdx`.
- New `content/curriculum/AUTHORING.md`.
- Extended `scripts/validate-lesson-production.ts`.

## Acceptance criteria

- One `SelfCheck` per lesson.
- At least one visual block per lesson (TradeOffTable, ProcessDiagram, or
  PitfallCallout).
- All lessons pass `pnpm validate:lesson-production`.
- All lessons load in the dev server with the new blocks visible.

## Definition of Done

- [ ] All five lessons committed.
- [ ] Validator exits clean.
- [ ] `pnpm test` and `pnpm validate:lesson-production` pass.
- [ ] Manual smoke test in the dev server (Module 1 lessons).
```

- [ ] **Step 2: Commit**

```bash
git add docs/stories/STORY-<next-id+1>-module-1-active-pass.md
git commit -m "docs(story): add module 1 active-pass story"
```

---

## Task 18: Playwright E2E for lesson blocks

**Files:**

- Create: `tests/e2e/lesson-blocks.spec.ts`

- [ ] **Step 1: Confirm Playwright config covers `tests/e2e/`**

Read `playwright.config.ts`. Confirm `tests/e2e/` is in the test glob. If not, add it.

- [ ] **Step 2: Write the failing test**

```ts
// tests/e2e/lesson-blocks.spec.ts
import { test, expect } from "@playwright/test";

const TEST_LESSON = "/courses/foundations/lessons/1.1-read-ppc-data-before-you-change-it";

test.describe("Lesson blocks", () => {
  test("renders a TradeOffTable on lesson 1.1", async ({ page }) => {
    await page.goto(TEST_LESSON);
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByText("Big Six")).toBeVisible();
  });

  test("renders a ProcessDiagram on lesson 1.1", async ({ page }) => {
    await page.goto(TEST_LESSON);
    await expect(page.getByRole("list").filter({ hasText: "Read" }).first()).toBeVisible();
  });

  test("SelfCheck submits and shows feedback", async ({ page }) => {
    await page.goto(TEST_LESSON);
    await page.getByRole("radio", { name: "ROAS" }).check();
    await page.getByRole("button", { name: /check answer/i }).click();
    await expect(page.getByText(/correct/i)).toBeVisible();
  });

  test("PitfallCallout renders on lesson 1.2", async ({ page }) => {
    await page.goto("/courses/foundations/lessons/1.2-cpc-ctr");
    await expect(page.getByRole("note").first()).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the test against a running dev server**

In one terminal: `pnpm dev`
In another: `pnpm test:e2e tests/e2e/lesson-blocks.spec.ts`
Expected: PASS.

If the lesson slugs differ, update the test paths to match the actual
`src/app/courses/.../route.ts` paths.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/lesson-blocks.spec.ts
git commit -m "test(e2e): add lesson-blocks Playwright suite"
```

---

## Task 19: Docs sync and final validation

**Files:**

- Modify: `docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`
- Modify: `FEATURES.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`

- [ ] **Step 1: Update LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md**

Find the LEARN-020 to LEARN-029 entries. Append a new line under each:

```markdown
- LEARN-020: ... (done)
- LEARN-021: ... (done)
- ...
- LEARN-029: ... (done)
```

If the file uses a table, change the row's status column to `Done` and add a `Notes` field pointing to the new active-practice pass.

- [ ] **Step 2: Update FEATURES.md**

Find the row for "Active practice block primitives" (or add a new row). Set the status column to `Shipped` and link to the two new stories.

- [ ] **Step 3: Update CHANGELOG.md**

Add a new entry under the unreleased section:

```markdown
### Added

- Active lesson primitives: `TradeOffTable`, `ProcessDiagram`, `PitfallCallout`, `SelfCheck`. Module 1 lessons now include at least one of each where the lesson earns it.
- New `content/curriculum/AUTHORING.md` for the block syntax.
- Hand-rolled remark directive plugin (`src/lib/mdx/directive-plugin.ts`) to parse `:::trade-off`, `:::process`, `:::callout` fences. No new external dependency.
```

- [ ] **Step 4: Update STUDENT-FEATURE-GAP-ANALYSIS.md**

If the gap analysis mentions "missing active-practice blocks" or similar, mark it as `Fixed` with a link to the new stories.

- [ ] **Step 5: Run the full validation gauntlet**

Run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm validate:lesson-production
pnpm validate:curriculum
```

Expected: all PASS.

- [ ] **Step 6: Run the production build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md FEATURES.md CHANGELOG.md docs/STUDENT-FEATURE-GAP-ANALYSIS.md
git commit -m "docs: sync active lesson primitives across feature docs"
```

---

## Self-Review

After Tasks 1-19 are done, run the writing-plans self-review checklist:

1. **Spec coverage**: re-read `docs/superpowers/specs/2026-08-19-active-lesson-primitives-design.md`. For each requirement, verify a task implements it.
2. **Placeholder scan**: `grep -nE "TBD|TODO|fill in|placeholder" docs/superpowers/plans/2026-08-19-active-lesson-primitives.md` — should return nothing.
3. **Type consistency**: verify `TradeOffRow`, `ProcessStep`, `PitfallVariant`, `SelfCheckOption` are used consistently across all tasks. The directive plugin's `parseDirectiveAttrs` shape should match what the renderer reads from `data-amph-*` attributes.

Fix any drift inline before opening the PR.

## Corrections from Spec Self-Review

During the writing-plans self-review, drift was detected between the plan code sketch and the spec at `docs/superpowers/specs/2026-08-19-active-lesson-primitives-design.md`. Apply the following corrections BEFORE Task 1. The corrections preserve the task structure but align the prop shapes and authoring syntax with the spec.

### C1. SelfCheck props must match spec Section 4.1

Replace the `SelfCheck` interface and authoring in Tasks 5, 9-13, 15, 16 with the spec shapes:

```ts
// src/components/lesson/SelfCheck.tsx
export interface SelfCheckProps {
  id: string;
  prompt: string;
  options: readonly string[]; // plain strings, not { id, label }
  answerIndex: number; // not answer: string
  explanation: string; // not explain: string
  revealLabel?: string; // default "Check"
  retryLabel?: string; // default "Try again"
}
```

JSX authoring (Tasks 9-13, 15, 16):

```jsx
<SelfCheck
  id="sc-1-1"
  prompt="Which metric answers 'how much you earn back per peso spent on ads'?"
  options={["CPC", "CTR", "ACoS", "TACoS", "ROAS"]}
  answerIndex={4}
  explanation="ROAS is Sales divided by Ad Spend. ACoS is the inverse; TACoS is total store sales, not just ad sales."
/>
```

- Update `src/components/lesson/__tests__/SelfCheck.test.tsx` in Task 5 to use `options: ["CPC", "CTR"]` and `answerIndex: 0`.
- Update the LessonContent test in Task 8 if it referenced `SelfCheck`.
- Update the validator in Task 14 to check `options.length ∈ [2, 5]`, `answerIndex ∈ range`, `explanation.length >= 12`.

### C2. TradeOffTable authoring uses a markdown table inside the fence

The spec (Section 5.1) uses a markdown table inside the `:::trade-off` fence, not a `pairs="..."` string. The component props (`rows`, `columns`, `pairs`) in Task 2 are unchanged. The authoring and the directive plugin change.

Replace the authoring in Tasks 9-15 with this form:

```md
:::trade-off{id="big-six" title="The Big Six" caption="What each metric answers"}

| Metric | What it answers                          |
| ------ | ---------------------------------------- |
| CPC    | How much per click                       |
| CTR    | Share of impressions that become clicks  |
| ACoS   | Ad spend as a share of ad sales          |
| ROAS   | Sales returned per peso spent            |
| TACoS  | Ad spend as a share of total store sales |
| :::    |
```

### C3. Directive plugin must parse the markdown table inside `:::trade-off`

Update `src/lib/mdx/directive-plugin.ts` (Task 7) to convert the markdown table inside a `:::trade-off` fence into a JSON-encoded `data-amph-rows` attribute. Replace the inner content with the table serialized as `data-amph-rows='[{"label":"CPC","value":"How much per click"},...]'`.

Concrete update to the plugin's paragraph visitor for `name === "trade-off"`:

```ts
if (name === "trade-off") {
  const tableLines = inner.split(/\n/).filter((l) => l.trim().startsWith("|"));
  const rows = parseMarkdownTableRows(tableLines);
  const dataAttr = `data-amph-rows='${JSON.stringify(rows)}'`;
  const replacement: Html = {
    type: "html",
    value: `<div data-amph-block="${name}" ${attrsSerialized} ${dataAttr}></div>`,
  } as unknown as Html;
  (parent.children as unknown[])[index] = replacement;
  return;
}
```

Add a helper `parseMarkdownTableRows(lines: string[]): { label: string; value: string }[]` that skips the header separator row and emits `label,value` pairs from each remaining row. For tables with more than two columns (rare), append extra columns into the `value` field with `—` separators.

### C4. Renderer mapper for `trade-off` reads `data-amph-rows` and parses JSON

In Task 8, replace the `pairs`-parsing path with the JSON-`data-amph-rows` path:

```tsx
if (block === "trade-off") {
  const rowsAttr = props["data-amph-rows"];
  let rows: { label: string; value: string }[] | undefined;
  if (rowsAttr) {
    try {
      rows = JSON.parse(rowsAttr.replace(/&quot;/g, '"'));
    } catch {
      rows = undefined;
    }
  }
  return (
    <TradeOffTable
      id={props["data-amph-id"]}
      title={props["data-amph-title"]}
      caption={props["data-amph-caption"]}
      columns={rows && rows.length > 0 ? ["Metric", "What it answers"] : undefined}
      rows={rows}
    />
  );
}
```

### C5. ProcessDiagram: add `layout` prop

The spec defines `layout?: "horizontal" | "vertical"` (default "horizontal"). The component in Task 4 is functionally horizontal-only today. Add the `layout` prop and a CSS rule for vertical layout:

```ts
export interface ProcessDiagramProps {
  id: string;
  title: string;
  steps: readonly ProcessStep[];
  layout?: "horizontal" | "vertical"; // default "horizontal"
  hint?: string;
}
```

In the JSX, apply `styles[layout ?? "horizontal"]`. In CSS, add `.vertical { flex-direction: column; }`. Mobile (≤ 640px) already collapses to vertical — keep that, but `layout="vertical"` overrides it.

### C6. ProcessDiagram authoring keeps pipe-delimited steps

No change to authoring. Pipe-delimited `steps="Read|Decide|Change|Explain"` per spec Section 5.1 is correct. The directive plugin's `data-amph-steps` path is unchanged.

### C7. PitfallCallout variant default

The spec defines `variant` with `"info"` as the default. The plan already does this via `variant = "info"` in the destructuring. Mark `variant` as optional in the validator (info is the implicit default). No code change needed beyond verifying the validator's allowlist matches the spec.

### C8. Playwright test paths

In Task 18, the lesson URLs `/courses/foundations/lessons/1.1-...` are guesses. The actual slugs live in `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`. Before opening the PR, read the actual path and replace the test URLs. If the path is `courseId/lessonId`, use whatever shape is in production.

### C9. Spec coverage matrix

| Spec section                | Plan task(s)                                    | Status  |
| --------------------------- | ----------------------------------------------- | ------- |
| 4.1 SelfCheck props         | Task 5 (corrected by C1)                        | covered |
| 4.2 TradeOffTable props     | Task 2 + Task 5 Authoring (corrected by C2, C4) | covered |
| 4.3 ProcessDiagram props    | Task 4 (corrected by C5)                        | covered |
| 4.4 PitfallCallout props    | Task 3 + C7                                     | covered |
| 5.1 Visual prime authoring  | Task 7 (corrected by C3) + Task 15              | covered |
| 5.2 SelfCheck JSX authoring | Task 5 (corrected by C1) + Task 15              | covered |
| 5.3 Validator rules         | Task 14 (corrected by C1, C2, C3)               | covered |
| 6 Renderer integration      | Task 8 + Task 7                                 | covered |
| 7 a11y                      | Task 6 (axe) + spec table in C7-C5              | covered |
| 8 Module 1 application      | Tasks 9-13 (corrected by C1, C2)                | covered |
| 9 Testing                   | Tasks 5-6, 18 + integrations                    | covered |

### C10. Final checks before PR

- `pnpm typecheck && pnpm lint && pnpm test && pnpm validate:lesson-production && pnpm build` all pass.
- Re-run the spec coverage matrix above. If any row is uncovered, add the missing task.
- The diff is one concern per commit (component, plugin, renderer, lesson edits, docs).
- No new dependency in `package.json`.

With these corrections applied, the plan matches the spec.
