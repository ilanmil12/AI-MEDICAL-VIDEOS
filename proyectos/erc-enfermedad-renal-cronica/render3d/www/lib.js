// Biblioteca 3D: materiales, utilidades y personajes del video
// "Los Riñoncitos en huelga silenciosa". Colores según guia-continuidad-visual.md.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const C = {
  kidney: 0xa8324a, yellow: 0xf2b632, yellowDark: 0xd99a1a, teal1: 0x0e2233, teal2: 0x1c4766,
  cyan: 0x5fd3ff, pink: 0xff7b8a, off: 0x3a3a3a, mint: 0x6be38a, alert: 0xff3b3b, ok: 0x3ddc6a,
  skinBeto: 0xc98a5e, skinItzel: 0xb97b52, cap: 0xd23b33, plaid: 0x3b6fb6, plaidDark: 0x2a5594,
  taxiPink: 0xe2384d, white: 0xf4f4f4, blouse: 0x5a8fd8, heart: 0xe63946, hair: 0x1d120c,
};

// ---------- Materiales ----------
export const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, ...o });
export const glow = (color, intensity = 2.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

export function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return t;
}

// Relieve procedural (mapa de bump): 'piel' = poros suaves, 'tela' = trama, 'mezclilla' = sarga diagonal
const bumpCache = {};
export function bumpTex(kind = 'piel', repeat = [2, 2]) {
  const key = kind + repeat.join('x');
  if (bumpCache[key]) return bumpCache[key];
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    if (kind === 'piel') for (let i = 0; i < 2600; i++) { const v = 110 + rnd() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 2.2, 0, 7); g.fill(); }
    if (kind === 'tela') for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { const v = ((x + y) / 4) % 2 ? 150 : 100; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 4, 4); }
    if (kind === 'mezclilla') { g.strokeStyle = 'rgba(40,40,40,.6)'; g.lineWidth = 2; for (let k = -h; k < w; k += 6) { g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); } }
  }, repeat, false);
  return (bumpCache[key] = t);
}

const M = {
  kidney: () => mat(C.kidney, { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new THREE.Color(0xff8fa3), bumpMap: bumpTex('piel', [3, 3]), bumpScale: 1.2 }),
  yellow: () => mat(C.yellow, { roughness: 0.7, bumpMap: bumpTex('tela', [6, 6]), bumpScale: 0.8 }),
  glove: () => mat(0xf2f2f0, { roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color(0xffffff) }),
  eyeWhite: () => mat(0xf0f0ee, { roughness: 0.25, clearcoat: 0.7 }),
  pupil: () => mat(0x0c0c0c, { roughness: 0.1, clearcoat: 1 }),
  dark: () => mat(0x2b1418, { roughness: 0.6 }),
  shine: () => mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.8 }),
};

export const plaidTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3b6fb6'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(30,60,120,.75)'; g.fillRect(0, 96, w, 64); g.fillRect(96, 0, 64, h);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 124, w, 8); g.fillRect(124, 0, 8, h);
  g.fillStyle = 'rgba(20,40,90,.5)'; g.fillRect(0, 20, w, 14); g.fillRect(20, 0, 14, h);
}, [3, 3]);

export const gradientBg = (top, bottom) => canvasTex(4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

// ---------- Utilidades ----------
export function add(parent, geo, material, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...p); m.rotation.set(...r);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
export const group = (parent, p = [0, 0, 0], r = [0, 0, 0], s = 1) => {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r);
  if (typeof s === 'number') g.scale.setScalar(s); else g.scale.set(...s);
  parent && parent.add(g); return g;
};
export const sphere = (r = 1, w = 48, h = 32) => new THREE.SphereGeometry(r, w, h);
export const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 12, 24);
export const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 4, r);
export const cyl = (rt, rb, h, seg = 40) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const tube = (pts, r, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed), 64, r, 16, closed);
// Segmento cónico entre dos radios (brazos con forma, más gruesos arriba)
const limb = (r1, r2, len) => { const g = new THREE.CylinderGeometry(r2, r1, len, 24, 1); g.translate(0, -len / 2, 0); return g; };

// Arco de sonrisa / boca cerrada
function mouthArc(parent, p, width, curve, color = 0x2b1418, thick = 0.035) {
  const pts = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12 - 0.5; pts.push([p[0] + u * width, p[1] - curve * (1 - 4 * u * u), p[2] + 0.02 * (1 - 4 * u * u)]); }
  return add(parent, tube(pts, thick), mat(color, { roughness: 0.5 }));
}

// Boca abierta sonriente: interior, dientes superiores y lengua
function smileOpen(parent, p, w, h, lip = 0x5a1420) {
  const g = group(parent, p);
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.quadraticCurveTo(0, -h * 2, w / 2, 0); shape.quadraticCurveTo(0, h * 0.25, -w / 2, 0);
  add(g, new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 3 }), mat(0x3a0a12, { roughness: 0.6 }));
  add(g, rbox(w * 0.62, h * 0.32, 0.03, 0.01), mat(0xffffff, { roughness: 0.3 }), [0, -h * 0.18, 0.025]);
  add(g, sphere(w * 0.2), mat(0xe86a7a, { roughness: 0.5 }), [0, -h * 0.82, 0.02], [0, 0, 0], [1.3, 0.55, 0.3]);
  return g;
}

// Ojo caricaturesco: esclerótica, iris de color, pupila, doble brillo y párpado superior del color de la piel
function eye(parent, p, r, { look = [0, 0], squint = 0, iris = 0x4a2c1a, lid = null } = {}) {
  const g = group(parent, p);
  const lx = look[0] * r * 0.32, ly = look[1] * r * 0.32;
  add(g, sphere(r), M.eyeWhite(), [0, 0, 0], [0, 0, 0], [1, 1, 0.6]);
  add(g, sphere(r * 0.6, 32, 24), mat(iris, { roughness: 0.25, clearcoat: 1 }), [lx, ly, r * 0.43], [0, 0, 0], [1, 1, 0.32]);
  add(g, sphere(r * 0.34, 32, 24), M.pupil(), [lx, ly, r * 0.54], [0, 0, 0], [1, 1, 0.3]);
  add(g, sphere(r * 0.13, 16, 12), M.shine(), [lx + r * 0.18, ly + r * 0.2, r * 0.66]);
  add(g, sphere(r * 0.06, 12, 8), M.shine(), [lx - r * 0.14, ly - r * 0.16, r * 0.66]);
  if (lid !== null || squint > 0) { // párpado: casquete que baja según squint
    const cover = 0.3 + squint * 0.9;
    add(g, new THREE.SphereGeometry(r * 1.06, 32, 16, 0, Math.PI * 2, 0, Math.PI * cover), mat(lid ?? 0xa8324a, { roughness: 0.5 }), [0, 0, 0], [-0.35, 0, 0], [1, 1, 0.66]);
  }
  return g;
}

