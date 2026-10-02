// Callcenter Chaos - Hauptspiel: 3D-Büro in Third-Person (wie im Original), Tagesablauf, Chef, Chaos-Events, Koop.
import * as THREE from 'three';
import { CONFIG, SCAMS } from '../config.js';
import { buildOffice, makeAvatar, animateAvatar, textSprite, ROOM } from './office.js';
import { Computer } from './computer.js';
import { Apps } from './apps.js';
import { isTouch, setupTouch } from './touch.js';
import { Net, netAvailable, initNet } from './net.js';
import { think, brainMode, BRAIN_LABEL, getApiKey, setApiKey, preloadBrain, initBrain, inClaude } from './brain.js';
import * as voice from './voice.js';

const $ = (s) => document.querySelector(s);
const euro = (n) => Math.round(n).toLocaleString('de-DE') + ' €';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SHIRTS = [0x2bb3a8, 0xd8452e, 0x3b6fd8, 0x2f9e44, 0xe0a020, 0x8b5cf6];
const START_DATE = new Date(2026, 7, 24); // Montag, 24. Aug. 2026

class Game {
  constructor() {
    this.net = new Net();
    this.phase = 'menu';           // menu | work | review | fired
    this.day = 1;
    this.time = 0;
    this.earned = 0;
    this.personal = 0;
    this.board = {};               // Name -> heutiger Umsatz
    this.events = [];
    this.keys = {};
    this.yaw = Math.PI; this.pitch = -0.15;
    this.pos = new THREE.Vector3(-5.5, 0, 0.0);
    this.seated = null;
    this.held = null;
    this.coffeeUntil = 0;
    this.nextRingAt = 0;
    this.remotes = new Map();
    this.chaos = null;
    this.personas = [];
    this.lastPersona = null;
    this.unlockedScams = new Set();
    this.inventory = [];
    this.equipped = -1;
    this.crouch = false;
    this.stunUntil = 0;
    this.quotes = [];
    this.richCalls = 0;
    this.itemCd = 0;
  }

