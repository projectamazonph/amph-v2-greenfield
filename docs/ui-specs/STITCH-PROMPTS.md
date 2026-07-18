# Google Stitch Prompt — Project Amazon PH Academy v2

## Instructions for Use

This document contains Stitch prompts for every page/screen of Project Amazon PH Academy v2. Feed each prompt section into Google Stitch (stitch.withgoogle.com) individually. Stitch generates HTML/CSS with Tailwind — we will convert the output to CSS Modules + design tokens for the Next.js project.

**Strategy:** Generate one screen at a time. Start with the landing page (most complex marketing surface), then auth pages, pricing, dashboard, course flow, tools, admin, and utility pages.

---

## MASTER DESIGN SYSTEM REFERENCE

Before generating any screen, Stitch needs this design system context:

```
Design system name: Field Manual
Aesthetic: Dense, scannable, utilitarian. Like a 1970s technical reference manual printed for people who actually have to use the information at 2am. Information-dense, hierarchical, typographically clear. NOT glassmorphism, NOT gradient orbs, NOT neon accents, NOT generic SaaS template.

Color palette:
- Background: #FAFAF7 (warm off-white, never pure white)
- Cards/Panels: #FFFFFF
- Subtle differentiation: #F4F3EE
- Primary text: #171717
- Secondary text: #404040
- Tertiary text/metadata: #737373
- Disabled/dividers: #D4D4D4
- Border: #E5E5E0
- Brand accent: #FF6B35 (orange — used for CTAs, active states, primary actions)
- Accent hover: #E55A2B
- Accent soft background: #FFE5D9
- Success: #0E7C3A
- Warning: #B45309
- Error/Danger: #B91C1C
- Info: #1E40AF

Typography:
- Display + Body: Space Grotesk (variable, 400-700)
- Mono: JetBrains Mono (for data, code, bid values)
- No serif, no script, no second body font
- Headings: font-weight 600, line-height 1.15, letter-spacing -0.01em
- Body: line-height 1.5
- Type scale: xs=0.75rem, sm=0.875rem, base=1rem, lg=1.125rem, xl=1.375rem, 2xl=1.75rem, 3xl=2.25rem, 4xl=3rem

Spacing: 4px base grid. Tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px
Radius: sm=4px, md=6px, lg=10px. No pill shapes. No 16px+ card radii.
Shadows: Barely-there. sm=0 1px 2px rgba(0,0,0,0.04), md=0 2px 4px rgba(0,0,0,0.06), lg=0 8px 16px rgba(0,0,0,0.08)

Buttons:
- Primary: Solid #FF6B35, white text, radius 6px. ONE per viewport.
- Secondary: 1px border #E5E5E0, #171717 text. Default for secondary actions.
- Ghost: No border, #404040 text, hover wash #F4F3EE. For tertiary/table actions.
- Sizes: sm=28px, md=36px, lg=44px height

Cards: White surface, 1px border #E5E5E0, no shadow by default. Interactive variant: lift 1px on hover + shadow-sm. NEVER nest cards inside cards.

Icons: Phosphor icon set, light weight only. Sizes: 16px inline, 20px button, 24px default, 32px hero.

Layout: 12-column max-width 1200px. Gutter 24px. Side margins clamp(16px, 4vw, 48px).

Anti-patterns to AVOID:
- No gradient text
- No glassmorphism / backdrop-blur decorative cards
- No cyan-on-dark or purple-to-blue gradients
- No neon glowing accents
- No generic card grids (icon + heading + text repeated)
- No centered-everything layouts
- No 3D illustrations or stock photos of smiling people
- No hero metric layouts (big number + small label + gradient accent)
- No rounded rectangles with thick colored border on one side
- No sparklines as decoration

Motion and Interaction (mandatory for every screen):
- Every button: tactile -1px translateY on :active (press down feel). No neon outer glows.
- Every interactive card: subtle lift (translateY(-1px)) + shadow-sm on hover. Transition 200ms ease-out.
- Page sections: staggered cascade reveal on load. Each section fades in with 50ms delay between sections. Use opacity 0→1 + translateY(8px→0) over 400ms ease-out.
- Lists (courses, tools, keywords): waterfall reveal. First item appears immediately, each subsequent item delays 60ms.
- Form inputs: focus ring transitions to accent color (#FF6B35) over 150ms. No instant color jumps.
- Progress bars: animate width from 0 to final value on mount over 600ms ease-out.
- Sidebar nav items: hover wash (#F4F3EE) transitions in over 120ms.
- Score numbers (tool results): count-up animation from 0 to final value over 800ms.

Layout Rules (enforce in every prompt):
- Left-aligned hero text. Centered heroes are banned for this project — asymmetric, left-aligned compositions only.
- No 3-column equal card grids. Use 2-column zig-zag, asymmetric layouts, or horizontal scroll for feature showcases.
- Max-width containment: 1200px for content, 720px for reading (lessons), 640px for forms.
- Every element occupies its own spatial zone. No overlapping. No absolute-positioned content stacking.
```

---

## SCREEN 1: LANDING PAGE (Public)

```
Generate a web landing page for "Project Amazon PH Academy" — an Amazon advertising training platform for Filipino virtual assistants.

Brand: Project Amazon PH Academy. Tagline: "Three courses. One outcome: become the Amazon ads specialist clients retain."

Page structure (top to bottom):

1. HEADER (sticky, 56px tall):
   - Left: "Project Amazon PH Academy" logotype (Space Grotesk 700, #171717)
   - Right: "Sign in" text link (#404040) + "Get started" button (primary, #FF6B35)
   - Bottom border: 1px #E5E5E0

2. HERO SECTION (generous spacing, 80px+ top padding, LEFT-ALIGNED — not centered):
   - Layout: Two-column asymmetric. Left column (60% width): text content. Right column (40%): empty or subtle decorative element (a single large JetBrains Mono number like "₱80k" in #FFE5D9, rotated slightly, acting as visual punctuation — NOT an image, NOT a card).
   - Eyebrow text above heading: "AMAZON PPC TRAINING FOR FILIPINO VAs" (Space Grotesk, 0.75rem, uppercase, #737373, letter-spacing 0.05em)
   - Main heading: "Stop earning ₱15k/month. Start charging ₱60k–₱80k for Amazon ads." (Space Grotesk 600, clamp(2.25rem, 4vw, 3rem), #171717, max-width 700px, line-height 1.15)
   - Subheading: "Project Amazon PH Academy teaches Filipino VAs the Amazon advertising work that clients pay premium rates for. Practice with real campaign tools, not just theory videos." (1.125rem, #404040, max-width 560px, line-height 1.5)
   - Single CTA: "See pricing →" (primary button, #FF6B35). No secondary button — one CTA per viewport.
   - NO hero image. Text-only hero with one typographic decorative element. Clean, direct, type-led.
   - Motion: Heading fades in + slides up from 8px below over 400ms ease-out. Subheading delays 100ms. CTA delays 200ms. Right column element delays 300ms.

3. SOCIAL PROOF BAR (subtle, full-width, #F4F3EE background):
   - Horizontal row of 4 stats in a single line: "500+ VAs trained" | "₱50M+ ad spend managed" | "60% average completion" | "4.8/5 student rating"
   - Style: Space Grotesk 600 for numbers, 400 for labels, #171717 numbers, #737373 labels
   - Separated by thin vertical dividers (1px #E5E5E0)
   - Motion: Each stat fades in with 80ms stagger (left to right). Numbers count up from 0 over 600ms.

4. WHAT YOU LEARN (asymmetric 2-column layout — NOT 3 equal columns):
   - Section heading: "What you learn" (h2, left-aligned)
   - Layout: Left column (60%) has the first item in large type with a longer description. Right column (40%) stacks the remaining two items more compactly. This creates visual hierarchy — the first item gets emphasis.
     a. "Campaign structure" — "How to build Sponsored Products campaigns that Amazon's algorithm rewards. SP, SB, SD, and BTV structures explained with real examples."
     b. "Bid optimization" — "When to raise bids, when to lower them, and when to leave the campaign alone. Practice with the Bid Elevator tool."
     c. "Search term triage" — "Cut wasted spend on irrelevant clicks without killing the keywords that convert. 20 real search terms to practice on."
   - Each item: heading (h3) + paragraph (#404040). NO cards. NO icons above headings. Just text in a clean grid with generous spacing.
   - Motion: Items cascade in with 60ms stagger between them.

5. THREE TIERS (pricing preview — asymmetric layout, NOT 3 equal columns):
   - Section heading: "Three tiers. One goal."
   - Layout: Featured tier (Accelerated Mastery) takes center stage — larger card, 50% width. The other two tiers stack vertically on the left (25% width each). This creates a clear "most popular" focus without a badge.
   - Left column (stacked):
     a. "PPC Foundations" — ₱2,999 — compact card
     c. "Ultimate Transformation" — ₱9,999 — compact card
   - Center column (featured):
     b. "Accelerated Mastery" — ₱5,999 — larger card with #FF6B35 left border accent, "Most popular" badge
   - Each tier: tier name (small caps eyebrow), price in large mono font (JetBrains Mono, ₱ symbol smaller), feature bullets, "Get started" button
   - Motion: Left cards slide in from left, center card scales up from 0.95, stagger 100ms between each.

6. TOOLS SHOWCASE (zig-zag layout — NOT equal card grid):
   - Section heading: "Practice with real tools"
   - Description: "Five interactive tools that simulate the Amazon Advertising Console. Not theory. Practice."
   - Layout: Zig-zag rows. Odd items (1, 3, 5) have text left + visual right. Even items (2, 4) have visual left + text right. Since we have no screenshots, the "visual" side is a large JetBrains Mono number (e.g., "05" for scenario count) in #FFE5D9 as a decorative typographic element.
   - Items:
     a. Campaign Builder — "Build SP, SB, SD, and BTV campaign structures" — "05" decorative number
     b. Bid Elevator — "Practice bid optimization across 10 scenarios" — "10" decorative number
     c. Search Term Triage — "Triage 20 real search terms per session" — "20" decorative number
     d. Listing Audit — "Audit product listings for ad readiness" — "05" decorative number
     e. Keyword Research — "Research and categorize keywords by intent" — "05" decorative number
   - Each item: name (h3) + one-line description (#404040) + decorative number. Alternating layout creates rhythm.
   - Motion: Each row slides in from alternating directions (odd from left, even from right) with 80ms stagger.

7. RYAN SECTION (founder/authority, left-aligned, asymmetric):
   - Layout: Left-aligned text block (60% width). Right side (40%): large decorative number "₱50M+" in JetBrains Mono, #FFE5D9, acting as visual weight.
   - "Built by someone who's done the work" (h2)
   - "Ryan has managed ₱50M+ in Amazon ad spend across 200+ client accounts since 2014. He built Project Amazon PH Academy because the training he wished existed when he started doesn't exist anywhere — especially not for Filipino VAs." (#404040)
   - No photo. Text-only authority block with typographic decoration.
   - Motion: Text slides in from left, decorative number fades in with 200ms delay.

8. CTA SECTION:
   - Full-width background #171717 (dark)
   - Layout: Left-aligned text (not centered). Heading + subtext + button stacked left. Right side: empty — let the dark space do the work.
   - Heading: "Start earning ₱60k–₱80k/month" (white text, left-aligned)
   - Subtext: "Join 500+ Filipino VAs who specialized in Amazon advertising through Project Amazon PH Academy." (left-aligned)
   - Single CTA button: "See pricing →" (#FF6B35 button on dark background, left-aligned)
   - Generous padding (64px vertical)
   - Motion: Heading fades in + slides up. Button delays 150ms.

9. FOOTER:
   - Simple. 3 columns: "Project Amazon PH Academy" (brand + copyright), "Platform" (links: Pricing, Tools, Sign in), "Contact" (email link)
   - Top border 1px #E5E5E0, muted text (#737373)
```

