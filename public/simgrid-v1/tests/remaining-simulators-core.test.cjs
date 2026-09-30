const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CAMPAIGN_ARCHITECT_SCENARIO,
  gradeAttempt: gradeCampaignArchitect
} = require('../assets/campaign-architect-core.js');
const {
  ACCOUNT_AUDIT_SCENARIO,
  gradeAttempt: gradeAccountAudit
} = require('../assets/account-audit-core.js');
const {
  CLIENT_ONBOARDING_SCENARIO,
  gradeAttempt: gradeClientOnboarding
} = require('../assets/client-onboarding-core.js');
const {
  CAPSTONE_SEQUENCE_SCENARIO,
  gradeAttempt: gradeCapstoneSequence
} = require('../assets/capstone-sequence-core.js');

function perfectAttempt(scenario) {
  return scenario.rows.reduce((attempt, row) => {
    attempt[row.id] = {
      primary: row.expectedPrimary,
      secondary: row.expectedSecondary
    };
    return attempt;
  }, {});
}

[
  ['Campaign Architect', CAMPAIGN_ARCHITECT_SCENARIO, gradeCampaignArchitect, 4],
  ['Account Audit', ACCOUNT_AUDIT_SCENARIO, gradeAccountAudit, 4],
  ['Client Onboarding', CLIENT_ONBOARDING_SCENARIO, gradeClientOnboarding, 6],
  ['Capstone Sequence', CAPSTONE_SEQUENCE_SCENARIO, gradeCapstoneSequence, 4]
].forEach(([name, scenario, grade, expectedTotal]) => {
  test(`${name} awards a passing score for the expected decisions`, () => {
    const result = grade(perfectAttempt(scenario));

    assert.equal(result.score, name === 'Client Onboarding' ? 150 : 100);
    assert.equal(result.maxScore, name === 'Client Onboarding' ? 150 : 100);
    assert.equal(result.correctDecisions, expectedTotal);
    assert.equal(result.totalDecisions, expectedTotal);
    assert.equal(result.passed, true);
    assert.match(result.summary, /strong/i);
  });
});

test('Campaign Architect separates launch structure from day-one overreaction', () => {
  const result = gradeCampaignArchitect({
    'launch-structure': { primary: 'separate_auto_manual', secondary: 'medium' },
    'first-review-rule': { primary: 'ask_for_brief', secondary: 'medium' }
  });

  assert.equal(result.items[0].earned, 25);
  assert.equal(result.items[3].earned, 5);
  assert.match(result.items[3].feedback, /first review window/i);
});

test('Account Audit treats proven waste as more urgent than thin new data', () => {
  const result = gradeAccountAudit({
    'zero-sales-waste': { primary: 'cut_waste', secondary: 'critical' },
    'thin-new-campaign': { primary: 'cut_waste', secondary: 'critical' }
  });

  assert.equal(result.items[0].earned, 25);
  assert.equal(result.items[3].earned, 0);
  assert.match(result.items[3].feedback, /thin data/i);
});

test('Client Onboarding marks missing Ads access and KPI as launch blockers', () => {
  const result = gradeClientOnboarding({
    'missing-ads-access': { primary: 'request_ads_access', secondary: 'blocker' },
    'unclear-goal': { primary: 'define_primary_kpi', secondary: 'blocker' }
  });

  assert.equal(result.score, 50);
  assert.equal(result.items[0].earned, 25);
  assert.equal(result.items[1].earned, 25);
});

test('Capstone Sequence requires the right action at the right stage', () => {
  const result = gradeCapstoneSequence({
    'optimization-stage': { primary: 'reduce_waste_harvest_winners', secondary: 'setup' },
    'reporting-stage': { primary: 'send_evidence_summary', secondary: 'report' }
  });

  assert.equal(result.items[2].earned, 15);
  assert.equal(result.items[3].earned, 25);
  assert.match(result.items[2].feedback, /cutting waste and harvesting winners/i);
});
