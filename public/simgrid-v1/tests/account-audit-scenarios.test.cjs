const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  ACCOUNT_AUDIT_SCENARIO_BANK,
  gradeScenarioAttempt
} = require('../assets/account-audit-core.js');

function perfectAttempt(scenario) {
  return scenario.rows.reduce((attempt, row) => {
    attempt[row.id] = {
      primary: row.expectedPrimary,
      secondary: row.expectedSecondary
    };
    return attempt;
  }, {});
}

test('Account Audit publishes selectable beginner and intermediate scenarios', () => {
  const listed = ACCOUNT_AUDIT_SCENARIO_BANK.list();

  assert.equal(listed.length, 2);
  assert.deepEqual(listed.map((scenario) => scenario.difficulty), ['beginner', 'intermediate']);
});

test('Account Audit scenarios preserve simulator identity and grade independently', () => {
  ACCOUNT_AUDIT_SCENARIO_BANK.list().forEach(({ id }) => {
    const scenario = ACCOUNT_AUDIT_SCENARIO_BANK.get(id);
    const result = gradeScenarioAttempt(id, perfectAttempt(scenario));

    assert.equal(scenario.simulatorId, 'account-audit');
    assert.equal(result.score, 100);
    assert.equal(result.passed, true);
  });
});

test('Account Audit rejects an unknown scenario selection', () => {
  assert.throws(() => gradeScenarioAttempt('missing', {}), /Unknown Account Audit scenario/);
});

test('Account Audit page mounts the shared selector against its scenario bank', () => {
  const page = fs.readFileSync('account-audit.html', 'utf8');
  const renderer = fs.readFileSync('assets/account-audit-page.js', 'utf8');

  assert.match(page, /src="assets\/scenario-bank\.js"/);
  assert.match(renderer, /core\.ACCOUNT_AUDIT_SCENARIO_BANK/);
  assert.match(renderer, /core\.gradeScenarioAttempt\(scenario\.id, answers\)/);
  assert.match(renderer, /data-pack/);
});
