# Fontsource CSP Fix Findings

## Diagnosis

The shared `assets/fonts.css` file imports 23 Fontsource stylesheets from `https://cdn.jsdelivr.net/npm/@fontsource/...`. The HTML meta CSP policies allowed jsDelivr in `script-src` but omitted it from both `style-src` and `font-src`. As a result, browsers blocked the imported Fontsource styles before font files could load.

## Fix

Updated all 23 HTML pages that load `assets/fonts.css` so their CSP policies allow `https://cdn.jsdelivr.net` in both `style-src` and `font-src`. Existing `default-src`, `object-src`, `frame-ancestors`, script, image, connection, and form restrictions were preserved.

Added `tests/csp-fontsource.test.cjs`, which verifies that every Fontsource-using page contains both required origin allowances.

## Validation

The full repository test suite passes 119 tests with zero failures. A real-browser verification against local representative pages (`index.html`, `coach-tools.html`, and `learn/index.html`) reports zero CSP console errors, `document.fonts.status === "loaded"`, and successful Archivo and PT Sans checks. Barlow Condensed and IBM Plex Mono checks may be false on pages that do not render text using those families; this is not a CSP failure.

The public GitHub Pages deployment will show the fix only after the modified files are committed and deployed.