  get quota() { return Math.round(CONFIG.BASE_QUOTA * Math.pow(CONFIG.QUOTA_GROWTH, this.day - 1) / 50) * 50; }
  get clock() {
    const mins = 9 * 60 + Math.floor((Math.min(this.time, CONFIG.DAY_SECONDS) / CONFIG.DAY_SECONDS) * 8 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
  get dateLabel() {
    const d = new Date(START_DATE); d.setDate(d.getDate() + this.day - 1);
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  get reviewIn() {
    const s = Math.max(0, Math.ceil(CONFIG.DAY_SECONDS - this.time));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  async init() {
    // Schriften laden, bevor Namensschilder und Zettel gezeichnet werden
    await Promise.race([
      Promise.all(['700 64px Fredoka', '26px "Permanent Marker"', '500 24px Rubik', '64px "Alfa Slab One"'].map(f => document.fonts.load(f).catch(() => {}))),
      new Promise(r => setTimeout(r, 2500)),
    ]);
    this.personas = (await (await fetch('personas.json')).json()).callers;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    document.body.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x24170f);
    this.camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 100);
    this.webcam = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 30);
    this.office = buildOffice(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.camRay = new THREE.Raycaster();
    this.computer = new Computer(this);
    this.apps = new Apps(this, this.computer);

    this.boss = makeAvatar(0x2b2b33, 'Chef Brenner', { tie: true, skin: 0xe39a6a, mustache: true });
    this.boss.position.set(9, 0, 2);
    this.scene.add(this.boss);
    this.bossPath = [[9, 2], [6, 0], [2, 0], [-1, -1], [-10.5, -0.5], [-10.5, 6], [-1.5, 6.5], [2, 0], [6, 0]];
    this.bossTarget = 0;
    this.bossLine = 0;

    // Kollegen-Figuren als Deko im Menü
    this.menuCrew = [0, 1, 2].map(i => {
      const a = makeAvatar(SHIRTS[i], ['Ahmed', 'Hypercat', 'Kit'][i]);
      const d = this.office.desks[i + 1];
      a.position.set(d.chairPos.x, -0.33, d.chairPos.z); a.rotation.y = d.rotY;
      animateAvatar(a, 0, 0, true);
      this.scene.add(a);
      return a;
    });

    // Größe immer an die echte sichtbare Fläche anpassen (Adressleiste, Drehen, iPad-Split-View)
    const canvas = this.renderer.domElement;
    const fitView = () => {
      const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      if (this.computer.isOpen) this.computer.layout();
    };
    if (window.ResizeObserver) new ResizeObserver(fitView).observe(canvas);
    addEventListener('resize', fitView);
    addEventListener('orientationchange', () => setTimeout(fitView, 300));
    window.visualViewport?.addEventListener('resize', fitView);
    fitView();
    this.bindInput();
    setupTouch(this);
    this.bindMenu();
    this.bindNet();
    this.clock3 = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ---------------- Menü ----------------
  bindMenu() {
    const name = $('#m-name');
    try { name.value = localStorage.getItem('ccc_name') || ''; } catch {}
    const keyInput = $('#m-apikey');
    keyInput.value = getApiKey() ? '••••••••' : '';
    const refreshMode = () => { $('#m-brain').textContent = BRAIN_LABEL[brainMode()]; };
    refreshMode();
    $('#m-savekey').addEventListener('click', () => {
      const v = keyInput.value.trim();
      if (v && !v.startsWith('•')) setApiKey(v);
      if (!v) setApiKey('');
      keyInput.value = getApiKey() ? '••••••••' : '';
      refreshMode();
    });
    $('#m-keywrap').hidden = inClaude;
    const refreshNet = () => {
      const ok = netAvailable();
      $('#m-host').disabled = $('#m-join').disabled = !ok;
      $('#m-netinfo').textContent = ok ? '' : inClaude
        ? 'Koop braucht eine Anmeldung bei Claude.'
        : 'Online-Koop ist noch nicht eingerichtet (Supabase in config.js eintragen).';
    };
    refreshNet();
    Promise.all([initBrain(), initNet()]).then(() => { refreshMode(); refreshNet(); });
    const me = () => {
      const n = name.value.trim() || 'Praktikant ' + Math.floor(Math.random() * 99);
      try { localStorage.setItem('ccc_name', n); } catch {}
      return { name: n.slice(0, 16), color: SHIRTS[Math.floor(Math.random() * SHIRTS.length)] };
    };
    $('#m-solo').addEventListener('click', () => this.start(me()));
    $('#m-host').addEventListener('click', () => this.start(me(), Math.random().toString(36).slice(2, 7).toUpperCase()));
    $('#m-join').addEventListener('click', () => {
      const code = $('#m-room').value.trim().toUpperCase();
      if (!code) { $('#m-netinfo').textContent = 'Bitte Raum-Code eingeben.'; return; }
      this.start(me(), code);
    });
  }

  async start(me, room) {
    this.me = me;
    if (room) {
      $('#m-netinfo').textContent = 'Verbinde ...';
      try {
        await this.net.join(room, me);
      } catch (e) {
        $('#m-netinfo').textContent = e.message;
        return;
      }
      $('#room-code').textContent = `Raum-Code: ${room}`;
      setTimeout(() => this.toast(`👥 Raum-Code ${room}: Freunde öffnen dieselbe Seite und treten damit bei`), 800);
    }
    this.menuCrew.forEach(a => this.scene.remove(a));
    this.player = makeAvatar(me.color, me.name);
    this.player.userData.label.visible = false; // eigenen Namen nicht über dem Kopf zeigen
    this.scene.add(this.player);
    $('#menu').classList.add('hide');
    $('#hud').classList.add('show');
    $('#brain-label').textContent = BRAIN_LABEL[brainMode()];
    preloadBrain();
    if (this.net.isHost) this.startDay(1);
    else this.toast('Warte auf den Host ...');
    this.lockPointer();
  }

  // ---------------- Eingabe ----------------
  bindInput() {
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      this.keys[e.code] = true;
      if (this.computer.isOpen) {
        if (e.code === 'Escape') this.standUp();
        else this.computer.keyDown(e);
        return;
      }
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyQ') this.cycleItem();
      if (e.code === 'KeyC') { this.crouch = !this.crouch; }
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (this.computer.isOpen) this.computer.keyUp(e);
    });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.renderer.domElement) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = Math.max(-0.9, Math.min(0.6, this.pitch - e.movementY * 0.0022));
    });
    addEventListener('mousedown', (e) => {
      if (this.phase === 'menu' || this.computer.isOpen) return;
      if (e.target !== this.renderer.domElement) return;
      if (document.pointerLockElement !== this.renderer.domElement) { this.lockPointer(); return; }
      if (this.held) this.throwProp();
      else if (this.equipped >= 0) this.useItem();
    });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      $('#paused').classList.toggle('show', !isTouch && !locked && !this.computer.isOpen && this.phase !== 'menu' && !$('#review').classList.contains('show'));
    });
  }

  lockPointer() {
    if (isTouch) return;
    try { this.renderer.domElement.requestPointerLock()?.catch?.(() => {}); } catch {}
  }

  // ---------------- Interaktion ----------------
  lookTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.raycaster.far = 8;
    const meshes = this.office.interactables.filter(i => !(i.type === 'prop' && i.data === this.held)).map(i => i.mesh);
    for (const hit of this.raycaster.intersectObjects(meshes, false)) {
      if (Math.hypot(hit.point.x - this.pos.x, hit.point.z - this.pos.z) > 2.4) continue;
      return this.office.interactables.find(i => i.mesh === hit.object);
    }
    return null;
  }

  promptFor(t) {
    if (!t) return '';
    switch (t.type) {
      case 'desk': return t.data.occupant ? 'Platz ist besetzt' : '[E] Hinsetzen';
      case 'coffee': return '[E] Kaffee trinken';
      case 'shredder': return this.chaos?.kind === 'raid' && !this.chaos.done ? '[E] BEWEISE SCHREDDERN!' : 'Schredder';
      case 'fuse': return this.chaos?.kind === 'power' ? '[E] Sicherung einschalten!' : 'Sicherungskasten';
      case 'prop': return this.held ? '' : `[E] ${t.data.emoji} aufheben`;
    }
    return '';
  }

  interact() {
    if (this.phase === 'menu') return;
    if (this.held) { this.dropProp(); return; }
    const t = this.lookTarget();
    if (!t) return;
    if (t.type === 'desk' && !t.data.occupant) this.sitDown(t.data);
    else if (t.type === 'coffee') { this.coffeeUntil = performance.now() + 30000; this.toast('☕ Koffein-Boost! 30 Sekunden schneller.'); voice.beep(300, 0.3, 'triangle'); }
    else if (t.type === 'shredder' && this.chaos?.kind === 'raid' && !this.chaos.done) {
      this.chaos.done = true; this.toast('📄✂️ Beweise vernichtet!'); voice.beep(200, 0.6, 'sawtooth', 0.08);
    }
    else if (t.type === 'fuse' && this.chaos?.kind === 'power') { this.endPower(true); this.net.send('fuse'); }
    else if (t.type === 'prop') this.pickProp(t.data);
  }

  sitDown(desk) {
    if (this.chaos?.kind === 'power') { this.toast('⚡ Kein Strom! Erst die Sicherung reparieren.'); return; }
    this.seated = desk;
    desk.occupant = this.net.id;
    this.net.send('seat', { desk: desk.index });
    document.exitPointerLock?.();
    this.computer.open(desk);
    this.nextRingAt = Math.max(this.nextRingAt, performance.now() + 3000);
  }

  standUp() {
    if (!this.seated) return;
    if (this.computer.call && this.computer.call.state === 'active') this.computer.endCall('Du bist einfach aufgestanden.');
    else if (this.computer.call?.state === 'ringing') this.computer.declineCall();
    this.computer.close();
    this.seated.occupant = null;
    this.net.send('unseat', { desk: this.seated.index });
    this.pos.copy(this.seated.standPos);
    this.yaw = this.seated.rotY + Math.PI;
    this.seated = null;
    this.lockPointer();
  }

  // ---------------- Wurfobjekte ----------------
  pickProp(p) {
    if (p.held) return;
    this.held = p;
    p.held = this.net.id;
  }
  dropProp() {
    const p = this.held;
    p.held = null; this.held = null;
    p.vel.set(0, 0, 0);
    this.net.send('prop', { i: p.i, p: p.mesh.position.toArray(), v: [0, 0, 0] });
  }
  throwProp() {
    const p = this.held;
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
    p.vel.copy(dir.multiplyScalar(11)).add(new THREE.Vector3(0, 3, 0));
    p.held = null; this.held = null;
    this.net.send('prop', { i: p.i, p: p.mesh.position.toArray(), v: p.vel.toArray() });
    voice.beep(500, 0.08, 'triangle');
    if (this.boss.position.distanceTo(p.mesh.position) < 6) this.bossSay('WER WIRFT HIER MIT ZEUG?!');
  }
  updateProps(dt) {
    for (const p of this.office.props) {
      const m = p.mesh;
      if (p.held === this.net.id) {
        m.position.set(this.pos.x - Math.sin(this.yaw) * 0.55, 1.25, this.pos.z - Math.cos(this.yaw) * 0.55);
        continue;
      }
      if (p.held) continue;
      if (p.vel.lengthSq() < 0.0001 && m.position.y <= p.half + 0.001) continue;
      p.vel.y -= 18 * dt;
      m.position.addScaledVector(p.vel, dt);
      m.rotation.x += p.vel.z * dt; m.rotation.z -= p.vel.x * dt;
      if (m.position.y < p.half) { m.position.y = p.half; p.vel.y *= -0.35; p.vel.x *= 0.7; p.vel.z *= 0.7; if (Math.abs(p.vel.y) < 0.4) p.vel.y = 0; }
      if (m.position.y > ROOM.h - 0.2) { m.position.y = ROOM.h - 0.2; p.vel.y = -Math.abs(p.vel.y) * 0.5; }
      for (const [axis, min, max] of [['x', ROOM.minX + 0.2, ROOM.maxX - 0.2], ['z', ROOM.minZ + 0.2, ROOM.maxZ - 0.2]]) {
        if (m.position[axis] < min) { m.position[axis] = min; p.vel[axis] = Math.abs(p.vel[axis]) * 0.5; }
        if (m.position[axis] > max) { m.position[axis] = max; p.vel[axis] = -Math.abs(p.vel[axis]) * 0.5; }
      }
      if (this.boss.position.distanceTo(new THREE.Vector3(m.position.x, 0, m.position.z)) < 0.6 && m.position.y < 2.2 && p.vel.length() > 4) {
        p.vel.multiplyScalar(-0.3);
        this.bossSay('AUA! DAS GIBT EINE ABMAHNUNG!');
      }
    }
  }

  // ---------------- Bewegung + Third-Person-Kamera ----------------
  collides(x, z) {
    const r = 0.3;
    if (x < ROOM.minX + r || x > ROOM.maxX - r || z < ROOM.minZ + r || z > ROOM.maxZ - r) return true;
    return this.office.colliders.some(c => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);
  }

  updatePlayer(dt) {
    const av = this.player;
    if (this.seated) {
      const d = this.seated;
      av.position.set(d.chairPos.x, -0.33, d.chairPos.z);
      av.rotation.y = d.rotY;
      animateAvatar(av, dt, 0, true);
      return;
    }
    const stunned = performance.now() < this.stunUntil;
    const speed = stunned ? 0 : (this.crouch ? 1.4 : this.keys.ShiftLeft || this.keys.ShiftRight || this.touchRun ? 5.5 : 3.2) * (performance.now() < this.coffeeUntil ? 1.6 : 1);
    const tm = this.touchMove || { x: 0, y: 0 };
    const f = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) - (Math.abs(tm.y) > 0.15 ? tm.y : 0);
    const s = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) + (Math.abs(tm.x) > 0.15 ? tm.x : 0);
    let moving = 0;
    if (f || s) {
      const len = Math.max(1, Math.hypot(f, s));
      const dx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) / len * speed * dt;
      const dz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) / len * speed * dt;
      if (!this.collides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
      if (!this.collides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
      moving = speed;
      const targetRot = Math.atan2(-dx, -dz);
      let diff = targetRot - av.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      av.rotation.y += diff * Math.min(1, dt * 12);
    }
    av.position.set(this.pos.x, this.crouch ? -0.45 : 0, this.pos.z);
    animateAvatar(av, dt, moving, false);
    this.applyStunPose(av, stunned);
    $('#stun').classList.toggle('show', stunned);

    // Kamera hinter und über der Figur, stoppt vor Wänden
    const target = new THREE.Vector3(this.pos.x, this.crouch || stunned ? 1.0 : 1.75, this.pos.z);
    const back = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    let dist = 3.1;
    this.camRay.set(target, back); this.camRay.far = dist;
    const hit = this.camRay.intersectObjects(this.office.solids, false)[0];
    if (hit) dist = Math.max(0.6, hit.distance - 0.2);
    // leicht über die rechte Schulter, wie im Original
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(0.55 * Math.min(1, dist / 3.1));
    const camPos = target.clone().addScaledVector(back, dist).add(right);
    camPos.y = Math.min(ROOM.h - 0.15, Math.max(0.4, camPos.y));
    this.camera.position.lerp(camPos, Math.min(1, dt * 14));
    if (this.shake > 0) { this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0)); this.shake = Math.max(0, this.shake - dt); }
    this.camera.lookAt(target.x - Math.sin(this.yaw) * 2 + right.x, 1.45 + Math.sin(this.pitch) * 2, target.z - Math.cos(this.yaw) * 2 + right.z);
  }

  // ---------------- Chef-NPC ----------------
  bossSay(text) {
    if (performance.now() - this.bossLine < 2500) return;
    this.bossLine = performance.now();
    this.showBubble(this.boss, '😡 ' + text, 3000);
    voice.beep(160, 0.2, 'sawtooth', 0.05);
  }

  updateBoss(dt) {
    const ko = performance.now() < (this.bossStunUntil || 0);
    this.applyStunPose(this.boss, ko);
    if (this.phase !== 'work' || ko) { animateAvatar(this.boss, dt, 0, false); return; }
    const [tx, tz] = this.bossPath[this.bossTarget];
    const b = this.boss.position;
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 0.2) this.bossTarget = (this.bossTarget + 1) % this.bossPath.length;
    else { b.x += dx / d * 1.3 * dt; b.z += dz / d * 1.3 * dt; this.boss.rotation.y = Math.atan2(-dx, -dz); }
    animateAvatar(this.boss, dt, 1.3, false);
    if (!this.seated && b.distanceTo(new THREE.Vector3(this.pos.x, 0, this.pos.z)) < 2.2 && Math.random() < dt) {
      this.bossSay(['ZURÜCK AN DIE ARBEIT!', 'Pause ist für SCHWACHE!', 'Ich zähle die Sekunden ...', 'Die Quote macht sich nicht von allein!'][Math.floor(Math.random() * 4)]);
    }
  }

  showBubble(obj, text, ms = 4000) {
    if (obj.userData.bubble) obj.remove(obj.userData.bubble);
    const s = textSprite(text.length > 34 ? text.slice(0, 33) + '…' : text, '#111', 'rgba(255,255,255,0.94)', 0.9);
    s.position.y = 2.85;
    obj.add(s);
    obj.userData.bubble = s;
    clearTimeout(obj.userData.bubbleT);
    obj.userData.bubbleT = setTimeout(() => { obj.remove(s); if (obj.userData.bubble === s) obj.userData.bubble = null; }, ms);
  }

  // ---------------- Anrufe ----------------
  pickCaller() {
    const baiterChance = 0.1 + 0.07 * (this.day - 1);
    const pool = this.personas.filter(p => p.scambaiter === (Math.random() < baiterChance) && p.id !== this.lastPersona);
    const list = pool.length ? pool : this.personas;
    const p = list[Math.floor(Math.random() * list.length)];
    this.lastPersona = p.id;
    const out = { ...p, voice: { ...p.voice, index: this.personas.indexOf(p) } };
    if (this.richCalls > 0) { this.richCalls--; out.money = p.money * 4; }
    return out;
  }

  updateCalls() {
    const now = performance.now();
    const pc = this.computer;
    const ringing = pc.call?.state === 'ringing';
    for (const d of this.office.desks) d.phoneLight.material.emissiveIntensity = 0;
    if (this.seated && ringing) {
      this.seated.phoneLight.material.emissiveIntensity = Math.sin(now / 120) > 0 ? 3 : 0;
      if (now - (this.lastRingSound || 0) > 1600) { voice.ring(); this.lastRingSound = now; }
      if (now - pc.call.ringStart > 20000) pc.missCall();
    }
    if (this.phase !== 'work' || !this.seated || pc.call || this.chaos?.kind === 'power') return;
    if (now < this.nextRingAt) return;
    const scams = SCAMS.filter(s => s.day <= this.day || this.unlockedScams.has(s.id));
    pc.ring({
      persona: this.pickCaller(),
      scam: scams[Math.floor(Math.random() * scams.length)],
      number: '+49 ' + (150 + Math.floor(Math.random() * 30)) + ' ' + Math.floor(1e6 + Math.random() * 9e6),
      code: String(Math.floor(100000 + Math.random() * 900000)),
    });
  }

  callFinished() {
    this.nextRingAt = performance.now() + 4000 + Math.random() * 5000;
  }

  // ---------------- Geld & Strafen ----------------
  payout(amount) {
    const el = $('#payout');
    el.textContent = `+${euro(amount)}`;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }

  addEarnings(amount, msg) {
    this.toast(msg);
    this.payout(amount);
    this.personal += amount;
    this.earned += amount;
    this.board[this.me.name] = (this.board[this.me.name] || 0) + amount;
    this.apps.log(msg.replace(/^[^\w]*/, '').slice(0, 60), amount);
    if (this.net.isHost) this.broadcastState();
    else this.net.send('earn', { amount, name: this.me.name });
  }

  penalty(pct, reason) {
    this.toast(`📉 ${reason} (-${Math.round(pct * 100)}%)`);
    this.events.push(reason);
    if (this.net.isHost) { this.earned = Math.round(this.earned * (1 - pct)); this.broadcastState(); }
    else this.net.send('penalty', { pct, reason });
  }

  scambaited(p) {
    this.penalty(0.2, `Scambaiter "${p.name}" hat ${this.me.name} live auf YouTube bloßgestellt`);
    this.bossSay('WIR SIND AUF YOUTUBE?!');
  }

  // ---------------- Tagesablauf (Host) ----------------
  startDay(day) {
    if (day === 1) this.personal = 0;
    this.day = day;
    this.time = 0;
    this.earned = 0;
    this.board = {};
    this.events = [];
    this.phase = 'work';
    this.chaosPlan = day >= 2 ? [{ at: CONFIG.DAY_SECONDS * (0.3 + Math.random() * 0.4), kind: Math.random() < 0.5 || day < 3 ? 'raid' : 'power' }] : [];
    if (day >= 4) this.chaosPlan.push({ at: CONFIG.DAY_SECONDS * 0.85, kind: 'raid' });
    if (day >= 3) this.chaosPlan.push({ at: CONFIG.DAY_SECONDS * (0.15 + Math.random() * 0.1), kind: 'airstrike' });
    this.onDayStart();
    this.broadcastState();
  }

  onDayStart() {
    $('#review').classList.remove('show');
    if (this.day === 1) { this.personal = 0; this.unlockedScams.clear(); this.inventory = []; this.equipped = -1; this.renderInv(); this.apps.resetRun(); }
    this.apps.refreshIcons();
    this.office.setFired(false);
    const newScam = SCAMS.find(s => s.day === this.day);
    this.toast(`☀️ Tag ${this.day} beginnt! Quote: ${euro(this.quota)}`);
    if (newScam) setTimeout(() => this.toast(`🔓 Neue Masche freigeschaltet: ${newScam.icon} ${newScam.name}`), 1500);
    this.boss.position.set(9, 0, 2);
    if (!this.seated) this.lockPointer();
  }

  broadcastState() {
    this.net.send('state', { day: this.day, time: this.time, earned: this.earned, phase: this.phase, events: this.events.slice(-6), board: Object.entries(this.board).slice(0, 8) });
  }

  hostTick(dt) {
    if (this.phase !== 'work') return;
    this.time += dt;
    for (const c of this.chaosPlan) {
      if (!c.fired && this.time >= c.at) { c.fired = true; this.startChaos(c.kind); this.net.send('chaos', { kind: c.kind }); }
    }
    if ((this.stateT = (this.stateT || 0) + dt) > 1) { this.stateT = 0; this.broadcastState(); }
    if (this.time >= CONFIG.DAY_SECONDS) this.endDay();
  }

  rankedBoard() {
    const names = new Set([this.me?.name, ...[...this.net.peers.values()].map(p => p.name), ...Object.keys(this.board)]);
    return [...names].filter(Boolean).map(n => [n, this.board[n] || 0]).sort((a, b) => b[1] - a[1]);
  }

  async endDay() {
    this.time = CONFIG.DAY_SECONDS;
    this.phase = 'review';
    this.broadcastState();
    const passed = this.earned >= this.quota;
    const stats = { day: this.day, quota: this.quota, earned: this.earned, passed, events: this.events.join('; '), board: this.rankedBoard() };
    this.showReview(stats, null);
    const res = await think({ mode: 'boss', stats });
    this.showReview(stats, res.say);
    this.net.send('review', { stats, text: res.say });
    if (!passed) { this.phase = 'fired'; this.broadcastState(); }
  }

  showReview(stats, text) {
    if (this.seated) this.standUp();
    document.exitPointerLock?.();
    this.phase = stats.passed ? 'review' : 'fired';
    if (this.chaos?.kind === 'power') this.endPower(false);
    this.chaos = null;
    this.banner('');
    this.office.setFired(!stats.passed);
    $('#review').classList.add('show');
    $('#rv-eyebrow').textContent = stats.passed ? 'Callcenter Chaos · Leistungsbericht' : 'Callcenter Chaos · Kündigungsbericht';
    $('#rv-title').textContent = stats.passed ? `Tag ${stats.day} überstanden` : 'Alle gefeuert';
    const days = stats.passed ? stats.day : stats.day - 1;
    $('#rv-days').textContent = `${days} ${days === 1 ? 'TAG' : 'TAGE'}`;
    $('#rv-team').textContent = euro(stats.earned);
    $('#rv-quota').textContent = `TEAM-UMSATZ · QUOTE ${euro(stats.quota)}`;
    const board = stats.board?.length ? stats.board : [[this.me?.name || 'Du', stats.earned]];
    const top = Math.max(1, ...board.map(b => b[1]));
    const total = Math.max(1, board.reduce((a, b) => a + b[1], 0));
    $('#rv-rows').innerHTML = board.map(([n, v], i) => `<div class="rrow ${i === 0 ? 'first' : ''}">
        <span class="rk">#${i + 1}</span>
        <div style="min-width:0"><div class="nm">${esc(n)}</div><div class="barw"><i style="width:${Math.round(v / top * 100)}%"></i></div></div>
        <span class="v">${euro(v)}</span><span class="s">${Math.round(v / total * 100)}%</span></div>`).join('');
    $('#rv-boss').innerHTML = `<b>Herr Brenner:</b> ${esc(text ?? 'holt tief Luft ...')}`;
    if (text) voice.speak(text, { pitch: 0.6, rate: 1.1 });
    const btn = $('#rv-next');
    btn.hidden = !(this.net.isHost && text);
    btn.textContent = stats.passed ? `Weiter zu Tag ${stats.day + 1}` : 'Neuer Run';
    btn.onclick = () => { voice.stopSpeaking(); this.startDay(stats.passed ? stats.day + 1 : 1); };
    $('#rv-wait').hidden = this.net.isHost;
    $('#rv-result').textContent = stats.passed ? 'Quote geschafft. Ihr dürft bleiben.' : `Quote verfehlt. Ihr habt ${days} ${days === 1 ? 'Tag' : 'Tage'} überlebt.`;
  }

  // ---------------- Chaos-Events ----------------
  startChaos(kind) {
    if (kind === 'airstrike') { this.airstrike('self', false, true); return; }
    if (kind === 'raid') {
      this.chaos = { kind, until: performance.now() + 25000, done: false };
      voice.buzz();
      this.banner('🚨 POLIZEIRAZZIA! Alle zum Schredder (vorne rechts) und Beweise vernichten! 🚨');
      if (this.seated) this.toast('🚨 Steh auf (Esc) und lauf zum SCHREDDER!');
    } else {
      this.chaos = { kind, until: performance.now() + 30000 };
      this.office.setPower(false);
      if (this.computer.call && this.computer.call.state !== 'ended') this.computer.endCall('Stromausfall! Die Leitung ist tot.');
      if (this.seated) this.standUp();
      this.banner('⚡ STROMAUSFALL! Jemand muss zum Sicherungskasten (hintere Wand)! ⚡');
    }
  }

  endPower(fixed) {
    if (this.chaos?.kind !== 'power') return;
    this.chaos = null;
    this.office.setPower(true);
    this.banner('');
    this.toast(fixed ? '💡 Strom ist wieder da!' : '💡 Der Hausmeister hat die Sicherung repariert.');
  }

  updateChaos() {
    const c = this.chaos;
    if (!c) return;
    const left = Math.max(0, Math.ceil((c.until - performance.now()) / 1000));
    if (c.kind === 'raid') {
      $('#banner-timer').textContent = c.done ? '✅ Deine Beweise sind weg!' : `${left}s`;
      if (left === 0) {
        if (!c.done) this.penalty(0.15, `Die Polizei hat bei ${this.me.name} Beweise gefunden`);
        else this.toast('👮 Die Polizei findet nichts und zieht ab.');
        this.chaos = null; this.banner('');
      }
    } else {
      $('#banner-timer').textContent = `${left}s`;
      if (left === 0) { if (this.net.isHost) this.penalty(0.1, 'Stromausfall nicht behoben'); this.endPower(false); }
    }
  }

  banner(text) {
    $('#banner').classList.toggle('show', !!text);
    $('#banner-text').textContent = text;
  }

  // ---------------- Koop-Nachrichten ----------------
  bindNet() {
    const n = this.net;
    n.on('join', (p) => {
      const av = makeAvatar(p.color, p.name);
      this.scene.add(av);
      this.remotes.set(p.id, { av, target: new THREE.Vector3(-5.5, 0, 0), last: new THREE.Vector3(), ry: 0, name: p.name });
      this.toast(`👋 ${p.name} ist da`);
      if (n.isHost) this.broadcastState();
    });
    n.on('leave', (id) => {
      const r = this.remotes.get(id);
      if (!r) return;
      this.scene.remove(r.av);
      this.office.desks.forEach(d => { if (d.occupant === id) d.occupant = null; });
      this.office.props.forEach(p => { if (p.held === id) p.held = null; });
      this.toast(`🚪 ${r.name} hat das Büro verlassen`);
      this.remotes.delete(id);
    });
    n.on('peers', () => { this.renderPlayers(); this.apps.renderPeople(); });
    n.on('pos', (m) => {
      const r = this.remotes.get(m.from);
      if (r) { r.target.set(m.x, 0, m.z); r.ry = m.ry; }
    });
    n.on('seat', (m) => { if (this.office.desks[m.desk]) this.office.desks[m.desk].occupant = m.from; });
    n.on('unseat', (m) => { const d = this.office.desks[m.desk]; if (d && d.occupant === m.from) d.occupant = null; });
    n.on('bubble', (m) => {
      const r = this.remotes.get(m.from);
      if (r) this.showBubble(r.av, m.text, 5000);
    });
    n.on('prop', (m) => {
      const p = this.office.props[m.i];
      if (!p) return;
      p.mesh.position.fromArray(m.p);
      p.vel.fromArray(m.v);
      p.held = m.held || null;
    });
    n.on('state', (m) => {
      if (n.isHost) return;
      const newDay = m.phase === 'work' && (this.phase !== 'work' || m.day !== this.day);
      if (newDay && m.day === 1) this.personal = 0;
      Object.assign(this, { day: m.day, time: m.time, earned: m.earned, events: m.events || [] });
      if (Array.isArray(m.board)) this.board = Object.fromEntries(m.board);
      this.phase = m.phase;
      if (newDay) this.onDayStart();
    });
    n.on('earn', (m) => {
      if (!n.isHost) return;
      this.earned += m.amount;
      this.board[m.name] = (this.board[m.name] || 0) + m.amount;
      this.toast(`💰 ${m.name}: +${euro(m.amount)}`);
      this.broadcastState();
    });
    n.on('penalty', (m) => {
      if (!n.isHost) return;
      this.earned = Math.round(this.earned * (1 - m.pct));
      this.events.push(m.reason);
      this.toast('📉 ' + m.reason);
      this.broadcastState();
    });
    n.on('review', (m) => { if (!n.isHost) this.showReview(m.stats, m.text); });
    n.on('chaos', (m) => { if (!n.isHost) this.startChaos(m.kind); });
    n.on('fuse', () => this.endPower(true));
    n.on('hit', (m) => this.onHit(m));
    n.on('fx', (m) => this.itemFx(m.kind, new THREE.Vector3(...m.from), new THREE.Vector3(...m.to)));
    n.on('airstrike', (m) => this.airstrike(m.kind, false, false, m.by));
    n.on('cookies', () => this.office.cookieRain());
    n.on('paint', (m) => { if (typeof m.url === 'string' && m.url.startsWith('data:image/')) { const img = new Image(); img.onload = () => this.office.setPinboard(img); img.src = m.url; } });
    n.on('quote', (m) => this.addQuote(String(m.name || '?').slice(0, 16), String(m.text || '').slice(0, 120), false));
  }

  renderPlayers() {
    const names = [this.me?.name + ' (du)', ...[...this.net.peers.values()].map(p => p.name)];
    $('#players').innerHTML = this.net.online ? names.map(nm => `<div>🎧 ${esc(nm)}</div>`).join('') : '';
  }

  syncNet(dt) {
    if (!this.net.online) return;
    this.posT = (this.posT || 0) + dt;
    if (this.posT > 0.1) {
      this.posT = 0;
      const p = this.seated ? this.seated.chairPos : this.pos;
      this.net.send('pos', { x: +p.x.toFixed(2), z: +p.z.toFixed(2), ry: +this.player.rotation.y.toFixed(2) });
      if (this.held) this.net.send('prop', { i: this.held.i, p: this.held.mesh.position.toArray(), v: [0, 0, 0], held: this.net.id });
    }
    for (const [id, r] of this.remotes) {
      const desk = this.office.desks.find(d => d.occupant === id);
      if (desk) {
        r.av.position.set(desk.chairPos.x, -0.33, desk.chairPos.z);
        r.av.rotation.y = desk.rotY;
        animateAvatar(r.av, dt, 0, true);
        continue;
      }
      r.last.copy(r.av.position);
      r.av.position.lerp(r.target, Math.min(1, dt * 10));
      r.av.position.y = 0;
      r.av.rotation.y = r.ry;
      animateAvatar(r.av, dt, r.last.distanceTo(r.av.position) / Math.max(dt, 0.001), false);
      this.applyStunPose(r.av, performance.now() < (r.stunUntil || 0));
    }
  }

  // ---------------- Gegenstände & Waffen (Scamazon "Physische Waren") ----------------
  giveItem(id) {
    this.inventory.push(id);
    this.equipped = this.inventory.length - 1;
    this.renderInv();
  }
  cycleItem() {
    if (!this.inventory.length) return;
    this.equipped = this.equipped + 1 >= this.inventory.length ? -1 : this.equipped + 1;
    this.renderInv();
  }
  renderInv() {
    const E = { spray: '🧴', baton: '🏏', taser: '⚡', shotgun: '🎉', sniper: '🎯' };
    $('#inv').innerHTML = this.inventory.length ? ['✋', ...this.inventory.map(i => E[i] || '?')].map((e, i) => `<div class="inv-s ${i - 1 === this.equipped ? 'on' : ''}"><small>${i ? i : 'Q'}</small>${e}</div>`).join('') : '';
    // Gegenstand in der Hand der Figur
    if (!this.player) return;
    const hand = this.player.userData.arms[1];
    if (this.handMesh) hand.remove(this.handMesh);
    this.handMesh = null;
    const id = this.inventory[this.equipped];
    if (!id) return;
    const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    const geo = { spray: [new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), 0x7ccf3a], baton: [new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), 0x222222], taser: [new THREE.BoxGeometry(0.08, 0.16, 0.06), 0xffd23a], shotgun: [new THREE.BoxGeometry(0.07, 0.08, 0.75), 0xff7a1a], sniper: [new THREE.BoxGeometry(0.06, 0.08, 1.1), 0x2d3550] }[id];
    this.handMesh = new THREE.Mesh(geo[0], M(geo[1]));
    this.handMesh.position.set(0, -0.62, ['shotgun', 'sniper'].includes(id) ? -0.3 : -0.05);
    if (id === 'baton') this.handMesh.rotation.x = Math.PI / 2.4;
    hand.add(this.handMesh);
  }
  useItem() {
    const id = this.inventory[this.equipped];
    if (!id || performance.now() < this.itemCd || performance.now() < this.stunUntil) return;
    const R = { spray: [3, 0.8, 3000, 1200], baton: [1.8, 0.7, 2500, 900], taser: [5, 0.92, 4000, 1500], shotgun: [7, 0.75, 3500, 1800], sniper: [40, 0.995, 5000, 3000] }[id];
    const [range, cone, dur, cd] = R;
    this.itemCd = performance.now() + cd;
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
    const origin = new THREE.Vector3(this.pos.x, 1.3, this.pos.z);
    // Ziel suchen: Kollegen und Chef
    const targets = [...[...this.remotes].map(([pid, r]) => ({ id: pid, pos: r.av.position })), { id: 'boss', pos: this.boss.position }];
    let best = null;
    for (const t of targets) {
      const v = new THREE.Vector3(t.pos.x - origin.x, 0, t.pos.z - origin.z);
      const d = v.length(); if (d > range || d < 0.01) continue;
      if (v.normalize().dot(dir) < cone) continue;
      if (!best || d < best.d) best = { ...t, d };
    }
    const to = best ? new THREE.Vector3(best.pos.x, 1.3, best.pos.z) : origin.clone().addScaledVector(dir, Math.min(range, 8));
    this.itemFx(id, origin, to);
    this.net.send('fx', { kind: id, from: origin.toArray(), to: to.toArray() });
    voice.beep({ spray: 300, baton: 140, taser: 1200, shotgun: 90, sniper: 60 }[id], 0.25, id === 'taser' ? 'square' : 'sawtooth', 0.12);
    if (!best) return;
    const m = { target: best.id, kind: id, dur, by: this.me.name, dir: dir.toArray() };
    this.onHit(m);
    this.net.send('hit', m);
  }
  onHit(m) {
    const until = performance.now() + (Number(m.dur) || 3000);
    if (m.target === 'boss') {
      this.bossStunUntil = until;
      this.showBubble(this.boss, '😵 ABMAHNUNG FÜR ' + String(m.by || '?').toUpperCase() + '!', 3500);
      return;
    }
    if (m.target === this.net.id) {
      if (this.seated) this.standUp();
      this.stunUntil = until;
      if (m.kind === 'shotgun' && Array.isArray(m.dir)) { for (let i = 0; i < 12; i++) { const nx = this.pos.x + m.dir[0] * 0.15, nz = this.pos.z + m.dir[2] * 0.15; if (!this.collides(nx, nz)) this.pos.set(nx, 0, nz); } }
      this.toast(`⭐ ${m.by} hat dich erwischt!`);
      return;
    }
    const r = this.remotes.get(m.target);
    if (r) r.stunUntil = until;
  }
  applyStunPose(av, on) {
    av.rotation.x = on ? -Math.PI / 2 : 0;
    if (on) { av.position.y = 0.28; av.userData.wasStun = true; }
    else if (av.userData.wasStun) { av.userData.wasStun = false; if (av === this.boss) av.position.y = 0; }
    let stars = av.userData.stars;
    if (on && !stars) {
      stars = av.userData.stars = textSprite('⭐ 💫 ⭐', '#ffd23a', 'rgba(0,0,0,0)', 0.7);
      av.add(stars);
    }
    if (stars) { stars.visible = on; stars.position.set(0, 1.9, 0.6); stars.material.rotation = Math.sin(performance.now() / 200) * 0.3; }
  }
  // Effekte der Waffen sichtbar machen (Spray-Wolke, Taser-Blitz, Konfetti, Leuchtspur)
  itemFx(kind, from, to) {
    const col = { spray: 0x8bd450, baton: 0xffffff, taser: 0xfff060, shotgun: 0xff4fd8, sniper: 0xffb040 }[kind] || 0xffffff;
    const n = kind === 'shotgun' ? 40 : kind === 'spray' ? 26 : 10;
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: kind === 'shotgun' ? new THREE.Color().setHSL(Math.random(), 0.9, 0.6) : col, transparent: true, depthWrite: false }));
      const k = Math.random();
      sp.position.lerpVectors(from, to, kind === 'spray' ? k * 0.9 : k).add(new THREE.Vector3((Math.random() - 0.5) * (kind === 'spray' ? 0.6 * k : 0.15), (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * (kind === 'spray' ? 0.6 * k : 0.15)));
      const s0 = kind === 'spray' ? 0.25 + k * 0.4 : 0.08;
      sp.scale.set(s0, s0, 1);
      this.scene.add(sp);
      setTimeout(() => this.scene.remove(sp), 350 + Math.random() * 500);
    }
  }
  // ---------------- Luftschlag ----------------
  airstrike(kind, origin, chaos = false, by = null) {
    if (origin) this.net.send('airstrike', { kind, by: this.me.name });
    voice.buzz();
    if (kind === 'rival') {
      this.toast(`🚀 ${by || this.me.name} hat einen Luftschlag auf die Konkurrenz bestellt! Deren reiche Kunden rufen jetzt bei euch an.`);
      this.richCalls += 4;
      $('#flash').style.opacity = 0.6; setTimeout(() => ($('#flash').style.opacity = 0), 250);
      return;
    }
    this.banner(chaos ? '🚨 LUFTANGRIFF! Duck dich unter einen Tisch (C)! 🚨' : `💥 ${by || this.me.name} hat einen Luftschlag auf EUCH bestellt! Duck dich unter einen Tisch (C)! 💥`);
    this.strikeAt = performance.now() + 6000;
    let k = 0;
    const siren = setInterval(() => { voice.beep(k++ % 2 ? 620 : 880, 0.4, 'square', 0.05); if (performance.now() > this.strikeAt) clearInterval(siren); }, 450);
    setTimeout(() => {
      for (let i = 0; i < 14; i++) setTimeout(() => {
        this.office.explosion(-11 + Math.random() * 14, -7 + Math.random() * 14);
        voice.beep(60 + Math.random() * 40, 0.5, 'sawtooth', 0.15);
        this.shake = 0.35;
      }, i * 200);
      $('#flash').style.opacity = 0.8; setTimeout(() => ($('#flash').style.opacity = 0), 300);
      const safe = this.crouch && this.office.desks.some(d => Math.hypot(d.x - this.pos.x, d.z - this.pos.z) < 1.3);
      if (!safe && !this.seated) { this.stunUntil = performance.now() + 6000; this.toast('💥 Erwischt! Nächstes Mal unter den Tisch!'); }
      else if (this.seated) { this.standUp(); this.stunUntil = performance.now() + 6000; this.toast('💥 Wer am PC sitzen bleibt, fliegt mit!'); }
      else this.toast('😮‍💨 Unter dem Tisch überlebt!');
      this.bossStunUntil = performance.now() + 6000;
      this.banner('');
    }, 6000);
  }
  cookieRain(origin) {
    this.office.cookieRain();
    if (origin) { this.net.send('cookies'); this.toast('🍪 KEKS-METEORSCHAUER!'); }
  }
  addQuote(name, text, broadcast = true) {
    this.quotes.push([name, text]);
    if (this.quotes.length > 20) this.quotes.shift();
    this.office.setQuotes(this.quotes);
    if (broadcast) this.net.send('quote', { name, text });
  }

  // ---------------- HUD ----------------
  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3500);
    setTimeout(() => t.remove(), 4200);
  }

  updateHUD() {
    const stats = { personal: this.personal, team: this.earned, quota: this.quota, review: this.reviewIn, clock: this.clock, date: this.dateLabel };
    $('#h-personal').textContent = `PERSÖNLICH ${euro(stats.personal)}`;
    $('#h-team').textContent = `TEAM ${euro(stats.team)}`;
    $('#h-quota').textContent = `QUOTE ${euro(stats.quota)}`;
    $('#h-review').textContent = `BEURTEILUNG ${stats.review}`;
    $('#h-clock').textContent = stats.clock;
    $('#h-date').textContent = stats.date;
    if (this.computer.isOpen) this.computer.setStats(stats);
    const t = !this.seated && this.phase !== 'menu' ? this.lookTarget() : null;
    $('#prompt').textContent = this.held ? '[E] fallen lassen · [Klick] werfen' : this.promptFor(t);
    if (this.wbT % 60 === 0 && this.computer.isOpen) { if (!this.apps.win.shop.win.hidden) this.apps.renderShop(); this.apps.renderLedger(); }
    if ((this.wbT = (this.wbT || 0) + 1) % 30 === 0) this.office.updateWhiteboard({ day: this.day, clock: this.clock, earned: this.earned, quota: this.quota, board: this.rankedBoard() });
  }

  // Webcam-Bild der eigenen Figur ins Kamera-Fenster zeichnen (wie im Original)
  renderWebcam(cv = this.computer.camCanvas, from = this.seated.webcam, look = new THREE.Vector3(this.seated.chairPos.x, 1.45, this.seated.chairPos.z)) {
    this.webcam.position.copy(from);
    this.webcam.lookAt(look);
    const pr = this.renderer.getPixelRatio();
    const w = cv.width / pr, h = cv.height / pr;
    this.renderer.setScissorTest(true);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);
    this.renderer.render(this.scene, this.webcam);
    const src = this.renderer.domElement;
    cv.getContext('2d').drawImage(src, 0, src.height - cv.height, cv.width, cv.height, 0, 0, cv.width, cv.height);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight);
  }

  frame() {
    const dt = Math.min(0.05, this.clock3.getDelta());
    const t = performance.now() / 1000;
    this.office.update(t);
    if (this.phase !== 'menu') {
      if (this.net.isHost) this.hostTick(dt);
      this.updatePlayer(dt);
      if (this.phase === 'review' || this.phase === 'fired') {
        // Kamerafahrt über das Büro während der Beurteilung
        const a = t / 7;
        this.camera.position.set(-4 + Math.sin(a) * 6, 4.2, 1 + Math.cos(a) * 4.5);
        this.camera.lookAt(-4, 0.8, 0);
      }
      this.updateProps(dt);
      this.updateBoss(dt);
      this.updateCalls();
      this.updateChaos();
      this.syncNet(dt);
      this.updateHUD();
    } else {
      const a = t / 9;
      this.camera.position.set(-5.5 + Math.sin(a) * 4.5, 2.6, -0.5 + Math.cos(a) * 2.2);
      this.camera.lookAt(-5.5, 1.1, -0.5);
    }
    if (this.seated && this.computer.isOpen) {
      this.camFrame = (this.camFrame || 0) + 1;
      if ((this.computer.camVisible || this.recording) && this.camFrame % 2 === 0) this.renderWebcam();
      const tiles = this.camFrame % 6 === 3 ? this.apps.zoomyCanvases() : null;
      if (tiles) for (const [id, cv] of tiles) {
        if (id === 'me') { this.renderWebcam(cv); continue; }
        const r = this.remotes.get(id); if (!r) continue;
        const a = r.av.position, ry = r.av.rotation.y;
        this.renderWebcam(cv, new THREE.Vector3(a.x - Math.sin(ry) * 1.1, 1.55 + a.y, a.z - Math.cos(ry) * 1.1), new THREE.Vector3(a.x, 1.45 + a.y, a.z));
      }
      return; // der Desktop deckt die 3D-Ansicht komplett ab
    }
    this.renderer.render(this.scene, this.camera);
  }
}

window.game = new Game();
window.game.init();
