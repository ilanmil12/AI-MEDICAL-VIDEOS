// Genera el storyboard preliminar (bocetos vectoriales 9:16) y lo renderiza a PNG.
// Uso: node generar_storyboard.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = __dirname;
const W = 540, H = 960;

// ---------- Componentes ----------
const beto = (x, y, s = 1, mood = 'happy', thumb = true) => `
<g transform="translate(${x},${y}) scale(${s})">
  <rect x="-70" y="60" width="140" height="190" rx="40" fill="#3b6fb6"/>
  <path d="M-70 110 h140 M-70 160 h140 M-70 210 h140 M-35 60 v190 M0 60 v190 M35 60 v190" stroke="#2a5594" stroke-width="5"/>
  <circle cx="0" cy="0" r="62" fill="#c98a5e"/>
  <path d="M-64 -18 q64 -70 128 0 v-14 q-64 -50 -128 0z" fill="#d23b33"/>
  <rect x="-10" y="-34" width="90" height="16" rx="8" fill="#d23b33"/>
  <circle cx="-22" cy="-2" r="7" fill="#2b1d14"/><circle cx="22" cy="-2" r="7" fill="#2b1d14"/>
  <path d="M-30 22 q30 18 60 0" stroke="#3a2618" stroke-width="12" fill="none" stroke-linecap="round"/>
  ${mood === 'happy' ? '<path d="M-20 38 q20 16 40 0" stroke="#7a2b1f" stroke-width="5" fill="none"/>'
    : '<ellipse cx="0" cy="42" rx="10" ry="12" fill="#7a2b1f"/>'}
  ${thumb ? `<g transform="translate(95,90)"><rect x="-18" y="0" width="36" height="40" rx="10" fill="#c98a5e"/><rect x="-8" y="-30" width="16" height="36" rx="8" fill="#c98a5e"/></g>
  <path d="M70 120 l20 -20" stroke="#3b6fb6" stroke-width="30" stroke-linecap="round"/>` : ''}
</g>`;

const kidney = (x, y, s = 1, face = 'sweat', helmet = true) => `
<g transform="translate(${x},${y}) scale(${s})">
  <path d="M0 -60 c55 -10 80 40 70 85 c-8 40 -50 55 -75 35 c-15 -12 -5 -30 -20 -40 c-20 -14 -45 -10 -45 -40 c0 -25 25 -38 70 -40z" fill="#a8324a"/>
  <rect x="-40" y="25" width="80" height="45" rx="10" fill="#f2b632"/>
  <rect x="-25" y="15" width="10" height="25" fill="#f2b632"/><rect x="15" y="15" width="10" height="25" fill="#f2b632"/>
  ${helmet ? '<path d="M-38 -48 q38 -45 76 0z" fill="#f2b632"/><rect x="-44" y="-50" width="88" height="8" rx="4" fill="#d99a1a"/>' : ''}
  <circle cx="-12" cy="-15" r="9" fill="#fff"/><circle cx="16" cy="-15" r="9" fill="#fff"/>
  <circle cx="-11" cy="-14" r="4" fill="#222"/><circle cx="17" cy="-14" r="4" fill="#222"/>
  ${face === 'sweat' ? '<path d="M-10 8 q12 -8 24 0" stroke="#3a0f18" stroke-width="4" fill="none"/><path d="M38 -30 q6 12 0 18 q-6 -6 0 -18z" fill="#7fd0ff"/><path d="M-36 -20 q5 10 0 15 q-5 -5 0 -15z" fill="#7fd0ff"/>'
    : face === 'happy' ? '<path d="M-12 4 q14 14 28 0" stroke="#3a0f18" stroke-width="4" fill="none"/>'
    : '<path d="M-10 6 h24" stroke="#3a0f18" stroke-width="4"/><path d="M-22 -30 l14 6 M30 -30 l-14 6" stroke="#3a0f18" stroke-width="4"/>'}
</g>`;

const bulb = (x, y, color) => `<g transform="translate(${x},${y})"><circle r="16" fill="${color}"/><circle r="28" fill="${color}" opacity=".25"/><rect x="-7" y="14" width="14" height="10" fill="#777"/></g>`;

const filterUnit = (x, y, on = true, shield = false) => `
<g transform="translate(${x},${y})">
  <rect x="-26" y="-34" width="52" height="68" rx="10" fill="${on ? '#1d3b52' : '#2a2a2a'}" stroke="${on ? '#5fd3ff' : '#555'}" stroke-width="3"/>
  <circle cx="0" cy="-10" r="13" fill="none" stroke="${on ? '#ff7b8a' : '#666'}" stroke-width="4"/>
  <path d="M0 3 q-12 12 0 22 q12 10 0 18" stroke="${on ? '#9ef0ff' : '#666'}" stroke-width="4" fill="none"/>
  ${on ? '<circle cx="0" cy="-10" r="22" fill="#5fd3ff" opacity=".15"/>' : ''}
  ${shield ? '<path d="M0 -44 l30 10 v22 q0 26 -30 40 q-30 -14 -30 -40 v-22z" fill="#6be38a" opacity=".45" stroke="#6be38a" stroke-width="3"/>' : ''}
</g>`;

