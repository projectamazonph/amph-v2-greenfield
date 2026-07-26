/**
 * ListingAuditSimulator: audits Amazon listings and generates keyword research.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 *
 * Runs two analyses:
 *  1. Listing audit: scores title/bullets/description, identifies gaps
 *  2. Keyword research: generates a prioritized keyword list from the niche
 *
 * When userFindingActions are provided, also grades the student's fix/skip
 * triage of each finding against ground truth and computes per-dimension
 * scores:
 *  direction       : % of findings correctly triaged
 *  priorityCoverage: severity-weighted F1 of the student's fix decisions
 *  reviewCoverage  : % of findings assigned a decision (NOT graded, see below)
 *
 * Two dimensions were removed in Sprint 14 rather than renamed:
 *  - `explanation` was a hardcoded 100 that policies weighted 10-25%, so it
 *    was pure free marks. Gone until real rubric scoring exists (STORY-071).
 *  - `reviewCoverage` (formerly `dataSufficiency`) is completion, not
 *    judgement. It is still reported for display, but nothing gates submission on it,
 *    but it is no longer a graded dimension (STORY-072).
 *
 * `priorityCoverage` (formerly `profitability`) was renamed because it never
 * measured profitability: there is no revenue or ACOS model behind it. Note
 * STR Triage's `profitability` IS revenue-based and keeps its name.
 * See docs/audit-2026-07-26-simulator-accuracy-review.md.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { ListingAuditInput } from "./ListingAuditInput";
import type {
  ListingAuditOutput,
  ListingAudit,
  AuditFinding,
  FindingSeverity,
  FindingAction,
  GradedFinding,
  KeywordResult,
  ScoreDimensions,
} from "./ListingAuditOutput";

/**
 * Combined title + bullet length at which the visible copy is considered
 * close to its limits, so overflow keywords belong in the backend
 * search-terms field instead.
 *
 * Amazon allows roughly 200 characters of title and 5 bullets of about 500
 * characters each, so the visible fields hold on the order of 2,700
 * characters. 1,800 is the point where most of that budget is spent.
 *
 * This is a placeholder heuristic, not a sourced rule. STORY-080 replaces
 * length-based listing scoring with a real rubric.
 */
const VISIBLE_COPY_NEARLY_FULL_CHARS = 1800;

// ── Title audit ──────────────────────────────────────────────────────────────

function auditTitle(
  title: string,
  niche: string,
): { score: number; findings: Array<Omit<AuditFinding, "id">> } {
  const findings: Array<Omit<AuditFinding, "id">> = [];
  const lowerTitle = title.toLowerCase();
  const lowerNiche = niche.toLowerCase();
  const nicheWords = lowerNiche.split(/\s+/);

  // Score: 1pt per 10 chars, +10 if niche is referenced, +10 per niche word found
  let score = Math.min(100, Math.round(title.length / 3));

  if (title.length < 50) {
    findings.push({
      category: "title",
      severity: "warning",
      message: "Title is shorter than recommended (50–200 characters).",
      suggestion: "Expand the title with key features, material, and target audience.",
    });
    score = Math.max(0, score - 20);
  }

  // Check niche coverage
  const nicheCovered = nicheWords.every((w) => lowerTitle.includes(w));
  if (!nicheCovered) {
    const missing = nicheWords.filter((w) => !lowerTitle.includes(w));
    findings.push({
      category: "title",
      severity: "info",
      message: `Niche keyword "${missing[0]}" not found in title.`,
      suggestion: `Add "${missing[0]}" to the title.`,
    });
    score = Math.max(0, score - 10);
  }

  if (title.length === 0) {
    return {
      score: 0,
      findings: [
        {
          category: "title",
          severity: "critical",
          message: "Title is empty.",
          suggestion: "Write a descriptive title including the product name and key features.",
        },
      ],
    };
  }

  return { score: Math.min(100, score), findings };
}

// ── Bullet audit ────────────────────────────────────────────────────────────

