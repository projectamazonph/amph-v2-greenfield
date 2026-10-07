(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ppc-decision-policy.js'));
  } else {
    root.BidDecisionsCore = factory(root.PpcDecisionPolicy);
  }
})(typeof self !== 'undefined' ? self : this, function (PpcDecisionPolicy) {
  'use strict';

  var ACTIONS = {
    raise_bid: {
      label: 'Raise bid',
      description: 'Increase carefully when volume and efficiency both support it.'
    },
    hold_bid: {
      label: 'Hold bid',
      description: 'Keep the bid steady when the signal is too thin or already balanced.'
    },
    lower_bid: {
      label: 'Lower bid',
      description: 'Reduce pressure when a target converts but misses the efficiency goal.'
    },
    investigate_pause: {
      label: 'Investigate or pause',
      description: 'Stop or investigate spend that has enough clicks but no orders.'
    },
    ask_review: {
      label: 'Ask for review',
      description: 'Escalate when the data conflicts with account goals or constraints.'
    }
  };

  var CONFIDENCE_LEVELS = {
    high: {
      label: 'High confidence'
    },
    medium: {
      label: 'Medium confidence'
    },
    low: {
      label: 'Low confidence'
    }
  };

  var BID_DECISIONS_SCENARIO = {
    id: 'bid-decisions',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    policyVersion: PpcDecisionPolicy.VERSION,
    title: 'Bid Decisions',
    passingScore: 75,
    targetAcos: 35,
    actions: ACTIONS,
    confidenceLevels: CONFIDENCE_LEVELS,
    rows: [
      {
        id: 'exact-winner',
        target: 'lunch box stainless steel exact',
        matchType: 'Exact',
        bid: 1.2,
        clicks: 80,
        spend: 72,
        sales: 240,
        orders: 12,
        expectedAction: 'raise_bid',
        expectedConfidence: 'high',
        evidence: 'ACOS is below target with 12 orders, so the keyword has enough proof to test a controlled bid raise.',
        feedback: 'This target is profitable and has enough orders. Raise carefully so you can buy more good traffic without blowing past target ACOS.'
      },
      {
        id: 'high-acos-converter',
        target: 'kids bento box phrase',
        matchType: 'Phrase',
        bid: 1.45,
        clicks: 95,
        spend: 137.75,
        sales: 180,
        orders: 6,
        expectedAction: 'lower_bid',
        expectedConfidence: 'medium',
        evidence: 'The target has orders, but ACOS is well above the 35% goal, so the right move is proportional pressure reduction.',
        feedback: 'Do not pause a converter too fast. Lower the bid proportionally and review whether the query mix or listing fit is causing the high ACOS.'
      },
      {
        id: 'thin-data-keyword',
        target: 'leakproof snack container broad',
        matchType: 'Broad',
        bid: 0.95,
        clicks: 9,
        spend: 8.55,
        sales: 0,
        orders: 0,
        expectedAction: 'hold_bid',
        expectedConfidence: 'low',
        evidence: 'Only 9 clicks is not enough to prove the keyword is bad or good.',
        feedback: 'This row is thin data. Hold the bid, keep watching search terms, and wait for enough clicks before making a bigger move.'
      },
      {
        id: 'wasted-spend-keyword',
        target: 'plastic lunch bag exact',
        matchType: 'Exact',
        bid: 1.1,
        clicks: 44,
        spend: 48.4,
        sales: 0,
        orders: 0,
        expectedAction: 'investigate_pause',
        expectedConfidence: 'high',
        evidence: 'The target has enough clicks and spend with no orders, so it deserves investigation or a pause.',
        feedback: 'This is wasted spend with enough evidence. Investigate search-term fit, listing fit, and then pause or negate if the mismatch is clear.'
      },
      {
        id: 'seasonal-winner', target: 'school lunch container exact', matchType: 'Exact', bid: 1.05,
        clicks: 62, spend: 49.6, sales: 248, orders: 16, expectedAction: 'raise_bid', expectedConfidence: 'high',
        evidence: 'The term has strong order volume and ACOS is comfortably below target during a demand window.',
        feedback: 'This is proven profitable demand. Raise in a controlled step, then watch budget and placement performance during the seasonal window.'
      },
      {
        id: 'expensive-but-relevant', target: 'insulated lunch tote phrase', matchType: 'Phrase', bid: 1.3,
        clicks: 38, spend: 49.4, sales: 98.8, orders: 3, expectedAction: 'lower_bid', expectedConfidence: 'medium',
        evidence: 'There are conversions, but 50% ACOS is materially above the 35% target and the sample is not yet large.',
        feedback: 'Keep the relevant demand alive, but lower the bid and inspect the search-term mix before deciding whether the phrase deserves more budget.'
      },
      {
        id: 'new-profitable-exact', target: 'stainless water bottle exact', matchType: 'Exact', bid: 0.85,
        clicks: 45, spend: 38.25, sales: 135, orders: 9, expectedAction: 'raise_bid', expectedConfidence: 'medium',
        evidence: 'ACOS is 28.3% with 9 orders from 45 clicks. The keyword is profitable with room to grow.',
        feedback: 'This is a proven winner with efficient spend. Consider a modest bid increase to capture more volume while monitoring ACOS.'
      },
      {
        id: 'low-volume-broad', target: 'kids insulated lunch bag broad', matchType: 'Broad', bid: 0.75,
        clicks: 12, spend: 9, sales: 0, orders: 0, expectedAction: 'hold_bid', expectedConfidence: 'low',
        evidence: 'Only 12 clicks with no conversions. The data is insufficient to make a confident bid decision.',
        feedback: 'This needs more data. Hold the bid and wait for at least 30-50 clicks before deciding whether to raise, lower, or pause.'
      }
    ]
  };

  var BID_DECISIONS_BEGINNER_SCENARIO = {
    id: 'bid-decisions-beginner',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    policyVersion: PpcDecisionPolicy.VERSION,
    title: 'Bid Decisions - Beginner',
    difficulty: 'beginner',
    passingScore: 75,
    targetAcos: 35,
    actions: ACTIONS,
    confidenceLevels: CONFIDENCE_LEVELS,
    rows: [
      {
        id: 'simple-winner-exact',
        target: 'water bottle',
        matchType: 'Exact',
        bid: 1.0,
        clicks: 100,
        spend: 80,
        sales: 320,
        orders: 20,
        expectedAction: 'raise_bid',
        expectedConfidence: 'high',
        evidence: 'ACOS is 25% with 20 orders from 100 clicks. Strong conversion rate and profitable ACOS.',
        feedback: 'This is a clear winner. Raise the bid to capture more of this high-quality traffic while keeping an eye on ACOS.'
      },
      {
        id: 'high-spend-no-sales',
        target: 'cheap lunch box',
        matchType: 'Broad',
        bid: 0.9,
        clicks: 50,
        spend: 45,
        sales: 0,
        orders: 0,
        expectedAction: 'investigate_pause',
        expectedConfidence: 'high',
        evidence: '50 clicks with $45 spend and zero orders. This is wasted spend that needs immediate attention.',
        feedback: 'This keyword has enough clicks to prove it is not working. Investigate the search terms or pause the keyword to stop the bleed.'
      },
      {
        id: 'moderate-acos-phrase',
        target: 'school lunch bag',
        matchType: 'Phrase',
        bid: 1.2,
        clicks: 70,
        spend: 84,
        sales: 210,
        orders: 10,
        expectedAction: 'lower_bid',
        expectedConfidence: 'medium',
        evidence: 'ACOS is 40% with 10 orders. Above the 35% target, so pressure reduction is needed.',
        feedback: 'This is converting but above target ACOS. Lower the bid to improve efficiency while maintaining some volume.'
      },
      {
        id: 'thin-data-new',
        target: 'insulated container',
        matchType: 'Broad',
        bid: 0.8,
        clicks: 15,
        spend: 12,
        sales: 0,
        orders: 0,
        expectedAction: 'hold_bid',
        expectedConfidence: 'low',
        evidence: 'Only 15 clicks is not enough to determine if this keyword is good or bad.',
        feedback: 'This needs more data. Hold the bid and wait for more clicks before making any changes.'
      },
      {
        id: 'strong-performer-exact',
        target: 'stainless steel bottle',
        matchType: 'Exact',
        bid: 1.1,
        clicks: 85,
        spend: 76.5,
        sales: 340,
        orders: 24,
        expectedAction: 'raise_bid',
        expectedConfidence: 'high',
        evidence: 'ACOS is 22.5% with 24 orders. Excellent performance with room for more volume.',
        feedback: 'This is a strong performer. Raise the bid carefully to capture more of this efficient, high-converting traffic.'
      },
      {
        id: 'borderline-converter',
        target: 'lunch container set',
        matchType: 'Phrase',
        bid: 1.0,
        clicks: 40,
        spend: 40,
        sales: 100,
        orders: 5,
        expectedAction: 'lower_bid',
        expectedConfidence: 'medium',
        evidence: 'ACOS is 40% with only 5 orders. Above target and needs efficiency improvement.',
        feedback: 'This is converting but at 40% ACOS, it is above your target. Lower the bid to reduce ACOS while keeping the keyword active.'
      },
      {
        id: 'no-data-yet',
        target: 'kids drink bottle',
        matchType: 'Broad',
        bid: 0.7,
        clicks: 8,
        spend: 5.6,
        sales: 0,
        orders: 0,
        expectedAction: 'hold_bid',
        expectedConfidence: 'low',
        evidence: 'Only 8 clicks with no conversions. Insufficient data to make a confident decision.',
        feedback: 'Not enough data yet. Hold the bid and collect more information before taking action.'
      },
      {
        id: 'high-volume-winner',
        target: 'reusable water bottle',
        matchType: 'Exact',
        bid: 0.95,
        clicks: 120,
        spend: 96,
        sales: 480,
        orders: 30,
        expectedAction: 'raise_bid',
        expectedConfidence: 'high',
        evidence: 'ACOS is 20% with 30 orders from 120 clicks. Exceptional performance worth scaling.',
        feedback: 'This is an outstanding performer with low ACOS and high order volume. Raise the bid to capture more of this valuable traffic.'
      }
    ]
  };

  var POLICY_TO_SIMULATOR_ACTION = {
    raise_10_percent: 'raise_bid',
    lower_15_percent: 'lower_bid',
    hold: 'hold_bid',
    investigate_or_pause: 'investigate_pause'
  };

  BID_DECISIONS_SCENARIO.rows.forEach(function (row) {
    var acos = row.sales ? (row.spend / row.sales) * 100 : 0;
    var policyAction = PpcDecisionPolicy.recommendBidAction({
      clicks: row.clicks,
      orders: row.orders,
      acos: acos,
      targetAcos: BID_DECISIONS_SCENARIO.targetAcos
    });
    row.expectedAction = POLICY_TO_SIMULATOR_ACTION[policyAction];
  });

  BID_DECISIONS_BEGINNER_SCENARIO.rows.forEach(function (row) {
    var acos = row.sales ? (row.spend / row.sales) * 100 : 0;
    var policyAction = PpcDecisionPolicy.recommendBidAction({
      clicks: row.clicks,
      orders: row.orders,
      acos: acos,
      targetAcos: BID_DECISIONS_BEGINNER_SCENARIO.targetAcos
    });
    row.expectedAction = POLICY_TO_SIMULATOR_ACTION[policyAction];
  });

  function round(value, digits) {
    var factor = Math.pow(10, digits || 2);
    return Math.round(value * factor) / factor;
  }

  function safeDivide(numerator, denominator) {
    if (!denominator) return 0;
    return numerator / denominator;
  }

  function calculateBidMetrics(row) {
    return {
      cpc: round(safeDivide(row.spend, row.clicks), 2),
      conversionRate: round(safeDivide(row.orders, row.clicks) * 100, 2),
      acos: row.sales ? round(safeDivide(row.spend, row.sales) * 100, 2) : 0,
      roas: round(safeDivide(row.sales, row.spend), 2),
      costPerOrder: round(safeDivide(row.spend, row.orders), 2)
    };
  }

  function gradeRow(row, answer) {
    var safeAnswer = answer || {};
    var actionCorrect = safeAnswer.action === row.expectedAction;
    var confidenceCorrect = safeAnswer.confidence === row.expectedConfidence;
    var earned = 0;

    if (actionCorrect) earned += 15;
    if (confidenceCorrect) earned += 5;
    if (actionCorrect && confidenceCorrect) earned += 5;

    return {
      rowId: row.id,
      target: row.target,
      earned: earned,
      possible: 25,
      actionCorrect: actionCorrect,
      confidenceCorrect: confidenceCorrect,
      expectedAction: row.expectedAction,
      expectedConfidence: row.expectedConfidence,
      selectedAction: safeAnswer.action || '',
      selectedConfidence: safeAnswer.confidence || '',
      metrics: calculateBidMetrics(row),
      evidence: row.evidence,
      feedback: row.feedback
    };
  }

  function summarize(score, passingScore) {
    if (score >= 90) {
      return 'Strong bid judgment. You matched action size to evidence quality and account risk.';
    }
    if (score >= passingScore) {
      return 'Good bid judgment. Review the missed rows and tighten how confidence changes the action.';
    }
    return 'Keep practicing bid decisions. Separate proven winners, expensive converters, thin data, and wasted spend before changing bids.';
  }

  function gradeAttempt(scenario, attempt) {
    var activeScenario = scenario || BID_DECISIONS_SCENARIO;
    var safeAttempt = attempt || {};
    var items = activeScenario.rows.map(function (row) {
      return gradeRow(row, safeAttempt[row.id]);
    });
    var score = items.reduce(function (sum, item) {
      return sum + item.earned;
    }, 0);
    var maxScore = items.reduce(function (sum, item) {
      return sum + item.possible;
    }, 0);
    var correctDecisions = items.filter(function (item) {
      return item.actionCorrect && item.confidenceCorrect;
    }).length;
    var passingScore = activeScenario.passingScore || 75;

    return {
      score: score,
      maxScore: maxScore,
      correctDecisions: correctDecisions,
      totalDecisions: items.length,
      passed: score >= passingScore,
      summary: summarize(score, passingScore),
      items: items
    };
  }

  return {
    BID_DECISIONS_SCENARIO: BID_DECISIONS_SCENARIO,
    BID_DECISIONS_BEGINNER_SCENARIO: BID_DECISIONS_BEGINNER_SCENARIO,
    ACTIONS: ACTIONS,
    CONFIDENCE_LEVELS: CONFIDENCE_LEVELS,
    calculateBidMetrics: calculateBidMetrics,
    gradeAttempt: gradeAttempt
  };
});
