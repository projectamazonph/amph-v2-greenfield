const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BID_DECISIONS_SCENARIO,
  calculateBidMetrics,
  gradeAttempt
} = require('../assets/bid-decisions-core.js');

test('calculateBidMetrics derives CPC, CVR, ACOS, and ROAS from bid rows', () => {
  const row = {
    bid: 1.2,
    clicks: 80,
    spend: 72,
    sales: 240,
    orders: 12
  };

  assert.deepEqual(calculateBidMetrics(row), {
    cpc: 0.9,
    conversionRate: 15,
    acos: 30,
    roas: 3.33,
    costPerOrder: 6
  });
});

test('gradeAttempt rewards correct bid decisions and confidence calls', () => {
  const attempt = {
    'exact-winner': {
      action: 'raise_bid',
      confidence: 'high'
    },
    'high-acos-converter': {
      action: 'lower_bid',
      confidence: 'medium'
    },
    'thin-data-keyword': {
      action: 'hold_bid',
      confidence: 'low'
    },
    'wasted-spend-keyword': {
      action: 'investigate_pause',
      confidence: 'high'
    },
    'seasonal-winner': {
      action: 'raise_bid',
      confidence: 'high'
    },
    'expensive-but-relevant': {
      action: 'lower_bid',
      confidence: 'medium'
    },
    'new-profitable-exact': {
      action: 'raise_bid',
      confidence: 'medium'
    },
    'low-volume-broad': {
      action: 'hold_bid',
      confidence: 'low'
    }
  };

  const result = gradeAttempt(BID_DECISIONS_SCENARIO, attempt);

  assert.equal(result.score, 200);
  assert.equal(result.maxScore, 200);
  assert.equal(result.correctDecisions, 8);
  assert.equal(result.totalDecisions, 8);
  assert.equal(result.passed, true);
  assert.match(result.summary, /strong bid judgment/i);
});

test('gradeAttempt distinguishes wrong action from wrong confidence', () => {
  const attempt = {
    'exact-winner': {
      action: 'lower_bid',
      confidence: 'high'
    },
    'high-acos-converter': {
      action: 'lower_bid',
      confidence: 'high'
    }
  };

  const result = gradeAttempt(BID_DECISIONS_SCENARIO, attempt);

  assert.equal(result.maxScore, 200);
  assert.equal(result.correctDecisions, 0);
  assert.equal(result.totalDecisions, 8);
  assert.equal(result.passed, false);
  assert.equal(result.items[0].earned, 5);
  assert.match(result.items[0].feedback, /profitable and has enough orders/i);
  assert.equal(result.items[1].earned, 15);
  assert.match(result.items[1].feedback, /lower the bid proportionally/i);
});
