# SimGrid Discoverability Architecture

## Scope and constraint

This update makes the public SimGrid site easier for search engines, users, and AI agents to understand. It does **not** promise rankings, indexing, citations, or inclusion in any AI model’s training data. A sitemap can help crawlers discover pages but does not guarantee indexing; structured data should describe visible, accurate content; and `llms.txt` is an emerging, non-binding discovery convention. [1] [2] [3]

## Public information architecture

The shared footer will replace scattered, flat link lists with four short groups. **Learn** will point to PPC Coach, the student guide, and the module deck viewer. **Practice** will point to the simulator hub and core practice tools. **Coach** will point to teaching decks, the field library, and downloadable resources. **Project** will point to the control hub, roadmap, public repository, and discovery files.

The footer will also state that SimGrid is a practical Amazon PPC training environment for Filipino virtual assistants and that it is a learning simulator, not a live client-advertising console. This supports clearer expectations without adding promotional claims.

## Search implementation

The core public pages—control hub, PPC Coach, Coach Tools, resource library, deck viewer, roadmap, twelve simulators, and Learn pages—will receive accurate title, description, canonical, Open Graph, and social-card metadata. The implementation will add `WebSite`, `WebPage`, and `BreadcrumbList` JSON-LD that mirrors the page’s visible purpose and navigation. The PPC Coach page will also identify itself as a training course; Coach Tools will identify itself as a learning-resource collection.

An XML sitemap will list the human-facing core pages. `robots.txt` will permit normal crawling and point agents to that sitemap. Neither file will be used to hide content or imply guaranteed indexation. [1] [4]

## AI-readable implementation

The site will publish a concise `/llms.txt` that follows the public proposal’s required project title, summary, and grouped resource lists. It will guide agents to a canonical, human-readable project summary and the highest-value public pages. The file will be paired with `rel="describedby"` links in the core pages, but the site will not claim that every AI service reads or obeys this convention. [3]

## Validation plan

Validation will confirm that canonical URLs use the GitHub Pages project base path, every core page has a unique title and description, JSON-LD is valid JSON and matches visible content, sitemap URLs resolve, robots references the sitemap, `llms.txt` uses the expected heading-and-link format, all footer links are real internal or public repository URLs, and existing SimGrid tests continue to pass.

## References

[1] [Google Search Central: Learn about sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)

[2] [Google Search Central: Introduction to structured data markup](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

[3] [llms.txt: The /llms.txt file, v2](https://llmstxt.org/)

[4] [Google Search Central: Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
