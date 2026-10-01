# Mobile audit findings

## Initial live inspection

- Latest repository was pulled from `origin/master` before inspection.
- Live site opened: `https://projectamazonph.github.io/amazon-ph-simulators/`.
- The live hub loaded with 12 console errors and 1 warning; error details still need classification.
- At viewport 390x844, the hub reported `document.documentElement.scrollWidth === 390`, so no root-level horizontal overflow was detected on the hub.
- The initial DOM overflow scan found no elements extending outside the viewport.
- Code audit shows shared mobile rules in `assets/hub.css` and `assets/shell.js`, but Coach Tools and Learn pages require page-specific inspection.

## Coach Tools live inspection

- Live Coach Tools page opened at `https://projectamazonph.github.io/amazon-ph-simulators/coach-tools.html` at 390x844.
- The page reported the same 12 console errors and 1 warning as the hub.
- Root-level horizontal overflow was not detected (`scrollWidth === 390`), and no elements were returned by the basic off-screen scan.
- The page contains no images in the loaded DOM; the suspected break is therefore likely related to CSS, navigation, embedded deck links, or console/runtime failures rather than oversized image content.

## Coach Tools console findings

- The live page emits repeated CSP errors because `@fontsource` styles from `cdn.jsdelivr.net` are blocked by the page’s `style-src` directive.
- The live page also warns that `frame-ancestors` is ignored when delivered through a meta CSP tag.
- The current root overflow scan does not expose the visual break, so the next inspection must examine computed styles, screenshots, link targets, and page sections rather than relying only on document scroll width.

## All-pages mobile scan at 390x844

| Page                   |  Root overflow | Primary finding                                                                                                       |
| ---------------------- | -------------: | --------------------------------------------------------------------------------------------------------------------- |
| Hub                    |            0px | No root overflow detected.                                                                                            |
| AdConsole Pro          |            0px | Hidden off-canvas legacy sidebar elements are present, but page width is contained.                                   |
| Keyword Lab            |           20px | Tab buttons and content cards extend beyond the viewport.                                                             |
| Search Term Triage     |          432px | Desktop navigation/stats strip remains in the page layout and creates severe horizontal overflow.                     |
| SQP Studio             |            0px | No root overflow detected.                                                                                            |
| Bid Decisions          |            0px | No root overflow detected.                                                                                            |
| Campaign Architect     |           22px | Header/content width exceeds the viewport by approximately 22px.                                                      |
| Account Audit          |            0px | No root overflow detected.                                                                                            |
| Client Onboarding      |            0px | Horizontal stage strip contains off-screen upcoming steps; likely intended scroll region but needs mobile affordance. |
| Capstone Sequence      |            0px | Horizontal stage strip contains off-screen later stages; needs intentional scroll/stack treatment.                    |
| Bulk File              | 0px root width | A 1,392px table is clipped inside the viewport; the table needs an explicit scroll wrapper or mobile layout.          |
| Listing / BuyBox Dojo  |        6,723px | Severe desktop side-panel/nav width remains active on mobile.                                                         |
| Pacing Deck            |          457px | Desktop suite navigation remains 799px wide.                                                                          |
| Planned Simulators     |            0px | No root overflow detected.                                                                                            |
| Coach Tools            |            0px | No root overflow detected, but CSP font errors persist.                                                               |
| Coach Resource Library |          147px | Workbook card extends past the right edge; grid breakpoint is insufficient.                                           |
| Coach Deck Viewer      |            0px | No root overflow detected, but CSP font errors persist.                                                               |
| Learn Hub              |           20px | Shared `.learn-main`/`.learn-wrap` sizing exceeds the 390px viewport.                                                 |
| Learn Guide            |           20px | Same shared container overflow.                                                                                       |
| Learn Features         |           20px | Same shared container overflow.                                                                                       |
| Learn Handouts         |           20px | Same shared container overflow; table also needs mobile treatment.                                                    |
| Learn Downloads        |           20px | Same shared container overflow.                                                                                       |

