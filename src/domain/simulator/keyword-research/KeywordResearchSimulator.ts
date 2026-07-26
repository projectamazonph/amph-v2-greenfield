/**
 * KeywordResearchSimulator — the real Keyword Research PPC simulator.
 *
 * Grades the student's keyword categorization:
 *  1. Priority accuracy — did the student correctly assign primary/secondary/negative?
 *  2. Negative identification — did the student catch the irrelevant terms?
 *  3. Primary coverage — did the student identify all high-priority keywords?
 *
 * Scoring dimensions:
 *  priorityAccuracy — % of keywords correctly prioritized
 *  negativeRecall   — % of negatives correctly identified
 *  negativePrecision — % of false positives
 *  primaryCoverage  — % of primary keywords covered
 *
 * Pass threshold: 70% (aggregateGrade with threshold 70)
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { KeywordResearchInput, KeywordPriority } from "./KeywordResearchInput";
import type { KeywordResearchOutput, CriterionResult } from "./KeywordResearchOutput";

/** Reference priorities — what an experienced operator would assign. */
type ReferencePriorities = Record<string, KeywordPriority>;

/** Reference negatives — terms to add to a negative keyword list. */
type ReferenceNegatives = string[];

interface KeywordResearchScenarioData {
  referencePriorities: ReferencePriorities;
  referenceNegatives: ReferenceNegatives;
}

export class KeywordResearchSimulator implements Simulator<
  KeywordResearchInput,
  KeywordResearchOutput
