# VA Start Here Visual QA

The onboarding page was inspected locally after loading the shared shell stylesheet. The shared header rendered with normal bounded dimensions; the hero clearly separates the beginner message from the first-30-minutes plan; the four first-session cards form an easy next-step row; and the green safety note is visually distinct without dominating the page.

The glossary begins after the safety rule with a visible search control and group filters. Its table is contained in a horizontal scroll wrapper for narrow displays, while the desktop view preserves the complete four-column reading path. The shared footer includes the new **VA Start Here** link in the Learn group.

The glossary search was tested with “ACOS.” It reduced the visible results to the two matching entries, **ACOS** and **Break-even ACOS**, and updated the status text to “Showing 2 terms.”

After the initial-count fix, a clean page load displayed “Showing 25 terms,” matching the 25 visible glossary rows.

At **375 × 812**, the header collapsed to a compact brand-and-menu row, the hero stacked cleanly, and the primary and secondary actions remained separately tappable. At **768 × 900**, the hero and first-30-minutes plan used a readable single-column sequence with no horizontal page overflow. Exact metrics confirm the glossary table intentionally enables local horizontal scrolling at phone and tablet widths while the page body remains contained.

At **1440 × 900**, the hero uses balanced two-column content and the four first-session cards align on a single readable row. The desktop page also has no horizontal overflow.

## Public GitHub Pages verification

After deployment, the public [VA Start Here](https://projectamazonph.github.io/amazon-ph-simulators/start-here.html) page showed the beginner hero, first-30-minutes plan, safety rule, all **25** glossary terms, direct practice links, and the new shared-footer link.
