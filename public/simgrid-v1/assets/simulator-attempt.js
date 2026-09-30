(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SimulatorAttempt = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function requireValue(value, label) {
    if (value === undefined || value === null || value === '') {
      throw new TypeError(label + ' is required');
    }
  }

  function buildAttemptRecord(input) {
    var safeInput = input || {};
    var scenario = safeInput.scenario || {};
    var result = safeInput.result || {};

    requireValue(scenario.id, 'scenario.id');
    requireValue(scenario.version, 'scenario.version');
    requireValue(scenario.rubricVersion, 'scenario.rubricVersion');
    requireValue(result.score, 'result.score');
    requireValue(result.maxScore, 'result.maxScore');
    requireValue(safeInput.completedAt, 'completedAt');

    if (typeof result.score !== 'number' || !Number.isFinite(result.score)) {
      throw new TypeError('result.score must be a finite number');
    }
    if (typeof result.maxScore !== 'number' || !Number.isFinite(result.maxScore) || result.maxScore <= 0) {
      throw new TypeError('result.maxScore must be a finite number greater than zero');
    }
    if (result.score < 0 || result.score > result.maxScore) {
      throw new TypeError('result.score must be between zero and result.maxScore');
    }

    var record = {
      simulatorId: scenario.simulatorId || scenario.id,
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      rubricVersion: scenario.rubricVersion,
      score: Math.round((result.score / result.maxScore) * 100),
      passed: Boolean(result.passed),
      completedAt: safeInput.completedAt
    };
    if (scenario.policyVersion) record.policyVersion = scenario.policyVersion;
    return record;
  }

  return {
    buildAttemptRecord: buildAttemptRecord
  };
});
