# PROJECT-CONTEXT.md — shared baseline for agent sessions

Purpose: let a new session start from verified facts instead of re-deriving them.
Keep this file short and correct; if a claim below stops matching the repo, fix it here.

Last reconciled against the working tree: 2026-09-24.

## What ships

Two surfaces from one static tree — no framework, no build step, no backend:

1. **GitHub Pages** — `.github/workflows/deploy.yml` publishes the repo root on every push
   to `master`.
2. **Windows installer** — Electron + NSIS, `desktop/main.cjs`, version `1.2.4`,
   packaged by `package.json` `build.files`.

**Current product priority: desktop/offline first, then mobile web.** The installer is the
paid product; a page that needs network to render is a defect there, not a nice-to-have.

## Inventory (verified)

- 216 tracked `.html` files; 25 at the repo root.
- **Tool count, settled:** `assets/shell.js` `TOOLS` has 13 entries — 12 simulators plus
  `ppc-coach` (a teaching companion, not a simulator). "Twelve tools" in `CLAUDE.md` and "~15
  simulator pages" elsewhere both refer to this same set.
- `assets/` holds 58 files; 25 of them are `.js`.
- 32 test files in `tests/` (317 tests, `node --test tests/*.test.cjs`).
- Course content exists in three places: inline `MODULES` in `ppc-coach.html`,
  `assets/curriculum-manifest.js` (12 modules, `m0`..`m11`), and `coach-decks/`.

## Quality gates and their limits

Run the suite before shipping simulator changes:

```bash
node --test tests/*.test.cjs     # npm test fails under PowerShell (stderr notice + Stop)
```

- `tests/page-script-syntax.test.cjs` extracts every inline `<script>` from every HTML page
  in the tree and parses it (`vm.Script`) — JSON-LD blocks are validated as JSON. It fails
  closed on a suspiciously small scan, so it cannot pass by finding nothing.
- `tests/coach-curriculum-alignment.test.cjs` extracts the `MODULES` literal from
  `ppc-coach.html` and pins it to the manifest.
- `tests/vendor-assets.test.cjs` pins the size and SHA-256 of each file in `assets/vendor/` and
  fails if any page adds a remote `<script src>`. Upgrading a library means editing the hash in
  both that test and `assets/vendor/README.md`.
- `tests/local-image-assets.test.cjs` bans third-party artwork URLs, keeps `assets/img/` inside a
  400 KB budget, and pins `IMG` key liveness in both directions (see Known hazards).
- `tests/csp-fontsource.test.cjs` pins the 24 self-hosted faces, resolves each `url()` the way a
  browser does, checks woff2 magic bytes, forbids any network URL in `assets/fonts.css`, budgets the
  directory at 600 KB, and requires latin-ext range coverage per family.
- `tests/app-icon.test.cjs` parses both ICO containers, requires the installer's 16–256 ladder and the
  favicon's 16–48 ladder, asserts the four shared entries are byte-identical, requires every root product
  page to declare a page-relative icon, and checks `build.win.icon` points at a real file.
- `tests/desktop-smoke.test.cjs` is the only gate that **runs** a page: it launches headless
  Edge/Chrome and loads all 20 root product pages over `file://`, failing on an uncaught exception,
  a failed subresource request, any response ≥400, an undecodable image, a page that declares font
  faces but loads none, or console noise outside the two documented known issues. It **skips rather
  than fails when no browser is found**, so CI runners stay green and this machine is where it
  bites; set `PHASM_BROWSER=<path>` to point it, `PHASM_NO_SMOKE=1` to silence it. Proven to fail
  by injecting an uncaught throw, a missing file and a broken image into one page.
  The 196 static pages under coach-decks/ and learn/ are deliberately out of scope, and the
  whole suite now takes about 38s locally (CI skips this gate, so it stays near 12s).
- The rest of the suite is **regex-on-file-content** contracts. They prove text patterns, not that
  a page runs — which is exactly how a `SyntaxError` in the flagship course survived four weeks.
- CI: `deploy.yml` runs **no tests** — Pages ships whatever is on `master`. The suite runs in
  `build-windows-installer.yml` and the new `test.yml`.

## Known hazards

- **`ppc-coach.html` is 1,347 lines with a ~625-line inline data literal** (lines 350–974).
  A dropped delimiter anywhere in it kills the entire course silently.