function blush(parent, p, r = 0.08) {
  return add(parent, sphere(r, 24, 16), mat(0xff6f8e, { transparent: true, opacity: 0.45, roughness: 0.8, depthWrite: false }), p, [0, 0, 0], [1.3, 0.75, 0.3]);
}

// Gota de sudor
function sweatDrop(parent, p, s = 0.12) {
  const pts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const a = t * Math.PI; pts.push(new THREE.Vector2(Math.sin(a) * (1 - t) * 0.6 + 0.0001, -Math.cos(a) * 0.5 + t * 0.6)); }
  return add(parent, new THREE.LatheGeometry(pts, 24), mat(0x7fd0ff, { roughness: 0.05, transmission: 0.3, clearcoat: 1 }), p, [0, 0, Math.PI], s);
}

// ---------- Manos ----------
// Mano/guante con dedos. El antebrazo apunta a -y local; la mano cuelga de y=0 hacia -y.
// pose: 'relajada' | 'puno' | 'pulgar' | 'abierta'; dedos: 3 (guante de caricatura) o 4 (humano)
// pulgarDir: 'z' (pulgar hacia +z local, p. ej. antebrazo hacia adelante) o 'y' (a lo largo del brazo)
export function hand(parent, material, { pose = 'relajada', dedos = 3, s = 1, side = 1, pulgarDir = 'y', cuff = null } = {}) {
  const g = group(parent, [0, 0, 0], [0, 0, 0], s);
  if (cuff) add(g, new THREE.TorusGeometry(0.11, 0.045, 12, 28), cuff, [0, -0.02, 0], [Math.PI / 2, 0, 0]);
  const abierta = pose === 'abierta';
  add(g, sphere(0.13, 32, 24), material, [0, -0.13, 0], [0, 0, 0], abierta ? [1.15, 1.05, 0.55] : [1, 1.05, 0.8]);
  const n = dedos, fr = dedos === 3 ? 0.052 : 0.04;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5;
    if (pose === 'puno' || pose === 'pulgar') { // dedos doblados: nudillos al frente
      add(g, sphere(fr * 1.15, 16, 12), material, [u * 0.17, -0.22, 0.07]);
    } else {
      const ang = abierta ? u * 0.7 : u * 0.25;
      const len = (dedos === 3 ? 0.1 : 0.09) * (1 - Math.abs(u) * 0.35);
      const f = group(g, [u * 0.17, -0.2, abierta ? 0 : 0.02], [abierta ? 0 : 0.35, 0, ang]);
      add(f, capsule(fr, len), material, [0, -len / 2 - fr * 0.5, 0]);
    }
  }
  // pulgar
  if (pose === 'pulgar') {
    if (pulgarDir === 'z') add(g, capsule(0.05, 0.11), material, [0, -0.13, 0.17], [Math.PI / 2, 0, 0]);
    else add(g, capsule(0.05, 0.11), material, [side * 0.02, -0.33, 0.06], [0, 0, 0]);
  } else {
    add(g, capsule(0.045, 0.08), material, [side * 0.12, -0.12, 0.05], [0.3, 0, side * (abierta ? 1.1 : 0.6)]);
  }
  return g;
}

// ---------- Geometría del riñón (forma de frijol, hilio en borde medial -x) ----------
export function kidneyGeometry(indent = 0.55) {
  const g = new THREE.SphereGeometry(1, 128, 96);
  const pos = g.attributes.position; const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let { x, y, z } = v;
    x *= 0.85; y *= 1.3; z *= 0.62;
    if (x < 0) x *= 1 - indent * Math.exp(-(y * y) / 0.32); // hilio cóncavo
    else x *= 1 + 0.06 * Math.exp(-(y * y) / 0.5);          // borde lateral convexo
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}
function lowerPart(geo, yMax) { // triángulos bajo yMax (overol)
  const ng = geo.toNonIndexed(); const p = ng.attributes.position; const uv = ng.attributes.uv; const out = [], outUv = [];
  for (let i = 0; i < p.count; i += 3) {
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    if (cy < yMax) for (let k = 0; k < 3; k++) { out.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k)); outUv.push(uv.getX(i + k), uv.getY(i + k)); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2)); g.computeVertexNormals();
  return g;
}

// Brazo articulado: hombro (esfera) → brazo cónico → codo (esfera) → antebrazo → guante.
// Pivote en el hombro; sh.rotation.z = angle*side; el.rotation.x = bend (adelante), el.rotation.z = bendZ (lateral)
function arm(parent, p, { mat: m, len = 0.62, r = 0.1, angle = 0, bend = 0, bendZ = 0.25, side = 1, thumb = false, pose = null, hand: handM = null }) {
  const sh = group(parent, p, [0, 0, angle * side]);
  add(sh, sphere(r * 1.15, 24, 16), m);
  const up = len * 0.48, lo = len * 0.44;
  add(sh, limb(r * 1.05, r * 0.85, up), m);
  const el = group(sh, [0, -up, 0], [bend, 0, bendZ * side]);
  add(el, sphere(r * 0.88, 24, 16), m);
  add(el, limb(r * 0.85, r * 0.72, lo), m);
  const wrist = group(el, [0, -lo, 0]);
  const fist = hand(wrist, handM || M.glove(), { pose: pose || (thumb ? 'pulgar' : 'relajada'), dedos: 3, s: r * 7.5, side, cuff: handM ? null : M.glove() });
  return { sh, el, wrist, fist };
}

