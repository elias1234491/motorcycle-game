// Baut das 3D-Büro: Großraum mit 4 Arbeitsplätzen, Chefbüro, Küche, Schredder, Sicherungskasten, Wurfobjekte.
import * as THREE from 'three';

export const ROOM = { minX: -12, maxX: 12, minZ: -8, maxZ: 8, h: 3.2 };
export const GLASS_X = 4;            // Glaswand zum Chefbüro
export const DOOR = { z0: -1, z1: 1 }; // Türöffnung in der Glaswand

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function box(w, h, d, material, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function textSprite(text, color = '#fff', bg = 'rgba(0,0,0,0.55)', scale = 1) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.beginPath(); g.roundRect(4, 4, 504, 120, 30); g.fill();
  g.fillStyle = color;
  g.font = 'bold 56px Arial';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.set(1.6 * scale, 0.4 * scale, 1);
  s.renderOrder = 10;
  return s;
}
export { textSprite };

export function buildOffice(scene) {
  const colliders = [];   // achsenparallele Boxen {minX,maxX,minZ,maxZ}
  const interactables = []; // {mesh, type, data, label}
  const addCollider = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // Licht
  const hemi = new THREE.HemisphereLight(0xfff6e0, 0x404050, 0.7);
  scene.add(hemi);
  const lights = [];
  for (const [x, z] of [[-8, -3], [-3, -3], [-8, 3], [-3, 3], [8, 0]]) {
    const l = new THREE.PointLight(0xfff2d0, 7, 14, 1.6);
    l.position.set(x, ROOM.h - 0.3, z);
    scene.add(l);
    lights.push(l);
    box(1.4, 0.06, 0.4, mat(0xffffff, { emissive: 0xfff2d0, emissiveIntensity: 0.6 }), x, ROOM.h - 0.03, z, scene);
  }
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(-6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10 });
  scene.add(sun);

  // Boden, Decke, Wände
  const floorTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#4a5560'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#3c454f'; g.lineWidth = 4;
    for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 8);
    return t;
  })();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), mat(0xe8e8e0));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM.h;
  scene.add(ceil);
  const wallM = mat(0xd9d2c3);
  box(24, ROOM.h, 0.2, wallM, 0, ROOM.h / 2, ROOM.minZ - 0.1, scene);
  box(24, ROOM.h, 0.2, wallM, 0, ROOM.h / 2, ROOM.maxZ + 0.1, scene);
  box(0.2, ROOM.h, 16, wallM, ROOM.minX - 0.1, ROOM.h / 2, 0, scene);
  box(0.2, ROOM.h, 16, wallM, ROOM.maxX + 0.1, ROOM.h / 2, 0, scene);

  // Fenster mit "Aussicht"
  for (const x of [-9, -4, 1]) {
    box(3, 1.4, 0.05, mat(0x87b5e0, { emissive: 0x5080b0, emissiveIntensity: 0.6 }), x, 1.8, ROOM.minZ + 0.01, scene);
  }

  // Glaswand Chefbüro (mit Tür)
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.25, roughness: 0.1 });
  const g1len = DOOR.z0 - ROOM.minZ, g2len = ROOM.maxZ - DOOR.z1;
  box(0.08, ROOM.h, g1len, glass, GLASS_X, ROOM.h / 2, ROOM.minZ + g1len / 2, scene).castShadow = false;
  box(0.08, ROOM.h, g2len, glass, GLASS_X, ROOM.h / 2, DOOR.z1 + g2len / 2, scene).castShadow = false;
  addCollider(GLASS_X, ROOM.minZ + g1len / 2, 0.2, g1len);
  addCollider(GLASS_X, DOOR.z1 + g2len / 2, 0.2, g2len);
  const sign = textSprite('CHEF - H. BRENNER', '#ffdd55', 'rgba(60,20,0,0.85)');
  sign.position.set(GLASS_X - 0.05, 2.6, 0);
  scene.add(sign);

  // Arbeitsplätze
  const desks = [];
  const deskM = mat(0x8b6b4a), metal = mat(0x333740, { metalness: 0.4 }), chairM = mat(0x22252b);
  const spots = [[-8, -4], [-3, -4], [-8, 2.5], [-3, 2.5]];
  spots.forEach(([x, z], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    scene.add(g);
    box(2.2, 0.06, 1.0, deskM, 0, 0.76, 0, g);
    for (const [lx, lz] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) box(0.06, 0.76, 0.06, metal, lx, 0.38, lz, g);
    // Trennwand
    box(2.4, 1.3, 0.05, mat(0x5a6e80), 0, 0.65, -0.55, g);
    // Monitor
    box(0.75, 0.45, 0.04, metal, 0, 1.12, -0.3, g);
    const screen = box(0.69, 0.39, 0.01, mat(0x0a1530, { emissive: 0x2050a0, emissiveIntensity: 0.8 }), 0, 1.12, -0.275, g);
    box(0.08, 0.2, 0.08, metal, 0, 0.88, -0.3, g);
    box(0.5, 0.02, 0.16, mat(0x202020), 0, 0.8, 0.05, g);
    // Telefon
    const phone = box(0.22, 0.07, 0.18, mat(0x1d1d1d), 0.75, 0.83, -0.05, g);
    const phoneLight = box(0.04, 0.02, 0.04, mat(0x330000, { emissive: 0xff0000, emissiveIntensity: 0 }), 0.83, 0.88, -0.1, g);
    // Stuhl
    const chair = new THREE.Group(); chair.position.set(0, 0, 0.85); g.add(chair);
    box(0.5, 0.08, 0.5, chairM, 0, 0.48, 0, chair);
    box(0.5, 0.6, 0.06, chairM, 0, 0.82, 0.25, chair);
    box(0.06, 0.45, 0.06, metal, 0, 0.23, 0, chair);
    // Namensschild
    const tag = textSprite(`Platz ${i + 1}`, '#fff', 'rgba(20,40,70,0.8)', 0.6);
    tag.position.set(0, 1.55, -0.55);
    g.add(tag);
    addCollider(x, z, 2.3, 1.15);
    const desk = { index: i, group: g, screen, phone, phoneLight, tag, x, z, seat: new THREE.Vector3(x, 1.2, z + 0.75), lookAt: new THREE.Vector3(x, 1.12, z - 0.3), occupant: null };
    desks.push(desk);
    interactables.push({ mesh: screen, type: 'desk', data: desk });
    interactables.push({ mesh: phone, type: 'desk', data: desk });
  });

  // Chefbüro
  box(2.4, 0.08, 1.2, mat(0x5a3a22), 9, 0.78, 0, scene);
  box(2.2, 0.74, 1.0, mat(0x4a2a12), 9, 0.37, 0, scene);
  addCollider(9, 0, 2.4, 1.2);
  box(0.9, 1.2, 0.1, mat(0xc8a040, { metalness: 0.6, roughness: 0.3 }), 11.9, 1.8, 0, scene).rotation.y = Math.PI / 2;
  const motto = textSprite('QUOTE ODER RAUS!', '#ff5555', 'rgba(0,0,0,0.8)', 1.2);
  motto.position.set(11.8, 2.5, 0);
  scene.add(motto);

  // Whiteboard mit Live-Quote
  const wbCanvas = document.createElement('canvas'); wbCanvas.width = 512; wbCanvas.height = 256;
  const wbTex = new THREE.CanvasTexture(wbCanvas);
  const wb = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), new THREE.MeshBasicMaterial({ map: wbTex }));
  wb.position.set(ROOM.minX + 0.02, 1.8, -0.5); wb.rotation.y = Math.PI / 2;
  scene.add(wb);
  const updateWhiteboard = ({ day, clock, earned, quota }) => {
    const g = wbCanvas.getContext('2d');
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#888'; g.lineWidth = 8; g.strokeRect(0, 0, 512, 256);
    g.fillStyle = '#1a3a8a'; g.font = 'bold 40px Arial'; g.fillText(`TAG ${day}   ${clock}`, 24, 56);
    g.fillStyle = '#222'; g.font = 'bold 34px Arial'; g.fillText(`Team: ${earned.toLocaleString('de-DE')} €`, 24, 120);
    g.fillText(`Quote: ${quota.toLocaleString('de-DE')} €`, 24, 165);
    const p = Math.min(1, earned / Math.max(1, quota));
    g.fillStyle = '#ddd'; g.fillRect(24, 190, 464, 36);
    g.fillStyle = p >= 1 ? '#2a2' : '#d33'; g.fillRect(24, 190, 464 * p, 36);
    wbTex.needsUpdate = true;
  };

  // Küche: Kaffeemaschine + Wasserspender
  const coffee = box(0.5, 0.7, 0.45, mat(0x222222), -11.4, 1.25, 6.5, scene);
  box(1.6, 0.9, 0.7, mat(0xbbbbbb), -11.3, 0.45, 6.5, scene);
  addCollider(-11.3, 6.5, 1.6, 0.8);
  const coffeeSign = textSprite('☕ KAFFEE', '#fff', 'rgba(80,40,0,0.8)', 0.6);
  coffeeSign.position.set(-11.4, 1.9, 6.5); scene.add(coffeeSign);
  interactables.push({ mesh: coffee, type: 'coffee' });
  box(0.4, 1.3, 0.4, mat(0xdddddd), -11.4, 0.65, 4.8, scene);
  box(0.32, 0.45, 0.32, mat(0x66aaff, { transparent: true, opacity: 0.7 }), -11.4, 1.52, 4.8, scene);
  addCollider(-11.4, 4.8, 0.5, 0.5);

  // Schredder (Polizeirazzia)
  const shredder = box(0.6, 0.8, 0.45, mat(0x444a55), 1.5, 0.4, -7.5, scene);
  const shredSign = textSprite('SCHREDDER', '#fff', 'rgba(60,60,60,0.85)', 0.6);
  shredSign.position.set(1.5, 1.2, -7.5); scene.add(shredSign);
  addCollider(1.5, -7.5, 0.7, 0.6);
  interactables.push({ mesh: shredder, type: 'shredder' });

  // Sicherungskasten (Stromausfall)
  const fuse = box(0.6, 0.8, 0.15, mat(0x999999, { metalness: 0.5 }), -6, 1.4, ROOM.maxZ - 0.05, scene);
  const fuseSign = textSprite('⚡ SICHERUNG', '#ff0', 'rgba(0,0,0,0.8)', 0.6);
  fuseSign.position.set(-6, 2.0, ROOM.maxZ - 0.1); scene.add(fuseSign);
  interactables.push({ mesh: fuse, type: 'fuse' });

  // Pflanzen
  for (const [x, z] of [[-11.3, -7.3], [3.4, 7.3], [11.3, 7.3], [-0.5, 7.3]]) {
    box(0.5, 0.5, 0.5, mat(0x8a5030), x, 0.25, z, scene);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), mat(0x2f7a3a));
    leaves.position.set(x, 0.95, z); leaves.castShadow = true; scene.add(leaves);
    addCollider(x, z, 0.6, 0.6);
  }

  // Wurfobjekte (Chaos im Büro)
  const props = [];
  const propDefs = [
    ['📦', () => new THREE.BoxGeometry(0.4, 0.3, 0.4), 0xb08850],
    ['📦', () => new THREE.BoxGeometry(0.4, 0.3, 0.4), 0xb08850],
    ['☕', () => new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12), 0xffffff],
    ['🐔', () => new THREE.CapsuleGeometry(0.08, 0.3, 4, 8), 0xffdd33],
    ['🗑️', () => new THREE.CylinderGeometry(0.18, 0.15, 0.4, 12), 0x555555],
    ['📎', () => new THREE.BoxGeometry(0.3, 0.05, 0.22), 0xffffff],
  ];
  const propSpots = [[-5.5, -1], [0, 1], [-10, 0], [2, -3], [-1, 5], [-6.5, 5.5]];
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

  updateWhiteboard({ day: 1, clock: '09:00', earned: 0, quota: 0 });
  return { colliders, interactables, desks, props, lights, hemi, sun, updateWhiteboard, screens: desks.map(d => d.screen) };
}

// Einfache Figur für Mitspieler und den Chef
export function makeAvatar(color, name, opts = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.8, 4, 10), mat(color));
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat(opts.skin ?? 0xf0c8a0));
  head.position.y = 1.55; head.castShadow = true; g.add(head);
  const eyeM = mat(0x111111);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeM);
    e.position.set(s * 0.08, 1.6, -0.19); g.add(e);
  }
  // Headset
  const hs = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 16, Math.PI), mat(0x222222));
  hs.position.y = 1.58; hs.rotation.z = 0; hs.rotation.y = Math.PI / 2; g.add(hs);
  if (opts.tie) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.03), mat(0xcc0000));
    tie.position.set(0, 1.05, -0.29); g.add(tie);
  }
  const label = textSprite(name, '#fff', 'rgba(0,0,0,0.6)', 0.6);
  label.position.y = 2.05; g.add(label);
  g.userData = { body, head, label };
  return g;
}
