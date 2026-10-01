import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = "/home/ubuntu/amazon-ph-simulators-hub";
const baseUrl = "https://projectamazonph.github.io/amazon-ph-simulators/";
const previewImage = `${baseUrl}docs/screenshots/simgrid-hub.jpg`;
const organization = {
  "@type": "Organization",
  name: "Project Amazon PH Academy",
  url: baseUrl,
  sameAs: ["https://github.com/projectamazonph/amazon-ph-simulators"]
};
const footerGroups = [
  {
    name: "Learn",
    links: [
      ["VA Start Here", "start-here.html"],
      ["PPC Coach", "ppc-coach.html"],
      ["Student Guide", "learn/guide.html"],
      ["Module Decks", "coach-decks.html"]
    ]
  },
  {
    name: "Practice",
    links: [
      ["Simulator Library", "index.html#simulator-library"],
      ["Campaign Architect", "campaign-architect.html"],
      ["Account Audit", "account-audit.html"]
    ]
  },
  {
    name: "Coach",
    links: [
      ["Coach Tools", "coach-tools.html"],
      ["Resource Library", "coach-resource-library.html"],
      ["Learning Docs", "learn/index.html"]
    ]
  },
  {
    name: "Project",
    links: [
      ["Roadmap", "planned-simulators.html"],
      ["Source Repository", "https://github.com/projectamazonph/amazon-ph-simulators"],
      ["Project Guide", "site-guide.md"]
    ]
  }
];