---

## SCREEN 2: SIGN IN PAGE

```
Generate a sign-in page for "Project Amazon PH Academy".

Page structure:
- Centered layout, max-width 400px, vertically centered (min-height 100vh with flex centering)
- Background: #FAFAF7
- Card container: white (#FFFFFF), padding 32px, border 1px #E5E5E0, radius 6px
- Header inside card:
  - "Project Amazon PH Academy" logotype (centered, Space Grotesk 700, #171717)
  - "Sign in to your account" (h1, centered, Space Grotesk 600, 1.75rem)
- Form:
  - Email field: label "Email" above input, input has border #E5E5E0, radius 4px, padding 12px, font 1rem, placeholder "you@example.com"
  - Password field: label "Password" above input, same styling, with show/hide toggle (eye icon)
  - "Sign in" button: primary (#FF6B35), full width, 44px height
- Below form:
  - "Don't have an account? Get started" — link to /auth/signup (#FF6B35)
- Error state (if applicable): red text below the field, "Email or password is incorrect. Try again."
- Footer text below card: "Project Amazon PH Academy © 2026 Project Amazon PH"
```

---

## SCREEN 3: SIGN UP PAGE

```
Generate a sign-up page for "Project Amazon PH Academy".

Page structure:
- Same centered layout as sign-in (max-width 400px, vertically centered)
- Background: #FAFAF7
- Card: white, padding 32px, border 1px #E5E5E0, radius 6px
- Header:
  - "Project Amazon PH Academy" logotype (centered)
  - "Create your account" (h1, centered, Space Grotesk 600, 1.75rem)
  - "Start your path to ₱60k–₱80k/month" (subtitle, #737373, centered)
- Form:
  - Full name field: label "Full name", placeholder "Juan Dela Cruz"
  - Email field: label "Email", placeholder "you@example.com" (may be pre-filled from checkout flow)
  - Password field: label "Password", with hint "At least 8 characters" below in #737373
  - Confirm password field: label "Confirm password"
  - "Create account" button: primary (#FF6B35), full width
- Below form:
  - "Already have an account? Sign in" — link to /auth/signin
- Error state: inline below field, red text
```

---

## SCREEN 4: PRICING PAGE

```
Generate a pricing page for "Project Amazon PH Academy" — Amazon PPC training for Filipino VAs.

Page structure:

1. HEADER SECTION (centered text, generous top padding 80px):
   - Eyebrow: "PRICING" (uppercase, 0.75rem, #737373, letter-spacing 0.05em)
   - Heading: "Pick the tier that matches where you are." (h1, centered, clamp(1.75rem, 3vw, 2.25rem))
   - Subtext: "Three months from now you'll either be earning ₱60,000 a month doing Amazon PPC work, or you'll be explaining to your family why that 'side hustle' didn't pan out. The tier doesn't change what we teach — it changes how fast you get unstuck." (#404040, max-width 640px, centered)

2. TIER CARDS (asymmetric layout — NOT 3 equal columns):
   Layout: Featured tier (Accelerated Mastery) is the hero card — larger, centered, with #FF6B35 left border accent. The other two tiers sit on either side as smaller, quieter cards. This creates a clear visual hierarchy: "this is the one we recommend."
   - Left smaller card: PPC Foundations — ₱2,999
   - Center featured card: Accelerated Mastery — ₱5,999 (larger, accent border, "Most popular" badge)
   - Right smaller card: Ultimate Transformation — ₱9,999
   Each card: white background, 1px border #E5E5E0, radius 6px, padding 32px (featured card: padding 40px)
   Motion: Cards stagger in from bottom with 100ms delay between each. Featured card scales from 0.97 to 1.0.
   
   a. PPC FOUNDATIONS — ₱2,999
      - Eyebrow: "PPC FOUNDATIONS" (uppercase, 0.75rem, #737373)
      - Price: ₱2,999 (JetBrains Mono, 2.25rem, #171717) with "one-time" label (#737373)
      - Description: "Start here if you're new to Amazon ads or want a solid foundation."
      - Feature bullets:
        - 5 core modules (15 lessons)
        - Campaign Builder tool (SP scenarios)
        - Bid Elevator tool (basic scenarios)
        - Quizzes with instant feedback
        - 2 completion badges
        - Certificate of completion
      - CTA button: "Get started" (secondary style — bordered)
      - Fine print: "Pay via GCash, Maya, credit card, or bank transfer"

   b. ACCELERATED MASTERY — ₱5,999 (FEATURED)
      - Same card structure but with: "Most popular" badge (info variant, #1E40AF background)
      - Subtle left border accent: 3px solid #FF6B35
      - Eyebrow: "ACCELERATED MASTERY"
      - Price: ₱5,999
      - Description: "The fastest path to Amazon ads specialist. Everything in Foundations plus the advanced tools."
      - Feature bullets:
        - 8 modules (31 lessons)
        - All 5 interactive tools (full scenario packs)
        - All downloadable resources
        - Session recordings
        - 4 completion badges
        - Priority certificate
      - CTA button: "Get started" (primary style — #FF6B35 filled)
      - Fine print: "Pay via GCash, Maya, credit card, or bank transfer"

   c. ULTIMATE TRANSFORMATION — ₱9,999
      - Eyebrow: "ULTIMATE TRANSFORMATION"
      - Price: ₱9,999
      - Description: "For VAs who want the full package — including live coaching and portfolio review."
      - Feature bullets:
        - Everything in Accelerated Mastery
        - Weekly live classes with Ryan
        - 1-on-1 portfolio review every month
        - Priority certificate
        - All 5 badges
        - Direct message access to Ryan
      - CTA button: "Get started" (secondary style)
      - Fine print: "Pay via GCash, Maya, credit card, or bank transfer"

3. FAQ SECTION:
   - Heading: "Questions"
   - 3 accordion items using <details>/<summary>:
     a. "Do you offer refunds?" — "Yes. Request within 14 days of purchase; we'll review and process within five business days. After 14 days, refunds are case-by-case."
     b. "Is this a subscription?" — "No. One-time payment. You keep access to the course and any future updates while your enrollment is active."
     c. "What if I don't have any Amazon ads experience yet?" — "Start with PPC Foundations. The first three modules build the mental model from scratch — you don't need prior campaign work to follow along."
   - Style: summary has cursor pointer, padding 16px 0, border-bottom 1px #E5E5E0, Space Grotesk 500
   - Content: #404040, padding 16px 0
```

