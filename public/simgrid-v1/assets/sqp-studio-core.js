(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SQPStudioCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIAGNOSES = {
    scale_visibility: {
      label: 'Scale visibility',
      shortLabel: 'Scale',
      description: 'Conversion is strong, but brand impression share is still low.'
    },
    fix_listing_conversion: {
      label: 'Fix listing conversion',
      shortLabel: 'Fix PDP',
      description: 'Traffic exists, but the query is leaking shoppers before purchase.'
    },
    watch_data_limit: {
      label: 'Watch data limit',
      shortLabel: 'Watch',
      description: 'The signal is too thin to prove a confident action yet.'
    },
    reduce_waste: {
      label: 'Reduce waste',
      shortLabel: 'Tighten',
      description: 'Visibility exists, but purchase share does not justify current exposure.'
    }
  };

  var FOLLOW_UPS = {
    increase_coverage: {
      label: 'Expand campaign coverage',
      description: 'Increase exact/phrase coverage and check placement or budget limits.'
    },
    audit_pdp: {
      label: 'Audit PDP and offer',
      description: 'Review main image, price, coupon, reviews, and title/query fit.'
    },
    collect_more_data: {
      label: 'Collect more data',
      description: 'Wait for more impressions/clicks before changing bids or structure.'
    },
    tighten_targeting: {
      label: 'Tighten targeting',
      description: 'Reduce weak exposure with bid cuts, negatives, or cleaner match types.'
    }
  };

  var SQP_STUDIO_SCENARIO = {
    id: 'sqp-studio',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    title: 'SQP Studio',
    passingScore: 75,
    diagnoses: DIAGNOSES,
    followUps: FOLLOW_UPS,
    queries: [
      {
        id: 'stainless-lunch-box',
        query: 'stainless lunch box',
        queryVolume: 12000,
        marketPurchases: 420,
        brandImpressions: 960,
        brandClicks: 110,
        brandCartAdds: 28,
        brandPurchases: 18,
        expectedDiagnosis: 'scale_visibility',
        expectedFollowUp: 'increase_coverage',
        evidence: 'Your purchase rate is far above the market rate while impression share is only 8%. Visibility is the constraint, not conversion.',
        feedback: 'Visibility is the constraint: this query converts well when shoppers reach you, so the next move is controlled coverage expansion.'
      },
      {
        id: 'kids-bento-box-leakproof',
        query: 'kids bento box leakproof',
        queryVolume: 9800,
        marketPurchases: 360,
        brandImpressions: 1764,
        brandClicks: 190,
        brandCartAdds: 24,
        brandPurchases: 5,
        expectedDiagnosis: 'fix_listing_conversion',
        expectedFollowUp: 'audit_pdp',
        evidence: 'Brand visibility and clicks are present, but only 5 purchases from 190 clicks points to PDP or offer friction.',
        feedback: 'Traffic is not the biggest gap here. Diagnose the listing, offer, reviews, image, and query fit before scaling.'
      },
      {
        id: 'insulated-food-jar',
        query: 'insulated food jar',
        queryVolume: 6400,
        marketPurchases: 210,
        brandImpressions: 128,
        brandClicks: 7,
        brandCartAdds: 1,
        brandPurchases: 1,
        expectedDiagnosis: 'watch_data_limit',
        expectedFollowUp: 'collect_more_data',
        evidence: 'The row has only 7 clicks and 1 purchase. That can hint, but it cannot prove a confident optimization.',
        feedback: 'There is not enough brand-side data yet. Keep the query on watch and collect more clicks before making a structural move.'
      },
      {
        id: 'bento-accessories',
        query: 'bento accessories',
        queryVolume: 8500,
        marketPurchases: 260,
        brandImpressions: 1445,
        brandClicks: 82,
        brandCartAdds: 6,
        brandPurchases: 1,
        expectedDiagnosis: 'reduce_waste',
        expectedFollowUp: 'tighten_targeting',
        evidence: 'The query is getting exposure, but purchase share and purchase rate are weak against the market.',
        feedback: 'This is weak exposure. Tighten targeting or reduce bids until the query proves it can convert profitably.'
      },
      {
        id: 'school-lunch-set', query: 'school lunch set stainless', queryVolume: 7600, marketPurchases: 290,
        brandImpressions: 304, brandClicks: 42, brandCartAdds: 14, brandPurchases: 7,
        expectedDiagnosis: 'scale_visibility', expectedFollowUp: 'increase_coverage',
        evidence: 'The brand converts above the market rate, but impression share is only 4%. More qualified coverage is the clearest opportunity.',
        feedback: 'The query is producing healthy purchase behavior when reached. Expand coverage carefully and protect the proven conversion path.'
      },
      {
        id: 'lunch-box-cheap', query: 'cheap lunch box for kids', queryVolume: 10400, marketPurchases: 510,
        brandImpressions: 2080, brandClicks: 156, brandCartAdds: 19, brandPurchases: 2,
        expectedDiagnosis: 'fix_listing_conversion', expectedFollowUp: 'audit_pdp',
        evidence: 'Exposure and clicks are substantial, but purchase rate is weak. The price promise and product positioning may not match the query.',
        feedback: 'Do not buy more exposure yet. Check price competitiveness, offer fit, and whether the product actually satisfies the \u201ccheap\u201d intent.'
      },
      {
        id: 'reusable-water-bottle', query: 'reusable water bottle for kids', queryVolume: 15000, marketPurchases: 800,
        brandImpressions: 3000, brandClicks: 240, brandCartAdds: 48, brandPurchases: 36,
        expectedDiagnosis: 'scale_visibility', expectedFollowUp: 'increase_coverage',
        evidence: 'The brand converts at 15% click-to-purchase rate, far above market average. Impression share is only 20%, indicating room for growth.',
        feedback: 'This query proves strong conversion. Expand coverage to capture more of the available demand while maintaining the proven conversion quality.'
      },
      {
        id: 'eco-friendly-container', query: 'eco friendly food container', queryVolume: 11000, marketPurchases: 450,
        brandImpressions: 880, brandClicks: 66, brandCartAdds: 8, brandPurchases: 3,
        expectedDiagnosis: 'fix_listing_conversion', expectedFollowUp: 'audit_pdp',
        evidence: 'Brand gets clicks but only 4.5% convert to purchases. The product may not clearly communicate its eco-friendly value proposition.',
        feedback: 'Traffic quality is good but conversion is weak. Audit the listing to ensure eco-friendly features are prominently displayed and the offer is competitive.'
      }
    ]
  };

  var SQP_STUDIO_BEGINNER_SCENARIO = {
    id: 'sqp-studio-beginner',
    version: '1.0.0',
    rubricVersion: '1.0.0',
    title: 'SQP Studio - Beginner',
    difficulty: 'beginner',
    passingScore: 75,
    diagnoses: DIAGNOSES,
    followUps: FOLLOW_UPS,
    queries: [
      {
        id: 'water-bottle-simple',
        query: 'water bottle',
        queryVolume: 50000,
        marketPurchases: 5000,
        brandImpressions: 10000,
        brandClicks: 500,
        brandCartAdds: 100,
        brandPurchases: 80,
        expectedDiagnosis: 'scale_visibility',
        expectedFollowUp: 'increase_coverage',
        evidence: 'Strong conversion rate of 16% from clicks to purchases, but only 20% impression share. The product converts well when seen.',
        feedback: 'This is a clear visibility gap. The query has massive volume and your product converts well. Increase coverage to capture more of this demand.'
      },
      {
        id: 'lunch-bag-basic',
        query: 'lunch bag',
        queryVolume: 30000,
        marketPurchases: 3000,
        brandImpressions: 15000,
        brandClicks: 300,
        brandCartAdds: 45,
        brandPurchases: 15,
        expectedDiagnosis: 'fix_listing_conversion',
        expectedFollowUp: 'audit_pdp',
        evidence: 'Good impression share at 50%, but only 5% of clicks result in purchases. Shoppers are interested but not converting.',
        feedback: 'The listing is getting traffic but not closing sales. Review your product images, price, description, and whether you\u2019re meeting the basic expectations for a lunch bag.'
      },
      {
        id: 'snack-container-new',
        query: 'snack container',
        queryVolume: 20000,
        marketPurchases: 2000,
        brandImpressions: 2000,
        brandClicks: 100,
        brandCartAdds: 10,
        brandPurchases: 5,
        expectedDiagnosis: 'watch_data_limit',
        expectedFollowUp: 'collect_more_data',
        evidence: 'Only 100 clicks and 5 purchases. The data is too limited to make confident optimization decisions.',
        feedback: 'This query needs more data. Keep it running and collect at least 200-300 clicks before making structural changes to bids or targeting.'
      },
      {
        id: 'food-storage-low',
        query: 'food storage',
        queryVolume: 40000,
        marketPurchases: 4000,
        brandImpressions: 20000,
        brandClicks: 800,
        brandCartAdds: 50,
        brandPurchases: 10,
        expectedDiagnosis: 'reduce_waste',
        expectedFollowUp: 'tighten_targeting',
        evidence: 'High traffic with 800 clicks but only 1.25% conversion rate. The broad query is attracting unqualified traffic.',
        feedback: 'This query is generating a lot of interest but few sales. Tighten your targeting with more specific keywords or negative terms to filter out irrelevant searches.'
      },
      {
        id: 'kids-meal-prep', query: 'meal prep for kids', queryVolume: 18000, marketPurchases: 1800,
        brandImpressions: 9000, brandClicks: 270, brandCartAdds: 54, brandPurchases: 45,
        expectedDiagnosis: 'scale_visibility', expectedFollowUp: 'increase_coverage',
        evidence: 'Excellent 16.7% click-to-purchase conversion, but only 50% impression share. Strong performance with room to grow.',
        feedback: 'When your product is found, it converts exceptionally well. Increase your bid or expand match types to capture more of this high-quality demand.'
      },
      {
        id: 'bento-style-box', query: 'bento box style', queryVolume: 12000, marketPurchases: 1200,
        brandImpressions: 6000, brandClicks: 120, brandCartAdds: 18, brandPurchases: 6,
        expectedDiagnosis: 'fix_listing_conversion', expectedFollowUp: 'audit_pdp',
        evidence: 'Decent traffic at 50% impression share, but only 5% conversion. The \u2018bento box style\u2019 query may not align with your actual product.',
        feedback: 'Your product is getting visibility but the specific query may not match what you\u2019re selling. Review whether your listing clearly shows the bento-style features shoppers expect.'
      }
    ]
  };

  function percent(numerator, denominator) {
    if (!denominator) return 0;
    return Math.round((numerator / denominator) * 10000) / 100;
  }

  function calculateQueryMetrics(row) {
    return {
      impressionShare: percent(row.brandImpressions, row.queryVolume),
      clickThroughRate: percent(row.brandClicks, row.brandImpressions),
      cartAddRate: percent(row.brandCartAdds, row.brandClicks),
      purchaseRate: percent(row.brandPurchases, row.brandClicks),
      purchaseShare: percent(row.brandPurchases, row.marketPurchases),
      marketPurchaseRate: percent(row.marketPurchases, row.queryVolume)
    };
  }

  function gradeQuery(query, answer) {
    var safeAnswer = answer || {};
    var diagnosisCorrect = safeAnswer.diagnosis === query.expectedDiagnosis;
    var followUpCorrect = safeAnswer.followUp === query.expectedFollowUp;
    var earned = 0;

    if (diagnosisCorrect) earned += 15;
    if (followUpCorrect) earned += 10;

    return {
      queryId: query.id,
      query: query.query,
      earned: earned,
      possible: 25,
      diagnosisCorrect: diagnosisCorrect,
      followUpCorrect: followUpCorrect,
      expectedDiagnosis: query.expectedDiagnosis,
      expectedFollowUp: query.expectedFollowUp,
      selectedDiagnosis: safeAnswer.diagnosis || '',
      selectedFollowUp: safeAnswer.followUp || '',
      metrics: calculateQueryMetrics(query),
      evidence: query.evidence,
      feedback: query.feedback
    };
  }

  function summarize(score, passingScore) {
    if (score >= 90) {
      return 'Strong SQP read. You separated visibility, conversion, and data-confidence problems cleanly.';
    }
    if (score >= passingScore) {
      return 'Good SQP read. Review the missed rows and tighten the evidence behind each recommendation.';
    }
    return 'Keep practicing the SQP read. Focus on whether the row proves a visibility gap, a conversion gap, a weak-data gap, or wasted exposure.';
  }

  function gradeAttempt(scenario, attempt) {
    var activeScenario = scenario || SQP_STUDIO_SCENARIO;
    var safeAttempt = attempt || {};
    var items = activeScenario.queries.map(function (query) {
      return gradeQuery(query, safeAttempt[query.id]);
    });
    var score = items.reduce(function (sum, item) {
      return sum + item.earned;
    }, 0);
    var maxScore = items.reduce(function (sum, item) {
      return sum + item.possible;
    }, 0);
    var correctDecisions = items.filter(function (item) {
      return item.diagnosisCorrect && item.followUpCorrect;
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
    SQP_STUDIO_SCENARIO: SQP_STUDIO_SCENARIO,
    SQP_STUDIO_BEGINNER_SCENARIO: SQP_STUDIO_BEGINNER_SCENARIO,
    DIAGNOSES: DIAGNOSES,
    FOLLOW_UPS: FOLLOW_UPS,
    calculateQueryMetrics: calculateQueryMetrics,
    gradeAttempt: gradeAttempt
  };
});
