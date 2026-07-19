/* ==========================================================
   Gallery — a tiny "file explorer" for photo folders.
   No real photos yet, so images render as colored placeholder
   tiles (swap PLACEHOLDER: true items for a real `src` later —
   the renderer already prefers `src` over the placeholder look
   if one is present).
   ========================================================== */

const GALLERY_COLORS = {
  robotik: 'rgba(224,70,95,0.85)',
  sains: 'rgba(56,130,246,0.85)',
  ekstrakurikuler: 'rgba(139,92,246,0.85)',
  neutral: 'rgba(148,163,184,0.85)',
};

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg, #f97316, #ea580c)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #22c55e, #15803d)',
  'linear-gradient(135deg, #eab308, #ca8a04)',
  'linear-gradient(135deg, #64748b, #334155)',
  'linear-gradient(135deg, #f43f5e, #be123c)',
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeImages(count, prefix) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push({ type: 'image', name: `${prefix}-${String(i).padStart(2, '0')}.jpg`, placeholderIndex: (i + prefix.length) % PLACEHOLDER_GRADIENTS.length });
  }
  return out;
}

let GALLERY_TREE = { name: 'Galeri', type: 'folder', color: 'neutral', children: [] };

let currentPath = []; // array of folder names, root = []
let currentImages = []; // flat list of images in the current folder, for lightbox prev/next
let currentImageIndex = 0;

async function fetchGalleryManifest() {
  try {
    const response = await fetch('/gallery/manifest.json');
    const data = await response.json();
    
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    function filterNode(node) {
      if (node.type === 'folder' && node.children) {
        node.children = node.children.filter(child => {
          if (child.type === 'folder') {
            filterNode(child);
            return true;
          }
          const ext = child.name.slice((Math.max(0, child.name.lastIndexOf('.')) || Infinity)).toLowerCase();
          return validExtensions.includes(ext);
        });
      }
    }
    
    filterNode(data);
    GALLERY_TREE = data;
  } catch (error) {
    console.error('Failed to load gallery data:', error);
  }
}

function resolveNode(path) {
  let node = GALLERY_TREE;
  for (const seg of path) {
    const next = (node.children || []).find(c => c.name === seg && c.type === 'folder');
    if (!next) return GALLERY_TREE; // fall back to root if path is bad
    node = next;
  }
  return node;
}

function folderSvg(color) {
  const fill = GALLERY_COLORS[color] || GALLERY_COLORS.neutral;
  return `<svg class="folder-icon" viewBox="0 0 52 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8a4 4 0 014-4h10.2a4 4 0 012.9 1.25L22 8.5H46a4 4 0 014 4V34a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" fill="${fill}"/>
  </svg>`;
}

function upFolderSvg() {
  return `<svg class="folder-icon folder-icon-up" viewBox="0 0 52 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8a4 4 0 014-4h10.2a4 4 0 012.9 1.25L22 8.5H46a4 4 0 014 4V34a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" fill="rgba(148,163,184,0.35)"/>
    <path d="M26 15l-6 6h4v6h4v-6h4z" fill="rgba(255,255,255,0.85)"/>
  </svg>`;
}

function imageIconSvg() {
  return `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15.5l-5-5L5 21" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderBreadcrumbs() {
  const bar = document.getElementById('finder-pathbar');
  const parts = [{ label: GALLERY_TREE.name, path: [] }].concat(
    currentPath.map((seg, i) => ({ label: seg, path: currentPath.slice(0, i + 1) }))
  );
  bar.innerHTML = parts.map((p, i) => {
    const isLast = i === parts.length - 1;
    return `${i > 0 ? '<span class="finder-sep">/</span>' : ''}<span class="finder-crumb ${isLast ? 'current' : ''}" ${isLast ? '' : `onclick='galleryGoTo(${JSON.stringify(p.path)})'`}>${escapeHtml(p.label)}</span>`;
  }).join('');
}

function galleryGoTo(path) {
  currentPath = path;
  renderGallery();
}

function galleryGoUp() {
  currentPath = currentPath.slice(0, -1);
  renderGallery();
}

function galleryOpenFolder(name) {
  currentPath = currentPath.concat([name]);
  renderGallery();
}

function renderGallery() {
  renderBreadcrumbs();
  const node = resolveNode(currentPath);
  const grid = document.getElementById('finder-grid');
  const children = node.children || [];

  currentImages = children.filter(c => c.type === 'image');

  let html = '';
  if (currentPath.length > 0) {
    const lang = localStorage.getItem('kir_lang') || 'id';
    html += `
      <div class="finder-tile" onclick="galleryGoUp()">
        ${upFolderSvg()}
        <span class="finder-tile-label">${I18N[lang].gallery_up}</span>
      </div>`;
  }

  if (children.length === 0) {
    const lang = localStorage.getItem('kir_lang') || 'id';
    html += `<p class="finder-empty">${I18N[lang].gallery_empty}</p>`;
  }

  children.forEach((child, idx) => {
    if (child.type === 'folder') {
      const count = (child.children || []).length;
      html += `
        <div class="finder-tile" onclick='galleryOpenFolder(${JSON.stringify(child.name)})'>
          ${folderSvg(child.color)}
          <span class="finder-tile-label">${escapeHtml(child.name)}</span>
          <span class="finder-tile-sub">${count}</span>
        </div>`;
    } else {
      const grad = PLACEHOLDER_GRADIENTS[child.placeholderIndex];
      html += `
        <div class="finder-tile" onclick="openLightbox(${idx})">
          <div class="photo-thumb" style="background-image: ${grad}">
            ${child.src ? `<img src="${child.src}" alt="${escapeHtml(child.name)}" class="w-full h-full object-cover" />` : imageIconSvg()}
          </div>
          <span class="finder-tile-label">${escapeHtml(child.name)}</span>
        </div>`;
    }
  });

  grid.innerHTML = html;
}

function openLightbox(indexAmongImages) {
  // indexAmongImages is the index within `children`, but we only
  // want images — recompute the position within currentImages.
  const node = resolveNode(currentPath);
  const children = node.children || [];
  const target = children[indexAmongImages];
  currentImageIndex = currentImages.indexOf(target);
  renderLightbox();
  document.getElementById('lightbox-overlay').classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightbox-overlay').classList.add('hidden');
}

function lightboxNav(delta) {
  currentImageIndex = (currentImageIndex + delta + currentImages.length) % currentImages.length;
  renderLightbox();
}

function renderLightbox() {
  const img = currentImages[currentImageIndex];
  if (!img) return;
  const grad = PLACEHOLDER_GRADIENTS[img.placeholderIndex];
  document.getElementById('lightbox-photo').style.backgroundImage = grad;
  document.getElementById('lightbox-photo').innerHTML = img.src
    ? `<img src="${img.src}" alt="${img.name}" class="w-full h-full object-cover rounded-[0.75rem]" />`
    : imageIconSvg();
  document.getElementById('lightbox-name').textContent = img.name;
  document.getElementById('lightbox-count').textContent = `${currentImageIndex + 1} / ${currentImages.length}`;
}

async function galleryInitFromQuery() {
  await fetchGalleryManifest();
  
  const params = new URLSearchParams(window.location.search);
  const path = params.get('path');
  if (path) {
    const segs = path.split('/').filter(Boolean);
    // validate the path actually resolves before trusting it
    let node = GALLERY_TREE;
    const valid = [];
    for (const seg of segs) {
      const next = (node.children || []).find(c => c.name === seg && c.type === 'folder');
      if (!next) break;
      node = next;
      valid.push(seg);
    }
    currentPath = valid;
  }
  renderGallery();
}