// ---------- Personaje riñón (Rina / Rony) ----------
// opts: who: 'rina'|'rony', mood: 'happy'|'sweat'|'angry'|'worried'|'surprised', armL/armR: poses, helmet
export function kidneyChar(parent, opts = {}) {
  const { who = 'rina', mood = 'happy', helmet = true, overall = true, legs = true, armL = {}, armR = {}, look = [0, 0], mirror = false } = opts;
  const root = group(parent);
  const body = group(root, [0, 1.72, 0], [0, 0, 0], who === 'rony' ? 1.06 : 1);
  if (mirror) body.scale.x *= -1; // Rony con hilio del lado opuesto (riñón derecho)
  const kMat = M.kidney();
  add(body, kidneyGeometry(), kMat);
  // hilio renal: arteria (roja), vena (azul) y uréter (amarillo) salen del borde medial
  const vasos = [[0xd62839, 0.2, 0.05, 0.05], [0x3a6fd8, 0.1, 0.06, -0.08], [0xf0d36b, -0.02, 0.04, 0.0]];
  for (const [col, y, rr, z] of vasos) add(body, tube([[-0.36, y, z], [-0.5, y + 0.02, z], [-0.6, y - 0.08, z - 0.06]], rr), mat(col, { roughness: 0.4, clearcoat: 0.6 }));
  if (overall) {
    const ov = M.yellow(), ovDark = mat(C.yellowDark, { roughness: 0.7 });
    add(body, lowerPart(kidneyGeometry(), -0.42), ov, [0, 0, 0], [0, 0, 0], [1.035, 1.0, 1.06]);
    add(body, rbox(0.62, 0.5, 0.1, 0.04), ov, [0.08, -0.3, 0.58], [-0.12, 0, 0]);
    // costuras del peto
    const st = mat(0xa8740e, { roughness: 0.8 });
    add(body, tube([[-0.19, -0.08, 0.64], [0.35, -0.08, 0.64]], 0.006), st);
    add(body, tube([[-0.19, -0.08, 0.64], [-0.19, -0.5, 0.69]], 0.006), st);
    add(body, tube([[0.35, -0.08, 0.64], [0.35, -0.5, 0.69]], 0.006), st);
    add(body, rbox(0.09, 0.4, 0.06, 0.02), ov, [-0.19, 0.08, 0.53], [-0.45, 0, 0.35]);
    add(body, rbox(0.09, 0.4, 0.06, 0.02), ov, [0.37, 0.08, 0.55], [-0.45, 0, -0.35]);
    for (const x of [-0.15, 0.33]) {
      add(body, cyl(0.045, 0.045, 0.03, 20), mat(0xb08a3a, { metalness: 0.8, roughness: 0.3 }), [x, -0.1, 0.62], [Math.PI / 2, 0, 0]);
      add(body, cyl(0.02, 0.02, 0.035, 12), mat(0x5a4010, { metalness: 0.8, roughness: 0.3 }), [x, -0.1, 0.63], [Math.PI / 2, 0, 0]);
    }
    add(body, rbox(0.26, 0.16, 0.04, 0.02), ovDark, [0.08, -0.36, 0.64], [-0.12, 0, 0]); // bolsillo
    if (who === 'rony') add(body, rbox(0.16, 0.14, 0.03, 0.02), mat(0x3a7bd5, { roughness: 0.8 }), [0.02, -0.25, 0.66], [-0.1, 0, 0.3]); // pañuelo azul
  }
  if (who === 'rina') { // pañoleta menta con nudo
    add(body, new THREE.ConeGeometry(0.2, 0.3, 3), mat(C.mint, { roughness: 0.8, bumpMap: bumpTex('tela', [4, 4]), bumpScale: 0.6 }), [0.06, 0.06, 0.6], [Math.PI / 2 + 0.25, 0, Math.PI], [1.2, 0.8, 0.3]);
    add(body, sphere(0.045), mat(C.mint, { roughness: 0.8 }), [0.06, 0.14, 0.62]);
  }
  // cara
  const fx = 0.08, ey = 0.5, ez = 0.47;
  const squint = mood === 'happy' ? 0.12 : 0;
  const lk = mood === 'worried' ? [0.3, 0.4] : look;
  const lidCol = C.kidney;
  eye(body, [fx - 0.2, ey, ez], 0.17, { look: lk, squint, iris: 0x5b3418, lid: lidCol });
  eye(body, [fx + 0.2, ey, ez + 0.02], 0.17, { look: lk, squint, iris: 0x5b3418, lid: lidCol });
  if (who === 'rina') for (const s of [-1, 1]) for (let k = 0; k < 3; k++)
    add(body, capsule(0.012, 0.07), M.pupil(), [fx + s * 0.2 + s * (0.07 + k * 0.05), ey + 0.17 - k * 0.02, ez + 0.04], [0, 0, -s * (0.5 + k * 0.3)]);
  // cejas según el ánimo (extremo interior abajo = enojo; arriba = preocupación)
  const brow = (a, dy = 0.22) => { for (const s of [-1, 1]) add(body, capsule(0.03, 0.13), M.dark(), [fx + s * 0.2, ey + dy, ez + 0.08], [0, 0, s * a]); };
  if (mood === 'angry') brow(-1.15, 0.2); else if (mood === 'worried' || mood === 'sweat') brow(1.25, 0.24); else brow(1.45, 0.24);
  blush(body, [fx - 0.33, ey - 0.15, ez + 0.02]); blush(body, [fx + 0.36, ey - 0.15, ez + 0.03]);
  if (mood === 'happy') smileOpen(body, [fx, ey - 0.2, ez + 0.11], 0.32, 0.1);
  else if (mood === 'surprised') add(body, sphere(0.07), mat(0x3a0a12), [fx, ey - 0.3, ez + 0.06], [0, 0, 0], [1, 1.3, 0.5]);
  else if (mood === 'angry') mouthArc(body, [fx, ey - 0.31, ez + 0.07], 0.2, -0.05);
  else mouthArc(body, [fx, ey - 0.3, ez + 0.07], 0.2, -0.04);
  if (mood === 'sweat' || mood === 'worried') { sweatDrop(body, [fx + 0.48, ey + 0.2, 0.42], 0.13); sweatDrop(body, [fx - 0.43, ey + 0.32, 0.38], 0.1); }
  // casco con insignia (cruz menta, sin texto)
  if (helmet) {
    const h = group(body, [0.12, 1.08, 0], [0, 0, -0.12]);
    add(h, new THREE.SphereGeometry(0.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.yellow, { roughness: 0.35, clearcoat: 0.6 }), [0, 0, 0], [0, 0, 0], [1, 0.85, 0.85]);
    add(h, cyl(0.62, 0.62, 0.04, 48), mat(C.yellowDark, { roughness: 0.4, clearcoat: 0.5 }), [0, 0.01, 0.04], [0, 0, 0], [1, 1, 0.9]);
    add(h, rbox(0.1, 0.12, 0.8, 0.04), mat(C.yellowDark), [0, 0.38, 0]);
    add(h, cyl(0.09, 0.09, 0.02, 32), mat(0xffffff), [0, 0.22, 0.37], [Math.PI / 2 - 0.55, 0, 0]);
    add(h, rbox(0.11, 0.035, 0.03, 0.01), mat(C.mint), [0, 0.225, 0.385], [-0.55, 0, 0]);
    add(h, rbox(0.035, 0.11, 0.03, 0.01), mat(C.mint), [0, 0.225, 0.385], [-0.55, 0, 0]);
  }
  // brazos articulados con guantes
  const shL = [-0.46, -0.06, 0.05], shR = [0.86, -0.06, 0.05];
  const aL = arm(body, shL, { mat: kMat, side: -1, angle: -0.5, ...armL });
  const aR = arm(body, shR, { mat: kMat, side: 1, angle: 0.5, ...armR });
  if (legs) for (const x of [-0.12, 0.36]) {
    add(root, capsule(0.1, 0.28), M.yellow(), [x, 0.36, 0]);
    add(root, rbox(0.26, 0.15, 0.36, 0.06), mat(0x4a2c17, { roughness: 0.6, clearcoat: 0.3 }), [x, 0.09, 0.06]);
    add(root, rbox(0.27, 0.05, 0.37, 0.02), mat(0x1e140c, { roughness: 0.9 }), [x, 0.02, 0.06]);
    for (let k = 0; k < 2; k++) add(root, rbox(0.12, 0.015, 0.02, 0.005), mat(0xffffff), [x, 0.17, 0.12 + k * 0.06]);
  }
  return { root, body, aL, aR };
}

