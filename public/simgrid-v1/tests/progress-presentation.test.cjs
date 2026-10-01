const test = require('node:test');
const assert = require('node:assert/strict');

const ProgressPresentation = require('../assets/progress-presentation.js');

test('progress presentation distinguishes not started, in progress, and passed', () => {
  assert.deepEqual(
    ProgressPresentation.describe({ status: 'not_started', bestScore: 0, attemptCount: 0 }),
    { label: 'Not started', detail: 'No attempts yet', tone: 'neutral' }
  );
  assert.deepEqual(
    ProgressPresentation.describe({ status: 'in_progress', bestScore: 64, attemptCount: 2 }),
    { label: 'In progress', detail: 'Best 64% · 2 attempts', tone: 'warning' }
  );
  assert.deepEqual(
    ProgressPresentation.describe({ status: 'passed', bestScore: 86, attemptCount: 1 }),
    { label: 'Passed', detail: 'Best 86% · 1 attempt', tone: 'success' }
  );
});

test('progress presentation uses singular attempt wording', () => {
  assert.equal(
    ProgressPresentation.describe({ status: 'in_progress', bestScore: 55, attemptCount: 1 }).detail,
    'Best 55% · 1 attempt'
  );
});
