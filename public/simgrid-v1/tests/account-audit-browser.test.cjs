const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');

/**
 * Browser completion tests for Account Audit simulator
 * Tests the HTML structure, core module, and accessibility of account-audit.html
 */

const AccountAuditCore = require('../assets/account-audit-core.js');

const {
  ACCOUNT_AUDIT_SCENARIO,
  ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO,
  PRIMARY_OPTIONS,
  SECONDARY_OPTIONS
} = AccountAuditCore;

const { gradeScenarioAttempt } = AccountAuditCore;

// ============================================================
// CORE MODULE TESTS
// ============================================================

test('Account Audit core exports scenario', () => {
  assert.ok(ACCOUNT_AUDIT_SCENARIO);
  assert.equal(ACCOUNT_AUDIT_SCENARIO.id, 'account-audit-core-triage');
});

test('Account Audit core exports intermediate scenario', () => {
  assert.ok(ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO);
  // Check that intermediate scenario exists
  assert.ok(ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO.id);
});

test('Account Audit core exports primary options', () => {
  assert.ok(PRIMARY_OPTIONS);
  assert.ok(PRIMARY_OPTIONS.cut_waste);
  assert.ok(PRIMARY_OPTIONS.scale_budget);
  assert.ok(PRIMARY_OPTIONS.audit_listing);
  assert.ok(PRIMARY_OPTIONS.monitor);
});

test('Account Audit core exports secondary options', () => {
  assert.ok(SECONDARY_OPTIONS);
  assert.ok(SECONDARY_OPTIONS.critical);
  assert.ok(SECONDARY_OPTIONS.high);
  assert.ok(SECONDARY_OPTIONS.medium);
  assert.ok(SECONDARY_OPTIONS.low);
});

// ============================================================
// SCENARIO STRUCTURE TESTS
// ============================================================

test('Account Audit scenarios have required fields', () => {
  [ACCOUNT_AUDIT_SCENARIO].forEach(scenario => {
    assert.ok(scenario.id);
    assert.ok(scenario.version);
    assert.ok(scenario.rubricVersion);
    assert.ok(scenario.title);
    assert.ok(scenario.rows);
    assert.ok(scenario.primaryOptions);
    assert.ok(scenario.secondaryOptions);
  });
});

test('Account Audit beginner scenario has 4 rows', () => {
  assert.equal(ACCOUNT_AUDIT_SCENARIO.rows.length, 4);
});

// Check if intermediate exists
if (ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO) {
  test('Account Audit intermediate scenario has rows', () => {
    assert.ok(ACCOUNT_AUDIT_INTERMEDIATE_SCENARIO.rows.length > 0);
  });
}

test('Account Audit rows have required fields', () => {
  ACCOUNT_AUDIT_SCENARIO.rows.forEach(row => {
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

test('Account Audit perfect attempt scores 100%', () => {
  const result = gradeScenarioAttempt('account-audit-core-triage', perfectAttempt(ACCOUNT_AUDIT_SCENARIO));
  
  assert.equal(result.score, 100);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 4);
  assert.equal(result.totalDecisions, 4);
  assert.equal(result.passed, true);
});

test('Account Audit handles empty attempt', () => {
  const result = gradeScenarioAttempt('account-audit-core-triage', {});
  
  assert.equal(result.score, 0);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 0);
  assert.equal(result.passed, false);
});

test('Account Audit handles partial attempt', () => {
  const partialAttempt = {
    'zero-sales-waste': {
      primary: 'cut_waste',
      secondary: 'critical'
    }
  };

  const result = gradeScenarioAttempt('account-audit-core-triage', partialAttempt);
  
  assert.equal(result.score, 25);
  assert.equal(result.maxScore, 100);
  assert.equal(result.correctDecisions, 1);
  assert.equal(result.passed, false);
});

// ============================================================
// HTML STRUCTURE TESTS
// ============================================================

test('Account Audit page loads shell resources', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<script.*assets\/shell\.js/i);
  assert.match(html, /<link.*assets\/shell\.css/i);
});

test('Account Audit page loads core module', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<script.*account-audit-core\.js/i);
});

test('Account Audit page has viewport meta tag', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<meta.*name="viewport"/i);
});

test('Account Audit page has charset meta tag', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<meta.*charset/i);
});

test('Account Audit page has structured data', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<script type="application\/ld\+json">/i);
  assert.match(html, /"@context": "https:\/\/schema.org"/i);
});

test('Account Audit page has canonical URL', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<link rel="canonical"/i);
});

test('Account Audit page has proper title', () => {
  const html = fs.readFileSync('./account-audit.html', 'utf8');
  
  assert.match(html, /<title>.*Account Audit.*<\/title>/i);
});

