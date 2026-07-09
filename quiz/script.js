/* =============================================
   16Rhetoric Engine
   Scoring engine + view controller
   ============================================= */

// ---------- CONFIG: edit these for your club's real links ----------
const DISCORD_URL  = 'https://discord.gg/REPLACE_ME';
const WHATSAPP_URL = 'https://wa.me/REPLACE_ME';
// ---------------------------------------------------------------------

const AXES = [
  { id: 'delivery',   trait1: 'V', trait2: 'A', label1: 'Vocal',       label2: 'Analytical' },
  { id: 'engagement', trait1: 'C', trait2: 'D', label1: 'Clash',       label2: 'Diplomatic' },
  { id: 'adaptation', trait1: 'I', trait2: 'S', label1: 'Improvised',  label2: 'Structured' },
  { id: 'motivator',  trait1: 'P', trait2: 'E', label1: 'Pragmatic',   label2: 'Ethical' },
];

// Glossary terms auto-linked with a hover/focus tooltip wherever they appear
// in scenario text. Keep entries lowercase, matched case-insensitively.
const GLOSSARY = {
  larp: "to act like something you're not, for fun (irl slang for live action roleplay)",
  receipts: "slang for proof or evidence that backs up what you're saying",
  "clap back": "slang for firing back a quick, sharp response to criticism",
  shady: "slang for acting sketchy, dishonest, or untrustworthy",
};

function linkifyGlossary(text) {
  let out = text;
  Object.keys(GLOSSARY).forEach(term => {
    const re = new RegExp(`\\b(${term}\\w*)\\b`, 'gi');
    out = out.replace(re, (match) => {
      return `<span class="term-tip" tabindex="0">${match}<span class="term-tip-bubble">${GLOSSARY[term]}</span></span>`;
    });
  });
  return out;
}

// Question pool: multiple normal-keyed and reverse-keyed scenarios per axis.
// normal: Strongly Agree -> trait1, Strongly Disagree -> trait2
// reverse: Strongly Agree -> trait2, Strongly Disagree -> trait1
// Having both kinds means answering "all agree" or "all disagree" no longer
// guarantees the same result every time, and each retake can surface a
// different mix and a different first question.
const QUESTION_POOL = {
  delivery: {
    normal: [
      "if i've got something to say in the group chat, i'm sending a voice note, not typing an essay.",
      "a confident tone gets people on my side faster than a bunch of screenshots and links ever could.",
      "when i think i've got something important to say, i'm comfortable taking control of the conversation.",
    ],
    reverse: [
      "i'd rather send three paragraphs with receipts than one confident voice note.",
      "i plan out exactly what i'm going to say before i say it, even in a casual argument.",
      "when someone pushes back on what i said, my first instinct is to pause and think before responding.",
    ],
  },
  engagement: {
    normal: [
      "if a friend says something i disagree with, i call it out right there, i don't let it slide.",
      "i'd rather actually win the argument than keep things comfortable.",
      "when someone makes a weak argument, i naturally start picking apart the flaws in it.",
    ],
    reverse: [
      "i'll let a friend be wrong in the group chat if calling it out isn't worth the awkward silence after.",
      "preserving the relationship matters more to me than winning the disagreement.",
      "i'd rather land on a middle ground everyone can live with than fully win.",
    ],
  },
  adaptation: {
    normal: [
      "group project, no plan, presenting in 10 minutes. i'm winging it live, not building an outline.",
      "i usually perform better when i'm free to adapt instead of following a fixed plan.",
      "larping as some random country's delegate with zero prep sounds fun to me, not stressful.",
    ],
    reverse: [
      "i'd rather have index cards and a script than improvise, even if i'm good at winging it.",
      "a messy, unplanned argument stresses me out more than it excites me.",
      "if i have enough time to prepare, i almost always will.",
    ],
  },
  motivator: {
    normal: [
      "i'd argue a side i don't actually believe in, if it's the side that gets me the win.",
      "getting the result matters more to me than whether i got there the right way.",
      "if i were assigned a position i completely disagreed with, i'd still try to argue it as convincingly as possible.",
    ],
    reverse: [
      "i'd rather lose an argument on principle than win one i don't actually believe in.",
      "being right matters way less to me than being fair.",
      "i'd call out my own side if they were being shady, even if it cost me the win.",
    ],
  },
};

// One stress-test scenario per axis, injected quietly when a trait score hits +4
const STRESS_QUESTIONS = {
  delivery:   "everyone in the chat is piling on and coming for me at once. my gut says get louder and more confident, not go quiet and pick my words carefully.",
  engagement: "someone in my friend group calls me out unfairly, in front of everyone. my first move is to clap back right away, not let it go for the sake of peace.",
  adaptation: "my slides or notes just disappeared right before i have to present. i'd rather freestyle the whole thing than panic and try to rebuild an outline.",
  motivator:  "if bending the rules slightly was the only realistic way to achieve my goal, i'd probably do it.",
};