const corePages = [
  ["index.html", "Project Amazon PH Academy | Amazon PPC Training Simulators", "Practice Amazon PPC fundamentals with 12 browser-based simulators, a guided PPC Coach path, and instructor resources for Filipino virtual assistants.", "WebSite", "Amazon PPC training, simulator practice, Filipino virtual assistants"],
  ["start-here.html", "VA Start Here | Amazon PPC Onboarding and Quick Glossary", "Start Amazon PPC training with a plain-English quick glossary, safe first-session plan, and direct links for new Filipino virtual assistants.", "LearningResource", "Amazon PPC glossary, beginner virtual assistant onboarding, PPC terms"],
  ["ppc-coach.html", "PPC Coach | Amazon PPC Learning Path for Virtual Assistants", "Follow a guided Amazon PPC learning path with 12 modules, short lessons, quizzes, and simulator practice for virtual assistants.", "Course", "Amazon PPC course, virtual assistant training, guided learning"],
  ["coach-tools.html", "Coach Tools | Amazon PPC Teaching Decks and Materials", "Use 12 module teaching decks, worksheets, scenario cards, and evidence templates to teach practical Amazon PPC decisions.", "LearningResource", "Amazon PPC instructor tools, teaching decks, learner worksheets"],
  ["coach-resource-library.html", "Amazon PPC Resource Library | Project Amazon PH Academy", "Browse module-aligned Amazon PPC handouts, worksheets, cheat sheets, templates, assessments, and facilitator resources.", "CollectionPage", "Amazon PPC worksheets, handouts, virtual assistant resources"],
  ["coach-decks.html", "Amazon PPC Teaching Deck Viewer | Project Amazon PH Academy", "Teach one Amazon PPC module at a time with 12 beginner-first, browser-based slide decks for virtual assistant learners.", "LearningResource", "Amazon PPC teaching slides, beginner PPC training, virtual assistants"],
  ["planned-simulators.html", "Amazon PPC Simulator Roadmap | Project Amazon PH Academy", "Explore the Project Amazon PH Academy simulator roadmap, practice coverage, and learning paths for Amazon PPC operations.", "CollectionPage", "Amazon PPC simulator roadmap, PPC practice tools"],
  ["ad-console.html", "AdConsole Pro | Amazon PPC Campaign Practice Simulator", "Practice Amazon PPC campaign operations, keyword actions, bidding, and reporting decisions in AdConsole Pro.", "SoftwareApplication", "Amazon PPC campaign simulator, ad operations practice"],
  ["keyword-lab.html", "Keyword Lab | Amazon PPC Keyword Research Simulator", "Practice keyword research, search intent, match types, and safe targeting decisions for Amazon PPC.", "SoftwareApplication", "Amazon PPC keyword research simulator, match types practice"],
  ["search-triage.html", "Search Term Triage | Amazon PPC Search Report Simulator", "Practice reading Amazon search terms, identifying winners and waste, and choosing clear next actions.", "SoftwareApplication", "Amazon PPC search term report simulator, negative keywords"],
  ["sqp-studio.html", "SQP Studio | Amazon Search Query Performance Practice", "Practice interpreting search query performance signals and selecting a careful Amazon PPC follow-up action.", "SoftwareApplication", "Amazon search query performance, PPC analytics simulator"],
  ["bid-decisions.html", "Bid Decisions | Amazon PPC Bid Practice Simulator", "Practice controlled Amazon PPC bid decisions using clear evidence, safety limits, and review points.", "SoftwareApplication", "Amazon PPC bidding simulator, bid decisions practice"],
  ["campaign-architect.html", "Campaign Architect | Amazon PPC Structure Simulator", "Practice building a clear Amazon PPC campaign structure with campaigns, ad groups, targets, and review rules.", "SoftwareApplication", "Amazon PPC campaign structure simulator"],
  ["account-audit.html", "Account Audit | Amazon PPC Audit Practice Simulator", "Practice finding Amazon PPC account issues, prioritizing evidence, and writing a clear next-step recommendation.", "SoftwareApplication", "Amazon PPC audit simulator, account review practice"],
  ["client-onboarding.html", "Client Onboarding | Amazon PPC VA Practice Simulator", "Practice turning client intake details into a clear Amazon PPC operating brief and safe first actions.", "SoftwareApplication", "Amazon PPC client onboarding, virtual assistant practice"],
  ["capstone-sequence.html", "Capstone Sequence | Amazon PPC Workflow Practice", "Practice the complete Amazon PPC learning workflow from evidence gathering through a supervised final decision.", "SoftwareApplication", "Amazon PPC capstone, virtual assistant workflow practice"],
  ["bulk-file.html", "Bulk File Simulator | Amazon PPC Bulk Operations Practice", "Practice Amazon PPC bulk-file structure, controlled updates, and safe operational checks.", "SoftwareApplication", "Amazon PPC bulk file simulator, bulk operations practice"],
  ["listing.html", "BuyBox Dojo | Amazon Listing Readiness Practice", "Practice checking Amazon listing readiness, Buy Box signals, stock, price, and shopper trust before changing ads.", "SoftwareApplication", "Amazon listing readiness simulator, Buy Box practice"],
  ["pacing-deck.html", "Pacing Deck | Amazon PPC Budget Pacing Practice", "Practice checking Amazon PPC daily spend, pacing, budgets, and controlled changes.", "SoftwareApplication", "Amazon PPC budget pacing simulator"],
  ["learn/index.html", "Learn Amazon PPC | Project Amazon PH Academy", "Start the Project Amazon PH Academy learning hub with Amazon PPC guides, practice resources, and simulator pathways.", "CollectionPage", "learn Amazon PPC, Filipino virtual assistant training"],
  ["learn/guide.html", "Amazon PPC Student Guide | Project Amazon PH Academy", "Read the student guide for a practical Amazon PPC learning sequence, simulator practice, and readiness checks.", "LearningResource", "Amazon PPC student guide, VA learning path"],
  ["learn/features.html", "Amazon PPC Learning Features | Project Amazon PH Academy", "Explore the practical learning features, simulator exercises, and coaching support in Project Amazon PH Academy.", "CollectionPage", "Amazon PPC training features, simulator learning"],
  ["learn/handouts.html", "Amazon PPC Learning Handouts | Project Amazon PH Academy", "Access Amazon PPC handouts and learning materials that support simulator practice and evidence-based decisions.", "LearningResource", "Amazon PPC handouts, learning materials"],
  ["learn/downloads.html", "Amazon PPC Downloads | Project Amazon PH Academy", "Download practical Amazon PPC learning resources, templates, and exercises for virtual assistant practice.", "CollectionPage", "Amazon PPC downloads, VA practice templates"]
].map(([file, title, description, schemaType, keywords]) => ({ file, title, description, schemaType, keywords }));

