const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const SearchTriageCore = require('../assets/search-triage-core.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('Bid Decisions derives scenario actions from the shared PPC policy', () => {
  const core = read('assets/bid-decisions-core.js');
  const page = read('bid-decisions.html');

  assert.match(core, /require\('\.\/ppc-decision-policy\.js'\)/);
  assert.match(core, /PpcDecisionPolicy\.recommendBidAction/);
  assert.match(page, /src="assets\/ppc-decision-policy\.js"/);
});

test('Account Audit derives waste and budget findings from the shared PPC policy', () => {
  const core = read('assets/account-audit-core.js');
  const page = read('account-audit.html');

  assert.match(core, /require\('\.\/ppc-decision-policy\.js'\)/);
  assert.match(core, /PpcDecisionPolicy\.recommendBidAction/);
  assert.match(core, /PpcDecisionPolicy\.recommendBudgetAction/);
  assert.match(page, /src="assets\/ppc-decision-policy\.js"/);
});

test('Search Triage separates relevant zero-order diagnosis from confirmed irrelevance', () => {
  const page = read('search-triage.html');

  assert.match(page, /src="assets\/search-triage-core\.js"/);
  assert.equal(SearchTriageCore.expertFor({ cls: 'zero', m: { clicks: 25, orders: 0 } }, { margin: 35 }).a, 'KEEP');
  assert.equal(SearchTriageCore.expertFor({ cls: 'irr', m: {} }, { margin: 35 }).a, 'NEG_EXACT');
  assert.equal(SearchTriageCore.expertFor({ cls: 'pat', word: 'free', m: {} }, { margin: 35 }).a, 'NEG_PHRASE');
  assert.equal(SearchTriageCore.expertFor({ cls: 'early', m: { clicks: 6, orders: 1 } }, { margin: 35 }).a, 'KEEP');
});

test('Keyword Lab does not pause relevant zero-order traffic at fifteen clicks', () => {
  const page = read('keyword-lab.html');

  assert.doesNotMatch(page, /bluetooth earbuds[^\n]+clicks:15[^\n]+ans:'pause'/);
  assert.match(page, /bluetooth earbuds[^\n]+clicks:15[^\n]+ans:'hold'/);
});

test('PPC Coach does not harvest one-sale terms from thin data', () => {
  const coach = read('ppc-coach.html');

  assert.match(coach, /large bamboo cutting board[^\n]+clicks:6[^\n]+exp:"watch"/);
  assert.match(coach, /organic bamboo board[^\n]+clicks:3[^\n]+exp:"watch"/);
  assert.match(coach, /Module pass[^\n]+70%[^\n]+Simulator proficiency[^\n]+75%[^\n]+Supervised readiness[^\n]+85%/);
});
