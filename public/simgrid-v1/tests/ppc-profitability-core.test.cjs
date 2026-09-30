const test = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tests for PPC Profitability Lab core module
 * Tests all 18 questions across beginner, intermediate, and advanced scenarios
 */

const {
  PROFITABILITY_SCENARIOS,
  DIFFICULTY,
  gradeAttempt,
  gradeQuestion,
  getScenario,
  listScenarios
} = require('../assets/ppc-profitability-core.js');

// ============================================================
// CORE MODULE TESTS
// ============================================================

test('PPC Profitability core exports scenarios', () => {
  assert.ok(PROFITABILITY_SCENARIOS);
  assert.ok(PROFITABILITY_SCENARIOS.beginner);
  assert.ok(PROFITABILITY_SCENARIOS.intermediate);
  assert.ok(PROFITABILITY_SCENARIOS.advanced);
});

test('PPC Profitability core exports DIFFICULTY enum', () => {
  assert.ok(DIFFICULTY);
  assert.equal(DIFFICULTY.beginner, 'beginner');
  assert.equal(DIFFICULTY.intermediate, 'intermediate');
  assert.equal(DIFFICULTY.advanced, 'advanced');
});

test('PPC Profitability core exports gradeAttempt function', () => {
  assert.ok(typeof gradeAttempt === 'function');
});

test('PPC Profitability core exports gradeQuestion function', () => {
  assert.ok(typeof gradeQuestion === 'function');
});

test('PPC Profitability core exports getScenario function', () => {
  assert.ok(typeof getScenario === 'function');
});

test('PPC Profitability core exports listScenarios function', () => {
  assert.ok(typeof listScenarios === 'function');
});

// ============================================================
// SCENARIO STRUCTURE TESTS
// ============================================================

test('Beginner scenario has 6 questions', () => {
  assert.equal(PROFITABILITY_SCENARIOS.beginner.questions.length, 6);
});

test('Intermediate scenario has 6 questions', () => {
  assert.equal(PROFITABILITY_SCENARIOS.intermediate.questions.length, 6);
});

test('Advanced scenario has 6 questions', () => {
  assert.equal(PROFITABILITY_SCENARIOS.advanced.questions.length, 6);
});

test('All scenarios have required fields', () => {
  Object.keys(PROFITABILITY_SCENARIOS).forEach(key => {
    var scenario = PROFITABILITY_SCENARIOS[key];
    assert.ok(scenario.id);
    assert.ok(scenario.version);
    assert.ok(scenario.rubricVersion);
    assert.ok(scenario.title);
    assert.ok(scenario.difficulty);
    assert.ok(scenario.passingScore);
    assert.ok(scenario.questions);
  });
});

// ============================================================
// BEGINNER SCENARIO TESTS
// ============================================================

test('Beginner scenario questions have required fields', () => {
  PROFITABILITY_SCENARIOS.beginner.questions.forEach(q => {
    assert.ok(q.id);
    assert.ok(q.question);
    assert.ok(q.type);
    assert.ok(q.answer !== undefined);
    assert.ok(q.explanation);
    assert.ok(q.hint);
  });
});

test('Beginner scenario has break-even ACOS question', () => {
  var q = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'break-even-acos-1');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 30);
  assert.equal(q.units, '%');
});

test('Beginner scenario has allowable CPC question', () => {
  var q = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'allowable-cpc-1');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 1.35);
  assert.equal(q.units, '$');
});

test('Beginner scenario has ROAS calculation question', () => {
  var q = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'roas-calculation-1');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 5);
  assert.equal(q.units, 'x');
});

test('Beginner scenario has ACOS calculation question', () => {
  var q = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'acos-calculation-1');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 20);
  assert.equal(q.units, '%');
});

test('Beginner scenario has TACoS calculation question', () => {
  var q = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'tacos-calculation-1');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 10);
  assert.equal(q.units, '%');
});

