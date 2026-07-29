/**
 * KeywordResearchSimulator — Keyword Research as its own simulator.
 *
 * STORY-081: Replace hardcoded keyword volumes with versioned scenario
 * datasets. Previously this "simulator" was a page-level alias that reused
 * ListingAuditSimulator's hardcoded keyword-template generator. It is now a
 * genuinely separate simulator, driven entirely by a resolved KeywordDataset
 * passed in as plain input (no constructor dependencies, no IO — the
 * dataset lookup is the app-layer action's job).
 *
 * Workflow: the student classifies each keyword's search intent and flags
 * which ones they'd exclude as negatives; grading compares those decisions
 * against the dataset's own labels (see KeywordResearchOutput.ts for the
 * dimension formulas).
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { KeywordResearchInput } from "./KeywordResearchInput";
import type {
  KeywordResearchKeywordResult,
  KeywordResearchOutput,
  ScoreDimensions,
} from "./KeywordResearchOutput";

function isGroundTruthNegative(intent: string): boolean {
  return intent === "irrelevant";
}

/**
 * F1 score (0-100) of the student's isNegative flags against ground truth.
 * F1 rather than raw accuracy: negatives are typically a minority of a
 * niche's keyword set, so "always answer not-negative" would otherwise
 * score deceptively high.
 *
 * Trivial case (no ground-truth negatives and none flagged): scored 100 —
 * there was nothing to catch and nothing wrongly excluded.
 */
function computeF1(truePositive: number, falsePositive: number, falseNegative: number): number {
  if (truePositive + falsePositive === 0 && truePositive + falseNegative === 0) {
    return 100;
  }
  const precision =
    truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
  const recall =
    truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);
  if (precision + recall === 0) {
    return 0;
  }
  return Math.round(((2 * precision * recall) / (precision + recall)) * 100);
}

export class KeywordResearchSimulator implements Simulator<
  KeywordResearchInput,
  KeywordResearchOutput
> {
  readonly simulatorId = "keyword-research" as const;
  readonly name = "Keyword Research";

  async run(input: KeywordResearchInput): Promise<KeywordResearchOutput> {
    const { dataset, userClassifications } = input;
    const isGraded = userClassifications !== undefined;

    let correctIntentCount = 0;
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;

    const keywords: KeywordResearchKeywordResult[] = dataset.keywords.map((kw) => {
      const groundTruthIsNegative = isGroundTruthNegative(kw.intent);
      const classification = userClassifications?.[kw.normalizedTerm];

      const result: KeywordResearchKeywordResult = {
        term: kw.term,
        normalizedTerm: kw.normalizedTerm,
        monthlySearchVolume: kw.monthlySearchVolume,
        competitionIndex: kw.competitionIndex,
        suggestedBidLow: kw.suggestedBidLow,
        suggestedBidMedian: kw.suggestedBidMedian,
        suggestedBidHigh: kw.suggestedBidHigh,
        relevanceScore: kw.relevanceScore,
        seasonalityIndex: kw.seasonalityIndex,
        groundTruthIntent: kw.intent,
        groundTruthIsNegative,
        ...(classification !== undefined
          ? {
              userIntent: classification.intent,
              userIsNegative: classification.isNegative,
              isIntentCorrect: classification.intent === kw.intent,
            }
          : {}),
      };

      if (isGraded) {
        const userIsNegative = classification?.isNegative === true;
        if (classification !== undefined && classification.intent === kw.intent) {
          correctIntentCount++;
        }
        if (userIsNegative && groundTruthIsNegative) truePositive++;
        else if (userIsNegative && !groundTruthIsNegative) falsePositive++;
        else if (!userIsNegative && groundTruthIsNegative) falseNegative++;
      }

      return result;
    });

    let scoreDimensions: ScoreDimensions | null = null;
    let score = 100;

    if (isGraded) {
      const intentAccuracy = Math.round((correctIntentCount / dataset.keywords.length) * 100);
      const negativeIdentification = computeF1(truePositive, falsePositive, falseNegative);
      scoreDimensions = { intentAccuracy, negativeIdentification };
      score = Math.round((intentAccuracy + negativeIdentification) / 2);
    }

    return {
      datasetId: dataset.datasetId,
      datasetVersion: dataset.version,
      sourceType: dataset.sourceType,
      categoryId: dataset.categoryId,
      nicheId: dataset.nicheId,
      keywords,
      score,
      scoreDimensions,
    };
  }
}
