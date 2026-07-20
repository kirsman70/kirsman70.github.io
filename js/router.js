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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const elapsedSec = (performance.now() - ORBIT_CLOCK_START) / 1000;
    ORBIT_ANIMATIONS.forEach(({ selector, durationSec }) => {
      const phase = elapsedSec % durationSec;
      root.querySelectorAll(selector).forEach(el => {
        el.style.animationDelay = (-phase) + 's';
      });
    });
  }

  async function navigate(url, { push = true } = {}) {
    document.documentElement.classList.add('kir-router-loading');

    let html;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      html = await res.text();
    } catch (err) {
      console.error('Router: fetch failed, falling back to a real navigation', err);
      window.location.href = url;
      return;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Only this one specific transition (leaving auth.html, landing on
    // index.html) gets the "surroundings fade in" treatment below —
    // landing on index.html any other way (typed URL, refresh, link
    // from some other page) should show everything at once like normal.
    // Reduced-motion opts out entirely rather than getting an instant
    // (transition-less) hide-then-show, which would just look like a
    // flash for no reason.
    const fromPath = window.location.pathname;
    const toPath = new URL(url, window.location.href).pathname;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealPending = !reduceMotion
      && /\/auth\.html$/i.test(fromPath)
      && /\/index\.html$/i.test(toPath);

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
    const headChildren = Array.from(doc.head.children);
    for (const node of headChildren) {
      if (node.tagName === 'SCRIPT') {
        if (node.getAttribute('src')) {
          await loadExternalAsset(node);
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
    const oldSidebarRoot = document.getElementById('sidebar-root');
    const preserveSidebar = !!(oldSidebarRoot && doc.getElementById('sidebar-root'));
    if (preserveSidebar) oldSidebarRoot.remove();

    const swapBody = () => {
      document.title = doc.title;

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
      document.body.className = doc.body.className;

      if (preserveSidebar) {
        const freshSidebarRoot = document.getElementById('sidebar-root');
        if (freshSidebarRoot) freshSidebarRoot.replaceWith(oldSidebarRoot);
      }
      // This whole block still runs HERE, synchronously inside the same
      // callback that builds the new body — not after — because when
      // the View Transition API is available, the browser captures its
      // "new state" screenshot the moment this callback returns, and
      // that screenshot is what actually plays during the ~0.55s
      // cross-fade. The fragment is now fully built with correct delays
      // BEFORE it ever touched the live DOM, so there's no reset pose
      // to bake into that screenshot in the first place.
      if (revealPending) document.body.classList.add('kir-reveal-pending');
    };

    // Same-document View Transition for the swap itself, when supported
    // (Chrome/Edge). This is the SPA-navigation equivalent of the
    // `@view-transition { navigation: auto; }` rule in style.css, which
    // only fires on real cross-document navigations — since this router
    // intercepts internal links and never triggers a real navigation,
    // that CSS rule was never actually doing anything for in-app clicks.
    // Falls back to an instant swap on browsers without the API.
    if (document.startViewTransition) {
      await document.startViewTransition(swapBody).finished;
    } else {
      swapBody();
    }

    // Re-run the new body's scripts in document order. src scripts get
    // deduped/loaded via the same helper; inline ones run through eval.
    const bodyScripts = Array.from(document.body.querySelectorAll('script'));
    for (const node of bodyScripts) {
      if (node.getAttribute('src')) {
        await loadExternalAsset(node);
      } else {
        runInlineScript(node.textContent);
      }
    }

    if (revealPending) {
      // The pending (invisible) state was applied inside swapBody, above,
      // so it's already what got shown the instant the swap landed —
      // the planet/ring/orbit guide are already visible and mid-morph,
      // everything else is at opacity: 0.
      //
      // Firing the fade-in on the very next couple of frames (the old
      // behavior) meant the rest of the scene reappeared essentially the
      // instant the planet finished landing, which read as an abrupt
      // "everything just snapped back" rather than a deliberate reveal.
      // Desired feel: the planet arrives, THEN — after a beat — the rest
      // of the page breathes back in. So hold the pending state for a
      // fixed pause before even starting the fade.
      const REVEAL_HOLD_MS = 1400; // the cinematic beat, tune to taste (1000–2000ms)
      const FADE_MS = 900; // matches/covers the 0.6s opacity transition in CSS + margin

      setTimeout(() => {
        // Still wrapped in two rAFs here, same reasoning as before: makes
        // sure the browser has actually painted the still-pending state
        // at least once more right before flipping it, so the opacity
        // transition always has a real "0" frame to animate from rather
        // than risking a coalesced jump straight to "1".
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.body.classList.remove('kir-reveal-pending');
            document.body.classList.add('kir-reveal-in');
          });
        });
        // Marker classes are only meaningful mid-transition; drop them
        // once the fade is done so they can't affect some later,
        // unrelated navigation that happens to reuse the same elements.
        setTimeout(() => document.body.classList.remove('kir-reveal-in'), FADE_MS);
      }, REVEAL_HOLD_MS);
    }

    document.documentElement.classList.remove('kir-router-loading');
    window.scrollTo(0, 0);

    if (push) history.pushState({ kirRouter: true }, '', url);
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!isRoutableLink(a)) return;
    if (a.href === window.location.href) { e.preventDefault(); return; }
    e.preventDefault();
    navigate(a.href);
  });

  window.addEventListener('popstate', () => {
    navigate(window.location.href, { push: false });
  });

  // Sync whatever guides/moons are on the very first page of the
  // session too, so the shared clock has a consistent starting phase
  // from the first paint, not just from the first navigation onward.
  syncOrbitAnimations(document);
})();