test('Beginner scenario has profitability check question', () => {
  var q = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'profitability-check-1');
  assert.ok(q);
  assert.equal(q.type, 'boolean');
  assert.equal(q.answer, true);
});

// ============================================================
// BEGINNER GRADING TESTS
// ============================================================

test('Beginner perfect attempt scores 100%', () => {
  var perfectAnswers = {
    'break-even-acos-1': '30',
    'allowable-cpc-1': '1.35',
    'roas-calculation-1': '5',
    'acos-calculation-1': '20',
    'tacos-calculation-1': '10',
    'profitability-check-1': 'true'
  };

  var result = gradeAttempt('beginner', perfectAnswers);
  
  assert.equal(result.score, 60);
  assert.equal(result.maxScore, 60);
  assert.equal(result.correctAnswers, 6);
  assert.equal(result.totalQuestions, 6);
  assert.equal(result.passed, true);
  assert.equal(result.scenarioId, 'beginner');
  assert.equal(result.difficulty, DIFFICULTY.beginner);
});

test('Beginner empty attempt scores 0%', () => {
  var result = gradeAttempt('beginner', {});
  
  assert.equal(result.score, 0);
  assert.equal(result.maxScore, 60);
  assert.equal(result.correctAnswers, 0);
  assert.equal(result.passed, false);
});

test('Beginner partial attempt with 3 correct answers', () => {
  var partialAnswers = {
    'break-even-acos-1': '30',
    'allowable-cpc-1': '1.35',
    'roas-calculation-1': '5'
  };

  var result = gradeAttempt('beginner', partialAnswers);
  
  assert.equal(result.score, 30);
  assert.equal(result.maxScore, 60);
  assert.equal(result.correctAnswers, 3);
  assert.equal(result.passed, false);
});

// ============================================================
// INTERMEDIATE SCENARIO TESTS
// ============================================================

test('Intermediate scenario has break-even with fees question', () => {
  var q = PROFITABILITY_SCENARIOS.intermediate.questions.find(q => q.id === 'break-even-with-fees');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 25);
});

test('Intermediate scenario has allowable CPC with ROAS question', () => {
  var q = PROFITABILITY_SCENARIOS.intermediate.questions.find(q => q.id === 'allowable-cpc-with-roas');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 1.25);
});

test('Intermediate scenario has max bid calculation question', () => {
  var q = PROFITABILITY_SCENARIOS.intermediate.questions.find(q => q.id === 'max-bid-calculation');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 1.5);
});

test('Intermediate scenario has profit per click question', () => {
  var q = PROFITABILITY_SCENARIOS.intermediate.questions.find(q => q.id === 'profit-per-click');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 0.9);
});

test('Intermediate scenario has scale decision question', () => {
  var q = PROFITABILITY_SCENARIOS.intermediate.questions.find(q => q.id === 'scale-decision');
  assert.ok(q);
  assert.equal(q.type, 'boolean');
  assert.equal(q.answer, true);
});

test('Intermediate scenario has pause decision question', () => {
  var q = PROFITABILITY_SCENARIOS.intermediate.questions.find(q => q.id === 'pause-decision');
  assert.ok(q);
  assert.equal(q.type, 'boolean');
  assert.equal(q.answer, true);
});

// ============================================================
// INTERMEDIATE GRADING TESTS
// ============================================================

test('Intermediate perfect attempt scores 100%', () => {
  var perfectAnswers = {
    'break-even-with-fees': '25',
    'allowable-cpc-with-roas': '1.25',
    'max-bid-calculation': '1.5',
    'profit-per-click': '0.9',
    'scale-decision': 'true',
    'pause-decision': 'true'
  };

  var result = gradeAttempt('intermediate', perfectAnswers);
  
  assert.equal(result.score, 60);
  assert.equal(result.maxScore, 60);
  assert.equal(result.correctAnswers, 6);
  assert.equal(result.totalQuestions, 6);
  assert.equal(result.passed, true);
  assert.equal(result.scenarioId, 'intermediate');
  assert.equal(result.difficulty, DIFFICULTY.intermediate);
});