// ---------- Don Beto ----------
export function beto(parent, opts = {}) {
  const { mood = 'happy', thumbs = 'right', armL = {}, armR = {}, sing = false, look = [0, 0] } = opts;
  const root = group(parent);
  const skin = mat(C.skinBeto, { roughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color(0xffc9a0), bumpMap: bumpTex('piel', [4, 4]), bumpScale: 0.6 });
  const shirt = mat(0xffffff, { map: plaidTex(), roughness: 0.85, bumpMap: bumpTex('tela', [10, 10]), bumpScale: 0.7 });
  const jeans = mat(0x2f4f7f, { roughness: 0.9, bumpMap: bumpTex('mezclilla', [6, 6]), bumpScale: 1.0 });
  const hairM = mat(0x2a211c, { roughness: 0.8 });
  // piernas y zapatos
  for (const x of [-0.32, 0.32]) {
    add(root, capsule(0.26, 0.7), jeans, [x, 0.75, 0]);
    add(root, tube([[x + 0.24, 0.45, 0.06], [x + 0.25, 1.05, 0.05]], 0.008), mat(0xc8a050)); // costura
    add(root, rbox(0.46, 0.26, 0.7, 0.1), mat(0x3b2516, { roughness: 0.5, clearcoat: 0.4 }), [x, 0.15, 0.1]);
    add(root, rbox(0.47, 0.07, 0.71, 0.03), mat(0x18100a, { roughness: 0.9 }), [x, 0.03, 0.1]);
    for (let k = 0; k < 3; k++) add(root, rbox(0.2, 0.02, 0.025, 0.008), mat(0xe8e0d0), [x, 0.29, 0.2 + k * 0.08]);
  }
  // torso y barriga
  add(root, capsule(0.78, 0.7), shirt, [0, 1.95, 0], [0, 0, 0], [1, 1, 0.82]);
  add(root, sphere(0.72), shirt, [0, 1.62, 0.18], [0, 0, 0], [1.05, 0.9, 0.85]);
  add(root, cyl(0.82, 0.8, 0.14), mat(0x3b2516, { roughness: 0.5, clearcoat: 0.3 }), [0, 1.18, 0], [0, 0, 0], [1, 1, 0.86]); // cinturón
  add(root, rbox(0.24, 0.16, 0.06, 0.03), mat(0xc0c0c0, { metalness: 0.9, roughness: 0.25 }), [0, 1.18, 0.71]);
  for (const x of [-0.45, 0.45]) add(root, rbox(0.06, 0.18, 0.04, 0.01), mat(0x2f4f7f), [x, 1.18, 0.6], [0, x * 0.9, 0]); // presillas
  for (let k = 0; k < 4; k++) add(root, cyl(0.035, 0.035, 0.02, 16), mat(0xffffff), [0, 2.55 - k * 0.32, 0.67 + (k > 1 ? 0.12 : 0)], [Math.PI / 2, 0, 0]);
  add(root, tube([[0, 2.75, 0.64], [0, 2.3, 0.7], [0, 1.85, 0.82], [0, 1.4, 0.78]], 0.012), mat(0x2a5594)); // tapeta
  // bolsillo con pluma
  add(root, rbox(0.3, 0.3, 0.04, 0.02), shirt, [0.36, 2.35, 0.66], [-0.1, 0.25, 0]);
  add(root, cyl(0.022, 0.022, 0.22, 12), mat(0x1d3557, { roughness: 0.3, clearcoat: 1 }), [0.3, 2.5, 0.66], [0, 0, 0.05]);
  add(root, cyl(0.024, 0.024, 0.04, 12), mat(0xd0d0d0, { metalness: 1, roughness: 0.2 }), [0.3, 2.62, 0.66]);
  // cuello de camisa
  for (const s of [-1, 1]) add(root, new THREE.ConeGeometry(0.16, 0.3, 3), shirt, [s * 0.18, 2.78, 0.42], [0.9, 0, s * 2.6], [1, 1, 0.3]);
  // cuello y cabeza
  add(root, cyl(0.26, 0.3, 0.3), skin, [0, 2.78, 0]);
  const head = group(root, [0, 3.38, 0.04]);
  add(head, sphere(0.66, 64, 48), skin, [0, 0, 0], [0, 0, 0], [1, 1.02, 0.95]);
  for (const s of [-1, 1]) { // orejas con concha interior
    add(head, sphere(0.14), skin, [s * 0.64, -0.02, -0.05], [0, 0, 0], [0.6, 1, 1]);
    add(head, sphere(0.08), mat(0xa86a44, { roughness: 0.7 }), [s * 0.69, -0.02, -0.02], [0, 0, 0], [0.4, 0.8, 0.7]);
    add(head, rbox(0.1, 0.32, 0.12, 0.04), hairM, [s * 0.6, 0.12, 0.12], [0, 0, s * -0.05]); // patillas
  }
  add(head, sphere(0.15), mat(0xb87850, { roughness: 0.55, bumpMap: bumpTex('piel', [2, 2]), bumpScale: 0.5 }), [0, -0.06, 0.64], [0, 0, 0], [1.1, 0.9, 0.9]); // nariz
  for (const s of [-1, 1]) add(head, sphere(0.03), mat(0x5a2e1a), [s * 0.06, -0.15, 0.71]); // fosas nasales
  blush(head, [-0.38, -0.12, 0.5], 0.1); blush(head, [0.38, -0.12, 0.5], 0.1);
  const eo = { look, squint: mood === 'happy' ? 0.08 : 0, iris: 0x4a2a16, lid: C.skinBeto };
  eye(head, [-0.22, 0.12, 0.55], 0.12, eo); eye(head, [0.22, 0.12, 0.55], 0.12, eo);
  for (const s of [-1, 1]) add(head, capsule(0.05, 0.17), hairM, [s * 0.22, mood === 'surprised' ? 0.36 : 0.31, 0.58], [0, 0, s * (mood === 'surprised' ? 1.2 : 1.4)]);
  // bigote con volumen (tres capas)
  const must = mat(0x241712, { roughness: 0.95, bumpMap: bumpTex('tela', [8, 8]), bumpScale: 1.5 });
  add(head, tube([[-0.3, -0.26, 0.55], [-0.15, -0.16, 0.64], [0, -0.18, 0.67], [0.15, -0.16, 0.64], [0.3, -0.26, 0.55]], 0.075), must);
  add(head, tube([[-0.24, -0.22, 0.6], [0, -0.13, 0.69], [0.24, -0.22, 0.6]], 0.05), must);
  for (const s of [-1, 1]) add(head, sphere(0.075), must, [s * 0.3, -0.26, 0.55]);
  add(head, sphere(0.14), skin, [0, -0.5, 0.42], [0, 0, 0], [1.4, 0.55, 0.55]); // barbilla
  // boca
  if (sing || mood === 'surprised') add(head, sphere(0.1), mat(0x4a1210), [0, -0.38, 0.6], [0, 0, 0], [1, 1.2, 0.5]);
  else smileOpen(head, [0, -0.31, 0.64], 0.28, 0.07);
  // gorra con costuras y parche
  const cap = group(head, [0, 0.42, -0.04], [-0.05, 0, 0]);
  const capM = mat(C.cap, { roughness: 0.75, bumpMap: bumpTex('tela', [8, 8]), bumpScale: 0.6 });
  add(cap, new THREE.SphereGeometry(0.6, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), capM, [0, 0, 0], [0, 0, 0], [1, 0.8, 1]);
  add(cap, cyl(0.6, 0.6, 0.06, 48), capM, [0, 0, 0]);
  add(cap, cyl(0.4, 0.4, 0.05, 40), capM, [0, 0.0, 0.55], [0.12, 0, 0], [1.05, 1, 1.1]);
  add(cap, sphere(0.07), capM, [0, 0.48, 0]);
  const seam = mat(0x8a1f1a, { roughness: 0.8 });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, pts = []; for (let i = 0; i <= 10; i++) { const th = i / 10 * Math.PI / 2; pts.push([Math.sin(a) * 0.605 * Math.cos(th), 0.48 * Math.sin(th), Math.cos(a) * 0.605 * Math.cos(th)]); } add(cap, tube(pts, 0.008), seam); }
  add(cap, cyl(0.15, 0.15, 0.02, 32), mat(0xffffff), [0, 0.22, 0.52], [Math.PI / 2 - 0.5, 0, 0]);
  add(cap, cyl(0.1, 0.1, 0.025, 32), mat(0xf2b632), [0, 0.22, 0.53], [Math.PI / 2 - 0.5, 0, 0]);
  // brazos (manga corta con puño + antebrazo + mano con dedos)
  const shL = [-0.92, 2.42, 0], shR = [0.92, 2.42, 0];
  const mk = (p, side, o, thumb) => {
    const sh = group(root, p, [o.fx ?? 0, 0, (o.angle ?? 0.25) * side]);
    add(sh, capsule(0.24, 0.3), shirt, [0, -0.25, 0]);
    add(sh, new THREE.TorusGeometry(0.22, 0.04, 12, 28), mat(0x2a5594, { roughness: 0.8 }), [0, -0.5, 0], [Math.PI / 2, 0, 0]);
    add(sh, capsule(0.19, 0.45), skin, [0, -0.68, 0]);
    const el = group(sh, [0, -0.9, 0], [o.bend ?? 0, 0, 0]);
    add(el, capsule(0.18, 0.4), skin, [0, -0.25, 0]);
    const w = group(el, [0, -0.5, 0]);
    hand(w, skin, { pose: thumb ? 'pulgar' : (o.pose || 'relajada'), dedos: 4, s: 1.55, side, pulgarDir: 'z' });
    if (side < 0) { // reloj plateado con carátula
      add(el, new THREE.TorusGeometry(0.19, 0.04, 12, 32), mat(0xd0d0d0, { metalness: 0.95, roughness: 0.2 }), [0, -0.38, 0], [Math.PI / 2, 0, 0]);
      add(el, cyl(0.08, 0.08, 0.04, 24), mat(0xffffff, { roughness: 0.2, clearcoat: 1 }), [0, -0.38, 0.2], [Math.PI / 2, 0, 0]);
    }
    return { sh, el };
  };
  const aL = mk(shL, -1, armL, thumbs === 'left');
  const aR = mk(shR, 1, armR, thumbs === 'right');
  return { root, head, aL, aR };
}

