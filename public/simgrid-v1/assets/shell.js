/* ============================================================
   PROJECT AMAZON PH ACADEMY — SHARED SHELL JS
   - Highlights current tool in nav
   - Injects topbar + footer if not present
   - Applies unified skin (tokens + skin.css) to tool pages
   - Wraps tool body in .pha-skin-wrap
   - Auto-injects responsive.css (mobile-first layer)
   - Inserts hamburger button + scrim; wires open/close
   ============================================================ */
(function () {
  'use strict';

  // Tool registry — single source of truth for nav
  var TOOLS = [
    { id: 'ad-console',    name: 'AdConsole Pro',   tag: 'Ad Operations',   file: 'ad-console.html' },
    { id: 'keyword-lab',   name: 'Keyword Lab',     tag: 'Keyword Research', file: 'keyword-lab.html' },
    { id: 'search-triage', name: 'Search Term Triage', tag: 'Triage',         file: 'search-triage.html' },
    { id: 'sqp-studio',    name: 'SQP Studio',  tag: 'Analytics',        file: 'sqp-studio.html' },
    { id: 'bid-decisions', name: 'Bid Decisions', tag: 'Optimization',     file: 'bid-decisions.html' },
    { id: 'campaign-architect', name: 'Campaign Architect', tag: 'Planning', file: 'campaign-architect.html' },
    { id: 'account-audit', name: 'Account Audit', tag: 'Audit', file: 'account-audit.html' },
    { id: 'client-onboarding', name: 'Client Onboarding', tag: 'VA Workflow', file: 'client-onboarding.html' },
    { id: 'capstone-sequence', name: 'Capstone', tag: 'Capstone', file: 'capstone-sequence.html' },
    { id: 'bulk-file',     name: 'Bulk File Simulator', tag: 'Bulk Ops',      file: 'bulk-file.html' },
    { id: 'listing',       name: 'BuyBox Dojo',     tag: 'Listing + PPC',    file: 'listing.html' },
    { id: 'pacing-deck',   name: 'Pacing Deck',     tag: 'Budget + Pacing',  file: 'pacing-deck.html' },
    { id: 'ppc-coach',     name: 'PPC Coach',       tag: 'Teaching Companion', file: 'ppc-coach.html' }
  ];

  // Detect which tool this page is (by filename or data attribute)
  function currentToolId() {
    var explicit = document.body.getAttribute('data-pha-tool');
    if (explicit) return explicit;
    var path = window.location.pathname.split('/').pop() || 'index.html';
    var match = TOOLS.find(function (t) { return t.file === path; });
    return match ? match.id : 'hub';
  }

  // Nested documentation pages declare their path back to the app root.
  function rootPrefix() {
    return document.body.getAttribute('data-pha-root') || '';
  }

  function ensureSkipLink() {
    if (document.querySelector('.pha-skip-link')) return;
    var main = document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'pha-main-content';
    var skip = document.createElement('a');
    skip.className = 'pha-skip-link';
    skip.href = '#' + main.id;
    skip.textContent = 'Skip to content';
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // Inject the unified design tokens + skin (if not already there)
  function injectSkin() {
    var head = document.head;
    if (!document.querySelector('link[data-pha-tokens], link[href$="assets/tokens.css"]')) {
      var t = document.createElement('link');
      t.rel = 'stylesheet';
      t.href = rootPrefix() + 'assets/tokens.css';
      t.setAttribute('data-pha-tokens', '1');
      head.appendChild(t);
    }
    if (!document.querySelector('link[data-pha-skin], link[href$="assets/skin.css"]')) {
      var s = document.createElement('link');
      s.rel = 'stylesheet';
      s.href = rootPrefix() + 'assets/skin.css';
      s.setAttribute('data-pha-skin', '1');
      head.appendChild(s);
    }
  }

  // Inject the responsive layer (mobile-first + hamburger + touch targets).
  // Loaded AFTER skin.css so its rules win specificity ties.
  function injectResponsive() {
    if (document.querySelector('link[data-pha-responsive], link[href$="assets/responsive.css"]')) return;
    var head = document.head;
    var r = document.createElement('link');
    r.rel = 'stylesheet';
    r.href = rootPrefix() + 'assets/responsive.css';
    r.setAttribute('data-pha-responsive', '1');
    head.appendChild(r);
  }

  // Mark active nav link
  function markActive(currentId) {
    var links = document.querySelectorAll('.pha-nav a[data-pha-tool]');
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('data-pha-tool') === currentId) {
        links[i].classList.add('is-current');
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }

  // Build nav links (skips if already in DOM)
  function buildNav(currentId) {
    var nav = document.querySelector('.pha-nav');
    if (!nav) return;
    if (nav.children.length > 0) {
      nav.dataset.phaBuilt = '1';
      return;
    }
    nav.dataset.phaBuilt = '1';
    var toShow = TOOLS.filter(function (t) { return t.id !== currentId; });
    toShow.forEach(function (t) {
      var a = document.createElement('a');
      a.href = rootPrefix() + t.file;
      a.setAttribute('data-pha-tool', t.id);
      a.textContent = t.name;
      nav.appendChild(a);
    });
  }

  // PR #5: aria-label swap on toggle (was static "Toggle navigation")
  function syncBurgerLabel(btn, isOpen) {
    btn.setAttribute(
      'aria-label',
      isOpen ? 'Close tools menu' : 'Open tools menu'
    );
  }

  // Build and wire the hamburger button.
  // Returns the button element (or null if already present).
  function ensureBurger() {
    if (document.querySelector('.pha-burger')) return null;
    var topbar = document.querySelector('.pha-topbar');
    if (!topbar) return null;
    topbar.classList.add('pha-has-burger');

    var btn = document.createElement('button');
    btn.className = 'pha-burger';
    btn.type = 'button';
    btn.setAttribute('aria-controls', 'pha-primary-nav');
    btn.setAttribute('aria-expanded', 'false');
    syncBurgerLabel(btn, false); // PR #5: initial label
    btn.innerHTML =
      '<svg class="bars" viewBox="0 0 24 24" aria-hidden="true">' +
        '<line x1="4" y1="6"  x2="20" y2="6"/>' +
        '<line x1="4" y1="12" x2="20" y2="12"/>' +
        '<line x1="4" y1="18" x2="20" y2="18"/>' +
      '</svg>' +
      '<svg class="x" viewBox="0 0 24 24" aria-hidden="true">' +
        '<line x1="6"  y1="6"  x2="18" y2="18"/>' +
        '<line x1="18" y1="6"  x2="6"  y2="18"/>' +
      '</svg>';
    topbar.appendChild(btn);

    var nav = topbar.querySelector('.pha-nav');
    if (nav && !nav.id) nav.id = 'pha-primary-nav';

    // Build scrim if not present
    var scrim = document.querySelector('.pha-nav-scrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'pha-nav-scrim';
      scrim.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scrim);
    }

    var isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;
      btn.setAttribute('aria-expanded', 'true');
      syncBurgerLabel(btn, true); // PR #5
      if (nav) nav.classList.add('is-open');
      scrim.classList.add('is-on');
      document.body.classList.add('pha-burger-active');
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      btn.setAttribute('aria-expanded', 'false');
      syncBurgerLabel(btn, false); // PR #5
      if (nav) nav.classList.remove('is-open');
      scrim.classList.remove('is-on');
      document.body.classList.remove('pha-burger-active');
    }
    function toggle() { isOpen ? close() : open(); }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      toggle();
    });

    // close on scrim click
    scrim.addEventListener('click', function () { close(); });

    // close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) {
        close();
        btn.focus();
      }
    });

    // close when navigating (any nav link click)
    if (nav) {
      nav.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a');
        if (a) close();
      });
    }

    // close if viewport grows past mobile breakpoint
    var mq = window.matchMedia('(min-width: 768px)');
    var onChange = function () { if (mq.matches) close(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);

    return btn;
  }

  // Annotate any .table-scroll-wrap with .has-overflow when content
  // is wider than its container (used by the hint gradient).
  function annotateOverflow() {
    var wraps = document.querySelectorAll('.table-scroll-wrap');
    for (var i = 0; i < wraps.length; i++) {
      (function (wrap) {
        var check = function () {
          if (wrap.scrollWidth > wrap.clientWidth + 2) {
            wrap.classList.add('has-overflow');
          } else {
            wrap.classList.remove('has-overflow');
          }
        };
        check();
        if (window.ResizeObserver) {
          new ResizeObserver(check).observe(wrap);
        } else {
          window.addEventListener('resize', check);
        }
      })(wraps[i]);
    }
  }

  function footerMarkup(root, pageName) {
    return '<div class="pha-foot-brand">' +
        '<a class="pha-foot-home" href="' + root + 'index.html"><b>PROJECT AMAZON PH</b><span>Academy · SimGrid</span></a>' +
        '<small>Practical Amazon PPC learning for Filipino virtual assistants.</small>' +
        '<div class="pha-foot-discovery"><a href="' + root + 'llms.txt">AI site guide</a><span aria-hidden="true">·</span><a href="' + root + 'sitemap.xml">Site map</a></div>' +
      '</div>' +
      '<nav class="pha-foot-links" aria-label="Learn" data-label="Learn">' +
        '<a href="' + root + 'start-here.html">VA Start Here</a><a href="' + root + 'ppc-coach.html">PPC Coach</a><a href="' + root + 'learn/guide.html">Student Guide</a><a href="' + root + 'coach-decks.html">Module Decks</a>' +
      '</nav>' +
      '<nav class="pha-foot-links" aria-label="Practice" data-label="Practice">' +
        '<a href="' + root + 'index.html#simulator-library">Simulator Library</a><a href="' + root + 'campaign-architect.html">Campaign Architect</a><a href="' + root + 'account-audit.html">Account Audit</a>' +
      '</nav>' +
      '<nav class="pha-foot-links" aria-label="Coach" data-label="Coach">' +
        '<a href="' + root + 'coach-tools.html">Coach Tools</a><a href="' + root + 'coach-resource-library.html">Resource Library</a><a href="' + root + 'learn/index.html">Learning Docs</a>' +
      '</nav>' +
      '<nav class="pha-foot-links" aria-label="Project" data-label="Project">' +
        '<a href="' + root + 'planned-simulators.html">Roadmap</a><a href="https://github.com/projectamazonph/amazon-ph-simulators" target="_blank" rel="noopener noreferrer">Source Repository</a><a href="' + root + 'site-guide.md">Project Guide</a>' +
      '</nav>' +
      '<div class="pha-foot-meta"><span>Public learning resources</span><span>' + pageName + '</span></div>';
  }

  // Auto-inject topbar + footer if page didn't include them
  function ensureChrome() {
    var root = rootPrefix();
    var toolId = currentToolId();
    var tool = TOOLS.find(function (t) { return t.id === toolId; });
    var isHub = toolId === 'hub' || !tool;
    var toolName = document.body.getAttribute('data-pha-page-name') || (isHub ? 'Control Hub' : tool.name);
    var toolTag = document.body.getAttribute('data-pha-page-tag') || (isHub ? 'Learning Hub' : tool.tag);
    if (!document.querySelector('.pha-topbar')) {
      var bar = document.createElement('div');
      bar.className = 'pha-topbar';
      bar.setAttribute('role', 'banner');
      bar.innerHTML =
        '<a class="pha-back" href="' + root + 'index.html" aria-label="' + (isHub ? 'Home' : 'Back to Academy Hub') + '">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 3 L5 8 L10 13" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<span>' + (isHub ? 'Home' : 'Hub') + '</span>' +
        '</a>' +
        '<a class="pha-brand" href="' + root + 'index.html" aria-label="Project Amazon PH Academy home">' +
          '<div class="pha-brand-mark" aria-hidden="true">PH</div>' +
          '<div class="pha-brand-text"><b>Project Amazon PH</b><span>Academy · SimGrid</span></div>' +
        '</a>' +
        '<div class="pha-divider" aria-hidden="true"></div>' +
        '<div class="pha-tool-name">' +
          '<b>' + toolName + '</b>' +
          '<span class="pha-tag">' + toolTag + '</span>' +
        '</div>' +
        '<nav class="pha-nav" aria-label="Tool navigation"></nav>' +
        '<div class="pha-status" role="status" aria-label="Academy status: online"><span class="dot" aria-hidden="true"></span><span>Academy · online</span></div>';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    var footer = document.querySelector('.pha-footer');
    if (!footer) {
      var f = document.createElement('footer');
      f.className = 'pha-footer';
      document.body.appendChild(f);
      footer = f;
    }
    footer.setAttribute('data-pha-footer-version', '2');
    footer.innerHTML = footerMarkup(root, toolName);
  }

  // Apply pha-skin class to body (skips hub; hub has its own styles)
  function applySkin() {
    if (currentToolId() === 'hub') return;
    document.body.classList.add('pha-skin');
  }

  // Wrap the tool's body content (between topbar/footer) in .pha-skin-wrap
  function wrapContent() {
    if (currentToolId() === 'hub') return;
    if (document.querySelector('.pha-skin-wrap')) return;
    var topbar = document.querySelector('.pha-topbar');
    var footer = document.querySelector('.pha-footer');
    var before = topbar ? topbar.nextSibling : null;
    var after = footer || null;
    var wrap = document.createElement('div');
    wrap.className = 'pha-skin-wrap';
    var node = before;
    var moved = [];
    while (node && node !== after) {
      moved.push(node);
      node = node.nextSibling;
    }
    if (moved.length === 0) {
      while (document.body.firstChild) {
        wrap.appendChild(document.body.firstChild);
      }
      document.body.appendChild(wrap);
    } else {
      moved.forEach(function (n) { wrap.appendChild(n); });
      if (topbar) topbar.parentNode.insertBefore(wrap, topbar.nextSibling);
      else document.body.insertBefore(wrap, document.body.firstChild);
    }
  }

  // Init
  function init() {
    injectSkin();
    injectResponsive();
    ensureChrome();
    ensureSkipLink();
    applySkin();
    wrapContent();
    buildNav(currentToolId());
    markActive(currentToolId());
    ensureBurger();
    annotateOverflow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