---

## SCREEN 5: STUDENT DASHBOARD

```
Generate a student dashboard for "Project Amazon PH Academy" — the main screen after sign-in.

Layout: Full-width with sidebar navigation on the left (collapsible on mobile).

1. SIDEBAR (240px wide, white background, border-right 1px #E5E5E0):
   - Top: "Project Amazon PH Academy" logotype
   - Nav items (vertical list):
     - "Dashboard" (active — #FF6B35 text + #FFE5D9 background wash)
     - "Courses"
     - "Tools"
     - "Live Classes"
     - "Certificates"
     - "Payments"
   - Each item: 16px Phosphor icon + label, padding 10px 16px, radius 6px
   - Bottom: "Sign out" link

2. MAIN CONTENT (padding 32px, background #FAFAF7):
   - Header: "Welcome, [Name]" (h1) + progress summary below: "12 of 31 lessons complete • 3 in progress" (#737373)
   
   - STATS ROW (4 cards in a row, each card: white, border, radius 6px, padding 20px):
     a. "2,450" (Space Grotesk 600, 1.75rem) + "XP earned" (#737373)
     b. "Level 4" + "Current level"
     c. "12" + "Day streak"
     d. "3" + "Courses"
     Motion: Cards stagger in from bottom with 80ms delay. Numbers count up from 0 over 600ms ease-out.
   
   - COURSES SECTION:
     - Heading: "Courses" (h2, margin-bottom 16px)
     - Course cards in a grid (repeat(auto-fit, minmax(320px, 1fr))):
       Each card: white, border, radius 6px, padding 24px, interactive (hover lift + shadow-sm, transition 200ms ease-out)
       - Top row: Course title (h3) + difficulty badge (right-aligned)
       - Description text (#404040)
       - Progress bar: thin bar (4px height, #F4F3EE background, #FF6B35 fill, radius 2px). Animate width from 0 on mount.
       - Below bar: "12 / 31 lessons" (left) + "39% complete" (right) — both #737373
       Motion: Cards stagger in with 80ms delay between each.
   
   - TOOLS SECTION:
     - Heading: "Tools" (h2)
     - Description: "Practice real Amazon Advertising Console workflows with synthetic data." (#737373)
     - "Open the tools →" link (#FF6B35)
```

---

## SCREEN 6: COURSE DETAIL PAGE

```
Generate a course detail page for "Project Amazon PH Academy".

Layout: Full-width with sidebar (same as dashboard), main content area.

1. SIDEBAR: Same as dashboard (with "Courses" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Dashboard" (link, #737373, small text)
   - Course header:
     - Title: "PPC Foundations" (h1)
     - Description: "Master the fundamentals of Amazon Sponsored Products advertising."
     - Meta row: "Beginner" badge (default) + "5 modules" badge + "15 lessons" badge + "₱2,999 tier" badge
   
   - MODULE LIST (vertical, each module is a section):
     Each module:
     - Module heading: "Module 1: Understanding Amazon Ads" (h2, with module number)
     - Lesson list below (vertical list, each lesson is a row):
       Each lesson row:
       - Left: Checkmark icon (green if complete, gray outline if not) + Lesson title
       - Right: "5 min" badge (info) + "50 XP" badge (success)
       - If locked: Lock icon + "Unlock with PPC Foundations" (#737373)
       - Divider between lessons (1px #E5E5E0)
     - Separator between modules (thicker divider or spacing)
   
   - PROGRESS SECTION (at bottom):
     - "Your progress" heading
     - Progress bar (same style as dashboard)
     - "4 of 15 lessons complete • 27%"
```

---

## SCREEN 7: LESSON PAGE

```
Generate a lesson reading page for "Project Amazon PH Academy".

Layout: Full-width with sidebar, main content with constrained reading width.

1. SIDEBAR: Same as dashboard (with "Courses" active)

2. MAIN CONTENT (max-width 720px, centered in main area):
   - Back link: "← PPC Foundations" (#737373, small)
   - Header:
     - Badges row: "Module 1 · Lesson 3" (default) + "8 min" (info) + "+50 XP" (success)
     - Title: "Sponsored Products: Your First Campaign Type" (h1)
   
   - Article body (reading-optimized):
     - Max-width 65ch
     - Font: Space Grotesk 400, 1rem, line-height 1.6
     - Headings within article: h2 (1.75rem), h3 (1.375rem)
     - Code blocks: JetBrains Mono, #F4F3EE background, padding 16px, radius 4px
     - Lists: standard, with 8px spacing
     - Links: #FF6B35
     - Strong text: font-weight 600
   
   - Actions section:
     - If incomplete: "Mark as complete (+50 XP)" button (primary, #FF6B35)
     - If complete: "Lesson complete" badge (success, green)
   
   - Quiz card (if lesson has quiz):
     - White card, border, padding 24px
     - "Knowledge check" heading
     - "This lesson has a quiz. Pass with 80% or higher to count this lesson as complete." (#404040)
     - "Take the quiz →" button (primary)
   
   - Prev/Next navigation (bottom):
     - Two columns: "Previous" (left) and "Next" (right)
     - Each: direction label (small, #737373) + lesson title (Space Grotesk 500)
     - Arrow icon (CaretLeft/CaretRight)
```

---

## SCREEN 8: QUIZ PAGE

```
Generate a quiz page for "Project Amazon PH Academy".

Layout: Full-width with sidebar, centered content.

1. SIDEBAR: Same as dashboard

2. MAIN CONTENT (max-width 640px, centered):
   - Back link: "← Back to lesson"
   - Header:
     - "Module 1 · Lesson 3" badge
     - "Knowledge check" (h1)
     - "Answer all 5 questions. Pass with 80% or higher to earn completion credit." (#404040)
   
   - Question cards (one per question, vertical stack):
     Each question:
     - Question number + text: "1. What does ACoS measure?" (Space Grotesk 500)
     - 4 answer options as radio buttons:
       a. "Ad Cost of Sale — ad spend divided by ad sales"
       b. "Average Cost of Shopping — total spend per order"
       c. "Ad Click Optimization Score — quality rating"
       d. "Annual Campaign Operating Spend — yearly budget"
     - Each option: radio input + label, padding 12px 16px, border 1px #E5E5E0, radius 4px, full width
     - Selected state: border #FF6B35, background #FFE5D9
     - Correct answer (after submit): green border #0E7C3A, background #DCFCE7
     - Wrong answer (after submit): red border #B91C1C, background #FEE2E2, with explanation text below
     - Explanation text (after submit): "#404040, font-size 0.875rem, margin-top 8px"
   
   - Submit section:
     - "Submit answers" button (primary, full width, disabled until all questions answered). Tactile -1px translateY on :active.
     - After submit: show score "4/5 — 80% — Passed!" or "3/5 — 60% — Not quite"
     - If passed: "Continue to next lesson →" button
     - If failed: "Try again" button
     Motion: Score fades in + scales from 0.95 to 1.0 over 400ms.
```

---

## SCREEN 9: TOOLS INDEX PAGE

```
Generate a tools index page for "Project Amazon PH Academy" — listing all 5 interactive tools.

Layout: Full-width with sidebar, main content.

1. SIDEBAR: Same as dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Header:
     - "Tools" (h1)
     - "Practice real Amazon Advertising Console workflows with synthetic data." (#404040)
   
   - Tool cards (2-column asymmetric grid — NOT equal cards):
     Layout: First tool (Campaign Builder) takes full width as a hero card. Remaining 4 tools in 2x2 grid below.
     Hero card: white, border, radius 6px, padding 32px, interactive (hover lift + shadow-sm)
     - Tool name (h3): "Campaign Builder"
     - Description: "Build SP, SB, SD, and BTV campaign structures step by step."
     - Meta: "5 scenarios" badge + "SP · SB · SD · BTV" badge
     - "Open tool →" link (#FF6B35)
     Grid cards: white, border, radius 6px, padding 24px, interactive
     Motion: Hero card fades in first. Grid cards stagger in with 80ms delay.
   
   - Five tools:
     1. Campaign Builder — "Build SP, SB, SD, and BTV campaign structures step by step." — 5 scenarios
     2. Bid Elevator — "Practice bid optimization across 10 real-world scenarios." — 10 scenarios
     3. Search Term Triage — "Triage 20 search terms per session. Keep, pause, or negate." — 2 scenarios
     4. Listing Audit — "Audit product listings for ad readiness and optimization." — 5 scenarios
     5. Keyword Research — "Research, categorize, and prioritize keywords by intent." — 5 scenarios
```

