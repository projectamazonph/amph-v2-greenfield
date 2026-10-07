# Every Formula You'll Need

A single-page reference for every metric you'll compute as an Amazon PPC
operator. Print this and pin it. If a number isn't here, you don't need it
yet.

## The eight metrics

| Metric              | Formula                      | What it tells you                       | Healthy range                              |
| ------------------- | ---------------------------- | --------------------------------------- | ------------------------------------------ |
| **ACOS**            | Spend ÷ Sales × 100          | % of sales eaten by ad spend            | Under your profit margin                   |
| **ROAS**            | Sales ÷ Spend                | ₱ returned per ₱1 spent                 | Over 1 ÷ margin (margin 30% → ROAS > 3.33) |
| **TACoS**           | Ad spend ÷ Total sales × 100 | Ad share of total revenue               | Trends down over time as organic grows     |
| **Break-even ACOS** | Profit margin %              | The line where you neither win nor lose | Aim well below it                          |
| **CTR**             | Clicks ÷ Impressions × 100   | Ad creative + relevance                 | 0.3–0.5%+ for most niches                  |
| **CVR**             | Orders ÷ Clicks × 100        | Listing quality + price match           | 10%+ for healthy products                  |
| **CPC**             | Spend ÷ Clicks               | How competitive the auction is          | Compare to your break-even CVR             |
| **Impressions**     | From report                  | Reach — are you showing up?             | Trended, not absolute                      |

## The diagnostic order

When a number moves the wrong way, walk it up this ladder **before** you
change anything:

1. **Delivery** — is the campaign showing? (impressions > 0, not paused)
2. **Engagement** — are people clicking? (CTR vs niche baseline)
3. **Conversion** — are clicks turning into orders? (CVR vs break-even)
4. **Economics** — does it all add up? (ACOS vs margin, ROAS vs target)

Fix the lowest rung that fails first. Skipping up the ladder is how
people "optimize" a campaign that was never broken.

## The unit traps

- **ACOS** is a percent (25 means 25%, not 0.25). Multiply by 100.
- **ROAS** is a ratio (4.0 means 4×, not 400%).
- **Break-even ACOS** = margin, not margin × 100. (30% margin = 30 ACOS.)
- **TACoS** divides by **total** sales, not just ad sales. That's the
  whole point — it shows the ad's share of the _whole_ pie.
- **CPC** in some reports is shown as a 7-day average, not a click-by-click.
  Don't sum CPCs; sum spends and clicks, then divide.

## The break-even trick

> Break-even ACOS = your profit margin

If your margin is 30%, a 30% ACOS campaign neither wins nor loses.
Below 30% is profitable; above is bleeding. This is the single most
important fact in the whole sheet. Memorize it.

## The decision shortcuts

- **ACOS way under margin** → raise bid a little, scale carefully
- **ACOS at margin** → watch, small bid cuts are fine
- **ACOS over margin** → cut bid, tighten match, or negate
- **ACOS = "no sales"** → check relevance, listing, Buy Box — _not_ bids
- **CVR < 5% with steady traffic** → fix the listing before spending more
- **CTR < 0.3% for 7 days** → fix the hook (image, price, title)
- **Spend flat, sales falling** → stock, price, reviews, competitor first

## One-line summary

> Eight numbers, eight formulas, one diagnostic order, one rule:
> change one thing, wait a week, log it.