// ---------- Dra. Itzel ----------
export function itzel(parent, opts = {}) {
  const { armL = {}, armR = {} } = opts;
  const root = group(parent);
  const skin = mat(C.skinItzel, { roughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color(0xffc9a0), bumpMap: bumpTex('piel', [4, 4]), bumpScale: 0.5 });
  const coat = mat(0xfbfbfb, { roughness: 0.8, bumpMap: bumpTex('tela', [10, 10]), bumpScale: 0.5 });
  for (const x of [-0.25, 0.25]) { add(root, capsule(0.2, 0.75), mat(0x2b2f3a, { roughness: 0.85 }), [x, 0.75, 0]); add(root, rbox(0.34, 0.2, 0.56, 0.08), mat(0x1b1b1b, { roughness: 0.4, clearcoat: 0.6 }), [x, 0.12, 0.08]); }
  add(root, capsule(0.62, 1.0), coat, [0, 1.95, 0], [0, 0, 0], [1, 1, 0.75]);
  add(root, rbox(0.42, 0.7, 0.1, 0.05), mat(C.blouse, { roughness: 0.7, bumpMap: bumpTex('tela', [6, 6]), bumpScale: 0.4 }), [0, 2.35, 0.43], [-0.05, 0, 0]);
  for (const s of [-1, 1]) {
    add(root, rbox(0.14, 0.85, 0.06, 0.03), coat, [s * 0.26, 2.3, 0.48], [-0.05, 0, s * 0.25]); // solapas
    add(root, rbox(0.3, 0.26, 0.04, 0.02), coat, [s * 0.32, 1.55, 0.5], [0, s * 0.3, 0]);       // bolsillos inferiores
  }
  add(root, rbox(0.22, 0.28, 0.03, 0.02), mat(0xffffff), [0.36, 2.15, 0.49]); // gafete
  add(root, rbox(0.16, 0.06, 0.035, 0.01), mat(C.blouse), [0.36, 2.22, 0.51]);
  add(root, rbox(0.1, 0.1, 0.035, 0.01), mat(0xcfd8e0), [0.36, 2.1, 0.51]);
  add(root, cyl(0.02, 0.02, 0.22, 12), mat(0xd23b33, { clearcoat: 1 }), [-0.36, 2.25, 0.5]); // pluma en bolsillo
  add(root, tube([[-0.24, 2.75, 0.3], [-0.3, 2.3, 0.5], [-0.1, 2.0, 0.52], [0.05, 1.9, 0.5]], 0.025), mat(0x2a2a2a, { roughness: 0.4 }));
  add(root, tube([[0.24, 2.75, 0.3], [0.2, 2.4, 0.5]], 0.025), mat(0x2a2a2a, { roughness: 0.4 }));
  add(root, cyl(0.07, 0.07, 0.04), mat(0xb0b0b0, { metalness: 0.9, roughness: 0.2 }), [0.07, 1.88, 0.52], [Math.PI / 2, 0, 0]);
  add(root, cyl(0.2, 0.24, 0.3), skin, [0, 2.95, 0]);
  const head = group(root, [0, 3.48, 0.02]);
  add(head, sphere(0.58, 64, 48), skin, [0, 0, 0], [0, 0, 0], [0.95, 1.05, 0.95]);
  const hairM = mat(C.hair, { roughness: 0.45, sheen: 0.7, sheenColor: new THREE.Color(0x6a4a3a) });
  add(head, new THREE.SphereGeometry(0.62, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, [0, 0.04, -0.03], [-0.25, 0, 0], [1, 1.05, 1]);
  add(head, capsule(0.14, 0.55), hairM, [0, -0.25, -0.55], [0.35, 0, 0]);
  add(head, new THREE.TorusGeometry(0.1, 0.035, 10, 24), mat(C.mint), [0, 0.05, -0.6], [0.3, 0, 0]); // liga de la coleta
  for (const s of [-1, 1]) add(head, capsule(0.13, 0.45), hairM, [s * 0.5, -0.05, 0.05], [0.1, 0, s * 0.12]);
  add(head, sphere(0.3), hairM, [-0.2, 0.42, 0.32], [0, 0, 0.5], [1.4, 0.5, 0.8]);
  add(head, sphere(0.26), hairM, [0.22, 0.45, 0.3], [0, 0, -0.4], [1.2, 0.45, 0.8]);
  for (let k = 0; k < 5; k++) add(head, tube([[-0.45 + k * 0.2, 0.5, 0.25 - Math.abs(k - 2) * 0.05], [-0.4 + k * 0.2, 0.62, -0.05], [-0.35 + k * 0.18, 0.5, -0.4]], 0.018), hairM); // mechones
  for (const s of [-1, 1]) { add(head, sphere(0.12), skin, [s * 0.55, -0.05, 0], [0, 0, 0], [0.5, 1, 1]); add(head, sphere(0.04), mat(0xe0e0e0, { metalness: 1, roughness: 0.15 }), [s * 0.57, -0.18, 0.03]); }
  add(head, sphere(0.1), mat(0xa86c46, { roughness: 0.55 }), [0, -0.05, 0.56], [0, 0, 0], [1, 0.9, 0.9]);
  const eo = { look: [0.2, 0], squint: 0.06, iris: 0x3a2214, lid: C.skinItzel };
  eye(head, [-0.19, 0.1, 0.48], 0.11, eo); eye(head, [0.19, 0.1, 0.48], 0.11, eo);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) add(head, capsule(0.01, 0.06), mat(0x111111), [s * (0.19 + 0.06 + k * 0.04), 0.2 - k * 0.02, 0.53], [0, 0, -s * (0.6 + k * 0.3)]);
  for (const s of [-1, 1]) add(head, capsule(0.03, 0.14), hairM, [s * 0.19, 0.27, 0.52], [0, 0, s * 1.4]);
  blush(head, [-0.32, -0.12, 0.45], 0.08); blush(head, [0.32, -0.12, 0.45], 0.08);
  mouthArc(head, [0, -0.25, 0.53], 0.22, 0.07, 0xb0404a, 0.04); // labios
  const mk = (p, side, o) => {
    const sh = group(root, p, [o.fx ?? 0, 0, (o.angle ?? 0.15) * side]);
    add(sh, capsule(0.18, 0.5), coat, [0, -0.4, 0]);
    const el = group(sh, [0, -0.85, 0], [o.bend ?? 0, 0, 0]);
    add(el, capsule(0.16, 0.42), coat, [0, -0.25, 0]);
    add(el, new THREE.TorusGeometry(0.15, 0.03, 10, 24), coat, [0, -0.5, 0], [Math.PI / 2, 0, 0]);
    const w = group(el, [0, -0.52, 0]);
    hand(w, skin, { pose: o.pose || 'relajada', dedos: 4, s: 1.15, side, pulgarDir: 'z' });
    return { sh, el };
  };
  return { root, head, aL: mk([-0.72, 2.6, 0], -1, armL), aR: mk([0.72, 2.6, 0], 1, armR) };
}

