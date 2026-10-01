const test = require('node:test');
const assert = require('node:assert/strict');

const Policy = require('../assets/ppc-decision-policy.js');

test('evidence bands prevent confident calls from thin click data', () => {
  assert.equal(Policy.evidenceBand(9), 'thin');
  assert.equal(Policy.evidenceBand(10), 'emerging');
  assert.equal(Policy.evidenceBand(20), 'decision_ready');
  assert.equal(Policy.evidenceBand(40), 'confident');
});

test('confirmed irrelevance is negated without waiting for a generic click threshold', () => {
  assert.equal(Policy.recommendSearchTermAction({ clicks: 4, orders: 0, relevance: 'irrelevant', scope: 'single_query' }), 'negative_exact');
  assert.equal(Policy.recommendSearchTermAction({ clicks: 6, orders: 0, relevance: 'irrelevant', scope: 'repeated_theme' }), 'negative_phrase');
});

test('relevant non-converters are watched, diagnosed, then controlled as evidence grows', () => {
  assert.equal(Policy.recommendSearchTermAction({ clicks: 9, orders: 0, relevance: 'relevant' }), 'watch');
  assert.equal(Policy.recommendSearchTermAction({ clicks: 25, orders: 0, relevance: 'relevant' }), 'diagnose_listing_and_offer');
  assert.equal(Policy.recommendSearchTermAction({ clicks: 45, orders: 0, relevance: 'relevant' }), 'lower_bid_or_pause_target');
});

test('a sale alone does not justify scaling but proven profitable demand does', () => {
  assert.equal(Policy.recommendBidAction({ clicks: 6, orders: 1, acos: 18, targetAcos: 30 }), 'hold');
  assert.equal(Policy.recommendBidAction({ clicks: 30, orders: 4, acos: 18, targetAcos: 30 }), 'raise_10_percent');
});

test('expensive converters are reduced rather than negated', () => {
  assert.equal(Policy.recommendBidAction({ clicks: 35, orders: 3, acos: 48, targetAcos: 30 }), 'lower_15_percent');
});

test('profitable constrained campaigns scale budget only with proof', () => {
  assert.equal(Policy.recommendBudgetAction({ orders: 1, acos: 20, targetAcos: 30, budgetCapped: true }), 'hold');
  assert.equal(Policy.recommendBudgetAction({ orders: 8, acos: 20, targetAcos: 30, budgetCapped: true }), 'raise_10_to_20_percent');
  assert.equal(Policy.recommendBudgetAction({ orders: 8, acos: 42, targetAcos: 30, budgetCapped: true }), 'fix_efficiency_first');
});
