import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = "/home/ubuntu/amazon-ph-simulators-hub/coach-decks/modules";

const modules = [
  {
    id: "m0", number: 0, title: "Amazon Basics",
    goal: "Understand what shoppers see before they buy on Amazon.",
    practice: "BuyBox Dojo", score: "75%", quiz: "70%",
    scenario: "A cutting board gets visits, but shoppers do not buy. Check the product page before changing any ads.",
    guardrail: "Do not pay for more visits when the product is out of stock, badly priced, or missing a clear image.",
    evidence: "Write the product name and price. Note stock, image, reviews, Buy Box, and the first issue.",
    points: [
      ["Amazon marketplace", "Amazon is an online shopping place. Many sellers offer products to the same shoppers.", "A shopper searches for a cutting board and sees several sellers.", "Your next step: find the product and its competing offers."],
      ["Product listing", "A listing is the product page. It shows the title, images, price, reviews, and buying choices.", "Think of it as the product’s online shelf label.", "Your next step: open one listing and point out its title and main image."],
      ["Organic traffic", "Organic traffic is a shopper visit that Amazon gives without an ad click.", "A shopper finds the cutting board by searching on Amazon.", "Your next step: remember that not every visit comes from an ad."],
      ["Paid traffic", "Paid traffic is a shopper visit after someone clicks an ad. The seller pays for that click.", "An ad sends a shopper to the same cutting board page.", "Your next step: check whether the page is ready before buying more clicks."],
      ["Buy Box", "The Buy Box is the main purchase area on a product page. It helps decide which seller gets the order.", "Two sellers offer the same item, but only one is selected for the main buy button.", "Your next step: check who owns the Buy Box before asking for more ad spend."],
      ["Stock", "Stock means how many items are ready to sell. No stock means a shopper cannot buy.", "A good ad cannot create an order for an out-of-stock cutting board.", "Your next step: check stock before reviewing ad results."],
      ["Shopper decision", "A shopper needs a clear reason to buy. Good photos, fair price, and trust help that decision.", "A clear image and honest price can help more than a higher ad bid.", "Your next step: name one page detail that could stop a shopper from buying."]
    ]
  },
  {
    id: "m1", number: 1, title: "What is PPC?",
    goal: "Understand how a paid ad can bring a shopper to a product page.",
    practice: "AdConsole Pro", score: "75%", quiz: "70%",
    scenario: "Two sellers want to show an ad for the same shopper search. A higher bid helps, but it is not the only thing Amazon considers.",
    guardrail: "A bid is the most you are willing to pay for one click. It does not promise a sale.",
    evidence: "Write: impressions, clicks, product-page visits, orders, and the first place where shoppers drop off.",
    points: [
      ["PPC", "PPC means pay per click. You pay when a shopper clicks your ad, not when the ad simply appears.", "If an ad appears 100 times but gets no clicks, there is no click charge.", "Your next step: say the meaning of PPC in your own words."],
      ["Impression", "An impression is one time an ad appears on a shopper’s screen.", "One shopper sees your cutting board ad in a search result.", "Your next step: separate an ad view from an ad click."],
      ["Click", "A click happens when a shopper chooses the ad and opens the product page.", "The seller pays for that one shopper visit.", "Your next step: remember that a click is a visit, not an order."],
      ["Auction", "An auction is Amazon’s quick choice of which ads may appear for a shopper search.", "Several sellers want to show an ad for “bamboo cutting board.”", "Your next step: know that Amazon chooses among more than one ad."],
      ["Bid", "A bid is the maximum amount you are willing to pay for one click.", "A $0.80 bid means “do not pay more than $0.80 for one click.”", "Your next step: do not confuse a bid with a daily budget."],
      ["Relevance", "Relevance asks whether the ad and product match what the shopper is looking for.", "A cutting board is more relevant to “bamboo cutting board” than to “kitchen blender.”", "Your next step: check whether the product truly matches the search."],
      ["Funnel", "A funnel is the path from seeing an ad to buying a product.", "The path is: ad view, click, product page, then order.", "Your next step: find the first weak step before changing the ad."]
    ]
  },
  {
    id: "m2", number: 2, title: "Money Math",
    goal: "Use simple numbers to decide whether an ad is helping or hurting the business.",
    practice: "Keyword Lab", score: "75%", quiz: "70%",
    scenario: "The campaign spent $30, made $120 in sales, and received 30 clicks. Start by finding the cost of one click: $30 ÷ 30 = $1.",
    guardrail: "A high sales number can still lose money. Always compare ad cost with the product’s margin.",
    evidence: "Write the formula and numbers. Record the answer, safe limit, and next action.",
    points: [
      ["CPC", "CPC means cost per click. It shows the average amount paid when a shopper clicks an ad.", "$30 spend ÷ 30 clicks = $1 CPC.", "Your next step: divide spend by clicks."],
      ["CTR", "CTR means click-through rate. It shows how often people click after seeing an ad.", "5 clicks ÷ 1,000 ad views = 0.5% CTR.", "Your next step: divide clicks by ad views, then multiply by 100."],
      ["Conversion rate", "Conversion rate shows how often a click becomes an order.", "1 order ÷ 5 clicks = 20% conversion rate.", "Your next step: divide orders by clicks, then multiply by 100."],
      ["ACOS", "ACOS compares ad spend with sales made from the ad. Lower is not always better, but it must be safe for the business.", "$20 ad spend ÷ $100 ad sales = 20% ACOS.", "Your next step: divide spend by ad sales, then multiply by 100."],
      ["ROAS", "ROAS shows sales earned for every $1 spent on ads.", "$120 sales ÷ $30 spend = 4 ROAS. That means $4 sales for each $1 spent.", "Your next step: divide ad sales by ad spend."],
      ["Break-even ACOS", "Break-even ACOS is the highest ad-cost percentage the product can afford before profit disappears.", "If the product margin is 30%, a simple break-even ACOS is 30%.", "Your next step: ask for the product margin before judging ACOS."],
      ["TACoS", "TACoS compares ad spend with all sales, not only sales directly from ads.", "It helps you see if ads support the whole product, including repeat and organic sales.", "Your next step: use TACoS only after you understand spend and sales first."]
    ]
  },
  {
    id: "m3", number: 3, title: "Campaign Structure",
    goal: "Build a clean campaign setup so another VA can understand what each part is for.",
    practice: "Campaign Architect", score: "75%", quiz: "70%",
    scenario: "One campaign mixes discovery words, proven winners, and competitor products. Split them so each group has one clear job.",
    guardrail: "Do not mix work that needs different budgets, bids, or decisions in one campaign.",
    evidence: "Write: campaign name, purpose, target type, budget owner, bid rule, and review day.",
    points: [
      ["Campaign", "A campaign is the largest ad container. It holds a budget and a clear goal.", "One campaign can be for finding new shopper searches.", "Your next step: write the one job of a campaign."],
      ["Ad group", "An ad group is a smaller section inside a campaign. It keeps similar products or targets together.", "A cutting-board ad group can hold cutting-board targets.", "Your next step: keep unrelated products out of the same ad group."],
      ["Target", "A target tells Amazon what shopper search or product you want to reach.", "“Bamboo cutting board” can be a search target.", "Your next step: check what each target is trying to reach."],
      ["Sponsored Products", "Sponsored Products are ads for one product. They often appear in Amazon search results.", "A cutting board appears beside other cutting boards in search.", "Your next step: use this when you need to promote a product directly."],
      ["Sponsored Brands", "Sponsored Brands are ads that can show a brand name and several products.", "A kitchen brand shows three related cutting boards together.", "Your next step: know that this ad type is for a brand, not only one item."],
      ["Sponsored Display", "Sponsored Display can show product ads in more shopping places, including product pages.", "A shopper viewing one board may see another board as an ad.", "Your next step: identify the ad type before changing it."],
      ["Naming rule", "A naming rule uses the same order of words so the team can read a campaign quickly.", "Example: US | Cutting Board | Exact | Sales.", "Your next step: make campaign names describe purpose, not just a date."]
    ]
  },
  {
    id: "m4", number: 4, title: "Keywords & Match Types",
    goal: "Choose how closely Amazon should match a shopper’s search to your product.",
    practice: "Keyword Lab and Search Term Triage", score: "75% on each simulator", quiz: "70%",
    scenario: "A shopper typed a search different from the keyword you bought. Use the report before deciding to keep, block, or promote it.",
    guardrail: "Do not change a keyword after one click or one order. Wait for enough useful evidence.",
    evidence: "Write: shopper search, keyword used, clicks, orders, action, reason, and review date.",
    points: [
      ["Keyword", "A keyword is a word or phrase you give Amazon to help show your ad.", "You choose “bamboo cutting board” as a keyword.", "Your next step: list one phrase a shopper may use."],
      ["Search term", "A search term is what the shopper actually typed into Amazon.", "Your keyword may be “cutting board,” but the shopper typed “small bamboo cutting board.”", "Your next step: do not treat the keyword and shopper search as the same thing."],
      ["Broad match", "Broad match gives Amazon the most freedom to find related shopper searches.", "It can help you discover new words, but you must check the report.", "Your next step: use broad match for learning, not blind spending."],
      ["Phrase match", "Phrase match gives more control. The shopper search should include the main phrase or a close version.", "“Bamboo cutting board with handle” can match a phrase about bamboo cutting boards.", "Your next step: use phrase match when the main words matter."],
      ["Exact match", "Exact match gives the most control. It is used for a very close shopper search.", "A proven search can become its own exact keyword.", "Your next step: move only proven search words into exact match."],
      ["Negative keyword", "A negative keyword blocks an unwanted shopper search so the ad does not spend on it.", "Block “blender” if it brings clicks to a cutting board but no relevant shoppers.", "Your next step: block terms that are clearly unrelated."],
      ["Research", "Research means looking for shopper words that fit the product and the buyer’s need.", "Read the search report, then group words as useful, not useful, or not sure yet.", "Your next step: keep a list of words to check again next week."]
    ]
  },
  {
    id: "m5", number: 5, title: "Listing Readiness",
    goal: "Check the product page before spending more money to bring shoppers there.",
    practice: "BuyBox Dojo", score: "75%", quiz: "70%",
    scenario: "Many shoppers click the ad, but few order. Check the product page for trust and buying problems first.",
    guardrail: "Fix the product page before asking the ad to bring more expensive traffic.",
    evidence: "Write: readiness score, main problem, owner, planned fix, and the day to check again.",
    points: [
      ["Listing readiness", "Listing readiness means the product page is ready to help a shopper buy.", "A ready page makes the product, price, and offer easy to understand.", "Your next step: check the page before looking for an ad fix."],
      ["Main image", "The main image is the first product photo a shopper sees. It must quickly show the item.", "A clear cutting-board photo helps a shopper understand the product at a glance.", "Your next step: check if the main image is clear on a small screen."],
      ["Title", "The title tells the shopper what the item is. It should be clear before it tries to be clever.", "“Bamboo Cutting Board, 12 Inch” tells the shopper the product and size.", "Your next step: read the title as if you have never seen the product."],
      ["Price", "Price is part of the shopper’s decision. A product can get clicks but lose orders if the offer feels weak.", "A shopper compares the board price with other similar boards.", "Your next step: compare the offer, not only the ad result."],
      ["Reviews", "Reviews show what other buyers experienced. They can help a new shopper feel safe buying.", "A product with few or poor reviews may need a stronger offer or better information.", "Your next step: note review count and recurring complaints."],
      ["Conversion", "Conversion means a shopper clicked and then bought. Low conversion can mean the page is not convincing.", "Ten clicks with no orders is a reason to check the listing.", "Your next step: check the page before raising the bid."],
      ["Trust", "Trust comes from clear details, realistic images, stock, price, and a working Buy Box.", "A shopper needs fewer reasons to worry before buying.", "Your next step: name the one trust issue you would fix first."]
    ]
  },
  {
    id: "m6", number: 6, title: "Campaign Setup",
    goal: "Start a new campaign safely so the team can learn before scaling spend.",
    practice: "Campaign Architect and AdConsole Pro", score: "75% on each simulator", quiz: "70%",
    scenario: "A new product has little search history. Use one campaign to learn and another to control proven shopper searches.",
    guardrail: "A launch budget is for learning first. Do not scale until the results show what to do next.",
    evidence: "Write: campaign purpose, budget share, learning question, success sign, and weekly decision.",
    points: [
      ["Auto campaign", "An auto campaign lets Amazon choose shopper searches and products to test.", "It can help a new product discover where shoppers may respond.", "Your next step: use auto when you need ideas to investigate."],
      ["Manual campaign", "A manual campaign lets you choose the keywords or products to target.", "Use a proven cutting-board search in a manual campaign.", "Your next step: use manual when you want more control."],
      ["Starter structure", "A starter structure is a small set of campaigns with clear jobs. Start simple so results are readable.", "One discovery campaign and one controlled campaign are easier to review than many small campaigns.", "Your next step: give each campaign one purpose."],
      ["Learning question", "A learning question is what you want the first campaign to teach you.", "Example: Which shopper searches are relevant to this new cutting board?", "Your next step: write one question before launching."],
      ["Budget share", "Budget share is how you divide daily money between campaign jobs.", "Give a small, planned part to learning and protect money for proven work.", "Your next step: write why each campaign receives its budget."],
      ["Four-week plan", "A four-week plan gives the launch a calm review rhythm instead of daily guessing.", "Week 1 observes. Week 2 checks searches. Week 3 adjusts carefully. Week 4 reviews the pattern.", "Your next step: schedule the next review before launch day."],
      ["Safe scale", "Safe scale means increasing spend only after you can explain why the current result is good enough.", "A repeat result is stronger evidence than one lucky order.", "Your next step: decide what proof you need before raising the budget."]
    ]
  },
  {
    id: "m7", number: 7, title: "Bids & Budgets",
    goal: "Control how much a campaign can pay for clicks and spend each day.",
    practice: "Bid Decisions and Pacing Deck", score: "75% on each simulator", quiz: "70%",
    scenario: "A campaign spends $27 at a $0.90 bid. A careful move to $0.65 brings spend down to $14 while sales stay at $50.",
    guardrail: "Change one thing at a time. Set a safety limit and a review date before editing a bid or budget.",
    evidence: "Write: starting result, one change, expected effect, safety limit, owner, and review date.",
    points: [
      ["Bid", "A bid is the maximum you are willing to pay for one ad click.", "A $0.65 bid means you will not pay more than $0.65 for a click.", "Your next step: say what a bid controls."],
      ["Daily budget", "A daily budget is the most the campaign may spend in one day.", "A $20 daily budget protects the campaign from spending more than $20 that day.", "Your next step: do not confuse a daily budget with a bid."],
      ["Pacing", "Pacing means checking whether the daily budget is spending too fast or too slowly.", "A campaign may use its whole budget before midday or barely spend at all.", "Your next step: check spend during the day before changing a number."],
      ["Controlled change", "A controlled change means editing one setting so you can see what caused the result.", "Lower the bid first. Do not lower the bid and budget at the same time.", "Your next step: choose one setting to test."],
      ["Safety limit", "A safety limit is the result you do not want to cross while testing a change.", "Example: do not let spend rise above the planned daily budget.", "Your next step: write the safety limit before you make the change."],
      ["Review date", "A review date is when you will look at the result after the change.", "Set Friday as the day to compare the new bid with the old bid.", "Your next step: schedule the review, not only the edit."],
      ["Reason for change", "A reason for change connects the number you edit to a business problem.", "Lower a bid because cost per click is too high, not because you feel nervous.", "Your next step: write one sentence explaining the change."]
    ]
  },
  {
    id: "m8", number: 8, title: "Search Terms & Negatives",
    goal: "Use a search report to keep useful shopper searches and stop waste.",
    practice: "Search Term Triage and Bulk File Simulator", score: "75% on each simulator", quiz: "70%",
    scenario: "One relevant search has repeat orders. Another has many clicks but is clearly unrelated. They need different actions.",
    guardrail: "Do not promote every early order or block every search without an order. Read the full situation first.",
    evidence: "Write: search term, category, action, reason, reviewer, and date to check the change.",
    points: [
      ["Search report", "A search report shows what shoppers typed before they clicked an ad.", "Use it to see the real shopper words, not only your chosen keywords.", "Your next step: open the report and read one shopper search."],
      ["Winner", "A winner is a relevant shopper search with enough good results to keep or promote.", "A search that brings repeat orders may deserve its own exact keyword.", "Your next step: look for repeat useful results, not one lucky sale."],
      ["Waste", "Waste is spend from a shopper search that is clearly wrong for the product or keeps failing after enough evidence.", "“Kitchen blender” is not a useful search for a cutting board.", "Your next step: block clearly unrelated searches."],
      ["Maybe", "A maybe is a relevant search that needs more time or more clicks before you decide.", "A new search with two clicks and no order may be too early to judge.", "Your next step: write a date to look at it again."],
      ["Exact keyword", "An exact keyword gives a proven shopper search its own, more controlled place.", "Move a repeat buyer search into its own exact keyword.", "Your next step: promote only when you can explain the evidence."],
      ["Negative keyword", "A negative keyword stops an unwanted shopper search from using budget.", "Block a clearly wrong search so it cannot keep spending money.", "Your next step: add a negative for the wrong reason, not just a low result."],
      ["Harvest loop", "A harvest loop is a weekly routine: read the report, choose an action, log it, then check again.", "The report becomes useful only when you make and review careful decisions.", "Your next step: follow the same four steps every week."]
    ]
  },
  {
    id: "m9", number: 9, title: "Weekly Optimization",
    goal: "Use a calm weekly routine instead of reacting to one day of results.",
    practice: "Account Audit and Search Term Triage", score: "75% on each simulator", quiz: "70%",
    scenario: "Monday looks worse than last week. First check the full week and the product situation before changing the account.",
    guardrail: "One day is not always a trend. One controlled change is easier to learn from than many changes.",
    evidence: "Write: weekly priority, starting result, one change, confidence level, and next observation date.",
    points: [
      ["Weekly routine", "A weekly routine is the same order of checks each week. It stops random editing.", "Check product health, results, search terms, then planned changes.", "Your next step: use the same review order every week."],
      ["Priority", "A priority is the one problem that matters most this week.", "Fix an out-of-stock product before trying to improve a keyword.", "Your next step: choose one problem before opening settings."],
      ["Baseline", "A baseline is the result before you make a change. It gives you something fair to compare later.", "Write this week’s spend, sales, and orders before editing a bid.", "Your next step: record the baseline first."],
      ["One variable", "One variable is one setting you change while keeping other settings the same.", "Change the bid, but leave the target and budget alone for this test.", "Your next step: name the single setting you will change."],
      ["Confidence", "Confidence means how sure you are that the data is enough to support a decision.", "A full week is usually more useful than one unusual day.", "Your next step: say if the evidence is strong, weak, or still early."],
      ["Observation window", "An observation window is the planned time you wait before judging a change.", "Review Friday after a Monday bid change instead of checking every hour.", "Your next step: write the check date beside the change."],
      ["Change log", "A change log is a short record of what changed and why.", "Another VA should be able to read it and understand the decision.", "Your next step: log the reason, action, and review date."]
    ]
  },
  {
    id: "m10", number: 10, title: "Reporting & Troubleshooting",
    goal: "Explain account results in simple language and check problems in the right order.",
    practice: "Account Audit", score: "75%", quiz: "70%",
    scenario: "Clicks stay steady but sales fall. Check stock, price, reviews, and competitors before saying the ads are the problem.",
    guardrail: "Do not send a table of numbers without explaining what changed, why it matters, and what happens next.",
    evidence: "Write: result, likely reason, one safe action, risk, and the next question to answer.",
    points: [
      ["Report", "A report is a short explanation of what happened and what the team will check next.", "A useful report helps a client understand the account without reading every number.", "Your next step: start with the main result, not a long data table."],
      ["Result", "A result is the clear change you observed in the account.", "Example: sales fell while clicks stayed the same.", "Your next step: write one sentence about what changed."],
      ["Driver", "A driver is the likely reason behind a result. It needs checking, not guessing.", "Low stock or a price change can lower sales even when clicks are steady.", "Your next step: name the first thing you need to verify."],
      ["Top of funnel", "Top of funnel means the early part of the shopper path: seeing and clicking the ad.", "Low ad views or few clicks can be an early-path problem.", "Your next step: check ad views and clicks before calling it a sales problem."],
      ["Bottom of funnel", "Bottom of funnel means the buying part of the shopper path: product page and order.", "Many clicks but few orders can point to the product page or offer.", "Your next step: check stock, price, reviews, and competitors."],
      ["Troubleshooting order", "Troubleshooting order is the calm sequence used to find a problem.", "Check stock, price, reviews, then competitors before changing an ad setting.", "Your next step: follow the order instead of guessing."],
      ["Next action", "A next action is one safe step based on the problem you checked.", "If stock is low, report the stock issue instead of raising the bid.", "Your next step: give one owner and one check date for the action."]
    ]
  },
  {
    id: "m11", number: 11, title: "VA Workflow & Capstone",
    goal: "Work safely as a VA by following permissions, SOPs, and a clear change log.",
    practice: "Client Onboarding and Capstone Sequence", score: "75% onboarding and 85% capstone", quiz: "70%",
    scenario: "Spend rises on a weak target. The VA can collect evidence and update the log, but a strategy change may need manager approval.",
    guardrail: "Do not make a strategy change outside your agreed permission. Record the issue and ask for approval when needed.",
    evidence: "Complete: permission level, SOP step, change log, simulator result, quiz result, and supervisor review.",
    points: [
      ["VA workflow", "A VA workflow is the repeatable order of work you follow for a client account.", "Check tasks, collect evidence, update the log, then report or ask for approval.", "Your next step: follow the same work order each time."],
      ["Permission", "Permission tells you what you may do by yourself and what needs approval.", "You may collect a search report, while a big budget change may need a manager.", "Your next step: check the permission before making a change."],
      ["SOP", "An SOP is a step-by-step work guide. It helps the team do a task in the same safe way.", "An SOP can show how to check stock before reporting a sales drop.", "Your next step: follow the SOP before creating your own process."],
      ["Change log", "A change log records what changed, why it changed, and who approved it.", "Write the old bid, new bid, reason, owner, and review date.", "Your next step: log a change on the same day it happens."],
      ["Independent task", "An independent task is safe work you can complete without a strategy decision.", "Collecting data, checking a listing, and preparing a report can be independent tasks.", "Your next step: separate evidence work from strategy changes."],
      ["Approval task", "An approval task is a change that needs a manager or client decision.", "Changing a large budget or campaign plan may need approval.", "Your next step: send the evidence and your recommended next step."],
      ["Capstone", "A capstone is the final practice where you show the full work process safely.", "You show that you can check evidence, follow the SOP, make the right request, and explain your work.", "Your next step: prepare your evidence before starting the capstone."]
    ]
  }
];

