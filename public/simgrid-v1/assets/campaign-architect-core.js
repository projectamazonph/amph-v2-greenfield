(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./decision-simulator-core.js'),
      require('./scenario-bank.js')
    );
  } else {
    root.CampaignArchitectCore = factory(root.DecisionSimulatorCore, root.ScenarioBank);
  }
})(typeof self !== 'undefined' ? self : this, function (DecisionSimulatorCore, ScenarioBank) {
  'use strict';

  var PRIMARY_OPTIONS = {
    separate_auto_manual: 'Separate auto discovery and manual control',
    exact_phrase_core: 'Build exact and phrase core targets',
    seed_negatives: 'Seed obvious negatives before launch',
    review_after_7_days: 'Review after 7 days or enough clicks',
    ask_for_brief: 'Ask for a better product brief'
  };

  var SECONDARY_OPTIONS = {
    low: 'Low risk',
    medium: 'Medium risk',
    high: 'High risk'
  };

  var CAMPAIGN_ARCHITECT_SCENARIO = {
    id: 'campaign-architect-launch-basics',
    simulatorId: 'campaign-architect',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    difficulty: 'beginner',
    title: 'Campaign Architect',
    kicker: 'Planning simulator',
    description: 'Turn a product brief into launch structure, targeting, negatives, and first review rules.',
    passingScore: 75,
    primaryLabel: 'Architecture decision',
    secondaryLabel: 'Risk level',
    primaryOptions: PRIMARY_OPTIONS,
    secondaryOptions: SECONDARY_OPTIONS,
    summary: {
      excellent: 'Strong campaign architecture. Your structure separates discovery from control and protects launch spend.',
      passing: 'Good campaign plan. Review missed rows to tighten risk and review timing.',
      needsPractice: 'Keep practicing campaign architecture. Anchor each build choice to goal, control, and evidence quality.'
    },
    rows: [
      {
        id: 'launch-structure',
        title: 'Lunch container launch',
        signal: 'New ASIN, no ad history, target ACOS 35%, client wants discovery without losing budget control.',
        metrics: { budget: '$45/day', goal: 'Discovery + first sales', catalog: '1 hero ASIN' },
        expectedPrimary: 'separate_auto_manual',
        expectedSecondary: 'medium',
        evidence: 'Auto can discover search terms while manual campaigns keep the first proven targets controllable.',
        feedback: 'Split auto discovery from manual control. A single mixed campaign makes budget, query, and bid decisions harder to read.'
      },
      {
        id: 'core-targeting',
        title: 'Known buyer phrases',
        signal: 'Brief includes four high-intent phrases from listing copy and competitor research.',
        metrics: { terms: '4 core phrases', intent: 'High', match: 'Exact/Phrase' },
        expectedPrimary: 'exact_phrase_core',
        expectedSecondary: 'low',
        evidence: 'Known high-intent phrases deserve manual exact and phrase coverage at launch.',
        feedback: 'Put the known buyer language into exact and phrase campaigns so the VA can read and optimize it directly.'
      },
      {
        id: 'prelaunch-negatives',
        title: 'Bad-fit query guardrails',
        signal: 'Product is stainless steel, but research repeatedly shows plastic, disposable, and party favor queries.',
        metrics: { badFit: '3 themes', relevance: 'Low', spendRisk: 'Early waste' },
        expectedPrimary: 'seed_negatives',
        expectedSecondary: 'low',
        evidence: 'Known bad-fit themes can be excluded before they burn discovery budget.',
        feedback: 'Seed obvious negatives before launch. Guardrails are not over-optimization when the mismatch is already known.'
      },
      {
        id: 'first-review-rule',
        title: 'First optimization window',
        signal: 'Client asks for changes after day one, but expected traffic is only 15-25 clicks per day.',
        metrics: { clicks: '15-25/day', review: 'Day 7', confidence: 'Enough trend' },
        expectedPrimary: 'review_after_7_days',
        expectedSecondary: 'medium',
        evidence: 'A seven-day or sufficient-click review prevents day-one noise from driving campaign structure changes.',
        feedback: 'Set the first review window in advance. Daily checks are fine, but structural decisions need enough traffic to mean something.'
      }
    ]
  };

  var CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO = {
    id: 'campaign-architect-brief-recovery',
    simulatorId: 'campaign-architect',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    difficulty: 'intermediate',
    title: 'Campaign Architect: Brief Recovery',
    kicker: 'Intermediate planning simulator',
    description: 'Recover an incomplete client brief, protect discovery spend, and set evidence-based launch controls.',
    passingScore: 75,
    primaryLabel: 'Architecture decision',
    secondaryLabel: 'Risk level',
    primaryOptions: PRIMARY_OPTIONS,
    secondaryOptions: SECONDARY_OPTIONS,
    summary: CAMPAIGN_ARCHITECT_SCENARIO.summary,
    rows: [
      {
        id: 'missing-product-facts',
        title: 'Incomplete hydration brief',
        signal: 'The client supplied a title and budget but omitted material, size, margin, target ACOS, and priority ASIN.',
        metrics: { budget: '$80/day', margin: 'Unknown', targetAcos: 'Unknown' },
        expectedPrimary: 'ask_for_brief',
        expectedSecondary: 'high',
        evidence: 'Campaign structure and bids cannot be made responsibly without product economics and a clear launch target.',
        feedback: 'Pause architecture work and recover the missing brief. Guessing margin or goals turns every later decision into unmanaged risk.'
      },
      {
        id: 'controlled-discovery',
        title: 'Discovery with a hard budget ceiling',
        signal: 'Once the brief is complete, the client wants new query discovery but requires manual control of proven terms.',
        metrics: { budget: '$80/day', goal: 'Discovery', control: 'Required' },
        expectedPrimary: 'separate_auto_manual',
        expectedSecondary: 'medium',
        evidence: 'Separate auto and manual campaigns make discovery spend and proven-term performance independently controllable.',
        feedback: 'Use auto for discovery and manual campaigns for controlled targets. Mixing both jobs hides where the budget is working.'
      },
      {
        id: 'known-mismatch-themes',
        title: 'Known material mismatches',
        signal: 'The stainless-steel bottle cannot satisfy glass, disposable, or collapsible-bottle queries found during research.',
        metrics: { themes: '3 known mismatches', relevance: 'None', timing: 'Prelaunch' },
        expectedPrimary: 'seed_negatives',
        expectedSecondary: 'low',
        evidence: 'Confirmed product mismatches are safe prelaunch negatives and do not require a spend threshold.',
        feedback: 'Add the confirmed mismatch themes as launch guardrails. This protects discovery budget without blocking relevant exploration.'
      },
      {
        id: 'review-agreement',
        title: 'Client requests daily restructuring',
        signal: 'Forecast traffic is 20 clicks per day, but the client wants campaigns restructured after every daily report.',
        metrics: { forecast: '20 clicks/day', firstReview: '7 days', changeRisk: 'High noise' },
        expectedPrimary: 'review_after_7_days',
        expectedSecondary: 'medium',
        evidence: 'Agreeing on a seven-day or sufficient-click review window prevents noise-driven structural changes.',
        feedback: 'Monitor daily, but schedule structural decisions for an evidence-ready review window rather than reacting to each day.'
      }
    ]
  };

  var CAMPAIGN_ARCHITECT_SCENARIO_BANK = ScenarioBank.createScenarioBank([
    CAMPAIGN_ARCHITECT_SCENARIO,
    CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO
  ]);

  function gradeScenarioAttempt(scenarioId, attempt) {
    var scenario = CAMPAIGN_ARCHITECT_SCENARIO_BANK.get(scenarioId);
    if (!scenario) throw new TypeError('Unknown Campaign Architect scenario: ' + scenarioId);
    return DecisionSimulatorCore.gradeAttempt(scenario, attempt);
  }

  function gradeAttempt(attempt) {
    return DecisionSimulatorCore.gradeAttempt(CAMPAIGN_ARCHITECT_SCENARIO, attempt);
  }

  return {
    CAMPAIGN_ARCHITECT_SCENARIO: CAMPAIGN_ARCHITECT_SCENARIO,
    CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO: CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO,
    CAMPAIGN_ARCHITECT_SCENARIO_BANK: CAMPAIGN_ARCHITECT_SCENARIO_BANK,
    PRIMARY_OPTIONS: PRIMARY_OPTIONS,
    SECONDARY_OPTIONS: SECONDARY_OPTIONS,
    gradeAttempt: gradeAttempt,
    gradeScenarioAttempt: gradeScenarioAttempt
  };
});
