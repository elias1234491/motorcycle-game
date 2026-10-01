// Baut das 3D-Büro im Stil von "Scam With Your Friends": Schreibtisch-Inseln mit dunkelblauen Trennwänden,
// Klebezettel, bunte Monitore mit Webcam, Küche mit Whiteboard, roter Besprechungstisch, warmes Licht.
import * as THREE from 'three';

export const ROOM = { minX: -12, maxX: 12, minZ: -8, maxZ: 8, h: 3.2 };
export const GLASS_X = 4;
export const DOOR = { z0: -1, z1: 1 };

export const FONT = {
  ui: '"Rubik", "Segoe UI", Arial, sans-serif',
  name: '"Fredoka", "Rubik", Arial, sans-serif',
  hand: '"Permanent Marker", "Comic Sans MS", cursive',
};

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });

function box(w, h, d, material, x, y, z, parent, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Sprechblase / Schild
export function textSprite(text, color = '#fff', bg = 'rgba(0,0,0,0.55)', scale = 1) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(4, 4, 504, 120, 30); g.fill();
  g.fillStyle = color;
  g.font = `600 50px ${FONT.ui}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66, 490);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(1.6 * scale, 0.4 * scale, 1);
  s.renderOrder = 10;
  return s;
}

// Großer weißer Name mit dunkler Kontur über dem Kopf (wie im Original)
export function nameSprite(text) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `700 96px ${FONT.name}`;
  const w = Math.ceil(g.measureText(text).width) + 40;
  c.width = w; c.height = 140;
  g.font = `700 96px ${FONT.name}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 14; g.strokeStyle = 'rgba(40,25,15,0.9)';
  g.strokeText(text, w / 2, 74);
  g.fillStyle = '#fff6ea';
  g.fillText(text, w / 2, 74);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w / 140 * 0.42, 0.42, 1);
  s.renderOrder = 11;
  return s;
}

function stickyNote(text, color = '#ffe46b') {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = color; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, 0, 128, 14);
    g.fillStyle = '#2b2620';
    g.font = `26px ${FONT.hand}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = text.split(' ');
    const lines = []; let line = '';
    for (const w of words) { if ((line + ' ' + w).trim().length > 9) { lines.push(line.trim()); line = w; } else line += ' ' + w; }
    lines.push(line.trim());
    lines.forEach((l, i) => g.fillText(l, 64, 64 + (i - (lines.length - 1) / 2) * 30));
  });
}

// Bildschirminhalte der Monitore (bunt wie im Original)
function screenTextures() {
  const swirl = canvasTex(256, 160, (g, w, h) => {
    for (let r = 220; r > 0; r -= 14) {
      g.fillStyle = `hsl(${(r * 3) % 360},90%,${50 + (r % 28)}%)`;
      g.beginPath(); g.arc(w / 2, h / 2, r, 0, Math.PI * 2); g.fill();
    }
  });
  const desktop = canvasTex(256, 160, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#f7a35c'); sky.addColorStop(0.55, '#e8627c'); sky.addColorStop(1, '#2d3d6b');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a2140';
    g.beginPath(); g.moveTo(0, 120); g.lineTo(60, 70); g.lineTo(110, 105); g.lineTo(170, 55); g.lineTo(256, 110); g.lineTo(256, 160); g.lineTo(0, 160); g.fill();
    g.fillStyle = '#16203a'; g.fillRect(0, 148, w, 12);
    const cols = ['#2f7de1', '#2fb35a', '#f0a020', '#e2533a'];
    for (let i = 0; i < 4; i++) { g.fillStyle = cols[i]; g.fillRect(8, 8 + i * 26, 18, 18); }
  });
  const chat = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#1b2240'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2b3566'; g.fillRect(150, 0, 106, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#3a6fd8' : '#b8452e'; g.fillRect(i % 2 ? 160 : 186, 10 + i * 24, 60, 16); }
    g.fillStyle = '#d6dbe8'; for (let i = 0; i < 8; i++) g.fillRect(10, 12 + i * 17, 60 + (i * 37) % 70, 8);
  });
  const casino = canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = '#28124a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${i * 37 % 360},90%,60%)`; g.beginPath(); g.arc((i * 53) % w, (i * 29) % h, 4 + (i % 5), 0, 7); g.fill(); }
    g.fillStyle = '#ffd94a'; g.font = 'bold 30px Arial'; g.fillText('JACKPOT', 60, 90);
  });
  return [desktop, swirl, chat, casino];
}

