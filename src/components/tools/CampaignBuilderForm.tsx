/**
 * CampaignBuilderForm — client component.
 *
 * Product category/niche/budget come from the scenario (server-resolved,
 * not student-editable — see STORY-085) and are shown read-only. The
 * student picks a targeting strategy and builds their own campaign
 * structure: campaigns, each with one or more ad groups, each with
 * keywords and match types — mirroring how a real Amazon Ads console
 * campaign is put together.
 *
 * Submits the whole structure in one campaignBuilderAttempt() call
 * (userAdjustedCampaigns) — the graded, persisted-attempt lifecycle.
 * Deliberately does NOT call campaignBuilderAttempt() a second time for
 * an ungraded "preview": StartSimulatorAttempt rejects a second call
 * while an attempt is still in_progress, and an early preview call would
 * never transition out of in_progress (nothing submits it), permanently
 * blocking the real submission. The static "how this is scored" panel
 * below gives guidance without needing a live call.
 */

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./CampaignBuilderForm.module.css";
import {
  campaignBuilderAttempt,
  type CampaignBuilderAttemptResponse,
} from "@/app/tools/campaign-builder/actions";
import { FormativeScoreNotice } from "./FormativeScoreNotice";
import { SimulatorModeToggle } from "./SimulatorModeToggle";
import type { PracticeOrChallengeMode } from "./SimulatorModeToggle";

interface Props {
  productCategory: string;
  productNiche: string;
  monthlyBudget: number;
  challengeUnlocked: boolean;
}

type Targeting = "auto" | "manual" | "hybrid";
type MatchType = "exact" | "phrase" | "broad";
type CampaignType = "sponsored-products" | "sponsored-brands" | "sponsored-display";
type NegativeMatchType = "negativeExact" | "negativePhrase";
type NegativeLevel = "campaign" | "adGroup";

interface EditableKeyword {
  readonly id: string;
  keyword: string;
  matchType: MatchType;
  suggestedBid: number;
}

interface EditableAdGroup {
  readonly id: string;
  name: string;
  suggestedBid: number;
  keywords: EditableKeyword[];
}

interface EditableNegativeKeyword {
  readonly id: string;
  text: string;
  matchType: NegativeMatchType;
  level: NegativeLevel;
  reason: string;
}

interface EditableCampaign {
  readonly id: string;
  name: string;
  type: CampaignType;
  dailyBudget: number;
  adGroups: EditableAdGroup[];
  negativeKeywords: EditableNegativeKeyword[];
}

const TARGETING: ReadonlyArray<{ value: Targeting; label: string; blurb: string }> = [
  { value: "manual", label: "Manual", blurb: "You pick keywords and bids" },
  { value: "auto", label: "Auto", blurb: "Amazon's algorithm targets" },
  { value: "hybrid", label: "Hybrid", blurb: "Auto with manual overrides" },
];

const CAMPAIGN_TYPES: ReadonlyArray<{ value: CampaignType; label: string }> = [
  { value: "sponsored-products", label: "Sponsored Products" },
  { value: "sponsored-brands", label: "Sponsored Brands" },
  { value: "sponsored-display", label: "Sponsored Display" },
];

const MATCH_TYPES: ReadonlyArray<MatchType> = ["exact", "phrase", "broad"];

let localIdCounter = 0;
function newLocalId(): string {
  localIdCounter += 1;
  return `local_${localIdCounter}`;
}

function emptyCampaign(): EditableCampaign {
  return {
    id: newLocalId(),
    name: "",
    type: "sponsored-products",
    dailyBudget: 0,
    adGroups: [],
    negativeKeywords: [],
  };
}

function emptyAdGroup(): EditableAdGroup {
  return { id: newLocalId(), name: "", suggestedBid: 0, keywords: [] };
}

function emptyKeyword(): EditableKeyword {
  return { id: newLocalId(), keyword: "", matchType: "exact", suggestedBid: 0 };
}

function emptyNegativeKeyword(): EditableNegativeKeyword {
  return { id: newLocalId(), text: "", matchType: "negativeExact", level: "campaign", reason: "" };
}

