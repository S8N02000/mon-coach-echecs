const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcImage = '/home/s8n/.gemini/antigravity/brain/552767e4-d4d4-4789-a4ad-8835ff0ff17a/.user_uploaded/media_1790521644583.jpg';
const rootDir = path.resolve(__dirname, '..');

// 1. Convert JPEG to raw RGBA
const tempRaw = '/tmp/chess_logo_full.rgba';
execSync(`ffmpeg -y -i "${srcImage}" -f rawvideo -pix_fmt rgba "${tempRaw}"`);
const rawBuf = fs.readFileSync(tempRaw);
const W = 1024, H = 558;

// 2. Extract Emblem Square (300x300 centered on cx=512, cy=220)
const cropW = 300, cropH = 300;
const startX = 362, startY = 70;

const emblemBuf = Buffer.alloc(cropW * cropH * 4);
for (let y = 0; y < cropH; y++) {
  for (let x = 0; x < cropW; x++) {
    const sIdx = ((startY + y) * W + (startX + x)) * 4;
    const dIdx = (y * cropW + x) * 4;
    emblemBuf[dIdx] = rawBuf[sIdx];
    emblemBuf[dIdx + 1] = rawBuf[sIdx + 1];
    emblemBuf[dIdx + 2] = rawBuf[sIdx + 2];
    emblemBuf[dIdx + 3] = 255;
  }
}

function isBg(buf, w, x, y) {
  const idx = (y * w + x) * 4;
  const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
  return r > 225 && g > 225 && b > 225;
}

// BFS flood fill from perimeter
function applyTransparency(buf, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;

  function push(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const idx = y * w + x;
    if (!visited[idx] && isBg(buf, w, x, y)) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  }

  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % w;
    const y = Math.floor(idx / w);
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  for (let i = 0; i < w * h; i++) {
    if (visited[i]) {
      buf[i * 4 + 3] = 0;
    }
  }

  // Edge smoothing
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!visited[idx]) {
        if (visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w]) {
          const r = buf[idx * 4], g = buf[idx * 4 + 1], b = buf[idx * 4 + 2];
          const brightness = (r + g + b) / 3;
          if (brightness > 210) {
            const a = Math.round(Math.max(0, Math.min(255, (250 - brightness) * (255 / 40))));
            buf[idx * 4 + 3] = a;
          }
        }
      }
    }
  }
}

applyTransparency(emblemBuf, cropW, cropH);

const tempEmblemRaw = '/tmp/emblem_clean.rgba';
fs.writeFileSync(tempEmblemRaw, emblemBuf);

const basePng = path.join(rootDir, 'build', 'icon.png');
// Scale to 512x512 with lanczos
execSync(`ffmpeg -y -f rawvideo -pix_fmt rgba -s ${cropW}x${cropH} -i "${tempEmblemRaw}" -vf "scale=512:512:flags=lanczos" "${basePng}"`);

// Copy to resources and renderer assets
fs.copyFileSync(basePng, path.join(rootDir, 'resources', 'icon.png'));
execSync(`ffmpeg -y -i "${basePng}" -vf "scale=256:256:flags=lanczos" "${path.join(rootDir, 'src', 'renderer', 'assets', 'logo.png')}"`);

// Generate Windows .ico (multi-resolution 256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
const icoPath = path.join(rootDir, 'build', 'icon.ico');
execSync(`ffmpeg -y -i "${basePng}" -vf "scale=256:256" "${icoPath}"`);
fs.copyFileSync(icoPath, path.join(rootDir, 'resources', 'icon.ico'));

// Generate Linux icons in build/icons/
const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
for (const s of sizes) {
  const dest = path.join(rootDir, 'build', 'icons', `${s}x${s}.png`);
  execSync(`ffmpeg -y -i "${basePng}" -vf "scale=${s}:${s}:flags=lanczos" "${dest}"`);
}

// 3. Extract Full Logo with Text (w=400, h=410)
const fullStartX = 312, fullStartY = 75;
const fullW = 400, fullH = 410;
const fullBuf = Buffer.alloc(fullW * fullH * 4);
for (let y = 0; y < fullH; y++) {
  for (let x = 0; x < fullW; x++) {
    const sIdx = ((fullStartY + y) * W + (fullStartX + x)) * 4;
    const dIdx = (y * fullW + x) * 4;
    fullBuf[dIdx] = rawBuf[sIdx];
    fullBuf[dIdx + 1] = rawBuf[sIdx + 1];
    fullBuf[dIdx + 2] = rawBuf[sIdx + 2];
    fullBuf[dIdx + 3] = 255;
  }
}
applyTransparency(fullBuf, fullW, fullH);
const tempFullRaw = '/tmp/full_logo.rgba';
fs.writeFileSync(tempFullRaw, fullBuf);
execSync(`ffmpeg -y -f rawvideo -pix_fmt rgba -s ${fullW}x${fullH} -i "${tempFullRaw}" "${path.join(rootDir, 'resources', 'logo-full.png')}"`);

console.log('Successfully generated all application icons:');
console.log(' - build/icon.png (512x512)');
console.log(' - build/icon.ico (256x256)');
console.log(' - build/icons/*.png (16 to 512)');
console.log(' - resources/icon.png & resources/icon.ico');
console.log(' - resources/logo-full.png');
console.log(' - src/renderer/assets/logo.png');
