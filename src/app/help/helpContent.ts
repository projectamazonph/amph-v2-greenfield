/**
 * helpContent.ts — content for /help (LEARN-045).
 *
 * Voice: first person, Ryan. Same constraints as the /faq copy:
 * no em dashes, no banned slop phrases, no overpromise of
 * real-time support where none exists. See docs/voice-guide.md.
 *
 * Kept as data so the page.tsx renders it without a CMS, and so
 * the regression tests in __tests__/help-page.test.ts can verify
 * structure and copy without rendering React.
 *
 * The escalation order is deliberate: a learner should always
 * try the cheapest path first, then the community, then paid
 * support. The level numbers on HELP_ESCALATION and the surface
 * tags on HELP_BLOCKERS are the contract that the page renders
 * and the tests assert.
 */

export interface HelpHero {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
}

export type BlockerSurface =
  | "account"
  | "lesson"
  | "worksheet"
  | "simulator"
  | "quiz"
  | "payment";

export interface HelpBlocker {
  /** Surface this blocker belongs to. Used for the chip tag and to group cards. */
  readonly surface: BlockerSurface;
  /** Short label rendered as the card title. */
  readonly label: string;
  /** What the learner is actually seeing or trying. */
  readonly description: string;
  /** Concrete next step, with a link target where it makes sense. */
  readonly nextStep: string;
  /**
   * Optional `href` for the next step. Keep it relative or to
   * a same-origin path so the public page does not silently
   * depend on outbound trust.
   */
  readonly nextStepHref?: string;
}

export interface EscalationLevel {
  /** 1-indexed, the order is the contract. */
  readonly level: number;
  /** Short label for the level (e.g. "Read the docs", "Email support"). */
  readonly label: string;
  /** What this level is good for, and what it is not good for. */
  readonly description: string;
  /** The expected turnaround or cost, in one short clause. */
  readonly turnaround: string;
}

export interface HelpSupport {
  /** Support email, with the FALLBACK from /maintenance mirrored. */
  readonly email: string;
  /** What the email gets you, in plain language. */
  readonly description: string;
  /** Expected first response window. No promises of real-time. */
  readonly responseWindow: string;
  /**
   * "What to include" checklist. The order matters: account
   * email first so the support flow can look the right person up.
   */
  readonly whatToInclude: readonly string[];
}

export const HELP_HERO: HelpHero = {
  eyebrow: "Get unstuck",
  title: "If something is in your way, here is the shortest path past it",
  subtitle:
    "I am Ryan. I built this platform. Most blockers have a known fix, and the ones that do not are listed below so you do not have to wonder whether anyone saw your message.",
};

export const HELP_BLOCKERS: readonly HelpBlocker[] = [
  {
    surface: "account",
    label: "I cannot sign in, or my password reset email never arrived",
    description:
      "Password resets go out within a minute. If the email is not in your inbox or spam folder after five minutes, the address on file is probably wrong, or the request never reached the mail provider.",
    nextStep:
      "Use the forgot-password page with the address you actually signed up with. If you no longer have access to that mailbox, email support and we will sort it out manually.",
    nextStepHref: "/reset-password",
  },
  {
    surface: "account",
    label: "My two-factor code is rejected every time",
    description:
      "Authenticator codes expire every thirty seconds. If the code keeps failing, the time on your phone is probably a few minutes off, or you set up 2FA on a different authenticator app than the one you are using now.",
    nextStep:
      "Open your authenticator and confirm the entry shows your AMPH account email. If you lost the device, disable 2FA from your profile, or email support if you no longer have the recovery codes.",
    nextStepHref: "/profile/security",
  },
  {
    surface: "lesson",
    label: "A lesson will not load, or the page is blank",
    description:
      "Lesson pages are server-rendered, so a blank page usually means the database is busy, your session expired, or the lesson slug changed. The lesson list at /courses is the same source of truth, so you can re-enter from there.",
    nextStep: "Open the lesson again from /courses. If it still fails, reload once and try a different lesson to rule out your network.",
    nextStepHref: "/courses",
  },
  {
    surface: "worksheet",
    label: "My worksheet notes do not save when I click away",
    description:
      "Worksheet notes only save when you click the Save notes button. Clicking out of an input does not save by itself. If the button is disabled, the form is clean, meaning there is nothing new to save.",
    nextStep: "Type something, then click Save notes. The Saved badge confirms the write went through. Notes save per H2 section, so you can leave a lesson and come back to the same fields later.",
  },
  {
    surface: "simulator",
    label: "My simulator score is low, and I do not know why",
    description:
      "Simulator scores are formative. They tell you what to look at next, not whether you are ready to take a client account. A low score means the rubric flagged a decision worth revisiting, not that you failed.",
    nextStep:
      "Open the debrief after the attempt. Every low score points to a specific section of the lesson it relates to. Run the same scenario again after reading that section, no penalty.",
  },
  {
    surface: "quiz",
    label: "My quiz attempt was marked wrong on a question I am sure about",
    description:
      "Quizzes are scored against the answer key in the published lesson. If a question reads differently than the lesson, that is a content bug, not a grading bug, and the fix is on me, not on you.",
    nextStep:
      "Email support with the lesson slug, the question number, and what the lesson actually says. I will fix the key and re-credit your XP.",
  },
  {
    surface: "payment",
    label: "My payment went through but my enrollment did not unlock",
    description:
      "Payment and enrollment are two separate events. PayMongo sends a webhook that triggers enrollment. If the webhook failed or arrived late, the payment is recorded but the course is still locked.",
    nextStep:
      "Wait two minutes, then reload. If the course is still locked after that, email support with the order reference from your PayMongo receipt and I will trigger enrollment by hand.",
  },
];

export const HELP_ESCALATION: readonly EscalationLevel[] = [
  {
    level: 1,
    label: "Read this page and the related lesson section",
    description:
      "Start here. The blockers above cover the cases I have seen most often, and every entry points back to the lesson or setting that explains the underlying behavior.",
    turnaround: "Under five minutes.",
  },
  {
    level: 2,
    label: "Ask in the next live class Q and A",
    description:
      "Live class Q and A is the right home for questions that need a back-and-forth. I run them on a published schedule and answer in the order questions arrive, so you see the questions other learners are stuck on too.",
    turnaround: "Same week as the next live class.",
  },
  {
    level: 3,
    label: "Email support",
    description:
      "Email is the right path for account, billing, and content bugs that need a written record. Include what you tried first, so we do not re-cover ground this page already covers.",
    turnaround: "Within two business days. There is no live chat, no instant reply, and no 24/7 line. If your account is locked, mark the subject URGENT.",
  },
];

export const HELP_SUPPORT: HelpSupport = {
  email: "support@projectamazonph.online",
  description:
    "Email is the only support channel. I read every message myself. There is no support team, no chatbot, and no on-call rotation, so a clear, specific message gets a faster, more useful reply than a short one.",
  responseWindow: "Within two business days, Monday to Friday, PH time.",
  whatToInclude: [
    "The email address on your account, so I can look up your record.",
    "The lesson slug or simulator name, not just a screenshot. Slugs look like foundations / 1.2-cpc-ctr or tools / bid-elevator.",
    "What you tried first, and what the platform did instead. Two sentences is enough.",
    "A screenshot or short screen recording only if the words alone do not capture it.",
  ],
};
