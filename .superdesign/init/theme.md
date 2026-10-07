# Theme — Project Amazon PH Academy v2

The canonical design system is the **Amazon PH Academy simulator system**. Source of truth:
`DESIGN.md` (repo root) and `docs/design-brief.md`. Runtime source: `src/app/globals.css` and
`src/themes/amph-theme.ts` (Astryx component library mapping).

## Part 1 — Compact Token Summary

### Brand / Shell palette

| Token          | Value     | Role                                                  |
| -------------- | --------- | ----------------------------------------------------- |
| `--c-navy-1`   | `#0F1419` | Deepest shell / overlay.                              |
| `--c-navy-2`   | `#131921` | Primary sidebar/shell navy.                           |
| `--c-navy-3`   | `#232F3E` | Secondary shell navy.                                 |
| `--c-navy-4`   | `#37475A` | Tertiary shell detail.                                |
| `--c-navy-5`   | `#485769` | Shell hover line / emphasized border.                 |
| `--c-orange`   | `#FF9900` | Primary actions, focus, selected state.              |
| `--c-orange-h` | `#FFA41C` | Primary-action hover.                                 |
| `--c-orange-d` | `#9B3E00` | Accessible dark-orange detail, selected control.      |
| `--c-orange-soft` | `#FEF3E7` | Selection wash, row hover, in-hero highlight bar.   |
| `--c-orange-tint` | `#FCE3C2` | Orange-tinted border, tag treatment.               |

### Work surfaces and ink

| Token           | Value     | Role                                          |
| --------------- | --------- | --------------------------------------------- |
| `--c-bg`        | `#F7F8FA` | Global page canvas.                           |
| `--c-bg-2`      | `#EEF1F4` | Muted surface, table header, neutral hover.   |
| `--c-card`      | `#FFFFFF` | Cards, panels, tables, form controls.         |
| `--c-card-hi`   | `#FAFBFC` | Interactive card hover.                       |
| `--c-border`    | `#D5D9D9` | Default 1px border.                            |
| `--c-border-2`  | `#E7E7E7` | Soft separator.                               |
| `--c-ink`       | `#0F1111` | Default content text.                         |
| `--c-ink-2`     | `#232F3E` | Heading / high-emphasis text.                 |
| `--c-sub`       | `#565959` | Supporting text, labels.                      |
| `--c-faint`     | `#626A6A` | Accessible metadata / tertiary.               |
| `--c-disabled`  | `#B1B6BC` | Disabled text / placeholders.                 |
| `--c-link`      | `#007185` | Link / ghost-action text.                     |
| `--c-link-h`    | `#C7511F` | Link hover.                                   |
| `--c-shell-ink` | `#E9EFF8` | High-emphasis text on navy shell.             |
| `--c-shell-dim` | `#99A5B4` | Default shell text.                           |
| `--c-shell-faint` | `#6E7B8B` | Section labels in shell.                    |
| `--c-shell-line` | `#2A3543` | Shell dividers.                              |

### Semantic palette

| State        | Main       | Background   | Text         |
| ------------ | ---------- | ------------ | ------------ |
| Success      | `--c-green`   `#067D62` | `--c-green-bg`   `#E6F4F0` | `--c-green-text`   `#054A3A` |
| Warning      | `--c-amber`   `#C45500` | `--c-amber-bg`   `#FFF4E5` | `--c-amber-text`   `#8A5300` |
| Error        | `--c-red`     `#B12704` | `--c-red-bg`     `#FDEDED` | `--c-red-text`     `#8A1F00` |
| Information  | `--c-blue`    `#007185` | `--c-blue-bg`    `#E7F3F4` | `--c-blue-text`    `#054A5A` |

Auxiliary: `--c-gold #FFD166`, `--c-purple #6B3FA0`, `--c-purple-bg #F0E8FF`.

### Typography

- **Display / headings / controls:** Archivo (`--font-display`, `--font-disp`)
- **Body / form copy:** PT Sans (`--font-body`, `--font-sans`)
- **Mono / data:** IBM Plex Mono (`--font-mono`) — identifiers, timestamps, fixed-width
- **Condensed labels (rare):** Barlow Condensed

| Role            | Token         | Family   | Size formula                                                   |
| --------------- | ------------- | -------- | -------------------------------------------------------------- |
| Page heading    | `--fs-h1`     | Archivo  | `clamp(1.75rem, 1.2rem + 2.6vw, 2.5rem)` / 1.15                |
| Section heading | `--fs-h2`     | Archivo  | `clamp(1.25rem, 1rem + 1.2vw, 1.5rem)` / 1.15                 |
| Card heading    | `--fs-h3`     | Archivo  | `clamp(1.0625rem, 0.95rem + 0.6vw, 1.25rem)` / 1.15            |
| Body            | `--fs-body`   | PT Sans  | `clamp(0.875rem, 0.8rem + 0.4vw, 1rem)` / 1.55                |
| Small body      | `--fs-body-sm`| PT Sans  | `clamp(0.8125rem, 0.75rem + 0.3vw, 0.9375rem)` / 1.55          |
| Control label   | `--fs-13`     | Archivo  | 13px / 1.3, weight 600                                         |
| Table header    | —             | Archivo  | 11.5px uppercase, 0.06em tracking, weight 600                  |

### Spacing scale (4px base)

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24 · `--sp-8` 32 ·
`--sp-10` 40 · `--sp-12` 48 · `--sp-16` 64 · `--sp-20` 80

### Radius

`--r-xs` 2 · `--r-sm` 4 · `--r-md` 6 · `--r-lg` 8 · `--r-xl` 12 · `--r-pill` 999

### Elevation

- `--sh-1`: `0 1px 2px rgba(15,17,17,0.08)` — resting card
- `--sh-2`: `0 2px 6px rgba(15,17,17,0.10)` — interactive lift
- `--sh-3`: `0 4px 14px rgba(15,17,17,0.12)` — overlays
- `--sh-4`: `0 8px 24px rgba(15,17,17,0.16)` — modals
- `--sh-focus`: `0 0 0 3px rgba(255,153,0,0.35)` — orange focus ring

### Motion

`--d-fast` 120ms · `--d-base` 180ms · `--d-slow` 280ms · `--ease` `cubic-bezier(0.2, 0.7, 0.3, 1)`

### Layout constants

`--topbar-h` 56px · `--sidenav-w` 240px · `--content-px` 24px · `--content-pb` 96px ·
`--max-content` 1100px · `--max-reading` 720px · `--max-form` 640px ·
`--side-pad` `clamp(16px, 4vw, 48px)`

### Dark mode

Dark theme is wired via `[data-theme="dark"]` selector — primarily inverts surfaces and shell
tones (navy becomes the canvas, white cards become navy cards). Orange retains role and contrast.

## Part 2 — Raw sources

- `src/app/globals.css` — full token declaration (15.5KB, ships with the layout).
- `src/themes/amph-theme.ts` — Astryx component library mapping.
- `DESIGN.md` (repo root) — narrative design system doc, design-brief.md mirrors this.