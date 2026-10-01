(function () {
  'use strict';
  var core = AccountAuditCore;
  var bank = core.ACCOUNT_AUDIT_SCENARIO_BANK;
  var utils = SimulatorViewUtils;
  var root = document.querySelector('[data-audit-sweep]');
  var store = StudentProgress.createLocalProgressStore();
  var scenario = bank.defaultScenario();
  var opened = {};
  var bucketNames = {
    cut_waste: 'Wasted spend', scale_budget: 'Scaling opportunity', ask_client: 'Tracking issue',
    audit_listing: 'Retail-readiness problem', monitor: 'Insufficient data'
  };
  var zoneNames = ['Campaigns', 'Budget & scale', 'Listings & offer', 'Attribution / tracking'];
  var answers = {};

  function storageKey() { return 'aph-account-audit-' + scenario.id + '-attempt'; }
  function load() { answers = utils.read(storageKey()); }
  function optionList(options, selected) {
    return '<option value="">Choose priority...</option>' + Object.keys(options).map(function (key) {
      return '<option value="' + key + '"' + (selected === key ? ' selected' : '') + '>' + utils.escapeHtml(options[key]) + '</option>';
    }).join('');
  }
  function scenarioOptions() {
    return bank.list().map(function (item) { return '<option value="' + item.id + '"' + (item.id === scenario.id ? ' selected' : '') + '>' + utils.escapeHtml(item.title + ' · ' + item.difficulty) + '</option>'; }).join('');
  }
  function clipboard() {
    var groups = {};
    scenario.rows.forEach(function (row) {
      var answer = answers[row.id];
      if (!answer || !answer.primary) return;
      (groups[answer.primary] = groups[answer.primary] || []).push(row.title);
    });
    return Object.keys(bucketNames).map(function (key) {
      var items = groups[key] || [];
      return '<section class="aa-clip-group"><h3>' + bucketNames[key] + '<span>' + items.length + '</span></h3>' +
        (items.length ? '<ul>' + items.map(function (item) { return '<li>' + utils.escapeHtml(item) + '</li>'; }).join('') + '</ul>' : '<p>Nothing flagged</p>') + '</section>';
    }).join('');
  }
  function render() {
    var completed = scenario.rows.filter(function (row) { var a = answers[row.id]; return a && a.primary && a.secondary; }).length;
    root.innerHTML = '<div class="sim-page aa-page"><header class="aa-header"><div><a href="index.html">&larr; Back to SimGrid</a><div class="sim-eyebrow">Diagnostic sweep</div><h1 class="sim-title">Account Audit</h1><p>' + utils.escapeHtml(scenario.description) + '</p></div>' +
      '<label class="aa-pack"><span>Scenario pack</span><select class="sim-select" data-pack>' + scenarioOptions() + '</select></label></header>' +
      '<div class="aa-progress" aria-live="polite"><span style="width:' + ((completed / scenario.rows.length) * 100) + '%"></span><strong>' + completed + '/' + scenario.rows.length + ' findings classified</strong></div>' +
      '<div class="aa-layout"><section class="aa-sweep" aria-label="Inspectable account zones"><div class="aa-zone-grid">' + scenario.rows.map(function (row, index) {
        var answer = answers[row.id] || {};
        return '<article class="aa-zone sim-panel ' + (opened[row.id] ? 'is-open' : '') + '"><button type="button" class="aa-zone-trigger" data-open="' + row.id + '" aria-expanded="' + Boolean(opened[row.id]) + '"><span class="sim-eyebrow">Zone ' + (index + 1) + '</span><strong>' + zoneNames[index % zoneNames.length] + '</strong><small>' + utils.escapeHtml(row.title) + '</small></button>' +
          (opened[row.id] ? '<div class="aa-symptom"><p>' + utils.escapeHtml(row.signal) + '</p><div class="aa-metrics">' + Object.keys(row.metrics || {}).map(function (key) { return '<span><b>' + utils.escapeHtml(key) + '</b>' + utils.escapeHtml(row.metrics[key]) + '</span>'; }).join('') + '</div><fieldset><legend>Flag diagnosis</legend><div class="aa-buckets" data-buckets="' + row.id + '">' + Object.keys(bucketNames).map(function (key) { return '<button type="button" class="aa-bucket sim-choice ' + (answer.primary === key ? 'is-selected' : '') + '" data-value="' + key + '" aria-pressed="' + (answer.primary === key) + '">' + bucketNames[key] + '</button>'; }).join('') + '</div></fieldset><label class="aa-priority"><span>Impact priority</span><select class="sim-select" data-priority="' + row.id + '">' + optionList(scenario.secondaryOptions, answer.secondary) + '</select></label></div>' : '') + '</article>';
      }).join('') + '</div></section><aside class="aa-clipboard sim-panel"><div class="aa-clipboard-head"><span class="sim-eyebrow">Findings clipboard</span><h2>Diagnosis summary</h2></div><div data-clipboard>' + clipboard() + '</div><div class="sim-actions"><button type="button" class="sim-button" data-conclude>Conclude audit</button><button type="button" class="sim-button is-secondary" data-reset>Reset</button></div><div class="aa-result" data-result aria-live="polite"></div></aside></div></div>';
    bind();
  }
  function bind() {
    root.querySelector('[data-pack]').addEventListener('change', function (event) { scenario = bank.get(event.target.value); opened = {}; load(); render(); });
    root.querySelectorAll('[data-open]').forEach(function (button) { button.addEventListener('click', function () { opened[button.dataset.open] = !opened[button.dataset.open]; render(); }); });
    root.querySelectorAll('[data-buckets]').forEach(function (container) { container.addEventListener('click', function (event) { var button = event.target.closest('[data-value]'); if (!button) return; var id = container.dataset.buckets; answers[id] = answers[id] || {}; answers[id].primary = button.dataset.value; utils.write(storageKey(), answers); render(); }); });
    root.querySelectorAll('[data-priority]').forEach(function (select) { select.addEventListener('change', function () { var id = select.dataset.priority; answers[id] = answers[id] || {}; answers[id].secondary = select.value; utils.write(storageKey(), answers); render(); }); });
    root.querySelector('[data-conclude]').addEventListener('click', function () { var result = core.gradeScenarioAttempt(scenario.id, answers); utils.record(store, scenario, result); root.querySelector('[data-result]').innerHTML = '<h3>' + result.score + '/' + result.maxScore + ' · ' + (result.passed ? 'Audit passed' : 'Keep sweeping') + '</h3><p>' + utils.escapeHtml(result.summary) + '</p>'; });
    root.querySelector('[data-reset]').addEventListener('click', function () { utils.clear(storageKey()); answers = {}; opened = {}; render(); });
  }
  load(); render();
})();
