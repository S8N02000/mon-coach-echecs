import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TARGET_DIR = path.join(ROOT_DIR, 'resources', 'bin', 'python_win');
const PYTHON_EXE = path.join(TARGET_DIR, 'python.exe');

const PYTHON_EMBED_URL = 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip';

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

async function main() {
  console.log('=== Configuration de l\'Environnement Python Autonome Windows ===');
  if (fs.existsSync(PYTHON_EXE)) {
    console.log('[OK] python.exe autonome est déjà prêt dans resources/bin/python_win');
    return;
  }

  const tmpZip = path.join(ROOT_DIR, 'resources', 'python_embed.zip');
  await downloadFile(PYTHON_EMBED_URL, tmpZip);

  console.log('[Extracting] Extraction du runtime Python embed...');
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  execSync(`unzip -q -o "${tmpZip}" -d "${TARGET_DIR}"`);
  fs.unlinkSync(tmpZip);

  // Configuration du fichier ._pth pour activer site-packages
  const pthFile = path.join(TARGET_DIR, 'python312._pth');
  fs.writeFileSync(pthFile, 'python312.zip\n.\nLib/site-packages\n\nimport site\n');

  console.log('[Packages] Téléchargement des dépendances Windows...');
  const sitePackages = path.join(TARGET_DIR, 'Lib', 'site-packages');
  fs.mkdirSync(sitePackages, { recursive: true });

  const tmpWhlDir = path.join(ROOT_DIR, 'resources', 'tmp_whls');
  fs.mkdirSync(tmpWhlDir, { recursive: true });

  try {
    execSync(`pip download --only-binary=:all: --platform win_amd64 --python-version 312 --dest "${tmpWhlDir}" chess numpy`, { stdio: 'inherit' });
    execSync(`pip download --index-url https://download.pytorch.org/whl/cpu --only-binary=:all: --platform win_amd64 --python-version 312 --dest "${tmpWhlDir}" torch`, { stdio: 'inherit' });

    console.log('[Extracting] Intégration des modules dans site-packages...');
    execSync(`for w in "${tmpWhlDir}"/*.whl; do unzip -q -o "$w" -d "${sitePackages}"; done`);

    // Copie de maia3
    const localMaia = path.join(ROOT_DIR, 'resources', 'maia3_env', 'lib', 'python3.12', 'site-packages', 'maia3');
    if (fs.existsSync(localMaia)) {
      execSync(`cp -r "${localMaia}" "${sitePackages}/"`);
    }

    // Nettoyage allègement
    execSync(`rm -rf "${sitePackages}"/setuptools "${sitePackages}"/torchgen "${sitePackages}"/*.dist-info "${sitePackages}"/_distutils_hack "${sitePackages}"/pkg_resources 2>/dev/null || true`);
  } finally {
    fs.rmSync(tmpWhlDir, { recursive: true, force: true });
  }

  console.log('=== Environnement autonome Windows configuré avec succès ! ===');
}

main().catch(console.error);