// ============================================================
// ADVANCED SCENARIO TESTS
// ============================================================

test('Advanced scenario has blended ACOS calculation question', () => {
  var q = PROFITABILITY_SCENARIOS.advanced.questions.find(q => q.id === 'blended-acos-calculation');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 28);
});

test('Advanced scenario has target ROAS from margin question', () => {
  var q = PROFITABILITY_SCENARIOS.advanced.questions.find(q => q.id === 'target-roas-from-margin');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 4);
});

test('Advanced scenario has budget allocation question', () => {
  var q = PROFITABILITY_SCENARIOS.advanced.questions.find(q => q.id === 'budget-allocation');
  assert.ok(q);
  assert.equal(q.type, 'multiple-choice');
  assert.equal(q.answer, 'campaign_a');
  assert.ok(q.options);
  assert.ok(q.options.includes('campaign_a'));
  assert.ok(q.options.includes('campaign_b'));
  assert.ok(q.options.includes('neither'));
});

test('Advanced scenario has bid adjustment question', () => {
  var q = PROFITABILITY_SCENARIOS.advanced.questions.find(q => q.id === 'bid-adjustment-for-profitability');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 25);
});

test('Advanced scenario has seasonal margin adjustment question', () => {
  var q = PROFITABILITY_SCENARIOS.advanced.questions.find(q => q.id === 'seasonal-margin-adjustment');
  assert.ok(q);
  assert.equal(q.type, 'numeric');
  assert.equal(q.answer, 20);
});

test('Advanced scenario has multi-campaign profitability question', () => {
  var q = PROFITABILITY_SCENARIOS.advanced.questions.find(q => q.id === 'multi-campaign-profitability');
  assert.ok(q);
  assert.equal(q.type, 'multiple-choice');
  assert.equal(q.answer, 'campaign_a');
  assert.ok(q.options);
  assert.ok(q.options.includes('campaign_a'));
  assert.ok(q.options.includes('campaign_b'));
  assert.ok(q.options.includes('they_are_equal'));
});

// ============================================================
// ADVANCED GRADING TESTS
// ============================================================

test('Advanced perfect attempt scores 100%', () => {
  var perfectAnswers = {
    'blended-acos-calculation': '28',
    'target-roas-from-margin': '4',
    'budget-allocation': 'campaign_a',
    'bid-adjustment-for-profitability': '25',
    'seasonal-margin-adjustment': '20',
    'multi-campaign-profitability': 'campaign_a'
  };

  var result = gradeAttempt('advanced', perfectAnswers);
  
  assert.equal(result.score, 60);
  assert.equal(result.maxScore, 60);
  assert.equal(result.correctAnswers, 6);
  assert.equal(result.totalQuestions, 6);
  assert.equal(result.passed, true);
  assert.equal(result.scenarioId, 'advanced');
  assert.equal(result.difficulty, DIFFICULTY.advanced);
});

// ============================================================
// ADVANCED PASSING SCORE TEST
// ============================================================

test('Advanced scenario requires 80% to pass', () => {
  var passingAnswers = {
    'blended-acos-calculation': '28',
    'target-roas-from-margin': '4',
    'budget-allocation': 'campaign_a',
    'bid-adjustment-for-profitability': '25',
    'seasonal-margin-adjustment': '20',
    'multi-campaign-profitability': 'campaign_b'
  };

  var result = gradeAttempt('advanced', passingAnswers);
  
  // 5 out of 6 = 83.33%, which is above 80%
  assert.equal(result.score, 50);
  assert.equal(result.maxScore, 60);
  assert.equal(result.correctAnswers, 5);
  assert.equal(result.passed, true);
});

// ============================================================
// GRADING EDGE CASES
// ============================================================

