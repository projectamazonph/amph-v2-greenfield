const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SQP_STUDIO_SCENARIO,
  calculateQueryMetrics,
  gradeAttempt
} = require('../assets/sqp-studio-core.js');

test('calculateQueryMetrics derives share and conversion signals from SQP rows', () => {
  const row = {
    queryVolume: 12000,
    marketPurchases: 420,
    brandImpressions: 960,
    brandClicks: 110,
    brandCartAdds: 28,
    brandPurchases: 18
  };

  assert.deepEqual(calculateQueryMetrics(row), {
    impressionShare: 8,
    clickThroughRate: 11.46,
    cartAddRate: 25.45,
    purchaseRate: 16.36,
    purchaseShare: 4.29,
    marketPurchaseRate: 3.5
  });
});

test('gradeAttempt rewards correct SQP diagnoses and practical follow-up checks', () => {
  const attempt = {
    'stainless-lunch-box': {
      diagnosis: 'scale_visibility',
      followUp: 'increase_coverage'
    },
    'kids-bento-box-leakproof': {
      diagnosis: 'fix_listing_conversion',
      followUp: 'audit_pdp'
    },
    'insulated-food-jar': {
      diagnosis: 'watch_data_limit',
      followUp: 'collect_more_data'
    },
    'bento-accessories': {
      diagnosis: 'reduce_waste',
      followUp: 'tighten_targeting'
    },
    'school-lunch-set': {
      diagnosis: 'scale_visibility',
      followUp: 'increase_coverage'
    },
    'lunch-box-cheap': {
      diagnosis: 'fix_listing_conversion',
      followUp: 'audit_pdp'
    },
    'reusable-water-bottle': {
      diagnosis: 'scale_visibility',
      followUp: 'increase_coverage'
    },
    'eco-friendly-container': {
      diagnosis: 'fix_listing_conversion',
      followUp: 'audit_pdp'
    }
  };

  const result = gradeAttempt(SQP_STUDIO_SCENARIO, attempt);

  assert.equal(result.score, 200);
  assert.equal(result.maxScore, 200);
  assert.equal(result.correctDecisions, 8);
  assert.equal(result.totalDecisions, 8);
  assert.equal(result.passed, true);
  assert.match(result.summary, /strong SQP read/i);
});

test('gradeAttempt identifies missed evidence and keeps scoring deterministic', () => {
  const attempt = {
    'stainless-lunch-box': {
      diagnosis: 'fix_listing_conversion',
      followUp: 'audit_pdp'
    },
    'kids-bento-box-leakproof': {
      diagnosis: 'scale_visibility',
      followUp: 'increase_coverage'
    }
  };

  const result = gradeAttempt(SQP_STUDIO_SCENARIO, attempt);

  assert.equal(result.maxScore, 200);
  assert.equal(result.correctDecisions, 0);
  assert.equal(result.totalDecisions, 8);
  assert.equal(result.passed, false);
  assert.equal(result.items.length, 8);
  assert.equal(result.items[0].queryId, 'stainless-lunch-box');
  assert.equal(result.items[0].earned, 0);
  assert.match(result.items[0].feedback, /visibility is the constraint/i);
  assert.match(result.items[2].feedback, /not enough brand-side data/i);
});