---

## SCREEN 10: TOOL SCENARIO PAGE (Campaign Builder Example)

```
Generate a tool scenario page for "Project Amazon PH Academy" — Campaign Builder wizard.

Layout: Full-width with sidebar, main content.

1. SIDEBAR: Same as dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Tools" + "Campaign Builder"
   - Header:
     - "Campaign Builder" (h1)
     - "Scenario: Launch a new Sponsored Products campaign for a wireless earbuds product" (subtitle, #404040)
     - Meta: "Step 2 of 5" progress indicator
   
   - PROGRESS STEPS (horizontal, 5 steps):
     Steps: "Campaign type" → "Campaign settings" → "Ad group" → "Keywords" → "Review"
     Current step: #FF6B35 with filled circle
     Completed steps: #0E7C3A with checkmark
     Upcoming: #D4D4D4 with empty circle
     Connected by a thin line between circles
   
   - WIZARD CONTENT (white card, padding 32px):
     - "Campaign settings" heading (h2)
     - Form fields:
       - Campaign name: text input (label above, placeholder "SP-WirelessEarbuds-Launch")
       - Daily budget: number input with ₱ prefix (placeholder "1000")
       - Start date: date input
       - Targeting: radio group ("Automatic" / "Manual")
     - Helper text below fields in #737373 where needed
   
   - NAVIGATION (bottom of card):
     - "Back" (secondary button, left)
     - "Continue to ad group →" (primary button, right)
   
   - SIMULATION PANEL (right side or below, if room):
     - "Your campaign so far" summary
     - Campaign type: "Sponsored Products"
     - Budget: "₱1,000/day"
     - Targeting: "Automatic"
     - This updates as the user progresses through steps
```

---

## SCREEN 11: ADMIN DASHBOARD

```
Generate an admin dashboard for "Project Amazon PH Academy".

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR (240px, white, border-right):
   - Top: "Project Amazon PH Academy" + "Admin" badge (danger variant, small)
   - Nav items:
     - "Dashboard" (active)
     - "Users"
     - "Courses"
     - "Content"
     - "Payments"
     - "Refunds"
     - "Live Classes"
     - "Badges"
     - "Settings"
   - Each item: Phosphor icon + label

2. MAIN CONTENT (padding 32px, #FAFAF7):
   - Header: "Admin Dashboard" (h1) + "Welcome, Ryan" subtitle
   
   - STATS ROW (4 cards):
     a. "127" + "Total users"
     b. "3" + "Published courses"
     c. "5" + "Badges"
     d. "₱284,500" + "Total revenue"
     Motion: Cards stagger in from bottom with 80ms delay. Numbers count up from 0 over 600ms ease-out.
   
   - RECENT ACTIVITY TABLE:
     - Heading: "Recent payments"
     - Table (compact, 40px rows):
       Columns: "Student" | "Tier" | "Amount" | "Date" | "Status"
       Rows:
       - "Juan D." | "Accelerated Mastery" | "₱5,999" | "Jul 10, 2026" | "Paid" (green badge)
       - "Maria S." | "PPC Foundations" | "₱2,999" | "Jul 10, 2026" | "Paid"
       - "Ana R." | "Ultimate" | "₱9,999" | "Jul 9, 2026" | "Paid"
     - Table style: header has bottom border only, left-aligned text, right-aligned numbers, no zebra striping
   
   - QUICK LINKS:
     - "View all users →" | "Manage courses →" | "Review refunds →"
```

---

## SCREEN 12: ADMIN USER MANAGEMENT

```
Generate a user management page for the admin panel of "Project Amazon PH Academy".

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same as admin dashboard (with "Users" active)

2. MAIN CONTENT:
   - Header row:
     - Left: "Users" (h1) + "127 total" count
     - Right: Search input (with magnifying glass icon) + filter dropdown ("All roles" / "Students" / "Admins")
   
   - USERS TABLE:
     Columns: "Name" | "Email" | "Role" | "Level" | "XP" | "Joined" | "Status" | "Actions"
     Rows (5 examples):
     - "Juan Dela Cruz" | "juan@email.com" | "Student" (badge) | "4" | "2,450" | "Jun 15, 2026" | "Active" (green) | "Edit" (ghost button)
     - "Maria Santos" | "maria@email.com" | "Student" | "7" | "8,200" | "May 20, 2026" | "Active" | "Edit"
     - "Ryan Dabao" | "ryan@projectamazonph.com" | "Admin" (info badge) | "1" | "0" | "Jul 1, 2026" | "Active" | "Edit"
     - "Ana Reyes" | "ana@email.com" | "Student" | "2" | "890" | "Jul 5, 2026" | "Active" | "Edit"
     - "Pedro Cruz" | "pedro@email.com" | "Student" | "1" | "150" | "Jul 8, 2026" | "Suspended" (danger badge) | "Edit"
   
   - Pagination: "Showing 1–10 of 127" + "← Previous" "Next →" buttons
```

---

## SCREEN 13: PAYMENTS PAGE (Student)

```
Generate a payments history page for "Project Amazon PH Academy" students.

Layout: Full-width with sidebar, main content.

1. STUDENT SIDEBAR: Same as dashboard (with "Payments" active)

2. MAIN CONTENT:
   - Header: "Payments" (h1) + "Your purchase history" subtitle
   
   - PAYMENT CARDS (vertical stack):
     Each payment: white card, border, padding 24px
     - Top row: Tier name (h3) + Status badge ("Paid" green / "Refunded" danger / "Pending" warning)
     - Amount: "₱5,999" (JetBrains Mono, 1.25rem)
     - Date: "July 10, 2026" + Payment ID: "pay_xxxxx"
     - Payment method: "GCash" or "Maya" or "Credit Card"
     - Actions: "Download receipt" (ghost button) + "Request refund" (ghost button, danger text)
   
   - Empty state (if no payments):
     - "No payments yet" (heading)
     - "Enroll in a course to get started. Pick the tier that matches where you are." (#404040)
     - "See pricing →" button (primary)
```

---

## SCREEN 14: CERTIFICATES PAGE

```
Generate a certificates page for "Project Amazon PH Academy" students.

Layout: Full-width with sidebar, main content.

1. STUDENT SIDEBAR: Same as dashboard (with "Certificates" active)

2. MAIN CONTENT:
   - Header: "Certificates" (h1) + "Your completed course certificates"
   
   - CERTIFICATE CARDS (grid: repeat(auto-fit, minmax(320px, 1fr))):
     Each card: white, border, padding 24px
     - Certificate title: "PPC Foundations — Completed"
     - Date: "Completed July 8, 2026"
     - Verification hash: "abc123def456" (JetBrains Mono, small, #737373)
     - Actions: "Download PDF" (primary button) + "Verify online" (ghost link)
   
   - Empty state:
     - "No certificates yet"
     - "Complete a course to earn your certificate. Each certificate has a unique verification code."
     - "Start learning →" button
```

---

## SCREEN 15: CHECKOUT COMPLETE PAGE

```
Generate a checkout success page for "Project Amazon PH Academy".

Layout: Centered, max-width 480px, vertically centered.

- Background: #FAFAF7
- Card: white, border, padding 48px, radius 6px, centered
- Success checkmark icon (large, #0E7C3A, centered)
- "Payment received" (h1, centered, Space Grotesk 600)
- "Your enrollment in Accelerated Mastery is active. You now have access to all 8 modules, 5 tools, and every resource in the tier." (#404040, centered)
- "₱5,999 paid via GCash" (JetBrains Mono, small, #737373)
- "Go to dashboard →" button (primary, centered)
- "Download receipt" link below (#FF6B35)
```

---

## SCREEN 16: LIVE CLASSES PAGE

```
Generate a live classes page for "Project Amazon PH Academy" students (Ultimate tier).

Layout: Full-width with sidebar, main content.

1. STUDENT SIDEBAR: Same as dashboard (with "Live Classes" active)

2. MAIN CONTENT:
   - Header: "Live Classes" (h1) + "Weekly coaching sessions with Ryan" subtitle
   
   - UPCOMING CLASSES:
     Class card: white, border, padding 24px
     - Title: "Campaign Optimization Workshop"
     - Date/Time: "Thursday, July 17, 2026 at 7:00 PM PST" (JetBrains Mono)
     - Description: "Bring your campaign data. We'll review real accounts and optimize live."
     - Status badge: "Upcoming" (info) or "Live now" (success, pulsing)
     - "Register" button (primary) if not registered, "Registered" badge if already registered
   
   - PAST RECORDINGS (if Ultimate tier):
     - "Recordings" heading
     - List of past sessions with "Watch recording" link
```

---

## SCREEN 17: REFUND REQUEST PAGE