- **Quiz IDs and saved progress keys are positional** (`m0`..`m11`). Deleting or reordering a
  module does not throw — it points stored learner data at the wrong module.
- `MODULES` references the page global `IMG`; it is not a standalone pure literal.
- `tests/csp-fontsource.test.cjs` asserts **exactly 25** pages containing `assets/fonts.css`.
  Adding or removing any HTML file anywhere in the tree can break it — including scratch files.
- **Offline / remote dependencies** (measured, not assumed): only **2** pages actually loaded the
  Tailwind Play CDN as a `<script>` (`ppc-coach.html`, `ad-console.html`), and only **1** loaded
  SheetJS (`bulk-file.html`) — those three libraries are now vendored in `assets/vendor/`.
  22 HTML files still _name_ `cdn.tailwindcss.com`, but only inside their CSP `script-src` /
  `style-src` lists: leftover permissions, not dependencies. Do not read a CSP mention as a load.
  Artwork was hot-linked from `image.qwenlm.ai` at 13 unique URLs / 15 real references (11 in
  `ppc-coach.html`, 4 in `listing.html`), each a ~1 MB 1024×1024 PNG — **14,318.6 KB** total,
  which no offline installer can tolerate. It is now self-hosted in `assets/img/` as **248,260
  bytes** (98.3% smaller), re-encoded with ffmpeg/libwebp; see `assets/img/README.md`.
  `assets/fonts.css` then held the last remote dependency: 12 Fontsource `@import`s from jsDelivr,
  measured at 12–21 requests per page. Those are now 24 inlined `@font-face` rules over
  self-hosted woff2 in `assets/fonts/files/` (**446,316 bytes**), latin + latin-ext only.
  **A cold-cache headless-Edge sweep of the five heavy pages now makes zero network requests.**
  Every response is either `127.0.0.1:8080` or an inline `data:` URI — and a `data:` URL has an
  empty host, so a naive `new URL(r.url).host` filter reports it as a remote hit. No 404s, no
  broken images. Cold payload at `6482936`, summed from `Network.loadingFinished.encodedDataLength`:
  hub 274 KB · PPC Coach 1,070 KB · BuyBox Dojo 482 KB · AdConsole 680 KB · Bulk File 416 KB. Those
  hub figures came off a **warm** profile, which is why the ICO is invisible in them.
  **RETRADED:** this paragraph previously asserted a cold hub load went 353,669 B → 278,121 B (“21 %”,
  repeat run inside 0.06 %) and that the smoke gate had gone red under 77 stray browsers. Neither is
  supported. Measuring the favicon request inside three cold hub loads, only **one of the three** issued
  it at all, and total hub payload ranged **280,387–327,639 B** run to run — a ±47 KB spread that makes
  any hub-level percentage meaningless. The retained `node --test` log shows the smoke gate loading 20
  pages with zero `not ok`: the red run I described never happened, and I wrote it from recall of an
  unread filtered console snippet rather than from a log. What is reproducible is the asset's own wire
  cost, fetched directly with cache disabled: **79,421 B before, 6,169 B after — 73,252 B per fetch,
  byte-identical across repeats**. So the trim saves 73,252 B _when a browser asks for it_, and nothing
  when it does not; a page-level saving is not measurable this way.
  AdConsole is dominated by the 407 KB Tailwind Play runtime; Bulk File no longer pulls SheetJS at
  all until a file is picked. This probe has real run-to-run noise — the same Bulk File page read
  493 KB minutes earlier on the same instrument — so treat roughly ±80 KB as the floor and always
  compare two states measured back to back, never across days.
  Do not reintroduce a remote URL into `assets/fonts.css`; `tests/csp-fontsource.test.cjs` and
  `tests/simulator-layout-genome.test.cjs` both forbid it.
