// Escenas del video. Cada escena devuelve capas { nombre: { scene, camera, bloom } } y metadatos.
// Las capas se componen después en compose.py (ventana de rayos X, pantalla dividida).
import * as THREE from 'three';
import {
  C, mat, glow, add, group, sphere, capsule, rbox, cyl, tube, canvasTex, gradientBg,
  kidneyChar, beto, itzel, nephronUnit, sugarCube, bpCuff, bloodDetective, urineDetective, heartChar, taxi, stdLights,
} from './lib.js';

const cam = (aspect, pos, target, fov = 38) => {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
  c.position.set(...pos); c.lookAt(...target); c.updateMatrixWorld(); return c;
};

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
  // papel picado
  const cols = [0xe63946, 0xf4a261, 0x2a9d8f, 0x8e6bbf, 0xffd23f, 0x3a86ff];
  add(scene, tube([[-8, 7.2, -5], [0, 6.6, -5], [8, 7.2, -5]], 0.02), mat(0x333333));
  for (let i = 0; i < 22; i++) {
    const x = -7.6 + i * 0.72, y = 6.6 + 0.6 * Math.pow(x / 8, 2) - 0.35;
    add(scene, new THREE.PlaneGeometry(0.55, 0.65), mat(cols[i % 6], { side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.95 }), [x, y, -5], [0, 0, (i % 3 - 1) * 0.08]);
  }
}

function plant(scene, { mood = 'normal' } = {}) {
  const purple = mood === 'villain';
  scene.background = purple ? gradientBg('#2b1840', '#542a5c') : gradientBg('#0b1a28', '#1c4766');
  scene.fog = new THREE.Fog(purple ? 0x3a2050 : 0x10293d, 14, 34);
  add(scene, new THREE.PlaneGeometry(60, 60), mat(purple ? 0x2a1838 : 0x0f2a3d, { roughness: 0.35, metalness: 0.3 }), [0, 0, -10], [-Math.PI / 2, 0, 0]);
  for (let z = 4; z > -30; z -= 2) add(scene, rbox(14, 0.02, 0.06, 0.01), glow(purple ? 0x7a3a9a : 0x1f6f8b, 0.6), [0, 0.01, z]);
  // tubería de entrada (sangre) con glóbulos rojos
  const pipeY = 5.2;
  add(scene, cyl(0.55, 0.55, 30, 48), mat(0xff6b6b, { transparent: true, opacity: 0.35, roughness: 0.05, clearcoat: 1 }), [0, pipeY, -3], [0, 0, Math.PI / 2]);
  for (let i = 0; i < 26; i++) add(scene, new THREE.TorusGeometry(0.18, 0.1, 16, 32), mat(0xc8102e, { roughness: 0.35, clearcoat: 0.5 }), [-12 + i * 0.95, pipeY + Math.sin(i * 1.7) * 0.2, -3 + Math.cos(i) * 0.2], [i, i * 0.5, 0], [1, 1, 0.55]);
  // tubería de salida (limpia)
  add(scene, cyl(0.45, 0.45, 30, 48), mat(0x9ef0ff, { transparent: true, opacity: 0.4, roughness: 0.05, clearcoat: 1, emissive: 0x3aa7c9, emissiveIntensity: 0.3 }), [0, 0.5, -16], [0, 0, Math.PI / 2]);
  // pilares
  for (const x of [-4.6, 4.6]) for (let z = 2; z > -28; z -= 6) add(scene, rbox(0.6, 9, 0.6, 0.1), mat(purple ? 0x3a2550 : 0x163a52, { roughness: 0.5 }), [x, 4.5, z]);
}

// Rejilla de nefronas: patrón por filas (1 encendida, 0 apagada, 's' encendida con escudo)
function nephronField(scene, rows, { x0 = -2.4, dx = 1.2, z0 = 1, dz = -2.2, y = 1.15, crystals = null } = {}) {
  const units = [];
  rows.forEach((row, ri) => row.split('').forEach((c, ci) => {
    const p = [x0 + ci * dx, y, z0 + ri * dz];
    add(scene, rbox(1.0, 0.5, 0.7, 0.08), mat(0x23455c, { roughness: 0.4 }), [p[0], 0.25, p[2]]);
    const u = nephronUnit(scene, p, c !== '0', c === 's');
    units.push(u);
    if (crystals && crystals.includes(`${ri},${ci}`)) for (let k = 0; k < 6; k++)
      add(u, new THREE.OctahedronGeometry(0.07 + (k % 3) * 0.02), mat(0xffffff, { roughness: 0.05, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.2 }), [Math.sin(k * 2) * 0.35, Math.cos(k * 3) * 0.45, 0.3], [k, k, 0]);
  }));
  return units;
}

