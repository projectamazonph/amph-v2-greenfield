(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PpcProfitabilityCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ============================================================
  // PPC PROFITABILITY LAB - CORE MODULE
  // 
  // Teaches break-even ACOS, allowable CPC, ROAS, TACoS calculations
  // ============================================================

  var DIFFICULTY = {
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced'
  };

  var PROFITABILITY_SCENARIOS = {
    beginner: {
      id: 'ppc-profitability-beginner',
      version: '1.0.0',
      rubricVersion: '1.0.0',
      title: 'PPC Profitability Lab - Beginner',
      difficulty: DIFFICULTY.beginner,
      passingScore: 75,
      description: 'Learn the fundamentals of PPC profitability: break-even ACOS, allowable CPC, ROAS, and TACoS.',
      questions: [
        {
          id: 'break-even-acos-1',
          question: 'What is the break-even ACOS for a product with 30% margin?',
          type: 'numeric',
          answer: 30,
          tolerance: 0.1,
          units: '%',
          context: {
            margin: 30,
            product: 'Stainless steel water bottle',
            price: 24.99
          },
          explanation: 'Break-even ACOS equals the product margin percentage. At 30% margin, you break even when ACOS is 30%.',
          hint: 'Break-even ACOS = Margin %'
        },
        {
          id: 'allowable-cpc-1',
          question: 'What is the allowable CPC for a product with $15 AOV, 30% conversion rate, and 30% target ACOS?',
          type: 'numeric',
          answer: 1.35,
          tolerance: 0.01,
          units: '$',
          context: {
            aov: 15,
            conversionRate: 30,
            targetAcos: 30
          },
          explanation: 'Allowable CPC = AOV × Conversion Rate × Target ACOS / 100 = $15 × 0.30 × 0.30 = $1.35',
          hint: 'CPC = AOV × CVR × (Target ACOS / 100)'
        },
        {
          id: 'roas-calculation-1',
          question: 'What is the ROAS for a campaign with $500 sales and $100 spend?',
          type: 'numeric',
          answer: 5,
          tolerance: 0.01,
          units: 'x',
          context: {
            sales: 500,
            spend: 100
          },
          explanation: 'ROAS = Sales / Spend = $500 / $100 = 5',
          hint: 'ROAS = Revenue ÷ Ad Spend'
        },
        {
          id: 'acos-calculation-1',
          question: 'What is the ACOS for a campaign with $100 spend and $500 sales?',
          type: 'numeric',
          answer: 20,
          tolerance: 0.1,
          units: '%',
          context: {
            spend: 100,
            sales: 500
          },
          explanation: 'ACOS = (Spend / Sales) × 100 = ($100 / $500) × 100 = 20%',
          hint: 'ACOS = (Ad Spend ÷ Sales) × 100'
        },
        {
          id: 'tacos-calculation-1',
          question: 'What is the TACoS for a campaign with $100 spend and $1000 total revenue?',
          type: 'numeric',
          answer: 10,
          tolerance: 0.1,
          units: '%',
          context: {
            spend: 100,
            totalRevenue: 1000
          },
          explanation: 'TACoS = (Spend / Total Revenue) × 100 = ($100 / $1000) × 100 = 10%',
          hint: 'TACoS = (Ad Spend ÷ Total Revenue) × 100'
        },
        {
          id: 'profitability-check-1',
          question: 'Is a campaign with 25% ACOS profitable for a product with 30% margin?',
          type: 'boolean',
          answer: true,
          context: {
            acos: 25,
            margin: 30
          },
          explanation: 'Yes, 25% ACOS is below the 30% margin, so the campaign is profitable.',
          hint: 'Compare ACOS to margin: ACOS < Margin = Profitable'
        }
      ]
    },
    intermediate: {
      id: 'ppc-profitability-intermediate',
      version: '1.0.0',
      rubricVersion: '1.0.0',
      title: 'PPC Profitability Lab - Intermediate',
      difficulty: DIFFICULTY.intermediate,
      passingScore: 75,
      description: 'Apply profitability concepts to realistic scenarios with multiple constraints.',
      questions: [
        {
          id: 'break-even-with-fees',
          question: 'What is the break-even ACOS for a product with 25% margin after Amazon fees of 15%?',
          type: 'numeric',
          answer: 25,
          tolerance: 0.1,
          units: '%',
          context: {
            margin: 25,
            amazonFees: 15,
            note: 'Break-even ACOS is based on your net margin, not gross margin'
          },
          explanation: 'Break-even ACOS is still based on your product margin (25%), not the Amazon fees. Fees are already accounted for in your margin calculation.',
          hint: 'Break-even ACOS = Your Net Margin %'
        },
        {
          id: 'allowable-cpc-with-roas',
          question: 'What is the allowable CPC to achieve a 4:1 ROAS with 20% conversion rate and $25 AOV?',
          type: 'numeric',
          answer: 1.25,
          tolerance: 0.01,
          units: '$',
          context: {
            targetRoas: 4,
            conversionRate: 20,
            aov: 25
          },
          explanation: 'Allowable CPC = AOV × CVR × (1 / Target ROAS) = $25 × 0.20 × 0.25 = $1.25. At 4:1 ROAS, you spend $1 to earn $4.',
          hint: 'CPC = AOV × CVR × (1 / ROAS)'
        },
        {
          id: 'max-bid-calculation',
          question: 'What is the maximum bid you can place to maintain 30% ACOS with $20 AOV and 25% conversion rate?',
          type: 'numeric',
          answer: 1.5,
          tolerance: 0.01,
          units: '$',
          context: {
            targetAcos: 30,
            aov: 20,
            conversionRate: 25
          },
          explanation: 'Max Bid = AOV × CVR × (Target ACOS / 100) = $20 × 0.25 × 0.30 = $1.50',
          hint: 'Max Bid = AOV × CVR × (Target ACOS / 100)'
        },
        {
          id: 'profit-per-click',
          question: 'What is the profit per click for a product with $18 profit margin, 20% conversion rate, and $1.50 CPC?',
          type: 'numeric',
          answer: 0.9,
          tolerance: 0.01,
          units: '$',
          context: {
            profitMargin: 18,
            conversionRate: 20,
            cpc: 1.5
          },
          explanation: 'Profit per click = (Profit Margin × CVR) - CPC = ($18 × 0.20) - $1.50 = $3.60 - $1.50 = $0.90',
          hint: 'Profit per click = (Margin × CVR) - CPC'
        },
        {
          id: 'scale-decision',
          question: 'Can you scale a campaign with 28% ACOS, 15% conversion rate, $20 AOV, and 30% margin?',
          type: 'boolean',
          answer: true,
          context: {
            acos: 28,
            conversionRate: 15,
            aov: 20,
            margin: 30
          },
          explanation: 'Yes, 28% ACOS is below the 30% margin, so scaling is safe. The campaign is profitable.',
          hint: 'Check if ACOS < Margin'
        },
        {
          id: 'pause-decision',
          question: 'Should you pause a campaign with 45% ACOS, 10% conversion rate, $25 AOV, and 30% margin?',
          type: 'boolean',
          answer: true,
          context: {
            acos: 45,
            conversionRate: 10,
            aov: 25,
            margin: 30
          },
          explanation: 'Yes, 45% ACOS exceeds the 30% margin significantly. The campaign is losing money and should be paused or restructured.',
          hint: 'Check if ACOS > Margin significantly'
        }
      ]
    },
    advanced: {
      id: 'ppc-profitability-advanced',
      version: '1.0.0',
      rubricVersion: '1.0.0',
      title: 'PPC Profitability Lab - Advanced',
      difficulty: DIFFICULTY.advanced,
      passingScore: 80,
      description: 'Solve complex profitability scenarios with multiple variables and constraints.',
      questions: [
        {
          id: 'blended-acos-calculation',
          question: 'What is the blended ACOS if Campaign A has $500 spend and $2000 sales, and Campaign B has $300 spend and $900 sales?',
          type: 'numeric',
          answer: 28,
          tolerance: 0.1,
          units: '%',
          context: {
            campaignA: { spend: 500, sales: 2000 },
            campaignB: { spend: 300, sales: 900 }
          },
          explanation: 'Blended ACOS = Total Spend / Total Sales × 100 = ($500 + $300) / ($2000 + $900) × 100 = $800 / $2900 × 100 ≈ 27.59% ≈ 28%',
          hint: 'Combine spend and sales, then calculate ACOS'
        },
        {
          id: 'target-roas-from-margin',
          question: 'What minimum ROAS is needed to maintain profitability with a 25% margin?',
          type: 'numeric',
          answer: 4,
          tolerance: 0.01,
          units: 'x',
          context: {
            margin: 25
          },
          explanation: 'ROAS = 1 / (Margin / 100) = 1 / 0.25 = 4. At 25% margin, you need at least 4:1 ROAS to break even.',
          hint: 'Target ROAS = 1 / (Margin / 100)'
        },
        {
          id: 'budget-allocation',
          question: 'If you have a $1000 daily budget and Campaign A has 20% ACOS with $5000 daily revenue, and Campaign B has 35% ACOS with $3000 daily revenue, which campaign deserves more budget?',
          type: 'multiple-choice',
          answer: 'campaign_a',
          options: ['campaign_a', 'campaign_b', 'neither'],
          context: {
            budget: 1000,
            campaignA: { acos: 20, dailyRevenue: 5000 },
            campaignB: { acos: 35, dailyRevenue: 3000 }
          },
          explanation: 'Campaign A has lower ACOS (20% vs 35%) and higher revenue ($5000 vs $3000), so it deserves more budget allocation.',
          hint: 'Allocate to the campaign with better efficiency and higher revenue'
        },
        {
          id: 'bid-adjustment-for-profitability',
          question: 'By what percentage should you reduce a bid to go from 40% ACOS to 30% ACOS, assuming CTR stays constant?',
          type: 'numeric',
          answer: 25,
          tolerance: 1,
          units: '%',
          context: {
            currentAcos: 40,
            targetAcos: 30
          },
          explanation: 'Bid reduction % = ((Current ACOS - Target ACOS) / Current ACOS) × 100 = ((40 - 30) / 40) × 100 = 25%',
          hint: 'Calculate percentage reduction needed'
        },
        {
          id: 'seasonal-margin-adjustment',
          question: 'During a seasonal promotion, your effective margin drops to 20%. What is your new break-even ACOS?',
          type: 'numeric',
          answer: 20,
          tolerance: 0.1,
          units: '%',
          context: {
            normalMargin: 30,
            seasonalMargin: 20
          },
          explanation: 'Break-even ACOS always equals your current effective margin. With 20% seasonal margin, break-even ACOS is 20%.',
          hint: 'Break-even ACOS = Current Effective Margin'
        },
        {
          id: 'multi-campaign-profitability',
          question: 'If Campaign A has 25% ACOS with $1000 profit, and Campaign B has 35% ACOS with $800 profit, which campaign is more profitable in absolute terms?',
          type: 'multiple-choice',
          answer: 'campaign_a',
          options: ['campaign_a', 'campaign_b', 'they_are_equal'],
          context: {
            campaignA: { acos: 25, profit: 1000 },
            campaignB: { acos: 35, profit: 800 }
          },
          explanation: 'Campaign A generates $1000 profit vs Campaign Bs $800 profit. Even though Campaign B has higher ACOS, Campaign A is more profitable in absolute dollar terms.',
          hint: 'Compare absolute profit, not just ACOS'
        }
      ]
    }
  };

  // ============================================================
  // GRADING FUNCTIONS
  // ============================================================

  function round(value, decimals) {
    var factor = Math.pow(10, decimals || 2);
    return Math.round(value * factor) / factor;
  }

  function isNumericEqual(actual, expected, tolerance) {
    var tol = tolerance || 0.01;
    return Math.abs(actual - expected) <= tol;
  }

  function gradeQuestion(question, answer) {
    var safeAnswer = answer || '';
    var earned = 0;
    var possible = 10;

    switch (question.type) {
      case 'numeric':
        var numericAnswer = parseFloat(safeAnswer);
        var numericExpected = parseFloat(question.answer);
        if (!isNaN(numericAnswer) && isNumericEqual(numericAnswer, numericExpected, question.tolerance)) {
          earned = 10;
        }
        break;
      case 'boolean':
        var boolAnswer = String(safeAnswer).toLowerCase();
        var boolExpected = String(question.answer).toLowerCase();
        if (boolAnswer === boolExpected || (boolAnswer === 'true' && boolExpected === 'yes') || (boolAnswer === 'false' && boolExpected === 'no')) {
          earned = 10;
        }
        break;
      case 'multiple-choice':
        if (safeAnswer === question.answer) {
          earned = 10;
        }
        break;
      default:
        if (safeAnswer === question.answer) {
          earned = 10;
        }
    }

    return {
      questionId: question.id,
      question: question.question,
      earned: earned,
      possible: possible,
      correct: earned === possible,
      answer: safeAnswer,
      expectedAnswer: question.answer,
      explanation: question.explanation,
      hint: question.hint
    };
  }

  function gradeAttempt(scenarioId, attempt) {
    var scenario = PROFITABILITY_SCENARIOS[scenarioId];
    if (!scenario) {
      throw new TypeError('Unknown PPC Profitability scenario: ' + scenarioId);
    }

    var safeAttempt = attempt || {};
    var items = scenario.questions.map(function (question) {
      return gradeQuestion(question, safeAttempt[question.id]);
    });

    var score = items.reduce(function (sum, item) {
      return sum + item.earned;
    }, 0);
    var maxScore = items.reduce(function (sum, item) {
      return sum + item.possible;
    }, 0);
    var correctAnswers = items.filter(function (item) {
      return item.correct;
    }).length;
    var passingScore = scenario.passingScore || 75;
    var scorePercent = (score / maxScore) * 100;

    var summary = '';
    if (scorePercent >= 90) {
      summary = 'Excellent! You have a strong grasp of PPC profitability concepts.';
    } else if (scorePercent >= passingScore) {
      summary = 'Good work! Review the missed questions to deepen your understanding.';
    } else {
      summary = 'Keep practicing. Focus on understanding the relationship between ACOS, margin, ROAS, and profitability.';
    }

    return {
      score: score,
      maxScore: maxScore,
      correctAnswers: correctAnswers,
      totalQuestions: items.length,
      passed: scorePercent >= passingScore,
      summary: summary,
      items: items,
      scenarioId: scenarioId,
      difficulty: scenario.difficulty
    };
  }

  function getScenario(scenarioId) {
    return PROFITABILITY_SCENARIOS[scenarioId];
  }

  function listScenarios() {
    return Object.keys(PROFITABILITY_SCENARIOS).map(function (key) {
      var scenario = PROFITABILITY_SCENARIOS[key];
      return {
        id: scenario.id,
        title: scenario.title,
        difficulty: scenario.difficulty,
        questionCount: scenario.questions.length,
        passingScore: scenario.passingScore
      };
    });
  }

  // ============================================================
  // EXPORT
  // ============================================================

  return {
    PROFITABILITY_SCENARIOS: PROFITABILITY_SCENARIOS,
    DIFFICULTY: DIFFICULTY,
    gradeAttempt: gradeAttempt,
    gradeQuestion: gradeQuestion,
    getScenario: getScenario,
    listScenarios: listScenarios
  };
});
