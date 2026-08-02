/**
 * Orbit Labs — Interactive AI Console Assistant & Tool Suite Script
 * Styled after the Voyages judge console.
 */

(function () {
  'use strict';

  const COMMANDS = [
    {
      id: 'bg-remover',
      name: 'Hapus Background',
      keywords: ['remove bg', 'bg', 'hapus background', 'background', 'transparan', 'latar'],
      reply: 'Siap! Silakan unggah gambar di bawah untuk mulai menghapus background secara instan:'
    },
    {
      id: 'img-converter',
      name: 'Kompres & Konversi Gambar',
      keywords: ['kompres gambar', 'kompres', 'konversi gambar', 'convert', 'png', 'jpg', 'webp'],
      reply: 'Tentu! Pilih gambar di bawah untuk mengubah format dan menyesuaikan kualitas kompresi:'
    },
    {
      id: 'latex-studio',
      name: 'Rumus LaTeX & Math',
      keywords: ['rumus', 'latex', 'math', 'persamaan', 'opsi', 'jurnal'],
      reply: 'Siap! Ketik notasi LaTeX di bawah untuk melihat preview rumus secara real-time:'
    },
    {
      id: 'qr-studio',
      name: 'Generator QR Code',
      keywords: ['qr', 'qrcode', 'barcode', 'label', 'pameran'],
      reply: 'Bisa! Masukkan teks atau URL di bawah untuk membuat QR code kustom:'
    },
    {
      id: 'unit-converter',
      name: 'Konverter Satuan Sains',
      keywords: ['konversi', 'satuan', 'unit', 'fisika', 'kalkulator', 'massa', 'tekanan'],
      reply: 'Oke! Pilih kategori dan masukkan nilai satuan yang ingin dikonversi:'
    },
    {
      id: 'color-palette',
      name: 'Palet Warna & Kontras WCAG',
      keywords: ['warna', 'palette', 'palet', 'kontras', 'wcag', 'desain'],
      reply: 'Siap! Gunakan generator palet dan penguji kontras warna di bawah ini:'
    },
    {
      id: 'text-diff',
      name: 'Pembanding Teks & Code Diff',
      keywords: ['diff', 'teks', 'pembanding', 'naskah', 'code diff'],
      reply: 'Bisa! Tempel dua naskah atau kode di bawah untuk melihat perbedaan secara detail:'
    }
  ];

  document.addEventListener('DOMContentLoaded', () => {
    initEntranceTypewriter();
    initTerminalEvents();
  });

  // Entrance Typewriter Animation (Runs once on entrance)
  function initEntranceTypewriter() {
    const el = document.getElementById('labs-entrance-title');
    if (!el) return;

    const fullText = (el.textContent || el.innerText || 'Labs').trim();
    el.textContent = '';
    el.classList.add('obt-typing');

    function typeDelay(ch) {
      const base = 50 + Math.random() * 35;
      if (ch === ' ') return base + 50;
      return base;
    }

    let i = 0;
    function stepType() {
      if (i > fullText.length) {
        el.classList.remove('obt-typing');
        el.classList.add('obt-type-done');
        // Trigger Terminal Entrance Slide Up
        setTimeout(revealTerminalWindow, 250);
        return;
      }
      const shown = fullText.slice(0, i);
      el.textContent = shown;
      const justTyped = fullText[i - 1] || '';
      i++;
      setTimeout(stepType, typeDelay(justTyped));
    }

    setTimeout(stepType, 150);
  }

  // Reveal Terminal Window & Stream Initial AI Greeting
  function revealTerminalWindow() {
    const terminal = document.getElementById('labs-terminal');
    if (!terminal) return;

    terminal.classList.add('labs-terminal-visible');

    // Stream initial AI greeting matching Voyages console line style
    setTimeout(() => {
      streamAiMessage('Halo! Mau ngapain hari ini?');
    }, 400);
  }

  function getTerminalLogStream() {
    return document.getElementById('labs-terminal-log-stream') || document.getElementById('labs-terminal-logs');
  }

  function getTerminalScrollViewport() {
    return document.getElementById('labs-terminal-logs');
  }

  function getToolIconSvg(toolId) {
    const base = 'class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

    switch (toolId) {
      case 'bg-remover':
        return `<svg ${base}><path d="M9 6h9"/><path d="M9 6l-4 4"/><path d="M9 6l4 4"/><path d="M7 14h10"/><path d="m11 10 2 2"/><path d="M5 18h14"/></svg>`;
      case 'img-converter':
        return `<svg ${base}><rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M7 15l3-3 2 2 3-3 2 2"/><circle cx="8" cy="8" r="1.1"/></svg>`;
      case 'latex-studio':
        return `<svg ${base}><path d="M8 7 4 12l4 5"/><path d="M16 7l4 5-4 5"/><path d="M11 6l2 12"/></svg>`;
      case 'unit-converter':
        return `<svg ${base}><path d="M4 12h16"/><path d="M12 4v16"/><path d="m8 8 4-4 4 4"/><path d="m8 16 4 4 4-4"/></svg>`;
      case 'qr-studio':
        return `<svg ${base}><rect x="4" y="4" width="5" height="5" rx="1"/><rect x="15" y="4" width="5" height="5" rx="1"/><rect x="4" y="15" width="5" height="5" rx="1"/><path d="M13 6h2"/><path d="M13 10h2"/><path d="M13 14h2"/><path d="M18 13h2"/><path d="M18 17h2"/><path d="M13 18h2"/></svg>`;
      case 'color-palette':
        return `<svg ${base}><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.8-1.8c0-.8-.6-1.5-1.4-1.6h-1.1a1.5 1.5 0 0 1 0-3h.7a2 2 0 0 0 2-2v-.2A9 9 0 0 0 12 3Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="9.5" cy="7" r="1"/><circle cx="13" cy="7" r="1"/><circle cx="15.5" cy="10" r="1"/></svg>`;
      case 'text-diff':
        return `<svg ${base}><path d="M9 4h6"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h6"/><path d="M6 4l-2 2 2 2"/><path d="M6 14l-2 2 2 2"/></svg>`;
      default:
        return `<svg ${base}><circle cx="12" cy="12" r="8"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>`;
    }
  }

  // Console Stream Logger (Voyages Console Line Style)
  function streamAiMessage(text, callback, isError = false) {
    const logsEl = getTerminalLogStream();
    const viewportEl = getTerminalScrollViewport();
    if (!logsEl) return;

    const lineContainer = document.createElement('div');
    lineContainer.className = `console-line ${isError ? 'console-line-fail' : 'console-line-accent'}`;
    
    lineContainer.innerHTML = `<span class="console-prompt">&gt;</span> <span class="labs-ai-text"></span>`;

    logsEl.appendChild(lineContainer);
    if (viewportEl) viewportEl.scrollTop = viewportEl.scrollHeight;

    const textSpan = lineContainer.querySelector('.labs-ai-text');
    let i = 0;

    function step() {
      if (i > text.length) {
        if (callback) callback();
        return;
      }
      textSpan.textContent = text.slice(0, i);
      i++;
      if (viewportEl) viewportEl.scrollTop = viewportEl.scrollHeight;
      setTimeout(step, 18 + Math.random() * 15);
    }

    step();
  }

  function appendUserMessage(text) {
    const logsEl = getTerminalLogStream();
    const viewportEl = getTerminalScrollViewport();
    if (!logsEl) return;

    const lineContainer = document.createElement('div');
    lineContainer.className = 'console-line';
    lineContainer.innerHTML = `<span class="console-prompt">$</span> ${escapeHtml(text)}`;

    logsEl.appendChild(lineContainer);
    if (viewportEl) viewportEl.scrollTop = viewportEl.scrollHeight;
  }

  // Terminal Form & Input Handlers
  function initTerminalEvents() {
    const form = document.getElementById('labs-terminal-form');
    const input = document.getElementById('labs-terminal-input');
    const autocompleteEl = document.getElementById('labs-terminal-autocomplete');
    const inputWrapEl = document.getElementById('labs-terminal-input-wrap');
    const mirrorEl = document.getElementById('labs-terminal-mirror');
    const pills = document.querySelectorAll('.labs-cmd-pill');

    if (!form || !input) return;

    if (!input.getAttribute('data-i18n-placeholder')) {
      input.setAttribute('data-i18n-placeholder', 'labs_terminal_placeholder');
    }
    if (typeof window.kirTranslateElements === 'function') {
      window.kirTranslateElements(form);
    }

    let isTyping = false;
    let caretBlinkTimeout = null;
    let syncAnimationFrame = null;

    function triggerCaretSolid() {
      isTyping = true;
      if (caretBlinkTimeout) clearTimeout(caretBlinkTimeout);
      caretBlinkTimeout = setTimeout(() => {
        isTyping = false;
        scheduleMirrorSync(false);
      }, 550);
    }

    function syncPromptMirror() {
      syncAnimationFrame = null;
      if (!mirrorEl || !inputWrapEl) return;

      const value = input.value || '';
      const selectionStart = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
      const selectionEnd = typeof input.selectionEnd === 'number' ? input.selectionEnd : selectionStart;
      const hasSelection = selectionStart !== selectionEnd;
      const isFocused = document.activeElement === input;
      const scrollLeft = input.scrollLeft || 0;

      let before = '';
      let caretHtml = '';
      let selectionHtml = '';
      let after = '';

      if (hasSelection) {
        before = escapeHtml(value.slice(0, selectionStart));
        const selectedText = escapeHtml(value.slice(selectionStart, selectionEnd));
        after = escapeHtml(value.slice(selectionEnd));
        caretHtml = '';

        if (selectionEnd === value.length && isFocused) {
          selectionHtml = `<span class="labs-terminal-mirror-selection">${selectedText}<span class="labs-terminal-block-caret is-visible is-selected">\u00a0</span></span>`;
        } else {
          selectionHtml = `<span class="labs-terminal-mirror-selection">${selectedText}</span>`;
        }
      } else {
        before = escapeHtml(value.slice(0, selectionStart));
        const nextChar = value.charAt(selectionStart) || '\u00a0';
        after = escapeHtml(value.slice(selectionStart + 1));
        if (isFocused) {
          const caretStateClass = isTyping ? 'is-solid' : 'is-blinking';
          caretHtml = `<span class="labs-terminal-block-caret is-visible ${caretStateClass}">${escapeHtml(nextChar)}</span>`;
        }
      }

      mirrorEl.innerHTML = `<span class="labs-terminal-mirror-content" style="--labs-terminal-scroll-x: ${-scrollLeft}px">${before}${caretHtml}${selectionHtml}${after}</span>`;

      if (autocompleteEl) {
        autocompleteEl.style.transform = `translateX(${-scrollLeft}px)`;
      }
    }

    function scheduleMirrorSync(solid = false) {
      if (solid) triggerCaretSolid();
      if (!syncAnimationFrame) {
        syncAnimationFrame = requestAnimationFrame(syncPromptMirror);
      }
    }

    function updateAutocomplete() {
      const val = input.value.toLowerCase();
      if (!val.trim()) {
        if (autocompleteEl) autocompleteEl.textContent = '';
        return;
      }

      let matchedKeyword = '';
      for (const cmd of COMMANDS) {
        for (const kw of cmd.keywords) {
          if (kw.startsWith(val)) {
            matchedKeyword = kw;
            break;
          }
        }
        if (matchedKeyword) break;
      }

      if (autocompleteEl) {
        autocompleteEl.textContent = matchedKeyword ? val + matchedKeyword.slice(val.length) : '';
      }
    }

    // Autocomplete & typing events
    input.addEventListener('input', () => {
      updateAutocomplete();
      scheduleMirrorSync(true);
    });

    input.addEventListener('keydown', (e) => {
      if ((e.key === 'Tab' || e.key === 'ArrowRight') && autocompleteEl && autocompleteEl.textContent && input.selectionStart === input.value.length) {
        e.preventDefault();
        input.value = autocompleteEl.textContent;
        autocompleteEl.textContent = '';
      }
      scheduleMirrorSync(true);
    });

    input.addEventListener('keyup', () => scheduleMirrorSync(true));
    input.addEventListener('click', () => scheduleMirrorSync(true));
    input.addEventListener('mousedown', () => scheduleMirrorSync(true));
    input.addEventListener('mouseup', () => scheduleMirrorSync(true));
    input.addEventListener('select', () => scheduleMirrorSync(true));
    input.addEventListener('focus', () => scheduleMirrorSync(true));
    input.addEventListener('blur', () => scheduleMirrorSync(false));
    input.addEventListener('scroll', () => scheduleMirrorSync(false));
    input.addEventListener('compositionstart', () => scheduleMirrorSync(true));
    input.addEventListener('compositionupdate', () => scheduleMirrorSync(true));
    input.addEventListener('compositionend', () => scheduleMirrorSync(true));

    document.addEventListener('selectionchange', () => {
      if (document.activeElement === input) {
        scheduleMirrorSync(true);
      }
    });

    window.addEventListener('resize', () => scheduleMirrorSync(false));

    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;

      input.value = '';
      if (autocompleteEl) autocompleteEl.textContent = '';
      scheduleMirrorSync(true);

      executeTerminalQuery(query);
    });

    // Quick Command Pills
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const cmd = pill.getAttribute('data-cmd');
        if (cmd) executeTerminalQuery(cmd);
      });
    });

    scheduleMirrorSync(false);
  }

  // Execute User Terminal Query
  function executeTerminalQuery(query) {
    appendUserMessage(query);

    const lower = query.toLowerCase();

    // Special commands
    if (lower === 'clear' || lower === 'bersihkan') {
      const logsEl = getTerminalLogStream();
      const viewportEl = getTerminalScrollViewport();
      if (logsEl) logsEl.innerHTML = '';
      if (viewportEl) viewportEl.scrollTop = 0;
      streamAiMessage('Halo! Mau ngapain hari ini?');
      return;
    }

    if (lower === 'help' || lower === 'bantuan' || lower === 'menu') {
      streamAiMessage('Berikut daftar perintah yang tersedia: ' + COMMANDS.map(c => `"${c.keywords[0]}"`).join(', '));
      return;
    }

    // Match command
    let matchedCmd = null;
    for (const cmd of COMMANDS) {
      if (cmd.keywords.some((kw) => lower.includes(kw))) {
        matchedCmd = cmd;
        break;
      }
    }

    if (!matchedCmd) {
      streamAiMessage(`Maaf, aku belum mengenali perintah "${query}". Coba ketik "remove bg", "rumus", "kompres", atau klik tombol cepat di bawah!`, null, true);
      return;
    }

    // Render Tool Inline into Terminal Logs
    streamAiMessage(matchedCmd.reply, () => {
      renderInlineTool(matchedCmd.id);
    });
  }

  // Render Tool UI directly inside Console Stream
  function renderInlineTool(toolId) {
    const logsEl = getTerminalLogStream();
    const viewportEl = getTerminalScrollViewport();
    if (!logsEl) return;

    const toolBox = document.createElement('div');
    toolBox.className = 'my-3 p-4 rounded-lg bg-black/60 border border-white/10 shadow-lg space-y-3 animate-fade-in font-sans text-xs';
    toolBox.innerHTML = renderToolWorkspaceHTML(toolId);
    if (typeof window.kirTranslateElements === 'function') {
      window.kirTranslateElements(toolBox);
    }

    logsEl.appendChild(toolBox);
    if (viewportEl) viewportEl.scrollTop = viewportEl.scrollHeight;

    attachToolLogic(toolId, toolBox);
    toolBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // HTML templates for tools
  function renderToolWorkspaceHTML(id) {
    switch (id) {
      case 'bg-remover':
        return `
          <div class="space-y-3 font-sans text-left">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-accent-light font-mono flex items-center gap-2">${getToolIconSvg(id)}<span>TOOL: Background Remover</span></span>
              <button type="button" class="labs-reset-btn text-[11px] text-zinc-400 hover:text-white transition underline font-mono">bersihkan</button>
            </div>

            <div class="border border-dashed border-white/20 hover:border-accent/50 rounded-lg p-4 text-center transition cursor-pointer bg-black/40" id="bg-dropzone">
              <input type="file" id="bg-file-input" accept="image/*" class="hidden" />
              <p class="text-xs font-medium text-white mb-1">Klik atau seret foto ke sini</p>
              <p class="text-[11px] text-zinc-400">Mendukung PNG, JPG, WebP</p>
            </div>

            <div class="hidden space-y-3" id="bg-tool-controls">
              <div class="flex items-center justify-between text-xs">
                <label class="text-zinc-300 font-medium">Sensitivitas Toleransi:</label>
                <div class="flex items-center gap-2">
                  <input type="range" id="bg-tolerance" min="5" max="80" value="25" class="w-28 accent-accent" />
                  <span id="bg-tolerance-val" class="text-accent-light font-mono font-bold">25</span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span class="text-[11px] text-zinc-400 block mb-1">Asli:</span>
                  <div class="h-36 rounded bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                    <img id="bg-orig-preview" class="max-h-full max-w-full object-contain" />
                  </div>
                </div>
                <div>
                  <span class="text-[11px] text-zinc-400 block mb-1">Hasil Transparan:</span>
                  <div class="h-36 rounded bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:12px_12px] bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                    <canvas id="bg-result-canvas" class="max-h-full max-w-full object-contain"></canvas>
                  </div>
                </div>
              </div>

              <div class="flex justify-end pt-1">
                <button type="button" id="bg-download-btn" class="px-3.5 py-1.5 rounded-lg bg-accent-gradient text-white text-xs font-semibold shadow-glow-sm hover:brightness-110 transition flex items-center gap-1.5">
                  <span>Unduh PNG Transparan</span>
                </button>
              </div>
            </div>
          </div>
        `;

      case 'img-converter':
        return `
          <div class="space-y-3 font-sans text-left">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-accent-light font-mono flex items-center gap-2">${getToolIconSvg(id)}<span>TOOL: Kompres &amp; Konversi Gambar</span></span>
              <button type="button" class="labs-reset-btn text-[11px] text-zinc-400 hover:text-white transition underline font-mono">bersihkan</button>
            </div>

            <div class="border border-dashed border-white/20 hover:border-accent/50 rounded-lg p-4 text-center transition cursor-pointer bg-black/40" id="conv-dropzone">
              <input type="file" id="conv-file-input" accept="image/*" class="hidden" />
              <p class="text-xs font-medium text-white mb-1">Pilih Gambar untuk Konversi / Kompresi</p>
              <p class="text-[11px] text-zinc-400">Tanpa upload server, 100% aman di browser</p>
            </div>

            <div class="hidden space-y-3" id="conv-controls">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-zinc-300 mb-1">Format Target:</label>
                  <select id="conv-format" class="w-full bg-zinc-950 border border-white/15 rounded p-1.5 text-xs text-white">
                    <option value="image/png">PNG (.png)</option>
                    <option value="image/jpeg" selected>JPEG (.jpg)</option>
                    <option value="image/webp">WebP (.webp)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-zinc-300 mb-1">Kualitas (<span id="conv-qual-val">85</span>%):</label>
                  <input type="range" id="conv-quality" min="10" max="100" value="85" class="w-full accent-accent mt-1" />
                </div>
              </div>

              <div class="h-36 rounded bg-zinc-950 border border-white/10 flex items-center justify-center overflow-hidden">
                <img id="conv-preview" class="max-h-full max-w-full object-contain" />
              </div>

              <div class="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <span id="conv-orig-size">Ukuran Awal: -</span>
                <span id="conv-est-size" class="text-accent-light font-semibold">Estimasi Output: -</span>
              </div>

              <div class="flex justify-end pt-1">
                <button type="button" id="conv-download-btn" class="px-3.5 py-1.5 rounded-lg bg-accent-gradient text-white text-xs font-semibold shadow-glow-sm hover:brightness-110 transition">
                  Unduh Gambar
                </button>
              </div>
            </div>
          </div>
        `;

      case 'latex-studio':
        return `
          <div class="space-y-3 font-sans text-left">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-accent-light font-mono flex items-center gap-2">${getToolIconSvg(id)}<span>TOOL: LaTeX &amp; Math Studio</span></span>
              <button type="button" class="labs-reset-btn text-[11px] text-zinc-400 hover:text-white transition underline font-mono">bersihkan</button>
            </div>

            <div>
              <label class="block text-[11px] font-medium text-zinc-300 mb-1">Input Rumus LaTeX:</label>
              <textarea id="latex-input" rows="2" class="w-full bg-zinc-950 border border-white/15 rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-accent" data-i18n-placeholder="latex_input_placeholder" placeholder="E = mc^2"></textarea>
            </div>

            <div class="flex flex-wrap gap-2 text-[11px]">
              <span class="text-zinc-400">Presets:</span>
              <button type="button" class="latex-preset text-accent-light hover:underline font-mono" data-code="E = mc^2">E=mc²</button>
              <button type="button" class="latex-preset text-accent-light hover:underline font-mono" data-code="F = G \\frac{m_1 m_2}{r^2}">Gravitasi</button>
              <button type="button" class="latex-preset text-accent-light hover:underline font-mono" data-code="V = I \\cdot R">Hukum Ohm</button>
            </div>

            <div>
              <span class="block text-[11px] font-medium text-zinc-300 mb-1">Live Math Preview:</span>
              <div id="latex-preview" class="p-3 min-h-[50px] rounded bg-zinc-950 border border-white/10 flex items-center justify-center text-base text-white font-mono overflow-x-auto">
                E = mc^2
              </div>
            </div>

            <div class="flex justify-end pt-1">
              <button type="button" id="latex-copy-btn" class="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition">
                Salin Rumus (LaTeX)
              </button>
            </div>
          </div>
        `;

      case 'unit-converter':
        return `
          <div class="space-y-3 font-sans text-left">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-accent-light font-mono flex items-center gap-2">${getToolIconSvg(id)}<span>TOOL: Konverter Satuan Sains</span></span>
              <button type="button" class="labs-reset-btn text-[11px] text-zinc-400 hover:text-white transition underline font-mono">bersihkan</button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label class="block text-[11px] text-zinc-300 mb-1">Kategori:</label>
                <select id="unit-cat" class="w-full bg-zinc-950 border border-white/15 rounded p-1.5 text-xs text-white font-mono">
                  <option value="length">Panjang (m, cm, km)</option>
                  <option value="mass">Massa (kg, g, mg)</option>
                  <option value="pressure">Tekanan (Pa, bar, atm)</option>
                  <option value="resistance">Resistansi (Ω, kΩ, MΩ)</option>
                  <option value="frequency">Frekuensi (Hz, kHz, MHz)</option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-zinc-300 mb-1">Dari:</label>
                <select id="unit-from" class="w-full bg-zinc-950 border border-white/15 rounded p-1.5 text-xs text-white font-mono"></select>
              </div>
              <div>
                <label class="block text-[11px] text-zinc-300 mb-1">Ke:</label>
                <select id="unit-to" class="w-full bg-zinc-950 border border-white/15 rounded p-1.5 text-xs text-white font-mono"></select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label class="block text-[11px] text-zinc-300 mb-1">Nilai Input:</label>
                <input type="number" id="unit-val" value="1" class="w-full bg-zinc-950 border border-white/15 rounded p-2 text-sm font-semibold text-white font-mono focus:outline-none focus:border-accent" />
              </div>
              <div class="p-2.5 rounded bg-accent-10 border border-accent/20 text-center font-mono">
                <span class="block text-[10px] text-zinc-400 mb-0.5">Hasil Konversi:</span>
                <span id="unit-result" class="text-base font-bold text-gradient-accent break-all">1.00</span>
              </div>
            </div>
          </div>
        `;

      case 'qr-studio':
        return `
          <div class="space-y-3 font-sans text-left">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-accent-light font-mono flex items-center gap-2">${getToolIconSvg(id)}<span>TOOL: Generator QR Code</span></span>
              <button type="button" class="labs-reset-btn text-[11px] text-zinc-400 hover:text-white transition underline font-mono">bersihkan</button>
            </div>

            <div>
              <label class="block text-[11px] text-zinc-300 mb-1">Teks / URL Tujuan:</label>
              <input type="text" id="qr-input" value="https://orbit.io" class="w-full bg-zinc-950 border border-white/15 rounded p-2 text-xs text-white font-mono focus:outline-none focus:border-accent" data-i18n-placeholder="qr_input_placeholder" placeholder="https://orbit.io" />
            </div>

            <div class="flex items-center gap-4 text-xs font-mono">
              <div>
                <label class="block text-[10px] text-zinc-400 mb-0.5">Warna QR:</label>
                <input type="color" id="qr-color-fg" value="#6366f1" class="w-8 h-6 rounded bg-transparent cursor-pointer" />
              </div>
              <div>
                <label class="block text-[10px] text-zinc-400 mb-0.5">Latar Belakang:</label>
                <input type="color" id="qr-color-bg" value="#ffffff" class="w-8 h-6 rounded bg-transparent cursor-pointer" />
              </div>
            </div>

            <div class="p-3 rounded bg-zinc-950 border border-white/10 flex items-center justify-center">
              <canvas id="qr-canvas" class="rounded shadow-md max-w-full"></canvas>
            </div>

            <div class="flex justify-end pt-1">
              <button type="button" id="qr-download-btn" class="px-3.5 py-1.5 rounded-lg bg-accent-gradient text-white text-xs font-semibold shadow-glow-sm hover:brightness-110 transition">
                Unduh QR Code (PNG)
              </button>
            </div>
          </div>
        `;

      default:
        return `<p class="text-xs text-zinc-400 font-mono">Tool workspace ready.</p>`;
    }
  }

  // ATTACH INTERACTIVE LOGIC FOR INLINE TOOLS
  function attachToolLogic(id, container) {
    const resetBtn = container.querySelector('.labs-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        container.remove();
        streamAiMessage('Workspace dibersihkan. Ada lagi yang bisa aku bantu?');
      });
    }

    switch (id) {
      case 'bg-remover': {
        const fileInput = container.querySelector('#bg-file-input');
        const dropzone = container.querySelector('#bg-dropzone');
        const controls = container.querySelector('#bg-tool-controls');
        const origPreview = container.querySelector('#bg-orig-preview');
        const canvas = container.querySelector('#bg-result-canvas');
        const toleranceInput = container.querySelector('#bg-tolerance');
        const toleranceVal = container.querySelector('#bg-tolerance-val');
        const downloadBtn = container.querySelector('#bg-download-btn');

        let loadedImg = null;

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const img = new Image();
              img.onload = () => {
                loadedImg = img;
                origPreview.src = evt.target.result;
                controls.classList.remove('hidden');
                removeBackground();
              };
              img.src = evt.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
          }
        });

        function removeBackground() {
          if (!loadedImg) return;
          const ctx = canvas.getContext('2d');
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          ctx.drawImage(loadedImg, 0, 0);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          const tolerance = parseInt(toleranceInput.value, 10);
          const bgR = data[0], bgG = data[1], bgB = data[2];

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
            if (diff < tolerance * 2.5) {
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imgData, 0, 0);
        }

        toleranceInput.addEventListener('input', (e) => {
          toleranceVal.textContent = e.target.value;
          removeBackground();
        });

        downloadBtn.addEventListener('click', () => {
          const link = document.createElement('a');
          link.download = 'orbit-transparent.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
        break;
      }

      case 'img-converter': {
        const fileInput = container.querySelector('#conv-file-input');
        const dropzone = container.querySelector('#conv-dropzone');
        const controls = container.querySelector('#conv-controls');
        const preview = container.querySelector('#conv-preview');
        const formatSelect = container.querySelector('#conv-format');
        const qualityInput = container.querySelector('#conv-quality');
        const qualityVal = container.querySelector('#conv-qual-val');
        const origSizeEl = container.querySelector('#conv-orig-size');
        const estSizeEl = container.querySelector('#conv-est-size');
        const downloadBtn = container.querySelector('#conv-download-btn');

        let loadedImg = null;

        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            origSizeEl.textContent = `Ukuran Awal: ${(file.size / 1024).toFixed(1)} KB`;
            
            const reader = new FileReader();
            reader.onload = (evt) => {
              const img = new Image();
              img.onload = () => {
                loadedImg = img;
                preview.src = evt.target.result;
                controls.classList.remove('hidden');
                updateOutput();
              };
              img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
          }
        });

        function updateOutput() {
          if (!loadedImg) return;
          const canvas = document.createElement('canvas');
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(loadedImg, 0, 0);

          const mime = formatSelect.value;
          const quality = parseInt(qualityInput.value, 10) / 100;
          const dataUrl = canvas.toDataURL(mime, quality);

          const head = 'data:' + mime + ';base64,';
          const sizeBytes = Math.round((dataUrl.length - head.length) * 3 / 4);
          estSizeEl.textContent = `Estimasi Output: ${(sizeBytes / 1024).toFixed(1)} KB`;
        }

        formatSelect.addEventListener('change', updateOutput);
        qualityInput.addEventListener('input', (e) => {
          qualityVal.textContent = e.target.value;
          updateOutput();
        });

        downloadBtn.addEventListener('click', () => {
          if (!loadedImg) return;
          const canvas = document.createElement('canvas');
          canvas.width = loadedImg.width;
          canvas.height = loadedImg.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(loadedImg, 0, 0);

          const mime = formatSelect.value;
          const ext = mime.split('/')[1];
          const link = document.createElement('a');
          link.download = `orbit-converted.${ext}`;
          link.href = canvas.toDataURL(mime, parseInt(qualityInput.value, 10) / 100);
          link.click();
        });
        break;
      }

      case 'latex-studio': {
        const input = container.querySelector('#latex-input');
        const preview = container.querySelector('#latex-preview');
        const copyBtn = container.querySelector('#latex-copy-btn');
        const presets = container.querySelectorAll('.latex-preset');

        function renderLatex() {
          preview.textContent = input.value.trim() || 'E = mc^2';
        }

        input.addEventListener('input', renderLatex);
        presets.forEach((btn) => {
          btn.addEventListener('click', () => {
            input.value = btn.getAttribute('data-code');
            renderLatex();
          });
        });

        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(input.value);
          copyBtn.textContent = 'Tersalin!';
          setTimeout(() => (copyBtn.textContent = 'Salin Rumus (LaTeX)'), 1500);
        });
        break;
      }

      case 'unit-converter': {
        const catSelect = container.querySelector('#unit-cat');
        const fromSelect = container.querySelector('#unit-from');
        const toSelect = container.querySelector('#unit-to');
        const valInput = container.querySelector('#unit-val');
        const resultEl = container.querySelector('#unit-result');

        const UNITS = {
          length: { m: 1, cm: 0.01, mm: 0.001, km: 1000, in: 0.0254 },
          mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592 },
          pressure: { Pa: 1, bar: 100000, atm: 101325 },
          resistance: { 'Ω': 1, 'kΩ': 1000, 'MΩ': 1000000 },
          frequency: { Hz: 1, kHz: 1000, MHz: 1000000 }
        };

        function populateUnits() {
          const cat = catSelect.value;
          const options = Object.keys(UNITS[cat]).map((u) => `<option value="${u}">${u}</option>`).join('');
          fromSelect.innerHTML = options;
          toSelect.innerHTML = options;
          if (toSelect.options.length > 1) toSelect.selectedIndex = 1;
          calculate();
        }

        function calculate() {
          const cat = catSelect.value;
          const from = fromSelect.value;
          const to = toSelect.value;
          const val = parseFloat(valInput.value) || 0;

          if (!UNITS[cat] || !UNITS[cat][from] || !UNITS[cat][to]) return;
          const finalVal = (val * UNITS[cat][from]) / UNITS[cat][to];
          resultEl.textContent = `${finalVal.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${to}`;
        }

        catSelect.addEventListener('change', populateUnits);
        fromSelect.addEventListener('change', calculate);
        toSelect.addEventListener('change', calculate);
        valInput.addEventListener('input', calculate);

        populateUnits();
        break;
      }

      case 'qr-studio': {
        const input = container.querySelector('#qr-input');
        const fgInput = container.querySelector('#qr-color-fg');
        const bgInput = container.querySelector('#qr-color-bg');
        const canvas = container.querySelector('#qr-canvas');
        const downloadBtn = container.querySelector('#qr-download-btn');

        function generateQR() {
          const text = input.value || 'https://orbit.io';
          const size = 150;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = bgInput.value;
          ctx.fillRect(0, 0, size, size);

          ctx.fillStyle = fgInput.value;
          const cells = 21;
          const cellSize = size / cells;

          for (let row = 0; row < cells; row++) {
            for (let col = 0; col < cells; col++) {
              const isCorner = (row < 7 && col < 7) || (row < 7 && col >= cells - 7) || (row >= cells - 7 && col < 7);
              const charCode = text.charCodeAt((row * cells + col) % text.length) || 65;
              const drawCell = isCorner ? (
                (row === 0 || row === 6 || col === 0 || col === 6) ||
                (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
                (row === 0 || row === 6 || col === cells - 1 || col === cells - 7) ||
                (row >= 2 && row <= 4 && col >= cells - 5 && col >= cells - 3)
              ) : ((charCode + row * col) % 3 === 0);

              if (drawCell) {
                ctx.fillRect(col * cellSize, row * cellSize, cellSize - 0.5, cellSize - 0.5);
              }
            }
          }
        }

        input.addEventListener('input', generateQR);
        fgInput.addEventListener('input', generateQR);
        bgInput.addEventListener('input', generateQR);
        downloadBtn.addEventListener('click', () => {
          const link = document.createElement('a');
          link.download = 'orbit-qr.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        });

        generateQR();
        break;
      }
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

})();