export function buildOffice(scene) {
  const colliders = [];
  const interactables = [];
  const solids = [];           // Meshes, an denen die Kamera stoppt
  const addCollider = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  scene.fog = new THREE.Fog(0x2b1c16, 16, 34);

  // ---------- Licht: warm, orange getönt ----------
  const hemi = new THREE.HemisphereLight(0xffd6a8, 0x3a2a3a, 1.1);
  scene.add(hemi);
  const lights = [];
  const panelM = mat(0xfff4dc, { emissive: 0xfff0d0, emissiveIntensity: 1.4 });
  for (const x of [-8, -4, 0]) for (const z of [-5, 0, 5]) {
    const l = new THREE.PointLight(0xffc98c, 9, 11, 1.8);
    l.position.set(x, ROOM.h - 0.25, z);
    scene.add(l); lights.push(l);
    box(1.6, 0.05, 0.35, panelM, x, ROOM.h - 0.03, z, scene, false);
  }
  for (const z of [-4, 4]) {
    const l = new THREE.PointLight(0xffc98c, 9, 11, 1.8);
    l.position.set(8, ROOM.h - 0.25, z); scene.add(l); lights.push(l);
    box(1.6, 0.05, 0.35, panelM, 8, ROOM.h - 0.03, z, scene, false);
  }
  const sun = new THREE.DirectionalLight(0xffb070, 0.9);
  sun.position.set(-8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10 });
  scene.add(sun);

  // ---------- Boden (Teppich), Decke (Rasterplatten), Wände ----------
  const carpet = canvasTex(256, 256, (g) => {
    g.fillStyle = '#5b5d66'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2; g.strokeRect(0, 0, 256, 256);
  });
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(12, 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);
  const ceilTex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#d8d0c2'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#a89f90'; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128);
  });
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping; ceilTex.repeat.set(16, 11);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h;
  scene.add(ceil);
  const wallM = mat(0xcfc6b8), trimM = mat(0x2c3550);
  for (const [w, d, x, z] of [[24, 0.2, 0, ROOM.minZ - 0.1], [24, 0.2, 0, ROOM.maxZ + 0.1], [0.2, 16, ROOM.minX - 0.1, 0], [0.2, 16, ROOM.maxX + 0.1, 0]]) {
    solids.push(box(w, ROOM.h, d, wallM, x, ROOM.h / 2, z, scene, false));
    box(w + 0.01, 0.9, d + 0.02, trimM, x, 0.45, z, scene, false); // dunkle Sockelverkleidung
  }

  // ---------- Glaswand Chefbüro ----------
  const glass = new THREE.MeshStandardMaterial({ color: 0xa8d4ff, transparent: true, opacity: 0.22, roughness: 0.05 });
  const g1 = DOOR.z0 - ROOM.minZ, g2 = ROOM.maxZ - DOOR.z1;
  box(0.08, ROOM.h, g1, glass, GLASS_X, ROOM.h / 2, ROOM.minZ + g1 / 2, scene, false);
  box(0.08, ROOM.h, g2, glass, GLASS_X, ROOM.h / 2, DOOR.z1 + g2 / 2, scene, false);
  box(0.12, 0.12, 16, trimM, GLASS_X, ROOM.h - 0.06, 0, scene, false);
  addCollider(GLASS_X, ROOM.minZ + g1 / 2, 0.2, g1);
  addCollider(GLASS_X, DOOR.z1 + g2 / 2, 0.2, g2);
  const sign = textSprite('CHEF · H. BRENNER', '#ffd25a', 'rgba(50,20,10,0.9)');
  sign.position.set(GLASS_X - 0.05, 2.65, 0);
  scene.add(sign);

  // ---------- Schreibtisch-Inseln ----------
  const screens = screenTextures();
  const deskM = mat(0xd9c7a8), legM = mat(0x2a2d33, { metalness: 0.4, roughness: 0.5 });
  const partM = mat(0x34436e), monM = mat(0x1a1c22), keyM = mat(0xdedede), chairM = mat(0x8e8c88);
  const notes = ['WACH BLEIBEN', 'QUOTE!!', 'Oma Gertrud zurückrufen', 'Lächeln am Telefon', 'Code: 029-527', 'Kaffee = Leben', 'NICHT auflegen', 'Chef = 😡'];
  const desks = [];
  const islandX = [-8.4, -6.5, -4.6, -2.7];
  for (const z0 of [-3.6, 2.6]) {
    // Trennwand in der Mitte der Insel
    solids.push(box(7.9, 1.25, 0.08, partM, -5.55, 0.62, z0, scene));
    box(7.95, 0.05, 0.12, mat(0x8a93a8), -5.55, 1.26, z0, scene);
    addCollider(-5.55, z0, 8.0, 2.0);
    for (const dir of [1, -1]) {
      const zc = z0 - dir * 0.5;
      for (const x of islandX) {
        const g = new THREE.Group();
        scene.add(g);
        box(1.75, 0.05, 0.85, deskM, x, 0.75, zc, g);
        for (const lx of [-0.8, 0.8]) box(0.05, 0.75, 0.75, legM, x + lx, 0.375, zc, g);
        // Monitor + Webcam
        const mz = zc + dir * 0.22;
        box(0.78, 0.48, 0.05, monM, x, 1.12, mz, g);
        box(0.06, 0.2, 0.06, monM, x, 0.87, mz, g);
        box(0.3, 0.02, 0.18, monM, x, 0.785, mz, g);
        const scrMat = new THREE.MeshBasicMaterial({ map: screens[Math.floor(Math.random() * screens.length)], color: 0xffffff });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.42), scrMat);
        screen.position.set(x, 1.12, mz - dir * 0.028);
        screen.rotation.y = dir > 0 ? Math.PI : 0;
        g.add(screen);
        box(0.12, 0.05, 0.05, monM, x, 1.39, mz, g);
        box(0.025, 0.025, 0.01, mat(0x220000, { emissive: 0xff2020, emissiveIntensity: 2 }), x + 0.035, 1.39, mz - dir * 0.03, g, false);
        // Tastatur, Maus, Telefon
        box(0.5, 0.02, 0.16, keyM, x, 0.785, zc - dir * 0.12, g);
        box(0.06, 0.02, 0.09, keyM, x + 0.36, 0.785, zc - dir * 0.12, g);
        const phone = box(0.2, 0.06, 0.17, mat(0x2b2b2b), x - 0.62, 0.81, zc + dir * 0.05, g);
        const phoneLight = box(0.04, 0.02, 0.04, mat(0x330000, { emissive: 0xff2020, emissiveIntensity: 0 }), x - 0.55, 0.85, zc + dir * 0.0, g, false);
        // Klebezettel an der Trennwand
        if (Math.random() < 0.7) {
          const n = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map: stickyNote(notes[Math.floor(Math.random() * notes.length)], Math.random() < 0.8 ? '#ffe46b' : '#ffb3c7') }));
          n.position.set(x + (Math.random() < 0.5 ? -0.55 : 0.5), 1.05 + Math.random() * 0.15, z0 - dir * 0.045);
          n.rotation.y = dir > 0 ? Math.PI : 0; n.rotation.z = (Math.random() - 0.5) * 0.3;
          g.add(n);
        }
        // Stuhl
        const chairZ = zc - dir * 0.78;
        const chair = new THREE.Group(); chair.position.set(x, 0, chairZ); g.add(chair);
        box(0.5, 0.07, 0.48, chairM, 0, 0.47, 0, chair);
        box(0.5, 0.55, 0.06, chairM, 0, 0.8, -dir * 0.24, chair);
        box(0.05, 0.42, 0.05, legM, 0, 0.23, 0, chair);
        box(0.5, 0.03, 0.05, legM, 0, 0.03, 0, chair); box(0.05, 0.03, 0.5, legM, 0, 0.03, 0, chair);
        const index = desks.length;
        const desk = {
          index, x, z: zc, dir, screen, phone, phoneLight, occupant: null,
          rotY: dir > 0 ? Math.PI : 0,
          chairPos: new THREE.Vector3(x, 0, chairZ),
          standPos: new THREE.Vector3(x, 0, zc - dir * 1.55),
          webcam: new THREE.Vector3(x + 0.035, 1.37, mz - dir * 0.08),
        };
        desks.push(desk);
        interactables.push({ mesh: screen, type: 'desk', data: desk });
        interactables.push({ mesh: phone, type: 'desk', data: desk });
      }
    }
  }

  // ---------- Küche mit Whiteboard ----------
  const counterM = mat(0xb9a07c), cabM = mat(0xe8e2d6);
  box(0.7, 0.9, 5.2, cabM, -11.6, 0.45, 4.6, scene);
  box(0.75, 0.05, 5.25, counterM, -11.6, 0.92, 4.6, scene);
  box(0.4, 0.9, 5.2, cabM, -11.75, 2.2, 4.6, scene); // Hängeschränke
  addCollider(-11.6, 4.6, 0.8, 5.3);
  const fridge = box(0.8, 1.9, 0.75, mat(0xf2f2f2, { roughness: 0.4 }), -11.55, 0.95, 7.5, scene);
  box(0.03, 0.6, 0.04, legM, -11.13, 1.2, 7.25, scene);
  addCollider(-11.55, 7.5, 0.85, 0.8);
  box(0.45, 0.28, 0.35, mat(0x3a3a3a), -11.6, 1.09, 3.0, scene); // Mikrowelle
  box(0.3, 0.2, 0.02, mat(0x111a22, { emissive: 0x112233 }), -11.37, 1.09, 3.0, scene).rotation.y = Math.PI / 2;
  const coffee = box(0.38, 0.5, 0.35, mat(0x1f1f1f), -11.6, 1.2, 5.0, scene);
  interactables.push({ mesh: coffee, type: 'coffee' });
  const coffeeSign = textSprite('☕ KAFFEE', '#fff', 'rgba(90,45,10,0.85)', 0.55);
  coffeeSign.position.set(-11.5, 1.75, 5.0); scene.add(coffeeSign);
  // Whiteboard "Tagesziele"
  const wb = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), new THREE.MeshStandardMaterial({ map: canvasTex(480, 260, (g) => {
    g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 480, 260);
    g.strokeStyle = '#4a3a2a'; g.lineWidth = 10; g.strokeRect(0, 0, 480, 260);
    g.fillStyle = '#2a2622'; g.font = `34px ${FONT.hand}`; g.textAlign = 'center';
    g.fillText('Tagesziele', 240, 52);
    g.fillRect(170, 60, 140, 3);
    g.textAlign = 'left'; g.font = `30px ${FONT.hand}`;
    ['1. Scammen', '2. Mehr scammen', '3. Einlösen!', '4. Teamwork ☺'].forEach((t, i) => g.fillText(t, 70, 105 + i * 38));
  }), roughness: 0.4 }));
  wb.position.set(-8, 1.75, ROOM.maxZ - 0.02); wb.rotation.y = Math.PI;
  scene.add(wb);
  // Feuerlöscher
  box(0.16, 0.45, 0.16, mat(0xc4161c, { roughness: 0.4 }), -9.6, 1.1, ROOM.maxZ - 0.12, scene);

  // ---------- Besprechungstisch (rot) ----------
  const tableM = mat(0x6e1414, { roughness: 0.5 });
  box(2.6, 0.08, 1.2, tableM, 1.4, 0.76, 5.5, scene);
  box(0.12, 0.72, 0.12, legM, 1.4, 0.36, 5.5, scene);
  addCollider(1.4, 5.5, 2.7, 1.3);
  for (const [cx, cz] of [[0.6, 4.6], [1.6, 4.6], [2.4, 4.6], [0.6, 6.4], [1.6, 6.4], [2.4, 6.4]]) {
    const c = new THREE.Group(); c.position.set(cx, 0, cz); scene.add(c);
    box(0.45, 0.06, 0.45, chairM, 0, 0.47, 0, c);
    box(0.45, 0.5, 0.05, chairM, 0, 0.75, cz > 5.5 ? 0.22 : -0.22, c);
  }

  // ---------- Leinwand mit Live-Quote ("Call-Analyse") ----------
  const qCanvas = document.createElement('canvas'); qCanvas.width = 640; qCanvas.height = 360;
  const qTex = new THREE.CanvasTexture(qCanvas); qTex.colorSpace = THREE.SRGBColorSpace;
  const qScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.0), new THREE.MeshBasicMaterial({ map: qTex }));
  qScreen.position.set(-1.0, 1.75, ROOM.minZ + 0.02);
  scene.add(qScreen);
  const updateWhiteboard = ({ day, clock, earned, quota, board = [] }) => {
    const g = qCanvas.getContext('2d');
    g.fillStyle = '#f3d23c'; g.fillRect(0, 0, 640, 360);
    g.fillStyle = '#2a2208'; g.font = `700 36px ${FONT.ui}`; g.fillText('Call-Analyse', 28, 52);
    g.font = `500 24px ${FONT.ui}`; g.fillText(`Tag ${day} · ${clock}`, 420, 50);
    const rows = [[`Team-Umsatz`, `${Math.round(earned).toLocaleString('de-DE')} €`], [`Quote`, `${Math.round(quota).toLocaleString('de-DE')} €`]];
    rows.forEach(([a, b], i) => {
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(28, 76 + i * 56, 584, 46);
      g.fillStyle = '#2a2208'; g.font = `500 26px ${FONT.ui}`; g.fillText(a, 44, 108 + i * 56);
      g.font = `700 28px ${FONT.ui}`; g.fillText(b, 420, 108 + i * 56);
    });
    const p = Math.min(1, earned / Math.max(1, quota));
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(28, 200, 584, 26);
    g.fillStyle = p >= 1 ? '#1d8a3a' : '#c0392b'; g.fillRect(28, 200, 584 * p, 26);
    g.fillStyle = '#2a2208'; g.font = `500 22px ${FONT.ui}`;
    board.slice(0, 4).forEach(([n, v], i) => g.fillText(`#${i + 1} ${n}: ${Math.round(v).toLocaleString('de-DE')} €`, 34 + (i % 2) * 300, 268 + Math.floor(i / 2) * 36));
    qTex.needsUpdate = true;
  };
  updateWhiteboard({ day: 1, clock: '09:00', earned: 0, quota: 0 });

  // ---------- Chefbüro ----------
  box(2.2, 0.08, 1.1, mat(0x4a2a14, { roughness: 0.5 }), 9, 0.78, 0, scene);
  box(2.0, 0.74, 0.9, mat(0x3a200e), 9, 0.37, 0, scene);
  addCollider(9, 0, 2.3, 1.2);
  const bossChair = new THREE.Group(); bossChair.position.set(10, 0, 0); scene.add(bossChair);
  box(0.6, 0.08, 0.6, mat(0x1a1a1a), 0, 0.5, 0, bossChair); box(0.08, 1.0, 0.6, mat(0x1a1a1a), 0.28, 1.0, 0, bossChair);
  const tvCanvas = document.createElement('canvas'); tvCanvas.width = 512; tvCanvas.height = 288;
  const tvTex = new THREE.CanvasTexture(tvCanvas); tvTex.colorSpace = THREE.SRGBColorSpace;
  box(0.08, 1.15, 2.0, monM, ROOM.maxX - 0.05, 1.75, 0, scene, false);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.05), new THREE.MeshBasicMaterial({ map: tvTex }));
  tv.position.set(ROOM.maxX - 0.1, 1.75, 0); tv.rotation.y = -Math.PI / 2;
  scene.add(tv);
  const setTV = (big, small, bg = '#1a1022', fg = '#ffd25a') => {
    const g = tvCanvas.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, 512, 288);
    g.fillStyle = fg; g.textAlign = 'center';
    g.font = `400 64px "Alfa Slab One", ${FONT.ui}`; g.fillText(big, 256, 150);
    g.font = `500 24px ${FONT.ui}`; g.fillStyle = '#fff'; g.fillText(small, 256, 200);
    tvTex.needsUpdate = true;
  };
  setTV('QUOTE!', 'Oder raus.');

  // ---------- Schredder, Sicherungskasten, Pflanzen, Mülleimer ----------
  const shredder = box(0.55, 0.75, 0.42, mat(0x3e4450), 2.6, 0.38, -7.5, scene);
  const shredSign = textSprite('SCHREDDER', '#fff', 'rgba(50,55,65,0.9)', 0.55);
  shredSign.position.set(2.6, 1.15, -7.5); scene.add(shredSign);
  addCollider(2.6, -7.5, 0.6, 0.5);
  interactables.push({ mesh: shredder, type: 'shredder' });
  const fuse = box(0.6, 0.8, 0.14, mat(0x8d8f94, { metalness: 0.5 }), -3.5, 1.4, ROOM.maxZ - 0.07, scene);
  const fuseSign = textSprite('⚡ SICHERUNG', '#ffe14a', 'rgba(0,0,0,0.8)', 0.55);
  fuseSign.position.set(-3.5, 2.05, ROOM.maxZ - 0.15); scene.add(fuseSign);
  interactables.push({ mesh: fuse, type: 'fuse' });
  const potM = mat(0xe9e4da), leafM = mat(0x5f9a2e);
  for (const [x, z] of [[-11.3, -7.3], [3.4, 7.3], [11.3, 7.3], [11.3, -7.3], [-0.2, -7.3]]) {
    box(0.42, 0.42, 0.42, potM, x, 0.21, z, scene);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 5), leafM);
      leaf.position.set(x, 0.75, z);
      leaf.rotation.set((Math.random() - 0.5) * 1.1, i, (Math.random() - 0.5) * 1.1);
      leaf.castShadow = true; scene.add(leaf);
    }
    addCollider(x, z, 0.5, 0.5);
  }
  for (const [x, z] of [[-9.6, -1], [-1.4, -0.5], [-9.6, 5.6]]) {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.4, 14, 1, true), mat(0x9aa0a8, { side: THREE.DoubleSide }));
    bin.position.set(x, 0.2, z); scene.add(bin);
  }

  // ---------- Wurfobjekte ----------
  const props = [];
  const propDefs = [
    ['📦', () => new THREE.BoxGeometry(0.4, 0.3, 0.4), 0xb08850],
    ['📦', () => new THREE.BoxGeometry(0.4, 0.3, 0.4), 0xb08850],
    ['☕', () => new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12), 0xffffff],
    ['🐔', () => new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), 0xffdd33],
    ['🧯', () => new THREE.CylinderGeometry(0.08, 0.08, 0.4, 12), 0xc4161c],
    ['📄', () => new THREE.BoxGeometry(0.3, 0.05, 0.22), 0xffffff],
  ];
  const propSpots = [[-10, -5], [0, 1], [-10.5, 0.5], [2, -3], [-1, 5.5], [-6.5, 6]];
  propDefs.forEach(([emoji, geo, color], i) => {
    const m = new THREE.Mesh(geo(), mat(color));
    m.castShadow = true;
    const [x, z] = propSpots[i];
    m.position.set(x, 0.3, z);
    scene.add(m);
    const p = { i, mesh: m, vel: new THREE.Vector3(), held: null, emoji, half: 0.15 };
    props.push(p);
    interactables.push({ mesh: m, type: 'prop', data: p });
  });

  // ---------- Feuer (wenn das Team gefeuert wird) ----------
  const flameTex = canvasTex(64, 96, (g) => {
    const grd = g.createRadialGradient(32, 70, 4, 32, 60, 40);
    grd.addColorStop(0, '#fff6a0'); grd.addColorStop(0.35, '#ffb020'); grd.addColorStop(0.7, '#ff4a10'); grd.addColorStop(1, 'rgba(255,40,0,0)');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(32, 2); g.quadraticCurveTo(62, 60, 46, 92); g.lineTo(18, 92); g.quadraticCurveTo(2, 60, 32, 2); g.fill();
  });
  const flames = [];
  for (let i = 0; i < 36; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(-11 + Math.random() * 14, 0.4, -7 + Math.random() * 14);
    s.scale.set(0.6, 0.9, 1);
    s.visible = false;
    scene.add(s); flames.push(s);
  }
  // ---------- Pinnwand (JW Paint) neben der Küche ----------
  const pinCanvas = document.createElement('canvas'); pinCanvas.width = 448; pinCanvas.height = 300;
  const pinTex = new THREE.CanvasTexture(pinCanvas); pinTex.colorSpace = THREE.SRGBColorSpace;
  const pg = pinCanvas.getContext('2d');
  pg.fillStyle = '#b8864f'; pg.fillRect(0, 0, 448, 300);
  for (let i = 0; i < 900; i++) { pg.fillStyle = `rgba(${Math.random() < 0.5 ? '90,60,30' : '230,190,140'},0.25)`; pg.fillRect(Math.random() * 448, Math.random() * 300, 3, 3); }
  pg.strokeStyle = '#6b4a2a'; pg.lineWidth = 14; pg.strokeRect(0, 0, 448, 300);
  pg.fillStyle = '#2a1a10'; pg.font = `30px ${FONT.hand}`; pg.textAlign = 'center'; pg.fillText('Kunst der Woche', 224, 150);
  pinTex.needsUpdate = true;
  const pin = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.07), new THREE.MeshStandardMaterial({ map: pinTex, roughness: 0.9 }));
  pin.position.set(ROOM.minX + 0.02, 1.7, -1.6); pin.rotation.y = Math.PI / 2;
  scene.add(pin);
  const setPinboard = (img) => {
    pg.fillStyle = '#b8864f'; pg.fillRect(14, 14, 420, 272);
    pg.save(); pg.translate(224, 150); pg.rotate((Math.random() - 0.5) * 0.08);
    pg.fillStyle = '#fff'; pg.fillRect(-180, -112, 360, 224);
    pg.drawImage(img, -172, -104, 344, 208);
    pg.restore();
    pg.fillStyle = '#d33'; pg.beginPath(); pg.arc(224, 40, 8, 0, 7); pg.fill();
    pinTex.needsUpdate = true;
  };

  // ---------- Zitate-Wand (was Spieler am Telefon gesagt haben, wie im Original) ----------
  const qwCanvas = document.createElement('canvas'); qwCanvas.width = 640; qwCanvas.height = 400;
  const qwTex = new THREE.CanvasTexture(qwCanvas); qwTex.colorSpace = THREE.SRGBColorSpace;
  const qw = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: qwTex }));
  qw.position.set(-7.2, 1.75, ROOM.minZ + 0.02);
  scene.add(qw);
  const setQuotes = (quotes) => {
    const g = qwCanvas.getContext('2d');
    g.fillStyle = '#e88a1a'; g.fillRect(0, 0, 640, 400);
    g.fillStyle = '#2a1404'; g.font = `700 30px ${FONT.ui}`; g.fillText('Was hat der Kunde gehört?', 24, 46);
    const list = quotes.length ? quotes.slice(-3) : [['Chef Brenner', 'Hier landen eure besten Sprüche vom Telefon.']];
    list.forEach(([who, text], i) => {
      const y = 70 + i * 106;
      g.fillStyle = '#ffd94a'; g.fillRect(24, y, 592, 94);
      g.fillStyle = '#2a1404'; g.beginPath(); g.arc(52, y + 30, 16, 0, 7); g.fill();
      g.fillStyle = '#ffd94a'; g.font = `700 18px ${FONT.ui}`; g.textAlign = 'center'; g.fillText(String(i + 1), 52, y + 36); g.textAlign = 'left';
      g.fillStyle = '#2a1404'; g.font = `500 21px ${FONT.ui}`;
      const words = `${who} sagte: "${text}"`.split(' '); let line = '', ly = y + 34;
      for (const w of words) { if (g.measureText(line + w).width > 520) { g.fillText(line, 80, ly); line = ''; ly += 26; if (ly > y + 86) break; } line += w + ' '; }
      if (ly <= y + 86) g.fillText(line, 80, ly);
    });
    qwTex.needsUpdate = true;
  };
  setQuotes([]);

  // ---------- Keks-Regen (Meteor Cookie) und Explosionen (Luftschlag) ----------
  const cookieGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14);
  const cookieMat = mat(0xb87a3c, { roughness: 0.9 });
  const cookies = [];
  const cookieRain = (n = 90) => {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(cookieGeo, cookieMat);
      c.position.set(-11 + Math.random() * 14.5, ROOM.h - 0.1 + Math.random() * 4, -7.5 + Math.random() * 15);
      c.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      c.castShadow = true;
      c.userData = { vy: -Math.random() * 2, spin: (Math.random() - 0.5) * 8, life: 25 + Math.random() * 10 };
      scene.add(c); cookies.push(c);
    }
  };
  const blasts = [];
  const blastTex = canvasTex(128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, '#fffbe0'); grd.addColorStop(0.3, '#ffcf40'); grd.addColorStop(0.65, '#ff5a10'); grd.addColorStop(1, 'rgba(80,20,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  });
  const explosion = (x, z) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blastTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.position.set(x, 1.2, z); sp.scale.set(0.5, 0.5, 1);
    scene.add(sp);
    const l = new THREE.PointLight(0xff8a30, 40, 9, 2); l.position.set(x, 1.5, z); scene.add(l);
    blasts.push({ sp, l, t: 0 });
    // Brandstelle bleibt kurz
    const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    f.position.set(x, 0.4, z); f.scale.set(0.7, 1, 1); scene.add(f);
    blasts.push({ sp: f, t: -6, flame: true });
  };
  let lastT = 0;

  let fired = false, powered = true;
  const applyLights = () => {
    const lightColor = fired ? 0xff3a10 : 0xffc98c;
    lights.forEach(l => { l.color.setHex(lightColor); l.intensity = powered ? (fired ? 14 : 9) : 0; });
    hemi.color.setHex(fired ? 0xff6030 : 0xffd6a8);
    hemi.intensity = powered ? 1.1 : 0.12;
    sun.intensity = powered ? 0.9 : 0.05;
    panelM.emissiveIntensity = powered ? 1.4 : 0;
    desks.forEach(d => d.screen.material.color.setHex(powered ? 0xffffff : 0x050505));
    scene.fog.color.setHex(fired ? 0x5a1206 : 0x2b1c16);
  };
  const setPower = (on) => { powered = on; applyLights(); };
  const setFired = (on) => {
    fired = on;
    flames.forEach(f => (f.visible = on));
    applyLights();
    if (on) setTV('GEFEUERT!', 'Quote verfehlt.', '#3a0606', '#ff5a3a'); else setTV('QUOTE!', 'Oder raus.');
  };
  const update = (t) => {
    const dt = Math.min(0.05, t - lastT || 0); lastT = t;
    if (fired) flames.forEach((f, i) => { const k = 0.8 + Math.sin(t * 9 + i * 1.7) * 0.2; f.scale.set(0.6 * k, 0.95 * k + 0.1, 1); });
    for (let i = cookies.length - 1; i >= 0; i--) {
      const c = cookies[i], u = c.userData;
      u.life -= dt;
      if (c.position.y > 0.03) { u.vy -= 9.8 * dt; c.position.y = Math.max(0.03, c.position.y + u.vy * dt); c.rotation.x += u.spin * dt; if (c.position.y <= 0.03) c.rotation.set(0, Math.random() * 3, 0); }
      if (u.life < 0) { scene.remove(c); cookies.splice(i, 1); }
    }
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i];
      b.t += dt;
      if (b.flame) { const k = 0.8 + Math.sin(t * 10 + i) * 0.2; b.sp.scale.set(0.7 * k, 1.1 * k, 1); if (b.t > 0) { scene.remove(b.sp); blasts.splice(i, 1); } continue; }
      const s2 = 0.5 + b.t * 9; b.sp.scale.set(s2, s2, 1); b.sp.material.opacity = Math.max(0, 1 - b.t * 1.6); b.l.intensity = Math.max(0, 40 - b.t * 70);
      if (b.t > 0.7) { scene.remove(b.sp); scene.remove(b.l); blasts.splice(i, 1); }
    }
  };

  return { colliders, interactables, solids, desks, props, lights, hemi, sun, updateWhiteboard, setPower, setFired, setTV, update, setPinboard, setQuotes, cookieRain, explosion };
}