function auditBullets(bullets: readonly string[]): {
  score: number;
  findings: Array<Omit<AuditFinding, "id">>;
} {
  const findings: Array<Omit<AuditFinding, "id">> = [];
  if (bullets.length === 0) {
    return {
      score: 0,
      findings: [
        {
          category: "bullets",
          severity: "critical",
          message: "No bullet points found.",
          suggestion: "Add at least 3–5 keyword-rich bullet points.",
        },
      ],
    };
  }

  const totalChars = bullets.reduce((sum, b) => sum + b.length, 0);
  let score = Math.min(100, Math.round(totalChars / 5));

  if (bullets.length < 5) {
    findings.push({
      category: "bullets",
      severity: "warning",
      message: `Only ${bullets.length} bullet(s) found: add more for full coverage.`,
      suggestion: "Aim for 5 bullet points (Amazon limit).",
    });
    score = Math.max(0, score - 15);
  }

  return { score, findings };
}

// ── Keyword research ─────────────────────────────────────────────────────────

function generateKeywords(niche: string): KeywordResult[] {
  const lower = niche.toLowerCase();
  const words = lower.split(/\s+/);

  const templates: Array<[string, number, KeywordResult["competition"]]> = [
    [`${lower}`, 5000, "high"],
    [`${lower} buy online`, 2000, "medium"],
    [`best ${lower}`, 3000, "high"],
    [`${words[0]} ${words[words.length - 1]} reviews`, 1000, "low"],
    [`${lower} cheap`, 1500, "medium"],
    [`${lower} for ${words[0]}`, 800, "low"],
    [`wholesale ${lower}`, 300, "low"],
    [`${lower} near me`, 2000, "medium"],
    [`${lower} bulk`, 400, "low"],
    [`${lower} free shipping`, 1200, "medium"],
    [`${words[0]} ${words[words.length - 1]} ${words[words.length - 1]}`, 600, "low"],
  ];

  return templates.map(([keyword, volume, competition]) => ({
    keyword,
    searchVolumeEstimate: volume,
    competition,
    priority: volume >= 2500 ? "high" : volume >= 1000 ? "medium" : "low",
  }));
}

// ── Grading ──────────────────────────────────────────────────────────────────

/** Severity weight: proxy for the "cost" of leaving a finding unfixed. */
const SEVERITY_WEIGHT: Record<FindingSeverity, number> = { critical: 3, warning: 2, info: 1 };

/** A finding must be fixed unless it's merely informational. */
function groundTruthAction(severity: FindingSeverity): FindingAction {
  return severity === "info" ? "skip" : "fix";
}

function buildGradedFindings(
  findings: readonly AuditFinding[],
  userFindingActions: Readonly<Record<string, FindingAction>> | undefined,
): GradedFinding[] {
  return findings.map((f) => {
    const groundTruth = groundTruthAction(f.severity);
    const userChoice = userFindingActions?.[f.id];
    const isCorrect = userChoice !== undefined && userChoice === groundTruth;
    return { ...f, groundTruth, userChoice, isCorrect };
  });
}

/** Direction score: % of findings where the student's choice matches ground truth. */
function scoreDirection(gradedFindings: readonly GradedFinding[]): number {
  if (gradedFindings.length === 0) return 100;
  const correct = gradedFindings.filter((f) => f.isCorrect).length;
  return Math.round((correct / gradedFindings.length) * 100);
}

/**
 * Priority coverage: how well the student's `fix` decisions line up with the
 * findings that actually needed fixing, in severity-weighted terms.
 *
 * This used to be recall only ("of the must-fix findings, how many did you
 * fix?"), which meant marking every single finding `fix` scored a guaranteed
 * 100 by construction: you cannot miss a must-fix if you fix everything. It
 * now also accounts for precision ("of the findings you fixed, how many
 * needed it?") and combines the two as an F1, so indiscriminate fixing is
 * penalised. STORY-073.
 */
function scorePriorityCoverage(gradedFindings: readonly GradedFinding[]): number {
  if (gradedFindings.length === 0) return 100;

  const weightOf = (fs: readonly GradedFinding[]) =>
    fs.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);

  const mustFix = gradedFindings.filter((f) => f.groundTruth === "fix");
  const userFixed = gradedFindings.filter((f) => f.userChoice === "fix");
  const correctlyFixed = mustFix.filter((f) => f.userChoice === "fix");

  const mustFixWeight = weightOf(mustFix);
  const userFixedWeight = weightOf(userFixed);
  const hitWeight = weightOf(correctlyFixed);

  // Nothing needed fixing. Fixing nothing is perfect; fixing anything is not.
  if (mustFixWeight === 0) return userFixedWeight === 0 ? 100 : 0;

  const recall = hitWeight / mustFixWeight;
  const precision = userFixedWeight === 0 ? 0 : hitWeight / userFixedWeight;
  if (recall + precision === 0) return 0;

  return Math.round(((2 * recall * precision) / (recall + precision)) * 100);
}