const sugar = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><rect x="-40" y="-40" width="80" height="80" rx="10" fill="#f7f7f2" stroke="#ccc" stroke-width="3"/><circle cx="-14" cy="-8" r="6" fill="#222"/><circle cx="14" cy="-8" r="6" fill="#222"/><path d="M-22 -24 l14 8 M22 -24 l-14 8" stroke="#222" stroke-width="4"/><path d="M-14 16 q14 -10 28 0" stroke="#222" stroke-width="4" fill="none"/><circle cx="-30" cy="30" r="3" fill="#bbb"/><circle cx="28" cy="-30" r="3" fill="#bbb"/></g>`;

const bpCuff = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><rect x="-55" y="-35" width="110" height="70" rx="30" fill="#30495f"/><circle cx="0" cy="0" r="26" fill="#eee" stroke="#222" stroke-width="3"/><path d="M0 0 l14 -14" stroke="#d23b33" stroke-width="4"/><circle cx="-34" cy="-6" r="5" fill="#fff"/><circle cx="34" cy="-6" r="5" fill="#fff"/><path d="M55 10 q30 0 30 30" stroke="#222" stroke-width="5" fill="none"/><ellipse cx="88" cy="52" rx="14" ry="20" fill="#222"/><path d="M-70 -40 q-10 -15 5 -25 M-80 -20 q-15 -5 -10 -20" stroke="#9ad" stroke-width="4" fill="none"/></g>`;

const doctor = (x, y, s = 1) => `
<g transform="translate(${x},${y}) scale(${s})">
  <rect x="-65" y="60" width="130" height="200" rx="36" fill="#fafafa" stroke="#ddd" stroke-width="3"/>
  <path d="M0 60 v80" stroke="#ddd" stroke-width="4"/><rect x="-25" y="60" width="50" height="40" fill="#5a8fd8"/>
  <path d="M-30 70 q-10 70 30 80 q40 -10 30 -80" stroke="#333" stroke-width="5" fill="none"/><circle cx="0" cy="152" r="9" fill="#888"/>
  <circle cx="0" cy="0" r="56" fill="#b97b52"/>
  <path d="M-60 0 q-6 -70 60 -66 q66 -4 60 66 q-12 -40 -60 -44 q-48 4 -60 44z" fill="#1d120c"/>
  <path d="M50 10 q20 50 -4 80" stroke="#1d120c" stroke-width="18" fill="none"/>
  <circle cx="-18" cy="2" r="6" fill="#222"/><circle cx="18" cy="2" r="6" fill="#222"/>
  <path d="M-16 26 q16 12 32 0" stroke="#6d2a20" stroke-width="5" fill="none"/>
</g>`;

const bloodDetective = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 -50 q40 50 30 75 a30 30 0 0 1 -60 0 q-10 -25 30 -75z" fill="#c8102e"/><circle cx="-9" cy="10" r="6" fill="#fff"/><circle cx="11" cy="10" r="6" fill="#fff"/><circle cx="-8" cy="11" r="3"/><circle cx="12" cy="11" r="3"/><path d="M-26 -8 h52" stroke="#5a3a1a" stroke-width="8"/><path d="M-16 -8 q16 -24 32 0z" fill="#7a5530"/><circle cx="46" cy="22" r="16" fill="none" stroke="#333" stroke-width="5"/><path d="M58 34 l14 14" stroke="#333" stroke-width="6"/></g>`;

const urineDetective = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><rect x="-28" y="-40" width="56" height="90" rx="10" fill="#f6e27a" stroke="#c9b24a" stroke-width="3"/><rect x="-32" y="-56" width="64" height="20" rx="5" fill="#ddd"/><path d="M-36 10 h72 l-8 46 h-56z" fill="#8a6a3f"/><circle cx="-9" cy="-14" r="6" fill="#fff"/><circle cx="11" cy="-14" r="6" fill="#fff"/><circle cx="-8" cy="-13" r="3"/><circle cx="12" cy="-13" r="3"/><path d="M-8 2 q10 6 20 0" stroke="#333" stroke-width="3" fill="none"/></g>`;

const heart = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><path d="M0 30 c-60 -40 -50 -90 -15 -90 c10 0 15 8 15 14 c0 -6 5 -14 15 -14 c35 0 45 50 -15 90z" fill="#e63946"/><circle cx="-12" cy="-30" r="5"/><path d="M8 -34 q6 -4 12 0" stroke="#222" stroke-width="4" fill="none"/><path d="M-12 -12 q12 10 24 0" stroke="#222" stroke-width="4" fill="none"/></g>`;