const escapeHtml = value => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function footerNavigationSchema(url) {
  return {
    "@type": "SiteNavigationElement",
    "@id": `${url}#footer-navigation`,
    name: "Project Amazon PH Academy footer navigation",
    description: "Visible footer links to Project Amazon PH Academy learning, practice, coaching, and project resources.",
    hasPart: footerGroups.map(group => ({
      "@type": "ItemList",
      name: `${group.name} footer links`,
      numberOfItems: group.links.length,
      itemListElement: group.links.map(([name, href], position) => ({
        "@type": "ListItem",
        position: position + 1,
        name,
        item: {
          "@type": "WebPage",
          name,
          url: new URL(href, baseUrl).href
        }
      }))
    }))
  };
}

function pageSchema(page, url) {
  const webPage = {
    "@type": "WebPage",
    "@id": url,
    url,
    name: page.title,
    description: page.description,
    inLanguage: ["en", "fil"],
    isPartOf: { "@type": "WebSite", name: "Project Amazon PH Academy", url: baseUrl },
    about: page.keywords.split(", ").map(name => ({ "@type": "Thing", name }))
  };
  const footerNavigation = footerNavigationSchema(url);
  webPage.hasPart = { "@id": footerNavigation["@id"] };
  const graph = [webPage, footerNavigation];
  if (page.file === "index.html") {
    graph.push({
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      name: "Project Amazon PH Academy",
      url: baseUrl,
      description: page.description,
      publisher: organization,
      inLanguage: ["en", "fil"]
    });
  }
  if (page.schemaType === "Course") {
    graph.push({ "@type": "Course", "@id": `${url}#course`, name: "PPC Coach", description: page.description, provider: organization, isAccessibleForFree: true });
  }
  if (page.schemaType === "LearningResource") {
    graph.push({ "@type": "LearningResource", "@id": `${url}#resource`, name: page.title, description: page.description, learningResourceType: "Interactive learning resource", isAccessibleForFree: true });
  }
  if (page.schemaType === "SoftwareApplication") {
    graph.push({ "@type": "SoftwareApplication", "@id": `${url}#application`, name: page.title.split(" | ")[0], applicationCategory: "EducationalApplication", operatingSystem: "Web", description: page.description, isAccessibleForFree: true });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function discoveryBlock(page) {
  const url = new URL(page.file, baseUrl).href;
  const guideUrl = new URL("llms.txt", baseUrl).href;
  const schema = JSON.stringify(pageSchema(page, url), null, 2).replace(/<\//g, "<\\/");
  return `<!-- PHA_DISCOVERY_START -->
  <meta name="description" content="${escapeHtml(page.description)}">
  <meta name="keywords" content="${escapeHtml(page.keywords)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${url}">
  <link rel="describedby" type="text/markdown" href="${guideUrl}" title="AI-readable Project Amazon PH Academy guide">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Project Amazon PH Academy">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${previewImage}">
  <meta property="og:image:alt" content="Project Amazon PH Academy SimGrid learning hub">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(page.title)}">
  <meta name="twitter:description" content="${escapeHtml(page.description)}">
  <meta name="twitter:image" content="${previewImage}">
  <script type="application/ld+json">${schema}</script>
  <!-- PHA_DISCOVERY_END -->`;
}

for (const page of corePages) {
  const filePath = path.join(root, page.file);
  let html = await readFile(filePath, "utf8");
  html = html.replace(/\s*<!-- PHA_DISCOVERY_START -->[\s\S]*?<!-- PHA_DISCOVERY_END -->/g, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = html.replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, "");
  html = html.replace(/<\/head>/i, `  ${discoveryBlock(page)}\n</head>`);
  await writeFile(filePath, html);
}

const sitemapUrls = corePages.map(page => new URL(page.file, baseUrl).href);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(url => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;
await writeFile(path.join(root, "sitemap.xml"), sitemap);
console.log(`Updated discovery metadata for ${corePages.length} core pages and wrote sitemap.xml.`);
