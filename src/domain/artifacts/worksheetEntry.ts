/**
 * worksheetEntry — per-H2 student worksheet artifacts.
 *
 * Replaces the deleted Module 1 wide-row worksheet (Story-163) with a
 * normalized, H2-anchored design that fits all 45 lessons. Each H2
 * section ("main point") in a lesson's MDX is paired with a tracked
 * worksheet entry of 1-3 short fields the student fills in as they
 * read. One row per (studentId, lessonSlug, h2Anchor, fieldKey) so the
 * table grows by rows, not columns, and a new H2 entry is one new
 * WORKSHEET_H2_SPECS entry with no migration.
 *
 * Lesson slugs and per-lesson H2 anchors are the source of truth here
 * and are enforced by the curriculum validator. The validator fails the
 * suite whenever:
 *   - a lesson that ships a :::worksheet directive is missing from
 *     WORKSHEET_LESSON_SLUGS,
 *   - an H2 anchor in WORKSHEET_H2_SPECS does not appear as a `## …`
 *     line in the lesson MDX, or
 *   - a :::worksheet directive in the lesson references an h2Anchor
 *     that is not in WORKSHEET_H2_SPECS.
 *
 * Save semantics: the React side holds local state and saves the full
 * H2 (all its fields) on form-blur via the saveWorksheetEntry server
 * action. Validation rejects unknown field keys; missing keys fill in
 * with "" so the row is always wide within its H2.
 */

export const WORKSHEET_LESSON_SLUGS = [
  // Module -1
  "-1.1-what-amazon-is",
  "-1.2-surfaces",
  "-1.3-ad-object-model",
  // Module 0
  "0.1-welcome",
  "0.2-platform-tour",
  "0.3-first-simulation",
  // Module 1
  "1.1-read-ppc-data-before-you-change-it",
  "1.2-cpc-ctr",
  "1.3-acos-tacos-profitability",
  "1.4-roas-measuring-return",
  "1.5-metrics-in-practice",
  // Module 2
  "2.1-match-types",
  "2.2-keyword-research-workflow",
  "2.3-negative-keywords",
  "2.4-keyword-grouping",
  // Module 3
  "3.1-listing-quality-score",
  "3.2-listing-anatomy",
  "3.3-aplus-content",
  // Module 4
  "4.1-sponsored-products",
  "4.2-sponsored-brands-display",
  "4.3-campaign-structure",
  "4.4-campaign-architecture-practice",
  // Module 5
  "5.1-campaign-portfolios",
  "5.2-budget-pacing",
  "5.3-seasonal-strategy",
  // Module 6
  "6.1-bid-strategies",
  "6.2-placement-adjustments",
  "6.3-bid-elevator-prep",
  // Module 7
  "7.1-search-term-analysis",
  "7.2-negative-keywords",
  "7.3-str-triage-prep",
  // Module 8
  "8.1-brand-analytics",
  "8.2-share-of-voice",
  "8.3-competitor-benchmarking",
  // Module 9
  "9.1-weekly-routine",
  "9.2-one-change-at-a-time",
  "9.3-how-much-data-is-enough",
  // Module 10
  "10.1-simple-report-structure",
  "10.2-explaining-numbers",
  "10.3-no-impressions-low-ctr",
  "10.4-clicks-no-sales-high-acos",
  // Module 11
  "11.1-tasks-by-cadence",
  "11.2-permissions-ladder",
  "11.3-sops-change-log",
  "11.4-client-communication-capstone",
] as const;
export type WorksheetLessonSlug = (typeof WORKSHEET_LESSON_SLUGS)[number];

export interface WorksheetH2Spec {
  /** kebab-case anchor matching the :::worksheet directive's id attribute. */
  readonly h2Anchor: string;
  /** Human-readable H2 title for display in the rendered artifact. */
  readonly h2Title: string;
  /** Field keys the student fills in for this H2. 1-3 keys. */
  readonly fieldKeys: readonly string[];
}

