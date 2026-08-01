/* ==========================================================
   KIR SPA Router (pjax-style)
   --------------------------------------------------------
   Makes the existing multi-page site feel like an SPA WITHOUT
   rewriting every page. Heavy shared resources — Supabase,
   the Tailwind CDN runtime, Google Fonts, auth.js — load once
   on first visit and never reload again. Only <body> (plus any
   NEW <head> asset a specific page needs, like admin-shared.js)
   gets swapped in on navigation.

   SETUP: add this one line right before </body> on every page,
   after your other <script> tags:
       <script src="js/router.js"></script>
   Nothing else needs to change. Internal links to other .html
   pages on this site are intercepted automatically; external
   links, mailto:, downloads, and ctrl/cmd/shift-click all fall
   through to normal browser navigation.

   WHY EVAL, NOT <script> INSERTION:
   Re-inserting a page's inline <script> as a real <script> tag
   a second time throws "Identifier 'X' has already been
   declared" the moment you revisit a page in the same session —
   almost every page here declares page-level state with
   `let`/`const` (e.g. `let MATERIALS = []`), and repeated
   <script> tags share ONE global lexical scope for those.
   Indirect eval() sidesteps that: each eval() call gets its own
   throwaway scope for top-level let/const, while function/var
   declarations still attach to `window` like normal, so all the
   existing onclick="someFunction()" handlers keep working.

   WHY PAGES MUST LISTEN FOR 'kir:teardown':
   Because inline <script> blocks re-run via eval() on every visit,
   anything a page's script registers on `window`/`document`
   directly (rAF loops, keydown/resize/visibilitychange listeners,
   etc.) is NOT automatically cleaned up when you navigate away —
   there's no real page unload to do it for you, since this is a
   same-document swap. Without an explicit hook, navigating to a
   page, away, and back again a few times quietly piles up another
   copy of that page's rAF loop and listeners on top of every
   previous copy, each one still running forever: CPU/battery use
   creeps up the longer a session goes on, which is what shows up
   as the whole site gradually feeling more laggy. router.js fixes
   this by firing a 'kir:teardown' event on `window` right before
   swapping away from a page; any inline script that started a loop
   or registered a window/document-level listener should listen for
   this ONCE and cancel/remove exactly what it registered.
   ========================================================== */

