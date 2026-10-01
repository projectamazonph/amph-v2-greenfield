(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SearchTriageCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RUBRIC_VERSION = '1.0.0';

  function action(a, why, alt) {
    return { a: a, why: why, alt: alt || null };
  }

  function expertFor(item, scenario) {
    var safeItem = item || {};
    var metrics = safeItem.m || {};
    var safeScenario = scenario || {};
    var breakEven = safeScenario.margin;
    var term = safeItem.word;
    var acos = typeof metrics.acos === 'number' ? metrics.acos.toFixed(1) : '0.0';
    var clicks = metrics.clicks || 0;
    var orders = metrics.orders || 0;

    switch (safeItem.cls) {
      case 'winner':
        return action(
          'HARVEST',
          "This one's a keeper: relevant shoppers and " + orders +
            ' orders at ' + acos + '% ACOS — comfortably under your ' + breakEven +
            '% break-even. Graduating it to Exact lets you control the bid and let it grow.'
        );
      case 'head':
        return action(
          'KEEP',
          'Good news — it sells! But ' + acos + '% ACOS sits above your ' + breakEven +
            '% break-even, so each order costs you a little. Do not cut it; ease the bid down and check back in 7 days.'
        );
      case 'starved':
        return action(
          'KEEP',
          'Only ' + clicks + ' clicks so far — that is a whisper, not a verdict. Let it run a little longer and gather a fair sample.'
        );
      case 'zero':
        return action(
          'KEEP',
          'The intent is relevant, so zero orders is not an automatic negative. At ' + clicks +
            ' clicks, diagnose the query, listing, price, and offer; keep monitoring or reduce the bid rather than blocking relevant demand.'
        );
      case 'irr':
        return action(
          'NEG_EXACT',
          "This shopper was looking for something you do not sell. You can tell from the words alone — no data needed. A gentle negative exact does it."
        );
      case 'pat':
        return action(
          'NEG_PHRASE',
          'See the word "' + term + '"? It shows up in a whole family of queries you do not want. One phrase negative tidies them all up at once.'
        );
      case 'comp':
        return action(
          'NEG_EXACT',
          "They searched for another brand by name. At this price point that is traffic you cannot win — let it go, no hard feelings."
        );
      case 'trap':
        return action(
          'NEG_EXACT',
          'One order feels encouraging, but the intent does not fit your product. Traffic like this tends to turn into returns — better to close it now, kindly.'
        );
      case 'early':
        return action(
          'KEEP',
          'A first order on only ' + clicks +
            ' clicks is promising but still thin evidence. Keep it running until the conversion signal repeats before harvesting.'
        );
      default:
        throw new TypeError('Unknown Search Term Triage class: ' + safeItem.cls);
    }
  }

  return {
    RUBRIC_VERSION: RUBRIC_VERSION,
    expertFor: expertFor
  };
});

