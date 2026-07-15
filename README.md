# Signal — Club Dashboard (static prototype)

A multi-page prototype, ready to host on GitHub Pages. No backend —
"login" is currently a `localStorage` flag, not real authentication.

## Deploy to `kirsman70.github.io`

If this repo **is** your `kirsman70.github.io` repo (the root site):

1. Copy everything in this folder into the root of that repo (so
   `index.html` sits at the repo root, not inside a subfolder).
2. Commit and push to the `main` branch.
3. In the repo's Settings → Pages, confirm the source is `main` /
   root — for a `username.github.io` repo this is usually automatic.
4. Visit `https://kirsman70.github.io/` — live in a minute or two.

If instead this should live at a sub-path like
`kirsman70.github.io/signal`, push this folder as its own repo named
`signal` and enable Pages on that repo instead; all the links here
are relative, so nothing needs to change.

## Structure

```
index.html        Public landing page
auth.html         Login + Register (tabbed)
dashboard.html     ┐
tasks.html          ├─ Protected — redirect to auth.html if not "logged in"
schedule.html      ┘
css/style.css      Shared design system (glass/glow look)
js/tailwind-config.js   Shared Tailwind color/font config
js/auth.js         Session helpers (see below)
```

## How "auth" works right now

`js/auth.js` stores a flag in the browser's `localStorage`. Any text
in the Register or Login form counts as valid — there's no real check
because there's no server yet. Every protected page calls
`signalRequireAuth()` in `<head>`, before the page paints, which
bounces logged-out visitors to `auth.html`.

## Wiring up real auth later

Everything funnels through three functions in `js/auth.js`:
`signalIsLoggedIn()`, `signalLogin()`, `signalLogout()`. When you add
a real backend, replace what's *inside* those functions with real API
calls / session cookies — the rest of the site calls the same
function names, so no other file needs to change.

Look for `TODO(real auth)` comments in `js/auth.js` and `auth.html`.

## Other things to build out later

- Turn the six hardcoded tasks and four hardcoded events into data
  (a JSON file, or API calls once there's a backend) instead of
  markup baked into `dashboard.html` / `tasks.html` / `schedule.html`.
- Admin verification step mentioned on the register form — currently
  just text, no real approval flow yet.
- A "forgot password" link on `auth.html`.
- Duplicated sidebar/topbar markup across the three protected pages —
  fine for now, but worth moving to a shared partial (e.g. via a
  small static site generator, or a JS include) once the page count
  grows.
