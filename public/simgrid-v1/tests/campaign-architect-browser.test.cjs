const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

/**
 * Browser completion tests for Campaign Architect simulator
 * Tests the HTML structure, core module, and accessibility of campaign-architect.html
 */

const CampaignArchitectCore = require('../assets/campaign-architect-core.js');

const {
  CAMPAIGN_ARCHITECT_SCENARIO,
  CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO,
  PRIMARY_OPTIONS,
  SECONDARY_OPTIONS
} = CampaignArchitectCore;

// Use the gradeScenarioAttempt for specific scenarios
const { gradeScenarioAttempt } = CampaignArchitectCore;

// ============================================================
// CORE MODULE TESTS
// ============================================================

test('Campaign Architect core exports scenario', () => {
  assert.ok(CAMPAIGN_ARCHITECT_SCENARIO);
  assert.equal(CAMPAIGN_ARCHITECT_SCENARIO.id, 'campaign-architect-launch-basics');
});

test('Campaign Architect core exports intermediate scenario', () => {
  assert.ok(CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO);
  assert.equal(CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO.id, 'campaign-architect-brief-recovery');
});

test('Campaign Architect core exports primary options', () => {
  assert.ok(PRIMARY_OPTIONS);
  assert.ok(PRIMARY_OPTIONS.separate_auto_manual);
  assert.ok(PRIMARY_OPTIONS.exact_phrase_core);
  assert.ok(PRIMARY_OPTIONS.seed_negatives);
});

test('Campaign Architect core exports secondary options', () => {
  assert.ok(SECONDARY_OPTIONS);
  assert.ok(SECONDARY_OPTIONS.low);
  assert.ok(SECONDARY_OPTIONS.medium);
  assert.ok(SECONDARY_OPTIONS.high);
});

// ============================================================
// SCENARIO STRUCTURE TESTS
// ============================================================

test('Campaign Architect scenarios have required fields', () => {
  [CAMPAIGN_ARCHITECT_SCENARIO, CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO].forEach(scenario => {
    assert.ok(scenario.id);
    assert.ok(scenario.version);
    assert.ok(scenario.rubricVersion);
    assert.ok(scenario.title);
    assert.ok(scenario.rows);
    assert.ok(scenario.primaryOptions);
    assert.ok(scenario.secondaryOptions);
  });
});

test('Campaign Architect beginner scenario has 4 rows', () => {
  assert.equal(CAMPAIGN_ARCHITECT_SCENARIO.rows.length, 4);
});

test('Campaign Architect intermediate scenario has 4 rows', () => {
  assert.equal(CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO.rows.length, 4);
});

test('Campaign Architect rows have required fields', () => {
  CAMPAIGN_ARCHITECT_SCENARIO.rows.forEach(row => {
    assert.ok(row.id);
    assert.ok(row.title);
    assert.ok(row.signal);
    assert.ok(row.expectedPrimary);
    assert.ok(row.expectedSecondary);
    assert.ok(row.evidence);
    assert.ok(row.feedback);
  });
});

// ============================================================
// GRADING TESTS
// ============================================================

function perfectAttempt(scenario) {
  return scenario.rows.reduce((attempt, row) => {
    attempt[row.id] = {
      primary: row.expectedPrimary,
      secondary: row.expectedSecondary
    };
    return attempt;
  }, {});
}

test('Campaign Architect perfect attempt scores 100%', () => {
  const result = gradeScenarioAttempt('campaign-architect-launch-basics', perfectAttempt(CAMPAIGN_ARCHITECT_SCENARIO));
  
  assert.equal(result.score, 100);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 4);
  assert.equal(result.totalDecisions, 4);
  assert.equal(result.passed, true);
});

test('Campaign Architect intermediate perfect attempt scores 100%', () => {
  const result = gradeScenarioAttempt('campaign-architect-brief-recovery', perfectAttempt(CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO));
  
  assert.equal(result.score, 100);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 4);
  assert.equal(result.totalDecisions, 4);
  assert.equal(result.passed, true);
});

test('Campaign Architect handles empty attempt', () => {
  const result = gradeScenarioAttempt('campaign-architect-launch-basics', {});
  
  assert.equal(result.score, 0);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 0);
  assert.equal(result.passed, false);
});

test('Campaign Architect handles partial attempt', () => {
  const partialAttempt = {
    'launch-structure': {
      primary: 'separate_auto_manual',
      secondary: 'medium'
    }
  };

  const result = gradeScenarioAttempt('campaign-architect-launch-basics', partialAttempt);
  
  assert.equal(result.score, 25);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 1);
  assert.equal(result.passed, false);
});

// ============================================================
// HTML STRUCTURE TESTS
// ============================================================

test('Campaign Architect page loads shell resources', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<script.*assets\/shell\.js/i);
  assert.match(html, /<link.*assets\/shell\.css/i);
});

test('Campaign Architect page loads core module', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<script.*campaign-architect-core\.js/i);
});

test('Campaign Architect page has viewport meta tag', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<meta.*name="viewport"/i);
});

