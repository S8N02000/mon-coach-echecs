import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BIN_DIR = path.join(ROOT_DIR, 'resources', 'bin');
const WEIGHTS_DIR = path.join(BIN_DIR, 'weights');

fs.mkdirSync(BIN_DIR, { recursive: true });
fs.mkdirSync(WEIGHTS_DIR, { recursive: true });

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      console.log(`[OK] Already exists: ${path.basename(destPath)}`);
      return resolve(destPath);
    }
    console.log(`[Downloading] ${url} -> ${destPath}...`);
    const file = fs.createWriteStream(destPath);

    function get(currentUrl) {
      const client = currentUrl.startsWith('https') ? https : http;
      client.get(currentUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download ${currentUrl}: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(destPath));
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }
    get(url);
  });
}

const MAIA_WEIGHTS = [
  { name: 'maia-1100.pb.gz', url: 'https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1100.pb.gz' },
  { name: 'maia-1300.pb.gz', url: 'https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1300.pb.gz' },
  { name: 'maia-1500.pb.gz', url: 'https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1500.pb.gz' }
];

async function main() {
  console.log('=== Configuration des Moteurs d\'Échecs et Réseaux Maia ===');
  console.log(`Dossier cible : ${BIN_DIR}`);

  // 1. Download Maia weights
  for (const w of MAIA_WEIGHTS) {
    const dest = path.join(WEIGHTS_DIR, w.name);
    try {
      await downloadFile(w.url, dest);
    } catch (e) {
      console.warn(`Attention: Impossible de télécharger ${w.name}:`, e.message);
    }
  }

  // 2. Setup Stockfish for current OS if needed
  const isWindows = process.platform === 'win32';
  const sfTarget = isWindows ? path.join(BIN_DIR, 'stockfish.exe') : path.join(BIN_DIR, 'stockfish');
  
  if (!fs.existsSync(sfTarget)) {
    console.log(`Stockfish non détecté dans ${BIN_DIR}.`);
    // Attempt official download or note setup
  }

  console.log('=== Configuration des moteurs terminée ===');
}

main().catch(err => {
  console.error('Erreur setup engines:', err);
});
