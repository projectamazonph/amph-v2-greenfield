(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProgressPresentation = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function describe(progress) {
    if (!progress || progress.status === 'not_started') {
      return { label: 'Not started', detail: 'No attempts yet', tone: 'neutral' };
    }

    var attemptWord = progress.attemptCount === 1 ? 'attempt' : 'attempts';
    return {
      label: progress.status === 'passed' ? 'Passed' : 'In progress',
      detail: 'Best ' + progress.bestScore + '% · ' + progress.attemptCount + ' ' + attemptWord,
      tone: progress.status === 'passed' ? 'success' : 'warning'
    };
  }

  return { describe: describe };
});
