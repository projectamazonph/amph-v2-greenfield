const test = require('node:test');
const assert = require('node:assert/strict');
const SearchTriageCore = require('../assets/search-triage-core.js');

test('Search Term Triage keeps relevant zero-order traffic when evidence is still limited', () => {
  const result = SearchTriageCore.expertFor({
    cls: 'zero',
    m: { clicks: 15, orders: 0, acos: null }
  }, { margin: 30 });

  assert.equal(result.a, 'KEEP');
  assert.match(result.why, /zero orders is not an automatic negative/i);
});

test('Search Term Triage does not harvest a single early conversion from thin data', () => {
  const result = SearchTriageCore.expertFor({
    cls: 'early',
    m: { clicks: 6, orders: 1, acos: 18 }
  }, { margin: 30 });

  assert.equal(result.a, 'KEEP');
  assert.match(result.why, /still thin evidence/i);
});

test('Search Term Triage uses negative exact and phrase actions for distinct mismatch types', () => {
  const irrelevant = SearchTriageCore.expertFor({ cls: 'irr', m: {} }, { margin: 30 });
  const repeatedTheme = SearchTriageCore.expertFor({ cls: 'pat', word: 'cheap', m: {} }, { margin: 30 });

  assert.equal(irrelevant.a, 'NEG_EXACT');
  assert.equal(repeatedTheme.a, 'NEG_PHRASE');
  assert.match(repeatedTheme.why, /cheap/);
});

test('Search Term Triage rejects unknown grading classes', () => {
  assert.throws(
    () => SearchTriageCore.expertFor({ cls: 'unknown', m: {} }, { margin: 30 }),
    /Unknown Search Term Triage class/
  );
});