export const WORKSHEET_H2_SPECS: Readonly<Record<WorksheetLessonSlug, readonly WorksheetH2Spec[]>> =
  {
    // Module 1 carries the bulk of the existing 34-field Module 1
    // worksheet, anchored to the teaching H2s. Module 1 lessons retain
    // their existing field shapes; the only change is the row count goes
    // from 5 (one per lesson) to ~30 (one per content H2), still keyed
    // by the same fields.
    "1.1-read-ppc-data-before-you-change-it": [
      {
        h2Anchor: "what-the-numbers-actually-mean",
        h2Title: "What the numbers actually mean",
        fieldKeys: ["observation", "metricToWatchFirst"],
      },
      {
        h2Anchor: "meet-the-big-six",
        h2Title: "Meet the Big Six",
        fieldKeys: [
          "productName",
          "weeklyImpressions",
          "weeklyClicks",
          "weeklyAdSpend",
          "weeklyOrders",
          "weeklyAdSales",
          "weeklyTotalSales",
        ],
      },
      {
        h2Anchor: "start-with-one-case",
        h2Title: "Start with one case",
        fieldKeys: ["chosenProduct", "dataWindow"],
      },
      {
        h2Anchor: "ask-the-questions-in-order",
        h2Title: "Ask the questions in order",
        fieldKeys: ["firstQuestion", "secondQuestion"],
      },
      {
        h2Anchor: "read-the-pattern-not-one-number",
        h2Title: "Read the pattern, not one number",
        fieldKeys: ["patternObserved", "campaignObjective"],
      },
    ],
    "1.2-cpc-ctr": [
      {
        h2Anchor: "how-an-amazon-search-ad-auction-works",
        h2Title: "How an Amazon search ad auction works",
        fieldKeys: ["auctionNote"],
      },
      {
        h2Anchor: "cpc-whats-a-click-actually-worth",
        h2Title: "CPC: what's a click actually worth?",
        fieldKeys: ["productCvr", "targetAcos", "maxCpc", "actualCpc", "aboveOrBelowMax"],
      },
      {
        h2Anchor: "ctr-are-people-clicking",
        h2Title: "CTR: are people clicking?",
        fieldKeys: ["weeklyCtr", "ctrDiagnosis"],
      },
      {
        h2Anchor: "the-cpc-ctr-relationship",
        h2Title: "The CPC-CTR relationship",
        fieldKeys: ["firstCheck", "oneChange"],
      },
    ],
    "1.3-acos-tacos-profitability": [
      {
        h2Anchor: "acos-the-scorecard",
        h2Title: "ACoS: the scorecard",
        fieldKeys: ["weeklyActualAcos", "profitMarginBeforeAds"],
      },
      {
        h2Anchor: "tacos-the-big-picture",
        h2Title: "TACoS: the big picture",
        fieldKeys: ["weeklyTacos"],
      },
      {
        h2Anchor: "the-profitability-equation",
        h2Title: "The profitability equation",
        fieldKeys: ["totalCostToSell", "breakEvenAcos"],
      },
      {
        h2Anchor: "when-acos-is-misleading",
        h2Title: "When ACoS is misleading",
        fieldKeys: ["misleadingCase"],
      },
      {
        h2Anchor: "worked-example-full-week-analysis",
        h2Title: "Worked example: full week analysis",
        fieldKeys: ["profitOrLossPerAdSale"],
      },
    ],
    "1.4-roas-measuring-return": [
      {
        h2Anchor: "the-simple-math",
        h2Title: "The simple math",
        fieldKeys: ["productProfitMargin", "minimumRoas"],
      },
      {
        h2Anchor: "roas-vs-acos-same-relationship-two-views",
        h2Title: "ROAS vs ACoS: same relationship, two views",
        fieldKeys: ["translationNote"],
      },
      {
        h2Anchor: "when-to-target-a-specific-roas",
        h2Title: "When to target a specific ROAS",
        fieldKeys: ["targetRoasWithCushion"],
      },
      {
        h2Anchor: "worked-example-two-campaigns-compared",
        h2Title: "Worked example: two campaigns compared",
        fieldKeys: ["weeklyActualRoas", "aboveOrBelowMinimum"],
      },
    ],
    "1.5-metrics-in-practice": [
      {
        h2Anchor: "pattern-1-high-ctr-low-cvr-high-acos",
        h2Title: "Pattern 1: high CTR, low CVR, high ACoS",
        fieldKeys: ["diagnosis"],
      },
      {
        h2Anchor: "pattern-2-low-ctr-good-cvr-low-acos",
        h2Title: "Pattern 2: low CTR, good CVR, low ACoS",
        fieldKeys: ["diagnosis"],
      },
      {
        h2Anchor: "pattern-3-high-cpc-low-cvr-critical-acos",
        h2Title: "Pattern 3: high CPC, low CVR, critical ACoS",
        fieldKeys: ["diagnosis"],
      },
      {
        h2Anchor: "pattern-4-good-ctr-good-cvr-rising-tacos",
        h2Title: "Pattern 4: good CTR, good CVR, rising TACoS",
        fieldKeys: ["diagnosis"],
      },
      {
        h2Anchor: "the-diagnostic-framework",
        h2Title: "The diagnostic framework",
        fieldKeys: ["weeklyPattern", "bottleneckMetric"],
      },
      {
        h2Anchor: "scenario-walkthrough-kitchen-scale",
        h2Title: "Scenario walkthrough: kitchen scale",
        fieldKeys: ["rootCauseToCheckFirst"],
      },
      {
        h2Anchor: "the-maximum-cpc-formula",
        h2Title: "The maximum-CPC formula",
        fieldKeys: ["maxCpcRecap"],
      },
    ],
    // Modules -1, 0, 2-11 receive worksheet entries below. Field
    // inventories are intentionally minimal (1-2 fields per H2) until
    // the lesson's primary teaching idea matures — these are seed
    // prompts the student fills in as they read, not graded columns.
    "-1.1-what-amazon-is": [
      {
        h2Anchor: "what-amazon-the-company-is",
        h2Title: "What Amazon the company is",
        fieldKeys: ["note"],
      },
      { h2Anchor: "who-shops-on-amazon", h2Title: "Who shops on Amazon", fieldKeys: ["note"] },
      { h2Anchor: "who-sells-on-amazon", h2Title: "Who sells on Amazon", fieldKeys: ["note"] },
      {
        h2Anchor: "how-amazon-makes-money-from-a-single-product",
        h2Title: "How Amazon makes money from a single product",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "why-ads-exist-on-amazon-at-all",
        h2Title: "Why ads exist on Amazon at all",
        fieldKeys: ["note"],
      },
      { h2Anchor: "where-you-fit-in", h2Title: "Where you fit in", fieldKeys: ["note"] },
    ],
    "-1.2-surfaces": [
      { h2Anchor: "the-four-surfaces", h2Title: "The four surfaces", fieldKeys: ["note"] },
      {
        h2Anchor: "seller-central-the-sellers-back-office",
        h2Title: "Seller Central, the seller's back office",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "amazon-ads-console-where-ads-live",
        h2Title: "Amazon Ads Console, where ads live",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "project-amazon-ph-academy-this-platform",
        h2Title: "Project Amazon PH Academy, this platform",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-product-detail-page-where-a-shopper-lands",
        h2Title: "The product detail page, where a shopper lands",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "how-the-four-surfaces-connect",
        h2Title: "How the four surfaces connect",
        fieldKeys: ["note"],
      },
    ],
    "-1.3-ad-object-model": [
      {
        h2Anchor: "the-hierarchy-at-a-glance",
        h2Title: "The hierarchy at a glance",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "level-1-the-ads-account",
        h2Title: "Level 1: the ads account",
        fieldKeys: ["note"],
      },
      { h2Anchor: "level-2-the-campaign", h2Title: "Level 2: the campaign", fieldKeys: ["note"] },
      { h2Anchor: "level-3-the-ad-group", h2Title: "Level 3: the ad group", fieldKeys: ["note"] },
      {
        h2Anchor: "level-4-the-keyword-or-product-target",
        h2Title: "Level 4: the keyword or product target",
        fieldKeys: ["note"],
      },
      { h2Anchor: "level-5-the-ad", h2Title: "Level 5: the ad", fieldKeys: ["note"] },
      { h2Anchor: "how-a-click-happens", h2Title: "How a click happens", fieldKeys: ["note"] },
      {
        h2Anchor: "why-the-hierarchy-matters",
        h2Title: "Why the hierarchy matters",
        fieldKeys: ["note"],
      },
    ],
    "0.1-welcome": [
      {
        h2Anchor: "who-you-are-in-this-system",
        h2Title: "Who you are in this system",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "what-amazon-actually-is",
        h2Title: "What Amazon actually is",
        fieldKeys: ["note"],
      },
      { h2Anchor: "a-vocabulary-snapshot", h2Title: "A vocabulary snapshot", fieldKeys: ["note"] },
      {
        h2Anchor: "the-job-in-one-sentence",
        h2Title: "The job in one sentence",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "this-is-not-a-memorization-course",
        h2Title: "This is not a memorization course",
        fieldKeys: ["note"],
      },
      { h2Anchor: "your-work-loop", h2Title: "Your work loop", fieldKeys: ["note"] },
      {
        h2Anchor: "the-current-course-path",
        h2Title: "The current course path",
        fieldKeys: ["note"],
      },
      { h2Anchor: "how-a-lesson-works", h2Title: "How a lesson works", fieldKeys: ["note"] },
      {
        h2Anchor: "your-first-professional-habit",
        h2Title: "Your first professional habit",
        fieldKeys: ["note"],
      },
    ],
    "0.2-platform-tour": [
      {
        h2Anchor: "your-four-main-sections",
        h2Title: "Your four main sections",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "courses-your-learning-path",
        h2Title: "Courses: your learning path",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "tools-where-you-practice",
        h2Title: "Tools: where you practice",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "worked-example-finding-the-right-practice-surface",
        h2Title: "Worked example: finding the right practice surface",
        fieldKeys: ["note"],
      },
      { h2Anchor: "xp-and-badges", h2Title: "XP and badges", fieldKeys: ["note"] },
      {
        h2Anchor: "a-preview-of-the-real-amazon-ads-console",
        h2Title: "A preview of the real Amazon Ads Console",
        fieldKeys: ["note"],
      },
    ],
    "0.3-first-simulation": [
      {
        h2Anchor: "what-a-campaign-actually-is",
        h2Title: 'What a "campaign" actually is',
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "why-this-matters-before-module-1",
        h2Title: "Why this matters before Module 1",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-client-brief-intake-checklist",
        h2Title: "The client-brief intake checklist",
        fieldKeys: ["note"],
      },
    ],
    "2.1-match-types": [
      {
        h2Anchor: "broad-match-discovery",
        h2Title: "Broad Match (Discovery)",
        fieldKeys: ["note"],
      },
      { h2Anchor: "phrase-match-scaling", h2Title: "Phrase Match (Scaling)", fieldKeys: ["note"] },
      {
        h2Anchor: "exact-match-protection",
        h2Title: "Exact Match (Protection)",
        fieldKeys: ["note"],
      },
      { h2Anchor: "match-type-comparison", h2Title: "Match Type Comparison", fieldKeys: ["note"] },
      {
        h2Anchor: "the-hierarchy-strategy",
        h2Title: "The Hierarchy Strategy",
        fieldKeys: ["note"],
      },
    ],
    "2.2-keyword-research-workflow": [
      {
        h2Anchor: "the-four-step-keyword-research-workflow",
        h2Title: "The Four-Step Keyword Research Workflow",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "step-1-research-cast-your-net-wide",
        h2Title: "Step 1: Research (Cast Your Net Wide)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "step-2-analyze-filter-the-noise",
        h2Title: "Step 2: Analyze (Filter the Noise)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "step-3-prioritize-score-your-keywords",
        h2Title: "Step 3: Prioritize (Score Your Keywords)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "step-4-organize-build-your-campaign-structure",
        h2Title: "Step 4: Organize (Build Your Campaign Structure)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "putting-it-all-together-sample-session",
        h2Title: "Putting It All Together: Sample Session",
        fieldKeys: ["note"],
      },
      { h2Anchor: "grouping-decision", h2Title: "Grouping decision", fieldKeys: ["note"] },
    ],
    "2.3-negative-keywords": [
      { h2Anchor: "the-before-and-after", h2Title: "The Before and After", fieldKeys: ["note"] },
      {
        h2Anchor: "negative-match-types-exact-vs-phrase",
        h2Title: "Negative Match Types: Exact vs. Phrase",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-three-sources-of-negative-keywords",
        h2Title: "The Three Sources of Negative Keywords",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-negative-keyword-hierarchy",
        h2Title: "The Negative Keyword Hierarchy",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "beyond-the-search-term-report",
        h2Title: "Beyond the Search Term Report",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "how-often-to-update-negatives",
        h2Title: "How Often to Update Negatives",
        fieldKeys: ["note"],
      },
    ],
    "2.4-keyword-grouping": [
      { h2Anchor: "the-hierarchy", h2Title: "The Hierarchy", fieldKeys: ["note"] },
      {
        h2Anchor: "the-one-theme-per-ad-group-rule",
        h2Title: 'The "One Theme Per Ad Group" Rule',
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "match-type-layering-within-ad-groups",
        h2Title: "Match Type Layering Within Ad Groups",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "real-example-building-the-keyword-groups",
        h2Title: "Real Example: Building the Keyword Groups",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "common-keyword-grouping-mistakes",
        h2Title: "Common Keyword Grouping Mistakes",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-80-20-rule-of-keyword-grouping",
        h2Title: "The 80/20 Rule of Keyword Grouping",
        fieldKeys: ["note"],
      },
    ],
    "3.1-listing-quality-score": [
      {
        h2Anchor: "the-signals-that-actually-move-the-needle",
        h2Title: "The Signals That Actually Move the Needle",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-relevance-feedback-loop",
        h2Title: "The Relevance Feedback Loop",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "illustrative-case-how-listing-strength-can-affect-ad-performance",
        h2Title: "Illustrative Case: How Listing Strength Can Affect Ad Performance",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "quick-wins-vs-long-term-improvements",
        h2Title: "Quick Wins vs. Long-Term Improvements",
        fieldKeys: ["note"],
      },
    ],
    "3.2-listing-anatomy": [
      {
        h2Anchor: "the-title-your-most-important-ppc-asset",
        h2Title: "The Title: Your Most Important PPC Asset",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "bullet-points-the-conversion-engine",
        h2Title: "Bullet Points: The Conversion Engine",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "images-the-ctr-decider",
        h2Title: "Images: The CTR Decider",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "putting-it-all-together-the-ppc-optimized-listing",
        h2Title: "Putting It All Together: The PPC-Optimized Listing",
        fieldKeys: ["note"],
      },
    ],
    "3.3-aplus-content": [
      {
        h2Anchor: "what-brand-registry-gets-you",
        h2Title: "What Brand Registry Gets You",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "how-a-plus-content-boosts-ppc-performance",
        h2Title: "How A+ Content Boosts PPC Performance",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "a-plus-content-modules-that-work-best-for-ppc",
        h2Title: "A+ Content Modules That Work Best for PPC",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "brand-analytics-for-ppc",
        h2Title: "Brand Analytics for PPC",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "without-brand-registry-a-worked-example",
        h2Title: "Without Brand Registry: A Worked Example",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "how-to-get-brand-registry",
        h2Title: "How to Get Brand Registry",
        fieldKeys: ["note"],
      },
    ],
    "4.1-sponsored-products": [
      {
        h2Anchor: "how-sponsored-products-work",
        h2Title: "How Sponsored Products Work",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "where-your-ad-shows-up",
        h2Title: "Where Your Ad Shows Up",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "keyword-targeting-what-triggers-your-ad",
        h2Title: "Keyword Targeting: What Triggers Your Ad",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "product-targeting-pat",
        h2Title: "Product Targeting (PAT)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "campaign-structure-why-it-matters",
        h2Title: "Campaign Structure: Why It Matters",
        fieldKeys: ["note"],
      },
      { h2Anchor: "budget-allocation", h2Title: "Budget Allocation", fieldKeys: ["note"] },
    ],
    "4.2-sponsored-brands-display": [
      { h2Anchor: "sponsored-brands-sb", h2Title: "Sponsored Brands (SB)", fieldKeys: ["note"] },
      { h2Anchor: "sponsored-display-sd", h2Title: "Sponsored Display (SD)", fieldKeys: ["note"] },
      {
        h2Anchor: "when-to-use-each-ad-type",
        h2Title: "When to Use Each Ad Type",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-full-funnel-approach",
        h2Title: "The Full-Funnel Approach",
        fieldKeys: ["note"],
      },
    ],
    "4.3-campaign-structure": [
      { h2Anchor: "the-hierarchy", h2Title: "The Hierarchy", fieldKeys: ["note"] },
      {
        h2Anchor: "why-structure-matters-a-real-example",
        h2Title: "Why Structure Matters: A Real Example",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-campaign-structure-template",
        h2Title: "The Campaign Structure Template",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "naming-conventions-that-save-time",
        h2Title: "Naming Conventions That Save Time",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "negative-keywords-the-unsung-hero",
        h2Title: "Negative Keywords: The Unsung Hero",
        fieldKeys: ["note"],
      },
    ],
    "4.4-campaign-architecture-practice": [
      { h2Anchor: "the-scenario", h2Title: "The Scenario", fieldKeys: ["note"] },
      {
        h2Anchor: "what-youll-be-evaluated-on",
        h2Title: "What You'll Be Evaluated On",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "complete-your-worksheet-the-launch-qa-checklist",
        h2Title: "Complete your worksheet: the launch QA checklist",
        fieldKeys: ["note"],
      },
      { h2Anchor: "the-building-process", h2Title: "The Building Process", fieldKeys: ["note"] },
      {
        h2Anchor: "common-pitfalls-and-how-to-avoid-them",
        h2Title: "Common Pitfalls (And How to Avoid Them)",
        fieldKeys: ["note"],
      },
      { h2Anchor: "ready-to-build", h2Title: "Ready to Build?", fieldKeys: ["note"] },
    ],
    "5.1-campaign-portfolios": [
      { h2Anchor: "what-portfolios-do", h2Title: "What Portfolios Do", fieldKeys: ["note"] },
      {
        h2Anchor: "the-portfolio-structure",
        h2Title: "The Portfolio Structure",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "budget-allocation-across-portfolios",
        h2Title: "Budget Allocation Across Portfolios",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "negatives-still-live-at-the-campaign-level",
        h2Title: "Negatives Still Live at the Campaign Level",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "when-to-use-portfolios-vs-standalone",
        h2Title: "When to Use Portfolios vs. Standalone",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "portfolio-naming-convention",
        h2Title: "Portfolio Naming Convention",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "common-portfolio-mistakes",
        h2Title: "Common Portfolio Mistakes",
        fieldKeys: ["note"],
      },
    ],
    "5.2-budget-pacing": [
      { h2Anchor: "amazons-budget-rules", h2Title: "Amazon's Budget Rules", fieldKeys: ["note"] },
      {
        h2Anchor: "the-burn-rate-calculation",
        h2Title: "The Burn Rate Calculation",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "budget-pacing-by-day-of-week",
        h2Title: "Budget Pacing by Day of Week",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "what-to-do-when-you-hit-budget-mid-day",
        h2Title: "What to Do When You Hit Budget Mid-Day",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "monthly-budget-pacing-calendar",
        h2Title: "Monthly Budget Pacing Calendar",
        fieldKeys: ["note"],
      },
    ],
    "5.3-seasonal-strategy": [
      {
        h2Anchor: "the-amazon-seasonal-calendar",
        h2Title: "The Amazon Seasonal Calendar",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-three-phase-seasonal-strategy",
        h2Title: "The Three-Phase Seasonal Strategy",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "seasonal-acos-expectations",
        h2Title: "Seasonal ACoS Expectations",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "pre-built-seasonal-campaign-structure",
        h2Title: "Pre-Built Seasonal Campaign Structure",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "key-seasonal-dates-for-amazon-sellers-us-market",
        h2Title: "Key Seasonal Dates for Amazon Sellers (US Market)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-seasonal-ppc-calendar-template",
        h2Title: "The Seasonal PPC Calendar Template",
        fieldKeys: ["note"],
      },
    ],
    "6.1-bid-strategies": [
      {
        h2Anchor: "how-amazons-auction-actually-works",
        h2Title: "How Amazon's Auction Actually Works",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "strategy-1-fixed-bids-the-flat-rate-taxi",
        h2Title: "Strategy 1: Fixed Bids (The Flat-Rate Taxi)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "strategy-2-dynamic-bids-up-and-down-the-surge-pricing",
        h2Title: "Strategy 2: Dynamic Bids, Up and Down (The Surge Pricing)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "strategy-3-dynamic-bids-down-only-the-smart-discount-taxi",
        h2Title: "Strategy 3: Dynamic Bids, Down Only (The Smart Discount Taxi)",
        fieldKeys: ["note"],
      },
      { h2Anchor: "what-would-you-do", h2Title: "What Would YOU Do?", fieldKeys: ["note"] },
      {
        h2Anchor: "the-decision-framework",
        h2Title: "The Decision Framework",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "how-bid-strategy-affects-acos",
        h2Title: "How Bid Strategy Affects ACoS",
        fieldKeys: ["note"],
      },
    ],
    "6.2-placement-adjustments": [
      {
        h2Anchor: "the-three-placement-options",
        h2Title: "The Three Placement Options",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "how-adjustments-actually-work",
        h2Title: "How Adjustments Actually Work",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-multiplier-trap-run-the-math-before-you-commit",
        h2Title: "The Multiplier Trap (Run the Math Before You Commit)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "try-this-calculate-your-maximum-cpc",
        h2Title: "Try This: Calculate Your Maximum CPC",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "setting-smart-adjustments",
        h2Title: "Setting Smart Adjustments",
        fieldKeys: ["note"],
      },
      { h2Anchor: "the-budget-tradeoff", h2Title: "The Budget Tradeoff", fieldKeys: ["note"] },
    ],
    "6.3-bid-elevator-prep": [
      {
        h2Anchor: "what-the-bid-elevator-tests",
        h2Title: "What the Bid Elevator Tests",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-core-bidding-formula",
        h2Title: "The Core Bidding Formula",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "reading-the-scenario-brief",
        h2Title: "Reading the Scenario Brief",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-bidding-decision-tree",
        h2Title: "The Bidding Decision Tree",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "common-bidding-mistakes",
        h2Title: "Common Bidding Mistakes",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "try-this-practice-calculation",
        h2Title: "Try This: Practice Calculation",
        fieldKeys: ["note"],
      },
      { h2Anchor: "ready-to-elevate", h2Title: "Ready to Elevate", fieldKeys: ["note"] },
    ],
    "7.1-search-term-analysis": [
      {
        h2Anchor: "keywords-vs-search-terms",
        h2Title: "Keywords vs. Search Terms",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-search-term-report-str",
        h2Title: "The Search Term Report (STR)",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-five-categories-of-search-terms",
        h2Title: "The Five Categories of Search Terms",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "statistical-confidence-dont-guess-measure",
        h2Title: "Statistical Confidence: Don't Guess, Measure",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-weekly-optimization-cycle",
        h2Title: "The Weekly Optimization Cycle",
        fieldKeys: ["note"],
      },
    ],
    "7.2-negative-keywords": [
      {
        h2Anchor: "recap-what-2-3-already-covers",
        h2Title: "Recap: What 2.3 Already Covers",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "the-cross-campaign-pattern-worth-restating",
        h2Title: "The Cross-Campaign Pattern (Worth Restating)",
        fieldKeys: ["note"],
      },
    ],
    "7.3-str-triage-prep": [
      { h2Anchor: "the-five-actions", h2Title: "The Five Actions", fieldKeys: ["note"] },
      {
        h2Anchor: "the-decision-flowchart",
        h2Title: "The Decision Flowchart",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "reading-the-data-grid-efficiently",
        h2Title: "Reading the Data Grid Efficiently",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "common-triage-mistakes",
        h2Title: "Common Triage Mistakes",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "try-this-quick-triage-practice",
        h2Title: "Try This: Quick Triage Practice",
        fieldKeys: ["note"],
      },
      { h2Anchor: "ready-to-triage", h2Title: "Ready to Triage", fieldKeys: ["note"] },
    ],
    "8.1-brand-analytics": [
      { h2Anchor: "the-why", h2Title: "The Why", fieldKeys: ["note"] },
      {
        h2Anchor: "what-is-brand-analytics",
        h2Title: "What Is Brand Analytics?",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "search-frequency-report",
        h2Title: "Search Frequency Report",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "market-basket-analysis",
        h2Title: "Market Basket Analysis",
        fieldKeys: ["note"],
      },
      { h2Anchor: "demographics-report", h2Title: "Demographics Report", fieldKeys: ["note"] },
      { h2Anchor: "pro-tips", h2Title: "Pro Tips", fieldKeys: ["note"] },
    ],
    "8.2-share-of-voice": [
      { h2Anchor: "the-why", h2Title: "The Why", fieldKeys: ["note"] },
      {
        h2Anchor: "what-is-share-of-voice",
        h2Title: "What Is Share of Voice?",
        fieldKeys: ["note"],
      },
      { h2Anchor: "the-sov-spectrum", h2Title: "The SOV Spectrum", fieldKeys: ["note"] },
      { h2Anchor: "calculating-your-sov", h2Title: "Calculating Your SOV", fieldKeys: ["note"] },
      {
        h2Anchor: "strategic-positioning-based-on-sov",
        h2Title: "Strategic Positioning Based on SOV",
        fieldKeys: ["note"],
      },
      { h2Anchor: "sov-trend-analysis", h2Title: "SOV Trend Analysis", fieldKeys: ["note"] },
      { h2Anchor: "pro-tips", h2Title: "Pro Tips", fieldKeys: ["note"] },
    ],
    "8.3-competitor-benchmarking": [
      { h2Anchor: "the-why", h2Title: "The Why", fieldKeys: ["note"] },
      {
        h2Anchor: "building-a-competitive-benchmarking-workflow",
        h2Title: "Building a Competitive Benchmarking Workflow",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "step-1-identify-your-key-competitors",
        h2Title: "Step 1: Identify Your Key Competitors",
        fieldKeys: ["note"],
      },
      { h2Anchor: "step-2-gap-analysis", h2Title: "Step 2: Gap Analysis", fieldKeys: ["note"] },
      {
        h2Anchor: "step-3-convert-insights-to-campaign-actions",
        h2Title: "Step 3: Convert Insights to Campaign Actions",
        fieldKeys: ["note"],
      },
      {
        h2Anchor: "step-4-create-a-competitive-dashboard",
        h2Title: "Step 4: Create a Competitive Dashboard",
        fieldKeys: ["note"],
      },
      { h2Anchor: "real-case-study", h2Title: "Real Case Study", fieldKeys: ["note"] },
      { h2Anchor: "pro-tips", h2Title: "Pro Tips", fieldKeys: ["note"] },
    ],
    "9.1-weekly-routine": [
      {
        h2Anchor: "daily-weekly-and-monthly-work",
        h2Title: "Daily, weekly, and monthly work",
        fieldKeys: ["note"],
      },
      { h2Anchor: "worked-example", h2Title: "Worked example", fieldKeys: ["note"] },
    ],
    "9.2-one-change-at-a-time": [
      {
        h2Anchor: "why-one-change-matters",
        h2Title: "Why one change matters",
        fieldKeys: ["note"],
      },
      { h2Anchor: "worked-example", h2Title: "Worked example", fieldKeys: ["note"] },
    ],
    "9.3-how-much-data-is-enough": [
      {
        h2Anchor: "use-thresholds-as-guardrails",
        h2Title: "Use thresholds as guardrails",
        fieldKeys: ["note"],
      },
      { h2Anchor: "worked-example", h2Title: "Worked example", fieldKeys: ["note"] },
    ],
    "10.1-simple-report-structure": [
      {
        h2Anchor: "use-the-same-parts-every-week",
        h2Title: "Use the same parts every week",
        fieldKeys: ["note"],
      },
    ],
    "10.2-explaining-numbers": [
      {
        h2Anchor: "translate-the-metric-before-naming-the-lever",
        h2Title: "Translate the metric before naming the lever",
        fieldKeys: ["note"],
      },
    ],
    "10.3-no-impressions-low-ctr": [
      {
        h2Anchor: "first-checks-by-symptom",
        h2Title: "First checks by symptom",
        fieldKeys: ["note"],
      },
      { h2Anchor: "worked-example", h2Title: "Worked example", fieldKeys: ["note"] },
    ],
    "10.4-clicks-no-sales-high-acos": [
      { h2Anchor: "worked-example", h2Title: "Worked example", fieldKeys: ["note"] },
    ],
    "11.1-tasks-by-cadence": [
      {
        h2Anchor: "match-the-work-to-the-cadence",
        h2Title: "Match the work to the cadence",
        fieldKeys: ["note"],
      },
      { h2Anchor: "worked-example", h2Title: "Worked example", fieldKeys: ["note"] },
    ],
    "11.2-permissions-ladder": [
      {
        h2Anchor: "use-the-permissions-ladder",
        h2Title: "Use the permissions ladder",
        fieldKeys: ["note"],
      },
    ],
    "11.3-sops-change-log": [
      {
        h2Anchor: "build-an-sop-around-a-decision",
        h2Title: "Build an SOP around a decision",
        fieldKeys: ["note"],
      },
    ],
    "11.4-client-communication-capstone": [
      {
        h2Anchor: "the-capstone-work-products",
        h2Title: "The capstone work products",
        fieldKeys: ["note"],
      },
    ],
  } as const;

