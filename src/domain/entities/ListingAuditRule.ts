/**
 * ListingAuditRule - Instructor-authored rule for context-aware ground truth.
 * STORY-083: Listing Audit: non-binary, context-aware ground truth.
 *
 * Replaces the hardcoded binary rule (severity === "info" ? "skip" : "fix")
 * with a per-finding rule tree that can produce non-binary outcomes
 * based on context (category, price point, seasonal context, etc.).
 *
 * Pure domain - no side effects, no external dependencies.
 */

import { Result } from "@/domain/shared/Result";
import type { RuleDimension, FindingSeverity, FindingAction, CategoryVariant } from "../simulator/listing-audit/ListingAuditOutput";

// Rule condition types
export type RuleConditionType = 
  | "category_equals"
  | "category_in"
  | "images_count_gte"
  | "images_count_lte"
  | "has_a_plus"
  | "has_video"
  | "price_gte"
  | "price_lte"
  | "seasonal_period"
  | "attribute_present"
  | "attribute_equals";

/** A single condition in a rule's when clause */
export interface RuleCondition {
  readonly type: RuleConditionType;
  readonly value: string | number | boolean | string[];
}

/** The action to take when a rule matches */
export interface RuleAction {
  readonly action: FindingAction;
  readonly acceptedActions: readonly FindingAction[];
  readonly rationale: string;
}

/**
 * A rule that determines the expected action for a finding based on context.
 * Rules are evaluated in order; the first matching rule wins.
 */
