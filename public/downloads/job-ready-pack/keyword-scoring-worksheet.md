# Keyword Scoring Worksheet

Score a keyword before adding it to a Sponsored Products ad group. The
four factors below are the ones Module 2 lesson 2.2 teaches to weigh when
triaging a new keyword from research into the campaign. A score under 60
is almost always a negative; 60 to 79 needs more evidence before launch;
80 and up is ready for a manual exact campaign.

Version: 2026-10-11. Pair with Module 2 lesson 2.2 (Keyword Research
Workflow).

---

## How to score a keyword

Score each factor 0 to 25, then sum. Use whole numbers, not decimals; the
worksheet's job is to force a conversation, not to fake precision.

- **Intent (0-25):** how close is the search to a buy action.
  - 0 = unrelated to the ASIN
  - 10 = loosely related
  - 20 = clearly related but vague
  - 25 = exact product match (color, size, use case)
- **Volume (0-25):** search-volume bucket the Brand Analytics report
  shows.
  - 0 = no sightings in the last 90 days
  - 10 = under 100 impressions in 90 days
  - 20 = 100-1,000 impressions in 90 days
  - 25 = over 1,000 impressions in 90 days
- **Competition (0-25):** inverse score; lower competition scores higher.
  - 0 = dense, four or more entrenched competitors
  - 10 = three competitors
  - 20 = two competitors
  - 25 = one or zero entrenched competitors
- **Fit (0-25):** does the keyword appear on the listing (title, bullets,
  or backend search terms)?
  - 0 = absent
  - 10 = in the backend only
  - 20 = in one bullet
  - 25 = in the title

Sum the four columns. Anything under 60 is a negative. 60-79 needs more
evidence (run a manual exact test ad group with a low bid). 80+ is ready
for an exact campaign.

---

## Worked example — Stainless Auto Water Bottle 32oz

Five keywords pulled from the Brand Analytics search-query report for
ASIN B0CXYZ1234 ("Stainless Auto Water Bottle 32oz").

### Keyword 1: "stainless water bottle 32oz"

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | 25 | Exact product match (material, size, use case) |
| Volume | 25 | 1,200 impressions in the last 90 days |
| Competition | 20 | Two entrenched competitors |
| Fit | 25 | Title |
| **Total** | **95** | Ready for an exact campaign |

Action: add to exact-match ad group at ₱18 default bid.

### Keyword 2: "leak proof water bottle"

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | 20 | Related but vague |
| Volume | 25 | 2,800 impressions in the last 90 days |
| Competition | 10 | Three entrenched competitors |
| Fit | 10 | Backend only ("leak proof" appears in backend search terms) |
| **Total** | **65** | Needs more evidence |

Action: add to a manual exact test ad group at ₱12 default bid with a
14-day review. Do not paste into the main campaign yet.

### Keyword 3: "kids water bottle"

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | 0 | Wrong audience — this ASIN is adult-targeted |
| Volume | 25 | 4,200 impressions in the last 90 days |
| Competition | 0 | Dense, four entrenched competitors |
| Fit | 0 | Absent |
| **Total** | **25** | Negative |

Action: add as negative exact on the campaign. Same pattern on every
adult-targeted ASIN.

### Keyword 4: "insulated bottle 32oz"

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | 20 | Closely related (insulated is the underlying feature) |
| Volume | 20 | 600 impressions in the last 90 days |
| Competition | 10 | Three entrenched competitors |
| Fit | 20 | One bullet ("32oz double-wall vacuum insulation") |
| **Total** | **70** | Needs more evidence |

Action: manual exact test ad group at ₱14 default bid. Promote to main
campaign after the 14-day review if ACoS holds under 30%.

### Keyword 5: "stainless steel water bottle"

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | 20 | Related but generic (no 32oz) |
| Volume | 25 | 6,500 impressions in the last 90 days |
| Competition | 0 | Four entrenched competitors |
| Fit | 20 | One bullet ("18/8 stainless steel") |
| **Total** | **65** | Needs more evidence |

Action: manual exact test ad group at ₱10 default bid (low — high
competition, narrow listing fit). Promote only if the test ACoS is under
the target.

---

## Blank working copy

ASIN: ____________________  Listing link: ____________________
Review date: ________  Reviewer: ____________________

### Keyword 1: ____________________

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | | |
| Volume | | |
| Competition | | |
| Fit | | |
| **Total** | | |

Action: ____________________

### Keyword 2: ____________________

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | | |
| Volume | | |
| Competition | | |
| Fit | | |
| **Total** | | |

Action: ____________________

### Keyword 3: ____________________

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | | |
| Volume | | |
| Competition | | |
| Fit | | |
| **Total** | | |

Action: ____________________

### Keyword 4: ____________________

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | | |
| Volume | | |
| Competition | | |
| Fit | | |
| **Total** | | |

Action: ____________________

### Keyword 5: ____________________

| Factor | Score | Reason |
| --- | --- | --- |
| Intent | | |
| Volume | | |
| Competition | | |
| Fit | | |
| **Total** | | |

Action: ____________________

---

## Notes

- The four-factor score is a starting conversation, not a verdict. A
  keyword that scores 90 but has been a confirmed bleeder in the last 30
  days should still be added as a negative.
- "Fit" measures presence on the listing, not keyword tool relevance
  scores. Sponsored Products has no per-ad-group copy, so an unrelated
  keyword cannot be saved by a clever bid.
- Re-score every quarter. Search behavior shifts, listings change, and
  competitors enter or leave.