const taxi = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})"><rect x="-120" y="-40" width="240" height="70" rx="20" fill="#e2384d"/><path d="M-70 -40 q20 -40 60 -40 h40 q40 0 50 40z" fill="#f4f4f4"/><rect x="-60" y="-70" width="45" height="28" rx="6" fill="#9fd8f5"/><rect x="0" y="-70" width="45" height="28" rx="6" fill="#9fd8f5"/><circle cx="-70" cy="32" r="24" fill="#222"/><circle cx="70" cy="32" r="24" fill="#222"/><rect x="-20" y="-96" width="40" height="16" rx="4" fill="#ffd23f"/></g>`;

const caption = (t, y = 860, size = 34) => {
  const lines = t.split('\n');
  return `<g font-family="Arial Black, Arial, sans-serif" font-weight="900" text-anchor="middle">
    ${lines.map((l, i) => `<text x="${W / 2}" y="${y + i * (size + 10)}" font-size="${size}" fill="#fff" stroke="#000" stroke-width="7" paint-order="stroke">${l}</text>`).join('')}
  </g>`;
};

const tag = (n, time) => `<g font-family="Arial, sans-serif"><rect x="16" y="16" width="190" height="42" rx="21" fill="#000" opacity=".55"/><text x="111" y="44" font-size="20" fill="#fff" text-anchor="middle" font-weight="700">ESC ${n} · ${time}</text></g>`;

