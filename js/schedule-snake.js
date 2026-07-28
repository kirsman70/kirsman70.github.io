/* World Snake Day easter egg — triggered by the 🐍 button next to the
   "World Snake Day" badge in the 16 July day popover (see
   scheduleSnakeDayAction in schedule.html).

   Flow:
     1. Lock the chevrons + Today button, block day clicks, suspend
        WASD/arrows (guards for all of this live in schedule.html and just
        check window.kirSnakeModeActive / route into handleKey below).
     2. Every visible day number ticks down to "0" one cell at a time.
     3. 7, 14 and 21 July count down from 3 → 2 → 1.
     4. Every number returns to normal.
     5. A highlight (no outline — a plain fill, same idea as the calendar's
        own selection fill) appears on 3 August, the grid's bottom-left
        cell in a July view, and walks upward on its own for a few beats.
     6. Real play begins: an apple (an outline, no fill) spawns somewhere
        on the grid, WASD/arrows steer, eating apples grows the snake.
     7. Crash into a wall or yourself: every number becomes "X", except
        16 July ("Try again?") and 17 July ("Exit") — click either to
        choose. Filling the whole grid is a win and exits the mode
        automatically. Refreshing/leaving the page always gets you out too.

   This file only ever touches the DOM (cell classList + the little day-
   number span inside each cell) — it doesn't touch EVENTS/scheduleSelectedKey
   or any of the calendar's own state, so nothing here needs to survive (or
   worry about) a real renderScheduleCalendar() re-render happening mid-game.
*/
(function () {
  const CELL_SELECTOR = '.kir-month-cal-day';
  const COLS = 7;
  const ROWS = 6;

  let cells = [];      // snapshot of the 42 day cells, in grid order (row-major)
  let year = null;     // year of the July currently on screen, read off the 16-July cell
  let phase = 'idle';  // idle | scramble | countdown | revert | intro-walk | playing | dead
  let timers = [];     // every pending setTimeout for the current run
  let tickTimer = null;

  let snakeBody = [];  // cell indices, [0] = head
  let dir = { dr: -1, dc: 0 };
  let dirQueue = [];   // up to MAX_QUEUED buffered turns ahead of the committed `dir`
  let appleIdx = null;

  const TICK_MS = 170;      // was 260 — snappier without being twitchy
  const MAX_QUEUED = 2;     // how many rapid taps ahead of the current tick we'll remember
  const HIGH_SCORE_KEY = 'kirSnakeHighScore';

  // Score is apples eaten, i.e. how much the snake has grown past its
  // starting length of 1 — not just raw snakeBody.length.
  function currentScore() { return Math.max(0, snakeBody.length - 1); }

  function getHighScore() {
    try {
      const raw = parseInt(localStorage.getItem(HIGH_SCORE_KEY), 10);
      return Number.isFinite(raw) ? raw : 0;
    } catch (e) { return 0; } // localStorage can throw in some embedded/private contexts
  }
  // Records this run's score against whatever's stored and returns the best
  // of the two — the value that should actually be shown to the player.
  function recordScore(score) {
    const best = Math.max(score, getHighScore());
    try { localStorage.setItem(HIGH_SCORE_KEY, String(best)); } catch (e) { /* ignore */ }
    return best;
  }

  function lang() { return (typeof scheduleLang === 'function') ? scheduleLang() : 'id'; }
  function t(idText, enText) { return lang() === 'id' ? idText : enText; }

  function setTimer(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }
  function clearAllTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; }
  }

  function getCells() {
    const grid = document.getElementById('schedule-cal-grid');
    return grid ? Array.from(grid.querySelectorAll(CELL_SELECTOR)) : [];
  }

  // Safety net for the "stuck in snake mode forever" failure mode: if the
  // grid we snapshotted at start() is no longer the live DOM (page navigated
  // away and back, calendar re-rendered out from under us for some other
  // reason, etc.), kirSnakeModeActive can otherwise stay stuck true with no
  // way back in, since nothing else on the page resets it. Anything that
  // drives the game (handleKey, tick) checks this first and self-recovers
  // instead of quietly operating on dead nodes forever.
  function gridStillLive() {
    return cells.length > 0 && cells[0].isConnected && document.getElementById('schedule-cal-grid');
  }
  function forceRecover() {
    clearAllTimers();
    phase = 'idle';
    snakeBody = []; appleIdx = null; dirQueue = [];
    lockNav(false);
    setModeActive(false);
  }
  function findCellForKey(key) {
    return cells.find(c => c.dataset.key === key) || null;
  }
  function idxOfKey(key) {
    return cells.findIndex(c => c.dataset.key === key);
  }
  function realDayNumber(cell) {
    return parseInt(cell.dataset.key.split('-')[2], 10);
  }
  function numEl(cell) { return cell.querySelector('.kir-month-cal-day-num'); }

  function lockNav(locked) {
    ['schedule-cal-prev-btn', 'schedule-cal-today-btn', 'schedule-cal-next-btn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('kir-cal-locked', locked);
    });
  }

  function setModeActive(active) {
    window.kirSnakeModeActive = active;
  }

  function clearSnakeVisuals() {
    cells.forEach(c => c.classList.remove('kir-snake-cell-body', 'kir-snake-cell-head', 'kir-snake-cell-apple', 'kir-snake-choice', 'kir-snake-hiscore'));
  }
  function clearChoiceHandlers() {
    cells.forEach(c => { c.onclick = null; c.onkeydown = null; });
  }
  function restoreAllNumbers() {
    cells.forEach(c => { const el = numEl(c); if (el) el.textContent = String(realDayNumber(c)); });
  }

  // The cell you clicked into (16 July) is still carrying the calendar's own
  // "selected" fill + ring classes when the mode starts — strip those so the
  // intro plays on a clean grid instead of one with a lit-up cell sitting in
  // the middle of it.
  function stripSelectionVisuals() {
    cells.forEach(c => c.classList.remove('kir-cal-selected', 'kir-cal-ring-active', 'kir-cal-select-anim', 'kir-cal-deselect-anim', 'kir-cal-travel-pulse'));
  }
  // Undoes stripSelectionVisuals when the mode ends, by just asking the
  // calendar to re-render itself from its own (untouched) state — simplest
  // way to get the selection ring/fill, today marker, holiday/special tints
  // and event dots all back exactly as they were, without this file having
  // to duplicate that logic.
  function restoreCalendarChrome() {
    if (typeof renderScheduleCalendar === 'function') renderScheduleCalendar();
  }

  // ---------------- public entry point ----------------
  function start() {
    // The button that calls this is already hidden under reduced motion
    // (see the scheduleIsReducedMotion() check around it in schedule.html)
    // — this is just the second layer behind that, in case start() ever
    // gets invoked some other way (console, a future keyboard shortcut,
    // whatever). Same two sources checked everywhere else on the site.
    if (document.documentElement.getAttribute('data-reduce-motion') === 'true'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (window.kirSnakeModeActive) {
      // Normally this just means a run is genuinely in progress. But if the
      // grid we were operating on is gone (e.g. state got left stuck true by
      // a previous run that never got a clean exit), don't sit there
      // refusing to start forever — recover and let a fresh run begin.
      if (gridStillLive()) return;
      forceRecover();
    }

    cells = getCells();
    if (!cells.length) return;

    // The button only ever exists in the 16-July popover, so that key is
    // always present in whichever grid is currently on screen (possibly as
    // a spillover cell from an adjacent month view) — read the year off it
    // rather than off scheduleCalMonth, which the view might not literally be.
    const anchor = cells.find(c => /-07-16$/.test(c.dataset.key));
    if (!anchor) return;
    year = anchor.dataset.key.split('-')[0];

    if (typeof scheduleHideDayPopover === 'function') scheduleHideDayPopover();
    stripSelectionVisuals();

    setModeActive(true);
    lockNav(true);
    // Whatever cell was focused going in (very likely 16 July, since that's
    // where the snake button lives) doesn't need to stay focused for the
    // rest of the run, and leaving it focused is one less thing to worry
    // about interacting with WASD/arrow keys.
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    runScramble();
  }

  // ---------------- intro: scramble -> countdown -> revert ----------------
  function runScramble() {
    phase = 'scramble';
    const STEP = 22;
    cells.forEach((cell, i) => {
      setTimer(() => { const el = numEl(cell); if (el) el.textContent = '0'; }, STEP * i);
    });
    setTimer(runCountdown, STEP * cells.length + 150);
  }

  function runCountdown() {
    phase = 'countdown';
    // Distinct, high-contrast colors per count so 3/2/1 actually pop against
    // the grid instead of blending into the normal day-number color.
    const marks = [
      ['07-07', '3', '#fbbf24'], // amber
      ['07-14', '2', '#fb923c'], // orange
      ['07-21', '1', '#f87171'], // red
    ];
    marks.forEach(([md, label, color], i) => {
      setTimer(() => {
        const cell = findCellForKey(`${year}-${md}`);
        const el = cell && numEl(cell);
        if (el) { el.textContent = label; el.style.color = color; }
      }, i * 550);
    });
    setTimer(runRevert, marks.length * 550 + 700);
  }

  function runRevert() {
    phase = 'revert';
    // Clear the countdown colors back to the theme's normal text color
    // before restoring the actual date numbers.
    cells.forEach(c => { const el = numEl(c); if (el) el.style.color = ''; });
    restoreAllNumbers();
    setTimer(beginIntroWalk, 500);
  }

  // ---------------- intro: the highlight walks itself upward for a few beats ----------------
  function beginIntroWalk() {
    phase = 'intro-walk';
    let startIdx = idxOfKey(`${year}-08-03`);
    if (startIdx === -1) startIdx = cells.length - COLS; // fallback: bottom-left cell

    snakeBody = [startIdx];
    dir = { dr: -1, dc: 0 };
    dirQueue = [];
    renderSnake();

    const WALK_STEP_MS = 450;
    const INTRO_STEPS = 3;
    let steps = 0;

    function walkStep() {
      steps++;
      const head = snakeBody[0];
      const row = Math.floor(head / COLS), col = head % COLS;
      const newRow = row + dir.dr, newCol = col + dir.dc;
      if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) {
        beginPlay(); // shouldn't happen during the scripted walk, but bail safely
        return;
      }
      snakeBody.unshift(newRow * COLS + newCol);
      snakeBody.pop();
      renderSnake();
      if (steps < INTRO_STEPS) setTimer(walkStep, WALK_STEP_MS);
      else setTimer(beginPlay, WALK_STEP_MS);
    }
    setTimer(walkStep, WALK_STEP_MS);
  }

  // Bails out of the scripted intro-walk early: cancels whatever walkStep/
  // beginPlay timer was still pending, commits the player's pressed
  // direction as the current heading, and starts real play immediately
  // from the highlight's current position (rather than waiting for the
  // remaining automatic steps to play out first).
  function skipIntroWalk(next) {
    clearAllTimers();
    dir = next;
    dirQueue = [];
    beginPlay();
  }

  // ---------------- the actual game ----------------
  function beginPlay() {
    phase = 'playing';
    spawnApple();
    tickTimer = setTimeout(tick, TICK_MS);
  }

  function emptyCellIndices() {
    const out = [];
    for (let i = 0; i < cells.length; i++) if (!snakeBody.includes(i)) out.push(i);
    return out;
  }

  function spawnApple() {
    const empties = emptyCellIndices();
    if (!empties.length) { endGame(true); return; } // board's full: win
    appleIdx = empties[Math.floor(Math.random() * empties.length)];
    renderSnake();
  }

  const KEY_DIRS = {
    arrowup: { dr: -1, dc: 0 }, w: { dr: -1, dc: 0 },
    arrowdown: { dr: 1, dc: 0 }, s: { dr: 1, dc: 0 },
    arrowleft: { dr: 0, dc: -1 }, a: { dr: 0, dc: -1 },
    arrowright: { dr: 0, dc: 1 }, d: { dr: 0, dc: 1 },
  };

  function handleKey(key) {
    if (!gridStillLive()) { forceRecover(); return; }
    const next = KEY_DIRS[key];
    if (!next) return;

    // The intro-walk plays out a few automatic steps upward before handing
    // control to the player (see beginIntroWalk). That's paced for looks
    // (450ms/step) rather than for gameplay (170ms/tick), so a player who
    // starts pressing WASD/arrows as soon as they see the highlight move
    // ends up mashing keys into a phase that's still ignoring them — by the
    // time input is actually accepted, several automatic steps have already
    // gone by in the default direction, which reads as "the snake won't
    // turn for its first several steps." The first press during the walk
    // instead cuts it short right there and hands over control immediately.
    if (phase === 'intro-walk') { skipIntroWalk(next); return; }

    if (phase !== 'playing') return; // scramble/countdown/death: movement does nothing
    // Validate against whichever direction the snake will actually be
    // heading in once every already-queued turn has played out — the last
    // entry in dirQueue if there is one, otherwise the committed `dir`.
    // Checking against the committed `dir` alone (or a single overwritable
    // "pendingDir" slot) is the old bug: rattling off two or three turns to
    // round a corner within one tick window used to overwrite the earlier
    // presses instead of queueing them, so keys felt like they weren't
    // registering. Buffering a short queue (capped at MAX_QUEUED) lets quick
    // taps land in order without letting input run arbitrarily far ahead.
    const effectiveDir = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir;
    if (next.dr === -effectiveDir.dr && next.dc === -effectiveDir.dc) return; // no reversing into your own neck
    if (next.dr === effectiveDir.dr && next.dc === effectiveDir.dc) return; // already queued/heading this way, nothing to add
    if (dirQueue.length >= MAX_QUEUED) dirQueue.shift(); // drop the oldest queued turn rather than let the buffer grow unbounded
    dirQueue.push(next);
  }

  function tick() {
    if (!gridStillLive()) { forceRecover(); return; }
    if (dirQueue.length) dir = dirQueue.shift();

    const head = snakeBody[0];
    const row = Math.floor(head / COLS), col = head % COLS;
    const newRow = row + dir.dr, newCol = col + dir.dc;

    if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) { endGame(false); return; }

    const newIdx = newRow * COLS + newCol;
    const ateApple = newIdx === appleIdx;
    const bodyToCheck = ateApple ? snakeBody : snakeBody.slice(0, -1);
    if (bodyToCheck.includes(newIdx)) { endGame(false); return; }

    snakeBody.unshift(newIdx);
    if (!ateApple) snakeBody.pop();
    renderSnake();

    if (ateApple) {
      if (snakeBody.length >= cells.length) { endGame(true); return; }
      spawnApple();
    }
    tickTimer = setTimeout(tick, TICK_MS);
  }

  function renderSnake() {
    clearSnakeVisuals();
    snakeBody.forEach((idx, i) => {
      const cell = cells[idx];
      if (cell) cell.classList.add(i === 0 ? 'kir-snake-cell-head' : 'kir-snake-cell-body');
    });
    if (appleIdx !== null) {
      const cell = cells[appleIdx];
      if (cell) cell.classList.add('kir-snake-cell-apple');
    }
  }

  // ---------------- end states ----------------
  function endGame(won) {
    phase = 'dead';
    if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; }

    const bestScore = recordScore(currentScore());

    if (won) { setTimer(exitMode, 900); return; }

    setTimer(() => {
      clearSnakeVisuals();
      cells.forEach(c => { const el = numEl(c); if (el) el.textContent = 'X'; });

      const retryIdx = idxOfKey(`${year}-07-16`);
      const retryCell = retryIdx !== -1 ? cells[retryIdx] : null;
      const exitCell = findCellForKey(`${year}-07-17`);
      // The day cell immediately to the left of "Try again?" in the grid —
      // not a fixed date, since where 16 July falls in the week (and thus
      // what's next to it) varies by year.
      const hiscoreCell = retryIdx > 0 ? cells[retryIdx - 1] : null;
      if (retryCell) {
        const el = numEl(retryCell);
        if (el) el.textContent = t('Coba lagi?', 'Try again?');
        retryCell.classList.add('kir-snake-choice');
        retryCell.onclick = (e) => { e.stopPropagation(); restart(); };
        retryCell.onkeydown = (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault(); e.stopPropagation();
          restart();
        };
      }
      if (exitCell) {
        const el = numEl(exitCell);
        if (el) el.textContent = t('Keluar', 'Exit');
        exitCell.classList.add('kir-snake-choice');
        exitCell.onclick = (e) => { e.stopPropagation(); exitMode(); };
        exitCell.onkeydown = (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault(); e.stopPropagation();
          exitMode();
        };
      }
      if (hiscoreCell) {
        const el = numEl(hiscoreCell);
        // Informational only (no click/keydown handlers) — kir-snake-choice
        // is reserved for the two actual choices, so this gets its own,
        // non-interactive box style.
        if (el) el.innerHTML = `${t('Skor Tertinggi', 'High Score')}<br>${bestScore}`;
        hiscoreCell.classList.add('kir-snake-hiscore');
      }
    }, 500);
  }

  function restart() {
    clearAllTimers();
    clearChoiceHandlers();
    clearSnakeVisuals();
    restoreAllNumbers();
    snakeBody = []; appleIdx = null; dirQueue = [];
    setTimer(beginIntroWalk, 200);
  }

  function exitMode() {
    clearAllTimers();
    clearChoiceHandlers();
    clearSnakeVisuals();
    cells.forEach(c => { const el = numEl(c); if (el) el.style.color = ''; });
    snakeBody = []; appleIdx = null; dirQueue = [];
    phase = 'idle';
    lockNav(false);
    setModeActive(false);
    restoreCalendarChrome(); // re-renders the grid from real state: numbers, selection, today, holidays, dots, all of it
  }

  window.kirSnake = { start, handleKey };
})();