function bulb(parent, p, color, s = 1) {
  const g = group(parent, p, [0, 0, 0], s);
  add(g, sphere(0.3), glow(color, 1.8));
  add(g, cyl(0.16, 0.16, 0.22, 24), mat(0x8a8a8a, { metalness: 0.9, roughness: 0.3 }), [0, -0.36, 0]);
  const pl = new THREE.PointLight(color, 3, 4); g.add(pl);
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
    const layers = {};
    for (const mode of ['main', 'xray']) {
      const s = new THREE.Scene();
      street(s, { sunset: ending });
      stdLights(s, ending ? { key: 0xffb070, keyI: 2.4, keyPos: [-8, 6, 6], hemiSky: 0xffb38a, hemiGround: 0x4a2a4a, rim: 0xff8a5a, rimI: 2 } : {});
      taxi(s, [2.6, 0, -2.2], [0, -0.45, 0], 1);
      const b = beto(s, { mood: 'happy', thumbs: 'right', armR: { angle: 0.55, bend: -2.0 }, armL: { angle: 0.12 } });
      b.root.position.set(0.35, 0, 1.2);
      if (mode === 'xray') {
        s.children.filter(o => o !== b.root && !o.isLight).forEach(o => (o.visible = false));
        xrayify(b.root, s);
        const k = group(b.root, [0, 1.25, 0.05], [0, 0, 0], 0.32);
        const left = kidneyChar(k, { who: 'rina', mood: ending ? 'happy' : 'sweat', legs: false, armL: { angle: ending ? -0.2 : -0.5 }, armR: ending ? { angle: 2.6, thumb: true } : { angle: 0.5 } });
        left.root.position.set(1.1, 0, 0);
        const right = kidneyChar(k, { who: 'rony', mood: ending ? 'happy' : 'sweat', legs: false, mirror: true, armL: ending ? { angle: -2.6, thumb: true } : { angle: -0.5 }, armR: { angle: 0.3 } });
        right.root.position.set(-1.2, 0, 0);
        bulb(k, [0, 3.7, 0], ending ? C.ok : C.alert, 1.1);
      }
      layers[mode] = { scene: s, camera: cam(aspect, [0.6, 2.7, 13], [0.6, 2.35, 0], 36), bloom: mode === 'xray' ? 0.7 : 0.25 };
    }
    // rectángulo de la ventana: torso de Beto proyectado
    const meta = { xrayBox: [[-0.55, 1.05, 2.0], [1.25, 2.75, 2.0]] };
    return { layers, meta };
  },

  plant_intro(aspect) {
    const s = new THREE.Scene(); plant(s);
    stdLights(s, { key: 0xcfefff, keyI: 1.6, hemiSky: 0x3a7ca5, hemiGround: 0x0b1a28, hemiI: 0.7, rim: 0x5fd3ff, rimI: 1.2 });
    nephronField(s, ['11111', '11111', '11111', '11111', '11111', '11111', '11111'], { z0: 0.5 });
    const rina = kidneyChar(s, { who: 'rina', mood: 'happy', armL: { angle: -0.4 }, armR: { angle: 1.6, bend: 0 } });
    rina.root.position.set(-0.95, 0, 3.4); rina.root.rotation.y = 0.3; rina.root.scale.setScalar(0.5);
    const rony = kidneyChar(s, { who: 'rony', mood: 'happy', mirror: true, armL: { angle: -2.4 }, armR: { angle: 0.4 } });
    rony.root.position.set(1.0, 0, 3.3); rony.root.rotation.y = -0.3; rony.root.scale.setScalar(0.5);
    return { layers: { main: { scene: s, camera: cam(aspect, [0, 2.4, 9.5], [0, 1.9, 0], 42), bloom: 0.75 } }, meta: {} };
  },

  split_silent(aspect) {
    // arriba: Beto cantando en el taxi; abajo: filtros que se apagan
    const top = new THREE.Scene(); street(top);
    stdLights(top);
    taxi(top, [0, 0, 0], [0, 0, 0], 1, true);
    const b = beto(top, { sing: true, thumbs: 'none', armL: { angle: 0.1, bend: -1.2 }, armR: { angle: 0.1, bend: -1.2 } });
    b.root.position.set(0.3, 0.3, 0.1); b.root.scale.setScalar(0.4);
    const notes = mat(0x1d3557);
    [[1.4, 2.6, 0.5], [1.9, 3.0, 0.4]].forEach(([x, y, z], i) => { add(top, sphere(0.12), notes, [x, y, z], [0, 0, 0], [1.2, 0.9, 0.6]); add(top, rbox(0.03, 0.45, 0.03, 0.01), notes, [x + 0.12, y + 0.22, z]); });
    const bottom = new THREE.Scene(); plant(bottom);
    stdLights(bottom, { key: 0xcfefff, keyI: 1.4, hemiSky: 0x3a7ca5, hemiGround: 0x0b1a28, hemiI: 0.6, rim: 0x5fd3ff });
    nephronField(bottom, ['10110', '01101', '11010', '10011', '01110', '10101'], { z0: 0.3 });
    const rony = kidneyChar(bottom, { who: 'rony', mood: 'sweat', mirror: true, armL: { angle: -0.4 }, armR: { angle: 2.2, bend: -0.8 } });
    rony.root.position.set(1.0, 0, 3.6); rony.root.scale.setScalar(0.62); rony.root.rotation.y = -0.4;
    const rina = kidneyChar(bottom, { who: 'rina', mood: 'worried', armL: { angle: -1.2 }, armR: { angle: 1.2 } });
    rina.root.position.set(-1.2, 0, 2.6); rina.root.scale.setScalar(0.55); rina.root.rotation.set(0, 0.6, 0.12);
    return {
      layers: {
        top: { scene: top, camera: cam(aspect * 2, [0.2, 1.8, 6.2], [0.1, 1.35, 0], 38), bloom: 0.2 },
        bottom: { scene: bottom, camera: cam(aspect * 2, [0, 2.6, 8.5], [0, 1.4, 0], 42), bloom: 0.75 },
      }, meta: {},
    };
  },

  villains(aspect) {
    const s = new THREE.Scene(); plant(s, { mood: 'villain' });
    stdLights(s, { key: 0xffd6f0, keyI: 1.8, hemiSky: 0x9a6ad0, hemiGround: 0x2b1840, hemiI: 0.9, rim: 0xff6bd6, rimI: 2 });
    nephronField(s, ['10110', '11011', '11101', '10111', '11111'], { z0: -1.2, crystals: ['0,0', '0,3', '1,1', '1,4', '2,2'] });
    sugarCube(s, [-1.05, 3.1, 2.5], 1.05).rotation.set(0.1, 0.35, -0.1);
    bpCuff(s, [1.0, 2.0, 2.2], 0.9).rotation.set(0, -0.35, 0.05);
    // chorros de presión
    for (let k = 0; k < 3; k++) add(s, cyl(0.04, 0.12, 1.6, 16), mat(0xbfe3ff, { transparent: true, opacity: 0.45, emissive: 0x7fc8ff, emissiveIntensity: 0.4 }), [0.1 - k * 0.25, 1.5 - k * 0.1, 1.2], [1.2, 0, 0.9 + k * 0.15]);
    const rina = kidneyChar(s, { who: 'rina', mood: 'angry', armL: { angle: -2.0 }, armR: { angle: 0.6, bend: -1.2 } });
    rina.root.position.set(-0.9, 0, 0.0); rina.root.scale.setScalar(0.55);
    const rony = kidneyChar(s, { who: 'rony', mood: 'angry', mirror: true, armL: { angle: -0.6, bend: -1.2 }, armR: { angle: 0.6, bend: -1.2 } });
    rony.root.position.set(0.95, 0, -0.2); rony.root.scale.setScalar(0.55);
    return { layers: { main: { scene: s, camera: cam(aspect, [0.2, 3.0, 9.5], [0, 2.0, 0], 42), bloom: 0.6 } }, meta: {} };
  },

  office(aspect) {
    const s = new THREE.Scene(); s.background = gradientBg('#e8f4f2', '#cfe7e2');
    stdLights(s, { key: 0xfff4e4, keyI: 1.7, keyPos: [-5, 9, 7], hemiSky: 0xeaf6ff, hemiGround: 0x7d968f, hemiI: 0.55, rim: 0xffffff, rimI: 0.6 });
    add(s, new THREE.PlaneGeometry(40, 30), mat(0xd9ece8, { roughness: 0.95 }), [0, 7, -4]);
    add(s, new THREE.PlaneGeometry(40, 30), mat(0xb7a48a, { roughness: 0.8 }), [0, 0, 6], [-Math.PI / 2, 0, 0]);
    add(s, rbox(3.2, 2.4, 0.2, 0.05), mat(0xffffff), [-2.6, 5.0, -3.9]);
    add(s, rbox(2.9, 2.1, 0.22, 0.03), mat(0xcdeeff, { emissive: 0xbfe6ff, emissiveIntensity: 0.9 }), [-2.6, 5.0, -3.85]);
    add(s, rbox(0.06, 2.1, 0.25, 0.01), mat(0xffffff), [-2.6, 5.0, -3.8]);
    // póster de riñón sin texto
    const poster = canvasTex(256, 360, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8324a';
      for (const [cx, flip] of [[80, 1], [176, -1]]) { g.save(); g.translate(cx, 160); g.scale(flip, 1); g.beginPath(); g.ellipse(0, 0, 45, 75, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(40, 0, 18, 28, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#a8324a'; g.restore(); }
      g.fillStyle = '#5a8fd8'; g.fillRect(30, 290, 196, 14); g.fillRect(30, 315, 140, 14);
    });
    add(s, new THREE.PlaneGeometry(1.5, 2.1), mat(0xffffff, { map: poster }), [2.4, 5.1, -3.88]);
    add(s, rbox(0.7, 0.9, 0.2, 0.06), mat(0xf0f0f0), [3.9, 4.6, -3.85]); add(s, cyl(0.22, 0.22, 0.05, 32), mat(0xffffff), [3.9, 4.7, -3.72], [Math.PI / 2, 0, 0]);
    const dr = itzel(s, { armR: { angle: 0.7, bend: -1.4 } }); dr.root.position.set(-1.25, 0, -0.5); dr.root.rotation.y = 0.35;
    const b = beto(s, { mood: 'surprised', thumbs: 'none', armL: { angle: 0.15 }, armR: { angle: 0.15 } }); b.root.position.set(1.35, 0, -0.6); b.root.rotation.y = -0.4; b.root.scale.setScalar(0.95);
    // escritorio
    add(s, rbox(5.6, 0.18, 2.2, 0.06), mat(0x9a6b43, { roughness: 0.5, clearcoat: 0.3 }), [0, 1.7, 1.6]);
    add(s, rbox(5.4, 1.6, 0.1, 0.04), mat(0x7d5535), [0, 0.85, 2.6]);
    add(s, rbox(0.9, 0.04, 0.65, 0.02), mat(0xffffff), [1.6, 1.81, 1.4], [0, 0.2, 0]);
    bloodDetective(s, [-0.45, 1.79, 1.9], 0.62).rotation.y = 0.25;
    urineDetective(s, [0.55, 1.79, 1.9], 0.62).rotation.y = -0.2;
    return { layers: { main: { scene: s, camera: cam(aspect, [0, 3.2, 9.6], [0, 2.75, 0], 42), bloom: 0.15 } }, meta: {} };
  },

  shields(aspect) {
    const s = new THREE.Scene(); plant(s);
    stdLights(s, { key: 0xfff1dc, keyI: 2.0, hemiSky: 0x3a7ca5, hemiGround: 0x0b1a28, hemiI: 0.8, rim: 0x6be38a, rimI: 1.6 });
    nephronField(s, ['s0ss0', 'sss0s', 'ss0ss', '0ssss', 'ss0ss', 's0sss'], { z0: 1.2 });
    const rina = kidneyChar(s, { who: 'rina', mood: 'happy', armL: { angle: -0.4 }, armR: { angle: 2.5, bend: 0 } });
    rina.root.position.set(-0.68, 0, 3.0); rina.root.scale.setScalar(0.45); rina.root.rotation.y = 0.35;
    const rony = kidneyChar(s, { who: 'rony', mood: 'happy', mirror: true, armL: { angle: -2.5, bend: 0 }, armR: { angle: 0.4 } });
    rony.root.position.set(0.72, 0, 3.0); rony.root.scale.setScalar(0.45); rony.root.rotation.y = -0.35;
    return { layers: { main: { scene: s, camera: cam(aspect, [0, 2.6, 9.5], [0, 2.0, 0], 42), bloom: 0.8 } }, meta: {} };
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
    // repisa con ollas de barro
    add(s, rbox(8, 0.15, 1, 0.03), mat(0x7d5535), [0, 5.2, -3.5]);
    for (const [x, r] of [[-2.2, 0.55], [-0.9, 0.42], [1.4, 0.6]]) {
      const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(r * (0.6 + 0.6 * Math.sin(t * Math.PI * 0.9)), t * r * 1.6)); }
      add(s, new THREE.LatheGeometry(pts, 40), mat(0xb5562b, { roughness: 0.75 }), [x, 5.28, -3.4]);
    }
    const b = beto(s, { mood: 'happy', thumbs: 'none', look: [0.3, -0.4], armL: { angle: 0.1, bend: -1.6 }, armR: { angle: 0.35, bend: -1.5 } });
    b.root.position.set(-0.75, 0.1, -0.9); b.root.rotation.y = 0.2;
    // baumanómetro digital de muñeca (pantalla hacia arriba con el antebrazo apoyado)
    add(b.aL.el, rbox(0.5, 0.34, 0.34, 0.07), mat(0x222831, { roughness: 0.4 }), [0, -0.3, 0.12]);
    add(b.aL.el, rbox(0.34, 0.2, 0.02, 0.02), mat(0x9ef0c0, { emissive: 0x6be38a, emissiveIntensity: 0.8 }), [0, -0.3, 0.3]);
    // mesa
    add(s, rbox(7, 0.2, 3.0, 0.06), mat(0xc69c6d, { roughness: 0.6, clearcoat: 0.2 }), [0, 1.9, 0.6]);
    add(s, rbox(6.8, 1.9, 0.1, 0.04), mat(0xa77b4f), [0, 0.95, 2.05]);
    // salero (apartado) y caja de pastillas saliendo
    const salt = group(s, [-0.05, 2.0, 1.0]);
    add(salt, cyl(0.17, 0.2, 0.55, 32), mat(0xffffff, { transparent: true, opacity: 0.45, roughness: 0.05, clearcoat: 1 }), [0, 0.28, 0]);
    add(salt, cyl(0.15, 0.18, 0.4, 32), mat(0xffffff, { roughness: 0.9 }), [0, 0.22, 0]);
    add(salt, new THREE.SphereGeometry(0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc0c0c0, { metalness: 1, roughness: 0.2 }), [0, 0.55, 0]);
    // baumanómetro digital sobre la mesa, con pantalla verde visible
    const bp = group(s, [-0.85, 2.0, 1.35], [-0.5, 0.25, 0]);
    add(bp, rbox(0.62, 0.22, 0.42, 0.06), mat(0x222831, { roughness: 0.4 }), [0, 0.11, 0]);
    add(bp, rbox(0.4, 0.02, 0.24, 0.01), mat(0x9ef0c0, { emissive: 0x6be38a, emissiveIntensity: 0.9 }), [0, 0.225, -0.02]);
    add(bp, rbox(0.9, 0.05, 0.32, 0.02), mat(0x30495f, { roughness: 0.8 }), [0, 0.03, 0.05]);
    const pills = group(s, [-1.6, 2.1, 1.75], [0, 0.5, -0.35], 1.3);
    add(pills, rbox(0.8, 0.3, 0.5, 0.04), mat(0xffffff, { roughness: 0.5 }));
    add(pills, rbox(0.82, 0.08, 0.52, 0.02), mat(0xd23b33), [0, 0.04, 0]);
    // órganos en primer plano
    const k1 = kidneyChar(s, { who: 'rina', mood: 'happy', helmet: true, armL: { angle: -0.6 }, armR: { angle: 0.6 } }); k1.root.position.set(0.55, 2.0, 2.0); k1.root.scale.setScalar(0.28);
    const k2 = kidneyChar(s, { who: 'rony', mood: 'happy', mirror: true, armL: { angle: -0.6 }, armR: { angle: 0.6 } }); k2.root.position.set(1.6, 2.0, 2.0); k2.root.scale.setScalar(0.28);
    heartChar(s, [1.12, 2.5, 2.1], 0.3).rotation.set(0, 0, 0.08);
    return { layers: { main: { scene: s, camera: cam(aspect, [0, 3.5, 10], [0, 2.7, 0], 42), bloom: 0.2 } }, meta: {} };
  },
};

export const SCENE_LIST = {
  1: ['street_hook', {}], 2: ['plant_intro', {}], 3: ['split_silent', {}], 4: ['villains', {}],
  5: ['office', {}], 6: ['shields', {}], 7: ['kitchen', {}], 8: ['street_hook', { ending: true }],
};
