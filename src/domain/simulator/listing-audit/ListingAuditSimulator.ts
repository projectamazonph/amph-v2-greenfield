/**
 * ListingAuditSimulator: audits Amazon listings and generates keyword research.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 * STORY-080: Listing Audit rubric rewrite. Replaces character-count
 * title/bullet/description scoring with a rule engine across six
 * weighted dimensions (compliance, relevance, accuracy, conversion,
 * mobile, imagery). See docs/stories/STORY-080.md for the full decision
 * record. The category-specific claim lists and required-attribute
 * lists below are starter heuristics pending a PPC subject-matter
 * review -- they are deliberately simple, versioned, and overridable,
 * not asserted as exhaustive Amazon policy.
 *
 * STORY-080 does NOT change the ground-truth fix/skip grading -- that
 * binary model, and its replacement with a contextual, non-binary action
 * set, is STORY-083's job (see the "Ground truth resolution" section
 * below). Only the finding generator and the listing score changed here.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { ListingAuditInput, ListingImage, ImageRole } from "./ListingAuditInput";
import type {
  ListingAuditOutput,
  ListingAudit,
  AuditFinding,
  FindingSeverity,
  FindingAction,
  GradedFinding,
  KeywordResult,
  ScoreDimensions,
  RuleDimension,
  RuleOutcome,
  CategoryVariant,
} from "./ListingAuditOutput";

// ── Category variants ──────────────────────────────────────────────────────

interface CategoryVariantConfig {
  readonly id: CategoryVariant;
  readonly label: string;
  /** Claim phrases prohibited in this category beyond the universal medical-claim list. */
  readonly prohibitedClaimTerms: readonly string[];
  /** Content that should appear somewhere in bullets/description for this category. */
  readonly requiredAttributeTerms: readonly string[];
}

const CATEGORY_VARIANTS: Record<CategoryVariant, CategoryVariantConfig> = {
  general_home: {
    id: "general_home",
    label: "General Hardlines & Home",
    prohibitedClaimTerms: [],
    requiredAttributeTerms: ["material", "dimensions"],
  },
  beauty: {
    id: "beauty",
    label: "Beauty and Personal Care",
    prohibitedClaimTerms: ["eliminates wrinkles", "erases wrinkles", "permanent results"],
    requiredAttributeTerms: ["skin type", "how to use"],
  },
  food_supplements: {
    id: "food_supplements",
    label: "Food and Supplements",
    // Multi-word phrases, not bare "treats"/"cures" -- those single words
    // are genuinely ambiguous ("treats" as in snacks vs. a medical claim)
    // and would false-positive on innocuous copy even with word-boundary matching.
    prohibitedClaimTerms: [
      "cures disease",
      "treats illness",
      "diagnoses conditions",
      "prevents disease",
    ],
    requiredAttributeTerms: ["serving size", "ingredients"],
  },
  electronics: {
    id: "electronics",
    label: "Electronics",
    prohibitedClaimTerms: [],
    requiredAttributeTerms: ["compatible", "requires"],
  },
  apparel: {
    id: "apparel",
    label: "Apparel",
    prohibitedClaimTerms: [],
    requiredAttributeTerms: ["size", "material"],
  },
};

function normalizeCategoryVariant(category: string): CategoryVariant {
  const lower = category.toLowerCase();
  if (/beauty|cosmetic|skincare|makeup|personal care/.test(lower)) return "beauty";
  if (/food|supplement|vitamin|nutrition|grocery/.test(lower)) return "food_supplements";
  if (/electronic|gadget|device|charger|cable|earbud|headphone/.test(lower)) return "electronics";
  if (/apparel|clothing|shoe|shirt|dress|jacket|jean/.test(lower)) return "apparel";
  return "general_home";
}

// ── Title policy (versioned) ────────────────────────────────────────────────

/**
 * 75-character title limit for most non-media categories, effective
 * 2026-07-27, verified against public Amazon Seller Central sources
 * (see docs/simulator-remediation-decisions.md). Same limit applied
 * across all five category variants today -- the config shape supports
 * per-category overrides once a category-specific limit is verified.
 */
const TITLE_POLICY = {
  marketplace: "US",
  policyVersion: "amazon-2026-07-27",
  effectiveDate: "2026-07-27",
  titleMaxChars: 75,
} as const;

// ── Rule engine ──────────────────────────────────────────────────────────

