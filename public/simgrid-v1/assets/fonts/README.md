# Self-hosted brand fonts

`assets/fonts.css` used to `@import` twelve stylesheets from `cdn.jsdelivr.net` (Fontsource).
That made every one of the 25 pages depend on the network, so the paid Windows (Electron) installer
rendered the entire brand in fallback type whenever the laptop was offline -- and a coach running a
class on a bad connection lost the typography mid-lesson.

The 24 faces the brand actually uses are now served from this directory, and
`assets/fonts.css` declares them inline: **one stylesheet request, zero remote requests, no
`@import` chain**. Total weight is **446316 bytes** (435.9 KB), woff2 only
-- the `.woff` fallback Fontsource also ships was dropped, because Electron 43 and every browser
this product targets has supported woff2 since 2016.

---

## Files

Measured with `Get-ChildItem` at commit time; the SHA-256 prefix is enough to spot an accidental
re-download or a truncated transfer.

| File                                          | Family           | Weight | Subset    | Bytes | SHA-256 (first 12) |
| --------------------------------------------- | ---------------- | ------ | --------- | ----- | ------------------ |
| `archivo-latin-ext-400-normal.woff2`          | Archivo          | 400    | latin-ext | 12516 | `1e2638b4e5c0`     |
| `archivo-latin-400-normal.woff2`              | Archivo          | 400    | latin     | 14672 | `72347adb46d6`     |
| `archivo-latin-ext-500-normal.woff2`          | Archivo          | 500    | latin-ext | 12784 | `94ec8510173b`     |
| `archivo-latin-500-normal.woff2`              | Archivo          | 500    | latin     | 14700 | `b1bdc2613804`     |
| `archivo-latin-ext-600-normal.woff2`          | Archivo          | 600    | latin-ext | 12056 | `63a6524911ed`     |
| `archivo-latin-600-normal.woff2`              | Archivo          | 600    | latin     | 13844 | `4fac2313143b`     |
| `archivo-latin-ext-700-normal.woff2`          | Archivo          | 700    | latin-ext | 12908 | `a71ab2fecc9d`     |
| `archivo-latin-700-normal.woff2`              | Archivo          | 700    | latin     | 14540 | `9e423e0cebec`     |
| `pt-sans-latin-ext-400-normal.woff2`          | PT Sans          | 400    | latin-ext | 26460 | `65022d5f76d6`     |
| `pt-sans-latin-400-normal.woff2`              | PT Sans          | 400    | latin     | 45300 | `e13ffa988be5`     |
| `pt-sans-latin-ext-700-normal.woff2`          | PT Sans          | 700    | latin-ext | 29232 | `1a8635c7077b`     |
| `pt-sans-latin-700-normal.woff2`              | PT Sans          | 700    | latin     | 47048 | `141f0c53e457`     |
| `barlow-condensed-latin-ext-500-normal.woff2` | Barlow Condensed | 500    | latin-ext | 13272 | `b78f4a03a0db`     |
| `barlow-condensed-latin-500-normal.woff2`     | Barlow Condensed | 500    | latin     | 20432 | `2d2c4912162e`     |
| `barlow-condensed-latin-ext-600-normal.woff2` | Barlow Condensed | 600    | latin-ext | 13636 | `13151e40ec9c`     |
| `barlow-condensed-latin-600-normal.woff2`     | Barlow Condensed | 600    | latin     | 21352 | `0b281bf2f417`     |
| `barlow-condensed-latin-ext-700-normal.woff2` | Barlow Condensed | 700    | latin-ext | 13692 | `9dbbaa9e884e`     |
| `barlow-condensed-latin-700-normal.woff2`     | Barlow Condensed | 700    | latin     | 21440 | `8320299532b4`     |
| `ibm-plex-mono-latin-ext-400-normal.woff2`    | IBM Plex Mono    | 400    | latin-ext | 13272 | `91e8ae155e1c`     |
| `ibm-plex-mono-latin-400-normal.woff2`        | IBM Plex Mono    | 400    | latin     | 14812 | `3c5a451f9ec2`     |
| `ibm-plex-mono-latin-ext-500-normal.woff2`    | IBM Plex Mono    | 500    | latin-ext | 13416 | `c8bfbf1336ac`     |
| `ibm-plex-mono-latin-500-normal.woff2`        | IBM Plex Mono    | 500    | latin     | 14988 | `756026ff72eb`     |
| `ibm-plex-mono-latin-ext-600-normal.woff2`    | IBM Plex Mono    | 600    | latin-ext | 14240 | `af115aa5613b`     |
| `ibm-plex-mono-latin-600-normal.woff2`        | IBM Plex Mono    | 600    | latin     | 15704 | `c4d3deb734a2`     |

