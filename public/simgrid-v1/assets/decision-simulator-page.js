(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function optionList(options, selected) {
    var html = '<option value="">Choose...</option>';
    Object.keys(options).forEach(function (key) {
      html += '<option value="' + escapeHtml(key) + '"' + (selected === key ? ' selected' : '') + '>' +
        escapeHtml(options[key]) +
      '</option>';
    });
    return html;
  }

  function metricList(metrics) {
    return Object.keys(metrics || {}).map(function (key) {
      return '<span class="ds-metric">' + escapeHtml(key) + ': ' + escapeHtml(metrics[key]) + '</span>';
    }).join('');
  }

  function scenarioOptionList(scenarioBank, selectedId) {
    return scenarioBank.list().map(function (item) {
      var label = item.title + ' · ' + item.difficulty;
      return '<option value="' + escapeHtml(item.id) + '"' + (item.id === selectedId ? ' selected' : '') + '>' +
        escapeHtml(label) +
      '</option>';
    }).join('');
  }

  function readAttempt(storageKey) {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveAttempt(storageKey, attempt) {
    localStorage.setItem(storageKey, JSON.stringify(attempt));
  }

  function collectAttempt(root) {
    var attempt = {};
    root.querySelectorAll('[data-ds-row]').forEach(function (row) {
      var rowId = row.getAttribute('data-ds-row');
      attempt[rowId] = {
        primary: row.querySelector('[data-ds-primary]').value,
        secondary: row.querySelector('[data-ds-secondary]').value
      };
    });
    return attempt;
  }

  function renderFeedback(target, result) {
    target.innerHTML =
      '<h2>Feedback</h2>' +
      '<p class="ds-small">' + escapeHtml(result.summary) + '</p>' +
      '<div class="ds-feedback-list">' +
        result.items.map(function (item) {
          var correct = item.primaryCorrect && item.secondaryCorrect;
          return '<div class="ds-feedback-item ' + (correct ? 'correct' : '') + '">' +
            '<b>' + escapeHtml(item.title) + ' - ' + item.earned + '/' + item.possible + '</b>' +
            '<div class="ds-small">' + escapeHtml(item.feedback) + '</div>' +
            '<div class="ds-small">Evidence: ' + escapeHtml(item.evidence) + '</div>' +
          '</div>';
        }).join('') +
      '</div>';
  }

  function mount(config) {
    var root = document.querySelector(config.root || '[data-ds-root]');
    if (!root) return;

    var scenario = config.scenarioBank
      ? config.scenarioBank.get(config.selectedScenarioId) || config.scenarioBank.defaultScenario()
      : config.scenario;
    if (!scenario) return;
    var storageKey = config.storageKey || ('aph-' + (scenario.simulatorId || scenario.id) + '-' + scenario.id + '-attempt');
    var attempt = readAttempt(storageKey);
    var progressStore = config.progressStore || StudentProgress.createLocalProgressStore();

    root.innerHTML =
      '<div class="ds-page">' +
        '<a class="ds-back" href="index.html">&larr; Back to SimGrid</a>' +
        '<section class="ds-hero">' +
          '<div class="ds-panel ds-brief">' +
            '<div class="ds-kicker">' + escapeHtml(scenario.kicker) + '</div>' +
            '<h1>' + escapeHtml(scenario.title).replace(' ', '<br><em>') + '</em></h1>' +
            '<p>' + escapeHtml(scenario.description) + '</p>' +
            (config.scenarioBank ?
              '<label class="ds-scenario-picker"><span>Practice scenario</span><select data-ds-scenario>' + scenarioOptionList(config.scenarioBank, scenario.id) + '</select></label>' : '') +
          '</div>' +
          '<aside class="ds-panel ds-scorecard">' +
            '<div class="ds-kicker">Score</div>' +
            '<div class="ds-score" data-ds-score>0<span>/100</span></div>' +
            '<div class="ds-status" data-ds-status>Ready</div>' +
            '<div class="ds-small">Choose the best decision and supporting classification for each row. Full credit requires both.</div>' +
          '</aside>' +
        '</section>' +
        '<section class="ds-grid">' +
          '<div class="ds-panel ds-workspace">' +
            '<div class="ds-section-head">' +
              '<h2>Scenario Rows</h2>' +
              '<span class="ds-small">Passing score: ' + escapeHtml(scenario.passingScore) + '</span>' +
            '</div>' +
            '<div class="ds-table-wrap">' +
              '<table class="ds-table">' +
                '<thead><tr><th>Case</th><th>Signal</th><th>Metrics</th><th>' + escapeHtml(scenario.primaryLabel) + '</th><th>' + escapeHtml(scenario.secondaryLabel) + '</th></tr></thead>' +
                '<tbody>' +
                  scenario.rows.map(function (row) {
                    var saved = attempt[row.id] || {};
                    return '<tr data-ds-row="' + escapeHtml(row.id) + '">' +
                      '<td class="ds-title" data-label="Case">' + escapeHtml(row.title) + '</td>' +
                      '<td class="ds-signal" data-label="Signal">' + escapeHtml(row.signal) + '</td>' +
                      '<td data-label="Metrics">' + metricList(row.metrics) + '</td>' +
                      '<td data-label="' + escapeHtml(scenario.primaryLabel) + '"><select class="ds-select" data-ds-primary>' + optionList(scenario.primaryOptions, saved.primary) + '</select></td>' +
                      '<td data-label="' + escapeHtml(scenario.secondaryLabel) + '"><select class="ds-select" data-ds-secondary>' + optionList(scenario.secondaryOptions, saved.secondary) + '</select></td>' +
                    '</tr>';
                  }).join('') +
                '</tbody>' +
              '</table>' +
            '</div>' +
            '<div class="ds-actions">' +
              '<button class="ds-btn" type="button" data-ds-grade>Grade Attempt</button>' +
              '<button class="ds-btn secondary" type="button" data-ds-reset>Reset</button>' +
            '</div>' +
          '</div>' +
          '<aside class="ds-panel ds-sidebar">' +
            '<h2>Rubric</h2>' +
            '<div class="ds-rule"><b>Main decision</b><span>15 points for the right action.</span></div>' +
            '<div class="ds-rule"><b>Classification</b><span>5 points for the right risk, priority, requirement, or stage.</span></div>' +
            '<div class="ds-rule"><b>Judgment bonus</b><span>5 points when both calls match the scenario evidence.</span></div>' +
          '</aside>' +
        '</section>' +
        '<section class="ds-panel ds-feedback" data-ds-feedback>' +
          '<h2>Feedback</h2>' +
          '<p class="ds-small">Grade your attempt to see row-by-row coaching.</p>' +
        '</section>' +
      '</div>';

    function grade() {
      var currentAttempt = collectAttempt(root);
      var result = config.gradeScenarioAttempt
        ? config.gradeScenarioAttempt(scenario.id, currentAttempt)
        : config.gradeAttempt(currentAttempt);
      saveAttempt(storageKey, currentAttempt);
      progressStore.recordAttempt(SimulatorAttempt.buildAttemptRecord({
        scenario: scenario,
        result: result,
        completedAt: (config.now ? config.now() : new Date()).toISOString()
      }));
      root.querySelector('[data-ds-score]').innerHTML = result.score + '<span>/' + result.maxScore + '</span>';
      root.querySelector('[data-ds-status]').textContent = result.passed ? 'Passed' : 'Keep practicing';
      renderFeedback(root.querySelector('[data-ds-feedback]'), result);
    }

    root.querySelector('[data-ds-grade]').addEventListener('click', grade);
    var scenarioSelect = root.querySelector('[data-ds-scenario]');
    if (scenarioSelect) {
      scenarioSelect.addEventListener('change', function () {
        mount(Object.assign({}, config, { selectedScenarioId: scenarioSelect.value }));
      });
    }
    root.querySelector('[data-ds-reset]').addEventListener('click', function () {
      localStorage.removeItem(storageKey);
      mount(config);
    });
  }

  window.DecisionSimulatorPage = {
    mount: mount
  };
})();