export interface WorksheetFieldValue {
  readonly studentId: string;
  readonly lessonSlug: WorksheetLessonSlug;
  readonly h2Anchor: string;
  readonly fieldKey: string;
  readonly value: string;
  readonly updatedAt: Date;
}

export function isWorksheetLessonSlug(s: string): s is WorksheetLessonSlug {
  return (WORKSHEET_LESSON_SLUGS as readonly string[]).includes(s);
}

/** True when (lessonSlug, h2Anchor) has a registered spec. */
export function isValidH2Anchor(lessonSlug: WorksheetLessonSlug, h2Anchor: string): boolean {
  return (WORKSHEET_H2_SPECS[lessonSlug] ?? []).some((spec) => spec.h2Anchor === h2Anchor);
}

/** True when fieldKey is one of the registered keys for this H2. */
export function isValidFieldKey(
  lessonSlug: WorksheetLessonSlug,
  h2Anchor: string,
  fieldKey: string,
): boolean {
  const spec = (WORKSHEET_H2_SPECS[lessonSlug] ?? []).find((s) => s.h2Anchor === h2Anchor);
  if (!spec) return false;
  return spec.fieldKeys.includes(fieldKey);
}

export function getH2Spec(
  lessonSlug: WorksheetLessonSlug,
  h2Anchor: string,
): WorksheetH2Spec | undefined {
  return (WORKSHEET_H2_SPECS[lessonSlug] ?? []).find((s) => s.h2Anchor === h2Anchor);
}