/**
 * Review coverage: % of findings the student assigned a decision to.
 *
 * This is a completion metric, not a measure of judgement, so it is NOT a
 * graded dimension. It is returned for display and for use as a submission
 * gate. Grading it handed out free marks to anyone who clicked through every
 * finding. STORY-072.
 */
function scoreReviewCoverage(gradedFindings: readonly GradedFinding[]): number {
  if (gradedFindings.length === 0) return 100;
  const reviewed = gradedFindings.filter((f) => f.userChoice !== undefined).length;
  return Math.round((reviewed / gradedFindings.length) * 100);
}

function computeDimensionScores(gradedFindings: readonly GradedFinding[]): ScoreDimensions {
  return {
    direction: scoreDirection(gradedFindings),
    priorityCoverage: scorePriorityCoverage(gradedFindings),
    reviewCoverage: scoreReviewCoverage(gradedFindings),
  };
}

// ── Simulator ────────────────────────────────────────────────────────────────

export class ListingAuditSimulator implements Simulator<ListingAuditInput, ListingAuditOutput> {
  readonly simulatorId = "listing-audit" as const;
  readonly name = "Listing Audit + Keyword Research";

  async run(input: ListingAuditInput): Promise<ListingAuditOutput> {
    const { title, bullets, description, niche, userFindingActions } = input;

    if (!niche && !title) {
      return {
        audit: {
          titleScore: 0,
          bulletScore: 0,
          descriptionScore: 0,
          overallScore: 0,
          findings: [],
        },
        keywordResearch: { keywords: [], searchVolumeEstimate: 0 },
        score: 0,
        gradedFindings: [],
        scoreDimensions: userFindingActions !== undefined ? computeDimensionScores([]) : null,
      };
    }

    const { score: titleScore, findings: titleFindings } = auditTitle(title, niche);
    const { score: bulletScore, findings: bulletFindings } = auditBullets(bullets);

    // Description score: proportional to length (100 chars = 50pts, 200+ = 100pts)
    const descriptionScore = Math.min(100, Math.round(description.length / 2));
    const descriptionFindings: Array<Omit<AuditFinding, "id">> =
      description.length < 100
        ? [
            {
              category: "description",
              severity: "warning",
              message: "Description is short.",
              suggestion: "Write at least 200 characters covering features and benefits.",
            },
          ]
        : [];

    // Backend keywords. The condition used to be inverted: it fired when the
    // visible copy was SHORT and then told the seller there was no room left.
    // Short copy means there is room remaining; it is copy that has used up
    // the visible fields that forces overflow keywords into the backend
    // search-terms field. STORY-077.
    const totalChars = title.length + bullets.reduce((s, b) => s + b.length, 0);
    const backendFindings: Array<Omit<AuditFinding, "id">> =
      totalChars >= VISIBLE_COPY_NEARLY_FULL_CHARS
        ? [
            {
              category: "backend",
              severity: "info",
              message: "Visible content is close to its limits, so extra keywords will not fit.",
              suggestion: "Move the remaining keywords to the backend (search terms field).",
            },
          ]
        : [];

    const allFindings: AuditFinding[] = [
      ...titleFindings,
      ...bulletFindings,
      ...descriptionFindings,
      ...backendFindings,
    ].map((f, i) => ({ ...f, id: `finding-${i}` }));

    const overallScore = Math.round((titleScore + bulletScore + descriptionScore) / 3);

    const audit: ListingAudit = {
      titleScore,
      bulletScore,
      descriptionScore,
      overallScore,
      findings: allFindings,
    };

    const keywords = generateKeywords(niche);
    const searchVolumeEstimate = keywords.reduce((sum, k) => sum + k.searchVolumeEstimate, 0);

    const gradedFindings = buildGradedFindings(allFindings, userFindingActions);
    const scoreDimensions =
      userFindingActions !== undefined ? computeDimensionScores(gradedFindings) : null;

    return {
      audit,
      keywordResearch: { keywords, searchVolumeEstimate },
      score: overallScore,
      gradedFindings,
      scoreDimensions,
    };
  }
}
