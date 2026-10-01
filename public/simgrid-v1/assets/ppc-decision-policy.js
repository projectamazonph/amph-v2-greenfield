(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PpcDecisionPolicy = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = '1.0.0';

  function evidenceBand(clicks) {
    if (clicks < 10) return 'thin';
    if (clicks < 20) return 'emerging';
    if (clicks < 40) return 'decision_ready';
    return 'confident';
  }

  function recommendSearchTermAction(signal) {
    if (signal.relevance === 'irrelevant') {
      return signal.scope === 'repeated_theme' ? 'negative_phrase' : 'negative_exact';
    }
    if (signal.orders > 0) {
      return signal.clicks >= 20 ? 'harvest_exact' : 'hold';
    }
    if (signal.clicks < 20) return 'watch';
    if (signal.clicks < 40) return 'diagnose_listing_and_offer';
    return 'lower_bid_or_pause_target';
  }

  function recommendBidAction(signal) {
    if (signal.orders === 0) {
      return signal.clicks >= 40 ? 'investigate_or_pause' : 'hold';
    }
    if (signal.acos > signal.targetAcos) return 'lower_15_percent';
    if (signal.clicks >= 20 && signal.orders >= 3) return 'raise_10_percent';
    return 'hold';
  }

  function recommendBudgetAction(signal) {
    if (!signal.budgetCapped) return 'hold';
    if (signal.acos > signal.targetAcos) return 'fix_efficiency_first';
    if (signal.orders >= 3) return 'raise_10_to_20_percent';
    return 'hold';
  }

  return {
    VERSION: VERSION,
    evidenceBand: evidenceBand,
    recommendSearchTermAction: recommendSearchTermAction,
    recommendBidAction: recommendBidAction,
    recommendBudgetAction: recommendBudgetAction
  };
});
