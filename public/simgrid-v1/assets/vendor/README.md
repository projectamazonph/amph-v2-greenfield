# Vendored browser libraries

These exist so the **Windows installer works offline**. Every page here is plain HTML/CSS/JS with
no build step, so the libraries are committed as fetched artifacts, not generated ones.

| File               | Origin (fetched 2026-09-24)                                         | Bytes  | SHA-256                                                            | License    |
| ------------------ | ------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ | ---------- |
| `tailwind-play.js` | `https://cdn.tailwindcss.com/`                                      | 407279 | `176e894661aa9cdc9a5cba6c720044cbbf7b8bd80d1c9a142a7c24b1b6c50d15` | MIT        |
| `chart.umd.min.js` | `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js` | 205399 | `d2af8974e95271638772e9e9524db5b9a6f58d6ec2d5d781400447b4a31c681e` | MIT        |
| `xlsx.full.min.js` | `https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js` | 945578 | `0dcbc967984de297bd4233cbb77febad8a396c72d8ac0cfab09094d6d7f6e805` | Apache-2.0 |

- `chart.umd.min.js` is Chart.js **v4.4.1** (the banner is inside the file) and matches the version
  the pages previously pinned in the CDN URL.
- `tailwind-play.js` is the Tailwind **Play CDN** build. The bundle carries no version banner, so
  identify it by hash. It is a runtime JIT compiler: it reads `tailwind.config` from the page and
  generates styles in the browser. That keeps behavior identical to the CDN it replaced, but it is
  not a production compiler — see below.
- Only **two** pages load the Play CDN at all: `ppc-coach.html` and `ad-console.html`. 20 further
  HTML files still name `cdn.tailwindcss.com` inside their CSP `script-src`/`style-src` even though
  no tag uses it — leftover permissions, not dependencies. They are harmless and were intentionally
  left alone here; trimming them is CSP hardening, tracked separately.

## Known trade-off (open decision)

Vendoring the Play CDN buys offline correctness with zero visual risk, at the cost of shipping a
dev-time JIT and paying its compile cost on every page load. The optimized end-state is a
precompiled static stylesheet built from the utilities actually used. That needs a one-time
`tailwindcss` CLI run and a visual pass over 22 pages, which is not possible in this repo's
no-build-step shape without adding tooling — so it is deliberately left as a follow-up.

## Rules

- `tests/vendor-assets.test.cjs` pins these hashes and fails if any page adds a new remote
  `<script src="https://…">` outside its explicit allowlist. Update the hash here **and** in that
  test together when you intentionally upgrade a library.
- `.gitattributes` marks `assets/vendor/*.js -text` so `core.autocrlf=true` cannot rewrite these
  files to CRLF on a Windows checkout — that would change every byte and break the pin for no
  reason. Keep that rule if you add more vendored libraries.
- Fonts (`assets/fonts.css`) and `assets/vendor`-adjacent style CDNs are still remote; they degrade
  gracefully offline and are tracked separately from script loading.
