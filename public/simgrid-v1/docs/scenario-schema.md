# Scenario Schema Documentation

This document describes the validated scenario schema used across all SimGrid simulators. Every simulator scenario must conform to this structure to ensure consistency, testability, and future compatibility.

## Overview

Scenarios are the core content units in SimGrid. Each scenario contains:

- Metadata for identification and versioning
- The dataset that drives the simulation
- Expected answers and answer keys
- Feedback and educational content
- Difficulty and prerequisite information

## Schema Reference

### Base Scenario Object

Every scenario MUST include these top-level fields:

```javascript
{
  // Required identification fields
  id: string,              // Unique identifier, e.g., 'sqp-studio', 'bid-decisions'
  version: string,         // Semantic version, e.g., '1.0.0'
  rubricVersion: string,   // Version of the grading rubric, e.g., '1.0.0'
  title: string,           // Human-readable title, e.g., 'SQP Studio'

  // Optional but recommended
  difficulty: string,      // 'beginner' | 'intermediate' | 'advanced'
  policyVersion: string,   // Version of PPC policy applied, if applicable
  passingScore: number,    // Minimum score to pass, default 75

  // Scenario-specific data (varies by simulator type)
  queries: array,          // For SQP Studio
  rows: array,             // For Bid Decisions, Campaign Architect, Account Audit
  // ... other simulator-specific fields
}
```

### Field Requirements

| Field           | Type   | Required | Description                                                                                  |
| --------------- | ------ | -------- | -------------------------------------------------------------------------------------------- |
| `id`            | string | Yes      | Unique scenario identifier. Must be URL-safe.                                                |
| `version`       | string | Yes      | Semantic version following `MAJOR.MINOR.PATCH`. Increment when dataset or structure changes. |
| `rubricVersion` | string | Yes      | Version of the grading logic. Increment when expected answers or scoring changes.            |
| `title`         | string | Yes      | Display name for the scenario.                                                               |
| `difficulty`    | string | No       | One of: `beginner`, `intermediate`, `advanced`. Defaults to `intermediate`.                  |
| `policyVersion` | string | No       | Version of `PpcDecisionPolicy` or other policy modules.                                      |
| `passingScore`  | number | No       | Score threshold for passing. Default 75.                                                     |

## Simulator-Specific Schemas

### SQP Studio Scenarios

SQP Studio scenarios contain an array of query objects to diagnose.

```javascript
{
  id: 'sqp-studio',
  version: '1.0.0',
  rubricVersion: '1.0.0',
  title: 'SQP Studio',
  difficulty: 'intermediate',
  passingScore: 75,
  diagnoses: object,    // Available diagnosis options
  followUps: object,   // Available follow-up action options
  queries: [
    {
      id: string,                    // Unique query identifier
      query: string,                 // The search query text
      queryVolume: number,           // Total market query volume
      marketPurchases: number,       // Total market purchases for this query
      brandImpressions: number,      // Your brand's impressions
      brandClicks: number,           // Your brand's clicks
      brandCartAdds: number,         // Your brand's cart adds
      brandPurchases: number,        // Your brand's purchases
      expectedDiagnosis: string,     // One of: 'scale_visibility', 'fix_listing_conversion', 'watch_data_limit', 'reduce_waste'
      expectedFollowUp: string,      // One of: 'increase_coverage', 'audit_pdp', 'collect_more_data', 'tighten_targeting'
      evidence: string,               // Explanation of why this is the correct diagnosis
      feedback: string                // Educational feedback for the learner
    }
  ]
}
```

**Diagnosis Options (DIAGNOSES):**

- `scale_visibility` - Conversion is strong, but impression share is low
- `fix_listing_conversion` - Traffic exists, but conversion is weak
- `watch_data_limit` - Not enough data to make a confident decision
- `reduce_waste` - Visibility exists but purchase share is poor

**Follow-up Options (FOLLOW_UPS):**

- `increase_coverage` - Expand campaign coverage
- `audit_pdp` - Audit product detail page and offer
- `collect_more_data` - Wait for more impressions/clicks
- `tighten_targeting` - Reduce weak exposure

### Bid Decisions Scenarios

Bid Decisions scenarios contain an array of keyword/target rows to evaluate.

```javascript
{
  id: 'bid-decisions',
  version: '1.0.0',
  rubricVersion: '1.0.0',
  title: 'Bid Decisions',
  difficulty: 'intermediate',
  passingScore: 75,
  targetAcos: number,        // Target ACOS percentage for the account
  policyVersion: string,    // Version of PpcDecisionPolicy
  actions: object,          // Available bid actions
  confidenceLevels: object, // Available confidence levels
  rows: [
    {
      id: string,                    // Unique row identifier
      target: string,                // The keyword or target
      matchType: string,             // 'Exact', 'Phrase', 'Broad'
      bid: number,                   // Current bid amount
      clicks: number,                // Clicks received
      spend: number,                 // Total spend
      sales: number,                 // Total sales revenue
      orders: number,                // Number of orders
      expectedAction: string,        // One of: 'raise_bid', 'hold_bid', 'lower_bid', 'investigate_pause', 'ask_review'
      expectedConfidence: string,    // One of: 'high', 'medium', 'low'
      evidence: string,              // Explanation of why this is the correct action
      feedback: string               // Educational feedback for the learner
    }
  ]
}
```