// ---------- Nefrona / filtro ----------
// Devuelve el grupo con g.setOn(bool) para encender/apagar y g.shield (grupo del escudo) para animarlo.
export function nephronUnit(parent, p, on = true, shield = false, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  const parts = [ // [material encendido, material apagado]
    [mat(0x15354c, { roughness: 0.3, clearcoat: 0.8 }), mat(0x242424, { roughness: 0.3, clearcoat: 0.8 })],
    [glow(C.cyan, 0.35), mat(0x4a4a4a)],
    [glow(C.pink, 1.4), mat(0x5a5a5a, { roughness: 0.7 })],
    [mat(0x9ef0ff, { transparent: true, opacity: 0.25, roughness: 0.1 }), mat(0x666666, { transparent: true, opacity: 0.25, roughness: 0.1 })],
    [glow(0x9ef0ff, 1.1), mat(0x5a5a5a)],
  ];
  const meshes = [
    add(g, rbox(0.9, 1.25, 0.5, 0.18), parts[0][0]),
    add(g, rbox(0.98, 1.33, 0.4, 0.2), parts[1][0], [0, 0, -0.08]),
    add(g, new THREE.TorusKnotGeometry(0.17, 0.045, 128, 16, 3, 7), parts[2][0], [0, 0.27, 0.28]),
    add(g, new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.8), parts[3][0], [0, 0.27, 0.28], [Math.PI, 0, 0]),
    add(g, tube([[0.05, 0.02, 0.28], [0.18, -0.15, 0.3], [0.2, -0.45, 0.3], [0.08, -0.52, 0.3], [-0.05, -0.45, 0.3], [-0.08, -0.15, 0.3], [-0.2, -0.05, 0.3]], 0.04), parts[4][0]),
  ];
  g.setOn = v => meshes.forEach((m, i) => (m.material = parts[i][v ? 0 : 1]));
  g.setOn(on);
  if (shield) {
    g.shield = group(g, [0, 0, 0.5]);
    add(g.shield, cyl(0.62, 0.62, 0.06, 6), mat(C.mint, { transparent: true, opacity: 0.38, emissive: C.mint, emissiveIntensity: 0.5, roughness: 0.1, clearcoat: 1 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
    add(g.shield, new THREE.TorusGeometry(0.62, 0.03, 8, 6), glow(C.mint, 1.4), [0, 0, 0.03], [0, 0, Math.PI / 6]);
  }
  return g;
}

// ---------- Villanos ----------
export function sugarCube(parent, p, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  add(g, rbox(1, 1, 1, 0.12), mat(0xfafaf5, { roughness: 0.35, clearcoat: 0.6, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) }));
  for (let i = 0; i < 40; i++) { const f = [Math.random() - 0.5, Math.random() - 0.5]; add(g, new THREE.OctahedronGeometry(0.04), mat(0xffffff, { metalness: 0.2, roughness: 0.05, clearcoat: 1 }), [f[0] * 0.95, f[1] * 0.95, 0.51 * (i % 2 ? 1 : -1)], [i, i * 2, 0]); }
  eye(g, [-0.2, 0.12, 0.5], 0.12, { look: [0.3, -0.2] }); eye(g, [0.2, 0.12, 0.5], 0.12, { look: [0.3, -0.2] });
  for (const s2 of [-1, 1]) add(g, capsule(0.035, 0.18), M.dark(), [s2 * 0.2, 0.3, 0.55], [0, 0, -s2 * 1.15]);
  mouthArc(g, [0.02, -0.2, 0.52], 0.32, 0.08, 0x2b1418, 0.035);
  return g;
}
export function bpCuff(parent, p, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  add(g, rbox(1.5, 0.95, 0.5, 0.25), mat(0x30495f, { roughness: 0.8 }));
  add(g, rbox(1.4, 0.06, 0.52, 0.02), mat(0x9aa9b8), [0, 0.3, 0]);
  add(g, cyl(0.36, 0.36, 0.14, 48), mat(0xc0c0c0, { metalness: 0.9, roughness: 0.25 }), [0, -0.02, 0.28], [Math.PI / 2, 0, 0]);
  add(g, cyl(0.32, 0.32, 0.02, 48), mat(0xf6f6f6, { roughness: 0.3 }), [0, -0.02, 0.36], [Math.PI / 2, 0, 0]);
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; add(g, rbox(0.015, 0.05, 0.01, 0.005), mat(0x222222), [Math.cos(a) * 0.27, -0.02 + Math.sin(a) * 0.27, 0.375], [0, 0, a + Math.PI / 2]); }
  add(g, rbox(0.03, 0.26, 0.015, 0.008), mat(0xd23b33), [0.08, 0.06, 0.39], [0, 0, -0.7]);
  eye(g, [-0.35, 0.22, 0.28], 0.11, { look: [-0.3, -0.2] }); eye(g, [0.35, 0.22, 0.28], 0.11, { look: [-0.3, -0.2] });
  for (const s2 of [-1, 1]) add(g, capsule(0.03, 0.15), M.dark(), [s2 * 0.35, 0.38, 0.3], [0, 0, -s2 * 1.15]);
  add(g, tube([[0.7, -0.2, 0], [1.05, -0.4, 0.1], [1.15, -0.8, 0.15]], 0.04), mat(0x1a1a1a, { roughness: 0.4 }));
  add(g, sphere(0.22), mat(0x1a1a1a, { roughness: 0.35, clearcoat: 0.6 }), [1.17, -1.05, 0.15], [0, 0, 0], [1, 1.3, 1]);
  const puff = mat(0xdfe8f0, { transparent: true, opacity: 0.6, roughness: 1 });
  [[-0.95, 0.5, 0.1, 0.16], [-1.15, 0.72, 0.1, 0.12], [-1.3, 0.95, 0.05, 0.09]].forEach(([x, y, z, r]) => add(g, sphere(r), puff, [x, y, z]));
  return g;
}

