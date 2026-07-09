const DISCORD_URL  = 'https://discord.gg/REPLACE_ME';
const WHATSAPP_URL = 'https://wa.me/REPLACE_ME';
// ---------------------------------------------------------------------

const AXES = [
  { id: 'delivery',   trait1: 'V', trait2: 'A', label1: 'Vocal',       label2: 'Analytical' },
  { id: 'engagement', trait1: 'C', trait2: 'D', label1: 'Clash',       label2: 'Diplomatic' },
  { id: 'adaptation', trait1: 'I', trait2: 'S', label1: 'Improvised',  label2: 'Structured' },
  { id: 'motivator',  trait1: 'P', trait2: 'E', label1: 'Pragmatic',   label2: 'Ethical' },
];

// 12 base scenarios — 3 per axis. Strongly Agree leans trait1, Strongly Disagree leans trait2.
const BASE_QUESTIONS = [
  // Axis 1 — Delivery: Vocal (V) vs Analytical (A)
  { axis: 'delivery', trait1: 'V', trait2: 'A',
    text: "You've got thirty seconds to make your point. Your instinct is to raise your voice and command the room, not lay out the data carefully." },
  { axis: 'delivery', trait1: 'V', trait2: 'A',
    text: "A sharp, well-timed line wins a room faster than a slide full of statistics ever will." },
  { axis: 'delivery', trait1: 'V', trait2: 'A',
    text: "In practice rounds, you're performing the speech out loud before you've even finished writing it." },

  // Axis 2 — Engagement: Clash (C) vs Diplomatic (D)
  { axis: 'engagement', trait1: 'C', trait2: 'D',
    text: "When someone attacks your argument, your instinct is to hit back immediately — not smooth things over." },
  { axis: 'engagement', trait1: 'C', trait2: 'D',
    text: "You'd rather win the room by out-arguing the opposition than by getting everyone to agree." },
  { axis: 'engagement', trait1: 'C', trait2: 'D',
    text: "Conflict energizes you more than consensus does." },

  // Axis 3 — Adaptation: Improvised (I) vs Structured (S)
  { axis: 'adaptation', trait1: 'I', trait2: 'S',
    text: "Handed a surprise topic fifteen minutes before you speak, you'd rather wing it than force it into a template." },
  { axis: 'adaptation', trait1: 'I', trait2: 'S',
    text: "A rigid outline slows you down more than it helps you." },
  { axis: 'adaptation', trait1: 'I', trait2: 'S',
    text: "Mid-speech, you'd trust your gut over a script you rehearsed." },

  // Axis 4 — Motivator: Pragmatic (P) vs Ethical (E)
  { axis: 'motivator', trait1: 'P', trait2: 'E',
    text: "You'll argue a side you don't personally believe in, if it's the side that wins." },
  { axis: 'motivator', trait1: 'P', trait2: 'E',
    text: "The result matters more to you than whether the argument was 'right.'" },
  { axis: 'motivator', trait1: 'P', trait2: 'E',
    text: "Given the choice, you'd take the practical win over the principled loss." },
];

// 4 stress-test scenarios — one per axis, injected when a trait score hits +4
const STRESS_QUESTIONS = {
  delivery:   "COMMAND TEST — The room is turning against you and the clock is running out. Your gut says get louder and take the floor by force, not slow down and clean up your logic.",
  engagement: "PRESSURE TEST — An opponent just landed a low blow: half-true and hard to answer cleanly. Your first move is to hit back just as hard, not steer the room toward middle ground.",
  adaptation: "CHAOS TEST — Your notes are gone, lost thirty seconds before you speak. You'd rather build the case live, on the spot, than lean on the outline you remember.",
  motivator:  "ENDGAME TEST — With the win on the line, you're offered a technically-legal move that feels ethically grey but guarantees the result. You take it.",
};

// 16-profile matrix
const PROFILES = {
  VCIP: { title: 'The Maverick',          track: 'debate' },
  VCIE: { title: 'The Crusader',          track: 'debate' },
  VCSP: { title: 'The Gladiator',         track: 'debate' },
  VCSE: { title: 'The Defender',          track: 'debate' },
  VDIP: { title: 'The Orator',            track: 'both' },
  VDIE: { title: 'The Visionary',         track: 'both' },
  VDSP: { title: 'The Smooth Talker',     track: 'mun' },
  VDSE: { title: 'The Consensus Builder', track: 'mun' },
  ACIP: { title: 'The Firefighter',       track: 'both' },
  ACIE: { title: 'The Rebel Intellect',   track: 'debate' },
  ACSP: { title: 'The Chess Master',      track: 'both' },
  ACSE: { title: 'The Purist',            track: 'debate' },
  ADIP: { title: 'The Rogue Diplomat',    track: 'mun' },
  ADIE: { title: 'The Ethical Consultant',track: 'mun' },
  ADSP: { title: 'The Strategist',        track: 'mun' },
  ADSE: { title: 'The Blueprint Designer',track: 'both' },
};