- **The installer had no product icon.** `build.win.icon` was unset and there was no `.ico` in the
  repo, so the taskbar, Start-menu shortcut and installed-apps list all rendered the stock Electron
  icon on a paid training product. Both files are generated from the 1024px logo master as PNG-compressed
  ICO entries. `build/icon.ico` keeps the full installer ladder (16/24/32/48/64/128/256). `favicon.ico`
  was **trimmed from 79,229 B to 5,978 B (16/24/32/48 only)** once a real browser was pointed at it: the
  pages fetch `/favicon.ico` by convention, and its own transfer is deterministic — **79,421 B on the wire
  before, 6,169 B after, 73,252 B per fetch**, byte-identical across repeated cold requests (the retraction
  above explains why no hub-level percentage is claimed). The entries above 48 px were 73,203 of the old
  file's bytes and a shell asks for them. `tests/app-icon.test.cjs` pins the two ladders separately and asserts the four shared
  entries are byte-identical, so the artwork cannot drift; re-trimming is container surgery — rebuild the
  ICO header from the PNG payloads already in the file, never re-encode the artwork. The installer proof
  stays in CI: the build before the icon commit logged `default Electron icon is used reason=application
icon is not set`, and the build at that commit logs no such line.

- **The favicon conclusion above is true at an origin root and false on this project's GitHub
  Pages URL.** Probed live on `projectamazonph.github.io`: a page with no `<link rel="icon">` makes
  the browser request `https://projectamazonph.github.io/favicon.ico` — the **domain root**, outside
  `/amazon-ph-simulators/` — which 404s, then the failure is negative-cached so later pages in the
  same session stop asking. Consequences, all measured: the hub logged `404 …/favicon.ico` as a real
  console error on the deployed site, the 5,978 B ICO is never fetched there at all (so the 73,252 B-per-fetch saving
  applies to origin-root deployments, not to this URL today), and only the two pages that declare an
  icon get one — `ppc-coach.html` by relative path and `keyword-lab.html` by inline data URI. The fix is
  a one-line relative `<link rel="icon" href="favicon.ico">` on the 18 pages that lack one, and that has
  since shipped: all 20 root pages now declare an icon, so the 73,252 B saving applies to this URL too.
  **This also reversed a packaging premise.** `favicon.ico` was deliberately kept out of the Electron
  `build.files` list on the belief that a `file://` page never asks for one — but that belief came from the
  same warm-profile probe, and a fresh-profile `file://` test shows a _declared_ icon **is** fetched there.
  The ICO is therefore now packaged (`package.json` → `build.files` includes `"favicon.ico"`), which is
  affordable only because it was trimmed first. The packaged-app fetch is inferred from that `file://`
  measurement, not observed inside an installed app: no verification here launches the installer.
- **SheetJS was loaded eagerly by the page that needed it least.** The 945 KB bundle sat in
  `bulk-file.html`’s `<head>` and the whole library was used by two lines of the file-upload
  handler, so every learner who only read the lesson or pressed "Load sample" paid for it. It is
  injected on demand now. Measured twice with the same cold-cache probe: **1,354 KB → 493 KB**
  (20 → 19 requests) and `tests/vendor-assets.test.cjs` fails if the head tag returns. The proof
  that deferral did not break uploads runs in a real browser: `XLSX` is `undefined` before the
  handler, the loader resolves to 0.20.2, a CSV buffer parses to 2 rows with `bid: 0.55` as a
  number, and a second call returns the same promise instead of injecting the script twice.
- **The one remaining console error on every page is real but not fixable in place**: `frame-ancestors`
  inside a `<meta>` CSP is ignored by browsers, so the click-jacking directive has never applied.
  GitHub Pages cannot send response headers, so enforcing it needs either Electron's
  `session.webRequest.onHeadersReceived` in `desktop/main.cjs` or dropping the dead directive from
  all 25 pages. Both are security-adjacent, so neither was done silently.
- **CSP hardening shipped in #60.** All 25 pages that carry a `<meta http-equiv="Content-Security-Policy">` tag
  had 10 unused CDN origins removed: `cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `cdn.sheetjs.com`,
  `fonts.googleapis.com`, `fonts.gstatic.com`, `image.qwenlm.ai`, `manuscdn.com` (five aliases).
  Each was listed in `script-src`/`style-src`/`img-src` but never called at runtime. Final state
  across all 25 pages: `font-src 'self' data:`, `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:` — plus `img-src https://projectamazonph.github.io`
  on `coach-decks.html` only (the real project-origin asset CDN). `frame-ancestors 'none'` left
  intact on all 25; see the hazard above. `tests/csp-fontsource.test.cjs` asserts no removed host
  appears in any page and that no directive merges occurred during the rewrite.

