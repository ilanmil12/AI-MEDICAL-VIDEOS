// Renderiza la animación 3D cuadro por cuadro (15 fps, animación "en dos") según timeline.json.
// Uso: node animate.js [escenas...] [--fps=15] [--jobs=2]
//   → frames/escena-N-<capa>/00000.jpg … + frames/escena-N-<capa>/meta.json
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = __dirname;
const TL = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'produccion', 'timeline.json'), 'utf8'));
const LAYERS = { 1: ['main', 'xray'], 2: ['main'], 3: ['top', 'bottom'], 4: ['main'], 5: ['main'], 6: ['main'], 7: ['main'], 8: ['main', 'xray'] };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const args = process.argv.slice(2);
const opt = k => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
const FPS = +(opt('fps') || 15), JOBS = +(opt('jobs') || 2);
const ids = args.filter(a => !a.startsWith('--')).map(Number);

async function renderLayer(browser, id, layer) {
  const sc = TL.escenas.find(e => e.n === id);
  const n = Math.ceil(sc.dur * FPS) + 1;
  const dir = path.join(ROOT, 'frames', `escena-${id}-${layer}`);
  fs.mkdirSync(dir, { recursive: true });
  const [w, h] = layer === 'top' || layer === 'bottom' ? [1080, 960] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('console', m => m.type() === 'error' && console.error('  [page]', m.text()));
  await page.route('http://app/**', route => {
    const f = path.join(ROOT, decodeURIComponent(new URL(route.request().url()).pathname));
    if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, contentType: TYPES[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  await page.goto(`http://app/www/index.html?scene=${id}&layer=${layer}&w=${w}&h=${h}&anim=1`);
  await page.waitForFunction(() => window.__done, null, { timeout: 300000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error(`escena ${id}/${layer}: ${err}`);
  const meta = [], t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate(t => window.renderFrame(t), i / FPS);
    fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.jpg`), Buffer.from(r.img.split(',')[1], 'base64'));
    meta.push(r.meta);
  }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ fps: FPS, frames: n, meta }));
  console.log(`escena ${id}/${layer}: ${n} cuadros en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await page.close();
}

(async () => {
  const jobs = [];
  for (const id of (ids.length ? ids : [1, 2, 3, 4, 5, 6, 7, 8])) for (const layer of LAYERS[id]) jobs.push([id, layer]);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  let k = 0;
  await Promise.all(Array.from({ length: JOBS }, async () => {
    while (k < jobs.length) { const [id, layer] = jobs[k++]; await renderLayer(browser, id, layer); }
  }));
  await browser.close();
  console.log('LISTO');
})().catch(e => { console.error(e); process.exit(1); });
