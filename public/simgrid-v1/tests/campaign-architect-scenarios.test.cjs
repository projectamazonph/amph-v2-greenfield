const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  CAMPAIGN_ARCHITECT_SCENARIO_BANK,
  gradeScenarioAttempt
} = require('../assets/campaign-architect-core.js');

function perfectAttempt(scenario) {
  return scenario.rows.reduce((attempt, row) => {
    attempt[row.id] = {
      primary: row.expectedPrimary,
      secondary: row.expectedSecondary
    };
    return attempt;
  }, {});
}

test('Campaign Architect publishes selectable beginner and intermediate scenarios', () => {
  const listed = CAMPAIGN_ARCHITECT_SCENARIO_BANK.list();

  assert.equal(listed.length, 2);
  assert.deepEqual(listed.map((scenario) => scenario.difficulty), ['beginner', 'intermediate']);
  assert.equal(CAMPAIGN_ARCHITECT_SCENARIO_BANK.defaultScenario().id, listed[0].id);
});

test('Campaign Architect scenarios preserve simulator progress identity and grade independently', () => {
  CAMPAIGN_ARCHITECT_SCENARIO_BANK.list().forEach(({ id }) => {
    const scenario = CAMPAIGN_ARCHITECT_SCENARIO_BANK.get(id);
    const result = gradeScenarioAttempt(id, perfectAttempt(scenario));

    assert.equal(scenario.simulatorId, 'campaign-architect');
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
  });
});

test('Campaign Architect rejects an unknown scenario selection', () => {
  assert.throws(() => gradeScenarioAttempt('missing', {}), /Unknown Campaign Architect scenario/);
});

test('Campaign Architect page mounts the shared selector against its scenario bank', () => {
  const page = fs.readFileSync('campaign-architect.html', 'utf8');
  const renderer = fs.readFileSync('assets/campaign-architect-page.js', 'utf8');

  assert.match(page, /src="assets\/scenario-bank\.js"/);
  assert.match(renderer, /core\.CAMPAIGN_ARCHITECT_SCENARIO_BANK/);
  assert.match(renderer, /bank\.get/);
  assert.match(renderer, /core\.gradeScenarioAttempt\(scenario\.id, answers\)/);
  assert.match(renderer, /data-pack/);
});
