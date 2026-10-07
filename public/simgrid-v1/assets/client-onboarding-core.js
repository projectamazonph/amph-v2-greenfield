(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./decision-simulator-core.js'));
  } else {
    root.ClientOnboardingCore = factory(root.DecisionSimulatorCore);
  }
})(typeof self !== 'undefined' ? self : this, function (DecisionSimulatorCore) {
  'use strict';

  var PRIMARY_OPTIONS = {
    request_ads_access: 'Request Ads console access',
    define_primary_kpi: 'Define primary KPI and guardrail',
    collect_product_brief: 'Collect product and offer brief',
    set_approval_rules: 'Set approval and reporting rules',
    start_without_context: 'Start immediately with available info'
  };

  var SECONDARY_OPTIONS = {
    blocker: 'Blocker before launch',
    needed: 'Needed for clean setup',
    nice_to_have: 'Nice to have',
    later: 'Can wait'
  };

  var CLIENT_ONBOARDING_SCENARIO = {
    id: 'client-onboarding',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    title: 'Client Onboarding',
    kicker: 'VA workflow simulator',
    description: 'Convert a messy client handoff into access requests, goals, facts, approvals, and open questions.',
    passingScore: 75,
    primaryLabel: 'Onboarding move',
    secondaryLabel: 'Requirement level',
    primaryOptions: PRIMARY_OPTIONS,
    secondaryOptions: SECONDARY_OPTIONS,
    summary: {
      excellent: 'Strong onboarding discipline. You protected access, goals, facts, and client approvals before work begins.',
      passing: 'Good onboarding workflow. Review missed rows and keep blockers separate from nice-to-have context.',
      needsPractice: 'Keep practicing onboarding. A clean VA handoff prevents confused campaigns and avoidable client risk.'
    },
    rows: [
      {
        id: 'missing-ads-access',
        title: 'No advertising access',
        signal: 'Client shared Seller Central screenshots but did not invite the VA to Campaign Manager.',
        metrics: { access: 'Missing', role: 'Ads only', risk: 'Cannot verify' },
        expectedPrimary: 'request_ads_access',
        expectedSecondary: 'blocker',
        evidence: 'The VA cannot audit or build ads without the correct advertising access.',
        feedback: 'Treat missing Ads access as a blocker. Ask for the minimum required role rather than broad credentials.'
      },
      {
        id: 'unclear-goal',
        title: 'Goal is "more sales"',
        signal: 'Client wants more sales but has not defined target ACOS, budget ceiling, or launch versus profit priority.',
        metrics: { goal: 'Vague', budget: 'Unclear', guardrail: 'Missing' },
        expectedPrimary: 'define_primary_kpi',
        expectedSecondary: 'blocker',
        evidence: 'Optimization choices depend on the primary KPI and guardrails.',
        feedback: 'Clarify the KPI before making decisions. More sales, profit, and ranking can require different budget and ACOS behavior.'
      },
      {
        id: 'missing-product-facts',
        title: 'Product context gap',
        signal: 'The listing is live, but the VA does not know margins, hero claims, seasonality, or bad-fit audiences.',
        metrics: { margin: 'Unknown', claims: 'Unknown', exclusions: 'Unknown' },
        expectedPrimary: 'collect_product_brief',
        expectedSecondary: 'needed',
        evidence: 'Product facts shape targeting, bid risk, negatives, and reporting context.',
        feedback: 'Collect a product and offer brief before final build decisions. It is needed for clean setup, even if access exists.'
      },
      {
        id: 'approval-rules',
        title: 'No change approval policy',
        signal: 'Client says "optimize whenever needed" but has not defined which changes require approval.',
        metrics: { cadence: 'Weekly', approvals: 'Undefined', risk: 'Scope creep' },
        expectedPrimary: 'set_approval_rules',
        expectedSecondary: 'needed',
        evidence: 'Approval rules prevent surprise budget, bid, and campaign changes.',
        feedback: 'Set approval and reporting rules up front. The VA should know what can be changed directly and what needs client sign-off.'
      },
      {
        id: 'measurement-gap', title: 'No reporting baseline',
        signal: 'The client wants weekly updates, but no agreed reporting window, attribution source, or baseline period exists.',
        metrics: { reporting: 'Requested', baseline: 'Missing', attribution: 'Undefined' },
        expectedPrimary: 'define_primary_kpi', expectedSecondary: 'needed',
        evidence: 'Without a baseline and attribution definition, performance changes cannot be explained consistently.',
        feedback: 'Set the reporting baseline and attribution rules before the first report. This is needed for trustworthy decisions, even when access is ready.'
      },
      {
        id: 'restricted-claim', title: 'Sensitive product claim',
        signal: 'The client asks the VA to advertise a health benefit, but has not supplied approved claim language or compliance guidance.',
        metrics: { category: 'Sensitive', claims: 'Unapproved', risk: 'High' },
        expectedPrimary: 'set_approval_rules', expectedSecondary: 'blocker',
        evidence: 'Unapproved claims create policy and account risk. Advertising copy must be reviewed before launch.',
        feedback: 'Treat unapproved sensitive claims as a blocker. Pause the launch path until compliant language and approval ownership are clear.'
      }
    ]
  };

  var CLIENT_ONBOARDING_BEGINNER_SCENARIO = {
    id: 'client-onboarding-beginner',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    title: 'Client Onboarding - Beginner',
    difficulty: 'beginner',
    kicker: 'Beginner VA workflow simulator',
    description: 'Practice identifying essential onboarding elements for a smooth client handoff.',
    passingScore: 75,
    primaryLabel: 'Onboarding move',
    secondaryLabel: 'Requirement level',
    primaryOptions: PRIMARY_OPTIONS,
    secondaryOptions: SECONDARY_OPTIONS,
    summary: {
      excellent: 'Strong onboarding fundamentals. You identified all critical launch blockers and essential context.',
      passing: 'Good onboarding judgment. Review missed items and ensure blockers are clearly separated from nice-to-haves.',
      needsPractice: 'Keep practicing onboarding. Missing essential access or goals will cause problems later.'
    },
    rows: [
      {
        id: 'no-ads-access',
        title: 'Cannot access Sponsored Ads',
        signal: 'Client provided login credentials but the VA cannot see any Sponsored Products campaigns in Seller Central.',
        metrics: { access: 'None', campaigns: '0 visible', role: 'Restricted' },
        expectedPrimary: 'request_ads_access',
        expectedSecondary: 'blocker',
        evidence: 'Without Sponsored Ads access, the VA cannot create, edit, or monitor any campaigns.',
        feedback: 'This is a hard blocker. Request the specific Ads access needed before any campaign work can begin.'
      },
      {
        id: 'no-budget-info',
        title: 'No budget allocation provided',
        signal: 'Client wants to launch campaigns but has not specified daily or monthly budget limits.',
        metrics: { budget: 'Undefined', priority: 'Unknown', risk: 'Overspend' },
        expectedPrimary: 'define_primary_kpi',
        expectedSecondary: 'blocker',
        evidence: 'Budget limits are essential to prevent overspending and to set proper bid levels.',
        feedback: 'Define budget constraints before launching. Without limits, campaigns can spend uncontrolled amounts.'
      },
      {
        id: 'missing-product-details',
        title: 'Basic product information missing',
        signal: 'VA has access but knows nothing about the product: price, margin, category, or target audience.',
        metrics: { price: 'Unknown', margin: 'Unknown', category: 'Unknown' },
        expectedPrimary: 'collect_product_brief',
        expectedSecondary: 'needed',
        evidence: 'Product details are needed to create relevant targeting and set appropriate bids.',
        feedback: 'Collect basic product information. You cannot optimize what you do not understand.'
      },
      {
        id: 'no-reporting-preferences',
        title: 'Client wants reports but no format specified',
        signal: 'Client says they want weekly reports but has not defined format, metrics, or delivery method.',
        metrics: { format: 'Unspecified', frequency: 'Weekly', cadence: 'Unclear' },
        expectedPrimary: 'define_primary_kpi',
        expectedSecondary: 'needed',
        evidence: 'Reporting preferences must be defined to ensure the VA delivers useful information.',
        feedback: 'Clarify reporting requirements upfront. This prevents rework and ensures the client gets actionable insights.'
      },
      {
        id: 'unclear-approval-process',
        title: 'Who approves changes?',
        signal: 'Client has not specified who needs to approve bid changes, budget increases, or campaign launches.',
        metrics: { approver: 'Unidentified', changes: 'All types', risk: 'Unauthorized changes' },
        expectedPrimary: 'set_approval_rules',
        expectedSecondary: 'needed',
        evidence: 'Clear approval processes prevent unauthorized changes and scope creep.',
        feedback: 'Define approval workflows before making changes. Know who can authorize what type of modification.'
      },
      {
        id: 'missing-competitor-info',
        title: 'No competitor context',
        signal: 'Client has not shared information about main competitors or how they want to position against them.',
        metrics: { competitors: 'Unknown', positioning: 'Unclear', differentiation: 'Missing' },
        expectedPrimary: 'collect_product_brief',
        expectedSecondary: 'nice_to_have',
        evidence: 'Competitor context helps with positioning but is not essential for initial launch.',
        feedback: 'While helpful, competitor information is not a blocker. Focus on getting the basics first, then refine positioning.'
      }
    ]
  };

  var simulator = DecisionSimulatorCore.createDecisionSimulator(CLIENT_ONBOARDING_SCENARIO);
  var beginnerSimulator = DecisionSimulatorCore.createDecisionSimulator(CLIENT_ONBOARDING_BEGINNER_SCENARIO);

  return {
    CLIENT_ONBOARDING_SCENARIO: CLIENT_ONBOARDING_SCENARIO,
    CLIENT_ONBOARDING_BEGINNER_SCENARIO: CLIENT_ONBOARDING_BEGINNER_SCENARIO,
    PRIMARY_OPTIONS: PRIMARY_OPTIONS,
    SECONDARY_OPTIONS: SECONDARY_OPTIONS,
    gradeAttempt: simulator.gradeAttempt
  };
});