```
Generate a refund request page for "Project Amazon PH Academy" students.

Layout: Full-width with sidebar, centered content.

1. STUDENT SIDEBAR: Same as dashboard

2. MAIN CONTENT (max-width 560px, centered):
   - Back link: "← Payments"
   - Header: "Request a refund" (h1)
   
   - Payment summary card:
     - "Accelerated Mastery — ₱5,999"
     - "Paid July 10, 2026 via GCash"
   
   - Form:
     - Reason field: textarea (label "Reason for refund", placeholder "Tell us why you're requesting a refund")
     - "Submit refund request" button (primary)
     - Fine print: "Refunds are reviewed within 5 business days. You'll receive an email when a decision is made."
```

---

## SCREEN 18: VERIFY CERTIFICATE (Public)

```
Generate a certificate verification page for "Project Amazon PH Academy" — public, no auth.

Layout: Centered, max-width 480px.

- Background: #FAFAF7
- Card: white, border, padding 32px, centered
- "Verify certificate" heading (h1, centered)
- Verification hash displayed: "abc123def456" (JetBrains Mono, centered)
- Certificate details:
  - "Issued to: Juan Dela Cruz"
  - "Course: PPC Foundations"
  - "Completed: July 8, 2026"
  - "Status: Valid" (green badge)
- "This certificate was issued by Project Amazon PH Academy and can be verified at this URL."
```

---

## MULTI-SCREEN FLOW PROMPT

For Stitch's multi-screen prototype feature, use this combined prompt:

```
Create a multi-screen prototype for "Project Amazon PH Academy" — an Amazon PPC training platform.

The prototype should connect these screens with interaction hotspots:

1. LANDING PAGE → Click "Get started" → SIGN UP PAGE
2. LANDING PAGE → Click "Sign in" → SIGN IN PAGE
3. LANDING PAGE → Click "See pricing" → PRICING PAGE
4. SIGN IN PAGE → Submit form → STUDENT DASHBOARD
5. SIGN UP PAGE → Submit form → STUDENT DASHBOARD
6. STUDENT DASHBOARD → Click course card → COURSE DETAIL
7. COURSE DETAIL → Click lesson → LESSON PAGE
8. LESSON PAGE → Click "Take the quiz" → QUIZ PAGE
9. STUDENT DASHBOARD → Click "Tools" → TOOLS INDEX
10. TOOLS INDEX → Click tool card → TOOL SCENARIO
11. PRICING PAGE → Click "Get started" → CHECKOUT (simplified)
12. CHECKOUT → Payment success → CHECKOUT COMPLETE

Design system: Field Manual. Dense, scannable, utilitarian. Off-white #FAFAF7 background, orange #FF6B35 accent. Space Grotesk font. No glassmorphism, no gradients, no decorative elements. Information density is a feature.
```

---

## POST-STITCH WORKFLOW

After generating each screen in Stitch:

1. **Export HTML/CSS** — Stitch generates static HTML with Tailwind
2. **Convert to CSS Modules** — Replace Tailwind classes with design token references from globals.css
3. **Convert to React components** — Wrap in Next.js page components
4. **Wire up data** — Connect to existing server actions and Prisma queries
5. **Test** — Verify against the design brief anti-AI-slop checklist

The Stitch output is the **visual starting point**, not the final product. We adapt the design to our CSS Module system, component library, and server-side data flow.

---

## SCREEN 19: CAMPAIGN BUILDER — FULL WIZARD

```
Generate a multi-step wizard UI for building Amazon ad campaigns in "Project Amazon PH Academy".

Layout: Full-width with student sidebar, main content area.

1. SIDEBAR: Same as student dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Tools" + "Campaign Builder"
   - Scenario brief card (white, border, padding 24px):
     - Badge: "Brief" (info)
     - Title: "Launch a Sponsored Products campaign for wireless earbuds"
     - Description: "Build a complete SP campaign with manual targeting, exact + phrase keywords, and a ₱500/day budget."
     - Allowed info: "Allowed campaign types: Sponsored Products · Sponsored Brands" + "Allowed bid strategies: DYNAMIC_BIDS_DOWN_ONLY · FIXED_BIDS"

   - STEP INDICATOR (horizontal, 5 steps):
     Circles connected by lines. Steps: "Campaign" → "Bidding" → "Ad group" → "Targets" → "Review"
     Current step: filled #FF6B35 circle with white number
     Completed: filled #0E7C3A circle with white checkmark
     Upcoming: outlined #D4D4D4 circle with gray number
     Labels below circles (0.75rem, current step bold)

   - STEP CONTENT (white card, padding 32px):
     
     Step 1 — Campaign settings:
     - Campaign name: text input (label above, placeholder "e.g. Bamboo Cutting Board — Exact Match")
     - Campaign type: 4 selectable cards in a 2x2 grid:
       a. "Sponsored Products" — "Keyword + product targeting. The Amazon default." (selected: #FF6B35 border)
       b. "Sponsored Brands" — "Top-of-search banner with brand creative."
       c. "Sponsored Display" — "On-Amazon + off-Amazon display ads."
       d. "Sponsored TV" — "Prime Video, Twitch, streaming apps. CPM-based."
       Disabled cards: 50% opacity, "Not in scenario" label
     - Start date: date input
     - End date: date input with "(required)" hint
     - Daily budget: number input with ₱ prefix, hint "Allowed: ₱300 – ₱2,000"
     - Targeting type: select dropdown ("Manual" / "Auto")
     
     Step 2 — Bidding:
     - Bid strategy: select dropdown (filtered by scenario constraints)
     - Default bid: number input with ₱ prefix
     
     Step 3 — Ad group:
     - Ad group name: text input (default "Ad Group 1")
     
     Step 4 — Targets (non-BTV):
     - Keywords section:
       - "Add at least 3 keywords" heading
       - Keyword rows: each row has text input + match type select (Broad/Phrase/Exact) + bid input ₱ + remove button
       - "+ Add keyword" ghost button
     - Product targets section:
       - "Add at least 1 product target" heading
       - ASIN input + bid input + remove button
       - "+ Add product target" ghost button
     
     Step 4 — Audiences (BTV only):
     - Audience category: select (In-Market / Lifestyle / Interests / Lookalike / Contextual)
     - Audience details: key-value pair inputs
     - "+ Add audience" ghost button
     
     Step 5 — Review:
     - Summary of all settings in a definition list:
       Campaign name, Type, Budget, Bid strategy, Default bid, Ad group, Keywords count, Product targets count
     - "Submit campaign" primary button

   - NAVIGATION (bottom of card):
     - Left: "Back" secondary button (disabled on step 1)
     - Right: "Continue to [next step] →" primary button

   - Error state: red text below the card
```

---

## SCREEN 20: BID ELEVATOR — KEYWORD TABLE

```
Generate a bid optimization table UI for "Project Amazon PH Academy" Bid Elevator tool.

Layout: Full-width with student sidebar, main content.

1. SIDEBAR: Same as student dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Tools" + "Bid Elevator"
   
   - Scenario header card (white, border, padding 24px):
     - Badge: "Bid Elevator" (info)
     - Title: "Reduce ACoS on a high-spend electronics campaign"
     - Context: "Your wireless earbuds campaign is spending ₱800/day but ACoS is 45%. Target ACoS is 25%. Adjust bids to bring spend in line."
     - 4 stat boxes in a row:
       a. "Daily budget" → "₱1,000" (JetBrains Mono)
       b. "Current daily spend" → "₱800"
       c. "Target ACoS" → "25.0%"
       d. "Rounds remaining" → "2"

   - KEYWORD TABLE (white card, full width):
     Table header row: Keyword | Match | Current bid | Impr | Clicks | Orders | Spend | Sales | ACoS | New bid
     8-10 keyword rows with real data:
     - "wireless earbuds" | Exact | ₱25 | 12,450 | 312 | 18 | ₱6,240 | ₱18,000 | 34.7% | [input ₱20]
     - "bluetooth earbuds" | Phrase | ₱30 | 8,200 | 185 | 8 | ₱4,625 | ₱8,000 | 57.8% | [input ₱18]
     - "wireless headphones" | Broad | ₱15 | 22,100 | 442 | 3 | ₱5,304 | ₱3,000 | 176.8% | [input ₱5]
     - "earbuds for iphone" | Exact | ₱20 | 5,600 | 140 | 22 | ₱2,800 | ₱22,000 | 12.7% | [input ₱22]
     - "cheap earbuds" | Phrase | ₱18 | 15,300 | 306 | 2 | ₱4,590 | ₱2,000 | 229.5% | [input ₱3]
     - etc.
   
     Table styling:
     - 40px row height, left-aligned text, right-aligned numbers
     - Header: bottom border only, #737373 text, 0.875rem
     - JetBrains Mono for all numeric/bid values
     - ACoS column: red text (#B91C1C) if above target ACoS, green (#0E7C3A) if below
     - Changed rows: subtle left border #FF6B35 or background wash #FFE5D9
     - New bid column: number input with ₱ prefix, compact style

   - BUDGET PREVIEW BAR (white card, padding 16px):
     - Left: "Projected daily spend" + value (JetBrains Mono)
     - Center: "Budget headroom" + value (green if positive, red if negative)
     - Right: "Bids changed" + "3 / 10"
     - If over budget: warning message with Warning icon "Total new bids exceed the daily budget. Trim the high-ACoS keywords."

   - SUBMIT ROW:
     - "Submit bids" primary button
     - Hint text: "Tip: the engine compares your new bid against the reference for each keyword. A bid within ±20% of reference is full credit."
```

