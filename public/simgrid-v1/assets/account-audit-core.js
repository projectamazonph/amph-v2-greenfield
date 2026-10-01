(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./decision-simulator-core.js'),
      require('./ppc-decision-policy.js'),
      require('./scenario-bank.js')
    );
  } else {
    root.AccountAuditCore = factory(root.DecisionSimulatorCore, root.PpcDecisionPolicy, root.ScenarioBank);
  }
})(typeof self !== 'undefined' ? self : this, function (DecisionSimulatorCore, PpcDecisionPolicy, ScenarioBank) {
  'use strict';

  var PRIMARY_OPTIONS = {
    cut_waste: 'Cut or negate wasted spend',
    scale_budget: 'Scale constrained profitable campaigns',
    audit_listing: 'Audit listing or offer fit',
    monitor: 'Monitor until data matures',
    ask_client: 'Ask client for missing context'
  };

  var SECONDARY_OPTIONS = {
    critical: 'Critical priority',
    high: 'High priority',
    medium: 'Medium priority',
    low: 'Low priority'
  };

  var ACCOUNT_AUDIT_SCENARIO = {
    id: 'account-audit-core-triage',
    simulatorId: 'account-audit',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    policyVersion: PpcDecisionPolicy.VERSION,
    difficulty: 'beginner',
    title: 'Account Audit',
    kicker: 'Audit simulator',
    description: 'Rank account findings by impact and confidence, then choose the safest next action.',
    passingScore: 75,
    primaryLabel: 'Next action',
    secondaryLabel: 'Priority',
    primaryOptions: PRIMARY_OPTIONS,
    secondaryOptions: SECONDARY_OPTIONS,
    summary: {
      excellent: 'Strong audit judgment. You separated urgent spend leaks from scale opportunities and diagnosis work.',
      passing: 'Good audit read. Review the missed findings and sharpen impact versus confidence.',
      needsPractice: 'Keep practicing audit triage. Prioritize what costs money now, what can scale, and what needs more proof.'
    },
    rows: [
      {
        id: 'zero-sales-waste',
        title: 'High spend, no orders',
        signal: 'Exact target spent $92 from 83 clicks with no sales. Query intent is weak for the product.',
        metrics: { spend: '$92', clicks: '83', sales: '$0' },
        expectedPrimary: 'cut_waste',
        expectedSecondary: 'critical',
        evidence: 'Enough clicks and spend with no orders makes this an urgent waste-control finding.',
        feedback: 'Treat proven waste as critical. Negate, pause, or cut after confirming relevance and tracking are valid.'
      },
      {
        id: 'profitable-capped',
        title: 'Profitable but budget-capped',
        signal: 'Manual exact campaign has 22% ACOS, 18 orders, and runs out of budget by 2 PM.',
        metrics: { acos: '22%', orders: '18', pacing: 'Capped early' },
        expectedPrimary: 'scale_budget',
        expectedSecondary: 'high',
        evidence: 'The campaign is profitable with enough orders and loses sales to budget limits.',
        feedback: 'Profitable capped campaigns are high-priority scale candidates. Increase budget carefully and keep ACOS guardrails visible.'
      },
      {
        id: 'clicks-low-cvr',
        title: 'Traffic reaches listing but does not convert',
        signal: 'Broad campaign has relevant queries, 170 clicks, 1 order, and weaker conversion than category norms.',
        metrics: { clicks: '170', orders: '1', cvr: '0.6%' },
        expectedPrimary: 'audit_listing',
        expectedSecondary: 'medium',
        evidence: 'Relevant traffic with weak conversion suggests listing, price, offer, or review friction.',
        feedback: 'Do not solve every low-CVR problem with bids. Audit the listing and offer before assuming traffic is bad.'
      },
      {
        id: 'thin-new-campaign',
        title: 'Fresh campaign with thin data',
        signal: 'New phrase campaign launched yesterday. It has 11 clicks, $9.20 spend, and no orders yet.',
        metrics: { age: '1 day', clicks: '11', spend: '$9.20' },
        expectedPrimary: 'monitor',
        expectedSecondary: 'low',
        evidence: 'One day and 11 clicks is too thin to prove performance.',
        feedback: 'Mark thin data as low priority unless spend risk is already high. Monitor until the signal matures.'
      }
    ]
  };

  var wastePolicyAction = PpcDecisionPolicy.recommendBidAction({
    clicks: 83,
    orders: 0,
    acos: 0,
    targetAcos: 35
  });
  var budgetPolicyAction = PpcDecisionPolicy.recommendBudgetAction({
    orders: 18,
    acos: 22,
    targetAcos: 35,
    budgetCapped: true
  });
  ACCOUNT_AUDIT_SCENARIO.rows[0].expectedPrimary = wastePolicyAction === 'investigate_or_pause' ? 'cut_waste' : 'monitor';
  ACCOUNT_AUDIT_SCENARIO.rows[1].expectedPrimary = budgetPolicyAction === 'raise_10_to_20_percent' ? 'scale_budget' : 'monitor';

  var ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO = {
    id: 'account-audit-portfolio-triage',
    simulatorId: 'account-audit',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    policyVersion: PpcDecisionPolicy.VERSION,
    difficulty: 'intermediate',
    title: 'Account Audit: Portfolio Triage',
    kicker: 'Intermediate audit simulator',
    description: 'Prioritize tracking risk, constrained profit, thin evidence, and retail-readiness problems across a mixed portfolio.',
    passingScore: 75,
    primaryLabel: 'Next action',
    secondaryLabel: 'Priority',
    primaryOptions: PRIMARY_OPTIONS,
    secondaryOptions: SECONDARY_OPTIONS,
    summary: ACCOUNT_AUDIT_SCENARIO.summary,
    rows: [
      {
        id: 'tracking-discrepancy',
        title: 'Sales attribution does not reconcile',
        signal: 'Ads reports show $4,800 attributed sales while the client export shows $2,900 for the same dates and marketplace.',
        metrics: { adsSales: '$4,800', clientExport: '$2,900', variance: '40%' },
        expectedPrimary: 'ask_client',
        expectedSecondary: 'critical',
        evidence: 'Material reporting disagreement invalidates optimization conclusions until dates, attribution, marketplace, and source data are reconciled.',
        feedback: 'Treat tracking integrity as critical. Confirm reporting windows and source definitions before presenting or acting on the numbers.'
      },
      {
        id: 'portfolio-budget-cap',
        title: 'Profitable hero campaign loses afternoon traffic',
        signal: 'The hero exact campaign has 24% ACOS from 26 orders and reaches its daily budget before 1 PM on most days.',
        metrics: { acos: '24%', orders: '26', pacing: 'Capped before 1 PM' },
        expectedPrimary: 'scale_budget',
        expectedSecondary: 'high',
        evidence: 'Profitable, order-proven demand constrained by budget is a controlled scale opportunity.',
        feedback: 'Increase the budget within guardrails and monitor marginal ACOS. The evidence supports scale, but not an unlimited jump.'
      },
      {
        id: 'thin-branded-signal',
        title: 'New branded exact target',
        signal: 'A branded exact target has 8 clicks, one order, and 19% ACOS after two days.',
        metrics: { age: '2 days', clicks: '8', orders: '1' },
        expectedPrimary: 'monitor',
        expectedSecondary: 'low',
        evidence: 'One sale on eight clicks is encouraging but too thin to justify a scale decision.',
        feedback: 'Keep monitoring. Do not turn one early conversion into a confident budget or bid conclusion.'
      },
      {
        id: 'retail-readiness-gap',
        title: 'Relevant traffic, collapsing conversion',
        signal: 'Category-relevant traffic is stable, but CVR fell after the price increased and the main image changed.',
        metrics: { clicks: '240', cvr: '2.1% from 7.4%', change: 'Price + image' },
        expectedPrimary: 'audit_listing',
        expectedSecondary: 'medium',
        evidence: 'The timing and relevance point to offer or listing friction rather than an immediate traffic-quality failure.',
        feedback: 'Audit retail readiness and recent listing changes before cutting relevant traffic. Diagnose the conversion break at its likely source.'
      }
    ]
  };

  var intermediateBudgetAction = PpcDecisionPolicy.recommendBudgetAction({
    orders: 26,
    acos: 24,
    targetAcos: 35,
    budgetCapped: true
  });
  ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO.rows[1].expectedPrimary = intermediateBudgetAction === 'raise_10_to_20_percent' ? 'scale_budget' : 'monitor';

  var ACCOUNT_AUDIT_SCENARIO_BANK = ScenarioBank.createScenarioBank([
    ACCOUNT_AUDIT_SCENARIO,
    ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO
  ]);

  function gradeScenarioAttempt(scenarioId, attempt) {
    var scenario = ACCOUNT_AUDIT_SCENARIO_BANK.get(scenarioId);
    if (!scenario) throw new TypeError('Unknown Account Audit scenario: ' + scenarioId);
    return DecisionSimulatorCore.gradeAttempt(scenario, attempt);
  }

  function gradeAttempt(attempt) {
    return DecisionSimulatorCore.gradeAttempt(ACCOUNT_AUDIT_SCENARIO, attempt);
  }

  return {
    ACCOUNT_AUDIT_SCENARIO: ACCOUNT_AUDIT_SCENARIO,
    ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO: ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO,
    ACCOUNT_AUDIT_SCENARIO_BANK: ACCOUNT_AUDIT_SCENARIO_BANK,
    PRIMARY_OPTIONS: PRIMARY_OPTIONS,
    SECONDARY_OPTIONS: SECONDARY_OPTIONS,
    gradeAttempt: gradeAttempt,
    gradeScenarioAttempt: gradeScenarioAttempt
  };
});