export interface ListingAuditRule {
  readonly id: string;
  readonly ruleId: string; // Corresponds to AuditFinding.ruleId
  readonly dimension: RuleDimension;
  readonly severity: FindingSeverity;
  /** Category variants this rule applies to. Empty means all categories. */
  readonly applicableCategories: readonly CategoryVariant[];
  /** Conditions that must all be true for this rule to match */
  readonly conditions: readonly RuleCondition[];
  /** The action configuration when this rule matches */
  readonly action: RuleAction;
  /** Priority - lower numbers evaluated first */
  readonly priority: number;
  readonly isActive: boolean;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type ListingAuditRuleError =
  | { kind: "invalid_rule_id" }
  | { kind: "invalid_dimension" }
  | { kind: "invalid_severity" }
  | { kind: "invalid_category" }
  | { kind: "invalid_action" }
  | { kind: "empty_conditions_and_no_default" }
  | { kind: "no_action_specified" };

export interface CreateListingAuditRuleParams {
  readonly id: string;
  readonly ruleId: string;
  readonly dimension: RuleDimension;
  readonly severity: FindingSeverity;
  readonly applicableCategories: readonly CategoryVariant[];
  readonly conditions: readonly RuleCondition[];
  readonly action: RuleAction;
  readonly priority: number;
  readonly isActive: boolean;
  readonly createdBy: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

const VALID_DIMENSIONS: readonly RuleDimension[] = [
  "compliance", "relevance", "accuracy", "conversion", "mobile", "imagery"
];

const VALID_SEVERITIES: readonly FindingSeverity[] = ["info", "warning", "critical"];

const VALID_ACTIONS: readonly FindingAction[] = ["fixNow", "defer", "skip", "escalate"];

const VALID_CATEGORIES: readonly CategoryVariant[] = [
  "general_home", "beauty", "food_supplements", "electronics", "apparel"
];

const VALID_CONDITION_TYPES: readonly RuleConditionType[] = [
  "category_equals", "category_in", "images_count_gte", "images_count_lte",
  "has_a_plus", "has_video", "price_gte", "price_lte",
  "seasonal_period", "attribute_present", "attribute_equals"
];

/**
 * Create a new ListingAuditRule with validation.
 */
export function createListingAuditRule(
  params: CreateListingAuditRuleParams,
): Result<ListingAuditRule, ListingAuditRuleError> {
  // Validate ruleId
  if (typeof params.ruleId !== "string" || params.ruleId.trim().length === 0) {
    return Result.err({ kind: "invalid_rule_id" });
  }

  // Validate dimension
  if (!VALID_DIMENSIONS.includes(params.dimension)) {
    return Result.err({ kind: "invalid_dimension" });
  }

  // Validate severity
  if (!VALID_SEVERITIES.includes(params.severity)) {
    return Result.err({ kind: "invalid_severity" });
  }

  // Validate categories
  for (const cat of params.applicableCategories) {
    if (!VALID_CATEGORIES.includes(cat)) {
      return Result.err({ kind: "invalid_category" });
    }
  }

  // Validate action
  if (!params.action) {
    return Result.err({ kind: "no_action_specified" });
  }
  
  if (!VALID_ACTIONS.includes(params.action.action)) {
    return Result.err({ kind: "invalid_action" });
  }

  // Validate acceptedActions
  for (const action of params.action.acceptedActions) {
    if (!VALID_ACTIONS.includes(action)) {
      return Result.err({ kind: "invalid_action" });
    }
  }

  // Validate conditions
  for (const condition of params.conditions) {
    if (!VALID_CONDITION_TYPES.includes(condition.type)) {
      return Result.err({ kind: "invalid_condition_type" } as ListingAuditRuleError);
    }
  }

  const now = params.updatedAt ?? params.createdAt ?? new Date();

  return Result.ok({
    id: params.id,
    ruleId: params.ruleId.trim(),
    dimension: params.dimension,
    severity: params.severity,
    applicableCategories: [...params.applicableCategories],
    conditions: [...params.conditions],
    action: {
      ...params.action,
      acceptedActions: [...params.action.acceptedActions],
    },
    priority: params.priority,
    isActive: params.isActive,
    createdBy: params.createdBy,
    createdAt: params.createdAt ?? now,
    updatedAt: now,
  });
}

/**
 * Check if a rule matches the given context.
 */
export function ruleMatches(
  rule: ListingAuditRule,
  context: {
    category: CategoryVariant;
    imagesCount: number;
    hasAPlus: boolean;
    hasVideo: boolean;
    price?: number;
    seasonalPeriod?: string;
    attributes: Readonly<Record<string, string>>;
  },
): boolean {
  // Check if rule is active
  if (!rule.isActive) return false;

  // Check category applicability
  if (rule.applicableCategories.length > 0) {
    if (!rule.applicableCategories.includes(context.category)) {
      return false;
    }
  }

  // Check all conditions
  for (const condition of rule.conditions) {
    if (!evaluateCondition(condition, context)) {
      return false;
    }
  }

  return true;
}

function evaluateCondition(
  condition: RuleCondition,
  context: {
    category: CategoryVariant;
    imagesCount: number;
    hasAPlus: boolean;
    hasVideo: boolean;
    price?: number;
    seasonalPeriod?: string;
    attributes: Readonly<Record<string, string>>;
  },
): boolean {
  switch (condition.type) {
    case "category_equals":
      return context.category === (condition.value as string);
    case "category_in":
      return (condition.value as string[]).includes(context.category);
    case "images_count_gte":
      return context.imagesCount >= (condition.value as number);
    case "images_count_lte":
      return context.imagesCount <= (condition.value as number);
    case "has_a_plus":
      return context.hasAPlus === (condition.value as boolean);
    case "has_video":
      return context.hasVideo === (condition.value as boolean);
    case "price_gte":
      return (context.price ?? 0) >= (condition.value as number);
    case "price_lte":
      return (context.price ?? 0) <= (condition.value as number);
    case "seasonal_period":
      return context.seasonalPeriod === (condition.value as string);
    case "attribute_present":
      return condition.value in context.attributes;
    case "attribute_equals":
      const [key, expectedValue] = (condition.value as string).split(":");
      return context.attributes[key] === expectedValue;
    default:
      return false;
  }
}

/**
 * Resolve the expected action for a finding using the rule set.
 * Returns the first matching rule's action, or a default based on severity.
 */
export function resolveExpectedAction(
  rules: readonly ListingAuditRule[],
  finding: {
    ruleId: string;
    dimension: RuleDimension;
    severity: FindingSeverity;
  },
  context: {
    category: CategoryVariant;
    imagesCount: number;
    hasAPlus: boolean;
    hasVideo: boolean;
    price?: number;
    seasonalPeriod?: string;
    attributes: Readonly<Record<string, string>>;
  },
): {
  expectedAction: FindingAction;
  acceptedActions: readonly FindingAction[];
  rationale: string;
} {
  // Find rules matching this finding's ruleId, dimension, and severity
  const matchingRules = rules.filter(
    (r) =>
      r.ruleId === finding.ruleId &&
      r.dimension === finding.dimension &&
      r.severity === finding.severity &&
      ruleMatches(r, context),
  );

  // Sort by priority and take the first
  matchingRules.sort((a, b) => a.priority - b.priority);
  
  if (matchingRules.length > 0) {
    const rule = matchingRules[0];
    return {
      expectedAction: rule.action.action,
      acceptedActions: rule.action.acceptedActions,
      rationale: rule.action.rationale,
    };
  }

  // Default fallback: map severity to action
  switch (finding.severity) {
    case "critical":
      return {
        expectedAction: "fixNow",
        acceptedActions: ["fixNow"] as const,
        rationale: "Critical findings should always be fixed immediately",
      };
    case "warning":
      return {
        expectedAction: "defer",
        acceptedActions: ["fixNow", "defer"] as const,
        rationale: "Warning findings can be deferred or fixed based on context",
      };
    case "info":
      return {
        expectedAction: "skip",
        acceptedActions: ["skip", "defer"] as const,
        rationale: "Info findings are typically informational and can be skipped",
      };
    default:
      return {
        expectedAction: "fixNow",
        acceptedActions: ["fixNow"] as const,
        rationale: "Default action",
      };
  }
}

/**
 * Rehydrate a rule from persisted plain data.
 */
export function hydrateListingAuditRule(plain: ListingAuditRule): ListingAuditRule {
  return { ...plain };
}
