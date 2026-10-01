(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CurriculumManifest = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIMULATORS = [
    { id: 'ad-console', title: 'AdConsole Pro', file: 'ad-console.html', passingScore: 75 },
    { id: 'keyword-lab', title: 'Keyword Lab', file: 'keyword-lab.html', passingScore: 75 },
    { id: 'search-triage', title: 'Search Term Triage', file: 'search-triage.html', passingScore: 75 },
    { id: 'sqp-studio', title: 'SQP Studio', file: 'sqp-studio.html', passingScore: 75 },
    { id: 'bid-decisions', title: 'Bid Decisions', file: 'bid-decisions.html', passingScore: 75 },
    { id: 'campaign-architect', title: 'Campaign Architect', file: 'campaign-architect.html', passingScore: 75 },
    { id: 'account-audit', title: 'Account Audit', file: 'account-audit.html', passingScore: 75 },
    { id: 'client-onboarding', title: 'Client Onboarding', file: 'client-onboarding.html', passingScore: 75 },
    { id: 'capstone-sequence', title: 'Capstone', file: 'capstone-sequence.html', passingScore: 85 },
    { id: 'bulk-file', title: 'Bulk File Simulator', file: 'bulk-file.html', passingScore: 75 },
    { id: 'listing', title: 'BuyBox Dojo', file: 'listing.html', passingScore: 75 },
    { id: 'pacing-deck', title: 'Pacing Deck', file: 'pacing-deck.html', passingScore: 75 }
  ];

  function assignment(simulatorId, minimumScore, required) {
    return {
      simulatorId: simulatorId,
      minimumScore: minimumScore,
      required: required !== false
    };
  }

  var MODULES = [
    { id: 'm0', title: 'Amazon Advertising Foundations', practice: [assignment('listing', 75)] },
    { id: 'm1', title: 'PPC Language, Metrics, and Math', practice: [assignment('keyword-lab', 75)] },
    {
      id: 'm2',
      title: 'Campaign Structure and Naming',
      practice: [assignment('campaign-architect', 75)]
    },
    {
      id: 'm3',
      title: 'Keyword Research and Search Intent',
      practice: [assignment('keyword-lab', 75), assignment('search-triage', 75)]
    },
    {
      id: 'm4',
      title: 'Automatic Targeting',
      practice: [assignment('ad-console', 75), assignment('listing', 75)]
    },
    {
      id: 'm5',
      title: 'Manual Keyword Targeting',
      practice: [assignment('ad-console', 75), assignment('search-triage', 75)]
    },
    {
      id: 'm6',
      title: 'Product Targeting',
      practice: [assignment('ad-console', 75), assignment('campaign-architect', 75)]
    },
    {
      id: 'm7',
      title: 'Bidding, Placements, and Budgets',
      practice: [assignment('bid-decisions', 75), assignment('pacing-deck', 75)]
    },
    {
      id: 'm8',
      title: 'Search-Term Analysis and Negatives',
      practice: [assignment('search-triage', 75), assignment('bulk-file', 75)]
    },
    {
      id: 'm9',
      title: 'Performance Diagnosis',
      practice: [assignment('account-audit', 75), assignment('search-triage', 75)]
    },
    {
      id: 'm10',
      title: 'Optimization, Scaling, and Operating Rhythm',
      practice: [assignment('account-audit', 75), assignment('ad-console', 75)]
    },
    {
      id: 'm11',
      title: 'Reporting, Strategy, and Capstone',
      practice: [assignment('client-onboarding', 75), assignment('capstone-sequence', 85)]
    }
  ];

  function findById(items, id) {
    return items.find(function (item) {
      return item.id === id;
    });
  }

  function duplicateErrors(items, label) {
    var seen = {};
    var errors = [];

    items.forEach(function (item) {
      if (seen[item.id]) {
        errors.push('Duplicate ' + label + ' id: ' + item.id);
      }
      seen[item.id] = true;
    });

    return errors;
  }

  function validateManifest(manifest) {
    var activeManifest = manifest || { simulators: SIMULATORS, modules: MODULES };
    var simulators = activeManifest.simulators || [];
    var modules = activeManifest.modules || [];
    var errors = duplicateErrors(simulators, 'simulator').concat(duplicateErrors(modules, 'module'));
    var simulatorIds = {};

    simulators.forEach(function (simulator) {
      simulatorIds[simulator.id] = true;
    });

    modules.forEach(function (module) {
      (module.practice || []).forEach(function (practice) {
        if (!simulatorIds[practice.simulatorId]) {
          errors.push('Module ' + module.id + ' references unknown simulator: ' + practice.simulatorId);
        }
      });
    });

    return errors;
  }

  return {
    MODULES: MODULES,
    SIMULATORS: SIMULATORS,
    getModule: function (id) { return findById(MODULES, id); },
    getSimulator: function (id) { return findById(SIMULATORS, id); },
    validateManifest: validateManifest
  };
});