(function () {
  if (window.__kirRouterInit) return;
  window.__kirRouterInit = true;

  function isReducedMotion() {
    // Two independent sources: the OS/browser-level media query, and
    // the site's own "disable all animations" toggle in Settings
    // (data-reduce-motion, set by kirSetReduceMotion in auth.js).
    // Either one being on should suppress motion everywhere the router
    // touches, not just the CSS-driven stuff style.css already covers.
    return document.documentElement.getAttribute('data-reduce-motion') === 'true'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function absoluteUrl(path) {
    return new URL(path, window.location.href).href;
  }

  const loadedScriptSrcs = new Set(
    Array.from(document.querySelectorAll('script[src]')).map(s => absoluteUrl(s.getAttribute('src')))
  );
  const loadedStyleHrefs = new Set(
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => absoluteUrl(l.getAttribute('href')))
  );

  function isRoutableLink(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (a.dataset.noRouter !== undefined) return false;
    let url;
    try { url = new URL(a.href, window.location.href); } catch (e) { return false; }
    if (url.origin !== window.location.origin) return false;
    if (!/\.html$/i.test(url.pathname)) return false;
    return true;
  }

  // Loads (and dedupes) an external <script src> or <link rel=stylesheet>,
  // resolving once it's actually ready so callers can await correct order.
  function loadExternalAsset(node) {
    return new Promise((resolve) => {
      if (node.tagName === 'SCRIPT' && node.getAttribute('src')) {
        const url = absoluteUrl(node.getAttribute('src'));
        if (loadedScriptSrcs.has(url)) return resolve();
        loadedScriptSrcs.add(url);
        const s = document.createElement('script');
        Array.from(node.attributes).forEach(attr => s.setAttribute(attr.name, attr.value));
        s.onload = () => resolve();
        s.onerror = () => resolve(); // don't hang the whole nav on one bad asset
        document.head.appendChild(s);
      } else if (node.tagName === 'LINK' && (node.getAttribute('rel') || '').includes('stylesheet')) {
        const url = absoluteUrl(node.getAttribute('href'));
        if (loadedStyleHrefs.has(url)) return resolve();
        loadedStyleHrefs.add(url);
        const l = document.createElement('link');
        Array.from(node.attributes).forEach(attr => l.setAttribute(attr.name, attr.value));
        l.onload = () => resolve();
        l.onerror = () => resolve();
        document.head.appendChild(l);
      } else if (node.tagName === 'STYLE') {
        // Inline <style> blocks (e.g. dashboard.html's widget-inner tweak).
        // Cheap to just re-add each time — style rules don't collide the
        // way `let`/`const` re-declarations do.
        //
        // EXCEPTION: a page's main stylesheet (marked with
        // id="kir-page-style") is hundreds of lines, not a small tweak,
        // and every page has exactly one. Re-adding it on every single
        // visit without ever removing the previous copy meant <head>
        // grew by a full page's worth of CSS each time you navigated
        // back to a page you'd already been to — a few laps around the
        // site and <head> was carrying half a dozen duplicate stylesheets
        // it no longer needed, which is real, compounding style-recalc
        // cost. Since only one page's body is ever visible at a time, at
        // most one kir-page-style should exist at a time too: swap it
        // instead of stacking it.
        const id = node.getAttribute('id');
        if (id === 'kir-page-style') {
          const existing = document.getElementById(id);
          if (existing) existing.remove();
        }
        const st = document.createElement('style');
        Array.from(node.attributes).forEach(attr => st.setAttribute(attr.name, attr.value));
        st.textContent = node.textContent;
        st.setAttribute('data-router-injected', '');
        document.head.appendChild(st);
        resolve();
      } else {
        resolve();
      }
    });
  }

  function runInlineScript(code) {
    (0, eval)(code); // indirect eval — see header comment
  }

  /* ----------------------------------------------------------
     Orbit-animation continuity
     --------------------------------------------------------
     The dashed orbit guides and the little decorative moons
     (.obt-guide-1/2, .obt-moon-orbit/.obt-moon-2 on index.html
     and auth.html) are plain infinite CSS animations. Left alone,
     every one of them restarts at its 0% keyframe the instant its
     page is swapped in, so the moons visibly snap back to the top
     of their orbit and the guides visibly snap back to their
     starting rotation on every navigation between the two pages —
     even though the durations/directions are identical on both
     pages specifically so this CAN be kept continuous.

     Fix: track a single clock that starts once, the first time the
     router itself loads (which only happens once per session, per
     the header comment), and on every page (re-)render, set each
     animation's animation-delay to a NEGATIVE offset equal to how
     far into its own duration that shared clock currently is. A
     negative delay starts an animation already progressed by that
     amount, so as long as the same duration is used for the same
     selector on both pages (it is), the visible angle is a
     continuous function of real elapsed time — it lines up exactly
     where it left off, on every page, forever, instead of
     restarting from zero.
     ---------------------------------------------------------- */
  const ORBIT_CLOCK_START = performance.now();
  const ORBIT_ANIMATIONS = [
    { selector: '.obt-guide-1', durationSec: 160 },
    { selector: '.obt-guide-2', durationSec: 240 },
    { selector: '.obt-moon-orbit:not(.obt-moon-2)', durationSec: 34 },
    { selector: '.obt-moon-orbit.obt-moon-2', durationSec: 52 },
  ];

  function syncOrbitAnimations(root) {
    if (isReducedMotion()) return;
    const elapsedSec = (performance.now() - ORBIT_CLOCK_START) / 1000;
    ORBIT_ANIMATIONS.forEach(({ selector, durationSec }) => {
      const phase = elapsedSec % durationSec;
      root.querySelectorAll(selector).forEach(el => {
        el.style.animationDelay = (-phase) + 's';
      });
    });
  }

  let kirNavController = null;

  async function navigate(url, { push = true } = {}) {
    if (kirNavController) kirNavController.abort();
    kirNavController = new AbortController();
    const signal = kirNavController.signal;

    // NOTE: kir-router-loading is intentionally NOT added here. Adding it
    // this early hid <main> (visibility:hidden, see style.css) for the
    // ENTIRE fetch — the full network round-trip — before there was even
    // any new content ready to show, regardless of whether a View
    // Transition would go on to smooth the actual swap afterward. That
    // hidden window, showing the page's near-black --bg-color underneath,
    // is what was visible as a black flash on every single navigation.
    // It's added later, only on the no-View-Transition fallback path,
    // immediately before the (now much shorter) synchronous swap.

    let html;
    try {
      const res = await fetch(url, { credentials: 'same-origin', signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      html = await res.text();
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Router: fetch failed, falling back to a real navigation', err);
      window.location.href = url;
      return;
    }
    
    if (signal.aborted) return;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Translate the new page's text WHILE IT'S STILL DETACHED — nothing
    // in `doc` is connected to the live render tree yet, so nothing in
    // it has painted yet either. This used to only happen after the
    // fact, when the new page's own inline scripts re-ran further down
    // (e.g. via kirInjectSidebar's call to kirApplyTranslations()) —
    // by which point the swap was already visible (or already
    // committed as the View Transition's "new" snapshot), so the
    // Indonesian default text was what got shown, however briefly,
    // before flipping to the visitor's actual language. Translating
    // here means the swapped-in content is already correct the very
    // first instant it's attached.
    if (typeof kirTranslateElements === 'function') kirTranslateElements(doc);

    // We're committed to leaving the current page now, so give it a
    // chance to cancel any rAF loop and remove any window/document-level
    // listener it registered — see the header comment on 'kir:teardown'.
    window.dispatchEvent(new Event('kir:teardown'));

    // Bring in everything the new page's <head> needs, IN DOCUMENT ORDER,
    // before touching the body. This used to run in two passes — src
    // scripts first, then link/style — which silently skipped inline
    // <script> blocks entirely (neither pass matched them). That broke
    // any page whose <head> depends on an inline config block running
    // before the external script that reads it — e.g. voyages.html sets
    // `window.MathJax = { tex: { inlineMath: [...] , ... } }` in an
    // inline script immediately before loading the MathJax library
    // itself; skipping it meant MathJax loaded with default delimiters
    // (no $...$ support) whenever voyages.html was reached via a router
    // nav instead of a hard reload. It also meant `kirRequireAuth()` —
    // also an inline <script> in every protected page's <head> — never
    // ran on client-side navigation. Single pass, original order, fixes
    // both.
    // EXCEPTION — async/defer <script src> tags: workspace.html's
    // MathJax and MathLive tags (~hundreds of KB each) are marked
    // `async`/`defer` specifically so a normal page load never blocks
    // on them. Sending them through the same `await loadExternalAsset()`
    // as everything else undid that: this loop was stalling the ENTIRE
    // navigation — body swap, sidebar/nav-pill update, all of it —
    // until those libraries had fully downloaded AND executed, on every
    // first visit to a page that has them. That's what read as the
    // sidebar "lagging/twitching" specifically on workspace.html and
    // not on lighter pages like course.html: the whole swap (including
    // the nav-pill's slide) sits frozen behind a ~1-2s library load,
    // then lands and animates all at once the instant it's free, which
    // reads as a stall-then-jump instead of a smooth transition.
    // Nothing else in the head depends on MathJax/MathLive being ready
    // this early (course content rendering already has a
    // `!window.marked`-style fallback for libraries that aren't loaded
    // yet), so there's nothing to lose by letting them load in the
    // background: kick them off (still deduped by URL, still started
    // in document order relative to any inline config script before
    // them, e.g. the `window.MathJax = {...}` block) but don't hold up
    // the rest of the navigation on their onload. Plain (non-async/
    // non-defer) scripts like auth.js keep blocking as before, since
    // later inline scripts (kirRequireAuth()) and page code genuinely
    // need them to have finished first.
    const headChildren = Array.from(doc.head.children);
    for (const node of headChildren) {
      if (node.tagName === 'SCRIPT') {
        if (node.getAttribute('src')) {
          const isNonBlocking = node.hasAttribute('async') || node.hasAttribute('defer');
          if (isNonBlocking) {
            loadExternalAsset(node); // fire-and-forget — don't gate navigation on it
          } else {
            await loadExternalAsset(node);
          }
        } else {
          runInlineScript(node.textContent);
        }
      } else if (node.tagName === 'LINK' || node.tagName === 'STYLE') {
        await loadExternalAsset(node);
      }
    }

    // Preserve the sidebar as a genuinely persistent DOM node across
    // navigations between two sidebar-having pages, instead of letting it
    // get wiped out and rebuilt fresh (already in its final state) along
    // with the rest of <body> on every single nav. Without this, nothing
    // that depends on the sidebar/nav-pill actually still being *the same
    // element* across the swap — like the traveling nav-active-pill's
    // slide animation (see kirInjectSidebar/kirPositionNavPill in
    // auth.js) — has anything real to animate from. Falls back to the
    // normal full replacement whenever either page doesn't have a
    // #sidebar-root (e.g. navigating to/from a public page).
    //
    // IMPORTANT: don't detach oldSidebarRoot/oldGlowLayer out here. document.
    // startViewTransition() snapshots the CURRENT render state the
    // instant it's called, a few lines below — if either is already
    // removed from the live DOM by then, that "old" snapshot simply
    // never contains it. The browser then has no choice but to treat it
    // in the "new" snapshot as brand-new content with nothing to morph
    // from, and plays its default entrance fade on it — a visible flash,
    // on every single navigation. Keeping the detach + reattach both
    // inside swapBody (the transition's update callback) means both
    // happen atomically between the "old" and "new" snapshots, so the
    // same node is recognized as persisting across the transition
    // instead of appearing out of nowhere.
    const oldSidebarRoot = document.getElementById('sidebar-root');
    const preserveSidebar = !!(oldSidebarRoot && doc.getElementById('sidebar-root'));
    const oldGlowLayer = document.querySelector(':scope > .glow-layer');
    const preserveGlow = !!(oldGlowLayer && doc.body.querySelector(':scope > .glow-layer'));
    const oldModalsRoot = document.getElementById('kir-modals-root');

    let bodySwapped = false;
    const swapBody = async () => {
      if (bodySwapped) return;
      bodySwapped = true;

      document.title = doc.title;

      if (preserveSidebar) {
        // IMPORTANT: doc.getElementById searches the whole subtree, not
        // just doc.body's direct children — #sidebar-root is actually
        // nested one level deeper, inside the ".kir-app-shell" wrapper
        // div, on every real page. A `node.id === 'sidebar-root'` check
        // while walking doc.body.childNodes (the old approach) only
        // inspects TOP-LEVEL children of <body>, so since sidebar-root
        // is never actually a direct child of <body>, that check
        // silently never matched anything. The wrapper div — containing
        // a brand-new, still-empty #sidebar-root freshly parsed from
        // `doc` — got adopted wholesale like everything else, so
        // kirInjectSidebar() always found an empty node and rebuilt the
        // whole sidebar from scratch on every single navigation instead
        // of reusing it. Swapping the real, already-populated node into
        // `doc`'s tree in place — wherever it actually lives — fixes
        // that for free: the normal adopt pass a few lines down just
        // picks it up as part of its parent, already correct.
        const newSidebarPlaceholder = doc.getElementById('sidebar-root');
        if (newSidebarPlaceholder) newSidebarPlaceholder.replaceWith(doc.adoptNode(oldSidebarRoot));
      }

      const isLeavingIndex = /\/(index\.html)?$/i.test(window.location.pathname) ||
        window.location.pathname === '/' ||
        window.location.pathname === '' ||
        sessionStorage.getItem('kir_just_left_index') === 'true';

      const isTargetingIndex = (doc.body && doc.body.classList.contains('obt-body')) ||
        sessionStorage.getItem('kir_just_left_glow_page') === 'true';

      if (preserveGlow && !isTargetingIndex) {
        // Navigating between two subpages with glow blobs: preserve old glow layer without re-triggering light-up or dim-out
        if (oldGlowLayer) oldGlowLayer.classList.remove('glow-light-up', 'glow-dim-out');
        const newGlowPlaceholder = doc.body.querySelector(':scope > .glow-layer');
        if (newGlowPlaceholder) newGlowPlaceholder.replaceWith(doc.adoptNode(oldGlowLayer));
      } else if (oldGlowLayer && isTargetingIndex) {
        // Navigating FROM a subpage WITH glow blobs TO index.html: dim out the glow layer
        const targetGlowPlaceholder = doc.body.querySelector(':scope > .glow-layer');
        oldGlowLayer.classList.remove('glow-light-up', 'glow-dim-out');
        void oldGlowLayer.offsetWidth;
        oldGlowLayer.classList.add('glow-dim-out');
        if (targetGlowPlaceholder) targetGlowPlaceholder.replaceWith(doc.adoptNode(oldGlowLayer));
        else doc.body.prepend(doc.adoptNode(oldGlowLayer));
      } else {
        // Navigating FROM index.html TO a subpage WITH glow blobs: light up the glow layer
        const newGlow = doc.body.querySelector(':scope > .glow-layer');
        if (newGlow) {
          newGlow.classList.remove('glow-light-up', 'glow-dim-out');
          if (isLeavingIndex) {
            void newGlow.offsetWidth;
            newGlow.classList.add('glow-light-up');
          }
        }
      }
      sessionStorage.removeItem('kir_just_left_index');
      sessionStorage.removeItem('kir_just_left_glow_page');

      // --------------------------------------------------------------
      // Orbit-animation continuity (architectural fix)
      // --------------------------------------------------------------
      // The previous version did:
      //     document.body.innerHTML = doc.body.innerHTML;
      // which takes the already-parsed `doc.body` (from the DOMParser
      // call above), re-SERIALIZES it back into an HTML string, and
      // then re-PARSES that string directly into the live document.
      // That second parse is what creates every orbit element already
      // connected to the live render tree — and a CSS animation on a
      // freshly-connected element always starts at animation-delay: 0
      // the instant it's connected, no matter what animationDelay gets
      // set a moment later by syncOrbitAnimations(). An already-running
      // animation can't be rewound/fast-forwarded by changing its
      // delay, so the moons/guides visibly snapped back to their start
      // position on every navigation.
      //
      // Fix: don't reparse. `doc` is a separate, fully DETACHED
      // Document — nothing in it is connected to a live render tree,
      // so nothing in it is animating yet. Move the nodes THAT ALREADY
      // EXIST in `doc.body` (via adoptNode, not innerHTML) into a
      // DocumentFragment, which is likewise not part of the live
      // render tree, run syncOrbitAnimations() against them while
      // they're still detached, and only THEN attach the fragment to
      // the real <body>. Every orbit element's animation-delay is
      // already correct the very first instant it becomes part of the
      // page — it's born mid-cycle instead of being born at 0 and
      // corrected a tick later.
      const fragment = document.createDocumentFragment();
      Array.from(doc.body.childNodes).forEach((node) => {
        fragment.appendChild(document.adoptNode(node));
      });
      syncOrbitAnimations(fragment);

      document.body.replaceChildren(fragment);
      
      if (oldModalsRoot) {
        document.body.appendChild(oldModalsRoot);
      }

      // Mirror ALL of the new page's <body> attributes — not just
      // className. auth.html's <body> tag has `style="touch-action:
      // pan-y;"` on it directly in the markup; the previous version
      // only copied `.className`, so that (and any other non-class
      // body attribute a page sets — data-*, aria-*, inline style)
      // silently never applied when arriving via a router nav, only
      // on a real full-page load. That's a real gap between SPA nav
      // and hard nav that's worth closing regardless of what else is
      // going on with the black bar.
      const newBodyAttrNames = new Set(Array.from(doc.body.attributes).map((a) => a.name));
      Array.from(document.body.attributes).forEach((attr) => {
        if (!newBodyAttrNames.has(attr.name)) document.body.removeAttribute(attr.name);
      });
      Array.from(doc.body.attributes).forEach((attr) => {
        document.body.setAttribute(attr.name, attr.value);
      });

      document.documentElement.classList.add('kir-ready');

      // Re-run inline scripts to populate dynamic content
      const bodyScripts = Array.from(document.body.querySelectorAll('script'));
      for (const node of bodyScripts) {
        if (node.getAttribute('src')) {
          if (node.hasAttribute('async') || node.hasAttribute('defer')) {
            loadExternalAsset(node);
          } else {
            await loadExternalAsset(node);
          }
        } else {
          runInlineScript(node.textContent);
        }
      }
    };

    // Prefer a real View Transition so the browser cross-fades the old
    // and new snapshots instead of us just hiding <main> for the whole
    // fetch+swap and popping it back — that hide/reveal with nothing in
    // between is exactly what read as a black flash on every nav. The
    // kir-router-loading class (and its `main { visibility: hidden }`
    // rule in style.css) is kept as a fallback ONLY for browsers without
    // startViewTransition (e.g. Firefox, older Safari), where there's no
    // crossfade to mask the swap with anyway.
    if (typeof document.startViewTransition === 'function') {
      const transition = document.startViewTransition(async () => { await swapBody(); });
      try { await transition.finished; } catch (e) { /* interrupted by a newer nav; swap already applied */ }
    } else {
      document.documentElement.classList.add('kir-router-loading');
      await swapBody();
    }

    document.documentElement.classList.remove('kir-router-loading');
    window.scrollTo(0, 0);

    if (push) history.pushState({ kirRouter: true }, '', url);
  }

  document.addEventListener('click', (e) => {
    const a = e.target ? e.target.closest('a') : null;
    if (a && a.href) {
      try {
        const destPath = new URL(a.href, window.location.href).pathname;
        const isDestIndex = /\/(index\.html)?$/i.test(destPath) || destPath === '/' || destPath === '';
        const isCurrentIndex = document.body.classList.contains('obt-body') || /\/(index\.html)?$/i.test(window.location.pathname);
        if (isCurrentIndex && !isDestIndex) {
          sessionStorage.setItem('kir_just_left_index', 'true');
        } else if (!isCurrentIndex && isDestIndex && document.querySelector('.glow-layer')) {
          sessionStorage.setItem('kir_just_left_glow_page', 'true');
        }
      } catch (err) {}
    }
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!isRoutableLink(a)) return;
    if (a.href === window.location.href) { e.preventDefault(); return; }
    e.preventDefault();
    navigate(a.href);
  });

  window.addEventListener('popstate', () => {
    navigate(window.location.href, { push: false });
  });

  // Check initial page load for entry from index.html or return to index.html from a glow page
  function checkInitialGlowLightUp() {
    const glow = document.querySelector('.glow-layer');
    if (!glow) return;
    const isIndex = document.body.classList.contains('obt-body') || /\/(index\.html)?$/i.test(window.location.pathname);
    const justLeftGlowPage = sessionStorage.getItem('kir_just_left_glow_page') === 'true';
    const justLeftIndex = sessionStorage.getItem('kir_just_left_index') === 'true';
    sessionStorage.removeItem('kir_just_left_glow_page');
    sessionStorage.removeItem('kir_just_left_index');

    if (isIndex && justLeftGlowPage) {
      glow.classList.remove('glow-light-up', 'glow-dim-out');
      void glow.offsetWidth;
      glow.classList.add('glow-dim-out');
    } else if (!isIndex && justLeftIndex) {
      glow.classList.remove('glow-light-up', 'glow-dim-out');
      void glow.offsetWidth;
      glow.classList.add('glow-light-up');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkInitialGlowLightUp);
  } else {
    checkInitialGlowLightUp();
  }

  // Sync whatever guides/moons are on the very first page of the
  // session too, so the shared clock has a consistent starting phase
  // from the first paint, not just from the first navigation onward.
  syncOrbitAnimations(document);
})();