// Extra questions: shown after the main 12 (+ any follow-ups) are done.
// These don't feed into scoring or the resulting type at all — they're a
// quick reality check so people know what they're actually signing up for.
// Answers get echoed back on the results page as personalized notes.
const EXTRA_QUESTIONS = [
  {
    id: 'research',
    text: "spending real time digging through articles, data, and sources on a topic sounds like a good time to me, not a chore.",
    note: "in MUN, that turns into an actual position paper you write and bring into committee. in debate, it's the research backing your case.",
  },
  {
    id: 'writing',
    text: "i don't mind writing out pages of notes if it means i've actually got something solid to read from later.",
    note: "MUN runs a lot on paper (or laptop): position papers, notes passed during committee, resolution drafts you help write.",
  },
  {
    id: 'assigned-side',
    text: "i could still argue a side confidently even if it's the opposite of what i actually believe.",
    note: "debate assigns you pro or contra on a topic, sometimes the side you personally disagree with, and you're expected to argue it well anyway, straight from the case file, not your own opinion.",
  },
  {
    id: 'procedure',
    text: "learning a whole formal rulebook before i can even participate doesn't put me off.",
    note: "MUN committees run on rules of procedure: a formal system for motions, points, and speaking order you'll need to pick up fast.",
  },
  {
    id: 'prep-time',
    text: "getting a topic with only a few minutes to prepare before i have to speak on it doesn't scare me off.",
    note: "some debate formats hand you a topic right before your speech, short prep, no long research window.",
  },
  {
    id: 'strangers',
    text: "negotiating or debating in front of a room of judges or delegates i've never met doesn't stress me out that much.",
    note: "both activities put you in front of strangers, judges, chairs, or opposing delegates, who you have to convince on the spot.",
  },
];

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
  debate: { label: "You'd thrive in: Debate",        badge: 'badge-debate', card: 'track-debate' },
  mun:    { label: "You'd thrive in: MUN",            badge: 'badge-mun',    card: 'track-mun' },
  both:   { label: "You'd thrive in: Debate & MUN",   badge: 'badge-both',   card: 'track-both' },
};

// ---------- STATE ----------
let scores = { V:0, A:0, C:0, D:0, I:0, S:0, P:0, E:0 };
let stressUsed = { delivery: false, engagement: false, adaptation: false, motivator: false };
let queue = [];
let qIndex = 0;
let recruitName = '';
let maxSeenLength = 12;
let confidence = {
  delivery: 0,
  engagement: 0,
  adaptation: 0,
  motivator: 0,
};
let extraAnswers = {};
let extrasInjected = false;
let checkpointReached = false;
let checkpointState = 0;
let tookBonus = false;
let buttonsExploded = false;
let baseQuizLength = 0;

const explosionAudio = new Audio('explosion.mp3');
const fadeAudio = new Audio('fade.mp3');
const laughAudio = new Audio('laugh.mp3');
const splatAudio = new Audio('splat.mp3');
const runAudio = new Audio('run.mp3');

// ---------- DOM ----------
const els = {
  welcome: document.getElementById('view-welcome'),
  quiz: document.getElementById('view-quiz'),
  results: document.getElementById('view-results'),
  nameInput: document.getElementById('name-input'),
  beginBtn: document.getElementById('begin-btn'),
  progressLabel: document.getElementById('progress-label'),
  clearanceFill: document.getElementById('clearance-fill'),
  clearanceTicks: document.getElementById('clearance-ticks'),
  fileCurrent: document.getElementById('file-current'),
  fileTotal: document.getElementById('file-total'),
  fileMetaLabel: document.getElementById('file-meta-label'),
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
  realityList: document.getElementById('reality-list'),
  ctaBtn: document.getElementById('cta-btn'),
  retakeBtn: document.getElementById('retake-btn'),
};

const LIKERT_OPTIONS = [
  { val: -2, label: 'hell naw' },
  { val: -1, label: 'nah' },
  { val: 0,  label: "don't know" },
  { val: 1,  label: 'yea' },
  { val: 2,  label: 'hell yea' },
];

