(function () {
  'use strict';
  var core = CampaignArchitectCore, bank = core.CAMPAIGN_ARCHITECT_SCENARIO_BANK, u = SimulatorViewUtils;
  var root = document.querySelector('[data-blueprint]'), store = StudentProgress.createLocalProgressStore();
  var scenario = bank.defaultScenario(), answers = {};
  function key() { return 'aph-campaign-architect-' + scenario.id + '-attempt'; }
  function load() { answers = u.read(key()); }
  function packs() { return bank.list().map(function (x) { return '<option value="' + x.id + '"' + (x.id === scenario.id ? ' selected' : '') + '>' + u.escapeHtml(x.title + ' · ' + x.difficulty) + '</option>'; }).join(''); }
  function risks(selected) { return '<option value="">Risk...</option>' + Object.keys(scenario.secondaryOptions).map(function (x) { return '<option value="' + x + '"' + (x === selected ? ' selected' : '') + '>' + u.escapeHtml(scenario.secondaryOptions[x]) + '</option>'; }).join(''); }
  function selectedRows(action) { return scenario.rows.filter(function (row) { return answers[row.id] && answers[row.id].primary === action; }); }
  function render() {
    var negatives = selectedRows('seed_negatives');
    root.innerHTML = '<div class="sim-page ca-page"><header class="ca-header"><div><a href="index.html">&larr; Back to SimGrid</a><span class="sim-eyebrow">Blueprint canvas</span><h1 class="sim-title">Campaign Architect</h1><p>' + u.escapeHtml(scenario.description) + '</p></div><label><span>Scenario pack</span><select class="sim-select" data-pack>' + packs() + '</select></label></header>' +
      '<div class="ca-layout"><aside class="ca-palette sim-panel"><span class="sim-eyebrow">Building blocks</span><h2>Palette</h2>' + Object.keys(scenario.primaryOptions).map(function (x) { return '<button type="button" class="ca-block sim-choice" data-palette="' + x + '">+ ' + u.escapeHtml(scenario.primaryOptions[x]) + '</button>'; }).join('') + '<p>Select a blueprint node, then add the best block.</p></aside>' +
      '<section class="ca-canvas" aria-label="Campaign hierarchy"><div class="ca-campaign"><span>Campaign</span><strong>' + u.escapeHtml(scenario.title) + '</strong><small>' + u.escapeHtml(scenario.difficulty) + ' pack</small></div><div class="ca-trunk"></div><div class="ca-nodes">' + scenario.rows.map(function (row, i) { var a = answers[row.id] || {}; return '<article class="ca-node sim-panel ' + (a.primary ? 'is-built' : '') + '" tabindex="0" data-node="' + row.id + '"><span class="sim-eyebrow">Ad group ' + (i + 1) + '</span><h2>' + u.escapeHtml(row.title) + '</h2><p>' + u.escapeHtml(row.signal) + '</p><div class="ca-chips">' + Object.keys(row.metrics || {}).map(function (m) { return '<span>' + u.escapeHtml(m) + ': ' + u.escapeHtml(row.metrics[m]) + '</span>'; }).join('') + '</div><div class="ca-choice"><strong>' + (a.primary ? u.escapeHtml(scenario.primaryOptions[a.primary]) : 'Select this node, then add a block') + '</strong><label>Risk<select class="sim-select" data-risk="' + row.id + '">' + risks(a.secondary) + '</select></label></div></article>'; }).join('') + '</div></section>' +
      '<aside class="ca-inspector"><section class="ca-negatives sim-panel"><span class="sim-eyebrow">Negatives tray</span><h2>Prelaunch protection</h2>' + (negatives.length ? negatives.map(function (r) { return '<span class="ca-negative">− ' + u.escapeHtml(r.title) + '</span>'; }).join('') : '<p>No negative blocks added.</p>') + '</section><section class="ca-rules sim-panel"><span class="sim-eyebrow">Review inspector</span><h2>Rule adherence</h2>' + scenario.rows.map(function (r) { var a = answers[r.id] || {}; return '<label><input type="checkbox" disabled ' + (a.primary && a.secondary ? 'checked' : '') + '><span>' + u.escapeHtml(r.title) + '</span></label>'; }).join('') + '<div class="sim-actions"><button class="sim-button" type="button" data-grade>Review blueprint</button><button class="sim-button is-secondary" type="button" data-reset>Clear</button></div><div data-result aria-live="polite"></div></section></aside></div></div>';
    bind();
  }
  function bind() {
    var active = null;
    root.querySelector('[data-pack]').addEventListener('change', function (e) { scenario = bank.get(e.target.value); load(); render(); });
    root.querySelectorAll('[data-node]').forEach(function (node) { function choose() { active = node.dataset.node; root.querySelectorAll('[data-node]').forEach(function (n) { n.classList.toggle('is-active', n === node); }); } node.addEventListener('click', choose); node.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } }); });
    root.querySelectorAll('[data-palette]').forEach(function (button) { button.addEventListener('click', function () { if (!active) { root.querySelector('[data-result]').textContent = 'Select a blueprint node first.'; return; } answers[active] = answers[active] || {}; answers[active].primary = button.dataset.palette; u.write(key(), answers); render(); }); });
    root.querySelectorAll('[data-risk]').forEach(function (select) { select.addEventListener('change', function (e) { e.stopPropagation(); answers[select.dataset.risk] = answers[select.dataset.risk] || {}; answers[select.dataset.risk].secondary = select.value; u.write(key(), answers); render(); }); });
    root.querySelector('[data-grade]').addEventListener('click', function () { var result = core.gradeScenarioAttempt(scenario.id, answers); u.record(store, scenario, result); root.querySelector('[data-result]').innerHTML = '<h3>' + result.score + '/' + result.maxScore + '</h3><p>' + u.escapeHtml(result.summary) + '</p>'; });
    root.querySelector('[data-reset]').addEventListener('click', function () { u.clear(key()); answers = {}; render(); });
  }
  load(); render();
})();