test('Campaign Architect page has charset meta tag', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<meta.*charset/i);
});

test('Campaign Architect page has structured data', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<script type="application\/ld\+json">/i);
  assert.match(html, /"@context": "https:\/\/schema.org"/i);
});

test('Campaign Architect page has canonical URL', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<link rel="canonical"/i);
});

test('Campaign Architect page has proper title', () => {
  const html = fs.readFileSync('./campaign-architect.html', 'utf8');
  
  assert.match(html, /<title>.*Campaign Architect.*<\/title>/i);
});

// ============================================================
// SCENARIO BANK INTEGRATION TESTS
// ============================================================

test('Campaign Architect scenarios have simulatorId', () => {
  assert.equal(CAMPAIGN_ARCHITECT_SCENARIO.simulatorId, 'campaign-architect');
  assert.equal(CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO.simulatorId, 'campaign-architect');
});

test('Campaign Architect scenarios have difficulty levels', () => {
  assert.equal(CAMPAIGN_ARCHITECT_SCENARIO.difficulty, 'beginner');
  assert.equal(CAMPAIGN_ARCHITECT_INTERMEDIATE_SCENARIO.difficulty, 'intermediate');
});

// ============================================================
// ROW-SPECIFIC TESTS
// ============================================================

test('Campaign Architect launch-structure row expects separate_auto_manual', () => {
  const row = CAMPAIGN_ARCHITECT_SCENARIO.rows.find(r => r.id === 'launch-structure');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'separate_auto_manual');
  assert.equal(row.expectedSecondary, 'medium');
});

test('Campaign Architect core-targeting row expects exact_phrase_core', () => {
  const row = CAMPAIGN_ARCHITECT_SCENARIO.rows.find(r => r.id === 'core-targeting');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'exact_phrase_core');
  assert.equal(row.expectedSecondary, 'low');
});

test('Campaign Architect prelaunch-negatives row expects seed_negatives', () => {
  const row = CAMPAIGN_ARCHITECT_SCENARIO.rows.find(r => r.id === 'prelaunch-negatives');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'seed_negatives');
  assert.equal(row.expectedSecondary, 'low');
});

test('Campaign Architect first-review-rule row expects review_after_7_days', () => {
  const row = CAMPAIGN_ARCHITECT_SCENARIO.rows.find(r => r.id === 'first-review-rule');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'review_after_7_days');
  assert.equal(row.expectedSecondary, 'medium');
});

// ============================================================
// FEEDBACK AND EVIDENCE TESTS
// ============================================================

test('Campaign Architect rows have educational feedback', () => {
  CAMPAIGN_ARCHITECT_SCENARIO.rows.forEach(row => {
    assert.ok(row.feedback.length > 0);
    assert.ok(row.evidence.length > 0);
  });
});

test('Campaign Architect feedback explains the reasoning', () => {
  const row = CAMPAIGN_ARCHITECT_SCENARIO.rows[0];
  assert.match(row.feedback, /discovery/i);
  assert.match(row.feedback, /control/i);
});

// ============================================================
// WRONG ANSWER TESTS
// ============================================================

test('Campaign Architect wrong primary answer with correct secondary earns partial points', () => {
  // The scoring gives: primary correct = 15, secondary correct = 5, both correct = +5 bonus
  // So wrong primary + correct secondary = 0 + 5 + 0 = 5 points
  const attempt = {
    'launch-structure': {
      primary: 'wrong_answer',
      secondary: 'medium'
    }
  };

  const result = gradeScenarioAttempt('campaign-architect-launch-basics', attempt);
  const item = result.items.find(i => i.rowId === 'launch-structure');
  
  assert.ok(item);
  assert.equal(item.earned, 5);
  assert.equal(item.possible, 25);
  assert.equal(item.primaryCorrect, false);
  assert.equal(item.secondaryCorrect, true);
});

test('Campaign Architect wrong secondary answer with correct primary earns partial points', () => {
  const attempt = {
    'launch-structure': {
      primary: 'separate_auto_manual',
      secondary: 'wrong_risk'
    }
  };

  const result = gradeScenarioAttempt('campaign-architect-launch-basics', attempt);
  const item = result.items.find(i => i.rowId === 'launch-structure');
  
  assert.ok(item);
  // Correct primary + wrong secondary = 15 + 0 + 0 = 15 points
  assert.equal(item.earned, 15);
  assert.equal(item.primaryCorrect, true);
  assert.equal(item.secondaryCorrect, false);
});

test('Campaign Architect completely wrong answer earns 0 points', () => {
  const attempt = {
    'launch-structure': {
      primary: 'wrong_primary',
      secondary: 'wrong_secondary'
    }
  };

  const result = gradeScenarioAttempt('campaign-architect-launch-basics', attempt);
  const item = result.items.find(i => i.rowId === 'launch-structure');
  
  assert.ok(item);
  assert.equal(item.earned, 0);
  assert.equal(item.primaryCorrect, false);
  assert.equal(item.secondaryCorrect, false);
});
