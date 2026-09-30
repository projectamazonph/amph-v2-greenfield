(function (root) {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function read(storageKey) {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    catch (error) { return {}; }
  }

  function write(storageKey, value) {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }

  function clear(storageKey) { localStorage.removeItem(storageKey); }

  function record(progressStore, scenario, result) {
    progressStore.recordAttempt(SimulatorAttempt.buildAttemptRecord({
      scenario: scenario,
      result: result,
      completedAt: new Date().toISOString()
    }));
  }

  function optionButtons(options, selected, name, className) {
    return Object.keys(options).map(function (key) {
      var option = options[key];
      var label = typeof option === 'string' ? option : option.label;
      return '<button type="button" class="' + className + (selected === key ? ' is-selected' : '') +
        '" data-value="' + escapeHtml(key) + '" aria-pressed="' + (selected === key) +
        '" name="' + escapeHtml(name) + '">' + escapeHtml(label) + '</button>';
    }).join('');
  }

  root.SimulatorViewUtils = {
    clear: clear,
    escapeHtml: escapeHtml,
    optionButtons: optionButtons,
    read: read,
    record: record,
    write: write
  };
})(typeof self !== 'undefined' ? self : this);