// ---------- Cartoon-Figur wie im Original: großer Kopf, orange-braune Haut, Headset, Schnurrbart ----------
const SKINS = [0xd9813a, 0xc8702f, 0xe0904a, 0xb8642c, 0xd47a3e];
const HAIRS = [0x1d140e, 0x2a1a10, 0x3b2616, 0x111111];
export function makeAvatar(shirt, name, opts = {}) {
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const skin = opts.skin ?? SKINS[seed % SKINS.length];
  const hair = HAIRS[seed % HAIRS.length];
  const skinM = mat(skin, { roughness: 0.6 }), shirtM = mat(shirt, { roughness: 0.75 }), pantsM = mat(opts.pants ?? 0x2b2f3a);
  const g = new THREE.Group();
  const mk = (geo, m, x, y, z, parent = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };

  // Beine (an der Hüfte drehbar)
  const legs = [-0.12, 0.12].map((x) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.8, 0); g.add(pivot);
    mk(new THREE.CapsuleGeometry(0.1, 0.55, 4, 8), pantsM, 0, -0.4, 0, pivot);
    mk(new THREE.BoxGeometry(0.17, 0.09, 0.28), mat(0x1e1a18), 0, -0.76, -0.05, pivot);
    return pivot;
  });
  // Oberkörper
  const torso = mk(new THREE.CapsuleGeometry(0.27, 0.42, 6, 12), shirtM, 0, 1.15, 0);
  torso.scale.set(1.1, 1, 0.8);
  mk(new THREE.BoxGeometry(0.16, 0.07, 0.02), mat(0xffffff), 0.12, 1.3, -0.215); // Namensschild
  if (opts.tie) mk(new THREE.BoxGeometry(0.08, 0.38, 0.03), mat(0xb3121a), 0, 1.15, -0.225);
  // Arme (an der Schulter drehbar)
  const arms = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.36, 1.42, 0); g.add(pivot);
    mk(new THREE.CapsuleGeometry(0.085, 0.22, 4, 8), shirtM, 0, -0.14, 0, pivot);
    mk(new THREE.CapsuleGeometry(0.075, 0.28, 4, 8), skinM, 0, -0.45, 0, pivot);
    return pivot;
  });
  // Kopf
  const head = new THREE.Group(); head.position.y = 1.86; g.add(head);
  mk(new THREE.SphereGeometry(0.3, 24, 18), skinM, 0, 0, 0, head).scale.set(1, 1.08, 0.95);
  const hairM = mat(hair, { roughness: 0.9 });
  const cap = mk(new THREE.SphereGeometry(0.31, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), hairM, 0, 0.04, 0.02, head);
  cap.scale.set(1.02, 1.05, 1);
  const eyeW = mat(0xffffff, { roughness: 0.3 }), eyeB = mat(0x111111);
  for (const s of [-1, 1]) {
    mk(new THREE.SphereGeometry(0.065, 12, 10), eyeW, s * 0.1, 0.05, -0.25, head);
    mk(new THREE.SphereGeometry(0.03, 8, 6), eyeB, s * 0.1, 0.05, -0.31, head);
    mk(new THREE.BoxGeometry(0.12, 0.03, 0.03), hairM, s * 0.1, 0.15, -0.27, head).rotation.z = s * -0.2;
  }
  mk(new THREE.SphereGeometry(0.06, 10, 8), skinM, 0, -0.03, -0.3, head);           // Nase
  if (opts.mustache ?? seed % 3 !== 0) mk(new THREE.BoxGeometry(0.2, 0.05, 0.05), hairM, 0, -0.1, -0.28, head);
  mk(new THREE.BoxGeometry(0.12, 0.025, 0.02), mat(0x5a1a10), 0, -0.17, -0.27, head); // Mund
  // Headset
  const hsM = mat(0x161616, { roughness: 0.4 });
  const band = mk(new THREE.TorusGeometry(0.31, 0.025, 6, 20, Math.PI), hsM, 0, 0.02, 0, head);
  band.rotation.z = 0; band.rotation.y = Math.PI / 2;
  for (const s of [-1, 1]) mk(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 14), hsM, s * 0.31, 0, 0, head).rotation.z = Math.PI / 2;
  const boom = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 6), hsM, -0.24, -0.1, -0.14, head);
  boom.rotation.set(Math.PI / 2.6, 0, 0.5);
  mk(new THREE.SphereGeometry(0.03, 8, 6), hsM, -0.17, -0.17, -0.27, head);

  const label = nameSprite(name);
  label.position.y = 2.45;
  g.add(label);
  g.userData = { legs, arms, head, label, walk: 0 };
  return g;
}

// Lauf- und Sitzanimation
export function animateAvatar(av, dt, speed, seated) {
  const u = av.userData;
  if (seated) {
    u.legs.forEach(l => (l.rotation.x = Math.PI / 2.1));
    u.arms.forEach(a => (a.rotation.x = Math.PI / 2.8));
    return;
  }
  u.walk += dt * speed * 3.2;
  const sw = speed > 0.1 ? Math.sin(u.walk) * 0.7 : 0;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  u.arms[0].rotation.x = -sw * 0.8; u.arms[1].rotation.x = sw * 0.8;
}
