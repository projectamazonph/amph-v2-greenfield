const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const SimulatorAttempt = require('../assets/simulator-attempt.js');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

test('graded simulator result becomes a versioned progress attempt', () => {
  const attempt = SimulatorAttempt.buildAttemptRecord({
    scenario: {
      id: 'account-audit',
      version: '1.0.0',
      rubricVersion: '1.0.0'
    },
    result: { score: 80, maxScore: 100, passed: true },
    completedAt: '2026-08-20T13:00:00.000Z'
  });

  assert.deepEqual(attempt, {
    simulatorId: 'account-audit',
    scenarioId: 'account-audit',
    scenarioVersion: '1.0.0',
    rubricVersion: '1.0.0',
    score: 80,
    passed: true,
    completedAt: '2026-08-20T13:00:00.000Z'
  });
});

test('policy version is preserved when normalizing a policy-coupled attempt', () => {
  const attempt = SimulatorAttempt.buildAttemptRecord({
    scenario: {
      id: 'bid-decisions',
      version: '1.0.0',
      rubricVersion: '1.0.0',
      policyVersion: '1.0.0'
    },
    result: { score: 25, maxScore: 25, passed: true },
    completedAt: '2026-08-20T13:30:00.000Z'
  });

  assert.equal(attempt.policyVersion, '1.0.0');
});

test('attempt score is normalized when a simulator uses a non-100 maximum', () => {
  const attempt = SimulatorAttempt.buildAttemptRecord({
    scenario: { id: 'example', version: '2.0.0', rubricVersion: '3.0.0' },
    result: { score: 18, maxScore: 25, passed: false },
    completedAt: '2026-08-20T13:00:00.000Z'
  });

  assert.equal(attempt.score, 72);
});

test('scenario attempts keep a stable simulator id while recording the selected scenario id', () => {
  const attempt = SimulatorAttempt.buildAttemptRecord({
    scenario: {
      id: 'bid-decisions-intermediate-lunchbox',
      simulatorId: 'bid-decisions',
      version: '1.0.0',
      rubricVersion: '1.0.0'
    },
    result: { score: 80, maxScore: 100, passed: true },
    completedAt: '2026-08-20T12:00:00.000Z'
  });

  assert.equal(attempt.simulatorId, 'bid-decisions');
  assert.equal(attempt.scenarioId, 'bid-decisions-intermediate-lunchbox');
});

test('shared decision renderer records completed attempts through StudentProgress', () => {
  const page = read('assets/decision-simulator-page.js');

  assert.match(page, /StudentProgress\.createLocalProgressStore\(\)/);
  assert.match(page, /SimulatorAttempt\.buildAttemptRecord/);
  assert.match(page, /progressStore\.recordAttempt/);
});

[
  ['campaign-architect.html', 'assets/campaign-architect-core.js'],
  ['account-audit.html', 'assets/account-audit-core.js'],
  ['client-onboarding.html', 'assets/client-onboarding-core.js'],
  ['capstone-sequence.html', 'assets/capstone-sequence-core.js']
].forEach(([pageFile, coreFile]) => {
  test(`${pageFile} loads progress integration with versioned scenario content`, () => {
    const page = read(pageFile);
    const core = read(coreFile);

    assert.match(page, /src="assets\/student-progress\.js"/);
    assert.match(page, /src="assets\/simulator-attempt\.js"/);
    assert.match(core, /version: '1\.0\.0'/);
    assert.match(core, /rubricVersion: '1\.0\.0'/);
  });
});

test('Pacing Deck records its end-of-day score through shared progress', () => {
  const page = read('pacing-deck.html');

  assert.match(page, /src="assets\/student-progress\.js"/);
  assert.match(page, /src="assets\/simulator-attempt\.js"/);
  assert.match(page, /id:'pacing-deck',version:'1\.0\.0',rubricVersion:'1\.0\.0'/);
  assert.match(page, /SimulatorAttempt\.buildAttemptRecord/);
  assert.match(page, /progressStore\.recordAttempt/);
});

