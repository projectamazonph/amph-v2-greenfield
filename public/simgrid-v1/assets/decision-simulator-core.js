(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DecisionSimulatorCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getPointValue(value, fallback) {
    return typeof value === 'number' ? value : fallback;
  }

  function getPassingScore(scenario) {
    return getPointValue(scenario.passingScore, 75);
  }

  function summarize(score, passingScore, summary) {
    if (summary) {
      if (score >= 90 && summary.excellent) return summary.excellent;
      if (score >= passingScore && summary.passing) return summary.passing;
      if (summary.needsPractice) return summary.needsPractice;
    }

    if (score >= 90) {
      return 'Strong simulator judgment. You matched the action to the evidence and risk.';
    }
    if (score >= passingScore) {
      return 'Good work. Review the missed rows and tighten how evidence changes the decision.';
    }
    return 'Keep practicing. Separate proven signals, weak signals, and risk before choosing the action.';
  }

  function gradeRow(row, answer, scenario) {
    var safeAnswer = answer || {};
    var primaryCorrect = safeAnswer.primary === row.expectedPrimary;
    var secondaryCorrect = safeAnswer.secondary === row.expectedSecondary;
    var primaryPoints = getPointValue(scenario.primaryPoints, 15);
    var secondaryPoints = getPointValue(scenario.secondaryPoints, 5);
    var bonusPoints = getPointValue(scenario.bonusPoints, 5);
    var earned = 0;

    if (primaryCorrect) earned += primaryPoints;
    if (secondaryCorrect) earned += secondaryPoints;
    if (primaryCorrect && secondaryCorrect) earned += bonusPoints;

    return {
      rowId: row.id,
      title: row.title,
      earned: earned,
      possible: primaryPoints + secondaryPoints + bonusPoints,
      primaryCorrect: primaryCorrect,
      secondaryCorrect: secondaryCorrect,
      expectedPrimary: row.expectedPrimary,
      expectedSecondary: row.expectedSecondary,
      selectedPrimary: safeAnswer.primary || '',
      selectedSecondary: safeAnswer.secondary || '',
      evidence: row.evidence,
      feedback: row.feedback,
      metrics: row.metrics || {}
    };
  }

  function gradeAttempt(scenario, attempt) {
    var safeAttempt = attempt || {};
    var items = scenario.rows.map(function (row) {
      return gradeRow(row, safeAttempt[row.id], scenario);
    });
    var score = items.reduce(function (sum, item) {
      return sum + item.earned;
    }, 0);
    var maxScore = items.reduce(function (sum, item) {
      return sum + item.possible;
    }, 0);
    var correctDecisions = items.filter(function (item) {
      return item.primaryCorrect && item.secondaryCorrect;
    }).length;
    var passingScore = getPassingScore(scenario);

    return {
      score: score,
      maxScore: maxScore,
      correctDecisions: correctDecisions,
      totalDecisions: items.length,
      passed: score >= passingScore,
      summary: summarize(score, passingScore, scenario.summary),
      items: items
    };
  }

  function createDecisionSimulator(scenario) {
    return {
      scenario: scenario,
      gradeAttempt: function (attempt) {
        return gradeAttempt(scenario, attempt);
      }
    };
  }

  return {
    createDecisionSimulator: createDecisionSimulator,
    gradeAttempt: gradeAttempt
  };
});