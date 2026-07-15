/* ==========================================================
   Signal — prototype auth
   --------------------------------------------------------
   There is no backend yet, so "being logged in" is just a
   flag in localStorage. This is NOT secure and stores
   nothing sensitive — it only exists so the multi-page site
   can behave like a real app (redirects, session, logout)
   while you build without a server.

   WHEN YOU ADD A REAL BACKEND LATER:
   Replace the three functions below (signalIsLoggedIn,
   signalLogin, signalLogout) with real calls to your auth
   API / session cookies. Every page calls these same
   function names, so the rest of the site won't need to
   change — just swap what's inside this file.
   ========================================================== */

const SIGNAL_SESSION_KEY = 'signal_session';
const SIGNAL_USER_KEY = 'signal_user_name';

function signalIsLoggedIn() {
  // TODO(real auth): check a real session/cookie/token instead.
  return localStorage.getItem(SIGNAL_SESSION_KEY) === 'true';
}

function signalLogin(name) {
  // TODO(real auth): call your API, store a real token, handle errors.
  localStorage.setItem(SIGNAL_SESSION_KEY, 'true');
  localStorage.setItem(SIGNAL_USER_KEY, name || 'Anggota');
}

function signalLogout() {
  // TODO(real auth): invalidate the real session on the server too.
  localStorage.removeItem(SIGNAL_SESSION_KEY);
  localStorage.removeItem(SIGNAL_USER_KEY);
  window.location.href = 'index.html';
}

function signalCurrentUserName() {
  return localStorage.getItem(SIGNAL_USER_KEY) || 'Anggota';
}

/* Call this at the very top of any protected page's <head>,
   right after loading this script, so it runs before the
   page paints. It sends logged-out visitors to auth.html. */
function signalRequireAuth() {
  if (!signalIsLoggedIn()) {
    window.location.href = 'auth.html';
  }
}