let gid = 0;
const bg = (a, b) => { const id = `g${++gid}`; return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`; };

const filterGrid = (pattern, x0 = 90, y0 = 330, cols = 5, dx = 90, dy = 100, shield = false) =>
  pattern.split('').map((c, i) => filterUnit(x0 + (i % cols) * dx, y0 + Math.floor(i / cols) * dy, c === '1', shield && c === '1')).join('');

// ---------- Escenas ----------
const scenes = [
  { n: 1, t: '0:00–0:03', svg: `${bg('#ffd9a8', '#f5a25d')}
    <rect x="0" y="640" width="${W}" height="320" fill="#8c8c8c"/>${taxi(390, 610, .9)}
    ${beto(220, 360, 1.25)}
    <rect x="110" y="410" width="230" height="200" rx="24" fill="#0b2a3a" opacity=".85" stroke="#5fd3ff" stroke-width="4"/>
    ${kidney(170, 515, .7)}${kidney(285, 515, .7)}${bulb(228, 440, '#ff3b3b')}
    <path d="M100 470 h250" stroke="#5fd3ff" stroke-width="3" opacity=".8"/>
    ${caption('¿Te sientes bien? 👍\nTus riñones podrían no estarlo', 820, 30)}${tag(1, '3 s')}` },
  { n: 2, t: '0:03–0:11', svg: `${bg('#0e2233', '#1c4766')}
    ${filterGrid('11111111111111111111', 90, 300)}
    ${kidney(140, 210, .9, 'happy')}${kidney(400, 210, .9, 'happy')}
    <path d="M30 140 h480" stroke="#c8102e" stroke-width="16" opacity=".6"/><path d="M30 760 h480" stroke="#7fd0ff" stroke-width="16" opacity=".6"/>
    ${caption('≈ 1 millón de filtros\npor riñón (nefronas)', 830, 32)}${tag(2, '8 s')}` },
  { n: 3, t: '0:11–0:19', svg: `${bg('#7fc8f8', '#7fc8f8')}
    <rect x="0" y="0" width="${W}" height="400" fill="#bfe6ff"/>${taxi(270, 300, 1.1)}
    <circle cx="245" cy="215" r="34" fill="#c98a5e"/><path d="M215 200 q30 -40 60 0z" fill="#d23b33"/>
    <text x="330" y="160" font-size="40">🎵</text>
    <rect x="0" y="400" width="${W}" height="560" fill="#0e2233"/><path d="M0 400 h${W}" stroke="#fff" stroke-width="6"/>
    ${filterGrid('10101101000110010101', 90, 470, 5, 90, 85)}
    ${kidney(450, 830, .6)}
    ${caption('Sin dolor · Sin aviso', 920, 34)}${tag(3, '8 s')}` },
  { n: 4, t: '0:19–0:26', svg: `${bg('#2b1840', '#542a5c')}
    ${filterGrid('1011011101', 90, 600, 5, 90, 90)}
    ${sugar(150, 330, 1.3)}${bpCuff(370, 330, 1.1)}
    <circle cx="110" cy="560" r="6" fill="#fff"/><circle cx="200" cy="580" r="5" fill="#fff"/><circle cx="160" cy="610" r="4" fill="#fff"/>
    ${kidney(270, 170, .7, 'angry')}
    ${caption('Diabetes · Presión alta\nObesidad', 830, 32)}${tag(4, '7 s')}` },
  { n: 5, t: '0:26–0:35', svg: `${bg('#e8f4f2', '#cfe7e2')}
    <rect x="0" y="620" width="${W}" height="340" fill="#b9d6cf"/><rect x="40" y="90" width="150" height="110" rx="8" fill="#fff" stroke="#9bb" stroke-width="3"/>
    <path d="M70 130 h90 M70 155 h70" stroke="#5a8fd8" stroke-width="6"/>
    ${doctor(150, 380, .95)}${beto(410, 410, .85, 'surprised', false)}
    ${bloodDetective(190, 690, .9)}${urineDetective(340, 690, .9)}
    ${caption('🩸 Creatinina en sangre\n🧪 Albúmina en orina', 840, 30)}${tag(5, '9 s')}` },
  { n: 6, t: '0:35–0:42', svg: `${bg('#0e2233', '#14506e')}
    ${filterGrid('10110111011101101111', 90, 320, 5, 90, 100, true)}
    ${kidney(170, 190, .85, 'happy')}${kidney(370, 190, .85, 'happy')}
    <text x="270" y="200" font-size="46" text-anchor="middle">🙌</text>
    ${caption('Detectarla a tiempo\ncambia la historia', 830, 32)}${tag(6, '7 s')}` },
  { n: 7, t: '0:42–0:51', svg: `${bg('#fff1d6', '#ffd9a0')}
    <g font-family="Arial, sans-serif" font-weight="700" font-size="26">
      <rect x="30" y="90" width="480" height="110" rx="18" fill="#fff"/><text x="60" y="155">✔ Azúcar y presión controladas</text>
      <rect x="30" y="215" width="480" height="110" rx="18" fill="#fff"/><text x="60" y="280">✔ Menos sal 🧂</text>
      <rect x="30" y="340" width="480" height="110" rx="18" fill="#fff"/><text x="60" y="405" fill="#b00">✖ Antiinflamatorios sin receta</text>
    </g>
    ${kidney(160, 600, .75, 'happy', false)}${kidney(380, 600, .75, 'happy', false)}${heart(270, 560, 1.1)}
    ${caption('Tu corazón también\nlo agradecerá ❤️', 790, 32)}${tag(7, '9 s')}` },
  { n: 8, t: '0:51–0:58', svg: `${bg('#ff9a62', '#7a3b7e')}
    <path d="M0 560 l60 -80 l40 40 l50 -120 l60 80 l40 -60 l70 110 l50 -50 l60 70 l60 -40 l50 60 v${H}h-${W}z" fill="#3a1e45" opacity=".6"/>
    <rect x="0" y="640" width="${W}" height="320" fill="#5a5a5a"/>${taxi(390, 610, .9)}
    ${beto(220, 360, 1.25)}
    <rect x="110" y="410" width="230" height="200" rx="24" fill="#0b2a3a" opacity=".85" stroke="#6be38a" stroke-width="4"/>
    ${kidney(170, 515, .7, 'happy')}${kidney(285, 515, .7, 'happy')}${bulb(228, 440, '#3ddc6a')}
    ${caption('Sentirte bien no siempre\nsignifica estar bien', 790, 30)}
    <text x="${W / 2}" y="930" font-family="Arial" font-size="17" fill="#fff" text-anchor="middle">Información educativa. No sustituye la consulta médica.</text>${tag(8, '7 s')}` },
];

(async () => {
  const panels = scenes.map(s => `<svg xmlns="http://www.w3.org/2000/svg" id="s${s.n}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${s.svg}</svg>`);
  scenes.forEach((s, i) => fs.writeFileSync(path.join(OUT, `escena-${s.n}.svg`), panels[i]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#111}#sheet{display:grid;grid-template-columns:repeat(4,${W}px);gap:24px;padding:24px;background:#111}svg{display:block;border-radius:18px}</style></head><body><div id="sheet">${panels.join('')}</div></body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 4 * W + 5 * 24, height: 2 * H + 3 * 24 } });
  await page.setContent(html);
  for (const s of scenes) await page.locator(`#s${s.n}`).screenshot({ path: path.join(OUT, `escena-${s.n}.png`) });
  await page.locator('#sheet').screenshot({ path: path.join(OUT, 'storyboard-completo.png') });
  await browser.close();
  console.log('OK');
})();
