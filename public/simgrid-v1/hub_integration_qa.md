# Coach Tools Hub Integration QA

The Coach Tools landing page was checked in a local browser preview. The page renders the four teaching-deck cards, the six downloadable-material cards, the teaching sequence, and the PPC Coach call to action without overlap at desktop width.

The public in-hub teaching-deck viewer was then opened with Deck 01. The 16:9 slide stage loaded correctly, the deck selector was visible, and the Next control advanced the route from Slide 1 of 12 to Slide 2 of 12 while updating the URL state. The static deck source is stored under `coach-decks/`, which keeps the teaching series available from the hub without depending on a private presentation URL.

The repository regression suite completed with **104 passing tests and 0 failures** after the Coach Tools card was placed in its own hub section rather than changing the fixed four-card guided-learning group. The download directory contains the expanded asset-pack ZIP and five individual learner or facilitation resources.

## Publication verification

Commit `238de81` (`feat: add Coach Tools teaching decks and downloads`) was pushed to `origin/master`. The corresponding **Deploy to GitHub Pages** workflow completed successfully. The live [`Coach Tools` page](https://projectamazonph.github.io/amazon-ph-simulators/coach-tools.html) was checked after cache-busting and rendered the four teaching-deck links, the six downloadable practice tools, the sequence panel, and the PPC Coach call to action.

The live [deck viewer](https://projectamazonph.github.io/amazon-ph-simulators/coach-decks.html?deck=2&slide=1) was also checked with Deck 02 selected; it rendered the 16:9 stage, correct deck title, selector, and next/previous controls. The published [expanded asset-pack archive](https://projectamazonph.github.io/amazon-ph-simulators/downloads/coach-tools/amazon-ph-simulators-expanded-asset-pack.zip) returned `HTTP 200`, `application/x-zip-compressed`, with a `1,024,769` byte content length.