**Action Options:**

- `raise_bid` - Increase bid when volume and efficiency support it
- `hold_bid` - Keep bid steady when signal is thin or balanced
- `lower_bid` - Reduce pressure when target converts but misses efficiency goal
- `investigate_pause` - Stop or investigate spend with enough clicks but no orders
- `ask_review` - Escalate when data conflicts with goals

**Confidence Levels:**

- `high` - Clear evidence supports the action
- `medium` - Some evidence, but with caveats
- `low` - Insufficient evidence

### Campaign Architect Scenarios

Campaign Architect scenarios evaluate campaign launch decisions.

```javascript
{
  id: 'campaign-architect',
  version: '1.0.0',
  rubricVersion: '1.0.0',
  title: 'Campaign Architect',
  difficulty: 'intermediate',
  passingScore: 75,
  rows: [
    {
      id: string,
      question: string,
      options: array,              // Available answer options
      expectedPrimary: string,     // Correct primary choice
      expectedSecondary: string,   // Correct secondary choice (e.g., priority level)
      evidence: string,
      feedback: string
    }
  ]
}
```

### Account Audit Scenarios

Account Audit scenarios evaluate account-level prioritization.

```javascript
{
  id: 'account-audit',
  version: '1.0.0',
  rubricVersion: '1.0.0',
  title: 'Account Audit',
  difficulty: 'intermediate',
  passingScore: 75,
  rows: [
    {
      id: string,
      finding: string,             // Description of the finding
      options: array,              // Available action options
      expectedPrimary: string,     // Correct action
      expectedSecondary: string,   // Correct priority level
      evidence: string,
      feedback: string
    }
  ]
}
```

### Client Onboarding Scenarios

Client Onboarding scenarios evaluate VA handoff readiness.

```javascript
{
  id: 'client-onboarding',
  version: '1.0.0',
  rubricVersion: '1.0.0',
  title: 'Client Onboarding',
  difficulty: 'intermediate',
  passingScore: 75,
  rows: [
    {
      id: string,
      requirement: string,          // Description of the requirement
      options: array,              // Available response options
      expectedPrimary: string,     // Correct response
      expectedSecondary: string,   // Correct classification (e.g., 'blocker', 'warning')
      evidence: string,
      feedback: string
    }
  ]
}
```

### Capstone Sequence Scenarios

Capstone scenarios evaluate end-to-end workflow decisions.

```javascript
{
  id: 'capstone-sequence',
  version: '1.0.0',
  rubricVersion: '1.0.0',
  title: 'Capstone Sequence',
  difficulty: 'advanced',
  passingScore: 85,
  rows: [
    {
      id: string,
      stage: string,               // Stage of the workflow
      task: string,                // Task description
      options: array,
      expectedPrimary: string,
      expectedSecondary: string,   // Stage identifier
      evidence: string,
      feedback: string
    }
  ]
}
```

## Validation Rules

The `assets/scenario-bank.js` module enforces these validation rules:

1. **Required Fields**: Every scenario MUST have `id`, `version`, `rubricVersion`, `title`
2. **Unique IDs**: No two scenarios in the same bank can share an `id`
3. **Version Format**: Must follow semantic versioning pattern (X.Y.Z)

### Validation Function

```javascript
function requireField(scenario, field) {
  if (!scenario[field])
    throw new TypeError(field + " is required for scenario " + (scenario.id || "(unknown)"));
}

function validateScenario(scenario) {
  ["id", "version", "rubricVersion", "title"].forEach(function (field) {
    requireField(scenario, field);
  });

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(scenario.version)) {
    throw new TypeError("Invalid version format for scenario " + scenario.id);
  }

  if (!/^\d+\.\d+\.\d+$/.test(scenario.rubricVersion)) {
    throw new TypeError("Invalid rubricVersion format for scenario " + scenario.id);
  }
}
```

## Content Guidelines

### Writing Good Scenarios

1. **Realistic Data**: Use realistic numbers based on actual Amazon PPC accounts
2. **Clear Distinctions**: Ensure each scenario has a clear, distinguishable correct answer
3. **Educational Feedback**: Feedback should explain WHY an answer is correct/incorrect
4. **Progressive Difficulty**: Beginner scenarios should have clearer signals than advanced ones
5. **Consistent Policy**: Apply the same PPC decision policy across all scenarios

### Difficulty Levels

| Level        | Characteristics                                                     |
| ------------ | ------------------------------------------------------------------- |
| Beginner     | Clear signals, obvious correct answers, high-confidence decisions   |
| Intermediate | Mixed signals, requires interpretation, medium-confidence decisions |
| Advanced     | Ambiguous signals, edge cases, low-confidence decisions             |

### Versioning Strategy