// ============================================================
// SCENARIO BANK INTEGRATION TESTS
// ============================================================

test('Account Audit scenarios have simulatorId', () => {
  assert.equal(ACCOUNT_AUDIT_SCENARIO.simulatorId, 'account-audit');
});

test('Account Audit scenarios have difficulty levels', () => {
  assert.equal(ACCOUNT_AUDIT_SCENARIO.difficulty, 'beginner');
});

// ============================================================
// ROW-SPECIFIC TESTS
// ============================================================

test('Account Audit zero-sales-waste row expects cut_waste critical', () => {
  const row = ACCOUNT_AUDIT_SCENARIO.rows.find(r => r.id === 'zero-sales-waste');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'cut_waste');
  assert.equal(row.expectedSecondary, 'critical');
});

test('Account Audit profitable-capped row expects scale_budget high', () => {
  const row = ACCOUNT_AUDIT_SCENARIO.rows.find(r => r.id === 'profitable-capped');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'scale_budget');
  assert.equal(row.expectedSecondary, 'high');
});

test('Account Audit clicks-low-cvr row expects audit_listing medium', () => {
  const row = ACCOUNT_AUDIT_SCENARIO.rows.find(r => r.id === 'clicks-low-cvr');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'audit_listing');
  assert.equal(row.expectedSecondary, 'medium');
});

test('Account Audit thin-new-campaign row expects monitor low', () => {
  const row = ACCOUNT_AUDIT_SCENARIO.rows.find(r => r.id === 'thin-new-campaign');
  assert.ok(row);
  assert.equal(row.expectedPrimary, 'monitor');
  assert.equal(row.expectedSecondary, 'low');
});

// ============================================================
// FEEDBACK AND EVIDENCE TESTS
// ============================================================

test('Account Audit rows have educational feedback', () => {
  ACCOUNT_AUDIT_SCENARIO.rows.forEach(row => {
    assert.ok(row.feedback.length > 0);
    assert.ok(row.evidence.length > 0);
  });
});

test('Account Audit feedback explains the reasoning', () => {
  const row = ACCOUNT_AUDIT_SCENARIO.rows[0];
  assert.match(row.feedback, /waste/i);
});

// ============================================================
// PRIORITY TESTS
// ============================================================

test('Account Audit treats proven waste as more urgent than thin new data', () => {
  const result = gradeScenarioAttempt('account-audit-core-triage', {
    'zero-sales-waste': { primary: 'cut_waste', secondary: 'critical' },
    'thin-new-campaign': { primary: 'cut_waste', secondary: 'critical' }
  });

  // zero-sales-waste should score full (25)
  assert.equal(result.items[0].earned, 25);
  // thin-new-campaign should score 0 (wrong primary)
  assert.equal(result.items[3].earned, 0);
  assert.match(result.items[3].feedback, /thin data/i);
});

// ============================================================
// WRONG ANSWER TESTS
// ============================================================

test('Account Audit wrong primary answer with correct secondary earns partial points', () => {
  const attempt = {
    'zero-sales-waste': {
      primary: 'wrong_action',
      secondary: 'critical'
    }
  };

  const result = gradeScenarioAttempt('account-audit-core-triage', attempt);
  const item = result.items.find(i => i.rowId === 'zero-sales-waste');
  
  assert.ok(item);
  assert.equal(item.earned, 5);
  assert.equal(item.possible, 25);
  assert.equal(item.primaryCorrect, false);
  assert.equal(item.secondaryCorrect, true);
});

test('Account Audit wrong secondary answer with correct primary earns partial points', () => {
  const attempt = {
    'zero-sales-waste': {
      primary: 'cut_waste',
      secondary: 'wrong_priority'
    }
  };

  const result = gradeScenarioAttempt('account-audit-core-triage', attempt);
  const item = result.items.find(i => i.rowId === 'zero-sales-waste');
  
  assert.ok(item);
  assert.equal(item.earned, 15);
  assert.equal(item.primaryCorrect, true);
  assert.equal(item.secondaryCorrect, false);
});

test('Account Audit completely wrong answer earns 0 points', () => {
  const attempt = {
    'zero-sales-waste': {
      primary: 'wrong_primary',
      secondary: 'wrong_secondary'
    }
  };

  const result = gradeScenarioAttempt('account-audit-core-triage', attempt);
  const item = result.items.find(i => i.rowId === 'zero-sales-waste');
  
  assert.ok(item);
  assert.equal(item.earned, 0);
  assert.equal(item.primaryCorrect, false);
  assert.equal(item.secondaryCorrect, false);
});