const TRACK_META = {
  debate: { label: 'Recommended Track: Debate', badge: 'badge-debate', card: 'track-debate' },
  mun:    { label: 'Recommended Track: MUN',    badge: 'badge-mun',    card: 'track-mun' },
  both:   { label: 'Recommended Track: Debate & MUN', badge: 'badge-both', card: 'track-both' },
};

// ---------- STATE ----------
let scores = { V:0, A:0, C:0, D:0, I:0, S:0, P:0, E:0 };
let stressUsed = { delivery: false, engagement: false, adaptation: false, motivator: false };
let queue = [];
let qIndex = 0;
let recruitName = '';
let maxSeenLength = BASE_QUESTIONS.length;

// ---------- DOM ----------
const els = {
  welcome: document.getElementById('view-welcome'),
  quiz: document.getElementById('view-quiz'),
  results: document.getElementById('view-results'),
  nameInput: document.getElementById('name-input'),
  beginBtn: document.getElementById('begin-btn'),
  clearanceFill: document.getElementById('clearance-fill'),
  clearanceTicks: document.getElementById('clearance-ticks'),
  fileCurrent: document.getElementById('file-current'),
  fileTotal: document.getElementById('file-total'),
  stressFlag: document.getElementById('stress-flag'),
  scenarioText: document.getElementById('scenario-text'),
  likertRow: document.getElementById('likert-row'),
  resultsCard: document.getElementById('results-card'),
  stamp: document.getElementById('stamp'),
  resultsEyebrow: document.getElementById('results-eyebrow'),
  resultsCode: document.getElementById('results-code'),
  resultsArchetype: document.getElementById('results-archetype'),
  resultsTrack: document.getElementById('results-track'),
  resultsBreakdownText: document.getElementById('results-breakdown-text'),
  traitMeters: document.getElementById('trait-meters'),
  ctaBtn: document.getElementById('cta-btn'),
  retakeBtn: document.getElementById('retake-btn'),
};

const LIKERT_OPTIONS = [
  { val: 2,  label: 'Strongly Agree' },
  { val: 1,  label: 'Agree' },
  { val: 0,  label: 'Neutral' },
  { val: -1, label: 'Disagree' },
  { val: -2, label: 'Strongly Disagree' },
];

// ---------- VIEW SWITCHING ----------
function switchView(from, to) {
  if (from) {
    from.classList.add('fade-slide-exit');
    setTimeout(() => {
      from.hidden = true;
      from.classList.remove('fade-slide-exit');
      to.hidden = false;
      to.classList.add('fade-slide-enter');
      setTimeout(() => to.classList.remove('fade-slide-enter'), 520);
    }, 260);
  } else {
    to.hidden = false;
    to.classList.add('fade-slide-enter');
    setTimeout(() => to.classList.remove('fade-slide-enter'), 520);
  }
}

// ---------- WELCOME ----------
els.nameInput.addEventListener('input', () => {
  els.beginBtn.disabled = els.nameInput.value.trim().length === 0;
});

els.beginBtn.addEventListener('click', startQuiz);
els.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !els.beginBtn.disabled) startQuiz();
});

function startQuiz() {
  recruitName = els.nameInput.value.trim() || 'Recruit';
  queue = BASE_QUESTIONS.map(q => ({ ...q, isStress: false }));
  qIndex = 0;
  scores = { V:0, A:0, C:0, D:0, I:0, S:0, P:0, E:0 };
  stressUsed = { delivery: false, engagement: false, adaptation: false, motivator: false };
  maxSeenLength = BASE_QUESTIONS.length;
  switchView(els.welcome, els.quiz);
  renderQuestion();
}

// ---------- QUIZ RENDER ----------
function renderQuestion() {
  const q = queue[qIndex];
  if (!q) { showResults(); return; }

  maxSeenLength = Math.max(maxSeenLength, queue.length);
  const pct = Math.min(96, Math.round((qIndex / maxSeenLength) * 100));
  els.clearanceFill.style.width = pct + '%';
  els.fileCurrent.textContent = String(qIndex + 1).padStart(2, '0');
  els.fileTotal.textContent = String(maxSeenLength).padStart(2, '0');

  els.stressFlag.hidden = !q.isStress;
  els.scenarioText.textContent = q.text;

  els.likertRow.innerHTML = '';
  LIKERT_OPTIONS.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'likert-option';
    btn.setAttribute('data-val', opt.val);
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', opt.label);
    btn.innerHTML = `<span class="dot"></span><span class="lbl">${opt.label}</span>`;
    btn.addEventListener('click', () => selectAnswer(btn, opt.val));
    els.likertRow.appendChild(btn);
  });
}