| Change Type                   | version | rubricVersion | policyVersion |
| ----------------------------- | ------- | ------------- | ------------- |
| New scenario                  | +1.0.0  | +1.0.0        | current       |
| Dataset update (non-breaking) | +0.1.0  | current       | current       |
| Dataset update (breaking)     | +1.0.0  | +1.0.0        | current       |
| Scoring logic change          | current | +0.1.0        | current       |
| Major scoring change          | current | +1.0.0        | current       |
| Policy update                 | current | current       | +1.0.0        |

## Testing Scenarios

Each scenario type has corresponding test files:

- `tests/sqp-studio-core.test.cjs` - Tests SQP Studio scenarios
- `tests/bid-decisions-core.test.cjs` - Tests Bid Decisions scenarios
- `tests/remaining-simulators-core.test.cjs` - Tests Campaign Architect, Account Audit, Client Onboarding, Capstone

### Test Patterns

```javascript
// Test perfect score
const perfectAttempt = scenario.rows.reduce((attempt, row) => {
  attempt[row.id] = {
    primary: row.expectedPrimary,
    secondary: row.expectedSecondary,
  };
  return attempt;
}, {});

const result = gradeAttempt(perfectAttempt);
assert.equal(result.score, result.maxScore);
assert.equal(result.passed, true);

// Test specific edge cases
const result = gradeAttempt({
  "specific-row-id": { primary: "wrong_answer", secondary: "wrong" },
});
assert.equal(result.items[0].earned, 0);
assert.match(result.items[0].feedback, /expected explanation/i);
```

## Scenario Bank Integration

Scenarios are registered in the scenario bank for selection in the UI:

```javascript
const ScenarioBank = require("./assets/scenario-bank.js");

const bank = ScenarioBank.createScenarioBank([
  SQP_STUDIO_SCENARIO,
  SQP_STUDIO_BEGINNER_SCENARIO,
  BID_DECISIONS_SCENARIO,
  BID_DECISIONS_BEGINNER_SCENARIO,
]);

// List all scenarios
bank.list();

// List by difficulty
bank.list("beginner");

// Get specific scenario by ID
bank.get("sqp-studio-beginner");
```

## Example: Adding a New Scenario

To add a new beginner scenario to SQP Studio:

1. **Add to `assets/sqp-studio-core.js`:**

```javascript
var SQP_STUDIO_NEW_BEGINNER_SCENARIO = {
  id: "sqp-studio-new-beginner",
  version: "1.0.0",
  rubricVersion: "1.0.0",
  title: "SQP Studio - New Beginner",
  difficulty: "beginner",
  passingScore: 75,
  diagnoses: DIAGNOSES,
  followUps: FOLLOW_UPS,
  queries: [
    {
      id: "new-query-1",
      query: "example query",
      queryVolume: 10000,
      marketPurchases: 1000,
      brandImpressions: 5000,
      brandClicks: 500,
      brandCartAdds: 100,
      brandPurchases: 50,
      expectedDiagnosis: "scale_visibility",
      expectedFollowUp: "increase_coverage",
      evidence: "Strong conversion with room to grow...",
      feedback: "This query converts well, expand coverage...",
    },
    // ... more queries
  ],
};
```

2. **Export the new scenario:**

```javascript
return {
  SQP_STUDIO_SCENARIO: SQP_STUDIO_SCENARIO,
  SQP_STUDIO_BEGINNER_SCENARIO: SQP_STUDIO_BEGINNER_SCENARIO,
  SQP_STUDIO_NEW_BEGINNER_SCENARIO: SQP_STUDIO_NEW_BEGINNER_SCENARIO,
  // ...
};
```

3. **Add tests in `tests/sqp-studio-core.test.cjs`:**

```javascript
test("New beginner scenario passes with perfect answers", () => {
  const {
    SQP_STUDIO_NEW_BEGINNER_SCENARIO,
    gradeAttempt,
  } = require("../assets/sqp-studio-core.js");
  const perfectAttempt = SQP_STUDIO_NEW_BEGINNER_SCENARIO.queries.reduce((a, q) => {
    a[q.id] = { diagnosis: q.expectedDiagnosis, followUp: q.expectedFollowUp };
    return a;
  }, {});
  const result = gradeAttempt(SQP_STUDIO_NEW_BEGINNER_SCENARIO, perfectAttempt);
  assert.equal(result.passed, true);
});
```

4. **Run all tests:**

```bash
node --test tests/*.test.cjs
```

## Version Compatibility

When updating scenarios:

1. **Never modify** a published scenario's `id`, `expected*` fields, or scoring logic without incrementing `rubricVersion`
2. **Never break** existing stored attempts - scenario identity must remain stable
3. **Prefer adding** new scenarios over modifying existing ones
4. **Document** breaking changes in CHANGELOG or release notes

## References

- [Curriculum Simulator Synchronization Plan](./curriculum-simulator-synchronization-plan.md)
- [GitHub Issue Tracker Guide](./github-issue-tracker.md)
- [PPC Decision Policy](../assets/ppc-decision-policy.js)