export class WorksheetValidationError extends Error {
  constructor(
    public readonly lessonSlug: string,
    public readonly h2Anchor: string,
    public readonly invalidKeys: readonly string[],
  ) {
    super(`unknown worksheet field keys for ${lessonSlug}::${h2Anchor}: ${invalidKeys.join(", ")}`);
    this.name = "WorksheetValidationError";
  }
}

/**
 * Normalize a partial input map into the full per-H2 shape required by
 * the repository. Missing keys fill in with ""; unknown keys throw
 * WorksheetValidationError so the use case layer can return Result.err.
 *
 * Throwing (rather than returning Result) keeps the function a pure
 * shape helper; the use case layer wraps the throw in Result.err.
 */
export function validateWorksheetH2Values(
  lessonSlug: WorksheetLessonSlug,
  h2Anchor: string,
  values: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const spec = getH2Spec(lessonSlug, h2Anchor);
  if (!spec) {
    throw new WorksheetValidationError(lessonSlug, h2Anchor, []);
  }
  const allowed = spec.fieldKeys;
  const allowedSet = new Set<string>(allowed);
  const invalid: string[] = [];
  for (const k of Object.keys(values)) {
    if (!allowedSet.has(k)) invalid.push(k);
  }
  if (invalid.length > 0) {
    throw new WorksheetValidationError(lessonSlug, h2Anchor, invalid);
  }
  const out: Record<string, string> = {};
  for (const k of allowed) out[k] = values[k] ?? "";
  return out;
}