// ---------- Detectives ----------
export function bloodDetective(parent, p, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  const pts = []; for (let i = 0; i <= 32; i++) { const t = i / 32; const a = t * Math.PI; pts.push(new THREE.Vector2(Math.max(0.0001, Math.sin(a) * Math.pow(1 - t * 0.55, 1.4) * 0.5), -Math.cos(a) * 0.55 + t * 0.35)); }
  add(g, new THREE.LatheGeometry(pts, 48), mat(0xc8102e, { roughness: 0.15, clearcoat: 1 }), [0, 0.5, 0], [Math.PI, 0, 0]);
  eye(g, [-0.13, 0.42, 0.38], 0.09); eye(g, [0.13, 0.42, 0.38], 0.09);
  mouthArc(g, [0, 0.24, 0.43], 0.14, 0.04, 0x3a0a0a, 0.02);
  const hat = mat(0x7a5530, { roughness: 0.8 });
  add(g, cyl(0.42, 0.42, 0.03, 40), hat, [0, 0.93, 0], [0.1, 0, 0]); add(g, cyl(0.24, 0.27, 0.2, 40), hat, [0, 1.03, 0], [0.1, 0, 0]);
  add(g, cyl(0.272, 0.272, 0.05, 40), mat(0x3b2516), [0, 0.96, 0], [0.1, 0, 0]);
  const mg = group(g, [0.6, 0.45, 0.25], [0, -0.3, -0.5]);
  add(mg, new THREE.TorusGeometry(0.2, 0.035, 16, 48), mat(0x333333, { metalness: 0.7, roughness: 0.3 }));
  add(mg, cyl(0.2, 0.2, 0.01, 40), mat(0xcfefff, { transparent: true, opacity: 0.35, roughness: 0, clearcoat: 1 }), [0, 0, 0], [Math.PI / 2, 0, 0]);
  add(mg, cyl(0.035, 0.04, 0.32), mat(0x5a3a1a), [0, -0.36, 0]);
  return g;
}
export function urineDetective(parent, p, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  add(g, cyl(0.32, 0.28, 0.85, 48), mat(0xffffff, { transparent: true, opacity: 0.3, roughness: 0.05, clearcoat: 1 }), [0, 0.55, 0]);
  add(g, cyl(0.29, 0.26, 0.62, 48), mat(0xf6e27a, { roughness: 0.1, transparent: true, opacity: 0.92 }), [0, 0.44, 0]);
  add(g, cyl(0.35, 0.35, 0.16, 48), mat(0xf0f0f0, { roughness: 0.4 }), [0, 1.04, 0]);
  const coat = mat(0x8a6a3f, { roughness: 0.85 });
  add(g, cyl(0.36, 0.42, 0.5, 48, 1), coat, [0, 0.25, 0]);
  for (const s2 of [-1, 1]) add(g, rbox(0.16, 0.26, 0.05, 0.02), coat, [s2 * 0.15, 0.55, 0.33], [-0.3, 0, s2 * 0.4]);
  eye(g, [-0.12, 0.72, 0.29], 0.08); eye(g, [0.12, 0.72, 0.29], 0.08);
  mouthArc(g, [0, 0.6, 0.31], 0.12, 0.035, 0x5a4a10, 0.018);
  return g;
}