const escape = value => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function slide(module, page, eyebrow, title, term, meaning, example, action) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1280, initial-scale=1.0">
  <style>
    *{box-sizing:border-box} body{margin:0}.slide-container{width:1280px;min-height:720px;background:#f7f8fa;color:#152238;font-family:Arial,Helvetica,sans-serif;padding:54px 72px;position:relative;overflow:hidden}.eyebrow{font-size:15px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#a56508}.title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:32px}.title{max-width:890px;margin:12px 0 18px;font-size:52px;line-height:1.05;letter-spacing:-1.4px}.stage{font-size:16px;font-weight:800;color:#64748b;white-space:nowrap;margin-top:18px}.rule{height:5px;width:170px;background:linear-gradient(90deg,#ff9900 0 33%,#00875a 33% 66%,#de350b 66%);margin:0 0 22px}.grid{display:grid;grid-template-columns:0.9fr 1.35fr;gap:18px}.panel{min-height:232px;padding:24px 26px;background:#fff;border:1px solid #d8dee8}.label{display:block;margin-bottom:12px;color:#a56508;font-size:14px;letter-spacing:1.4px;font-weight:800;text-transform:uppercase}.term{font-size:32px;line-height:1.08;font-weight:800}.body-copy{font-size:24px;line-height:1.36;margin:0}.example{border-top:5px solid #00875a}.action{margin-top:18px;padding:17px 22px;background:#152238;color:#fff;font-size:21px;line-height:1.35}.action strong{color:#ffbf55}.footer{position:absolute;left:72px;right:72px;bottom:22px;display:flex;justify-content:space-between;color:#64748b;font-size:13px}.reveal{opacity:0;transform:translateY(12px);animation:reveal .48s ease-out both}.d1{animation-delay:.08s}.d2{animation-delay:.16s}.d3{animation-delay:.24s}@keyframes reveal{to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;animation:none}}
  </style>
</head>
<body>
  <div class="slide-container">
    <div class="eyebrow reveal">Module ${module.number} · ${escape(eyebrow)}</div>
    <div class="title-row"><h1 class="title reveal d1">${escape(title)}</h1><span class="stage reveal d1">${page} / 12</span></div>
    <div class="rule reveal d1"></div>
    <main class="grid">
      <section class="panel reveal d2"><span class="label">Word to know</span><div class="term">${escape(term)}</div></section>
      <section class="panel example reveal d3"><span class="label">Plain meaning</span><p class="body-copy">${escape(meaning)}</p><span class="label" style="margin-top:18px">Small example</span><p class="body-copy">${escape(example)}</p></section>
    </main>
    <div class="action reveal d3"><strong>Your next step:</strong> ${escape(action.replace(/^Your next step:\s*/i, ""))}</div>
    <footer class="footer"><span>Project Amazon PH Academy · ${escape(module.title)}</span><span>Beginner-first teaching series</span></footer>
  </div>
</body>
</html>`;
}

for (const module of modules) {
  const folder = path.join(root, module.id);
  await mkdir(folder, { recursive: true });
  const slides = [
    ["Start here", module.title, "Today’s goal", module.goal, "You do not need Amazon experience to begin. Learn one small idea, then use it in a safe practice task.", "Read the title and say what you want to learn today."],
    ...module.points.map(([term, meaning, example, action]) => ["One idea at a time", term, term, meaning, example, action]),
    ["Try it", "Use a small situation", "Before you click", "Read the situation. Find the one thing to check before making a change.", module.scenario, "Write the first thing you would check and why."],
    ["Keep it safe", "Know what not to change yet", "Pause first", "Good VA work is careful. Stop when a product or account problem needs checking before an ad change.", module.guardrail, "Say what you would not change yet."],
    ["Show your work", "Write a simple evidence note", "Evidence note", "A short note makes your decision easy for a manager or another VA to understand.", module.evidence, "Copy the evidence note into your workspace after practice."],
    ["Finish the module", "Prove one small skill", "Assessment gate", `Complete the ${module.practice} practice at ${module.score}. Then pass the module quiz at ${module.quiz}.`, "Do the practice first. Use your evidence note to explain one decision.", "Complete the practice, save your note, then take the quiz."]
  ];
  for (const [index, data] of slides.entries()) {
    const [eyebrow, title, term, meaning, example, action] = data;
    await writeFile(path.join(folder, `slide_${index + 1}.html`), slide(module, index + 1, eyebrow, title, term, meaning, example, action));
  }
}

await writeFile(
  "/home/ubuntu/amazon-ph-simulators-hub/coach-decks/module-decks.js",
  `window.ModuleDecks = ${JSON.stringify(modules.map(module => ({ id: module.id, number: module.number, title: module.title, files: Array.from({ length: 12 }, (_, index) => `slide_${index + 1}.html`) })), null, 2)};\n`
);

console.log("Built 12 beginner-first slides for each of 12 modules.");
