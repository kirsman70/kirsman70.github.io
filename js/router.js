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
        const st = document.createElement('style');
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

    // Bring in any <head> scripts the new page needs that we don't have
    // yet (e.g. js/admin-shared.js), in document order, before touching
    // the body — later inline scripts may depend on them.
    const headChildren = Array.from(doc.head.children);
    for (const node of headChildren) {
      if (node.tagName === 'SCRIPT' && node.getAttribute('src')) {
        await loadExternalAsset(node);
      }
    }
    for (const node of headChildren) {
      if (node.tagName === 'LINK' || node.tagName === 'STYLE') {
        await loadExternalAsset(node);
      }
    }

    document.title = doc.title;
    document.body.innerHTML = doc.body.innerHTML;
    document.body.className = doc.body.className;

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
})();
