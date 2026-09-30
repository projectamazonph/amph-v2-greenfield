const test = require('node:test');
const assert = require('node:assert/strict');

const { gradeAttempt } = require('../assets/decision-simulator-core.js');

test('gradeAttempt scores primary decisions, secondary calls, and full-row bonus', () => {
  const scenario = {
    passingScore: 50,
    rows: [
      {
        id: 'winner',
        title: 'Winner',
        expectedPrimary: 'scale',
        expectedSecondary: 'high',
        feedback: 'Scale it.'
      },
      {
        id: 'watch',
        title: 'Watch',
        expectedPrimary: 'monitor',
        expectedSecondary: 'low',
        feedback: 'Watch it.'
      }
    ]
  };

  const result = gradeAttempt(scenario, {
    winner: { primary: 'scale', secondary: 'high' },
    watch: { primary: 'monitor', secondary: 'high' }
  });

  assert.equal(result.score, 40);
  assert.equal(result.maxScore, 50);
  assert.equal(result.correctDecisions, 1);
  assert.equal(result.totalDecisions, 2);
  assert.equal(result.passed, false);
  assert.equal(result.items[0].earned, 25);
  assert.equal(result.items[1].earned, 15);
});