test('Keyword Lab records its certification result through shared progress', () => {
  const page = read('keyword-lab.html');

  assert.match(page, /src="assets\/student-progress\.js"/);
  assert.match(page, /src="assets\/simulator-attempt\.js"/);
  assert.match(page, /id:'keyword-lab',version:'1\.0\.0',rubricVersion:'1\.0\.0'/);
  assert.match(page, /maxScore:12,passed:quiz\.score>=10/);
  assert.match(page, /SimulatorAttempt\.buildAttemptRecord/);
});

test('Search Term Triage records completed rounds through shared progress', () => {
  const page = read('search-triage.html');

  assert.match(page, /src="assets\/student-progress\.js"/);
  assert.match(page, /src="assets\/search-triage-core\.js"/);
  assert.match(page, /src="assets\/simulator-attempt\.js"/);
  assert.match(page, /simulatorId:'search-triage'/);
  assert.match(page, /Math\.round\(acc\*100\)/);
  assert.match(page, /SimulatorAttempt\.buildAttemptRecord/);
});

test('policy-coupled scenarios expose a stable policy version', () => {
  const BidDecisions = require('../assets/bid-decisions-core.js');
  const AccountAudit = require('../assets/account-audit-core.js');
  const Policy = require('../assets/ppc-decision-policy.js');

  assert.equal(Policy.VERSION, '1.0.0');
  assert.equal(BidDecisions.BID_DECISIONS_SCENARIO.policyVersion, Policy.VERSION);
  assert.equal(AccountAudit.ACCOUNT_AUDIT_SCENARIO.policyVersion, Policy.VERSION);
  assert.equal(AccountAudit.ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO.policyVersion, Policy.VERSION);
});

test('AdConsole records Academy completion through shared progress', () => {
  const page = read('ad-console.html');

  assert.match(page, /src="assets\/student-progress\.js"/);
  assert.match(page, /src="assets\/simulator-attempt\.js"/);
  assert.match(page, /id:'ad-console-academy',simulatorId:'ad-console'/);
  assert.match(page, /result:\{score:100,maxScore:100,passed:true\}/);
  assert.match(page, /SimulatorAttempt\.buildAttemptRecord/);
});

test('Bulk File records its drill rubric through shared progress', () => {
  const page = read('bulk-file.html');
  assert.match(page, /src="assets\/student-progress\.js"/);
  assert.match(page, /src="assets\/simulator-attempt\.js"/);
  assert.match(page, /id:'bulk-file-drill',simulatorId:'bulk-file'/);
  assert.match(page, /score:d\.total,maxScore:100,passed:d\.total>=75/);
});

test('BuyBox Dojo records its knowledge quiz through shared progress', () => {
  const page = read('listing.html');
  assert.match(page, /src="assets\/student-progress\.js"/);
  assert.match(page, /src="assets\/simulator-attempt\.js"/);
  assert.match(page, /id:'buybox-knowledge-quiz',simulatorId:'listing'/);
  assert.match(page, /score:s,maxScore:tot,passed:pass/);
});

[
  ['sqp-studio.html', 'assets/sqp-studio-core.js'],
  ['bid-decisions.html', 'assets/bid-decisions-core.js']
].forEach(([pageFile, coreFile]) => {
  test(`${pageFile} records its custom graded result through shared progress`, () => {
    const page = read(pageFile);
    const core = read(coreFile);
    const rendererMatch = page.match(/src="(assets\/[^"]+-page\.js)"/);
    const integrationSource = rendererMatch ? read(rendererMatch[1]) : page;

    assert.match(page, /src="assets\/student-progress\.js"/);
    assert.match(page, /src="assets\/simulator-attempt\.js"/);
    assert.match(integrationSource + read('assets/simulator-view-utils.js'), /recordAttempt/);
    assert.match(integrationSource + read('assets/simulator-view-utils.js'), /SimulatorAttempt\.buildAttemptRecord/);
    assert.match(core, /version: '1\.0\.0'/);
    assert.match(core, /rubricVersion: '1\.0\.0'/);
  });
});