All live pages also emit repeated CSP errors for blocked `@fontsource` styles from jsDelivr. The scan did not report page navigation failures.

## Learn Hub computed-style findings

- At 390px, `#pha-main-content` has `width: 100%`, `padding-left: 14px`, and `padding-right: 14px` with `box-sizing: content-box`, producing a 402px box starting at x=8 and ending at x=410.
- `.learn-wrap` also uses content-box sizing with 24px horizontal padding, although its own right edge remains inside the outer overflow caused by the main wrapper.
- The Learn Hub content grid itself is contained; the shared main wrapper is the primary cause of the 20px page overflow.
- The body class is empty on Learn pages, so the page relies on shared shell/responsive styles without the `body.pha-skin` overflow guard.

## Post-fix local scan at 390x844

The shared wrapper fix and Coach breakpoint fixes resolved the Learn pages, Coach Tools, Coach Resource Library, Search Term Triage root overflow, Pacing Deck root overflow, and the severe Listing root overflow. The full test suite also passes 117 tests.

Remaining confirmed layout issues at 390px are:

| Page               | Remaining finding                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyword Lab        | Root overflow remains 20px; its tab buttons and a wide keyword table are still beyond the viewport. This is separate from the shared wrapper issue. |
| Campaign Architect | Root overflow remains 22px; the `ca-header` and its content reach x=412. The page needs local border-box/width containment.                         |
| Client Onboarding  | No root overflow, but later horizontal stage items are off-screen; make the stage strip an intentional scroll region or collapse it.                |
| Capstone Sequence  | No root overflow, but later stage items are off-screen; make the stage strip an intentional scroll region or collapse it.                           |
| Bulk File          | No root overflow, but the 1,392px spreadsheet table remains intentionally clipped inside its scroll surface; verify the scroll affordance.          |
| Listing            | No root overflow after shell containment, but horizontally scrollable nav buttons extend within the rail as intended.                               |
| Learn Handouts     | No root overflow after wrappers; tables remain wider than the viewport inside the intended horizontal scroll utility.                               |

Coach Tools and its expanded resource library now have no root overflow at 390px after fixing malformed media-query separators. Search Term Triage and Pacing Deck now contain their legacy navigation within the viewport.

## Remaining box-model findings

- Keyword Lab’s `.pha-skin-wrap` is now contained, but `.card.pad` has a 376px rendered width inside a 322px grid column. The card’s content/minimum sizing lets it escape the mobile grid; the wide keyword table is correctly inside `.tbl-wrap` and should remain horizontally scrollable.
- Campaign Architect’s `.ca-header`, `.ca-layout`, `.ca-palette`, `.ca-canvas`, and `.ca-inspector` all compute as `content-box`; the shared skin’s padding overrides therefore expand the native layout. `.ca-campaign` also expands to 374.6px inside the 342.6px canvas content area. Page-specific border-box and min-width containment are needed.

## Final targeted verification at 390x844

Coach Tools now renders both `.deck-grid` and `.download-grid` as single-column 346px layouts with zero document overflow. Learn Hub has a working 48px mobile burger, starts closed with `aria-expanded="false"`, and has zero document overflow. Learn Handouts has six scroll wrappers; each has a 274px viewport and 480px table content, producing intentional horizontal scrolling inside the handout rather than page-level overflow.

The final all-page scan reports zero root overflow for every audited page except two residual 3px rounding/containment overflows: Keyword Lab and Campaign Architect. Their visible wide controls/tables are now contained, but the remaining 3px should be removed before release by tightening their page-specific outer padding or setting the native main/wrapper width to `calc(100% - 3px)`/border-box at the shared breakpoint.

## Final post-containment scan

At 390×844, the final local scan reports `overflow: 0` for every audited top-level page, including Keyword Lab and Campaign Architect. Intentional inner overflow remains limited to horizontally scrollable controls and data surfaces: simulator tables, compact legacy navigation rails, and stage strips. These no longer widen the document or create page-level horizontal scrolling.