test('Numeric answer with tolerance accepts close values', () => {
  var answers = {
    'break-even-acos-1': '29.95',
    'allowable-cpc-1': '1.35',
    'roas-calculation-1': '5',
    'acos-calculation-1': '20',
    'tacos-calculation-1': '10',
    'profitability-check-1': 'true'
  };

  var result = gradeAttempt('beginner', answers);
  
  // 29.95 is within 0.1 tolerance of 30
  assert.equal(result.correctAnswers, 6);
  assert.equal(result.passed, true);
});

test('Numeric answer outside tolerance fails', () => {
  var answers = {
    'break-even-acos-1': '29',
    'allowable-cpc-1': '1.35',
    'roas-calculation-1': '5',
    'acos-calculation-1': '20',
    'tacos-calculation-1': '10',
    'profitability-check-1': 'true'
  };

  var result = gradeAttempt('beginner', answers);
  
  // 29 is outside 0.1 tolerance of 30
  assert.equal(result.correctAnswers, 5);
  assert.equal(result.passed, true); // 5/6 = 83.33% > 75%
});

test('Boolean answer accepts true/false strings', () => {
  var answers = {
    'break-even-acos-1': '30',
    'allowable-cpc-1': '1.35',
    'roas-calculation-1': '5',
    'acos-calculation-1': '20',
    'tacos-calculation-1': '10',
    'profitability-check-1': 'true'
  };

  var result = gradeAttempt('beginner', answers);
  
  // 'true' should be accepted as true
  assert.equal(result.correctAnswers, 6);
  assert.equal(result.passed, true);
});

test('Multiple choice answer must match exactly', () => {
  var answers = {
    'blended-acos-calculation': '28',
    'target-roas-from-margin': '4',
    'budget-allocation': 'Campaign A',
    'bid-adjustment-for-profitability': '25',
    'seasonal-margin-adjustment': '20',
    'multi-campaign-profitability': 'campaign_a'
  };

  var result = gradeAttempt('advanced', answers);
  
  // 'Campaign A' != 'campaign_a'
  assert.equal(result.correctAnswers, 5);
});

// ============================================================
// HELPER FUNCTION TESTS
// ============================================================

test('getScenario returns correct scenario', () => {
  var scenario = getScenario('beginner');
  assert.equal(scenario.id, 'ppc-profitability-beginner');
});

test('getScenario returns undefined for unknown scenario', () => {
  var scenario = getScenario('nonexistent');
  assert.equal(scenario, undefined);
});

test('listScenarios returns all scenarios', () => {
  var list = listScenarios();
  assert.equal(list.length, 3);
  assert.ok(list.find(s => s.id === 'ppc-profitability-beginner'));
  assert.ok(list.find(s => s.id === 'ppc-profitability-intermediate'));
  assert.ok(list.find(s => s.id === 'ppc-profitability-advanced'));
});

test('gradeQuestion returns correct result for numeric question', () => {
  var question = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'break-even-acos-1');
  var result = gradeQuestion(question, '30');
  
  assert.equal(result.earned, 10);
  assert.equal(result.possible, 10);
  assert.equal(result.correct, true);
});

test('gradeQuestion returns incorrect result for wrong answer', () => {
  var question = PROFITABILITY_SCENARIOS.beginner.questions.find(q => q.id === 'break-even-acos-1');
  var result = gradeQuestion(question, 'wrong');
  
  assert.equal(result.earned, 0);
  assert.equal(result.possible, 10);
  assert.equal(result.correct, false);
});

// ============================================================
// SUMMARY MESSAGES
// ============================================================

test('Perfect score returns excellent summary', () => {
  var perfectAnswers = {
    'break-even-acos-1': '30',
    'allowable-cpc-1': '1.35',
    'roas-calculation-1': '5',
    'acos-calculation-1': '20',
    'tacos-calculation-1': '10',
    'profitability-check-1': 'true'
  };

  var result = gradeAttempt('beginner', perfectAnswers);
  assert.match(result.summary, /excellent/i);
});

test('Failing score returns practice summary', () => {
  var result = gradeAttempt('beginner', {});
  assert.match(result.summary, /keep practicing/i);
});
