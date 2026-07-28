const fs = require('fs');
const path = require('path');

// Configuration
const GALLERY_DIR = path.join(__dirname, 'gallery');
const OUTPUT_FILE = path.join(GALLERY_DIR, 'manifest.json');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Assigns UI theme coloring depending on folder names
function getFolderColor(folderName) {
  const lower = folderName.toLowerCase();
  if (lower.includes('robotik') || lower.includes('robo')) return 'robotik';
  if (lower.includes('sains') || lower.includes('sci')) return 'sains';
  if (lower.includes('acara') || lower.includes('klub') || lower.includes('club')) return 'klub';
  return 'neutral';
}

function buildTree(currentPath, nodeName = 'Galeri', isRoot = false) {
  const stats = fs.statSync(currentPath);

  if (stats.isDirectory()) {
    const children = fs.readdirSync(currentPath);
    const nodeChildren = [];

    for (const child of children) {
      // Skip hidden system files (e.g. .DS_Store)
      if (child.startsWith('.')) continue;

      const childFullPath = path.join(currentPath, child);
      const childNode = buildTree(childFullPath, child, false);

      if (childNode) {
        nodeChildren.push(childNode);
      }
    }

    return {
      name: nodeName,
      type: 'folder',
      color: isRoot ? 'neutral' : getFolderColor(nodeName),
      children: nodeChildren
    };
  } else {
    const ext = path.extname(currentPath).toLowerCase();
    
    // Error handling: Ignore non-image files entirely
    if (!VALID_EXTENSIONS.includes(ext)) {
      return null;
    }

    // Convert local system path into a clean web URL path
    const relativeWebPath = path.relative(__dirname, currentPath).replace(/\\/g, '/');

    return {
      name: nodeName,
      type: 'image',
      src: relativeWebPath,
      placeholderIndex: Math.floor(Math.random() * 8) // Fallback random index matching theme variables
    };
  }
}

function main() {
  console.log('Scanning gallery directory...');
  
  if (!fs.existsSync(GALLERY_DIR)) {
    console.error(`Error: The directory "${GALLERY_DIR}" does not exist.`);
    process.exit(1);
  }

  const manifest = buildTree(GALLERY_DIR, 'Galeri', true);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Success! Manifest generated at: ${OUTPUT_FILE}`);
}

main();