---

## SCREEN 21: SEARCH TERM TRIAGE — CARD-BASED TRIAGE

```
Generate a search term triage UI for "Project Amazon PH Academy" STR Triage tool.

Layout: Full-width with student sidebar, main content.

1. SIDEBAR: Same as student dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Tools" + "Search Term Triage"
   
   - Scenario header card (white, border, padding 24px):
     - Badge: "Search terms" (info)
     - Title: "Clean up a broad match campaign for kitchen products"
     - Context: "Your Sponsored Products campaign is getting irrelevant clicks. Triage 20 search terms — keep the winners, pause the losers, negate the junk."
     - 3 stat boxes: Daily budget ₱500 | Current spend ₱420 | Target ACoS 30%

   - SUMMARY BAR (white card, padding 16px, horizontal):
     5 stat cells in a row:
     - "Keep" → 0 (green #0E7C3A)
     - "Optimize" → 0 (blue #1E40AF)
     - "Pause" → 0 (gray #737373)
     - "Negate" → 0 (amber #B45309)
     - "Pending" → 20 / 20 (red if > 0)

   - SEARCH TERM CARDS (vertical stack, one card per term):
     Each card (white, border, padding 20px):
     - TOP ROW:
       - Left: search term in monospace (JetBrains Mono, e.g. "best cheap kitchen knife set")
       - Below term: match type badge (Broad/Phrase/Exact) + "via [matched keyword]" in #737373
       - Right: metric chips in a row:
         Impr: 3,200 | Clicks: 85 | CTR: 2.6% | Spend: ₱1,275 | CPC: ₱15 | Orders: 0 | Sales: ₱0 | ACoS: —
     
     - ACTION ROW (5 buttons in a horizontal group):
       - "Keep" (ghost, default)
       - "Optimize bid" (ghost, default)
       - "Pause" (ghost, default)
       - "Negate exact" (ghost, default)
       - "Negate phrase" (ghost, default)
       Selected button: filled with variant color (Keep=green wash, Optimize=blue wash, Pause=gray wash, Negate=amber wash)
     
     - SUB-FIELD (appears conditionally):
       - If "Optimize bid": number input "New bid (₱)" with ₱ prefix
       - If "Negate exact/phrase": text input "Negative keyword to add" pre-filled with the search term
     
     - Card border-left changes color based on decision: green=keep, blue=optimize, gray=pause, amber=negate, default=no decision

   - SUBMIT ROW:
     - "Submit triage (15 / 20)" primary button (disabled if pending > 0)
     - Error if pending: "Triage all 5 remaining search term(s) before submitting."
     - Hint: "Tip: ACoS above target + zero orders is a negate. Decent ACoS + a few orders is optimize-bid. Anything converting strongly is keep."
```

---

## SCREEN 22: LISTING AUDIT — FLAG + REVISE

```
Generate a listing audit UI for "Project Amazon PH Academy" Listing Audit tool.

Layout: Full-width with student sidebar, main content.

1. SIDEBAR: Same as student dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Tools" + "Listing Audit"
   
   - CURRENT LISTING card (white, border, padding 24px):
     - Badge: "Current listing" (info)
     - Title: "Bamboo Cutting Board — Premium Kitchen Essential"
     - Subtitle: "Kitchen · ASIN B08N5WRWNW · AOV ₱1,200"
     - Definition list (label-value pairs, 2-column grid):
       Title: "Bamboo Cutting Board — Premium Kitchen Essential"
       Bullets (3/5): "1. 100% organic bamboo..." / "2. Knife-friendly surface..." / "3. Easy to clean..."
       Description: "High-quality bamboo cutting board..."
       Images: 3
       A+ content: No
       Price: ₱1,200
       Reviews: 47 · 4.2★

   - STEP 1 — FLAG ISSUES card (white, border, padding 24px):
     - Heading: "Step 1 — flag the issues"
     - Description: "Check every field you think has a problem."
     - 7 checkbox items in a vertical list:
       Each item: checkbox + severity icon (Check green / Warning amber / X red) + field name (bold) + description
       - [ ] Title — "Needs work — Missing brand name in title"
       - [ ] Bullets — "Critical issue — Only 3 of 5 bullets used"
       - [ ] Description — "Looks good — Description is complete"
       - [ ] Images — "Critical issue — Only 3 images, minimum 5 recommended"
       - [ ] A+ content — "Needs work — No A+ content installed"
       - [ ] Pricing — "Looks good — Price is competitive"
       - [ ] Reviews — "Needs work — Only 47 reviews, need 100+ for social proof"
     Checked state: background wash matching severity color

   - STEP 2 — REVISE LISTING card (white, border, padding 24px):
     - Heading: "Step 2 — revise the listing"
     - Description: "Edit the fields you think need fixing."
     - Form fields:
       - Title: text input (full width, max 200 chars)
       - Bullets: up to 5 text inputs with remove (X) button + "Add bullet" ghost button
       - Description: textarea (4 rows, max 2000 chars)
       - Image count: number input (0-9)
       - Has A+ content: checkbox
       - Price: number input with ₱ prefix
       - Review count: number input
       - Average rating: number input (0-5, step 0.1)

   - SUBMIT ROW:
     - "Submit listing" primary button
     - Hint: "Tip: the engine compares your selection against the reference findings."
```

---

## SCREEN 23: KEYWORD RESEARCH — CATEGORIZATION

```
Generate a keyword research categorization UI for "Project Amazon PH Academy" Keyword Research tool.

Layout: Full-width with student sidebar, main content.

1. SIDEBAR: Same as student dashboard (with "Tools" active)

2. MAIN CONTENT:
   - Breadcrumb: "← Tools" + "Keyword Research"
   
   - Seed term card (white, border, padding 24px):
     - Badge: "Seed term" (info)
     - Title: "bamboo cutting board" (JetBrains Mono)
     - Subtitle: "Premium Bamboo Kitchen Set · Kitchen & Dining"
     - Instruction: "Categorize each candidate keyword as Primary (target first), Secondary (worth bidding on), or Negative (irrelevant — add to the negative list)."

   - SUMMARY BAR (white card, padding 16px):
     5 stat cells: Primary 0 | Secondary 0 | Negative 0 | Unclassified 15 | Total 15

   - KEYWORD CANDIDATE LIST (white card, vertical stack):
     Each candidate (border-bottom separator):
     - Left column:
       - Keyword text (Space Grotesk 500): "bamboo cutting board large"
       - Metric chips in a row:
         Relevance: 92% | Volume: 78% | Competition: 45%
         (Each chip: label in #737373, value in JetBrains Mono)
       - Optional note input: "Optional note (e.g. why you flagged it as negative)"
     - Right column:
       - 3 radio buttons in a group: "Primary" | "Secondary" | "Negative"
       - Selected: filled with variant color (Primary=green, Secondary=blue, Negative=amber)
       - Unselected: ghost/outlined

     15 keyword candidates:
     - "bamboo cutting board large" (Relevance: 92%, Volume: 78%, Competition: 45%)
     - "wooden cutting board" (Relevance: 65%, Volume: 85%, Competition: 72%)
     - "plastic cutting mat" (Relevance: 12%, Volume: 60%, Competition: 55%)
     - "kitchen knife set" (Relevance: 35%, Volume: 90%, Competition: 80%)
     - "bamboo cheese board" (Relevance: 78%, Volume: 42%, Competition: 30%)
     - etc.

   - SUBMIT ROW:
     - "Submit categorization" primary button (disabled if unclassified > 0)
     - Error if unclassified: "Classify all 5 remaining keyword(s) before submitting."
     - Hint: "Tip: relevance + volume is a starting heuristic, not a rule. A high-volume keyword that's only 5% relevant is a negative."
```

---

## SCREEN 24: TOOL RESULT / GRADING SCREEN

