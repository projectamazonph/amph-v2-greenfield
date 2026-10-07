(function () {
  'use strict';
  var core = BidDecisionsCore;
  var scenario = core.BID_DECISIONS_SCENARIO;
  var utils = SimulatorViewUtils;
  var root = document.querySelector('[data-bid-cockpit]');
  var store = StudentProgress.createLocalProgressStore();
  var storageKey = 'aph-bid-decisions-attempt';
  var answers = utils.read(storageKey);
  var round = 0;
  var lastResult = null;

  function evidenceLevel(clicks) {
    if (clicks < 15) return { key: 'low', label: 'Low', width: 28 };
    if (clicks < 50) return { key: 'medium', label: 'Medium', width: 62 };
    return { key: 'high', label: 'High', width: 100 };
  }

  function render() {
    var row = scenario.rows[round];
    var metrics = core.calculateBidMetrics(row);
    var evidence = evidenceLevel(row.clicks);
    var answer = answers[row.id] || {};
    var result = core.gradeAttempt(scenario, answers);
    var acosState = metrics.acos === 0 ? 'No sales' : (metrics.acos > scenario.targetAcos ? 'Above target' : 'Below target');
    root.innerHTML = '<div class="sim-page bd-cockpit">' +
      '<a class="bd-back" href="index.html">&larr; Back to SimGrid</a>' +
      '<header class="bd-commandbar"><div><div class="sim-eyebrow">Decision cockpit</div><h1 class="sim-title">Bid Decisions</h1><p>Make one controlled call at a time. Evidence strength determines how confidently you can act.</p></div>' +
      '<div class="bd-run" aria-live="polite"><span>Round ' + (round + 1) + '/' + scenario.rows.length + '</span><strong class="sim-score">' + result.score + '/' + result.maxScore + '</strong><small>running score</small></div></header>' +
      '<section class="bd-instrument sim-panel" aria-labelledby="bd-keyword"><div class="bd-targetline"><div><span class="sim-eyebrow">Keyword under review</span><h2 id="bd-keyword">' + utils.escapeHtml(row.target) + '</h2></div><span class="bd-match">' + utils.escapeHtml(row.matchType) + '</span></div>' +
      '<div class="bd-readouts"><article class="bd-readout ' + (metrics.acos > scenario.targetAcos ? 'is-alert' : 'is-good') + '"><span>ACOS</span><strong>' + metrics.acos + '%</strong><small>' + acosState + ' · target ' + scenario.targetAcos + '%</small></article>' +
      '<article class="bd-readout"><span>ROAS</span><strong>' + metrics.roas + 'x</strong><small>revenue / spend</small></article><article class="bd-readout"><span>CPC</span><strong>$' + metrics.cpc.toFixed(2) + '</strong><small>bid $' + row.bid.toFixed(2) + '</small></article><article class="bd-readout"><span>CVR</span><strong>' + metrics.conversionRate + '%</strong><small>' + row.orders + ' orders</small></article></div>' +
      '<div class="bd-evidence" data-level="' + evidence.key + '"><div><span class="sim-eyebrow">Evidence confidence</span><strong>' + evidence.label + '</strong><small>' + row.clicks + ' clicks in the 7-day window</small></div><div class="bd-meter" role="meter" aria-label="Evidence confidence" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + evidence.width + '"><span style="width:' + evidence.width + '%"></span></div></div></section>' +
      '<section class="bd-actions-zone" aria-labelledby="bd-call"><div class="bd-action-heading"><div><span class="sim-eyebrow">Your call</span><h2 id="bd-call">Choose an action</h2></div><p>Actions are separated to slow down reflex clicks.</p></div><div class="bd-action-grid" data-actions>' + utils.optionButtons(scenario.actions, answer.action, 'bid-action', 'bd-action sim-choice') + '</div>' +
      '<div class="bd-confidence"><span class="sim-eyebrow">State your confidence</span><div data-confidence>' + utils.optionButtons(scenario.confidenceLevels, answer.confidence, 'bid-confidence', 'bd-confidence-choice sim-choice') + '</div></div></section>' +
      '<section class="bd-feedback sim-panel" aria-live="polite" aria-atomic="true">' + (lastResult ? '<div class="bd-verdict ' + (lastResult.actionCorrect && lastResult.confidenceCorrect ? 'is-correct' : '') + '"><span class="sim-eyebrow">Round feedback</span><h2>' + (lastResult.actionCorrect && lastResult.confidenceCorrect ? 'Correct call' : 'Review the evidence') + '</h2><p>' + utils.escapeHtml(lastResult.feedback) + '</p><small>' + utils.escapeHtml(lastResult.evidence) + '</small></div>' : '<p class="sim-muted">Choose both an action and confidence level to lock this call.</p>') +
      '<div class="sim-actions"><button class="sim-button" type="button" data-lock>Lock decision</button><button class="sim-button is-secondary" type="button" data-next ' + (!lastResult ? 'disabled' : '') + '>' + (round === scenario.rows.length - 1 ? 'Finish attempt' : 'Next round') + '</button><button class="sim-button is-secondary" type="button" data-reset>Reset run</button></div></section></div>';
    bind(row);
  }

  function select(container, key, row) {
    container.addEventListener('click', function (event) {
      var button = event.target.closest('[data-value]');
      if (!button) return;
      answers[row.id] = answers[row.id] || {};
      answers[row.id][key] = button.dataset.value;
      utils.write(storageKey, answers);
      Array.prototype.forEach.call(container.querySelectorAll('[data-value]'), function (item) {
        var selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', selected);
      });
    });
  }

  function bind(row) {
    select(root.querySelector('[data-actions]'), 'action', row);
    select(root.querySelector('[data-confidence]'), 'confidence', row);
    root.querySelector('[data-lock]').addEventListener('click', function () {
      var answer = answers[row.id] || {};
      if (!answer.action || !answer.confidence) {
        root.querySelector('.bd-feedback > p').textContent = 'Choose an action and confidence level before locking the decision.';
        return;
      }
      lastResult = core.gradeAttempt(scenario, answers).items[round];
      render();
    });
    root.querySelector('[data-next]').addEventListener('click', function () {
      if (!lastResult) return;
      if (round < scenario.rows.length - 1) { round += 1; lastResult = null; render(); return; }
      var result = core.gradeAttempt(scenario, answers);
      utils.record(store, scenario, result);
      root.querySelector('.bd-feedback').innerHTML = '<div class="bd-verdict is-correct"><span class="sim-eyebrow">Attempt complete</span><h2>' + result.score + '/' + result.maxScore + '</h2><p>' + utils.escapeHtml(result.summary) + '</p></div><div class="sim-actions"><button class="sim-button" type="button" data-reset>Start another run</button></div>';
      root.querySelector('[data-reset]').addEventListener('click', reset);
    });
    root.querySelector('[data-reset]').addEventListener('click', reset);
  }
  function reset() { answers = {}; round = 0; lastResult = null; utils.clear(storageKey); render(); }
  render();
})();
