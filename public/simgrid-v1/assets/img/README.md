# Self-hosted artwork

Course and simulator imagery used to be hot-linked from `image.qwenlm.ai` — somebody else's
AI-tooling CDN, 13 PNGs at roughly 1 MB each (**≈14.3 MB** measured over HTTP), which meant the
paid Windows installer showed nothing offline and the mobile site downloaded 14 MB of art.

They are now re-encoded locally from those same sources. Total weight of this directory is
**248,260 bytes**, and no page references the third-party host any more.

| File                    | Source (fetched 2026-09-24, `image.qwenlm.ai/public_source/…`) | px        | Bytes | Used by                                                                                                                           |
| ----------------------- | -------------------------------------------------------------- | --------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| `logo.png`              | `d80161d4…/1454586fe-…png`                                     | 128×128   | 14122 | `ppc-coach.html` favicon + header logo (`w-10 h-10`)                                                                              |
| `course-hero.webp`      | `d80161d4…/1a8d96df3-…png`                                     | 1024×1024 | 40488 | `ppc-coach.html` `IMG.hero`                                                                                                       |
| `course-coach.webp`     | `d80161d4…/163fc5120-…png`                                     | 1024×1024 | 21586 | `ppc-coach.html` `IMG.coach`                                                                                                      |
| `course-market.webp`    | `d80161d4…/126c76305-…png`                                     | 1024×1024 | 27464 | `ppc-coach.html` `IMG.market`                                                                                                     |
| `course-auction.webp`   | `d80161d4…/1ddc9c1b1-…png`                                     | 1024×1024 | 19136 | `ppc-coach.html` `IMG.deck` — header art for _Bidding, Placements, and Budgets_ and _Optimization, Scaling, and Operating Rhythm_ |
| `course-listing.webp`   | `d80161d4…/167723db7-…png`                                     | 1024×1024 | 14640 | declared as `IMG.listing`, **not rendered** — spare awaiting a module assignment                                                  |
| `course-keywords.webp`  | `d80161d4…/1f06a5489-…png`                                     | 1024×1024 | 22300 | `ppc-coach.html` `IMG.lab` — header art for _Keyword Research and Search Intent_                                                  |
| `course-reporting.webp` | `d80161d4…/149aeccd5-…png`                                     | 1024×1024 | 17568 | `ppc-coach.html` `IMG.report` — header art for _Reporting, Strategy, and Capstone_                                                |
| `course-va.webp`        | `d80161d4…/1229de91a-…png`                                     | 1024×1024 | 29124 | declared as `IMG.va`, **not rendered** — spare awaiting a module assignment                                                       |
| `product-bamboo.webp`   | `8fbdce4c…/187539bf3-…png`                                     | 512×512   | 13694 | `listing.html` `IMG.bamboo`                                                                                                       |
| `product-bottle.webp`   | `8fbdce4c…/1638d8f66-…png`                                     | 512×512   | 4446  | `listing.html` `IMG.bottle`                                                                                                       |
| `product-lamp.webp`     | `8fbdce4c…/1b4cb5815-…png`                                     | 512×512   | 6512  | `listing.html` `IMG.lamp`                                                                                                         |
| `product-yoga.webp`     | `8fbdce4c…/1cac479fe-…png`                                     | 512×512   | 17180 | `listing.html` `IMG.yoga`                                                                                                         |

## How they were made

`ffmpeg` reading the source URL directly (so the 1 MB originals never entered the repo), Lanczos
resample, libwebp quality 78. Resolution is deliberately generous rather than minimal: course
images render inside cards no wider than ~600 CSS px, and the BuyBox product image is
`assets/listing.css` `.amz-img{width:128px;height:128px}`, so 1024/512 already covers 2-4× density.
Nothing was cropped and no aspect ratio changed.

## Rules

- `tests/local-image-assets.test.cjs` fails if any file brings back a third-party art URL, if an
  image here is referenced by no page, or if this directory grows past its byte budget.
- It also fails if a page reads an `IMG.<key>` that its `IMG` map does not declare, or declares a
  key that nothing reads without listing it as a spare. Both directions used to be broken at once:
  the module data read `builder`, `lab`, `console`, `deck`, `triage`, and `report`, none of which
  the map ever declared, so 9 module headers rendered no illustration at all while 5 images sat
  unread. The renderer guards with `m.img ? … : …`, which is why no error ever surfaced.
- Add new art the same way: encode, list it in the table above with real measured bytes, wire it to
  a module in the same change, and let the budget test tell you when the directory is heavy.
- `course-listing.webp` and `course-va.webp` are the two deliberate spares. Assign them to a module
  or delete them; do not let the count of unrendered art grow.