function selectAnswer(btn, val) {
  // brief visual confirmation, then advance automatically
  els.likertRow.querySelectorAll('.likert-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  els.likertRow.querySelectorAll('.likert-option').forEach(b => b.disabled = true);

  setTimeout(() => {
    applyScore(queue[qIndex], val);
    checkForStressTriggers();
    qIndex++;
    if (qIndex >= queue.length) {
      showResults();
    } else {
      renderQuestion();
    }
  }, 260);
}

function applyScore(q, val) {
  if (val === 0) return;

  if (!q.isStress) {
    if (val > 0) scores[q.trait1] += val;
    else scores[q.trait2] += Math.abs(val);
    return;
  }

  // Stress-test scoring: identify which trait is currently leading on this axis.
  const leading = scores[q.trait1] >= scores[q.trait2] ? q.trait1 : q.trait2;
  const supportsLeading = (leading === q.trait1 && val > 0) || (leading === q.trait2 && val < 0);

  if (supportsLeading) {
    // answered with type — reinforce normally
    scores[leading] += Math.abs(val);
  } else {
    // answered against type on a targeted question — severe correction
    scores[leading] -= 3;
  }
}

function checkForStressTriggers() {
  AXES.forEach(ax => {
    if (stressUsed[ax.id]) return;
    if (scores[ax.trait1] >= 4 || scores[ax.trait2] >= 4) {
      stressUsed[ax.id] = true;
      queue.splice(qIndex + 1, 0, {
        axis: ax.id,
        trait1: ax.trait1,
        trait2: ax.trait2,
        text: STRESS_QUESTIONS[ax.id],
        isStress: true,
      });
    }
  });
}

// ---------- RESULTS ----------
function compileCode() {
  return AXES.map(ax => (scores[ax.trait1] >= scores[ax.trait2] ? ax.trait1 : ax.trait2)).join('');
}

function showResults() {
  const code = compileCode();
  const profile = PROFILES[code] || { title: 'The Wildcard', track: 'both' };
  const trackMeta = TRACK_META[profile.track];

  els.resultsCard.classList.remove('track-debate', 'track-mun', 'track-both');
  els.resultsCard.classList.add(trackMeta.card);

  els.resultsEyebrow.textContent = `PERSONNEL FILE — ${recruitName.toUpperCase()}`;
  els.resultsCode.textContent = code;
  els.resultsArchetype.textContent = profile.title;
  els.resultsTrack.textContent = trackMeta.label;
  els.resultsTrack.className = 'results-track ' + trackMeta.badge;

  els.resultsBreakdownText.textContent = buildBreakdownText(recruitName, code, profile, trackMeta);

  els.traitMeters.innerHTML = '';
  AXES.forEach(ax => {
    const t1 = scores[ax.trait1], t2 = scores[ax.trait2];
    const total = t1 + t2;
    const pct1 = total === 0 ? 50 : Math.round((t1 / total) * 100);
    const leading1 = t1 >= t2;

    const row = document.createElement('div');
    row.className = 'trait-meter-row';
    row.innerHTML = `
      <span class="side ${leading1 ? 'active' : ''}">${ax.label1}</span>
      <span class="trait-meter-track">
        <span class="trait-meter-fill" style="width:0%; ${leading1 ? 'left:0;' : 'right:0;'}"></span>
      </span>
      <span class="side right ${!leading1 ? 'active' : ''}">${ax.label2}</span>
    `;
    els.traitMeters.appendChild(row);
    const fill = row.querySelector('.trait-meter-fill');
    requestAnimationFrame(() => {
      fill.style.width = (leading1 ? pct1 : 100 - pct1) + '%';
    });
  });

  els.ctaBtn.href = trackMeta.card === 'track-mun' ? WHATSAPP_URL : DISCORD_URL;
  els.ctaBtn.textContent = trackMeta.card === 'track-mun'
    ? 'Join the WhatsApp Group →'
    : 'Join the Discord →';

  switchView(els.quiz, els.results);
  els.stamp.classList.remove('stamp-in');
  void els.stamp.offsetWidth; // restart animation
  els.stamp.classList.add('stamp-in');
}

function buildBreakdownText(name, code, profile, trackMeta) {
  const deliveryLead = scores.V >= scores.A ? 'vocal, commanding delivery' : 'careful, analytical delivery';
  const engageLead = scores.C >= scores.D ? 'thrives on direct clash' : 'wins rooms by building consensus';
  const adaptLead = scores.I >= scores.S ? 'improvises under pressure' : 'leans on structure and preparation';
  const motiveLead = scores.P >= scores.E ? 'plays to win' : 'argues from principle';

  return `${name}, your file reads ${code} — ${profile.title}. You lead with a ${deliveryLead}, ${engageLead}, ${adaptLead}, and ${motiveLead}. ${trackMeta.label.replace('Recommended Track: ', 'That combination puts you on the ')} track.`;
}

// ---------- RETAKE ----------
els.retakeBtn.addEventListener('click', () => {
  switchView(els.results, els.welcome);
  els.nameInput.value = '';
  els.beginBtn.disabled = true;
  els.nameInput.focus();
});

// ---------- INIT ----------
els.beginBtn.disabled = true;