- **latin-ext must stay.** Exactly two codepoints are declared by no other vendored subset, and
  both matter here: `Ā` (U+0100) and the peso sign `₱` (U+20B1). `œ` and `†` are also inside the
  latin range and do **not** justify latin-ext — an earlier draft of this file claimed they did.
  Verified twice: parsed from the declared `unicode-range`s, then confirmed against the renderer's
  actual font list. That second check found the ranges and the files disagree about `₱`: it is
  drawn by Archivo and IBM Plex Mono but **not** by PT Sans or Barlow Condensed, so peso amounts in
  body text use a system font. Not a vendoring regression — the same Fontsource 5.1.0 files came
  from jsDelivr before. See `assets/fonts/README.md`.
- **Font `url()` resolves against the stylesheet, not the repo root.** `assets/fonts.css` lives in
  `assets/` while its files live in `assets/fonts/files/`, so the correct prefix is
  `url(./fonts/files/…)`. Writing Fontsource's own `./files/…` layout produced 24 silently
  unfetched faces: the suite was green and only a page load showed `localFontRequests: 0`.
- **Which population is a page count describing?** On this machine `Get-ChildItem -Filter *.html`
  over the repo root returns **25**, but the root product page count is **20**: five undeletable
  `.tmp-*.html` scratch stubs live in the root (this machine blocks `Remove-Item`), and a listing
  cannot tell them apart. Separately, `tests/csp-fontsource.test.cjs` pins **25** — pages _tree-wide_
  that link `assets/fonts.css`, a different set again. Every HTML walker in `tests/` skips
  dot-prefixed entries; a count quoted without saying so is how a wrong number got committed here.
- **`m.img ? … : …` guards hide missing art.** See the artwork-keys hazard above; same failure
  shape as the font paths — a guard that turns "absent" into "quietly nothing".
- **An icon href must be page-relative, never root-relative.** All 20 root product pages now
  declare `rel="icon"`: `keyword-lab.html` an inline SVG data URI, `ppc-coach.html`
  `assets/img/logo.png`, the other 18 `favicon.ico` written without a leading slash. On
  `https://projectamazonph.github.io/amazon-ph-simulators/` the file lives in a _subpath_, so
  `/favicon.ico` resolves to the domain root and 404s — which is exactly what the 18 undeclared
  pages did in the open browser before this shipped. `tests/app-icon.test.cjs` now fails any
  declared icon whose non-`data:` href starts with `/`. Also do not read absence of a favicon
  request as evidence: a **warm** headless profile answers "already cached", not "not requested".
- **Artwork keys can be silently dead.** `ppc-coach.html` built module art paths as
  `img:IMG.<key>` against keys the `IMG` map never declared (`builder`, `lab`, `console`, `deck`,
  `triage`, `report`). The renderer guards with `m.img ? … : …`, so nothing threw and nothing
  displayed: 9 module headers shipped with no illustration for the entire life of the product,
  while 5 declared images were never read. `tests/local-image-assets.test.cjs` now asserts both
  directions of that contract. When adding module art, add the key to `IMG` _and_ the `img:` field.
- `desktop/main.cjs` and `assets/coach-security.js` need security review before changes.
  `master` is protected: branch + PR, checks green, one approval.

## Verification that works here

- Dead-page check per file: extract `<script>` blocks (skip `src=`, skip `application/ld+json`),
  `new vm.Script(code, { filename })`. `node --check` on a temp `.cjs` also works; note its
  error's first stack line is `file:line` **without** a column.
- `vm.Script` only _parses_; it never runs, so page globals stay out of it.
- **The `file://` probe is the desktop condition; localhost is not.** Load
  `file:///D:/Projects/amazon-ph-simulators/<page>.html` in the same headless Edge and re-run the
  interaction, because a page has no http origin there and CSP `script-src 'self'` is judged
  differently. This is the only way to catch a change that breaks the installed app while the
  GitHub Pages site keeps working. At `99a98ad`: bulk-file makes 18 requests, all `file:`, none
  failed, 7 font faces loaded, 0 broken images, and the on-demand SheetJS injection is permitted —
  `window.XLSX` is `undefined` until the handler runs, then resolves to 0.20.2 and parses a CSV.
- Live check in the in-app browser: expect **zero** console errors, then drive one real
  interaction (open a module, open a lesson). Screenshots alone are not evidence — query the
  rendered text.
- To compare against `master`: `git worktree add --detach <path> HEAD`. `git archive | tar`
  fails through PowerShell pipes. **Never nest a worktree inside this repo** — the HTML-walking
  tests count files tree-wide and will double-count or report a HEAD defect as a new one.
