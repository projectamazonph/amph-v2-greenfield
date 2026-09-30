(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ScenarioBank = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function requireField(scenario, field) {
    if (!scenario[field]) throw new TypeError(field + ' is required for scenario ' + (scenario.id || '(unknown)'));
  }

  function metadata(scenario) {
    return Object.freeze({
      id: scenario.id,
      version: scenario.version,
      rubricVersion: scenario.rubricVersion,
      policyVersion: scenario.policyVersion || null,
      difficulty: scenario.difficulty,
      title: scenario.title
    });
  }

  function createScenarioBank(scenarios) {
    var registered = (scenarios || []).slice();
    var byId = Object.create(null);

    registered.forEach(function (scenario) {
      ['id', 'version', 'rubricVersion', 'difficulty', 'title'].forEach(function (field) {
        requireField(scenario, field);
      });
      if (byId[scenario.id]) throw new TypeError('Duplicate scenario id: ' + scenario.id);
      byId[scenario.id] = scenario;
    });

    return Object.freeze({
      list: function (difficulty) {
        return registered.filter(function (scenario) {
          return !difficulty || scenario.difficulty === difficulty;
        }).map(metadata);
      },
      get: function (id) { return byId[id] || null; },
      defaultScenario: function () { return registered[0] || null; }
    });
  }

  return { createScenarioBank: createScenarioBank };
});