export interface RuleContext {
  readonly title: string;
  readonly lowerTitle: string;
  readonly bullets: readonly string[];
  readonly lowerBullets: readonly string[];
  readonly description: string;
  readonly lowerDescription: string;
  readonly niche: string;
  readonly nicheWords: readonly string[];
  readonly categoryVariant: CategoryVariantConfig;
  readonly marketplace: string;
  readonly images: readonly ListingImage[];
  readonly hasVideo: boolean;
  readonly hasAPlus: boolean;
  // ── STORY-083: ground-truth resolver context ─────────────────────────
  readonly structuredAttributes: Readonly<Record<string, string>>;
  readonly primaryCustomerIntent: string;
  readonly primaryKeywords: readonly string[];
  readonly complianceEvidence: Readonly<Record<string, string>>;
}

interface RuleEvalResult {
  readonly outcome: RuleOutcome;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly suggestion: string;
}

interface RuleDefinition {
  readonly ruleId: string;
  readonly dimension: RuleDimension;
  readonly isCriticalGate: boolean;
  readonly evaluate: (ctx: RuleContext) => RuleEvalResult;
}

const PASS: Omit<RuleEvalResult, "outcome"> = { severity: "info", message: "", suggestion: "" };

function combinedText(ctx: RuleContext): string {
  return `${ctx.lowerTitle} ${ctx.lowerBullets.join(" ")} ${ctx.lowerDescription}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary match so "cures" does not fire on "manicures" or "treats" on "dog treats". */
function containsAny(text: string, terms: readonly string[]): boolean {
  return terms.some((t) => new RegExp(`\\b${escapeRegExp(t.toLowerCase())}\\b`).test(text));
}

const MEDICAL_CLAIM_TERMS = ["cures", "treats disease", "heals", "diagnose", "prevents illness"];
const SUPERLATIVE_TERMS = ["best seller", "#1 rated", "guaranteed", "100% satisfaction guarantee"];
const BENEFIT_PHRASES = ["so you can", "perfect for", "ideal for", "designed to", "helps you"];
const DIFFERENTIATOR_TERMS = ["unlike", "compared to", "stands out", "unique", "premium quality"];

const RULES: readonly RuleDefinition[] = [
  // ── Compliance (25%) ──────────────────────────────────────────────
  {
    ruleId: "title_length_limit",
    dimension: "compliance",
    isCriticalGate: true,
    evaluate: (ctx) => {
      if (ctx.title.length > TITLE_POLICY.titleMaxChars) {
        return {
          outcome: "fail",
          severity: "critical",
          message: `Title is ${ctx.title.length} characters, over the ${TITLE_POLICY.titleMaxChars}-character marketplace limit.`,
          suggestion: `Shorten the title to ${TITLE_POLICY.titleMaxChars} characters or fewer; move overflow detail to Item Highlights.`,
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "prohibited_medical_claims",
    dimension: "compliance",
    isCriticalGate: true,
    evaluate: (ctx) => {
      if (containsAny(combinedText(ctx), MEDICAL_CLAIM_TERMS)) {
        return {
          outcome: "fail",
          severity: "critical",
          message: "Listing content includes an unsubstantiated medical claim.",
          suggestion:
            "Remove disease-treatment/cure language; use compliant structure/function wording instead.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "prohibited_superlative_claims",
    dimension: "compliance",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (containsAny(combinedText(ctx), SUPERLATIVE_TERMS)) {
        return {
          outcome: "warning",
          severity: "warning",
          message: "Listing content includes an unverifiable superlative claim.",
          suggestion:
            'Remove or qualify claims like "best seller" or "guaranteed" that Amazon may flag.',
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "all_caps_abuse",
    dimension: "compliance",
    isCriticalGate: false,
    evaluate: (ctx) => {
      const capsWords = ctx.title
        .split(/\s+/)
        .filter((w) => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
      if (capsWords.length >= 2) {
        return {
          outcome: "warning",
          severity: "warning",
          message: "Title has multiple all-caps words.",
          suggestion:
            "Use standard capitalization; reserve caps for acronyms and brand names only.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "category_prohibited_claims",
    dimension: "compliance",
    isCriticalGate: true,
    evaluate: (ctx) => {
      if (ctx.categoryVariant.prohibitedClaimTerms.length === 0) {
        return { outcome: "notApplicable", ...PASS };
      }
      if (containsAny(combinedText(ctx), ctx.categoryVariant.prohibitedClaimTerms)) {
        return {
          outcome: "fail",
          severity: "critical",
          message: `Listing content includes a claim restricted for ${ctx.categoryVariant.label}.`,
          suggestion:
            "Remove the restricted claim or replace it with compliant, qualified language.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },

  // ── Relevance (20%) ────────────────────────────────────────────────
  {
    ruleId: "niche_in_title",
    dimension: "relevance",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.nicheWords.length === 0) return { outcome: "notApplicable", ...PASS };
      const missing = ctx.nicheWords.filter((w) => !ctx.lowerTitle.includes(w));
      if (missing.length === ctx.nicheWords.length) {
        return {
          outcome: "fail",
          severity: "warning",
          message: "None of the niche's core keywords appear in the title.",
          suggestion: `Add the core niche terms to the title: ${ctx.nicheWords.join(", ")}.`,
        };
      }
      if (missing.length > 0) {
        return {
          outcome: "warning",
          severity: "info",
          message: `Niche keyword${missing.length > 1 ? "s" : ""} "${missing.join(", ")}" not found in title.`,
          suggestion: `Add "${missing[0]}" to the title.`,
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "niche_in_bullets_or_description",
    dimension: "relevance",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.nicheWords.length === 0) return { outcome: "notApplicable", ...PASS };
      const supportingText = `${ctx.lowerBullets.join(" ")} ${ctx.lowerDescription}`;
      const covered = ctx.nicheWords.some((w) => supportingText.includes(w));
      if (!covered) {
        return {
          outcome: "warning",
          severity: "info",
          message: "Bullets and description don't reinforce the niche keywords from the title.",
          suggestion: "Work at least one niche term naturally into a bullet or the description.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "keyword_stuffing",
    dimension: "relevance",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (!ctx.niche) return { outcome: "notApplicable", ...PASS };
      const text = combinedText(ctx);
      const nicheLower = ctx.niche.toLowerCase();
      const occurrences = nicheLower.length > 0 ? text.split(nicheLower).length - 1 : 0;
      if (occurrences >= 4) {
        return {
          outcome: "warning",
          severity: "warning",
          message: `The niche phrase "${ctx.niche}" is repeated ${occurrences} times -- reads as keyword stuffing.`,
          suggestion: "Use synonyms and natural variation instead of repeating the exact phrase.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "backend_keyword_room",
    dimension: "relevance",
    isCriticalGate: false,
    evaluate: (ctx) => {
      const totalChars = ctx.title.length + ctx.bullets.reduce((s, b) => s + b.length, 0);
      if (totalChars >= 1800) {
        return {
          outcome: "warning",
          severity: "info",
          message: "Visible content is close to its limits, so extra keywords will not fit.",
          suggestion: "Move remaining keywords to the backend search-terms field.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },

  // ── Accuracy (15%) ─────────────────────────────────────────────────
  {
    ruleId: "bullet_count_sufficient",
    dimension: "accuracy",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.bullets.length === 0) {
        return {
          outcome: "fail",
          severity: "critical",
          message: "No bullet points found.",
          suggestion: "Add at least 3-5 keyword-rich bullet points.",
        };
      }
      if (ctx.bullets.length < 3) {
        return {
          outcome: "warning",
          severity: "warning",
          message: `Only ${ctx.bullets.length} bullet(s) found: add more for full coverage.`,
          suggestion: "Aim for 5 bullet points (Amazon limit).",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "category_required_attributes",
    dimension: "accuracy",
    isCriticalGate: false,
    evaluate: (ctx) => {
      const required = ctx.categoryVariant.requiredAttributeTerms;
      if (required.length === 0) return { outcome: "notApplicable", ...PASS };
      const supportingText = `${ctx.lowerBullets.join(" ")} ${ctx.lowerDescription}`;
      const foundCount = required.filter((term) =>
        supportingText.includes(term.toLowerCase()),
      ).length;
      if (foundCount === 0) {
        return {
          outcome: "fail",
          severity: "warning",
          message: `Listing is missing ${ctx.categoryVariant.label}-specific attribute information (${required.join(", ")}).`,
          suggestion: `Cover ${required.join(" or ")} in a bullet or the description.`,
        };
      }
      if (foundCount < required.length) {
        return {
          outcome: "warning",
          severity: "info",
          message: `Listing covers some but not all expected ${ctx.categoryVariant.label} attributes.`,
          suggestion: `Also cover: ${required.filter((t) => !supportingText.includes(t.toLowerCase())).join(", ")}.`,
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },

  // ── Conversion (15%) ───────────────────────────────────────────────
  {
    ruleId: "description_length_gate",
    dimension: "conversion",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.description.length === 0) {
        return {
          outcome: "fail",
          severity: "warning",
          message: "Description is empty.",
          suggestion: "Write at least 200 characters covering features and benefits.",
        };
      }
      if (ctx.description.length < 100) {
        return {
          outcome: "warning",
          severity: "warning",
          message: "Description is short.",
          suggestion: "Expand to at least 200 characters covering features and benefits.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "benefit_language_present",
    dimension: "conversion",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (!containsAny(`${ctx.lowerBullets.join(" ")} ${ctx.lowerDescription}`, BENEFIT_PHRASES)) {
        return {
          outcome: "warning",
          severity: "info",
          message:
            "Bullets and description read as feature lists without connecting to a customer benefit.",
          suggestion:
            'Frame at least one bullet as a benefit, e.g. "...so you can..." or "perfect for...".',
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "differentiation_signal",
    dimension: "conversion",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (
        !containsAny(`${ctx.lowerBullets.join(" ")} ${ctx.lowerDescription}`, DIFFERENTIATOR_TERMS)
      ) {
        return {
          outcome: "warning",
          severity: "info",
          message: "Listing doesn't signal what makes this product different from competitors.",
          suggestion:
            'Add a differentiator, e.g. "unlike standard X, this..." or "premium quality".',
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },

  // ── Mobile (10%) ───────────────────────────────────────────────────
  {
    ruleId: "title_front_loaded",
    dimension: "mobile",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.nicheWords.length === 0) return { outcome: "notApplicable", ...PASS };
      const visiblePrefix = ctx.lowerTitle.slice(0, 40);
      if (!ctx.nicheWords.some((w) => visiblePrefix.includes(w))) {
        return {
          outcome: "warning",
          severity: "info",
          message:
            "The product's core identity isn't clear within the first 40 characters of the title.",
          suggestion: "Front-load the title with the product type and key niche term.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "bullet_length_scannable",
    dimension: "mobile",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.bullets.length === 0) return { outcome: "notApplicable", ...PASS };
      if (ctx.bullets.some((b) => b.length > 200)) {
        return {
          outcome: "warning",
          severity: "info",
          message: "At least one bullet is long enough to wall-of-text on mobile.",
          suggestion: "Keep bullets under ~200 characters so they scan well on mobile.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },

  // ── Imagery (15%) ──────────────────────────────────────────────────
  {
    ruleId: "main_image_present",
    dimension: "imagery",
    // No main image at all is strictly worse than a wrong-background main
    // image (main_image_white_background, below), which already gates --
    // so this must gate at least as hard.
    isCriticalGate: true,
    evaluate: (ctx) => {
      if (!ctx.images.some((img) => img.role === "main")) {
        return {
          outcome: "fail",
          severity: "critical",
          message: "No main product image.",
          suggestion: "Add a main image showing the product against a plain white background.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "main_image_white_background",
    dimension: "imagery",
    // A real, hard Amazon requirement (not just a quality nice-to-have) --
    // violating it risks listing suppression, so it gates like a
    // compliance failure even though it's weighted under "imagery".
    isCriticalGate: true,
    evaluate: (ctx) => {
      const main = ctx.images.find((img) => img.role === "main");
      if (!main) return { outcome: "notApplicable", ...PASS };
      if (!main.whiteBackground) {
        return {
          outcome: "fail",
          severity: "critical",
          message: "Main image does not use a plain white background.",
          suggestion: "Amazon requires the main image to be on a pure white background.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "lifestyle_image_present",
    dimension: "imagery",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (!ctx.images.some((img) => img.role === "lifestyle")) {
        return {
          outcome: "warning",
          severity: "info",
          message: "No lifestyle image showing the product in use.",
          suggestion: "Add a lifestyle image to help buyers picture the product in context.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "image_count_sufficient",
    dimension: "imagery",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (ctx.images.length < 5) {
        return {
          outcome: "warning",
          severity: "info",
          message: `Only ${ctx.images.length} image(s) -- Amazon listings convert best with 5+.`,
          suggestion: "Add more images: additional angles, scale, and use-case shots.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "infographic_or_dimensions_present",
    dimension: "imagery",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (!ctx.images.some((img) => img.role === "infographic" || img.role === "dimensions")) {
        return {
          outcome: "warning",
          severity: "info",
          message: "No infographic or dimensions image.",
          suggestion:
            "Add an infographic or dimensions image to communicate scale and key facts at a glance.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
  {
    ruleId: "supporting_media_present",
    dimension: "imagery",
    isCriticalGate: false,
    evaluate: (ctx) => {
      if (!ctx.hasVideo && !ctx.hasAPlus) {
        return {
          outcome: "warning",
          severity: "info",
          message: "No video or A+ Content.",
          suggestion: "Add a product video or A+ Content to support the listing with richer media.",
        };
      }
      return { outcome: "pass", ...PASS };
    },
  },
];

export const DIMENSION_WEIGHTS: Record<RuleDimension, number> = {
  compliance: 0.25,
  relevance: 0.2,
  accuracy: 0.15,
  conversion: 0.15,
  mobile: 0.1,
  imagery: 0.15,
};

const CRITICAL_GATE_CAP = 59;

function outcomePoints(outcome: RuleOutcome): number {
  switch (outcome) {
    case "pass":
      return 1;
    case "warning":
      return 0.5;
    case "fail":
      return 0;
    case "notApplicable":
      return 0; // excluded from denominator, so never actually averaged in
  }
}

// ── Keyword research (unchanged -- STORY-081's concern) ────────────────────

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

// ── Ground truth resolution (STORY-083) ──────────────────────────────────
//
// Replaces the binary `severity === "info" ? "skip" : "fix"` ground truth,
// which meant "mark everything fix" passed at every difficulty. Each
// finding's expected action is resolved from its ruleId + the listing's
// ListingScenarioContext, not from severity alone -- severity only backs
// the *default* resolution for rules with no documented context override.
//
// Design boundary: STORY-080's finding generator (RULES, evaluate()) is
// untouched. This section only decides what a student *should have done*
// about a finding that's already been generated.

export interface ExpectedActionResult {
  readonly expectedAction: FindingAction;
  readonly acceptedActions: readonly FindingAction[];
  readonly rationale: string;
  readonly evidenceRefs: readonly string[];
}

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = { critical: 3, warning: 2, info: 1 };

/**
 * Rules whose failure risks real Amazon compliance/suppression action --
 * the only rules where `escalate` (vs. an outright `skip`) is ever the
 * correct call for documented-but-unresolved evidence. Not the same set as
 * `isCriticalGate` on RuleDefinition: some critical-severity findings
 * (e.g. `bullet_count_sufficient` at zero bullets) are objectively
 * true/false with no compliance ambiguity possible, so they don't need
 * the escalate nuance -- they stay in the plain severity-based default.
 */
const CRITICAL_GATE_RULE_IDS: ReadonlySet<string> = new Set([
  "title_length_limit",
  "prohibited_medical_claims",
  "category_prohibited_claims",
  "main_image_present",
  "main_image_white_background",
]);

/**
 * Severity-informed fallback for any rule without a specific override
 * below. Severity describes potential impact, not the correct action, but
 * absent more specific context it's the only signal available.
 */
function defaultResolution(finding: AuditFinding): ExpectedActionResult {
  if (finding.severity === "info") {
    return {
      expectedAction: "skip",
      acceptedActions: ["skip", "defer"],
      rationale:
        "Low-impact finding with no compliance risk; skipping or scheduling it later is reasonable.",
      evidenceRefs: [],
    };
  }
  if (finding.severity === "warning") {
    return {
      expectedAction: "fixNow",
      acceptedActions: ["fixNow", "defer"],
      rationale:
        "A meaningful listing-quality issue; act on it now or schedule it -- don't ignore it.",
      evidenceRefs: [],
    };
  }
  return {
    expectedAction: "fixNow",
    acceptedActions: ["fixNow"],
    rationale: "Critical issue with no documented context to disprove it; must be fixed.",
    evidenceRefs: [],
  };
}

/**
 * The five real-compliance-risk rules: never skippable outright. Documented
 * `complianceEvidence` for the ruleId either disproves the finding (value
 * prefixed "disproven:" -> skip) or merely documents genuine ambiguity
 * (any other value -> escalate, per the story decision "if compliance is
 * uncertain rather than disproven, the correct action is escalate, not
 * skip"). No evidence at all -> the violation is real; must fix now.
 */
function resolveCriticalGate(finding: AuditFinding, ctx: RuleContext): ExpectedActionResult | null {
  if (!CRITICAL_GATE_RULE_IDS.has(finding.ruleId)) return null;

  const evidence = ctx.complianceEvidence[finding.ruleId];
  if (evidence === undefined) {
    return {
      expectedAction: "fixNow",
      acceptedActions: ["fixNow"],
      rationale:
        "Critical compliance or suppression risk with no documented evidence to the contrary -- must be fixed.",
      evidenceRefs: [],
    };
  }
  if (evidence.toLowerCase().startsWith("disproven:")) {
    return {
      expectedAction: "skip",
      acceptedActions: ["skip"],
      rationale: `Documented evidence disproves this as a false positive: ${evidence}`,
      evidenceRefs: [`complianceEvidence.${finding.ruleId}`],
    };
  }
  return {
    expectedAction: "escalate",
    acceptedActions: ["escalate"],
    rationale: `Compliance risk is plausible but not disproven -- flag for human review: ${evidence}`,
    evidenceRefs: [`complianceEvidence.${finding.ruleId}`],
  };
}

/**
 * Rule-specific overrides encoding the six documented skip cases
 * (docs/stories/STORY-083.md). Each checks the context that would actually
 * disprove the finding for that rule; returns null (fall through to the
 * severity default) when the context doesn't support a skip.
 */
const OVERRIDE_RESOLVERS: Readonly<
  Record<string, (finding: AuditFinding, ctx: RuleContext) => ExpectedActionResult | null>
> = {
  // Skip case: an exact niche keyword is absent from the title, but
  // another primary keyword (this scenario's stand-in for "a clear
  // synonym") already covers the customer's intent there.
  niche_in_title: (_finding, ctx) => {
    const titleHasAnyPrimaryKeyword = ctx.primaryKeywords.some((k) =>
      ctx.lowerTitle.includes(k.toLowerCase()),
    );
    if (!titleHasAnyPrimaryKeyword || ctx.primaryCustomerIntent.length === 0) return null;
    return {
      expectedAction: "skip",
      acceptedActions: ["skip", "defer"],
      rationale:
        "A primary keyword already covers the customer's intent in the title; adding the exact missing term would risk keyword stuffing.",
      evidenceRefs: ["primaryKeywords", "primaryCustomerIntent"],
    };
  },
  // Skip case: "BPA-free" (or similar) incorrectly flagged as a
  // promotional superlative -- it's a material fact, not marketing copy.
  prohibited_superlative_claims: (finding, ctx) => {
    const evidence = ctx.complianceEvidence[finding.ruleId];
    if (evidence === undefined) return null;
    return {
      expectedAction: "skip",
      acceptedActions: ["skip"],
      rationale: `Documented compliance evidence disproves this finding: ${evidence}`,
      evidenceRefs: [`complianceEvidence.${finding.ruleId}`],
    };
  },
  // Skip case: title is long, but the first-screen (~40 char) portion
  // already identifies the product per the documented customer intent.
  title_front_loaded: (_finding, ctx) => {
    const visiblePrefix = ctx.lowerTitle.slice(0, 40);
    const intentWords = ctx.primaryCustomerIntent.toLowerCase().split(/\s+/).filter(Boolean);
    const prefixCoversIntent = intentWords.some((w) => visiblePrefix.includes(w));
    if (!prefixCoversIntent) return null;
    return {
      expectedAction: "skip",
      acceptedActions: ["skip", "defer"],
      rationale:
        "The first 40 characters already identify the product per the documented customer intent.",
      evidenceRefs: ["primaryCustomerIntent"],
    };
  },
  // Skip case (apparel/electronics): a required attribute isn't in the
  // visible copy, but structured listing data (size chart, compatibility
  // table) already covers it in full.
  category_required_attributes: (_finding, ctx) => {
    const required = ctx.categoryVariant.requiredAttributeTerms;
    if (required.length === 0 || Object.keys(ctx.structuredAttributes).length === 0) return null;
    const coveredByStructuredData = required.every((term) =>
      Object.keys(ctx.structuredAttributes).some((k) =>
        k.toLowerCase().includes(term.toLowerCase()),
      ),
    );
    if (!coveredByStructuredData) return null;
    return {
      expectedAction: "skip",
      acceptedActions: ["skip", "defer"],
      rationale:
        "Structured listing data (e.g. a size chart or compatibility table) already covers the required attributes outside the visible copy.",
      evidenceRefs: ["structuredAttributes"],
    };
  },
  // Skip case: six images instead of seven, but every image role this
  // category actually needs is already present -- the raw count doesn't
  // indicate a real gap.
  image_count_sufficient: (_finding, ctx) => {
    const requiredRoles: readonly ImageRole[] = ["main", "lifestyle", "infographic"];
    const presentRoles = new Set(ctx.images.map((img) => img.role));
    const allRequiredRolesPresent = requiredRoles.every((r) => presentRoles.has(r));
    if (!allRequiredRolesPresent) return null;
    return {
      expectedAction: "skip",
      acceptedActions: ["skip", "defer"],
      rationale:
        "Every image role this category needs is already present; the raw image count doesn't indicate a real gap.",
      evidenceRefs: ["images"],
    };
  },
};

export function resolveExpectedAction(
  finding: AuditFinding,
  ctx: RuleContext,
  databaseRules: readonly import("@/domain/entities/ListingAuditRule").ListingAuditRule[] = [],
): ExpectedActionResult {
  const criticalGateResult = resolveCriticalGate(finding, ctx);
  if (criticalGateResult) return criticalGateResult;

  // STORY-083: Check database rules first (persisted ListingAuditRule)
  const ruleBasedResult = resolveFromDatabaseRules(finding, ctx, databaseRules);
  if (ruleBasedResult) return ruleBasedResult;

  // STORY-083: Fall back to hardcoded OVERRIDE_RESOLVERS
  const override = OVERRIDE_RESOLVERS[finding.ruleId]?.(finding, ctx);
  if (override) return override;

  return defaultResolution(finding);
}

/**
 * STORY-083: Resolve action from persisted ListingAuditRule entities.
 * Returns the first matching rule's action, or null if no rule matches.
 */
function resolveFromDatabaseRules(
  finding: AuditFinding,
  ctx: RuleContext,
  rules: readonly import("@/domain/entities/ListingAuditRule").ListingAuditRule[],
): ExpectedActionResult | null {
  const context = {
    category: finding.category,
    imagesCount: ctx.images.length,
    hasAPlus: ctx.hasAPlus,
    hasVideo: ctx.hasVideo,
    price: ctx.price,
    seasonalPeriod: ctx.seasonalPeriod,
    attributes: ctx.structuredAttributes,
  };

  const result = import("@/domain/entities/ListingAuditRule").resolveExpectedAction(
    rules,
    {
      ruleId: finding.ruleId,
      dimension: finding.dimension,
      severity: finding.severity,
    },
    context,
  );

  return {
    expectedAction: result.expectedAction,
    acceptedActions: result.acceptedActions,
    rationale: result.rationale,
    evidenceRefs: [],
  };
}

function buildGradedFindings(
  findings: readonly AuditFinding[],
  userFindingActions: Readonly<Record<string, FindingAction>> | undefined,
  ctx: RuleContext,
  databaseRules: readonly import("@/domain/entities/ListingAuditRule").ListingAuditRule[] = [],
): GradedFinding[] {
  return findings.map((f) => {
    const resolution = resolveExpectedAction(f, ctx, databaseRules);
    const userChoice = userFindingActions?.[f.id];
    const isCorrect = userChoice !== undefined && resolution.acceptedActions.includes(userChoice);
    return {
      ...f,
      expectedAction: resolution.expectedAction,
      acceptedActions: resolution.acceptedActions,
      rationale: resolution.rationale,
      evidenceRefs: resolution.evidenceRefs,
      userChoice,
      isCorrect,
    };
  });
}

function scoreDirection(gradedFindings: readonly GradedFinding[]): number {
  if (gradedFindings.length === 0) return 100;
  const correct = gradedFindings.filter((f) => f.isCorrect).length;
  return Math.round((correct / gradedFindings.length) * 100);
}

/**
 * Severity-weighted F1 of the student's `fixNow` decisions -- generalized
 * from STORY-080's "fix" to "fixNow" (the only action that means "act on
 * this immediately"). Rewards correctly identifying what's actually urgent
 * AND not over-flagging things that aren't.
 */
function scorePriorityCoverage(gradedFindings: readonly GradedFinding[]): number {
  if (gradedFindings.length === 0) return 100;

  const weightOf = (fs: readonly GradedFinding[]) =>
    fs.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);

  const mustFixNow = gradedFindings.filter((f) => f.expectedAction === "fixNow");
  const userFixedNow = gradedFindings.filter((f) => f.userChoice === "fixNow");
  const correctlyFixedNow = mustFixNow.filter((f) => f.userChoice === "fixNow");

  const mustFixNowWeight = weightOf(mustFixNow);
  const userFixedNowWeight = weightOf(userFixedNow);
  const hitWeight = weightOf(correctlyFixedNow);

  if (mustFixNowWeight === 0) return userFixedNowWeight === 0 ? 100 : 0;

  const recall = hitWeight / mustFixNowWeight;
  const precision = userFixedNowWeight === 0 ? 0 : hitWeight / userFixedNowWeight;
  if (recall + precision === 0) return 0;

  return Math.round(((2 * recall * precision) / (recall + precision)) * 100);
}

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
    // Only the US policy is verified today (see TITLE_POLICY above), so an
    // unsupported marketplace must not be stamped onto findings that were
    // actually graded against US thresholds.
    const requestedMarketplace = input.marketplace ?? TITLE_POLICY.marketplace;
    const marketplace =
      requestedMarketplace === TITLE_POLICY.marketplace
        ? requestedMarketplace
        : TITLE_POLICY.marketplace;
    const images = input.images ?? [];
    const hasVideo = input.hasVideo ?? false;
    const hasAPlus = input.hasAPlus ?? false;
    const structuredAttributes = input.structuredAttributes ?? {};
    const primaryCustomerIntent = input.primaryCustomerIntent ?? "";
    const primaryKeywords = input.primaryKeywords ?? [];
    const complianceEvidence = input.complianceEvidence ?? {};

    if (!niche && !title) {
      const emptyDimensionScores = Object.fromEntries(
        (Object.keys(DIMENSION_WEIGHTS) as RuleDimension[]).map((d) => [d, 0]),
      ) as Record<RuleDimension, number>;
      return {
        audit: { dimensionScores: emptyDimensionScores, overallScore: 0, findings: [] },
        keywordResearch: { keywords: [], searchVolumeEstimate: 0 },
        score: 0,
        gradedFindings: [],
        scoreDimensions: userFindingActions !== undefined ? computeDimensionScores([]) : null,
      };
    }

    const categoryVariant = CATEGORY_VARIANTS[normalizeCategoryVariant(input.category)];
    const ctx: RuleContext = {
      title,
      lowerTitle: title.toLowerCase(),
      bullets,
      lowerBullets: bullets.map((b) => b.toLowerCase()),
      description,
      lowerDescription: description.toLowerCase(),
      niche,
      nicheWords: niche.toLowerCase().split(/\s+/).filter(Boolean),
      categoryVariant,
      marketplace,
      images,
      hasVideo,
      hasAPlus,
      structuredAttributes,
      primaryCustomerIntent,
      primaryKeywords,
      complianceEvidence,
    };

    // ── Evaluate every rule ─────────────────────────────────────────────
    const evaluations = RULES.map((rule) => ({ rule, result: rule.evaluate(ctx) }));

    const allFindings: AuditFinding[] = evaluations
      .filter(({ result }) => result.outcome === "warning" || result.outcome === "fail")
      .map(({ rule, result }) => ({
        // ruleId-derived, not positional, so the same finding keeps the
        // same id across runs even if an earlier rule's outcome changes.
        id: `finding-${rule.ruleId}`,
        ruleId: rule.ruleId,
        dimension: rule.dimension,
        severity: result.severity,
        isCriticalGate: rule.isCriticalGate,
        message: result.message,
        suggestion: result.suggestion,
        category: categoryVariant.id,
        marketplace,
        policyVersion: TITLE_POLICY.policyVersion,
        effectiveDate: TITLE_POLICY.effectiveDate,
      }));

    // ── Dimension scores ─────────────────────────────────────────────────
    const dimensionScores = Object.fromEntries(
      (Object.keys(DIMENSION_WEIGHTS) as RuleDimension[]).map((dim) => {
        const applicable = evaluations.filter(
          ({ rule, result }) => rule.dimension === dim && result.outcome !== "notApplicable",
        );
        if (applicable.length === 0) return [dim, 100];
        const points = applicable.reduce(
          (sum, { result }) => sum + outcomePoints(result.outcome),
          0,
        );
        return [dim, Math.round((points / applicable.length) * 100)];
      }),
    ) as Record<RuleDimension, number>;

    const weightedScore = (Object.keys(DIMENSION_WEIGHTS) as RuleDimension[]).reduce(
      (sum, dim) => sum + dimensionScores[dim] * DIMENSION_WEIGHTS[dim],
      0,
    );

    const anyCriticalGateFailed = evaluations.some(
      ({ rule, result }) => rule.isCriticalGate && result.outcome === "fail",
    );

    const overallScore = anyCriticalGateFailed
      ? Math.min(Math.round(weightedScore), CRITICAL_GATE_CAP)
      : Math.round(weightedScore);

    const audit: ListingAudit = { dimensionScores, overallScore, findings: allFindings };

    const keywords = generateKeywords(niche);
    const searchVolumeEstimate = keywords.reduce((sum, k) => sum + k.searchVolumeEstimate, 0);

    const gradedFindings = buildGradedFindings(allFindings, userFindingActions, ctx);
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