- **Real-browser measurement**: `chrome-devtools-mcp` has no usable browser here (no Chrome
  installed; Edge is at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) and the
  in-app browser tool cannot execute JavaScript or report network entries. What works is raw CDP:
  launch `msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=<repo>\.tmp-edge-profile`
  and drive `http://127.0.0.1:9222` with `fetch` + the global `WebSocket` in Node — no npm
  install, no approval. `Runtime.evaluate` gives decoded/broken image counts, `document.fonts.status`,
  load timings, and per-host request counts; that is the only way to prove an image actually decodes.
  **You must send `Network.setCacheDisabled` and use a fresh `--user-data-dir`.** The first two
  sweeps here were invalid: a persistent profile served the previous `fonts.css` from disk cache, so
  the page still showed 12 jsDelivr requests after the remote imports had been deleted, and the
  second run's byte totals were cache-warm near-zero.
- To ask _which font drew a glyph_, don't compare element widths — generic-family mapping makes
  that unreliable across pages. Use `DOM.getDocument` + `DOM.querySelector` +
  `CSS.getPlatformFontsForNode`, which returns real rendered families with `isCustomFont` and glyph
  counts. That is how the peso-sign coverage gap above was found rather than assumed.

## Session state worth knowing (2026-09-25)

- **Nineteen pages shipped double-encoded text (mojibake) to learners.** UTF-8 punctuation and
  emoji had been re-encoded as Latin-1/cp1252 at some earlier save, so learners literally read
  `â€"` instead of `—` and `ðŸŽ“` instead of 🎓 across ppc-coach lesson text, hub cards, and 17 other
  pages. Repaired with a byte-run state machine (ftfy handled most of it; `âš¡`→`⚡` and similar
  needed a custom pass because ftfy's plan stops at some mixed runs). All 19 files verified
  encoding-only against HEAD; `ppc-coach.html` additionally gained the lesson aids below.
  New gate: `tests/mojibake-guard.test.cjs` fails any HTML page tree-wide containing mojibake
  markers, so a bad re-save cannot ship silently again.
- **Every one of the 60 lessons now ends with a "Your next step" aid.** `beginner_teaching_standard.md`
  requires each lesson to end with a visible next-step prompt and a retrieval question, but only
  about 20 of 60 lessons carried one. Added a `next` block type to `renderBlock` (emerald callout:
  "Your next step" + "Check yourself" retrieval question) and appended one tailored block to all
  60 lessons. `tests/coach-curriculum-alignment.test.cjs` now pins the contract: last block is
  `next`, exactly one per lesson, prompt > 20 chars, question > 10 chars, and the renderer handles
  the type.

- `ppc-coach.html` was completely dead at `master` (`SyntaxError`, first broken at `1f032ce`,
  ~4 weeks and 6 commits) while the suite stayed green. Repaired in #58 by splicing the last-known-good
  data literal from `d73ad02` into HEAD's renderer. Verified live at `1a9e2e4`: 12 modules rendering,
  zero console errors, no uncaught exceptions.
- Four-agent analysis (architect/developer/QA/PM) run on the refine sprint concluded `ppc-coach.html`
  was broken — all four lenses independently reported parse errors. Live browser probe disproved all
  four. The parse-error conclusion came from incorrect extraction assumptions about the page's inline
  script structure.
- Scratch `.tmp-*` files in the repo root are not product files. A `.tmp-archive-2026-09-25/` dir
  accumulates them; the active `.gitignore` (added at `ae4aad2`) excludes all `.tmp-*` paths so
  they cannot accidentally be committed. This machine's safety policy blocks `Remove-Item` and
  `mavis-trash`; use `Move-Item` to the archive dir instead.
- PRs #55–#60 all merged: `fe27ba8` (#55 icon bullets), `3a58566` (#56 merge-commit repair),
  `6e49343` (#57 favicon subpath), `1a9e2e4` (#58 ppc-coach repair + retracted false claims),
  `6bb23e7` (#59 favicon on all 20 pages + packaged), `da4a8e6` (#60 CSP hardening — strips
  10 unused CDN allowances from 25 pages, test updated to assert no unused hosts remain).
  `master` at `da4a8e6`; origin confirmed in sync.