// ---------- Corazón ----------
export function heartChar(parent, p, s = 1, wink = true) {
  const g = group(parent, p, [0, 0, 0], s);
  const sh = new THREE.Shape();
  sh.moveTo(0, -0.9); sh.bezierCurveTo(-0.2, -0.6, -1.0, -0.3, -1.0, 0.25); sh.bezierCurveTo(-1.0, 0.75, -0.4, 0.95, 0, 0.5);
  sh.bezierCurveTo(0.4, 0.95, 1.0, 0.75, 1.0, 0.25); sh.bezierCurveTo(1.0, -0.3, 0.2, -0.6, 0, -0.9);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.25, bevelSegments: 10, curveSegments: 48 });
  geo.center();
  add(g, geo, mat(C.heart, { roughness: 0.3, clearcoat: 0.8 }));
  eye(g, [-0.33, 0.15, 0.47], 0.13);
  if (wink) mouthArc(g, [0.33, 0.17, 0.5], 0.2, 0.05, 0x3a0a0a, 0.03); else eye(g, [0.33, 0.15, 0.47], 0.13);
  mouthArc(g, [0, -0.15, 0.5], 0.3, 0.09, 0x3a0a0a, 0.035);
  return g;
}

// ---------- Taxi CDMX (rosa y blanco) ----------
export function taxi(parent, p, r = [0, 0, 0], s = 1, open = false) {
  const g = group(parent, p, r, s);
  const pinkM = mat(C.taxiPink, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const whiteM = mat(C.white, { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const glass = mat(0x1f3550, { roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  add(g, rbox(4.2, 0.9, 1.9, 0.3), whiteM, [0, 0.8, 0]);
  add(g, rbox(1.3, 0.92, 1.92, 0.3), pinkM, [1.45, 0.8, 0]); add(g, rbox(1.3, 0.92, 1.92, 0.3), pinkM, [-1.45, 0.8, 0]);
  if (!open) add(g, rbox(2.4, 0.8, 1.75, 0.35), whiteM, [-0.2, 1.55, 0]);
  else { // cabina abierta para ver al conductor
    add(g, rbox(2.4, 0.12, 1.75, 0.05), whiteM, [-0.2, 1.92, 0]);
    for (const x of [-1.35, 0.95]) add(g, rbox(0.12, 0.8, 1.7, 0.05), whiteM, [x, 1.55, 0]);
  }
  add(g, rbox(2.3, 0.6, 1.78, 0.25), open ? mat(0x9fc8e8, { transparent: true, opacity: 0.18, roughness: 0.05, clearcoat: 1, depthWrite: false }) : glass, [-0.2, 1.58, 0]);
  add(g, rbox(0.06, 0.66, 1.8, 0.02), whiteM, [-0.2, 1.58, 0]);
  add(g, rbox(0.8, 0.28, 0.4, 0.08), mat(0xffd23f, { emissive: 0xffd23f, emissiveIntensity: 0.25 }), [-0.2, 2.1, 0]);
  for (const x of [-1.35, 1.35]) for (const z of [-0.9, 0.9]) {
    add(g, cyl(0.42, 0.42, 0.3, 40), mat(0x161616, { roughness: 0.9 }), [x, 0.42, z], [Math.PI / 2, 0, 0]);
    add(g, cyl(0.22, 0.22, 0.32, 24), mat(0xbfbfbf, { metalness: 0.9, roughness: 0.25 }), [x, 0.42, z], [Math.PI / 2, 0, 0]);
  }
  for (const z of [-0.6, 0.6]) add(g, sphere(0.14), glow(0xfff4c2, 1.2), [2.1, 0.9, z], [0, 0, 0], [0.4, 1, 1]);
  return g;
}

// ---------- Iluminación base ----------
export function stdLights(scene, { key = 0xfff1dc, keyI = 2.6, keyPos = [6, 10, 8], hemiSky = 0xbfe3ff, hemiGround = 0x6a4a3a, hemiI = 0.8, rim = 0xffd2a8, rimI = 1.4, shadowSize = 8 } = {}) {
  scene.add(new THREE.HemisphereLight(hemiSky, hemiGround, hemiI));
  const d = new THREE.DirectionalLight(key, keyI); d.position.set(...keyPos); d.castShadow = true;
  d.shadow.mapSize.set(2048, 2048); d.shadow.bias = -0.0004; d.shadow.normalBias = 0.02; d.shadow.radius = 6;
  Object.assign(d.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 0.5, far: 60 });
  scene.add(d);
  const r = new THREE.DirectionalLight(rim, rimI); r.position.set(-6, 6, -8); scene.add(r);
  return d;
}
