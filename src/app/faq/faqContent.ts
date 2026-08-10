/**
 * Content for /faq. Kept as data, separate from page.tsx, so it can be
 * edited without touching layout code, and so "what I've fixed" claims
 * stay easy to spot-check against reality on every content review.
 *
 * Voice: first person, Ryan. See docs/voice-guide.md — no filler
 * phrases, no em dashes, say what it does not what it represents.
 */

export interface FaqItem {
  n: number;
  q: string;
  /** Answer, one paragraph per array entry. */
  a: readonly string[];
  /** What used to be a gap here and has since shipped. Omit if nothing has changed. */
  fixed?: string;
  /** What's still genuinely open. Omit if there's nothing left to name. */
  open?: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    n: 1,
    q: "Is this just another collection of recorded videos?",
    a: [
      "That's a fair concern. There are already thousands of free Amazon PPC videos online.",
      "This isn't meant to be a passive video library. The lessons explain the concepts, but the real value comes from practicing decisions inside simulations. You work with bids, keywords, search terms, campaign structures, budgets, and listing issues instead of watching someone else do the work.",
      "You'll still need to study. The simulators don't replace understanding. They're there to help you apply what you learn.",
    ],
    open: "Every module should clearly show the exercise, the expected output, and the skill being tested. No lesson should exist only to pad the video count.",
  },
  {
    n: 2,
    q: "Are the simulators realistic, or are they just fancy calculators?",
    a: [
      "Some early versions were closer to calculators. That criticism was legitimate.",
      "The rebuilt versions use scenario-specific data, visible formulas, evidence thresholds, economic limits, versioned datasets, and multiple acceptable decisions where appropriate. They're built to reward judgment rather than memorizing one answer.",
      "They still can't reproduce every detail of a live Amazon account. No simulator can perfectly recreate auction behavior, delayed attribution, marketplace changes, or unpredictable customer behavior.",
      "The goal isn't to pretend it's Seller Central. The goal is to let you practice the decision-making process safely before handling real money.",
    ],
    fixed:
      'All five simulators were rebuilt with real economic models and scenario-specific ground truth instead of one hardcoded right answer. Listing Audit no longer rewards clicking "fix" on every finding by default. Campaign Builder grades budget allocation, negative-keyword routing, and naming discipline, not just structure.',
    open: "Only 4 of the 12 planned Keyword Research niches have real, curated data behind them so far. The other 8 correctly refuse to grade an attempt rather than fake a result, but I still owe you the full set.",
  },
  {
    n: 3,
    q: "Will completing this course guarantee that I get hired?",
    a: [
      "No.",
      "I won't promise that completing a course automatically leads to a job. Employers also evaluate communication, reliability, analysis, portfolio quality, interview performance, and actual experience.",
      "What the program can do is help you understand PPC, practice realistic tasks, explain your decisions, and build evidence that you've trained beyond basic theory.",
      "That can make you more prepared. It can't guarantee an employer's decision.",
    ],
    open: "Add stronger portfolio outputs, interview exercises, graded case studies, and clear guidance on how you should present your work to a client or employer.",
  },
  {
    n: 4,
    q: "Is the content updated, or will I learn outdated Amazon PPC rules?",
    a: [
      "Amazon changes its tools, policies, reports, and recommendations regularly. Any course that claims it will stay permanently current isn't being honest.",
      "The platform uses versioned scenarios, policy references, and documented assumptions so I can update content without silently rewriting your past attempts. Rules that vary by marketplace, category, or effective date shouldn't be presented as universal truths.",
    ],
    fixed:
      "Every simulator scenario already carries a real version number and a draft, published, or archived status behind the scenes, so I can publish a fix without quietly changing what you were already graded against.",
    open: "That versioning isn't visible to you yet. I still need to publish a review date on each major module and a changelog you can actually read, not just one I keep internally.",
  },
  {
    n: 5,
    q: "Do I need access to Seller Central or an advertising account?",
    a: [
      "No. The program is built partly for aspiring virtual assistants who don't yet have access to a real client account.",
      "The simulations let you practice common PPC decisions without risking a client's budget or requiring account credentials.",
      "A simulator still isn't the same as navigating a live account. You'll eventually need supervised exposure to real reports, workflows, and account conditions.",
    ],
    fixed:
      "There's now a download center with real templates and automation tools, including a search-term report scanner with working spreadsheet formulas, plus an embedded Ad Console page so you can see what the real interface looks like before you're ever responsible for someone's actual account.",
    open: "None of that replaces supervised time inside a live account. I still need more guided, account-style case files that walk you through a full week of real operating decisions.",
  },
  {
    n: 6,
    q: "Is this suitable for complete beginners?",
    a: [
      "Yes, but it's not designed to make difficult concepts disappear.",
      "The early modules start with terminology, metrics, campaign structure, and decision fundamentals. Later exercises get more analytical.",
      "Beginners should expect to review some lessons more than once. That's normal. Amazon PPC involves math, customer behavior, advertising economics, and business judgment.",
      "The program should make those subjects understandable, not pretend that mastery happens overnight.",
    ],
    open: "Improve prerequisite checks, glossary support, worked examples, and remediation lessons for anyone who struggles with the fundamentals.",
  },
  {
    n: 7,
    q: "Why should I pay when YouTube and free communities already exist?",
    a: [
      "Free content can teach a lot. I still use free documentation, videos, and industry discussions myself.",
      "The problem usually isn't access to information. The problem is structure, practice, feedback, and knowing whether you understood the lesson correctly.",
      "This program organizes the learning path, gives you scenarios to solve, records your attempts, explains your mistakes, and connects individual concepts into a complete operating workflow.",
      "You shouldn't pay only for information. You should pay for a better learning system.",
    ],
    fixed:
      "There's a working Bid Elevator preview on the homepage now, no account or payment needed, so you can feel the difference between watching a video and making the call yourself before you spend anything.",
    open: "I still want more of the paid program's actual lessons visible as free samples, not just the one simulator preview.",
  },
  {
    n: 8,
    q: "Are the scores and certificates actually meaningful?",
    a: [
      "Not automatically.",
      "A certificate is only valuable when the assessment behind it is credible. It shouldn't be awarded because someone clicked through lessons or found an easy scoring shortcut.",
      "I would rather delay a credential than issue one that doesn't represent real ability.",
    ],
    fixed:
      "This was the gap I was most worried about, and the one I've done the most work on. The scoring engine no longer hands out a free perfect score for showing up, and every simulator's scoring dimensions have to add up to a real, enforced weighting instead of whatever felt right at the time. Listing Audit used to let you click \"fix\" on every finding and pass by default. It doesn't anymore. Campaign Builder now grades seven real dimensions, including negative-keyword routing and budget allocation within real tolerances, not a flat guess. Every result screen also says plainly that the score is formative, practice only, not a certification or a hiring guarantee, so nobody mistakes practice for proof.",
    open: "Expert calibration on acceptable-answer ranges, how much variation still counts as correct, is still in progress for some simulators, and I haven't built a connected-account simulator yet.",
  },
  {
    n: 9,
    q: "How much time and effort will this require?",
    a: [
      "More than a weekend, if you want to become genuinely capable.",
      "You can finish lessons quickly, but understanding the work takes repetition. You'll need time to analyze data, make mistakes, review feedback, and explain your reasoning.",
      "The platform supports self-paced learning, but self-paced doesn't mean effortless.",
      "Plan for consistent weekly practice instead of rushing through everything to collect completion badges.",
    ],
    open: "Publish realistic time estimates, a recommended weekly schedule, milestone plans, and a clear definition of completion versus mastery.",
  },
  {
    n: 10,
    q: "What support will I receive when I get stuck?",
    a: [
      "The program provides structured feedback, explanations, reference materials, and community or instructor support based on your enrollment tier.",
      "I also need to be honest about scale. One instructor can't provide unlimited private coaching to every student at all hours.",
      "Support should have clear boundaries, response expectations, and escalation paths. You should know what's automated, what's community-supported, and what actually gets human review.",
    ],
    open: "Clearly define support levels, response times, coaching limits, feedback channels, and which submissions get direct instructor review.",
  },
] as const;
