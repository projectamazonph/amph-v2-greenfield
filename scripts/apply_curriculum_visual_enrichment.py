#!/usr/bin/env python3
"""Apply the first complete visual pass to lessons still missing or too thin on visuals."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

BLOCKS: dict[str, str] = {
    "content/curriculum/modules/0-onboarding/0.2-platform-tour.mdx": ''':::lesson-pathway{id="platform-practice-path" title="Move through the platform by job, not by menu"}
{"note":"Each surface exists to support a different decision. Learn the job first, then open the tool.","steps":[{"id":"courses","label":"Courses","purpose":"Read the lesson decision and know what competence is being built.","action":"Start with the objective and the expected artifact.","status":"current"},{"id":"tools","label":"Tools","purpose":"Practice the decision in a controlled simulator.","action":"Choose the tool that matches the lesson and use the scenario data.","status":"next"},{"id":"downloads","label":"Downloads","purpose":"Keep the worksheet, change log, or brief that proves how you think.","action":"Save the artifact with the scenario and review date.","status":"next"},{"id":"feedback","label":"Feedback","purpose":"Convert the result into a better next attempt.","action":"Record what changed, why it changed, and what you would check next.","status":"next"}]}
:::
''',
    "content/curriculum/modules/1-foundations/1.1-read-ppc-data-before-you-change-it.mdx": ''':::decision-flow{id="read-before-change-flow" title="Turn the six metrics into a safe first move"}
{"initialStep":0,"steps":[{"id":"traffic","label":"Read traffic","question":"Are impressions and clicks arriving for the intended searches?","evidence":"Impressions, CTR, search term relevance, and placement.","action":"If the traffic is wrong, fix targeting or negatives before changing bids."},{"id":"cost","label":"Read cost","question":"Is CPC above the product's maximum-CPC ceiling?","evidence":"Actual CPC compared with price, CVR, and target ACoS.","action":"If cost is the constraint, lower the bid or move budget to stronger terms."},{"id":"conversion","label":"Read conversion","question":"Do clicks become orders at a believable rate?","evidence":"Orders, CVR, listing quality, price, reviews, and offer.","action":"If conversion is weak, improve the listing or offer before buying more traffic."},{"id":"log","label":"Log one change","question":"What is the smallest safe test?","evidence":"One hypothesis, one lever, one review window.","action":"Record the change and the next evidence check before touching the account."}]}
:::
''',
    "content/curriculum/modules/1-foundations/1.4-roas-measuring-return.mdx": ''':::formula-ladder{id="roas-value-ladder" title="Calculate return on ad spend before celebrating the ratio"}
{"steps":[{"label":"Start with ad sales","expression":"Ad sales = ₱1,200"},{"label":"Subtract the spend","expression":"₱1,200 sales − ₱400 ad spend = ₱800 contribution before product costs","explanation":"ROAS does not include product margin, so the ratio alone cannot prove profitability."},{"label":"Calculate the ratio","expression":"₱1,200 ÷ ₱400 = 3.0x ROAS","explanation":"A higher ROAS means more attributed sales per peso spent, but the acceptable floor depends on margin and objective."}],"result":{"label":"Decision boundary","value":"Compare ROAS with margin and objective","context":"Use break-even ACoS or profit after ad spend before deciding whether to scale."},"note":"ROAS is a return lens, not a profit statement."}
:::
''',
    "content/curriculum/modules/1-foundations/1.5-metrics-in-practice.mdx": ''':::decision-flow{id="metric-story-flow" title="Read the story before naming the lever"}
{"initialStep":0,"steps":[{"id":"attention","label":"Attention","question":"Are shoppers seeing and clicking the ad?","evidence":"Impressions, CTR, placement, query relevance, and main image.","action":"If attention is weak, inspect relevance and the listing surface."},{"id":"economics","label":"Economics","question":"Can the click cost fit the product economics?","evidence":"CPC, AOV, CVR, target ACoS, and break-even margin.","action":"If the ceiling is exceeded, inspect bids, match type, and waste."},{"id":"conversion","label":"Conversion","question":"Does the detail page close the sale?","evidence":"CVR, price, reviews, offer, bullets, and images.","action":"If clicks are healthy but orders are weak, fix the conversion surface."},{"id":"action","label":"Action","question":"Which one lever best tests the diagnosis?","evidence":"The weakest stage in the impression-to-order path.","action":"Change one lever, document the hypothesis, and set a review date."}]}
:::
''',
    "content/curriculum/modules/2-keyword-research/2.2-keyword-research-workflow.mdx": ''':::timeline-calendar{id="keyword-research-workflow" title="Run keyword research as a repeatable evidence cycle"}
{"caption":"The workflow moves from demand discovery to relevance, economics, and campaign placement.","note":"A keyword is not ready for a bid until the evidence shows both product fit and a useful campaign role.","periods":["Discover","Filter","Validate","Place"],"rows":[{"id":"work","label":"Core work","tone":"accent","values":["Collect seed terms, customer language, and competitor terms","Remove irrelevant intent and duplicates","Check search volume, relevance, and economics","Assign the right match type and campaign role"],"note":"One controlled output per stage."},{"id":"evidence","label":"Evidence","tone":"info","values":["Demand source and phrase origin","Product fit and negative risk","CPC, CVR, ACoS, and client objective","Keyword map and naming convention"],"note":"Record why the term belongs."},{"id":"failure","label":"Failure mode","tone":"warning","values":["Volume without product fit","Interesting term with no economic path","Keyword chosen from gut feel","Every term dumped into one campaign"],"note":"Name the risk before scaling."}]}
:::
''',
    "content/curriculum/modules/2-keyword-research/2.4-keyword-grouping.mdx": ''':::hierarchy-builder{id="keyword-grouping-tree" title="Group keywords by intent before building campaigns"}
{"note":"The group should make the bid logic and negative strategy obvious. If the role is unclear, the group is too mixed.","root":{"id":"keyword-map","label":"Keyword map","type":"account","children":[{"id":"exact-winners","label":"Proven exact terms","type":"campaign","detail":"Protect profitable demand","children":[{"id":"exact-group","label":"High-intent group","type":"ad-group","detail":"Exact match","children":[{"id":"exact-target","label":"Product + core intent","type":"target"}]}]},{"id":"phrase-discovery","label":"Phrase discovery","type":"campaign","detail":"Scale useful variants","children":[{"id":"phrase-group","label":"Long-tail group","type":"ad-group","detail":"Phrase match","children":[{"id":"phrase-target","label":"Modifier + product","type":"target"}]}]},{"id":"broad-research","label":"Broad research","type":"campaign","detail":"Find new language","children":[{"id":"broad-group","label":"Exploration group","type":"ad-group","detail":"Broad match","children":[{"id":"broad-target","label":"Category and discovery terms","type":"target"}]}]}]}}
:::
''',
    "content/curriculum/modules/3-listing-optimization/3.1-listing-quality-score.mdx": ''':::annotated-listing{id="listing-readiness-canvas" title="Diagnose the listing before you diagnose the bid"}
{"prompt":"Select the surface that is leaking performance, then fix the evidence before changing traffic volume.","sections":[{"id":"relevance","label":"Relevance","role":"Impression to click","content":"Title and main image clearly match the search intent.","effect":"A relevant surface earns attention from the right shopper."},{"id":"confidence","label":"Confidence","role":"Click to order","content":"Bullets, images, reviews, price, and offer remove purchase doubt.","effect":"A stronger detail page turns paid clicks into orders."},{"id":"economics","label":"Economics","role":"Order to profit","content":"Price, margin, CPC, CVR, and target ACoS fit together.","effect":"The listing can only scale safely when the order economics work."},{"id":"readiness","label":"Readiness","role":"Decision gate","content":"Stock, offer, variation, and claim proof are confirmed.","effect":"Do not buy more traffic for a surface that cannot fulfill or convert it."}]}
:::
''',
    "content/curriculum/modules/3-listing-optimization/3.3-aplus-content.mdx": ''':::comparison-table{id="aplus-investment-matrix" title="Decide whether A+ Content is the next conversion lever"}
{"caption":"A+ is an investment decision. Connect eligibility, message quality, conversion evidence, and cost of delay.","columns":["Basic listing","A+ Content","A+ with testing"],"rows":[{"label":"Eligibility","values":["Available now","Brand Registry or eligible access","Eligible and instrumented"]},{"label":"Primary job","values":["Explain the product","Build confidence and brand story","Test which proof closes the sale"]},{"label":"Evidence needed","values":["Listing gaps and customer questions","High-traffic pages with conversion leakage","Before-and-after conversion and profit"],"emphasis":"positive"},{"label":"Main risk","values":["Under-explained value","Beautiful page without measurable lift","Testing without enough traffic or time"],"emphasis":"warning"}]}
:::
''',
    "content/curriculum/modules/4-campaign-architecture/4.1-sponsored-products.mdx": ''':::funnel-canvas{id="sponsored-products-funnel" title="Match Sponsored Products structure to shopper intent"}
{"note":"Sponsored Products is a system of campaign roles, not one bucket of keywords. Put proven demand, discovery, and product targeting in separate control surfaces.","stages":[{"id":"discovery","label":"Discovery","role":"Find demand","formats":["Automatic targeting","Broad match","Low-bid research"],"question":"Which searches and product pages reveal useful new demand?"},{"id":"consideration","label":"Consideration","role":"Capture active search","formats":["Phrase match","Relevant category terms","Product targeting"],"question":"Which shoppers are comparing options and need a relevant result?"},{"id":"conversion","label":"Conversion","role":"Protect proven demand","formats":["Exact match","Brand defense","High-intent product targets"],"question":"Which proven terms deserve dedicated budget and the strongest control?"}]}
:::
''',
    "content/curriculum/modules/4-campaign-architecture/4.4-campaign-architecture-practice.mdx": ''':::decision-flow{id="campaign-builder-sequence" title="Build the campaign in the order the simulator evaluates it"}
{"initialStep":0,"steps":[{"id":"purpose","label":"Set the purpose","question":"What job does this campaign perform?","evidence":"Product objective, match type, target list, and budget role.","action":"Name the campaign so purpose is obvious before adding targets."},{"id":"targets","label":"Group the targets","question":"Do the targets share intent and bid logic?","evidence":"Keyword relevance, match type, conversion history, and negatives.","action":"Keep proven and unproven targets separate."},{"id":"bids","label":"Set the bids","question":"Can each bid fit the maximum-CPC ceiling?","evidence":"Price, CVR, target ACoS, match type, and data maturity.","action":"Set a defensible starting bid and record the reason."},{"id":"budget","label":"Protect the budget","question":"Does the allocation reflect confidence and purpose?","evidence":"Proven traffic, discovery risk, daily budget, and client limits.","action":"Give proven campaigns first control, then fund discovery deliberately."}]}
:::
''',
    "content/curriculum/modules/6-bidding-lab/6.2-placement-adjustments.mdx": ''':::formula-ladder{id="placement-bid-ladder" title="Separate base bid from placement exposure"}
{"steps":[{"label":"Start with the base bid","expression":"Base bid = ₱50"},{"label":"Apply the placement adjustment","expression":"Top-of-search +50% gives an adjusted bid of ₱75","explanation":"The placement setting changes the ceiling for that placement, not the amount you will always pay."},{"label":"Compare the economics","expression":"Actual CPC and CVR must still fit the target ACoS","explanation":"A higher placement adjustment is only useful if the added traffic creates enough incremental profit."}],"result":{"label":"Placement call","value":"Use the smallest adjustment that earns its place","context":"Review placement spend, CTR, CVR, CPC, ACoS, and incremental orders together."},"note":"Do not optimize placement from CTR alone. The business decision is whether the added placement produces profitable incremental demand."}
:::
''',
    "content/curriculum/modules/7-search-term-triage/7.2-negative-keywords.mdx": ''':::classification-board{id="negative-list-builder" title="Build the working negative list from evidence"}
{"prompt":"Classify the candidate first, then choose the smallest safe negative action.","categories":[{"id":"exact","label":"Negative exact","description":"One specific search is wrong, but nearby variants may still fit."},{"id":"phrase","label":"Negative phrase","description":"The entire phrase family is irrelevant to the product."},{"id":"hold","label":"Hold for evidence","description":"The term is unproven, not clearly wrong, or lacks enough data."},{"id":"remove","label":"Remove or review","description":"The negative is blocking useful demand or was added at the wrong scope."}],"items":[{"id":"wrong-term","label":"free replacement parts","categoryId":"exact","rationale":"Specific mismatch with the product promise."},{"id":"wrong-family","label":"cheap kitchen gadgets","categoryId":"phrase","rationale":"The price-and-category intent is consistently wrong."},{"id":"low-data","label":"portable kitchen prep","categoryId":"hold","rationale":"Relevant language with too little evidence to block."},{"id":"overblock","label":"baking","categoryId":"remove","rationale":"A broad negative may block relevant product use cases."}]}
:::
''',
    "content/curriculum/modules/7-search-term-triage/7.3-str-triage-prep.mdx": ''':::decision-flow{id="str-triage-prep-flow" title="Prepare the STR triage in an evidence-first order"}
{"initialStep":0,"steps":[{"id":"pull","label":"Pull the report","question":"Is the date range and attribution window clear?","evidence":"Report range, account, campaign, and current reporting window.","action":"Save the source before sorting the terms."},{"id":"rank","label":"Rank the work","question":"Which terms consume the most spend or show the clearest signal?","evidence":"Spend, clicks, orders, CTR, CVR, ACoS, and relevance.","action":"Start with expensive terms and obvious winners or waste."},{"id":"route","label":"Assign the action","question":"Does the term need harvest, monitoring, a negative, judgment, or investigation?","evidence":"Five-category triage rules and confidence thresholds.","action":"Write one category and one reason in the action log."},{"id":"review","label":"Set the follow-up","question":"When will the change be reviewed?","evidence":"Spend velocity, risk, and the next weekly cycle.","action":"Give every change an owner, date, and success signal."}]}
:::
''',
}


def main() -> None:
    changed = []
    skipped = []
    for relative, block in BLOCKS.items():
        path = ROOT / relative
        source = path.read_text(encoding="utf-8")
        block_id = block.split('id="', 1)[1].split('"', 1)[0]
        if f'id="{block_id}"' in source:
            skipped.append(relative)
            continue
        marker = "## Your turn"
        position = source.find(marker)
        if position < 0:
            marker = "## Key Takeaways"
            position = source.find(marker)
        if position < 0:
            raise RuntimeError(f"No insertion marker found for {relative}")
        path.write_text(source[:position] + block + "\n" + source[position:], encoding="utf-8")
        changed.append(relative)
    print(f"changed={len(changed)} skipped={len(skipped)}")
    for item in changed:
        print(f"CHANGED {item}")
    for item in skipped:
        print(f"SKIPPED {item}")


if __name__ == "__main__":
    main()