export function CampaignBuilderForm({
  productCategory,
  productNiche,
  monthlyBudget,
  challengeUnlocked,
}: Props) {
  const [targeting, setTargeting] = useState<Targeting>("manual");
  const [mode, setMode] = useState<PracticeOrChallengeMode>("practice");
  const [campaigns, setCampaigns] = useState<EditableCampaign[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CampaignBuilderAttemptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addCampaign = () => setCampaigns((prev) => [...prev, emptyCampaign()]);
  const removeCampaign = (ci: number) => setCampaigns((prev) => prev.filter((_, i) => i !== ci));
  const updateCampaign = (ci: number, patch: Partial<EditableCampaign>) =>
    setCampaigns((prev) => prev.map((c, i) => (i === ci ? { ...c, ...patch } : c)));

  const addAdGroup = (ci: number) =>
    setCampaigns((prev) =>
      prev.map((c, i) => (i === ci ? { ...c, adGroups: [...c.adGroups, emptyAdGroup()] } : c)),
    );
  const removeAdGroup = (ci: number, ai: number) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, adGroups: c.adGroups.filter((_, j) => j !== ai) } : c,
      ),
    );
  const updateAdGroup = (ci: number, ai: number, patch: Partial<EditableAdGroup>) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? { ...c, adGroups: c.adGroups.map((ag, j) => (j === ai ? { ...ag, ...patch } : ag)) }
          : c,
      ),
    );

  const addKeyword = (ci: number, ai: number) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              adGroups: c.adGroups.map((ag, j) =>
                j === ai ? { ...ag, keywords: [...ag.keywords, emptyKeyword()] } : ag,
              ),
            }
          : c,
      ),
    );
  const removeKeyword = (ci: number, ai: number, ki: number) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              adGroups: c.adGroups.map((ag, j) =>
                j === ai ? { ...ag, keywords: ag.keywords.filter((_, k) => k !== ki) } : ag,
              ),
            }
          : c,
      ),
    );
  const updateKeyword = (ci: number, ai: number, ki: number, patch: Partial<EditableKeyword>) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              adGroups: c.adGroups.map((ag, j) =>
                j === ai
                  ? {
                      ...ag,
                      keywords: ag.keywords.map((kw, k) => (k === ki ? { ...kw, ...patch } : kw)),
                    }
                  : ag,
              ),
            }
          : c,
      ),
    );

  const addNegative = (ci: number) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, negativeKeywords: [...c.negativeKeywords, emptyNegativeKeyword()] } : c,
      ),
    );
  const removeNegative = (ci: number, ni: number) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci ? { ...c, negativeKeywords: c.negativeKeywords.filter((_, n) => n !== ni) } : c,
      ),
    );
  const updateNegative = (ci: number, ni: number, patch: Partial<EditableNegativeKeyword>) =>
    setCampaigns((prev) =>
      prev.map((c, i) =>
        i === ci
          ? {
              ...c,
              negativeKeywords: c.negativeKeywords.map((neg, n) =>
                n === ni ? { ...neg, ...patch } : neg,
              ),
            }
          : c,
      ),
    );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (campaigns.length === 0) {
      setError("Add at least one campaign before submitting.");
      return;
    }
    if (campaigns.some((c) => c.name.trim().length === 0)) {
      setError("Every campaign needs a name.");
      return;
    }

    const userAdjustedCampaigns = campaigns.map((c) => ({
      name: c.name.trim(),
      type: c.type,
      dailyBudget: c.dailyBudget,
      adGroups: c.adGroups.map((ag) => ({
        name: ag.name.trim() || "Ad group",
        suggestedBid: ag.suggestedBid,
        keywords: ag.keywords
          .filter((kw) => kw.keyword.trim().length > 0)
          .map((kw) => ({
            keyword: kw.keyword.trim(),
            matchType: kw.matchType,
            suggestedBid: kw.suggestedBid,
          })),
      })),
      negativeKeywords: c.negativeKeywords
        .filter((neg) => neg.text.trim().length > 0)
        .map((neg) => ({
          text: neg.text.trim(),
          matchType: neg.matchType,
          level: neg.level,
          reason: neg.reason.trim(),
        })),
    }));

    startTransition(async () => {
      try {
        const r = await campaignBuilderAttempt({
          targetingStrategy: targeting,
          mode,
          userAdjustedCampaigns,
        });
        if (r.ok) {
          setResult(r);
        } else {
          setError("message" in r.error ? r.error.message : "Could not grade this campaign.");
        }
      } catch {
        setError("Could not grade this campaign. Please try again.");
      }
    });
  };

  const graded = Boolean(result && result.ok);
  const gradedValue = result && result.ok ? result.value : null;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <SimulatorModeToggle
        mode={mode}
        onChange={setMode}
        unlocked={challengeUnlocked}
        disabled={graded}
      />
      <div className={styles.fieldsRow}>
        <Field
          label="Product category"
          id="cb-category"
          help="High-level taxonomy (Electronics, Home, etc.)"
        >
          <span className={styles.input}>{productCategory}</span>
        </Field>
        <Field
          label="Product niche"
          id="cb-niche"
          help="Specific audience (wireless earbuds, yoga mats)"
        >
          <span className={styles.input}>{productNiche}</span>
        </Field>
        <Field label="Monthly budget" id="cb-budget" help="₱ value, total">
          <span className={styles.inputWrap}>
            <span className={styles.prefix}>₱</span>
            <span className={styles.inputNum}>{monthlyBudget}</span>
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
                disabled={graded}
              />
              <span className={styles.optionLabel}>{t.label}</span>
              <span className={styles.optionBlurb}>{t.blurb}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.hint}>
        <p className={styles.hintTitle}>How this is scored</p>
        <ul className={styles.hintList}>
          <li>
            Structure quality — cover the campaign types a real launch would use, and keep one match
            type per ad group (don&apos;t mix exact/phrase/broad together).
          </li>
          <li>
            Negative routing — protect your own campaigns from each other: negative your proven
            exact-match winners out of Auto, and out of your Phrase ad group.
          </li>
          <li>
            Budget allocation — the total planned spend should reconcile with the monthly budget,
            and each campaign role should get a reasonable share of it.
          </li>
          <li>
            Branded isolation — keep your own brand name (and misspellings) only in the Brand
            campaign; never bid on a competitor&apos;s name outside a dedicated strategy.
          </li>
          <li>
            Duplicate control — don&apos;t target the same keyword + match type in more than one ad
            group.
          </li>
          <li>
            Naming compliance — follow the house convention: Brand | ASIN | Channel | Strategy |
            Target Type | Match | Label.
          </li>
          <li>
            Keyword relevance — every keyword should actually relate to the product niche above.
          </li>
        </ul>
      </div>

      <div className={styles.builder}>
        <div className={styles.builderHeader}>
          <h3 className={styles.campaignsTitle}>Your campaign structure</h3>
          {!graded ? (
            <Button type="button" variant="secondary" size="sm" onClick={addCampaign}>
              + Add campaign
            </Button>
          ) : null}
        </div>

        {campaigns.length === 0 ? (
          <p className={styles.empty}>No campaigns yet. Add one to get started.</p>
        ) : null}

        {campaigns.map((campaign, ci) => (
          <div key={campaign.id} className={styles.campaign}>
            <div className={styles.campaignFieldsRow}>
              <input
                className={styles.input}
                placeholder="Campaign name, e.g. SP | Manual | wireless earbuds"
                value={campaign.name}
                onChange={(e) => updateCampaign(ci, { name: e.target.value })}
                disabled={graded}
              />
              <select
                className={styles.select}
                value={campaign.type}
                onChange={(e) => updateCampaign(ci, { type: e.target.value as CampaignType })}
                disabled={graded}
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <span className={styles.inputWrap}>
                <span className={styles.prefix}>₱</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={styles.inputNum}
                  value={campaign.dailyBudget}
                  onChange={(e) => updateCampaign(ci, { dailyBudget: Number(e.target.value) })}
                  disabled={graded}
                  aria-label="Daily budget"
                />
              </span>
              {!graded ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeCampaign(ci)}>
                  Remove
                </Button>
              ) : null}
            </div>

            {campaign.adGroups.map((adGroup, ai) => (
              <div key={adGroup.id} className={styles.adGroup}>
                <div className={styles.adGroupFieldsRow}>
                  <input
                    className={styles.input}
                    placeholder="Ad group name, e.g. Core - Exact"
                    value={adGroup.name}
                    onChange={(e) => updateAdGroup(ci, ai, { name: e.target.value })}
                    disabled={graded}
                  />
                  <span className={styles.inputWrap}>
                    <span className={styles.prefix}>₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.inputNum}
                      value={adGroup.suggestedBid}
                      onChange={(e) =>
                        updateAdGroup(ci, ai, { suggestedBid: Number(e.target.value) })
                      }
                      disabled={graded}
                      aria-label="Ad group default bid"
                    />
                  </span>
                  {!graded ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAdGroup(ci, ai)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>

                <ul className={styles.keywordList}>
                  {adGroup.keywords.map((kw, ki) => (
                    <li key={kw.id} className={styles.keywordRow}>
                      <input
                        className={styles.input}
                        placeholder="Keyword"
                        value={kw.keyword}
                        onChange={(e) => updateKeyword(ci, ai, ki, { keyword: e.target.value })}
                        disabled={graded}
                      />
                      <select
                        className={styles.select}
                        value={kw.matchType}
                        onChange={(e) =>
                          updateKeyword(ci, ai, ki, { matchType: e.target.value as MatchType })
                        }
                        disabled={graded}
                      >
                        {MATCH_TYPES.map((mt) => (
                          <option key={mt} value={mt}>
                            {mt}
                          </option>
                        ))}
                      </select>
                      <span className={styles.inputWrap}>
                        <span className={styles.prefix}>₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={styles.inputNum}
                          value={kw.suggestedBid}
                          onChange={(e) =>
                            updateKeyword(ci, ai, ki, { suggestedBid: Number(e.target.value) })
                          }
                          disabled={graded}
                          aria-label="Keyword bid"
                        />
                      </span>
                      {!graded ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeKeyword(ci, ai, ki)}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {!graded ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addKeyword(ci, ai)}
                  >
                    + Add keyword
                  </Button>
                ) : null}
              </div>
            ))}

            {!graded ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => addAdGroup(ci)}>
                + Add ad group
              </Button>
            ) : null}

            <div className={styles.negatives}>
              <p className={styles.negativesTitle}>Negative keywords</p>
              <ul className={styles.negativesList}>
                {campaign.negativeKeywords.map((neg, ni) => (
                  <li key={neg.id} className={styles.negativeRow}>
                    <input
                      className={styles.input}
                      placeholder="Negative keyword text"
                      value={neg.text}
                      onChange={(e) => updateNegative(ci, ni, { text: e.target.value })}
                      disabled={graded}
                    />
                    <select
                      className={styles.select}
                      value={neg.matchType}
                      onChange={(e) =>
                        updateNegative(ci, ni, {
                          matchType: e.target.value as NegativeMatchType,
                        })
                      }
                      disabled={graded}
                    >
                      <option value="negativeExact">negative exact</option>
                      <option value="negativePhrase">negative phrase</option>
                    </select>
                    <select
                      className={styles.select}
                      value={neg.level}
                      onChange={(e) =>
                        updateNegative(ci, ni, { level: e.target.value as NegativeLevel })
                      }
                      disabled={graded}
                    >
                      <option value="campaign">campaign-level</option>
                      <option value="adGroup">ad-group-level</option>
                    </select>
                    <input
                      className={styles.input}
                      placeholder="Reason (why this negative?)"
                      value={neg.reason}
                      onChange={(e) => updateNegative(ci, ni, { reason: e.target.value })}
                      disabled={graded}
                    />
                    {!graded ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNegative(ci, ni)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {!graded ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => addNegative(ci)}>
                  + Add negative keyword
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.footer}>
        <Button type="submit" variant="primary" disabled={pending || graded}>
          {pending ? "Grading…" : graded ? "Graded" : "Submit for grading"}
        </Button>
        {gradedValue ? (
          <div
            className={`${styles.score} ${
              gradedValue.overallScore >= 80
                ? styles.scoreSuccess
                : gradedValue.overallScore >= 50
                  ? styles.scoreWarning
                  : styles.scoreDanger
            }`}
          >
            Score: {gradedValue.overallScore}%
          </div>
        ) : null}
      </div>
      {gradedValue ? <FormativeScoreNotice /> : null}
      {gradedValue && gradedValue.xpAwarded ? (
        <p className={styles.xpBanner}>
          +{gradedValue.xpAwarded} XP earned for passing in Challenge mode.
        </p>
      ) : null}
      {gradedValue && gradedValue.feedback ? (
        <p className={styles.error} style={{ color: "var(--ink-700)" }}>
          {gradedValue.feedback.overallComment}
        </p>
      ) : null}
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