```
Generate a grading result screen for "Project Amazon PH Academy" tools.

Layout: Full-width with student sidebar, centered content.

1. SIDEBAR: Same as student dashboard (with "Tools" active)

2. MAIN CONTENT (max-width 640px, centered):
   - Score display (large, centered):
     - Number: "85" (Space Grotesk 700, 4rem)
     - Label: "/ 100" (#737373)
     - Below: "Passed!" badge (success, green) or "Not quite" badge (danger, red)
     - Motion: Number counts up from 0 to 85 over 800ms ease-out. Badge fades in after count completes (800ms delay).
   
   - Overall feedback card (white, border, padding 24px):
     - "Campaign Builder — Launch a wireless earbuds SP campaign"
     - Feedback text: "Strong campaign structure. Your keyword selection covers the main search terms well. The bid strategy matches the scenario constraints. Two areas to improve: add one more product target, and consider phrase match for the broad keywords."
   
   - CRITERIA BREAKDOWN (vertical stack):
     Each criterion (border-bottom separator):
     - Left: criterion name + passed/failed icon
     - Right: score "18 / 20" (JetBrains Mono)
     - Below: feedback text (#404040, 0.875rem)
     Motion: Criteria cascade in with 60ms stagger between each. Each slides up from 4px below + fades in.
     
     Example criteria:
     - ✓ Campaign type correct (20/20)
     - ✓ Budget within range (20/20)
     - ✓ Bid strategy appropriate (18/20) — "FIXED_BIDS works but DYNAMIC_BIDS_DOWN_ONLY is more common for new SP campaigns"
     - ✓ Keyword count meets minimum (15/20) — "Add one more keyword to reach the scenario minimum of 4"
     - ✗ Product targets (12/20) — "Only 1 product target. The scenario recommends 2+ for SP campaigns"
   
   - ACTIONS:
     - "Try again" secondary button (left)
     - "Back to tools →" ghost link (right)
```

---

## SCREEN 25: ADMIN — USERS LIST

```
Generate a user management list page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR (240px, white, border-right):
   - Top: "Project Amazon PH Academy" + "Admin" badge
   - Nav: Dashboard (active: no), Users (active: yes, #FF6B35), Courses, Content, Payments, Refunds, Live Classes, Badges, Resources, Analytics, Settings, Audit Log
   - Each item: Phosphor icon + label

2. MAIN CONTENT (padding 32px, #FAFAF7):
   - Header row:
     - Left: "Users" (h1) + "127 total" (#737373)
     - Right: "Add user" primary button (ghost style — secondary)
   
   - FILTER BAR:
     - Search input (magnifying glass icon, placeholder "Search by name or email...")
     - Filter dropdown: "All roles" / "Students" / "Instructors" / "Admins"
     - Filter dropdown: "All statuses" / "Active" / "Suspended" / "Deleted"
     - Date range: "From" date + "To" date
   
   - USERS TABLE (white card, full width):
     Columns: ☐ (checkbox) | Name | Email | Role | Level | XP | Joined | Status | ⋮ (actions)
     10 rows with realistic data:
     - ☐ "Juan Dela Cruz" | "juan@email.com" | Student badge | "4" | "2,450" | "Jun 15, 2026" | Active (green) | ⋮
     - ☐ "Maria Santos" | "maria@email.com" | Student | "7" | "8,200" | "May 20, 2026" | Active | ⋮
     - ☐ "Ryan Dabao" | "ryan@projectamazonph.com" | Admin (info badge) | "1" | "0" | "Jul 1, 2026" | Active | ⋮
     - ☐ "Ana Reyes" | "ana@email.com" | Student | "2" | "890" | "Jul 5, 2026" | Active | ⋮
     - ☐ "Pedro Cruz" | "pedro@email.com" | Student | "1" | "150" | "Jul 8, 2026" | Suspended (danger) | ⋮
     - etc.
     
     Table styling:
     - 40px rows, left-aligned text, right-aligned numbers
     - Header: bottom border only, #737373
     - Checkbox column: 40px width
     - Actions column: three-dot menu (ghost button)
     - Hover row: #F4F3EE wash
   
   - BULK ACTIONS BAR (appears when items selected):
     - "12 users selected" label
     - "Export CSV" ghost button
     - "Suspend" ghost button (danger text)
     - "Delete" ghost button (danger text)
   
   - PAGINATION:
     - "Showing 1–10 of 127" (#737373)
     - "← Previous" "Next →" buttons (secondary, disabled as needed)
     - Page numbers: 1 2 3 ... 13
```

---

## SCREEN 26: ADMIN — USER DETAIL

```
Generate a user detail page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Users" active)

2. MAIN CONTENT:
   - Breadcrumb: "Users / Maria Santos"
   
   - Header row:
     - Left: "Maria Santos" (h1) + metadata: "maria@email.com • Student • Active since May 2026"
     - Right: "Edit" secondary button + "Suspend" ghost button (danger text) + "Delete" ghost button (danger text)
   
   - TABS:
     [Overview] [Enrollments] [Progress] [Activity]
     Active tab: #FF6B35 bottom border, bold text
   
   - TAB CONTENT (Overview):
     - Stats row (4 cards):
       a. "Level 7" + "Current level"
       b. "8,200" + "Total XP"
       c. "45" + "Day streak"
       d. "2" + "Courses enrolled"
     
     - Account info card:
       Email verified: Yes (green badge)
       Last active: July 10, 2026 at 3:45 PM
       Role: Student
       Status: Active
   
   - TAB CONTENT (Enrollments):
     - Table: Course | Tier | Enrolled | Status | Amount
     - "PPC Foundations" | "PPC Foundations" | "Jun 1, 2026" | "Active" | "₱2,999"
     - "Accelerated Mastery" | "Accelerated Mastery" | "Jul 5, 2026" | "Active" | "₱5,999"
   
   - TAB CONTENT (Progress):
     - Course progress bars with lesson completion
     - Badges earned list
     - Certificates list
   
   - TAB CONTENT (Activity):
     - Audit log entries for this user
     - Table: Action | Details | Timestamp
     - "Enrolled in PPC Foundations" | "Payment ₱2,999 via GCash" | "Jun 1, 2026 10:15 AM"
     - "Completed Lesson 1.3" | "Sponsored Products: Your First Campaign Type" | "Jun 3, 2026 11:20 PM"
```

---

## SCREEN 27: ADMIN — COURSES LIST

```
Generate a course management list page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Courses" active)

2. MAIN CONTENT:
   - Header: "Courses" (h1) + "Create course" primary button
   
   - COURSE CARDS (vertical stack, not grid):
     Each course (white card, border, padding 24px):
     - Top row: Course title (h3) + Status badge ("Published" green / "Draft" warning) + Difficulty badge
     - Description text (#404040)
     - Stats row: "9 modules" · "31 lessons" · "127 enrollments" · "₱2,999"
     - Actions: "Edit" secondary button + "View" ghost link + "Manage modules" ghost link
   
   - Three courses:
     1. "PPC Foundations" — Published · Beginner · 9 modules, 31 lessons, 127 enrollments, ₱2,999
     2. "Accelerated Mastery" — Published · Intermediate · 12 modules, 45 lessons, 89 enrollments, ₱5,999
     3. "Ultimate Transformation" — Published · Advanced · 15 modules, 60 lessons, 34 enrollments, ₱9,999
```

---

## SCREEN 28: ADMIN — COURSE EDIT (Modules & Lessons)

```
Generate a course editor page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Courses" active)

2. MAIN CONTENT:
   - Breadcrumb: "Courses / PPC Foundations"
   
   - Header: "PPC Foundations" (h1) + "Edit" button + "Published" badge + "Preview" ghost link
   
   - TABS: [Overview] [Modules] [Lessons] [Pricing]
   
   - TAB CONTENT (Modules):
     - Module list (vertical, drag-to-reorder handle on left):
       Each module:
       - Drag handle (⠿ icon) + Module number + Title + lesson count + "Edit" ghost button + "Delete" ghost button (danger)
       - "Module 1: Understanding Amazon Ads" · 4 lessons · Edit · Delete
       - "Module 2: Your First Campaign" · 3 lessons · Edit · Delete
       - "Module 3: Keyword Research" · 4 lessons · Edit · Delete
       - etc.
     
     - "+ Add module" ghost button at bottom
   
   - TAB CONTENT (Lessons — for Module 1):
     - Module heading: "Module 1: Understanding Amazon Ads"
     - Lesson list:
       Each lesson row:
       - Lesson number + Title + Status badge (Published/Draft) + "Edit" ghost button
       - "1.1 What Is Amazon Advertising?" · Published · Edit
       - "1.2 Sponsored Products vs Sponsored Brands" · Published · Edit
       - "1.3 Your First Campaign Type" · Published · Edit
       - "1.4 Common Mistakes to Avoid" · Draft · Edit
     
     - "+ Add lesson" ghost button
```

---

## SCREEN 29: ADMIN — PAYMENTS LIST

