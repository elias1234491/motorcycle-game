// Callcenter Chaos - Hauptspiel: 3D-Büro in Ego-Sicht, Tagesablauf, Chef, Chaos-Events, Koop.
import * as THREE from 'three';
import { CONFIG, SCAMS } from '../config.js';
import { buildOffice, makeAvatar, textSprite, ROOM } from './office.js';
import { Computer } from './computer.js';
import { Net, netAvailable, initNet } from './net.js';
import { think, brainMode, BRAIN_LABEL, getApiKey, setApiKey, preloadBrain, initBrain, inClaude } from './brain.js';
import * as voice from './voice.js';

const $ = (s) => document.querySelector(s);
const euro = (n) => Math.round(n).toLocaleString('de-DE') + ' €';
const COLORS = [0x3b82f6, 0x22c55e, 0xf59e0b, 0xec4899, 0x8b5cf6, 0x14b8a6];

class Game {
  constructor() {
    this.net = new Net();
    this.phase = 'menu';           // menu | work | review | fired
    this.day = 1;
    this.time = 0;                 // Sekunden im Arbeitstag
    this.earned = 0;
    this.events = [];
    this.keys = {};
    this.yaw = 0; this.pitch = 0;
    this.pos = new THREE.Vector3(-5.5, 1.6, 6);
    this.seated = null;
    this.held = null;
    this.coffeeUntil = 0;
    this.nextRingAt = 0;
    this.remotes = new Map();
    this.chaos = null;
    this.personas = [];
    this.lastPersona = null;
  }

  get quota() { return Math.round(CONFIG.BASE_QUOTA * Math.pow(CONFIG.QUOTA_GROWTH, this.day - 1) / 50) * 50; }
  get clock() {
    const mins = 9 * 60 + Math.floor((this.time / CONFIG.DAY_SECONDS) * 8 * 60);
    return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }

  async init() {
    this.personas = (await (await fetch('personas.json')).json()).callers;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.prepend(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202630);
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 100);
    this.office = buildOffice(this.scene);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.6;
    this.computer = new Computer(this);

