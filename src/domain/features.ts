/**
 * Feature Flags - Runtime configuration for optional features.
 * STORY-089: Added CONNECTED_ACCOUNT_SIMULATOR flag.
 *
 * Feature flags allow us to:
 * - Safely deploy experimental features behind flags
 * - Enable/disable features without code changes
 * - Roll out features to specific user groups
 * - Quickly disable problematic features
 */

export interface Feature {
  /** Whether the feature is enabled by default */
  readonly enabled: boolean;
  /** Human-readable description */
  readonly description: string;
  /** Risk level: low, medium, high */
  readonly riskLevel: "low" | "medium" | "high";
  /** Rollout strategy: everyone, admin-only, beta-testers */
  readonly rollout: "everyone" | "admin-only" | "beta-testers";
}

interface Features {
  readonly CONNECTED_ACCOUNT_SIMULATOR: Feature;
}

/**
 * Default feature flags.
 * These can be overridden by environment variables.
 */
export const FEATURES: Features = {
  CONNECTED_ACCOUNT_SIMULATOR: {
    enabled: process.env.NEXT_PUBLIC_FEATURE_CONNECTED_ACCOUNT_SIMULATOR === "true",
    description: "Enable connected account simulator (STORY-089) - allows real Amazon Ads API access",
    riskLevel: "high",
    rollout: "admin-only",
  },
} as const;

/**
 * Check if a feature is enabled for a given user.
 * Respects both the feature's default state and the rollout strategy.
 */
export function isFeatureEnabled(featureKey: keyof Features, isAdmin: boolean = false, isBetaTester: boolean = false): boolean {
  const feature = FEATURES[featureKey];
  
  if (!feature.enabled) {
    return false;
  }

  switch (feature.rollout) {
    case "everyone":
      return true;
    case "admin-only":
      return isAdmin;
    case "beta-testers":
      return isAdmin || isBetaTester;
    default:
      return false;
  }
}

/**
 * Get feature configuration (for admin UI).
 */
export function getFeatureConfig(featureKey: keyof Features) {
  return FEATURES[featureKey];
}

/**
 * List all features (for admin UI).
 */
export function listAllFeatures() {
  return Object.entries(FEATURES).map(([key, feature]) => ({
    key,
    ...feature,
  }));
}