```
Generate a payment operations page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Payments" active)

2. MAIN CONTENT:
   - Header: "Payments" (h1) + stats: "₱284,500 total revenue" · "23 transactions" · "3 refunds"
   
   - FILTER BAR:
     - Search: "Search by student or transaction ID..."
     - Filter: "All tiers" / "PPC Foundations" / "Accelerated Mastery" / "Ultimate"
     - Filter: "All statuses" / "Paid" / "Refunded" / "Pending"
     - Date range
   
   - PAYMENTS TABLE:
     Columns: Student | Tier | Amount | Method | Date | Status | ⋮
     Rows:
     - "Juan D." | "Accelerated Mastery" | "₱5,999" | "GCash" | "Jul 10, 2026" | Paid (green) | ⋮
     - "Maria S." | "PPC Foundations" | "₱2,999" | "Maya" | "Jul 10, 2026" | Paid | ⋮
     - "Ana R." | "Ultimate" | "₱9,999" | "Credit Card" | "Jul 9, 2026" | Paid | ⋮
     - "Pedro C." | "PPC Foundations" | "₱2,999" | "GCash" | "Jul 8, 2026" | Refunded (danger) | ⋮
     - etc.
   
   - Pagination
```

---

## SCREEN 30: ADMIN — REFUNDS LIST + DETAIL

```
Generate a refund management page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Refunds" active)

2. MAIN CONTENT:
   - Header: "Refunds" (h1) + "5 pending" warning badge + "12 processed"
   
   - REFUNDS TABLE:
     Columns: Student | Tier | Amount | Reason | Requested | Status | ⋮
     Rows:
     - "Pedro C." | "PPC Foundations" | "₱2,999" | "Course didn't match expectations" | "Jul 9, 2026" | Pending (warning) | ⋮
     - "Lisa M." | "Accelerated Mastery" | "₱5,999" | "Can't afford the payment" | "Jul 8, 2026" | Pending | ⋮
     - "Jose R." | "PPC Foundations" | "₱2,999" | "Duplicate purchase" | "Jul 5, 2026" | Approved (green) | ⋮
     - "Ana B." | "Ultimate" | "₱9,999" | "Changed my mind" | "Jul 3, 2026" | Denied (danger) | ⋮

3. REFUND DETAIL (when clicking a row):
   - Breadcrumb: "Refunds / Pedro Cruz"
   - Student info: "Pedro Cruz • pedro@email.com"
   - Payment info: "PPC Foundations • ₱2,999 • Paid July 8, 2026 via GCash"
   - Reason: "Course didn't match expectations. I thought it would cover Sponsored Brands in depth."
   - Requested: "July 9, 2026 at 2:15 PM"
   
   - DECISION FORM:
     - "Approve" primary button (green) + "Deny" secondary button (danger)
     - Admin notes textarea: "Add notes about this decision..."
     - If approving: "Refund amount: ₱2,999" + confirmation checkbox "I confirm this refund should be processed via PayMongo"
```

---

## SCREEN 31: ADMIN — ANALYTICS DASHBOARD

```
Generate an analytics dashboard for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Analytics" active)

2. MAIN CONTENT:
   - Header: "Analytics" (h1) + date range selector: "Last 30 days" / "Last 7 days" / "All time"
   
   - SUB-NAV: [Enrollments] [Engagement] [Content] [Revenue]
   
   - ENROLLMENTS TAB:
     - Funnel visualization (horizontal bars):
       Visits: 2,450 → Signups: 312 (12.7%) → Paid: 127 (40.7%) → Active: 89 (70.1%)
       Each stage: label, count, percentage, horizontal bar (width proportional)
     
     - Tier breakdown:
       PPC Foundations: 67 (53%) | Accelerated Mastery: 42 (33%) | Ultimate: 18 (14%)
       Horizontal stacked bar chart
   
   - REVENUE TAB:
     - MRR card: "₱284,500" (total revenue)
     - Revenue by tier (bar chart):
       PPC Foundations: ₱200,933
       Accelerated Mastery: ₱251,958
       Ultimate: ₱179,982
     - Refund rate: "2.4%" (green, below 5% target)
     - Recent transactions list (last 5)
   
   - CONTENT TAB:
     - Module completion rates (bar chart):
       Module 1: 89% | Module 2: 72% | Module 3: 65% | Module 4: 58% | Module 5: 45%
     - Drop-off points: "Module 4 → 5 has the biggest drop (58% → 45%)"
     - Average time per lesson: "8.2 minutes"
```

---

## SCREEN 32: ADMIN — BADGES MANAGEMENT

```
Generate a badge management page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Badges" active)

2. MAIN CONTENT:
   - Header: "Badges" (h1) + "Create badge" primary button
   
   - BADGE CARDS (grid: repeat(auto-fit, minmax(280px, 1fr))):
     Each badge card (white, border, padding 24px):
     - Badge icon (48x48, colored circle with Phosphor icon)
     - Badge name (h3): "Campaign Builder"
     - Description: "Build 3 complete campaign structures"
     - Criteria: "Complete 3 Campaign Builder scenarios with passing score"
     - Tier: "PPC Foundations" badge
     - Earned by: "89 students"
     - Actions: "Edit" ghost button + "Delete" ghost button (danger)
   
   - 5 seeded badges:
     1. "Campaign Builder" — "Build 3 complete campaign structures" — 89 earned
     2. "Bid Master" — "Complete 5 Bid Elevator scenarios" — 67 earned
     3. "STR Expert" — "Triage 50+ search terms correctly" — 45 earned
     4. "Listing Pro" — "Audit and revise 3 product listings" — 34 earned
     5. "Keyword Wizard" — "Categorize 100+ keywords accurately" — 23 earned
```

---

## SCREEN 33: ADMIN — LIVE CLASSES MANAGEMENT

```
Generate a live class management page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Live Classes" active)

2. MAIN CONTENT:
   - Header: "Live Classes" (h1) + "Schedule class" primary button
   
   - UPCOMING CLASSES:
     Table: Title | Date | Time | Registrations | Status | ⋮
     - "Campaign Optimization Workshop" | "Jul 17, 2026" | "7:00 PM PST" | "12 / 30" | Upcoming (info) | ⋮
     - "Keyword Research Deep Dive" | "Jul 24, 2026" | "7:00 PM PST" | "8 / 30" | Upcoming | ⋮
   
   - PAST CLASSES:
     Table: Title | Date | Attendees | Recording | ⋮
     - "Sponsored Brands Masterclass" | "Jul 10, 2026" | "18" | "View recording" | ⋮
     - "Q3 Strategy Session" | "Jul 3, 2026" | "22" | "View recording" | ⋮
```

---

## SCREEN 34: ADMIN — SETTINGS

```
Generate a settings page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Settings" active)

2. MAIN CONTENT:
   - Header: "Settings" (h1)
   
   - SUB-NAV: [Branding] [Pricing] [Email] [Integrations]
   
   - BRANDING TAB:
     - Logo upload area (dashed border, 200x80px)
     - Primary color: color picker (#FF6B35)
     - App name: "Project Amazon PH Academy" text input
     - Tagline: "Amazon advertising training for Filipino VAs" textarea
   
   - PRICING TAB:
     - Tier editor (3 cards):
       Each tier:
       - Tier name (read-only)
       - Price input: ₱ [2,999]
       - Features textarea (one per line)
       - "Save changes" button per tier
     - Warning: "Price changes only affect new purchases. Existing enrollments keep their original price."
   
   - EMAIL TAB:
     - Sender name: "Project Amazon PH Academy"
     - Sender email: "noreply@amphacademy.ph"
     - Template previews: Welcome, Payment confirmation, Refund approved
   
   - INTEGRATIONS TAB:
     - PayMongo: API key input (masked), Webhook secret input (masked), "Test connection" button
     - Sentry: DSN input, "Test connection" button
     - Status indicators: green dot = connected, red dot = not configured
```

---

## SCREEN 35: ADMIN — AUDIT LOG

```
Generate an audit log page for "Project Amazon PH Academy" admin panel.

Layout: Full-width with admin sidebar, main content.

1. ADMIN SIDEBAR: Same (with "Audit Log" active)

2. MAIN CONTENT:
   - Header: "Audit Log" (h1) + "Export CSV" ghost button
   
   - FILTER BAR:
     - Search: "Search by action or entity..."
     - Filter: "All actions" / "user.*" / "course.*" / "payment.*" / "refund.*"
     - Filter: "All actors" (dropdown of admin users)
     - Date range
   
   - AUDIT TABLE:
     Columns: Timestamp | Actor | Action | Entity | Details | IP
     Rows:
     - "Jul 10, 3:45 PM" | "Ryan D." | "user.suspend" | "User: Pedro Cruz" | "Reason: TOS violation" | "192.168.1.1"
     - "Jul 10, 2:15 PM" | "Ryan D." | "refund.approve" | "Payment: pay_xxx" | "₱2,999 refunded via GCash" | "192.168.1.1"
     - "Jul 10, 1:30 PM" | "System" | "enrollment.create" | "User: Ana R." | "PPC Foundations, ₱2,999" | "—"
     - "Jul 9, 11:00 AM" | "Ryan D." | "course.publish" | "Course: PPC Foundations" | "Status: draft → published" | "192.168.1.1"
   
   - Timestamp: JetBrains Mono, #737373
   - Actor: name + role badge
   - Action: monospace, color-coded by namespace (user=info, payment=success, refund=warning, course=default)
   - Pagination
```