    this.boss = makeAvatar(0x2a2a2a, 'Chef Brenner', { tie: true, skin: 0xe8a888 });
    this.boss.position.set(9, 0, 2);
    this.scene.add(this.boss);
    this.bossPath = [[9, 2], [6, 0], [2, 0], [-5.5, -1], [-5.5, 5.5], [-10, 0], [2, 0], [6, 0]];
    this.bossTarget = 0;
    this.bossLine = 0;

    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.bindInput();
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
    // Fähigkeiten von Claude kommen asynchron an
    Promise.all([initBrain(), initNet()]).then(() => { refreshMode(); refreshNet(); });
    const me = () => {
      const n = name.value.trim() || 'Praktikant ' + Math.floor(Math.random() * 99);
      try { localStorage.setItem('ccc_name', n); } catch {}
      return { name: n.slice(0, 16), color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    };
    $('#m-solo').addEventListener('click', () => this.start(me()));
    $('#m-host').addEventListener('click', () => {
      const code = Math.random().toString(36).slice(2, 7).toUpperCase();
      this.start(me(), code);
    });
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
        $('#m-netinfo').textContent = '❌ ' + e.message;
        return;
      }
      $('#room-code').textContent = `Raum-Code: ${room}`;
      setTimeout(() => this.toast(`👥 Raum-Code: ${room} - Freunde öffnen dieselbe Seite und treten damit bei`), 800);
    }
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
    });
    addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (this.computer.isOpen) this.computer.keyUp(e);
    });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.renderer.domElement) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch - e.movementY * 0.0022));
    });
    addEventListener('mousedown', (e) => {
      if (this.phase === 'menu' || this.computer.isOpen) return;
      if (e.target !== this.renderer.domElement) return;
      if (document.pointerLockElement !== this.renderer.domElement) { this.lockPointer(); return; }
      if (this.held) this.throwProp();
    });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.renderer.domElement;
      $('#paused').classList.toggle('show', !locked && !this.computer.isOpen && this.phase !== 'menu' && !$('#review').classList.contains('show'));
    });
  }

  lockPointer() {
    try { this.renderer.domElement.requestPointerLock()?.catch?.(() => {}); } catch {}
  }

  // ---------------- Interaktion ----------------
  lookTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const meshes = this.office.interactables.filter(i => !(i.type === 'prop' && i.data === this.held)).map(i => i.mesh);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    return hit ? this.office.interactables.find(i => i.mesh === hit.object) : null;
  }

  promptFor(t) {
    if (!t) return '';
    switch (t.type) {
      case 'desk': return t.data.occupant ? `Platz ${t.data.index + 1} ist besetzt` : `[E] An Platz ${t.data.index + 1} setzen`;
      case 'coffee': return '[E] Kaffee trinken (schneller laufen)';
      case 'shredder': return this.chaos?.kind === 'raid' && !this.chaos.done ? '[E] BEWEISE SCHREDDERN!' : 'Schredder';
      case 'fuse': return this.chaos?.kind === 'power' ? '[E] Sicherung wieder einschalten!' : 'Sicherungskasten';
      case 'prop': return this.held ? '' : `[E] ${t.data.emoji} aufheben (Klick = werfen)`;
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
      this.net.send('shredded', { id: this.net.id });
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
    this.nextRingAt = Math.max(this.nextRingAt, performance.now() + 2500);
  }

  standUp() {
    if (!this.seated) return;
    if (this.computer.call && this.computer.call.state === 'active') this.computer.endCall('Du bist einfach aufgestanden.');
    else if (this.computer.call?.state === 'ringing') this.computer.declineCall();
    this.computer.close();
    this.seated.occupant = null;
    this.net.send('unseat', { desk: this.seated.index });
    this.pos.set(this.seated.x, 1.6, this.seated.z + 1.6);
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
    p.vel.copy(dir.multiplyScalar(11)).add(new THREE.Vector3(0, 2.5, 0));
    p.held = null; this.held = null;
    this.net.send('prop', { i: p.i, p: p.mesh.position.toArray(), v: p.vel.toArray() });
    voice.beep(500, 0.08, 'triangle');
    if (this.boss.position.distanceTo(p.mesh.position) < 6) this.bossSay('WER WIRFT HIER MIT ZEUG?!');
  }
  updateProps(dt) {
    for (const p of this.office.props) {
      const m = p.mesh;
      if (p.held === this.net.id) {
        const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
        m.position.copy(this.camera.position).add(dir.multiplyScalar(0.8)).add(new THREE.Vector3(0, -0.25, 0));
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
      if (this.boss.position.distanceTo(new THREE.Vector3(m.position.x, 1.2, m.position.z)) < 0.6 && p.vel.length() > 4) {
        p.vel.multiplyScalar(-0.3);
        this.bossSay('AUA! DAS GIBT EINE ABMAHNUNG!');
      }
    }
  }

  // ---------------- Bewegung ----------------
  collides(x, z) {
    const r = 0.3;
    if (x < ROOM.minX + r || x > ROOM.maxX - r || z < ROOM.minZ + r || z > ROOM.maxZ - r) return true;
    return this.office.colliders.some(c => x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r);
  }

  updatePlayer(dt) {
    if (this.seated) {
      const d = this.seated;
      this.camera.position.lerp(d.seat, Math.min(1, dt * 8));
      const look = new THREE.Matrix4().lookAt(this.camera.position, d.lookAt, new THREE.Vector3(0, 1, 0));
      this.camera.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(look), Math.min(1, dt * 8));
      return;
    }
    const speed = (this.keys.ShiftLeft ? 5.5 : 3.2) * (performance.now() < this.coffeeUntil ? 1.6 : 1);
    const f = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0);
    const s = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    if (f || s) {
      const len = Math.hypot(f, s);
      const dx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) / len * speed * dt;
      const dz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) / len * speed * dt;
      if (!this.collides(this.pos.x + dx, this.pos.z)) this.pos.x += dx;
      if (!this.collides(this.pos.x, this.pos.z + dz)) this.pos.z += dz;
    }
    this.camera.position.lerp(this.pos, Math.min(1, dt * 20));
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  // ---------------- Chef-NPC ----------------
  bossSay(text) {
    if (performance.now() - this.bossLine < 2500) return;
    this.bossLine = performance.now();
    this.showBubble(this.boss, '😡 ' + text, 3000);
    voice.beep(160, 0.2, 'sawtooth', 0.05);
  }

  updateBoss(dt) {
    if (this.phase !== 'work') return;
    const [tx, tz] = this.bossPath[this.bossTarget];
    const b = this.boss.position;
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
    if (d < 0.2) this.bossTarget = (this.bossTarget + 1) % this.bossPath.length;
    else { b.x += dx / d * 1.3 * dt; b.z += dz / d * 1.3 * dt; this.boss.rotation.y = Math.atan2(-dx, -dz); }
    if (!this.seated && b.distanceTo(new THREE.Vector3(this.pos.x, 0, this.pos.z)) < 2.2 && Math.random() < dt) {
      this.bossSay(['ZURÜCK AN DIE ARBEIT!', 'Pause ist für SCHWACHE!', 'Ich zähle die Sekunden ...', 'Die Quote macht sich nicht von allein!'][Math.floor(Math.random() * 4)]);
    }
  }

  showBubble(obj, text, ms = 4000) {
    if (obj.userData.bubble) obj.remove(obj.userData.bubble);
    const s = textSprite(text.length > 34 ? text.slice(0, 33) + '…' : text, '#111', 'rgba(255,255,255,0.92)', 0.9);
    s.position.y = obj.userData.label ? 2.45 : 1.9;
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
    p.voice = { ...p.voice, index: this.personas.indexOf(p) };
    return p;
  }

  updateCalls() {
    const now = performance.now();
    const pc = this.computer;
    const ringing = pc.call?.state === 'ringing';
    for (const d of this.office.desks) d.phoneLight.material.emissiveIntensity = 0;
    if (this.seated && ringing) {
      this.seated.phoneLight.material.emissiveIntensity = Math.sin(now / 120) > 0 ? 2 : 0;
      if (now - (this.lastRingSound || 0) > 1600) { voice.ring(); this.lastRingSound = now; }
      if (now - pc.call.ringStart > 20000) pc.missCall();
    }
    if (this.phase !== 'work' || !this.seated || pc.call || this.chaos?.kind === 'power') return;
    if (now < this.nextRingAt) return;
    const scams = SCAMS.filter(s => s.day <= this.day);
    const scam = scams[Math.floor(Math.random() * scams.length)];
    pc.ring({
      persona: this.pickCaller(),
      scam,
      number: '+49 ' + (150 + Math.floor(Math.random() * 30)) + ' ' + Math.floor(1e6 + Math.random() * 9e6),
      code: String(Math.floor(100000 + Math.random() * 900000)),
    });
  }

  callFinished() {
    this.nextRingAt = performance.now() + 4000 + Math.random() * 5000;
  }

  // ---------------- Geld & Strafen ----------------
  addEarnings(amount, msg) {
    this.toast(msg);
    if (this.net.isHost) { this.earned += amount; this.broadcastState(); }
    else { this.earned += amount; this.net.send('earn', { amount, name: this.me.name }); }
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
    this.day = day;
    this.time = 0;
    this.earned = 0;
    this.events = [];
    this.phase = 'work';
    this.chaosPlan = day >= 2 ? [{ at: CONFIG.DAY_SECONDS * (0.3 + Math.random() * 0.4), kind: Math.random() < 0.5 || day < 3 ? 'raid' : 'power' }] : [];
    if (day >= 4) this.chaosPlan.push({ at: CONFIG.DAY_SECONDS * 0.85, kind: 'raid' });
    this.onDayStart();
    this.broadcastState();
  }

  onDayStart() {
    $('#review').classList.remove('show');
    const newScam = SCAMS.find(s => s.day === this.day);
    this.toast(`☀️ Tag ${this.day} beginnt! Quote: ${euro(this.quota)}`);
    if (newScam) setTimeout(() => this.toast(`🔓 Neue Masche freigeschaltet: ${newScam.icon} ${newScam.name}`), 1500);
    this.boss.position.set(9, 0, 2);
    if (!this.seated) this.lockPointer();
  }

  broadcastState() {
    this.net.send('state', { day: this.day, time: this.time, earned: this.earned, phase: this.phase, events: this.events.slice(-6) });
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

  async endDay() {
    this.time = CONFIG.DAY_SECONDS;
    this.phase = 'review';
    this.broadcastState();
    const passed = this.earned >= this.quota;
    const stats = { day: this.day, quota: this.quota, earned: this.earned, passed, events: this.events.join('; ') };
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
    const r = $('#review');
    r.classList.add('show');
    $('#rv-title').textContent = stats.passed ? `Leistungsbeurteilung - Tag ${stats.day}` : 'GEFEUERT!';
    $('#rv-stats').innerHTML = `Eingenommen: <b>${euro(stats.earned)}</b> · Quote: <b>${euro(stats.quota)}</b>`;
    $('#rv-boss').textContent = text ?? 'Herr Brenner holt tief Luft ...';
    if (text) voice.speak(text, { pitch: 0.6, rate: 1.1 });
    const btn = $('#rv-next');
    btn.style.display = this.net.isHost && text ? '' : 'none';
    btn.textContent = stats.passed ? `Weiter zu Tag ${stats.day + 1}` : 'Neuer Run (Tag 1)';
    btn.onclick = () => { voice.stopSpeaking(); this.startDay(stats.passed ? stats.day + 1 : 1); };
    $('#rv-wait').style.display = this.net.isHost ? 'none' : '';
    $('#rv-result').textContent = stats.passed ? '✅ Quote geschafft - ihr dürft bleiben.' : `❌ Quote verfehlt. Ihr habt ${stats.day - 1} Tag(e) überlebt.`;
  }

  // ---------------- Chaos-Events ----------------
  startChaos(kind) {
    if (kind === 'raid') {
      this.chaos = { kind, until: performance.now() + 25000, done: false, shredders: new Set() };
      voice.buzz();
      this.banner('🚨 POLIZEIRAZZIA! Alle zum Schredder (Ecke vorne) und Beweise vernichten! 🚨');
      if (this.seated) this.toast('🚨 Steh auf und lauf zum SCHREDDER!');
    } else {
      this.chaos = { kind, until: performance.now() + 30000 };
      this.office.lights.forEach(l => (l.intensity = 0));
      this.office.hemi.intensity = 0.08;
      this.office.screens.forEach(s => (s.material.emissiveIntensity = 0));
      if (this.computer.call && this.computer.call.state !== 'ended') this.computer.endCall('Stromausfall! Die Leitung ist tot.');
      if (this.seated) this.standUp();
      this.banner('⚡ STROMAUSFALL! Jemand muss zum Sicherungskasten (hintere Wand)! ⚡');
    }
  }

  endPower(fixed) {
    if (this.chaos?.kind !== 'power') return;
    this.chaos = null;
    this.office.lights.forEach(l => (l.intensity = 7));
    this.office.hemi.intensity = 0.7;
    this.office.screens.forEach(s => (s.material.emissiveIntensity = 0.8));
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
      this.remotes.set(p.id, { av, target: new THREE.Vector3(-5.5, 0, 6), ry: 0, name: p.name });
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
    n.on('peers', () => this.renderPlayers());
    n.on('pos', (m) => {
      const r = this.remotes.get(m.from);
      if (r) { r.target.set(m.x, 0, m.z); r.ry = m.ry; }
    });
    n.on('seat', (m) => { this.office.desks[m.desk].occupant = m.from; });
    n.on('unseat', (m) => { if (this.office.desks[m.desk].occupant === m.from) this.office.desks[m.desk].occupant = null; });
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
      Object.assign(this, { day: m.day, time: m.time, earned: m.earned, events: m.events });
      this.phase = m.phase === 'fired' ? 'fired' : m.phase;
      if (newDay) this.onDayStart();
    });
    n.on('earn', (m) => {
      if (!n.isHost) return;
      this.earned += m.amount;
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
  }

  renderPlayers() {
    const names = [this.me?.name + ' (du)', ...[...this.net.peers.values()].map(p => p.name)];
    $('#players').innerHTML = this.net.online ? names.map(n => `<div>👤 ${n}</div>`).join('') : '';
  }

  syncNet(dt) {
    if (!this.net.online) return;
    this.posT = (this.posT || 0) + dt;
    if (this.posT > 0.1) {
      this.posT = 0;
      const p = this.seated ? this.seated.seat : this.pos;
      this.net.send('pos', { x: +p.x.toFixed(2), z: +p.z.toFixed(2), ry: +this.yaw.toFixed(2) });
      if (this.held) this.net.send('prop', { i: this.held.i, p: this.held.mesh.position.toArray(), v: [0, 0, 0], held: this.net.id });
    }
    for (const r of this.remotes.values()) {
      r.av.position.lerp(r.target, Math.min(1, dt * 10));
      r.av.rotation.y = r.ry;
    }
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
    $('#h-day').textContent = `Tag ${this.day}`;
    $('#h-clock').textContent = this.clock;
    $('#h-money').textContent = `${euro(this.earned)} / ${euro(this.quota)}`;
    const p = Math.min(1, this.earned / this.quota);
    $('#h-bar').style.width = p * 100 + '%';
    $('#h-bar').style.background = p >= 1 ? '#3c3' : '#f63';
    const t = !this.seated && this.phase !== 'menu' ? this.lookTarget() : null;
    $('#prompt').textContent = this.held ? '[E] fallen lassen · [Klick] werfen' : this.promptFor(t);
    if ((this.wbT = (this.wbT || 0) + 1) % 30 === 0) this.office.updateWhiteboard({ day: this.day, clock: this.clock, earned: this.earned, quota: this.quota });
  }

  frame() {
    const dt = Math.min(0.05, this.clock3.getDelta());
    if (this.phase !== 'menu') {
      if (this.net.isHost) this.hostTick(dt);
      this.updatePlayer(dt);
      this.updateProps(dt);
      this.updateBoss(dt);
      this.updateCalls();
      this.updateChaos();
      this.syncNet(dt);
      this.updateHUD();
    } else {
      const t = performance.now() / 6000;
      this.camera.position.set(Math.sin(t) * 3 - 3, 2.4, Math.cos(t) * 3 + 2);
      this.camera.lookAt(-4, 1, -1);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

window.game = new Game();
window.game.init();
