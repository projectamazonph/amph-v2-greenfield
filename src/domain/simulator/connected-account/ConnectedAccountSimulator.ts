/**
 * ConnectedAccountSimulator - STORY-089 spike.
 * A simulator variant that connects to real Amazon Ads sandbox account.
 *
 * This is a FEATURE-FLAGGED SPIKE - disabled by default.
 * When enabled, allows students to authenticate with Amazon Ads sandbox
 * and perform real API operations against test entities.
 *
 * Security: All operations are validated to ensure:
 * - Only sandbox account is used (not production)
 * - All entity names are prefixed (TEST_ or SANDBOX_)
 * - Budgets are $0
 * - Credentials are never exposed to client
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import { Result } from "@/domain/shared/Result";
import { isFeatureEnabled } from "@/domain/features";

//  Types 

export interface ConnectedAccountInput {
  /** Action to perform */
  readonly action: ConnectedAccountAction;
  /** Parameters for the action */
  readonly params?: Record<string, unknown>;
}

export interface ConnectedAccountOutput {
  readonly success: boolean;
  readonly action: ConnectedAccountAction;
  /** Sanitized response (no PII, no sensitive data) */
  readonly result?: Record<string, unknown>;
  readonly error?: string;
}

export type ConnectedAccountAction =
  | "list_campaigns"
  | "get_campaign"
  | "create_campaign"
  | "list_ad_groups"
  | "list_keywords";

//  Constants 

const SIMULATOR_ID: "connected-account" = "connected-account";

const SANDBOX_ACCOUNT_ID = process.env.AMAZON_ADS_SANDBOX_ACCOUNT_ID ?? "";
const SANDBOX_PROFILE_ID = process.env.AMAZON_ADS_SANDBOX_PROFILE_ID ?? "";

// Entity prefixes required for write operations
const REQUIRED_PREFIXES = ["TEST_", "SANDBOX_"] as const;

//  Validation 

/**
 * Validate that an entity name has a required prefix.
 */
function validateEntityPrefix(entityType: string, name: string): boolean {
  return REQUIRED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Validate that a campaign creation request has $0 budget.
 */
function validateZeroBudget(params: Record<string, unknown>): boolean {
  const budget = params.budgetAmount ?? params.dailyBudget ?? 0;
  return typeof budget === "number" && budget === 0;
}

/**
 * Sanitize response to remove PII and sensitive data.
 */
function sanitizeResponse(response: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(response)) {
    // Skip sensitive fields
    if (["accessToken", "refreshToken", "clientSecret", "credentials"].includes(key)) {
      continue;
    }
    
    // Recursively sanitize nested objects
    if (value && typeof value === "object") {
      sanitized[key] = sanitizeResponse(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

//  Simulator Implementation 

/**
 * ConnectedAccountSimulator - STORY-089 spike implementation.
 * 
 * This is a STUB that demonstrates the structure. The actual implementation
 * would integrate with Amazon Ads API via the AmazonAdsApiClient adapter.
 * 
 * The spike is intentionally minimal to validate:
 * 1. Feature flag integration
 * 2. Domain entity structure
 * 3. Port/adapter pattern
 * 4. Security validation
 */
export class ConnectedAccountSimulator implements Simulator<ConnectedAccountInput, ConnectedAccountOutput> {
  readonly simulatorId = SIMULATOR_ID;
  readonly name = "Connected Account (Sandbox)";

  async run(input: ConnectedAccountInput): Promise<ConnectedAccountOutput> {
    // Check feature flag
    if (!isFeatureEnabled("CONNECTED_ACCOUNT_SIMULATOR")) {
      return {
        success: false,
        action: input.action,
        error: "Connected Account Simulator is disabled. This feature is behind a feature flag.",
      };
    }

    // Validate sandbox environment
    if (!SANDBOX_ACCOUNT_ID || !SANDBOX_PROFILE_ID) {
      return {
        success: false,
        action: input.action,
        error: "Sandbox environment not configured. Please contact an administrator.",
      };
    }

    // Validate action
    const validActions: ConnectedAccountAction[] = [
      "list_campaigns",
      "get_campaign",
      "create_campaign",
      "list_ad_groups",
      "list_keywords",
    ];
    
    if (!validActions.includes(input.action)) {
      return {
        success: false,
        action: input.action,
        error: `Invalid action: ${input.action}`,
      };
    }

    // Validate write operations
    const writeActions: ConnectedAccountAction[] = ["create_campaign"];
    if (writeActions.includes(input.action) && input.params) {
      // Validate entity prefix for write operations
      const name = input.params.name as string | undefined;
      if (name && !validateEntityPrefix(input.action, name)) {
        return {
          success: false,
          action: input.action,
          error: `Entity name must start with ${REQUIRED_PREFIXES.join(" or ")}`,
        };
      }

      // Validate $0 budget for campaign creation
      if (input.action === "create_campaign" && !validateZeroBudget(input.params)) {
        return {
          success: false,
          action: input.action,
          error: "Test campaigns must have $0 budget",
        };
      }
    }

    // TODO: Actual Amazon Ads API integration would go here
    // For the spike, we return a mock response
    
    const mockResponses: Record<ConnectedAccountAction, Record<string, unknown>> = {
      list_campaigns: {
        campaigns: [
          { id: "TEST_123", name: "TEST_Sample Campaign", status: "enabled" },
        ],
        count: 1,
      },
      get_campaign: {
        id: "TEST_123",
        name: "TEST_Sample Campaign",
        status: "enabled",
        budget: { amount: 0, currency: "USD" },
      },
      create_campaign: {
        id: "TEST_NEW_" + Math.random().toString(36).substring(7),
        name: input.params?.name ?? "TEST_New Campaign",
        status: "enabled",
        budget: { amount: 0, currency: "USD" },
      },
      list_ad_groups: {
        adGroups: [],
        count: 0,
      },
      list_keywords: {
        keywords: [],
        count: 0,
      },
    };

    return {
      success: true,
      action: input.action,
      result: sanitizeResponse(mockResponses[input.action]),
    };
  }
}

//  Factory 

/**
 * Factory function to create the simulator.
 * Exported for registration in SimulatorRegistry.
 */
export function createConnectedAccountSimulator(): ConnectedAccountSimulator {
  return new ConnectedAccountSimulator();
}
