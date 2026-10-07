const test = require('node:test');
const assert = require('node:assert/strict');

const { createScenarioBank } = require('../assets/scenario-bank.js');

const scenarios = [
  { id: 'beginner-a', version: '1.0.0', rubricVersion: '1.0.0', difficulty: 'beginner', title: 'Beginner A' },
  { id: 'intermediate-a', version: '1.0.0', rubricVersion: '1.0.0', difficulty: 'intermediate', title: 'Intermediate A' }
];

test('scenario bank lists immutable metadata and selects by id', () => {
  const bank = createScenarioBank(scenarios);

  assert.deepEqual(bank.list(), [
    { id: 'beginner-a', version: '1.0.0', rubricVersion: '1.0.0', policyVersion: null, difficulty: 'beginner', title: 'Beginner A' },
    { id: 'intermediate-a', version: '1.0.0', rubricVersion: '1.0.0', policyVersion: null, difficulty: 'intermediate', title: 'Intermediate A' }
  ]);
  assert.equal(bank.get('intermediate-a'), scenarios[1]);
  assert.equal(bank.defaultScenario(), scenarios[0]);
});

test('scenario bank filters by difficulty without changing registration order', () => {
  const bank = createScenarioBank(scenarios);
  assert.deepEqual(bank.list('intermediate').map((item) => item.id), ['intermediate-a']);
});

test('scenario bank rejects duplicate and unversioned published scenarios', () => {
  assert.throws(() => createScenarioBank([scenarios[0], { ...scenarios[0] }]), /Duplicate scenario id/);
  assert.throws(() => createScenarioBank([{ id: 'broken', difficulty: 'beginner', title: 'Broken' }]), /version is required/);
});

test('scenario bank preserves an explicit policy version in published metadata', () => {
  const bank = createScenarioBank([{ ...scenarios[0], policyVersion: '2.0.0' }]);
  assert.equal(bank.list()[0].policyVersion, '2.0.0');
});

test('scenario bank returns null for an unknown scenario', () => {
  assert.equal(createScenarioBank(scenarios).get('missing'), null);
});