// ---------- UTIL ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a fresh, randomized 12-question set: for each axis, pick 3 scenarios
// out of that axis's pool, with a random mix of normal- and reverse-keyed
// items (never all one type), then shuffle the whole set together so the
// first question isn't always the same axis or the same statement.
function buildQueue() {
  const built = [];
  AXES.forEach(ax => {
    const pool = QUESTION_POOL[ax.id];
    const normals = shuffle(pool.normal);
    const reverses = shuffle(pool.reverse);
    const nNormal = Math.random() < 0.5 ? 2 : 1;
    const nReverse = 3 - nNormal;
    const picked = [
      ...normals.slice(0, nNormal).map(text => ({ axis: ax.id, trait1: ax.trait1, trait2: ax.trait2, text, reverse: false, isStress: false })),
      ...reverses.slice(0, nReverse).map(text => ({ axis: ax.id, trait1: ax.trait1, trait2: ax.trait2, text, reverse: true, isStress: false })),
    ];
    built.push(...picked);
  });
  return shuffle(built);
}

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
  document.querySelectorAll('.physics-clone, [data-troll="true"]').forEach(el => el.remove());
  const layer = document.getElementById('physics-layer');
  if (layer) layer.remove();
  recruitName = els.nameInput.value.trim() || 'Recruit';
  queue = buildQueue();
  qIndex = 0;
  checkpointReached = false;
  checkpointState = 0;
  tookBonus = false;
  buttonsExploded = false;
  baseQuizLength = 0;
  els.quiz.classList.remove('bonus-mode');
  scores = { V:0, A:0, C:0, D:0, I:0, S:0, P:0, E:0 };
  stressUsed = { delivery: false, engagement: false, adaptation: false, motivator: false };
  confidence = { delivery: 0, engagement: 0, adaptation: 0, motivator: 0 };
  extraAnswers = {};
  extrasInjected = false;
  maxSeenLength = queue.length;
  switchView(els.welcome, els.quiz);
  renderQuestion();
}