**Total: 446316 bytes across 24 files.**

## What each subset actually buys (verified twice)

Coverage was checked two ways, because the two can disagree: parse the declared `unicode-range`
values, then ask the renderer which font it actually used (`CSS.getPlatformFontsForNode`). Only the
second is authoritative for whether a glyph exists in the file.

| Character            | declared in latin | declared in latin-ext | rendered from the webfont by       |
| -------------------- | ----------------- | --------------------- | ---------------------------------- |
| `A` U+0041 (control) | yes               | no                    | all four families                  |
| `Ā` U+0100           | **no**            | **yes**               | all four families                  |
| `œ` U+0153           | yes               | yes                   | all four families                  |
| `†` U+2020           | yes               | yes                   | all four families                  |
| `€` U+20AC           | yes               | yes                   | all four families                  |
| `₱` U+20B1           | **no**            | **yes**               | **Archivo and IBM Plex Mono only** |

Exactly two codepoints are latin-ext-exclusive, and they are the two this product cares about:
`Ā` and `₱`. `œ` and `†` are already inside the latin range, so they do not justify latin-ext on
their own. Dropping latin-ext would remove the only route to a brand-font peso sign.

**The peso sign caveat.** `₱` is inside the latin-ext range for every family, but PT Sans and
Barlow Condensed do not draw that glyph, so a peso amount set in body text (PT Sans) renders from
the system font while the same amount in a heading (Archivo) or a bulk-file cell (IBM Plex Mono)
renders from the brand font. This is not a regression from self-hosting: the identical Fontsource
5.1.0 files were fetched from jsDelivr before, with the same coverage. It is also invisible on this
machine, which has a system font holding `₱`; a student's device without one would show tofu in
body text. If peso amounts in body copy become important, the fix is a family that draws `₱` --
not a CSP change and not a re-vendor of the same files.

Cyrillic, Vietnamese and Greek subsets were dropped: nothing in this product writes in them.

## Refresh procedure

Fontsource ships one CSS per family/weight that lists every subset. To re-vendor after a version
bump:

1. Fetch `https://cdn.jsdelivr.net/npm/@fontsource/<pkg>@<version>/<weight>.css`.
2. Keep only faces whose name ends `-latin-<weight>-normal` or `-latin-ext-<weight>-normal`.
   Match the subset as a whole token -- `latin-ext` contains a hyphen, and splitting the name on
   `-` drops every latin-ext face while still looking correct. That bug shipped once already.
3. Download `files/<name>.woff2` and confirm the first four bytes are `wOF2`.
4. Rewrite each `src:` to `url(./fonts/files/<name>.woff2) format('woff2')` -- relative to
   `assets/fonts.css`, **not** to the repo root and not to Fontsource's own layout. Keeping
   `./files/` while the CSS sits one level above the fonts makes every face 404 silently.
   `tests/csp-fontsource.test.cjs` resolves the way a browser does and will catch it.
5. Keep `unicode-range` and `font-display: swap` verbatim, write all rules into
   `assets/fonts.css` with no `@import`, and run `node --test tests/csp-fontsource.test.cjs`.