> {
  readonly simulatorId = "keyword-research" as const;
  readonly name = "Keyword Research";

  async run(input: KeywordResearchInput): Promise<KeywordResearchOutput> {
    const { candidates, userDecisions, negatives } = input;

    if (candidates.length === 0) {
      return this.emptyResult();
    }

    // For now, use a default scenario data
    // In production, this would be loaded from the scenario database
    const scenarioData: KeywordResearchScenarioData = {
      referencePriorities: this.buildDefaultPriorities(candidates),
      referenceNegatives: this.buildDefaultNegatives(candidates),
    };

    return this.grade(input, scenarioData);
  }

  private grade(
    input: KeywordResearchInput,
    scenarioData: KeywordResearchScenarioData,
  ): KeywordResearchOutput {
    const { candidates, userDecisions, negatives } = input;
    const { referencePriorities, referenceNegatives } = scenarioData;

    const criteria: CriterionResult[] = [];

    // 1. Priority accuracy
    let priorityCorrect = 0;
    let totalScored = 0;

    const decisionMap = new Map(userDecisions.map((d) => [d.keyword.toLowerCase(), d.priority]));

    for (const candidate of candidates) {
      const decision = decisionMap.get(candidate.text.toLowerCase());
      const refPriority = referencePriorities[candidate.text.toLowerCase()];
      if (!decision || !refPriority) continue;
      totalScored++;

      if (decision === refPriority) {
        priorityCorrect++;
      } else {
        criteria.push({
          criterionId: `priority_${candidate.text}`,
          passed: false,
          score: 0,
          feedback: this.priorityFeedback(candidate.text, decision, refPriority),
        });
      }
    }

    const accuracyRatio = totalScored > 0 ? priorityCorrect / totalScored : 0;
    criteria.push({
      criterionId: "priority_accuracy",
      passed: accuracyRatio >= 0.75,
      score: Math.round(accuracyRatio * 100),
      feedback:
        accuracyRatio >= 0.75
          ? "All keywords prioritized correctly."
          : "Some keywords were mis-prioritized. Look at the per-keyword feedback below.",
    });

    // 2. Negative identification
    const refNegSet = new Set(referenceNegatives.map((n) => n.toLowerCase()));
    const studentNegSet = new Set(negatives.map((n) => n.toLowerCase()));
    let truePositives = 0;
    let falsePositives = 0;

    for (const n of studentNegSet) {
      if (refNegSet.has(n)) truePositives++;
      else falsePositives++;
    }

    const negativesNeeded = refNegSet.size;
    if (negativesNeeded > 0) {
      const negativeRecall = truePositives / negativesNeeded;
      criteria.push({
        criterionId: "negative_recall",
        passed: negativeRecall >= 0.6,
        score: Math.round(negativeRecall * 100),
        feedback:
          negativeRecall >= 0.6
            ? `You identified all ${negativesNeeded} keywords that should be on the negative list.`
            : `You missed ${negativesNeeded - truePositives} keyword(s) that should be negative.`,
      });

      const negativePrecision =
        falsePositives === 0 ? 1 : Math.max(0, 1 - falsePositives / studentNegSet.size);
      criteria.push({
        criterionId: "negative_precision",
        passed: negativePrecision >= 0.7,
        score: Math.round(negativePrecision * 100),
        feedback:
          falsePositives === 0
            ? "No false-positive negatives."
            : `${falsePositives} keyword(s) were added as negatives that should not have been.`,
      });
    } else {
      criteria.push({
        criterionId: "negative_recall",
        passed: true,
        score: 100,
        feedback: "No negatives needed for this scenario.",
      });
    }

    // 3. Primary coverage
    const primariesNeeded = Object.values(referencePriorities).filter(
      (p) => p === "PRIMARY",
    ).length;
    const primariesChosen = userDecisions.filter((d) => d.priority === "PRIMARY").length;
    const primaryCoverage =
      primariesNeeded === 0 ? 1 : Math.min(primariesChosen / primariesNeeded, 1);
    criteria.push({
      criterionId: "primary_coverage",
      passed: primaryCoverage >= 0.7,
      score: Math.round(primaryCoverage * 100),
      feedback:
        primaryCoverage >= 0.7
          ? "Primary keyword coverage is complete."
          : "Some primary keywords were missed.",
    });

    // Aggregate
    const totalWeight = criteria.reduce((sum) => sum + 1, 0);
    const weightedSum = criteria.reduce((sum, r) => sum + r.score, 0);
    const totalScore = Math.round(weightedSum / totalWeight);
    const passed = totalScore >= 70;

    const overallFeedback = passed
      ? `Strong work — ${criteria.filter((r) => r.passed).length} of ${criteria.length} criteria met.`
      : `Score ${totalScore}. ${criteria.filter((r) => r.passed).length} of ${criteria.length} criteria met.`;

    return {
      totalScore,
      passed,
      overallFeedback,
      criteriaResults: criteria,
      priorityAccuracy: Math.round(accuracyRatio * 100),
      negativeRecall:
        negativesNeeded > 0 ? Math.round((truePositives / negativesNeeded) * 100) : 100,
      negativePrecision:
        negativesNeeded > 0
          ? Math.round(
              (falsePositives === 0 ? 1 : Math.max(0, 1 - falsePositives / studentNegSet.size)) *
                100,
            )
          : 100,
      primaryCoverage: Math.round(primaryCoverage * 100),
    };
  }

  private priorityFeedback(keyword: string, chosen: KeywordPriority, ref: KeywordPriority): string {
    if (chosen === "PRIMARY" && ref !== "PRIMARY") {
      return `"${keyword}" should not be primary — it is ${ref === "SECONDARY" ? "a secondary term (lower relevance or volume)" : "irrelevant to this product (should be negative)"}.`;
    }
    if (chosen === "SECONDARY" && ref === "PRIMARY") {
      return `"${keyword}" is a primary term — high relevance and volume. Promote it.`;
    }
    if (chosen === "NEGATIVE" && ref !== "NEGATIVE") {
      return `"${keyword}" should not be a negative — it is ${ref === "PRIMARY" ? "a primary term" : "a secondary term"}.`;
    }
    if (chosen === "SECONDARY" && ref === "NEGATIVE") {
      return `"${keyword}" should be negative — irrelevant to this product.`;
    }
    return `"${keyword}": chosen ${chosen}, reference is ${ref}.`;
  }

  /** Build default priorities based on relevance and volume. */
  private buildDefaultPriorities(
    candidates: KeywordResearchInput["candidates"],
  ): ReferencePriorities {
    const priorities: ReferencePriorities = {};
    for (const c of candidates) {
      const score = c.relevance * 0.6 + c.searchVolumeProxy * 0.4;
      if (score >= 0.7) priorities[c.text.toLowerCase()] = "PRIMARY";
      else if (score >= 0.4) priorities[c.text.toLowerCase()] = "SECONDARY";
      else priorities[c.text.toLowerCase()] = "NEGATIVE";
    }
    return priorities;
  }

  /** Build default negatives based on low relevance. */
  private buildDefaultNegatives(
    candidates: KeywordResearchInput["candidates"],
  ): ReferenceNegatives {
    return candidates.filter((c) => c.relevance < 0.3).map((c) => c.text.toLowerCase());
  }

  private emptyResult(): KeywordResearchOutput {
    return {
      totalScore: 0,
      passed: false,
      overallFeedback: "No candidates to evaluate.",
      criteriaResults: [],
      priorityAccuracy: 0,
      negativeRecall: 0,
      negativePrecision: 0,
      primaryCoverage: 0,
    };
  }
}