// ---------- QUIZ RENDER ----------
function renderQuestion() {
  const q = queue[qIndex];
  if (!q) { showResults(); return; }

  maxSeenLength = Math.max(maxSeenLength, queue.length);
  
  let progressIndex = qIndex;
  let totalLength = maxSeenLength;
  
  if (tookBonus && baseQuizLength > 0) {
    progressIndex = qIndex - baseQuizLength;
    totalLength = queue.length - baseQuizLength;
  }

  const pct = Math.min(96, Math.round((progressIndex / totalLength) * 100));
  els.clearanceFill.style.width = pct + '%';
  els.fileCurrent.textContent = String(progressIndex + 1).padStart(2, '0');
  els.fileTotal.textContent = String(totalLength).padStart(2, '0');

  els.progressLabel.textContent = q.isExtra ? 'Bonus: what to expect' : 'Your progress';
  els.fileMetaLabel.textContent = q.isExtra
    ? "no wrong answer here, just a heads up"
    : 'if i thought this... would it be true?';

  els.scenarioText.innerHTML = linkifyGlossary(q.text);

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
  if (btn.disabled) return;
  
  if (checkpointReached && !tookBonus) {
    handleCheckpointClick(val, btn);
    return;
  }

  // brief visual confirmation, then advance automatically
  els.likertRow.querySelectorAll('.likert-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  els.likertRow.querySelectorAll('.likert-option').forEach(b => b.disabled = true);

  setTimeout(() => {
    const q = queue[qIndex];
    if (q.isExtra) {
      extraAnswers[q.extraId] = val;
    } else {
      applyScore(q, val);
      checkForStressTriggers();
      checkForContradictions();
    }
    qIndex++;
    if (qIndex >= queue.length) {
      if (needsMoreEvidence()) {
        injectFollowupQuestions();
        renderQuestion();
        return;
      }
      if (!checkpointReached) {
        checkpointReached = true;
        baseQuizLength = qIndex;
        renderCheckpoint();
        return;
      }
      showResults();
    } else {
      renderQuestion();
    }
  }, 260);
}

// Appends the non-scoring "extra questions" batch once the real quiz
// (including any adaptive follow-ups) is done.
function renderCheckpoint() {
  els.progressLabel.textContent = "Hold up";
  els.fileMetaLabel.textContent = "decision time";
  els.clearanceFill.style.width = '0%';
  els.fileCurrent.textContent = "--";
  els.fileTotal.textContent = "--";

  const texts = [
    "would you like to take some real realistic questions about mun and debate or something like that",
    "are you sure you really dont want to take this?",
    "are you really sure?",
    "are you realllly sure??",
    "are you realllllly sure???",
    "okay seriously, are you absolutely sure????"
  ];
  els.scenarioText.textContent = texts[checkpointState];

  els.likertRow.querySelectorAll('.likert-option').forEach(b => {
    b.disabled = false;
    b.classList.remove('selected');
  });

  const yesBtnRestore = els.likertRow.querySelector('[data-val="2"]');
  yesBtnRestore.style.visibility = 'visible';
  document.querySelectorAll('.troll-clone').forEach(el => el.remove());

  if (!buttonsExploded) {
    buttonsExploded = true;
    explosionAudio.play().catch(()=>{});
    
    const projectiles = [
      els.likertRow.querySelector('[data-val="-1"]'),
      els.likertRow.querySelector('[data-val="0"]'),
      els.likertRow.querySelector('[data-val="1"]')
    ];
    
    triggerPhysicsRagdoll(projectiles);
  }

  const yesBtn = els.likertRow.querySelector('[data-val="2"]');
  yesBtn.className = 'likert-option';
  if (checkpointState === 2) {
    yesBtn.classList.add('escape-tier-1');
  } else if (checkpointState === 3) {
    yesBtn.classList.add('escape-tier-2');
  } else if (checkpointState >= 4) {
    triggerTrollSequence(yesBtn);
  }
}

function handleCheckpointClick(val, btn) {
  if (val === 2) { 
    if (checkpointState === 0) {
      fadeAudio.play().catch(()=>{});
      btn.classList.add('fade-bounce');
      setTimeout(() => {
        btn.classList.remove('fade-bounce');
        startBonus();
      }, 800);
    } else {
      checkpointState++;
      if (checkpointState > 5) {
        showResults();
      } else {
        renderCheckpoint();
      }
    }
  } else if (val === -2) { 
    if (checkpointState === 0) {
      checkpointState = 1;
      renderCheckpoint();
    } else if (checkpointState === 1) {
      showResults();
    } else {
      checkpointState = 0;
      renderCheckpoint();
    }
  }
}

function triggerPhysicsRagdoll(elements) {
  const bodies = elements.map(el => {
    const rect = el.getBoundingClientRect();
    el.style.visibility = 'hidden';
    
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    let layer = document.getElementById('physics-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'physics-layer';
      layer.style.position = 'absolute';
      layer.style.top = '0';
      layer.style.left = '0';
      layer.style.width = '100%';
      // Extend the floor well past the bottom of .app (by a viewport's worth)
      // so the resting balls sit below the fold, out of sight until the
      // user scrolls down, and out of sight again once they scroll back up.
      layer.style.height = (document.querySelector('.app').offsetHeight + window.innerHeight) + 'px';
      layer.style.overflow = 'hidden';
      layer.style.pointerEvents = 'none';
      layer.style.zIndex = '9998';
      document.body.appendChild(layer);
    }

    const clone = el.cloneNode(true);
    clone.classList.add('physics-clone');
    clone.style.visibility = 'visible';
    clone.style.position = 'absolute';
    clone.style.left = '0px'; 
    clone.style.top = '0px';
    clone.style.margin = '0px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.pointerEvents = 'auto';
    clone.style.zIndex = '9999';
    clone.style.cursor = 'grab';
    clone.style.touchAction = 'none';
    clone.style.transformOrigin = '50% 21px';
    
    layer.appendChild(clone);
    
    const initialX = rect.left + scrollX;
    const initialY = rect.top + scrollY;
    
    const bodyObj = {
      el: clone,
      x: initialX,
      y: initialY,
      w: rect.width,
      h: rect.height,
      vx: (Math.random() - 0.5) * 40,
      vy: -15 - Math.random() * 20,
      rotation: 0,
      vr: (Math.random() - 0.5) * 20,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
      lastX: initialX,
      lastY: initialY
    };

    clone.addEventListener('pointerdown', (e) => {
      bodyObj.isDragging = true;
      bodyObj.dragOffsetX = e.pageX - bodyObj.x;
      bodyObj.dragOffsetY = e.pageY - bodyObj.y;
      bodyObj.vx = 0;
      bodyObj.vy = 0;
      bodyObj.vr = 0;
      clone.style.cursor = 'grabbing';
      clone.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    clone.addEventListener('pointermove', (e) => {
      if (bodyObj.isDragging) {
        bodyObj.lastX = bodyObj.x;
        bodyObj.lastY = bodyObj.y;
        
        let newX = e.pageX - bodyObj.dragOffsetX;
        let newY = e.pageY - bodyObj.dragOffsetY;

        const activeCard = !els.results.hidden ? els.resultsCard : document.querySelector('.quiz-card');
        if (activeCard) {
          const cardRect = activeCard.getBoundingClientRect();
          const cardLeft = cardRect.left + window.scrollX;
          const cardRight = cardRect.right + window.scrollX;
          const cardTop = cardRect.top + window.scrollY;
          const cardBottom = cardRect.bottom + window.scrollY;
          
          const ballRadius = 16;
          const cx = newX + (bodyObj.w / 2);
          const ballBottom = newY + 42;
          const ballTop = newY + 21 - ballRadius;
          const ballLeft = cx - ballRadius;
          const ballRight = cx + ballRadius;
          
          if (ballLeft < cardRight && ballRight > cardLeft &&
              ballTop < cardBottom && ballBottom > cardTop) {
            
            const overlapL = ballRight - cardLeft;
            const overlapR = cardRight - ballLeft;
            const overlapT = ballBottom - cardTop;
            const overlapB = cardBottom - ballTop;

            const min = Math.min(overlapL, overlapR, overlapT, overlapB);

            if (min === overlapT) newY = cardTop - 42;
            else if (min === overlapB) newY = cardBottom - (21 - ballRadius);
            else if (min === overlapL) newX = cardLeft - ballRadius - (bodyObj.w / 2);
            else if (min === overlapR) newX = cardRight + ballRadius - (bodyObj.w / 2);
          }
        }

        bodyObj.x = newX;
        bodyObj.y = newY;
      }
    });

    clone.addEventListener('pointerup', (e) => {
      if (bodyObj.isDragging) {
        bodyObj.isDragging = false;
        clone.style.cursor = 'grab';
        bodyObj.vx = bodyObj.x - bodyObj.lastX;
        bodyObj.vy = bodyObj.y - bodyObj.lastY;
        bodyObj.vr = bodyObj.vx * 0.8;
        clone.releasePointerCapture(e.pointerId);
      }
    });

    return bodyObj;
  });

  function step() {
    const gravity = 1.2;
    const friction = 0.85;
    const bounce = -0.7;
    const layer = document.getElementById('physics-layer');
    const floor = layer ? layer.offsetHeight : document.querySelector('.app').offsetHeight;
    const rightWall = document.body.clientWidth;
    
    const activeCard = !els.results.hidden ? els.resultsCard : document.querySelector('.quiz-card');

    bodies.forEach(body => {
      if (!body.isDragging) {
        body.vy += gravity;
        body.x += body.vx;
        body.y += body.vy;
        body.rotation += body.vr;
        body.vr *= 0.98;

        const ballRadius = 16;
        const cx = body.x + (body.w / 2);
        const ballBottom = body.y + 42; 

        if (ballBottom >= floor) {
          body.y = floor - 42;
          body.vy *= bounce;
          body.vx *= friction;
          body.vr *= friction;
        } else if (body.y <= 0) {
          body.y = 0;
          body.vy *= bounce;
        }
        
        if (cx - ballRadius <= 0) {
          body.x = ballRadius - (body.w / 2);
          body.vx *= bounce;
          body.vr *= friction;
        } else if (cx + ballRadius >= rightWall) {
          body.x = rightWall - ballRadius - (body.w / 2);
          body.vx *= bounce;
          body.vr *= friction;
        }

        if (activeCard) {
          const cardRect = activeCard.getBoundingClientRect();
          const cardLeft = cardRect.left + window.scrollX;
          const cardRight = cardRect.right + window.scrollX;
          const cardTop = cardRect.top + window.scrollY;
          const cardBottom = cardRect.bottom + window.scrollY;

          const ballTop = body.y + 21 - ballRadius;
          const ballLeft = cx - ballRadius;
          const ballRight = cx + ballRadius;

          if (ballLeft < cardRight && ballRight > cardLeft &&
              ballTop < cardBottom && ballBottom > cardTop) {
            
            const overlapL = ballRight - cardLeft;
            const overlapR = cardRight - ballLeft;
            const overlapT = ballBottom - cardTop;
            const overlapB = cardBottom - ballTop;

            const min = Math.min(overlapL, overlapR, overlapT, overlapB);

            if (min === overlapT) {
              body.y = cardTop - 42;
              body.vy *= bounce;
              body.vx *= friction;
            } else if (min === overlapB) {
              body.y = cardBottom - (21 - ballRadius);
              body.vy *= bounce;
            } else if (min === overlapL) {
              body.x = cardLeft - ballRadius - (body.w / 2);
              body.vx *= bounce;
            } else if (min === overlapR) {
              body.x = cardRight + ballRadius - (body.w / 2);
              body.vx *= bounce;
            }
          }
        }
      }

      body.el.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) rotate(${body.rotation}deg)`;
    });

    if (document.querySelectorAll('.physics-clone').length > 0) {
      requestAnimationFrame(step);
    }
  }
  
  requestAnimationFrame(step);
}

function triggerTrollSequence(btn) {
  const rect = btn.getBoundingClientRect();
  
  const clone = btn.cloneNode(true);
  btn.style.visibility = 'hidden';
  
  const quizCard = document.querySelector('.quiz-card');
  quizCard.style.position = '';
  quizCard.style.zIndex = '';

  clone.style.position = 'fixed';
  clone.style.zIndex = '9999';
  clone.style.left = '0px';
  clone.style.top = '0px';
  clone.style.width = rect.width + 'px';
  clone.style.height = rect.height + 'px';
  clone.style.pointerEvents = 'none';
  clone.style.margin = '0px';
  clone.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
  clone.dataset.troll = 'true';

  document.body.appendChild(clone);

  let phase = 'intro';
  let startTime = null;
  let animFrame;
  let splatted = false;
  let laughPlayed = false;
  let runPlayed = false;

  // We will track absolute positions now to avoid teleportation math
  let rx = rect.left;
  let ry = rect.top; 
  let vx = 0;
  let vy = 0;

  clone.addEventListener('click', () => {
    if (phase === 'run' || phase === 'tripped') {
      if (!splatted) {
        // 1st click: Catch it while running
        splatted = true;
        splatAudio.play().catch(()=>{});
        clone.style.transform = `translate3d(${rx}px, ${ry + 20}px, 0) scale(1.15) rotate(15deg)`;
        clone.classList.remove('troll-clone'); 
      } else {
        // 2nd click (or 1st click if it already tripped on its own)
        cancelAnimationFrame(animFrame);
        clone.remove();
        showResults();
      }
    }
  });

  function loop(time) {
    if (!document.body.contains(clone)) return;
    if (!startTime) startTime = time;
    const elapsed = time - startTime;

    if (splatted) return; 

    const cardRect = quizCard.getBoundingClientRect();
    
    // Target hiding spot (center top, behind the card)
    const hideX = cardRect.left + (cardRect.width / 2) - (rect.width / 2);
    const hideY = cardRect.top + 40; 

    // Evaluate X-Ray collision
    const isOutside = (
      rx > cardRect.right || 
      rx + rect.width < cardRect.left || 
      ry > cardRect.bottom || 
      ry + rect.height < cardRect.top
    );

    if (isOutside) {
      clone.classList.remove('troll-clone'); 
    } else {
      clone.classList.add('troll-clone'); 
    }

    if (phase === 'intro') {
      if (elapsed < 500) {
        // 1. Slide into hiding spot behind the box
        const progress = elapsed / 500;
        const ease = 1 - Math.pow(1 - progress, 3); // Smooth deceleration
        rx = rect.left + (hideX - rect.left) * ease;
        ry = rect.top + (hideY - rect.top) * ease;
        
      } else if (elapsed < 1800) {
        // 2. Pace back and forth
        rx = hideX + Math.sin(elapsed * 0.01) * 45;
        ry = hideY;
        
      } else if (elapsed < 2400) {
        // 3. Pause & Laugh
        if (!laughPlayed) { 
          laughPlayed = true; 
          laughAudio.play().catch(()=>{}); 
        }
        rx = hideX;
        ry = hideY + (Math.random() * 4 - 2); // Tiny vibration while laughing
        
      } else if (elapsed < 4200) {
        // 4. Jerky, unnatural teasing
        const teaseCycle = (elapsed - 2400) % 800; // 800ms loop
        let peekOffset = 0;
        const peekDist = (cardRect.width / 2) + 20; // Jump just past the edge

        if (teaseCycle < 150) peekOffset = -peekDist;      // Dart Left
        else if (teaseCycle < 400) peekOffset = 0;         // Hide
        else if (teaseCycle < 550) peekOffset = peekDist;  // Dart Right
        else peekOffset = 0;                               // Hide

        // A sharp lerp creates a fast, unnatural snap rather than smooth easing
        rx += (hideX + peekOffset - rx) * 0.45;
        ry = hideY;
        
      } else if (elapsed < 5200) {
        // 5. Pace again before running
        rx = hideX + Math.sin(elapsed * 0.015) * 60;
        ry = hideY;
        
      } else {
        // 6. Breakout & Run
        phase = 'run';
        clone.style.pointerEvents = 'auto'; 
        if (!runPlayed) {
          runPlayed = true;
          runAudio.play().catch(()=>{});
        }
        // Launch it diagonally downwards out of the box
        vx = (Math.random() > 0.5 ? 16 : -16); 
        vy = 12; 
      }
      
    } else if (phase === 'run') {
      
      // Auto-trip timer (extended slightly to account for the longer intro)
      if (elapsed > 14000 && isOutside) { 
        phase = 'tripped';
        splatted = true; 
        splatAudio.play().catch(()=>{});
        clone.style.transform = `translate3d(${rx}px, ${ry + 30}px, 0) rotate(-90deg)`;
        clone.classList.remove('troll-clone'); 
        return; 
      }

      rx += vx;
      ry += vy;

      // Screen bouncing physics
      if (rx <= 0) {
        vx *= -1;
        rx = 0;
      } else if (rx + rect.width >= window.innerWidth) {
        vx *= -1;
        rx = window.innerWidth - rect.width;
      }

      if (ry <= 0) {
        vy *= -1;
        ry = 0;
      } else if (ry + rect.height >= window.innerHeight) {
        vy *= -1;
        ry = window.innerHeight - rect.height;
      }
    }

    clone.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    animFrame = requestAnimationFrame(loop);
  }
  
  animFrame = requestAnimationFrame(loop);
}

function startBonus() {
  document.querySelectorAll('.physics-clone').forEach(el => el.remove());
  document.querySelectorAll('.troll-clone').forEach(el => el.remove());
  tookBonus = true;
  els.quiz.classList.add('bonus-mode');
  els.likertRow.querySelectorAll('.likert-option').forEach(b => b.className = 'likert-option');
  injectExtraQuestions();
  renderQuestion();
}

function injectExtraQuestions() {
  EXTRA_QUESTIONS.forEach(eq => {
    queue.push({
      isExtra: true,
      extraId: eq.id,
      text: eq.text,
    });
  });
  maxSeenLength = Math.max(maxSeenLength, queue.length);
}

function applyScore(q, val) {
  if (val === 0) return;

  if (!q.isStress) {
    // reverse-keyed items flip which trait "agree" supports, so straight-lining
    // (all agree / all disagree) no longer guarantees the same profile.
    const agreeTrait = q.reverse ? q.trait2 : q.trait1;
    const disagreeTrait = q.reverse ? q.trait1 : q.trait2;
    if (val > 0) {
      scores[agreeTrait] += val;
      confidence[q.axis]++;
    } else {
      scores[disagreeTrait] += Math.abs(val);
      confidence[q.axis]++;
    }
    return;
  }

  // Stress-test scoring: identify which trait is currently leading on this axis.
  const leading = scores[q.trait1] >= scores[q.trait2] ? q.trait1 : q.trait2;
  const supportsLeading = (leading === q.trait1 && val > 0) || (leading === q.trait2 && val < 0);

  if (supportsLeading) {
    // answered with type, reinforce normally
    scores[leading] += Math.abs(val);
    confidence[q.axis]++;
  } else {
    // answered against type on a targeted question, severe correction.
    // A stronger disagreement ("hell naw") signals a bigger contradiction
    // than a mild one ("nah"), so scale the penalty with how strongly the
    // person pushed back.
    scores[leading] -= Math.max(3, Math.abs(val) + 2);
    confidence[q.axis]--;
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

// Placeholder hook for detecting contradictory answers within the same axis
// (e.g. strongly agreeing with both an "improvise" item and a "always plan"
// item). Left as a stub for now — future work is to inject a tie-breaker
// question for the axis when this happens, similar to the stress-question
// mechanism above.
function checkForContradictions() {
  // Example:
  // Strongly agreed with improvisation
  // AND strongly agreed with always planning
  //
  // inject a tie-breaker question.
}

// ---------- ADAPTIVE LENGTH ----------
// Once the base queue is exhausted, decide whether any axis is still too
// contradictory/low-confidence to call. If so, give it one more question
// before showing results, instead of always stopping at a fixed count.
const MIN_CONFIDENCE = 2;
const MAX_FOLLOWUPS_PER_AXIS = 1;
let followupsUsed = { delivery: 0, engagement: 0, adaptation: 0, motivator: 0 };

function needsMoreEvidence() {
  return AXES.some(ax =>
    confidence[ax.id] < MIN_CONFIDENCE &&
    followupsUsed[ax.id] < MAX_FOLLOWUPS_PER_AXIS
  );
}

function injectFollowupQuestions() {
  AXES.forEach(ax => {
    if (confidence[ax.id] < MIN_CONFIDENCE && followupsUsed[ax.id] < MAX_FOLLOWUPS_PER_AXIS) {
      followupsUsed[ax.id]++;
      const pool = QUESTION_POOL[ax.id];
      // Prefer whichever keying (normal/reverse) hasn't already appeared in
      // the queue for this axis, so the followup isn't a repeat.
      const usedTexts = new Set(queue.map(q => q.text));
      const candidates = shuffle([
        ...pool.normal.map(text => ({ text, reverse: false })),
        ...pool.reverse.map(text => ({ text, reverse: true })),
      ]).filter(c => !usedTexts.has(c.text));

      const pick = candidates[0] || shuffle([
        ...pool.normal.map(text => ({ text, reverse: false })),
        ...pool.reverse.map(text => ({ text, reverse: true })),
      ])[0];

      queue.push({
        axis: ax.id,
        trait1: ax.trait1,
        trait2: ax.trait2,
        text: pick.text,
        reverse: pick.reverse,
        isStress: false,
      });
      maxSeenLength = Math.max(maxSeenLength, queue.length);
    }
  });
}

// ---------- RESULTS ----------
function compileCode() {
  return AXES.map(ax => (scores[ax.trait1] >= scores[ax.trait2] ? ax.trait1 : ax.trait2)).join('');
}

function showResults() {
  explosionAudio.play().catch(()=>{});

  // Strip any lingering selected/disabled visual state before anything gets
  // cloned for the ragdoll, otherwise a clone can freeze mid-"pressed" look.
  els.likertRow.querySelectorAll('.likert-option').forEach(b => {
    b.classList.remove('selected');
    b.disabled = false;
  });

  if (tookBonus) {
    const items = Array.from(els.likertRow.querySelectorAll('.likert-option'));
    triggerPhysicsRagdoll(items);
  } else {
    const leftovers = [];
    const hellNawBtn = els.likertRow.querySelector('[data-val="-2"]');
    if (hellNawBtn) leftovers.push(hellNawBtn);

    const activeTroll = document.querySelector('[data-troll="true"]');
    if (activeTroll) {
      activeTroll.classList.remove('selected');
      leftovers.push(activeTroll);
    } else {
      const hellYeaBtn = els.likertRow.querySelector('[data-val="2"]');
      if (hellYeaBtn) leftovers.push(hellYeaBtn);
    }
    triggerPhysicsRagdoll(leftovers);
  }

  const code = compileCode();
  const profile = PROFILES[code] || { title: 'The Wildcard', track: 'both' };
  const trackMeta = TRACK_META[profile.track];

  els.resultsCard.classList.remove('track-debate', 'track-mun', 'track-both');
  els.resultsCard.classList.add(trackMeta.card);

  els.resultsEyebrow.textContent = `${recruitName}'s result`;
  els.resultsCode.textContent = code;
  els.resultsArchetype.textContent = profile.title;
  els.resultsTrack.textContent = trackMeta.label;
  els.resultsTrack.className = 'results-track ' + trackMeta.badge;

  els.resultsBreakdownText.textContent = buildBreakdownText(recruitName, code, profile, trackMeta);

  els.traitMeters.innerHTML = '';
  AXES.forEach(ax => {
    const t1 = scores[ax.trait1], t2 = scores[ax.trait2];
    const total = t1 + t2;
    const dominantPct = total === 0 ? 50 : Math.round((Math.max(t1, t2) / total) * 100);
    const leading1 = t1 >= t2;
    
    const fillWidth = dominantPct - 50; 

    const row = document.createElement('div');
    row.className = 'trait-meter-row';
    row.innerHTML = `
      <span class="side ${leading1 ? 'active' : ''}">${ax.label1}</span>
      <span class="trait-meter-track" style="position: relative;">
        <span style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--paper); z-index: 2;"></span>
        <span class="trait-meter-fill" style="width: 0%; ${leading1 ? 'right: 50%;' : 'left: 50%;'}"></span>
      </span>
      <span class="side right ${!leading1 ? 'active' : ''}">${ax.label2}</span>
    `;
    els.traitMeters.appendChild(row);
    const fill = row.querySelector('.trait-meter-fill');
    requestAnimationFrame(() => {
      fill.style.width = fillWidth + '%';
    });
  });

  els.realityList.innerHTML = '';
  const li = document.createElement('li');
  li.style.listStyle = 'none';

  if (tookBonus) {
    if (trackMeta.card === 'track-debate') {
      li.textContent = "Debate relies on analytical research and structured clash. You build a case from assigned files and defend your stance against direct attacks. Your profile indicates you have the confidence and strategic mindset to handle this pressure.";
    } else if (trackMeta.card === 'track-mun') {
      li.textContent = "Model UN focuses on formal diplomacy and structured resolution writing. You represent a given position, negotiate with delegates, and draft policy documents. Your profile indicates you have the adaptability and tact required for these committees.";
    } else {
      li.textContent = "Your approach balances direct clash with adaptable diplomacy. You possess the skills to excel in both environments. Debate tests your analytical defense, while MUN refines your strategic negotiation.";
    }
  } else {
    li.textContent = "its sad that you skipped the bonus questions:((((((( we worked hard... why? ? ? :<";
  }
  
  els.realityList.appendChild(li);

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
  const deliveryLead = scores.V >= scores.A ? "command the room vocally" : "rely on precise logic";
  const engageLead = scores.C >= scores.D ? "confront disagreements head-on" : "navigate conflict tactfully";
  const adaptLead = scores.I >= scores.S ? "adapt on the fly" : "execute a carefully prepared strategy";
  const motiveLead = scores.P >= scores.E ? "prioritize the most effective path to victory" : "anchor your arguments in core principles";

  const discipline = trackMeta.label.replace("You'd thrive in: ", '');
  return `Profile: ${code}. ${profile.title}. You ${deliveryLead} and ${engageLead}. When the pressure hits, you ${adaptLead}. Above all, you ${motiveLead}. These traits make you a natural fit for ${discipline}.`;
}

// ---------- SHARE & RETAKE ----------
document.getElementById('share-btn').addEventListener('click', async () => {
  const code = els.resultsCode.textContent;
  const archetype = els.resultsArchetype.textContent;
  const shareData = {
    title: "What's your 16Rhetoric Type?",
    text: `My 16Rhetoric profile is ${code}: ${archetype}! Find your communication type here:`,
    url: window.location.href
  };
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.log('Share canceled or failed.');
    }
  } else {
    navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    alert('Result copied to clipboard!');
  }
});

els.retakeBtn.addEventListener('click', () => {
  switchView(els.results, els.welcome);
  els.nameInput.value = '';
  els.beginBtn.disabled = true;
  els.nameInput.focus();
});

// ---------- INIT ----------
els.beginBtn.disabled = true;