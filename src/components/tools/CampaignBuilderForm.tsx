/**
 * CampaignBuilderForm — client component.
 *
 * 4-input form: product category, niche, monthly budget, targeting
 * strategy. Submits to the buildCampaign action and renders the
 * resulting campaign structure.
 */

"use client";

import { useState, useTransition } from "react";
import styles from "./CampaignBuilderForm.module.css";
import {
  buildCampaign,
  type BuildCampaignResult,
} from "@/app/tools/campaign-builder/actions";

interface Props {
  productCategory: string;
  productNiche: string;
  monthlyBudget: number;
}

type Targeting = "auto" | "manual" | "hybrid";

const TARGETING: ReadonlyArray<{ value: Targeting; label: string; blurb: string }> = [
  { value: "manual", label: "Manual", blurb: "You pick keywords and bids" },
  { value: "auto", label: "Auto", blurb: "Amazon's algorithm targets" },
  { value: "hybrid", label: "Hybrid", blurb: "Auto with manual overrides" },
];

export function CampaignBuilderForm({
  productCategory,
  productNiche,
  monthlyBudget,
}: Props) {
  const [category, setCategory] = useState(productCategory);
  const [niche, setNiche] = useState(productNiche);
  const [budget, setBudget] = useState(monthlyBudget);
  const [targeting, setTargeting] = useState<Targeting>("manual");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BuildCampaignResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await buildCampaign({
        productCategory: category,
        productNiche: niche,
        monthlyBudget: budget,
        targetingStrategy: targeting,
      });
      if (r.ok) {
        setResult(r);
      } else {
        setError(r.error.message);
      }
    });
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.fieldsRow}>
        <Field
          label="Product category"
          id="cb-category"
          help="High-level taxonomy (Electronics, Home, etc.)"
        >
          <input
            id="cb-category"
            className={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </Field>
        <Field
          label="Product niche"
          id="cb-niche"
          help="Specific audience (wireless earbuds, yoga mats)"
        >
          <input
            id="cb-niche"
            className={styles.input}
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
        </Field>
        <Field label="Monthly budget" id="cb-budget" help="₱ value, total">
          <span className={styles.inputWrap}>
            <span className={styles.prefix}>₱</span>
            <input
              id="cb-budget"
              type="number"
              min="1"
              step="100"
              className={styles.inputNum}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </span>
        </Field>
      </div>
      <div className={styles.targetingRow}>
        <span className={styles.targetingLabel}>Targeting strategy</span>
        <div className={styles.targetingOptions}>
          {TARGETING.map((t) => (
            <label
              key={t.value}
              className={`${styles.option} ${targeting === t.value ? styles.optionSelected : ""}`}
            >
              <input
                type="radio"
                name="targeting"
                value={t.value}
                checked={targeting === t.value}
                onChange={() => setTargeting(t.value)}
                className={styles.radio}
              />
              <span className={styles.optionLabel}>{t.label}</span>
              <span className={styles.optionBlurb}>{t.blurb}</span>
            </label>
          ))}
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.footer}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Building…" : "Build campaign"}
        </button>
        {result && result.ok ? (
          <div
            className={styles.score}
            style={{
              color:
                result.value.score >= 80
                  ? "var(--success)"
                  : result.value.score >= 50
                    ? "var(--warning)"
                    : "var(--danger)",
            }}
          >
            Score: {result.value.score}%
          </div>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  help,
  children,
}: {
  label: string;
  id: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      <span className={styles.fieldHelp}>{help}</span>
    </label>
  );
}
