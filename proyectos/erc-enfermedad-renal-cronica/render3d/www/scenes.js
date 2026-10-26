// Escenas del video. Cada escena devuelve capas { nombre: { scene, camera, bloom } }, metadatos
// y update(t) (t en segundos desde el inicio de la escena) para animarla.
// Las capas se componen después (ventana de rayos X, pantalla dividida).
import * as THREE from 'three';
import {
  C, mat, glow, add, group, sphere, rbox, cyl, tube, canvasTex, gradientBg,
  kidneyChar, beto, itzel, nephronUnit, sugarCube, bpCuff, bloodDetective, urineDetective, heartChar, taxi, stdLights,
} from './lib.js';

const cam = (aspect, pos, target, fov = 38) => {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
  c.position.set(...pos); c.lookAt(...target); c.updateMatrixWorld(); c.userData.target = new THREE.Vector3(...target);
  return c;
};
const moveCam = (c, pos, target = c.userData.target) => { c.position.set(...pos); c.lookAt(target); c.updateMatrixWorld(); };

// ---------- Curvas de animación ----------
const clamp01 = x => Math.min(1, Math.max(0, x));
const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOutBack = x => { x = clamp01(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const lerp = (a, b, x) => a + (b - a) * x;
const wave = (t, f, ph = 0) => Math.sin(2 * Math.PI * f * t + ph);
const setArm = (arm, side, angle) => (arm.sh.rotation.z = angle * side);
const beat = t => { const p = (t * 1.25) % 1; return Math.exp(-p * 14) + 0.6 * Math.exp(-Math.max(0, p - 0.18) * 14) * (p > 0.18); };

// ---------- Escenarios ----------
function street(scene, { sunset = false } = {}) {
  scene.background = sunset ? gradientBg('#ff9a62', '#7a3b7e') : gradientBg('#9fd3ff', '#ffe2b8');
  add(scene, new THREE.PlaneGeometry(80, 40), mat(0x4a4a4f, { roughness: 0.95 }), [0, 0, 4], [-Math.PI / 2, 0, 0]);
  add(scene, rbox(40, 0.3, 6, 0.05), mat(0xb9b4ad, { roughness: 0.9 }), [0, 0.15, -4.5]);
  const facades = [[-9, 0xe75a7c], [-4.5, 0xf2c14e], [0, 0x2a9d8f], [4.5, 0xf28c38], [9, 0x8e6bbf]];
  facades.forEach(([x, col], i) => {
    const h = 9 + (i % 2) * 2;
    add(scene, rbox(4.5, h, 1, 0.05), mat(col, { roughness: 0.9 }), [x, h / 2, -8]);
    for (let r = 0; r < 3; r++) for (let k = -1; k <= 1; k += 2) {
      add(scene, rbox(1.1, 1.4, 0.2, 0.04), mat(0xffffff), [x + k * 1.1, 2.6 + r * 2.6, -7.45]);
      add(scene, rbox(0.9, 1.2, 0.22, 0.03), mat(sunset ? 0xffc27a : 0x2b4560, { roughness: 0.15, emissive: sunset ? 0xffa040 : 0, emissiveIntensity: sunset ? 0.5 : 0 }), [x + k * 1.1, 2.6 + r * 2.6, -7.4]);
    }
  });
  // papel picado (se mece con el viento)
  const cols = [0xe63946, 0xf4a261, 0x2a9d8f, 0x8e6bbf, 0xffd23f, 0x3a86ff];
  add(scene, tube([[-8, 7.2, -5], [0, 6.6, -5], [8, 7.2, -5]], 0.02), mat(0x333333));
  const flags = [];
  for (let i = 0; i < 22; i++) {
    const x = -7.6 + i * 0.72, y = 6.6 + 0.6 * Math.pow(x / 8, 2) - 0.35;
    flags.push(add(scene, new THREE.PlaneGeometry(0.55, 0.65), mat(cols[i % 6], { side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.95 }), [x, y, -5], [0, 0, (i % 3 - 1) * 0.08]));
  }
  return t => flags.forEach((f, i) => (f.rotation.x = 0.25 * wave(t, 0.7, i * 0.6)));
}

function plant(scene, { mood = 'normal' } = {}) {
  const purple = mood === 'villain';
  scene.background = purple ? gradientBg('#2b1840', '#542a5c') : gradientBg('#0b1a28', '#1c4766');
  scene.fog = new THREE.Fog(purple ? 0x3a2050 : 0x10293d, 14, 34);
  add(scene, new THREE.PlaneGeometry(60, 60), mat(purple ? 0x2a1838 : 0x0f2a3d, { roughness: 0.35, metalness: 0.3 }), [0, 0, -10], [-Math.PI / 2, 0, 0]);
  for (let z = 4; z > -30; z -= 2) add(scene, rbox(14, 0.02, 0.06, 0.01), glow(purple ? 0x7a3a9a : 0x1f6f8b, 0.6), [0, 0.01, z]);
  // tubería de entrada (sangre) con glóbulos rojos que fluyen
  const pipeY = 5.2;
  add(scene, cyl(0.55, 0.55, 30, 48), mat(0xff6b6b, { transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 }), [0, pipeY, -3], [0, 0, Math.PI / 2]);
  const rbcs = [];
  for (let i = 0; i < 26; i++) rbcs.push(add(scene, new THREE.TorusGeometry(0.18, 0.1, 16, 32), mat(0xc8102e, { roughness: 0.35, clearcoat: 0.5 }), [-12 + i * 0.95, pipeY + Math.sin(i * 1.7) * 0.2, -3 + Math.cos(i) * 0.2], [i, i * 0.5, 0], [1, 1, 0.55]));
  add(scene, cyl(0.45, 0.45, 30, 48), mat(0x9ef0ff, { transparent: true, opacity: 0.4, roughness: 0.05, clearcoat: 1, emissive: 0x3aa7c9, emissiveIntensity: 0.3 }), [0, 0.5, -16], [0, 0, Math.PI / 2]);
  for (const x of [-4.6, 4.6]) for (let z = 2; z > -28; z -= 6) add(scene, rbox(0.6, 9, 0.6, 0.1), mat(purple ? 0x3a2550 : 0x163a52, { roughness: 0.5 }), [x, 4.5, z]);
  return t => rbcs.forEach((r, i) => { r.position.x = ((-12 + i * 0.95 + t * 1.6 + 12) % 24.7) - 12; r.rotation.x = i + t * 1.5; });
}

// Rejilla de nefronas: patrón por filas (1 encendida, 0 apagada, 's' encendida con escudo)
function nephronField(scene, rows, { x0 = -2.4, dx = 1.2, z0 = 1, dz = -2.2, y = 1.15, crystals = null } = {}) {
  const units = [];
  rows.forEach((row, ri) => row.split('').forEach((c, ci) => {
    const p = [x0 + ci * dx, y, z0 + ri * dz];
    add(scene, rbox(1.0, 0.5, 0.7, 0.08), mat(0x23455c, { roughness: 0.4 }), [p[0], 0.25, p[2]]);
    const u = nephronUnit(scene, p, c !== '0', c === 's');
    u.userData = { code: c, ri, ci };
    units.push(u);
    if (crystals && crystals.includes(`${ri},${ci}`)) for (let k = 0; k < 6; k++)
      add(u, new THREE.OctahedronGeometry(0.07 + (k % 3) * 0.02), mat(0xffffff, { roughness: 0.05, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.2 }), [Math.sin(k * 2) * 0.35, Math.cos(k * 3) * 0.45, 0.3], [k, k, 0]);
  }));
  return units;
}

function bulb(parent, p, color, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  g.userData.glass = add(g, sphere(0.3), glow(color, 1.8));
  add(g, cyl(0.16, 0.16, 0.22, 24), mat(0x8a8a8a, { metalness: 0.9, roughness: 0.3 }), [0, -0.36, 0]);
  g.userData.light = new THREE.PointLight(color, 3, 4); g.add(g.userData.light);
  return g;
}

// Capa de rayos X: misma escena, cuerpo de Beto translúcido y riñones dentro.
function xrayify(root, scene) {
  const body = new THREE.MeshPhysicalMaterial({ color: 0x5fd3ff, transparent: true, opacity: 0.07, roughness: 0.2, emissive: 0x1a6f9a, emissiveIntensity: 0.35, depthWrite: false });
  root.traverse(o => { if (o.isMesh) { o.material = body; o.castShadow = false; } });
  scene.background = gradientBg('#06182a', '#0c3350');
  scene.fog = null;
}

// ---------- Escenas ----------
export const SCENES = {
  // Escena 1 (y 8 con ending=true): gancho en la calle con ventana de rayos X
  street_hook(aspect, { ending = false } = {}) {
    const layers = {}, ups = [];
    for (const mode of ['main', 'xray']) {
      const s = new THREE.Scene();
      ups.push(street(s, { sunset: ending }));
      stdLights(s, ending ? { key: 0xffb070, keyI: 2.4, keyPos: [-8, 6, 6], hemiSky: 0xffb38a, hemiGround: 0x4a2a4a, rim: 0xff8a5a, rimI: 2 } : {});
      taxi(s, [2.6, 0, -2.2], [0, -0.45, 0], 1);
      const b = beto(s, { mood: 'happy', thumbs: 'right', armR: { angle: 0.55, bend: -2.0 }, armL: { angle: 0.12, pose: ending ? 'abierta' : 'relajada' } });
      b.root.position.set(0.35, 0, 1.2);
      const c = cam(aspect, [0.6, 2.7, 13], [0.6, 2.35, 0], 36);
      ups.push(t => {
        b.root.position.y = 0.03 * Math.abs(wave(t, 0.9));
        b.aR.sh.rotation.z = 0.55 + 0.06 * wave(t, 1.6);
        b.head.rotation.z = 0.04 * wave(t, 0.5);
        if (ending) { // despedida: levanta la mano y saluda tras la última frase
          const g = ease((t - 6.9) / 0.5);
          b.aL.sh.rotation.z = lerp(-0.12, -2.35, g); b.aL.el.rotation.z = g * 0.45 * wave(t, 2.0);
        }
        const z = ending ? lerp(11.8, 13.2, ease(t / 6)) : lerp(13.2, 11.6, ease(t / 3.5));
        moveCam(c, [0.6, 2.7, z]);
      });
      if (mode === 'xray') {
        s.children.filter(o => o !== b.root && !o.isLight).forEach(o => (o.visible = false));
        xrayify(b.root, s);
        const k = group(b.root, [0, 1.25, 0.05], [0, 0, 0], 0.32);
        const left = kidneyChar(k, { who: 'rina', mood: ending ? 'happy' : 'sweat', legs: false, armL: { angle: ending ? -0.2 : -0.5 }, armR: ending ? { angle: 2.6, thumb: true } : { angle: 0.5, pose: 'abierta' } });
        left.root.position.set(1.1, 0, 0);
        const right = kidneyChar(k, { who: 'rony', mood: ending ? 'happy' : 'sweat', legs: false, mirror: true, armL: ending ? { angle: -2.6, thumb: true } : { angle: -0.5 }, armR: { angle: 0.3 } });
        right.root.position.set(-1.2, 0, 0);
        const bl = bulb(k, [0, 3.7, 0], ending ? C.ok : C.alert, 1.1);
        ups.push(t => {
          left.root.position.y = 0.08 * wave(t, ending ? 1.2 : 2.2);
          right.root.position.y = 0.08 * wave(t, ending ? 1.2 : 2.2, 1.3);
          if (ending) { setArm(left.aR, 1, 2.6 + 0.12 * wave(t, 1.5)); setArm(right.aL, -1, -2.6 - 0.12 * wave(t, 1.5, 1)); }
          else { left.root.rotation.z = 0.05 * wave(t, 3); right.root.rotation.z = -0.05 * wave(t, 3); }
          const on = ending ? 0.85 + 0.15 * wave(t, 0.8) : (Math.floor(t * 3) % 2 ? 0.25 : 1);
          bl.userData.glass.material.emissiveIntensity = 1.8 * on; bl.userData.light.intensity = 3 * on;
        });
      }
      layers[mode] = { scene: s, camera: c, bloom: mode === 'xray' ? 0.7 : 0.25 };
    }
    // ventana de rayos X: torso de Beto (en coordenadas de mundo), se proyecta por cuadro
    return { layers, meta: { xrayBox: [[-0.55, 1.05, 2.0], [1.25, 2.75, 2.0]] }, update: t => ups.forEach(u => u(t)) };
  },

  plant_intro(aspect) {
    const s = new THREE.Scene(); const flow = plant(s);
    stdLights(s, { key: 0xcfefff, keyI: 1.6, hemiSky: 0x3a7ca5, hemiGround: 0x0b1a28, hemiI: 0.7, rim: 0x5fd3ff, rimI: 1.2 });
    nephronField(s, ['11111', '11111', '11111', '11111', '11111', '11111', '11111'], { z0: 0.5 });
    const rina = kidneyChar(s, { who: 'rina', mood: 'happy', armL: { angle: -0.4 }, armR: { angle: 1.6, bend: 0, bendZ: 0.1, pose: 'abierta' } });
    rina.root.position.set(-0.95, 0, 3.4); rina.root.rotation.y = 0.3; rina.root.scale.setScalar(0.5);
    const rony = kidneyChar(s, { who: 'rony', mood: 'happy', mirror: true, armL: { angle: -2.4, pose: 'abierta' }, armR: { angle: 0.4 } });
    rony.root.position.set(1.0, 0, 3.3); rony.root.rotation.y = -0.3; rony.root.scale.setScalar(0.5);
    const c = cam(aspect, [0, 2.4, 9.5], [0, 1.9, 0], 42);
    const update = t => {
      flow(t);
      setArm(rony.aL, -1, -2.4 - 0.15 * wave(t, 1.6)); rony.aL.el.rotation.z = -(0.2 + 0.55 * wave(t, 1.6)); // saluda desde el codo
      setArm(rina.aR, 1, 1.6 + 0.12 * wave(t, 0.6)); // presenta
      rina.root.position.y = 0.04 * Math.abs(wave(t, 1.0)); rony.root.position.y = 0.04 * Math.abs(wave(t, 1.0, 0.8));
      const u = ease(t / 8);
      moveCam(c, [lerp(-0.35, 0.35, u), 2.4, lerp(9.6, 10.2, u)], new THREE.Vector3(lerp(-0.15, 0.15, u), 1.9, 0));
    };
    return { layers: { main: { scene: s, camera: c, bloom: 0.75 } }, meta: {}, update };
  },

  split_silent(aspect) {
    // arriba: Beto cantando en el taxi; abajo: filtros que se apagan en silencio
    const top = new THREE.Scene(); const wind = street(top);
    stdLights(top);
    const tx = taxi(top, [0, 0, 0], [0, 0, 0], 1, true);
    const b = beto(top, { sing: true, thumbs: 'none', armL: { angle: 0.1, bend: -1.2 }, armR: { angle: 0.1, bend: -1.2 } });
    b.root.position.set(0.3, 0.3, 0.1); b.root.scale.setScalar(0.4);
    const notesM = mat(0x1d3557), notes = [];
    [[1.4, 2.6, 0.5], [1.9, 3.0, 0.4], [1.1, 2.9, 0.45]].forEach(([x, y, z]) => {
      const n = group(top, [x, y, z]); add(n, sphere(0.12), notesM, [0, 0, 0], [0, 0, 0], [1.2, 0.9, 0.6]); add(n, rbox(0.03, 0.45, 0.03, 0.01), notesM, [0.12, 0.22, 0]); notes.push(n);
    });
    const bottom = new THREE.Scene(); const flow = plant(bottom);
    stdLights(bottom, { key: 0xcfefff, keyI: 1.4, hemiSky: 0x3a7ca5, hemiGround: 0x0b1a28, hemiI: 0.6, rim: 0x5fd3ff });
    const units = nephronField(bottom, ['10110', '01101', '11010', '10011', '01110', '10101'], { z0: 0.3 });
    const offs = units.filter(u => u.userData.code === '0');
    offs.forEach((u, i) => { u.userData.tOff = 0.8 + (i * 5.2) / offs.length + ((i * 7) % 3) * 0.15; });
    const rony = kidneyChar(bottom, { who: 'rony', mood: 'sweat', mirror: true, armL: { angle: -0.4 }, armR: { angle: 2.2, bend: -0.8 } });
    rony.root.position.set(1.0, 0, 3.6); rony.root.scale.setScalar(0.62); rony.root.rotation.y = -0.4;
    const rina = kidneyChar(bottom, { who: 'rina', mood: 'worried', armL: { angle: -1.2 }, armR: { angle: 1.2 } });
    rina.root.scale.setScalar(0.55); rina.root.rotation.set(0, 0.6, 0.12);
    const cTop = cam(aspect * 2, [0.2, 1.8, 6.2], [0.1, 1.35, 0], 38);
    const cBot = cam(aspect * 2, [0, 2.6, 8.5], [0, 1.4, 0], 42);
    const update = t => {
      wind(t); flow(t);
      tx.position.y = 0.025 * Math.abs(wave(t, 2.2));
      b.head.rotation.z = 0.12 * wave(t, 1.1); b.root.position.y = 0.3 + tx.position.y;
      notes.forEach((n, i) => { const p = ((t * 0.5 + i * 0.33) % 1); n.position.y = 2.5 + p * 1.0; n.position.x = 1.1 + i * 0.35 + 0.1 * wave(t, 1, i); n.visible = p < 0.9; });
      units.forEach(u => { if (u.userData.code === '0') u.setOn(t < u.userData.tOff); });
      setArm(rony.aR, 1, 2.2 + 0.3 * wave(t, 2.2)); // se seca el sudor
      rina.root.position.set(lerp(-1.6, -0.5, (Math.sin(t * 0.9) + 1) / 2), 0.06 * Math.abs(wave(t, 2.4)), 2.6);
      rina.root.rotation.y = Math.cos(t * 0.9) > 0 ? 0.9 : -0.3;
    };
    return {
      layers: { top: { scene: top, camera: cTop, bloom: 0.2 }, bottom: { scene: bottom, camera: cBot, bloom: 0.75 } },
      meta: {}, update,
    };
  },

  villains(aspect) {
    const s = new THREE.Scene(); const flow = plant(s, { mood: 'villain' });
    stdLights(s, { key: 0xffd6f0, keyI: 1.8, hemiSky: 0x9a6ad0, hemiGround: 0x2b1840, hemiI: 0.9, rim: 0xff6bd6, rimI: 2 });
    nephronField(s, ['10110', '11011', '11101', '10111', '11111'], { z0: -1.2, crystals: ['0,0', '0,3', '1,1', '1,4', '2,2'] });
    const sugar = sugarCube(s, [-1.05, 3.1, 2.5], 1.05); sugar.rotation.set(0.1, 0.35, -0.1);
    const cuff = bpCuff(s, [1.0, 2.0, 2.2], 0.9); cuff.rotation.set(0, -0.35, 0.05);
    const jets = [];
    for (let k = 0; k < 3; k++) jets.push(add(s, cyl(0.04, 0.12, 1.6, 16), mat(0xbfe3ff, { transparent: true, opacity: 0.45, emissive: 0x7fc8ff, emissiveIntensity: 0.4 }), [0.1 - k * 0.25, 1.5 - k * 0.1, 1.2], [1.2, 0, 0.9 + k * 0.15]));
    const rina = kidneyChar(s, { who: 'rina', mood: 'angry', armL: { angle: -2.0, pose: 'puno' }, armR: { angle: 0.6, bend: -1.2, pose: 'puno' } });
    rina.root.position.set(-0.9, 0, 0.0); rina.root.scale.setScalar(0.55);
    const rony = kidneyChar(s, { who: 'rony', mood: 'angry', mirror: true, armL: { angle: -0.6, bend: -1.2, pose: 'puno' }, armR: { angle: 0.6, bend: -1.2, pose: 'puno' } });
    rony.root.position.set(0.95, 0, -0.2); rony.root.scale.setScalar(0.55);
    const c = cam(aspect, [0.2, 3.0, 9.5], [0, 2.0, 0], 42);
    const update = t => {
      flow(t);
      sugar.position.y = 3.1 + 0.18 * Math.abs(wave(t, 1.1)); sugar.rotation.z = -0.1 + 0.12 * wave(t, 1.1);
      cuff.scale.setScalar(0.9 * (1 + 0.07 * Math.max(0, wave(t, 1.8))));
      jets.forEach((j, k) => { j.material.opacity = 0.25 + 0.3 * (0.5 + 0.5 * wave(t, 6, k)); j.scale.y = 0.85 + 0.25 * (0.5 + 0.5 * wave(t, 6, k)); });
      setArm(rina.aL, -1, -2.0 - 0.15 * wave(t, 2.5)); rina.aL.el.rotation.z = -(0.25 + 0.35 * wave(t, 2.5)); rony.root.rotation.z = 0.06 * wave(t, 2.5);
      const u = ease(t / 0.5); // entrada con paneo rápido
      moveCam(c, [lerp(-2.4, 0.2, u), 3.0, 9.5], new THREE.Vector3(lerp(-1.8, 0, u), 2.0, 0));
    };
    return { layers: { main: { scene: s, camera: c, bloom: 0.6 } }, meta: {}, update };
  },

  office(aspect) {
    const s = new THREE.Scene(); s.background = gradientBg('#e8f4f2', '#cfe7e2');
    stdLights(s, { key: 0xfff4e4, keyI: 1.7, keyPos: [-5, 9, 7], hemiSky: 0xeaf6ff, hemiGround: 0x7d968f, hemiI: 0.55, rim: 0xffffff, rimI: 0.6 });
    add(s, new THREE.PlaneGeometry(40, 30), mat(0xd9ece8, { roughness: 0.95 }), [0, 7, -4]);
    add(s, new THREE.PlaneGeometry(40, 30), mat(0xb7a48a, { roughness: 0.8 }), [0, 0, 6], [-Math.PI / 2, 0, 0]);
    add(s, rbox(3.2, 2.4, 0.2, 0.05), mat(0xffffff), [-2.6, 5.0, -3.9]);
    add(s, rbox(2.9, 2.1, 0.22, 0.03), mat(0xcdeeff, { emissive: 0xbfe6ff, emissiveIntensity: 0.9 }), [-2.6, 5.0, -3.85]);
    add(s, rbox(0.06, 2.1, 0.25, 0.01), mat(0xffffff), [-2.6, 5.0, -3.8]);
    const poster = canvasTex(256, 360, (g, w, h) => { // póster de riñón sin texto
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8324a';
      for (const [cx, flip] of [[80, 1], [176, -1]]) { g.save(); g.translate(cx, 160); g.scale(flip, 1); g.beginPath(); g.ellipse(0, 0, 45, 75, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(40, 0, 18, 28, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a8324a'; g.restore(); }
      g.fillStyle = '#5a8fd8'; g.fillRect(30, 290, 196, 14); g.fillRect(30, 315, 140, 14);
    });
    add(s, new THREE.PlaneGeometry(1.5, 2.1), mat(0xffffff, { map: poster }), [2.4, 5.1, -3.88]);
    add(s, rbox(0.7, 0.9, 0.2, 0.06), mat(0xf0f0f0), [3.9, 4.6, -3.85]); add(s, cyl(0.22, 0.22, 0.05, 32), mat(0xffffff), [3.9, 4.7, -3.72], [Math.PI / 2, 0, 0]);
    const dr = itzel(s, { armR: { angle: 0.7, bend: -1.4 } }); dr.root.position.set(-1.25, 0, -0.5); dr.root.rotation.y = 0.35;
    const b = beto(s, { mood: 'surprised', thumbs: 'none', armL: { angle: 0.15 }, armR: { angle: 0.15 } }); b.root.position.set(1.35, 0, -0.6); b.root.rotation.y = -0.4; b.root.scale.setScalar(0.95);
    add(s, rbox(5.6, 0.18, 2.2, 0.06), mat(0x9a6b43, { roughness: 0.5, clearcoat: 0.3 }), [0, 1.7, 1.6]);
    add(s, rbox(5.4, 1.6, 0.1, 0.04), mat(0x7d5535), [0, 0.85, 2.6]);
    add(s, rbox(0.9, 0.04, 0.65, 0.02), mat(0xffffff), [1.6, 1.81, 1.4], [0, 0.2, 0]);
    const blood = bloodDetective(s, [-0.45, 1.79, 1.9], 0.62); blood.rotation.y = 0.25;
    const urine = urineDetective(s, [0.55, 1.79, 1.9], 0.62); urine.rotation.y = -0.2;
    const c = cam(aspect, [0, 3.2, 9.6], [0, 2.75, 0], 42);
    const update = t => {
      const pop = k => easeOutBack((t - 0.4 - k * 0.5) / 0.5); // los detectives aparecen con un "ta-dá"
      blood.scale.setScalar(0.62 * Math.max(0.001, pop(0))); urine.scale.setScalar(0.62 * Math.max(0.001, pop(1)));
      blood.position.y = 1.79 + 0.05 * Math.abs(wave(t, 1.3)); urine.position.y = 1.79 + 0.05 * Math.abs(wave(t, 1.3, 1));
      dr.aR.sh.rotation.z = 0.7 + 0.12 * wave(t, 0.8);
      b.head.rotation.z = 0.08 * wave(t, 0.4); b.head.rotation.x = -0.05 + 0.05 * wave(t, 0.7);
      moveCam(c, [0, 3.2, lerp(10.2, 9.2, ease(t / 8))]);
    };
    return { layers: { main: { scene: s, camera: c, bloom: 0.15 } }, meta: {}, update };
  },

  shields(aspect) {
    const s = new THREE.Scene(); const flow = plant(s);
    stdLights(s, { key: 0xfff1dc, keyI: 2.0, hemiSky: 0x3a7ca5, hemiGround: 0x0b1a28, hemiI: 0.8, rim: 0x6be38a, rimI: 1.6 });
    const units = nephronField(s, ['s0ss0', 'sss0s', 'ss0ss', '0ssss', 'ss0ss', 's0sss'], { z0: 1.2 });
    const shields = units.filter(u => u.shield).sort((a, b) => a.userData.ri - b.userData.ri || a.userData.ci - b.userData.ci);
    const rina = kidneyChar(s, { who: 'rina', mood: 'happy', armL: { angle: -0.4 }, armR: { angle: 2.5, bend: 0, bendZ: 0.1, pose: 'abierta' } });
    rina.root.position.set(-0.68, 0, 3.0); rina.root.scale.setScalar(0.45); rina.root.rotation.y = 0.35;
    const rony = kidneyChar(s, { who: 'rony', mood: 'happy', mirror: true, armL: { angle: -2.5, bend: 0, bendZ: 0.1, pose: 'abierta' }, armR: { angle: 0.4 } });
    rony.root.position.set(0.72, 0, 3.0); rony.root.scale.setScalar(0.45); rony.root.rotation.y = -0.35;
    const c = cam(aspect, [0, 2.6, 9.5], [0, 2.0, 0], 42);
    const update = t => {
      flow(t);
      shields.forEach((u, i) => u.shield.scale.setScalar(Math.max(0.001, easeOutBack((t - 0.3 - i * 0.07) / 0.35))));
      const hf = ease((t - 2.0) / 0.25) * (1 - ease((t - 2.6) / 0.3)); // choque de manos
      setArm(rina.aR, 1, 2.5 + 0.45 * hf); setArm(rony.aL, -1, -2.5 - 0.45 * hf);
      rina.root.position.x = -0.68 + 0.12 * hf; rony.root.position.x = 0.72 - 0.12 * hf;
      rina.root.position.y = rony.root.position.y = 0.05 * Math.abs(wave(t, 1.4));
      moveCam(c, [0, 2.6, lerp(9.9, 9.1, ease(t / 5))]);
    };
    return { layers: { main: { scene: s, camera: c, bloom: 0.8 } }, meta: {}, update };
  },

  kitchen(aspect) {
    const s = new THREE.Scene(); s.background = gradientBg('#fff1d6', '#ffd9a0');
    stdLights(s, { key: 0xffe6c0, keyI: 2.4, keyPos: [5, 9, 7], hemiSky: 0xfff3dc, hemiGround: 0x8a5a3a, hemiI: 0.9, rim: 0xffc890 });
    const tiles = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1f4e9c'; g.lineWidth = 6;
      g.beginPath(); g.arc(64, 64, 34, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 4; k++) { g.save(); g.translate(64, 64); g.rotate(k * Math.PI / 2); g.fillStyle = '#1f4e9c'; g.beginPath(); g.ellipse(0, -48, 9, 16, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f2b632'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill(); g.restore(); }
      g.strokeStyle = '#d8d0c0'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
    }, [16, 10]);
    add(s, new THREE.PlaneGeometry(30, 18), mat(0xffffff, { map: tiles, roughness: 0.3 }), [0, 6, -4]);
    add(s, new THREE.PlaneGeometry(30, 20), mat(0x8a5a3a, { roughness: 0.8 }), [0, 0, 5], [-Math.PI / 2, 0, 0]);
    add(s, rbox(8, 0.15, 1, 0.03), mat(0x7d5535), [0, 5.2, -3.5]);
    for (const [x, r] of [[-2.2, 0.55], [-0.9, 0.42], [1.4, 0.6]]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector2(r * (0.6 + 0.6 * Math.sin(u * Math.PI * 0.9)), u * r * 1.6)); }
      add(s, new THREE.LatheGeometry(pts, 40), mat(0xb5562b, { roughness: 0.75 }), [x, 5.28, -3.4]);
    }
    const b = beto(s, { mood: 'happy', thumbs: 'none', look: [0.3, -0.4], armL: { angle: 0.1, bend: -1.6 }, armR: { angle: 0.35, bend: -1.5 } });
    b.root.position.set(-0.75, 0.1, -0.9); b.root.rotation.y = 0.2;
    add(b.aL.el, rbox(0.5, 0.34, 0.34, 0.07), mat(0x222831, { roughness: 0.4 }), [0, -0.3, 0.12]);
    add(b.aL.el, rbox(0.34, 0.2, 0.02, 0.02), mat(0x9ef0c0, { emissive: 0x6be38a, emissiveIntensity: 0.8 }), [0, -0.3, 0.3]);
    add(s, rbox(7, 0.2, 3.0, 0.06), mat(0xc69c6d, { roughness: 0.6, clearcoat: 0.2 }), [0, 1.9, 0.6]);
    add(s, rbox(6.8, 1.9, 0.1, 0.04), mat(0xa77b4f), [0, 0.95, 2.05]);
    const salt = group(s, [-0.05, 2.0, 1.0]);
    add(salt, cyl(0.17, 0.2, 0.55, 32), mat(0xffffff, { transparent: true, opacity: 0.45, roughness: 0.05, clearcoat: 1 }), [0, 0.28, 0]);
    add(salt, cyl(0.15, 0.18, 0.4, 32), mat(0xffffff, { roughness: 0.9 }), [0, 0.22, 0]);
    add(salt, new THREE.SphereGeometry(0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc0c0c0, { metalness: 1, roughness: 0.2 }), [0, 0.55, 0]);
    const bp = group(s, [-0.85, 2.0, 1.35], [-0.5, 0.25, 0]);
    add(bp, rbox(0.62, 0.22, 0.42, 0.06), mat(0x222831, { roughness: 0.4 }), [0, 0.11, 0]);
    const bpScreen = add(bp, rbox(0.4, 0.02, 0.24, 0.01), mat(0x9ef0c0, { emissive: 0x6be38a, emissiveIntensity: 0.9 }), [0, 0.225, -0.02]);
    add(bp, rbox(0.9, 0.05, 0.32, 0.02), mat(0x30495f, { roughness: 0.8 }), [0, 0.03, 0.05]);
    const pills = group(s, [-1.6, 2.1, 1.75], [0, 0.5, -0.35], 1.3);
    add(pills, rbox(0.8, 0.3, 0.5, 0.04), mat(0xffffff, { roughness: 0.5 }));
    add(pills, rbox(0.82, 0.08, 0.52, 0.02), mat(0xd23b33), [0, 0.04, 0]);
    const k1 = kidneyChar(s, { who: 'rina', mood: 'happy', helmet: true, armL: { angle: -0.6 }, armR: { angle: 0.6 } }); k1.root.position.set(0.55, 2.0, 2.0); k1.root.scale.setScalar(0.28);
    const k2 = kidneyChar(s, { who: 'rony', mood: 'happy', mirror: true, armL: { angle: -0.6 }, armR: { angle: 0.6 } }); k2.root.position.set(1.6, 2.0, 2.0); k2.root.scale.setScalar(0.28);
    const heart = heartChar(s, [1.12, 2.5, 2.1], 0.3); heart.rotation.set(0, 0, 0.08);
    const c = cam(aspect, [0, 3.5, 10], [0, 2.7, 0], 42);
    const update = t => {
      bpScreen.material.emissiveIntensity = t < 2 ? (Math.floor(t * 4) % 2 ? 0.3 : 0.9) : 0.9; // mide y marca
      const ps = ease((t - 2.2) / 0.6); salt.position.x = lerp(-0.05, 0.25, ps); salt.position.z = lerp(1.0, 0.25, ps); // aparta el salero
      const pp = ease((t - 4.2) / 0.9); pills.position.x = lerp(-1.6, -3.2, pp); pills.position.y = 2.1 - 1.2 * Math.max(0, pp - 0.6) / 0.4; pills.rotation.z = -0.35 - 1.2 * pp; // fuera las pastillas
      const hb = beat(t); heart.scale.setScalar(0.3 * (1 + 0.1 * hb)); heart.position.y = 2.5 + (t > 6.2 ? 0.25 * ease((t - 6.2) / 0.5) : 0);
      k1.root.position.y = 2.0 + 0.03 * Math.abs(wave(t, 1.3)); k2.root.position.y = 2.0 + 0.03 * Math.abs(wave(t, 1.3, 1));
      b.head.rotation.x = 0.06 * wave(t, 0.8); b.root.position.y = 0.1 + 0.02 * wave(t, 0.8);
      moveCam(c, [lerp(-0.3, 0.3, ease(t / 9)), 3.5, 10]);
    };
    return { layers: { main: { scene: s, camera: c, bloom: 0.2 } }, meta: {}, update };
  },
};

export const SCENE_LIST = {
  1: ['street_hook', {}], 2: ['plant_intro', {}], 3: ['split_silent', {}], 4: ['villains', {}],
  5: ['office', {}], 6: ['shields', {}], 7: ['kitchen', {}], 8: ['street_hook', { ending: true }],
};
