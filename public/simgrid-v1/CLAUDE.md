# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Project Amazon PH Academy — SimGrid**: a multi-page static webapp that consolidates twelve
Amazon PPC training simulators under one brand. Each tool teaches/tests a different Amazon
Seller Central / Ads workflow (ad console, keyword research, search-term triage, bulk file
upload, listing optimization, budget pacing). It's plain HTML/CSS/JS — no framework, no
build step, no backend. `package.json` exists only for the test suite (`npm test`) and the
Electron packaging; nothing needs compiling before deploy.

Live GitHub Pages site: https://projectamazonph.github.io/amazon-ph-simulators/

**Shared baseline for agent sessions: read [PROJECT-CONTEXT.md](PROJECT-CONTEXT.md)** for the
verified inventory, the limits of each quality gate, and the known hazards (large inline data
literals, positional quiz IDs, file-count-pinned tests). Keep it current when those change.

## Running the site

No build/install step. Serve the repo root as static files:

```bash
python -m http.server 8080
# then open http://localhost:8080/
```

Opening the HTML files directly (`file://`) also works, but serving is recommended for
full font/asset fidelity. Deployment is automatic: `.github/workflows/deploy.yml` pushes
the repo root straight to GitHub Pages on every push to `master` — there is nothing to
compile, bundle, or transpile before deploying.

Core simulator behavior has a Node test suite. Run it before shipping simulator changes:

```bash
npm test
```

There is no linter or formatter configured in this repo. Also verify affected static pages
in a browser when touching UI layout or interaction.

## Architecture

```
index.html           # Hub ("SimGrid") — tool grid, mission panel, principles
ad-console.html      # Tool: AdConsole Pro
keyword-lab.html     # Tool: Keyword Lab
search-triage.html   # Tool: Search Term Triage
bulk-file.html       # Tool: Bulk File Simulator
listing.html         # Tool: BuyBox Dojo
  pacing-deck.html       # Tool: Pacing Deck
  sqp-studio.html        # Tool: SQP Studio
  bid-decisions.html     # Tool: Bid Decisions
  campaign-architect.html # Tool: Campaign Architect
  account-audit.html     # Tool: Account Audit
  client-onboarding.html # Tool: Client Onboarding
  capstone-sequence.html # Tool: Capstone Sequence
  assets/
  tokens.css         # Design-token single source of truth (CSS custom properties)
  skin.css            # Aggressive override layer — forces every tool onto the unified theme
  shell.css           # Top bar + footer chrome
  shell.js            # Injects chrome, builds nav, applies the skin
  hub.css              # Hub-page-only layout
  decision-simulator-core.js # Shared scoring contract for final-batch decision simulators
  decision-simulator-page.js # Shared browser renderer for final-batch decision simulators
  decision-simulator.css     # Shared layout for final-batch decision simulators
```

Each tool page keeps its HTML structure and behavior in the page, while presentation is
externalized into shared and simulator-specific stylesheets. The pages originated as
standalone chat-export prototypes, but the design-system pass removed page-level style
blocks and centralized brand fonts. Third-party browser libraries are **vendored** into
`assets/vendor/` (Tailwind Play CDN, Chart.js, SheetJS) so the Electron installer works offline;
`tests/vendor-assets.test.cjs` pins their hashes and fails on any new remote `<script src>`.
Brand fonts are self-hosted too: `assets/fonts.css` declares 24 Fontsource woff2 faces from
`assets/fonts/files/` (latin + latin-ext), so a page load makes **zero network requests** — verified
in headless Edge. Keep it that way: no remote URL may return to `assets/fonts.css`, and `url()`
paths resolve relative to that stylesheet, not the repo root.

### How the unification (shell + skin) works

This is the one piece of cross-cutting architecture that spans every file — read this before
touching chrome, nav, or theming on any tool page:

1. Every tool page links `assets/shell.css` and `assets/shell.js` (with `defer`) near the end
   of `<head>`/start of `<body>`, _after_ its own CSS/fonts.
2. On load, `shell.js`:
   - injects `assets/tokens.css` and `assets/skin.css` into `<head>` if not already present,
   - adds the `pha-skin` class to `<body>` (skipped on the hub, which has its own styling),
   - auto-injects the `.pha-topbar` and `.pha-footer` chrome if the page doesn't already have
     them, built from a hard-coded `TOOLS` registry at the top of `shell.js`,
   - wraps the tool's own body content in a `.pha-skin-wrap` div,
   - builds/marks the nav links across tools.
3. `skin.css` loads after the tool's native CSS and overrides colors/fonts/borders/spacing on
   common component patterns (buttons, cards, tables, inputs, chips) — but deliberately
   preserves the tool's own layout (`display`, `position`, sizing, grid/flex templates). The
   tool's JS and DOM structure are never touched, only re-skinned visually.
4. A page identifies itself via `data-pha-tool="<id>"` on `<body>` (e.g.
   `data-pha-tool="bulk-file"`); `shell.js` falls back to matching on filename if that
   attribute is absent.

**Adding a new tool page**: drop a new HTML file with `data-pha-tool="your-id"` on `<body>`,
link `assets/shell.css` and `assets/shell.js`, and add an entry to the `TOOLS` array in
`assets/shell.js` (id, name, tag, file). The shared chrome and skin pick it up automatically.
For new simulator logic, prefer a small tested core module in `assets/*-core.js` and keep the
HTML page focused on UI rendering, local state, and event wiring. Reference examples:
`sqp-studio.html` with `assets/sqp-studio-core.js`, `bid-decisions.html` with
`assets/bid-decisions-core.js`, and the shared final-batch pattern used by
`campaign-architect.html`, `account-audit.html`, `client-onboarding.html`, and
`capstone-sequence.html`.
There is also a runtime registration point, `window.APHSimHub.register(manifest)`, mentioned
in the hub's brand docs for dynamically-added simulators.

### Design system ("Amazon Pro")

All colors, spacing, and type live in `assets/tokens.css` as CSS custom properties
(`--c-navy-2`, `--c-orange`, `--c-bg`, `--c-ink`, `--sp-1`…`--sp-16`, etc.) — treat this as the
single source of truth and prefer adding/reusing a token over hard-coding a color or spacing
value, especially in `skin.css` or `shell.css`. Typography: **Archivo** (display), **PT Sans**
(body), **IBM Plex Mono** (technical/mono), **Barlow Condensed** (tight UI labels). Pages use
the shared Fontsource bundle; do not add page-specific font providers or Google Fonts.

### Brand/content conventions

- Parent brand: "Project Amazon PH Academy"; hub name: "SimGrid".
- Tone: confident, training-focused, operator vocabulary (campaigns, ad groups, match types,
  day-parting, ACoS, TACoS, search-term harvest). No demo/placeholder-feeling data, no
  participation-trophy UX.
- Source provenance: each tool originated from a distinct chat-export JSON conversation
  (listed in README.md) and was individually audited/re-skinned — this explains why each tool
  has different internal CSS/JS conventions before the shell/skin layer unifies them visually.
