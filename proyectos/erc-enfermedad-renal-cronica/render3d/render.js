// Renderiza capas de escenas 3D con Chromium sin interfaz.
// Uso: node render.js [escenas...]   (por defecto 1-8)  → out/escena-N-<capa>.png + out/meta.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
const LAYERS = { 1: ['main', 'xray'], 2: ['main'], 3: ['top', 'bottom'], 4: ['main'], 5: ['main'], 6: ['main'], 7: ['main'], 8: ['main', 'xray'] };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

(async () => {
  const ids = process.argv.slice(2).map(Number);
  const scenes = ids.length ? ids : [1, 2, 3, 4, 5, 6, 7, 8];
  fs.mkdirSync(OUT, { recursive: true });
  const metaPath = path.join(OUT, 'meta.json');
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const id of scenes) for (const layer of LAYERS[id]) {
    const [w, h] = layer === 'top' || layer === 'bottom' ? [1080, 960] : [1080, 1920];
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('console', m => m.type() === 'error' && console.error('  [page]', m.text()));
    await page.route('http://app/**', route => {
      const f = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
      route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
    });
    const t0 = Date.now();
    await page.goto(`http://app/www/index.html?scene=${id}&layer=${layer}&w=${w}&h=${h}`);
    await page.waitForFunction(() => window.__done, null, { timeout: 300000 });
    const err = await page.evaluate(() => window.__error);
    if (err) { console.error(`Escena ${id}/${layer}: ${err}`); process.exitCode = 1; await page.close(); continue; }
    const { png, m } = await page.evaluate(() => ({ png: window.__png, m: window.__meta }));
    fs.writeFileSync(path.join(OUT, `escena-${id}-${layer}.png`), Buffer.from(png.split(',')[1], 'base64'));
    meta[`${id}-${layer}`] = m;
    console.log(`Escena ${id}/${layer} OK (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    await page.close();
  }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  await browser.close();
})();
