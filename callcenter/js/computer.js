// Der Arbeitsplatz-PC "Chaos OS": Fenster wie im Original (Telefon, RemoteBuddy, Kamera, Skript), Taskleiste,
// KI-Gespräch, Fernzugriff, Online-Banking, Viren und Scambaiter.
import { think } from './brain.js';
import * as voice from './voice.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => Math.round(n).toLocaleString('de-DE') + ' €';
const fmtCode = (c) => `${c.slice(0, 3)}-${c.slice(3)}`;

const VIRUS_FILES = ['GRATIS_RAM_DOWNLOAD.exe', 'oma_rezepte.pdf.exe', 'Bildschirmschoner_Delfine.scr', 'iPhone_Gewinn.exe'];
const NORMAL_FILES = [['📁', 'Urlaubsfotos Mallorca'], ['📄', 'Einkaufsliste.txt'], ['🗑️', 'Papierkorb'], ['📁', 'Steuer 2019 (nicht öffnen)'], ['🎵', 'Schlager_Hits.mp3'], ['📄', 'Passwörter (geheim).txt']];
const BAITER_FILES = [['🔴', 'OBS Studio - REC'], ['📄', 'scambait_ideen.txt'], ['💻', 'VirtualBox']];
const POPUPS = ['DEIN PC HAT 9.999 VIREN 😈', 'Gratis iPhone 47 gewonnen!!!', 'Festplatte wird formatiert ... 3%', 'Heiße Singles in deinem Callcenter', 'Windoof-Lizenz abgelaufen!', 'Bist du ein Roboter? Beweise es!'];
export const INFO_LABEL = { giftcard: 'Gutschein-Code', taxid: 'Steuer-ID', creditcard: 'Kreditkartennummer' };
const INFO_APP = { giftcard: 'Gutscheine', taxid: 'Identität', creditcard: 'Kreditkarte' };
const rnd = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
const LET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const rl = (n) => Array.from({ length: n }, () => LET[Math.floor(Math.random() * LET.length)]).join('');
// Fiktive Daten des Anrufers, die er im Gespräch vorlesen kann
function makeCallerData() {
  const t = rnd(11), c = '4' + rnd(15);
  return {
    giftcard: `${rl(4)}-${rnd(4)}-${rl(4)}`,
    taxid: `${t.slice(0, 2)} ${t.slice(2, 5)} ${t.slice(5, 8)} ${t.slice(8)}`,
    creditcard: c.match(/.{4}/g).join(' '),
  };
}
export const normInfo = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

const MOODS = [[70, 'VERTRAUT', '#36d46a'], [45, 'INTERESSIERT', '#9be15d'], [25, 'MISSTRAUISCH', '#ffb02e'], [0, 'WÜTEND', '#ff4d4d']];

// ---------- Hintergrundbilder (Landschaften wie im Original) ----------
function wallpaper(kind) {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
  const g = c.getContext('2d');
  const grad = (stops) => { const s = g.createLinearGradient(0, 0, 0, 900); stops.forEach(([o, col]) => s.addColorStop(o, col)); return s; };
  const ridge = (y, amp, col, seed) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 900);
    for (let x = 0; x <= 1600; x += 20) g.lineTo(x, y - Math.abs(Math.sin(x / 210 + seed) * amp) - Math.abs(Math.sin(x / 77 + seed * 3)) * amp * 0.25);
    g.lineTo(1600, 900); g.fill();
  };
  if (kind === 0) {           // Bergsee
    g.fillStyle = grad([[0, '#6fa8dc'], [0.5, '#cfe3f2'], [0.62, '#e8d9c0']]); g.fillRect(0, 0, 1600, 900);
    ridge(430, 260, '#8d97a8', 1); ridge(470, 160, '#e9eef5', 1.3); ridge(520, 120, '#4c5b4a', 2.2);
    g.fillStyle = grad([[0.6, '#3d6f8a'], [1, '#1d3a4c']]); g.fillRect(0, 600, 1600, 300);
  } else if (kind === 1) {    // Sonnenuntergang am Meer
    g.fillStyle = grad([[0, '#2b3a6b'], [0.45, '#e8627c'], [0.62, '#f7a35c']]); g.fillRect(0, 0, 1600, 900);
    g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(1100, 560, 70, 0, 7); g.fill();
    ridge(600, 120, '#3a2a4a', 0.4);
    g.fillStyle = grad([[0.66, '#4a3a6a'], [1, '#121a33']]); g.fillRect(0, 640, 1600, 260);
  } else {                    // Wüste
    g.fillStyle = grad([[0, '#f0b26a'], [0.6, '#fbe0b0']]); g.fillRect(0, 0, 1600, 900);
    ridge(560, 110, '#c97b45', 0.8); ridge(640, 80, '#a85a2e', 2);
    g.fillStyle = '#7c3f1e'; g.fillRect(0, 760, 1600, 140);
  }
  return c.toDataURL('image/jpeg', 0.85);
}

// ---------- Cartoon-Porträt des Anrufers ----------
export function drawFace(canvas, look = {}, trust = 50, round = false) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, s = Math.min(W, H) / 200;
  g.clearRect(0, 0, W, H);
  g.fillStyle = look.bg || '#4f9a8f';
  if (round) { g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, 7); g.fill(); } else g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2 + 14 * s); g.scale(s, s);
  g.lineWidth = 4; g.strokeStyle = '#1b1410'; g.lineJoin = 'round';
  // Schultern
  g.fillStyle = '#e8e8ee'; g.beginPath(); g.ellipse(0, 92, 70, 40, 0, Math.PI, 0); g.fill(); g.stroke();
  // Haare hinten
  g.fillStyle = look.hair || '#4a3426';
  if (look.style === 'long') { g.beginPath(); g.ellipse(0, 10, 62, 74, 0, 0, 7); g.fill(); g.stroke(); }
  if (look.style === 'bun') { g.beginPath(); g.arc(0, -66, 20, 0, 7); g.fill(); g.stroke(); }
  // Kopf
  g.fillStyle = look.skin || '#e8b48f';
  g.beginPath(); g.ellipse(0, 0, 50, 58, 0, 0, 7); g.fill(); g.stroke();
  // Haare vorne
  g.fillStyle = look.hair || '#4a3426';
  if (look.style !== 'bald') {
    g.beginPath(); g.ellipse(0, -36, 50, 26, 0, Math.PI, 0); g.lineTo(50, -30); g.quadraticCurveTo(0, -48, -50, -30); g.fill(); g.stroke();
  } else { g.beginPath(); g.arc(-50, -6, 10, 0, 7); g.arc(50, -6, 10, 0, 7); g.fill(); }
  // Augen + Augenbrauen nach Stimmung
  const angry = trust < 25, happy = trust >= 60;
  for (const sx of [-1, 1]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(sx * 19, -6, 11, happy ? 7 : 10, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#1b1410'; g.beginPath(); g.arc(sx * 19 + (angry ? 0 : 2), -5, 4.5, 0, 7); g.fill();
    g.beginPath(); g.moveTo(sx * 8, angry ? -18 : -24); g.lineTo(sx * 30, angry ? -26 : -22); g.stroke();
  }
  if (look.glasses) { g.lineWidth = 3; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 19, -6, 15, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(-4, -6); g.lineTo(4, -6); g.stroke(); g.lineWidth = 4; }
  // Nase + Mund
  g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(7, 14, -2, 16); g.stroke();
  if (look.beard) { g.fillStyle = look.hair || '#4a3426'; g.beginPath(); g.ellipse(0, 34, 34, 20, 0, 0, Math.PI); g.fill(); }
  g.beginPath();
  if (happy) { g.moveTo(-16, 28); g.quadraticCurveTo(0, 42, 16, 28); }
  else if (angry) { g.moveTo(-16, 36); g.quadraticCurveTo(0, 24, 16, 36); }
  else { g.moveTo(-14, 32); g.lineTo(14, 31); }
  g.stroke();
  g.restore();
}

export class Computer {
  constructor(game) {
    this.game = game;
    this.el = $('#pc');
    this.call = null;
    this.infectedUntil = 0;
    this.lockedUntil = 0;
    this.muted = false;
    this.speaking = false;
    this.z = 10;
    this.wpIndex = 0;
    this.camCanvas = $('#cam-canvas');
    this.wave = $('#ph-wave');
    for (let i = 0; i < 22; i++) this.wave.appendChild(document.createElement('i'));
    this.bindUI();
    voice.setupRecognition(
      (text) => this.playerSays(text),
      (interim) => { $('#ph-interim').textContent = interim ? '🎙️ ' + interim : ''; },
    );
    requestAnimationFrame(() => this.animate());
  }

  // ---------------- Fenster-Manager ----------------
  bindUI() {
    this.el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => this.openWin(b.dataset.open)));
    this.el.querySelectorAll('[data-deco]').forEach(b => b.addEventListener('click', () => this.deco(b.dataset.deco)));
    $('#tb-power').addEventListener('click', () => this.game.standUp());
    this.el.querySelectorAll('.win').forEach(w => this.bindWin(w));
    $('#in-accept').addEventListener('click', () => this.acceptCall());
    $('#in-decline').addEventListener('click', () => this.declineCall());
    $('#ph-hangup').addEventListener('click', () => this.endCall('Du hast aufgelegt.'));
    const input = $('#ph-text');
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) { this.playerSays(input.value.trim()); input.value = ''; }
    });
    $('#ph-speaker').addEventListener('click', () => {
      this.muted = !this.muted;
      $('#ph-speaker').classList.toggle('off', this.muted);
      if (this.muted) voice.stopSpeaking();
    });
    const mic = $('#ph-mic');
    if (!voice.canListen) { mic.classList.add('off'); mic.title = 'Mikro ist hier nicht verfügbar: tippen oder die Diktierfunktion des Computers nutzen'; }
    else {
      const start = (e) => { e.preventDefault(); this.startTalk(); };
      const stop = (e) => { e.preventDefault(); this.stopTalk(); };
      mic.addEventListener('mousedown', start); mic.addEventListener('mouseup', stop); mic.addEventListener('mouseleave', stop);
    }
    $('#rb-connect').addEventListener('click', () => this.remoteConnect());
    $('#rb-id').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.remoteConnect(); });
    $('#rb-id').addEventListener('input', (e) => {
      const d = e.target.value.replace(/\D/g, '').slice(0, 6);
      e.target.value = d.length > 3 ? fmtCode(d) : d;
    });
    $('#notes-area').addEventListener('keydown', (e) => e.stopPropagation());
  }

  bindWin(w) {
    w.addEventListener('mousedown', () => this.focus(w));
    w.querySelector('[data-close]').addEventListener('click', (e) => { e.stopPropagation(); w.hidden = true; this.renderTaskbar(); });
    w.querySelector('[data-min]').addEventListener('click', (e) => { e.stopPropagation(); w.hidden = true; this.renderTaskbar(); });
    w.querySelector('[data-max]').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMax(w); });
    const bar = w.querySelector('.tbar');
    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || w.dataset.maxed) return;
      const sx = e.clientX - w.offsetLeft, sy = e.clientY - w.offsetTop;
      const move = (ev) => {
        w.style.left = Math.max(-w.offsetWidth + 80, Math.min(innerWidth - 80, ev.clientX - sx)) + 'px';
        w.style.top = Math.max(0, Math.min(innerHeight - 80, ev.clientY - sy)) + 'px';
      };
      const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
    });
  }

  // Neue App registrieren: Fenster + Desktop-Symbol (+ optional Taskleiste)
  addApp({ id, title, color, svg, w = 420, h = 360, dark = false, pinned = false, hiddenIcon = false }) {
    const win = document.createElement('div');
    win.className = 'win' + (dark ? ' dark' : '');
    win.dataset.app = id; win.hidden = true;
    win.innerHTML = `<div class="tbar"><span class="ti" style="background:${color}"><svg viewBox="0 0 24 24">${svg}</svg></span><span class="tt">${title}</span><button data-min>–</button><button data-max>□</button><button class="x" data-close>✕</button></div><div class="wbody"></div>`;
    win.dataset.size = JSON.stringify([w, h]);
    this.el.insertBefore(win, $('#incoming'));
    this.bindWin(win);
    const icon = document.createElement('button');
    icon.className = 'icon'; icon.dataset.open = id; icon.hidden = hiddenIcon;
    icon.innerHTML = `<span class="ico" style="background:${color}"><svg viewBox="0 0 24 24">${svg}</svg></span>${title}`;
    icon.addEventListener('click', () => this.openWin(id));
    $('#icons').appendChild(icon);
    if (pinned) {
      const tb = document.createElement('button');
      tb.className = 'tb'; tb.dataset.open = id; tb.title = title; tb.style.background = color;
      tb.innerHTML = `<svg viewBox="0 0 24 24">${svg}</svg>`;
      tb.addEventListener('click', () => this.openWin(id));
      $('#taskbar').insertBefore(tb, $('#taskbar .stats'));
    }
    return { win, body: win.querySelector('.wbody'), icon };
  }

  layout() {
    const W = innerWidth, H = innerHeight - 46;
    const place = (id, l, t, w, h) => Object.assign($(id).style, { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' });
    const pw = Math.min(330, W - 20);
    place('#w-phone', W - pw - 10, 10, pw, Math.min(620, H - 20));
    const rw = Math.max(300, Math.min(600, W - pw - 120));
    place('#w-remote', 100, 12, rw, Math.min(400, H * 0.62));
    place('#w-cam', 100, Math.max(12, H - 250), Math.min(380, rw), 236);
    place('#w-script', Math.max(100, W - pw - 330), 40, 300, Math.min(400, H - 80));
  }

  openWin(app) {
    const w = this.el.querySelector(`.win[data-app="${app}"]`);
    if (!w) return;
    if (w.dataset.size && !w.style.width) {
      const [ww, hh] = JSON.parse(w.dataset.size);
      const W = Math.min(ww, innerWidth - 20), H = Math.min(hh, innerHeight - 66);
      const n = this.el.querySelectorAll('.win:not([hidden])').length;
      Object.assign(w.style, { width: W + 'px', height: H + 'px', left: Math.max(10, Math.min(innerWidth - W - 10, 180 + n * 28)) + 'px', top: Math.max(10, Math.min(innerHeight - H - 56, 30 + n * 24)) + 'px' });
    }
    w.hidden = false;
    this.focus(w);
    this.renderTaskbar();
  }
  focus(w) {
    w.style.zIndex = ++this.z;
    if (this.z > 60) { // unter Anruf-Karte (80) und Taskleiste (70) bleiben
      const wins = [...this.el.querySelectorAll('.win')].sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
      wins.forEach((x, i) => (x.style.zIndex = 10 + i));
      this.z = 10 + wins.length;
    }
  }
  toggleMax(w) {
    if (w.dataset.maxed) {
      Object.assign(w.style, JSON.parse(w.dataset.maxed)); delete w.dataset.maxed;
    } else {
      w.dataset.maxed = JSON.stringify({ left: w.style.left, top: w.style.top, width: w.style.width, height: w.style.height });
      Object.assign(w.style, { left: '0px', top: '0px', width: innerWidth + 'px', height: (innerHeight - 46) + 'px' });
    }
  }
  deco(kind) {
    if (kind === 'bg') { this.wpIndex = (this.wpIndex + 1) % 3; this.setWallpaper(); return; }
    this.game.toast('Diese App ist gerade nicht verfügbar.');
  }
  setWallpaper() {
    this.wallpapers ||= [];
    this.wallpapers[this.wpIndex] ||= wallpaper(this.wpIndex);
    this.el.style.backgroundImage = `url(${this.wallpapers[this.wpIndex]})`;
  }

  open(desk) {
    this.desk = desk;
    this.setWallpaper();
    this.el.classList.add('show');
    this.layout();
    this.openWin('cam');
    this.openWin('script');
    this.openWin('phone');
    const boot = $('#boot');
    boot.classList.remove('gone');
    setTimeout(() => boot.classList.add('gone'), 900);
    this.render();
  }
  close() {
    this.el.classList.remove('show');
    this.stopTalk();
  }
  get isOpen() { return this.el.classList.contains('show'); }
  get camVisible() { return this.isOpen && !$('#w-cam').hidden; }

  keyDown(e) { if (e.code === 'KeyV' && !e.repeat) this.startTalk(); }
  keyUp(e) { if (e.code === 'KeyV') this.stopTalk(); }
  startTalk() {
    if (!voice.canListen || !this.call || this.call.state !== 'active') return;
    voice.startListening();
    $('#ph-mic').classList.add('on');
  }
  stopTalk() {
    voice.stopListening();
    $('#ph-mic').classList.remove('on');
  }

  // Audio-Wellen animieren, solange der Anrufer spricht
  animate() {
    if (this.isOpen) {
      const bars = this.wave.children;
      for (let i = 0; i < bars.length; i++) bars[i].style.height = (this.speaking ? 4 + Math.random() * 16 : 3) + 'px';
    }
    setTimeout(() => requestAnimationFrame(() => this.animate()), 90);
  }

  say(text, v) {
    if (this.muted) return;
    this.speaking = true;
    voice.speak(text, v, () => { this.speaking = false; });
  }

  // ---------------- Anrufe ----------------
  ring(call) {
    this.call = { ...call, state: 'ringing', history: [], trust: null, installed: false, codeGiven: false, connected: false,
      bankLoggedIn: false, blackout: false, balance: call.persona.money, stolen: 0, thinking: false, ringStart: performance.now(),
      data: makeCallerData(), revealed: {}, redeemed: {} };
    this.files = this.makeDesktopFiles(call.persona);
    drawFace($('#in-face'), call.persona.look, 50, true);
    this.render();
  }

  acceptCall() {
    const c = this.call;
    if (!c || c.state !== 'ringing') return;
    c.state = 'active';
    voice.stopSpeaking();
    $('#ph-log').innerHTML = '';
    this.log('sys', `Verbunden mit ${c.number}`);
    this.openWin('phone');
    this.render();
    setTimeout(() => $('#ph-text').focus(), 50);
    this.ask();
  }

  declineCall() {
    if (!this.call || this.call.state !== 'ringing') return;
    this.call = null;
    this.render();
    this.game.callFinished(null);
  }

  missCall() {
    if (!this.call || this.call.state !== 'ringing') return;
    this.call = null;
    this.game.toast('📵 Anruf verpasst!');
    this.render();
    this.game.callFinished(null);
  }

  playerSays(text) {
    const c = this.call;
    if (!c || c.state !== 'active') return;
    this.log('me', text);
    if (text.length > 12 && Math.random() < 0.5) this.game.addQuote(this.game.me?.name || 'Du', text.slice(0, 120));
    c.history.push({ role: 'user', content: `Mitarbeiter: ${text}` });
    this.game.net.send('bubble', { desk: this.desk?.index, text: '🎧 ' + text.slice(0, 60) });
    this.ask();
  }

  event(text, reactive = true) {
    const c = this.call;
    if (!c || c.state !== 'active') return;
    c.history.push({ role: 'user', content: `[${text}]` });
    if (reactive) this.ask();
  }

  async ask() {
    const c = this.call;
    if (!c || c.state !== 'active') return;
    if (c.thinking) { c.pending = true; return; }
    c.thinking = true;
    $('#ph-typing').textContent = `${c.persona.name} denkt nach ...`;
    const res = await think({ mode: 'caller', persona: c.persona, scam: c.scam, remoteCode: c.code, data: c.data, history: c.history });
    if (this.call !== c) return;
    c.thinking = false;
    $('#ph-typing').textContent = '';
    if (c.state !== 'active') return;
    if (res.error && !c.warned) { c.warned = true; this.log('sys', 'KI nicht erreichbar, Offline-Modus: ' + res.error); }
    const trust = Math.max(0, Math.min(100, Number(res.trust) || 0));
    c.trust = trust;
    c.history.push({ role: 'assistant', content: res.say, trust, action: res.action });
    this.log('them', res.say);
    this.game.net.send('bubble', { desk: this.desk?.index, text: '📞 ' + String(res.say).slice(0, 70) });
    this.say(res.say, c.persona.voice);
    this.handleAction(res.action, res.info_type);
    this.render();
    if (c.pending && c.state === 'active') { c.pending = false; this.ask(); }
  }

  handleAction(action, infoType) {
    const c = this.call;
    switch (action) {
      case 'give_info':
        if (INFO_LABEL[infoType]) {
          c.revealed[infoType] = true;
          this.log('sys', `📝 ${INFO_LABEL[infoType]} erhalten: in der App "${INFO_APP[infoType]}" eingeben!`);
          this.game.apps?.highlight(infoType);
        }
        break;
      case 'install_remote':
        c.installed = true;
        this.log('sys', '✅ RemoteBuddy installiert. Frag nach dem Code!');
        break;
      case 'give_remote_code':
        c.installed = true; c.codeGiven = true;
        this.log('sys', '🔑 Code erhalten: tippe ihn in RemoteBuddy ein.');
        this.openWin('remote');
        this.openWin('phone');
        break;
      case 'login_bank':
        if (c.connected) { c.bankLoggedIn = true; this.log('sys', '🏦 Der Anrufer hat sich ins Online-Banking eingeloggt!'); this.renderRemote(); }
        break;
      case 'hang_up':
        setTimeout(() => this.endCall('Der Anrufer hat aufgelegt.'), 1800);
        break;
    }
  }

  endCall(reason) {
    const c = this.call;
    if (!c || c.state === 'ended') return;
    if (c.state === 'ringing') { this.call = null; this.render(); return; }
    c.state = 'ended';
    c.connected = false;
    this.stopTalk();
    this.log('sys', `📴 ${reason} Erbeutet: ${euro(c.stolen)}`);
    this.render();
    this.game.callFinished(c);
    setTimeout(() => { if (this.call === c) { this.call = null; this.render(); } }, 4000);
  }

  log(who, text) {
    const box = $('#ph-log');
    const d = document.createElement('div');
    d.className = 'bub ' + who;
    if (who === 'sys') d.textContent = text;
    else {
      const name = who === 'me' ? (this.game.me?.name || 'Du') : (this.call?.persona.name || 'Anrufer');
      d.innerHTML = `<span class="n">${esc(name)}</span><div>${esc(text)}</div>`;
    }
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  // ---------------- RemoteBuddy ----------------
  makeDesktopFiles(p) {
    const files = [...NORMAL_FILES].sort(() => Math.random() - 0.5).slice(0, 4).map(([icon, name]) => ({ icon, name, kind: 'normal' }));
    files.unshift({ icon: '🏦', name: 'Online-Banking', kind: 'bank' });
    if (Math.random() < 0.6) files.push({ icon: '💾', name: VIRUS_FILES[Math.floor(Math.random() * VIRUS_FILES.length)], kind: 'virus' });
    if (p.scambaiter) BAITER_FILES.forEach(([icon, name]) => { if (Math.random() < 0.7) files.push({ icon, name, kind: 'bait' }); });
    return files.sort(() => Math.random() - 0.5);
  }

  remoteConnect() {
    const c = this.call;
    const id = $('#rb-id').value.replace(/\D/g, '');
    const status = $('#rb-status');
    if (!c || c.state !== 'active') { status.textContent = 'Kein aktiver Anruf.'; return; }
    if (performance.now() < this.lockedUntil) { status.textContent = 'Dein PC ist infiziert! Erst die Popups schließen.'; return; }
    if (!c.installed) { status.textContent = 'Der Anrufer hat RemoteBuddy noch nicht installiert.'; return; }
    if (id !== c.code) { status.textContent = 'Falscher Verbindungscode.'; voice.buzz(); return; }
    c.connected = true;
    status.textContent = '';
    $('#rb-id').value = '';
    this.log('sys', '🖥️ Fernzugriff aktiv!');
    this.event('Der Mitarbeiter ist jetzt per RemoteBuddy mit deinem PC verbunden. Du siehst, wie sich deine Maus von alleine bewegt.');
    this.renderRemote();
  }

  openFile(f) {
    const c = this.call;
    if (!c?.connected) return;
    if (f.kind === 'bank') {
      c.bankOpen = true;
      this.event('Der Mitarbeiter öffnet auf deinem PC die Webseite deiner Bank.', false);
      if (!c.bankLoggedIn) this.log('sys', 'Die Bank verlangt einen Login. Überrede den Anrufer, sich einzuloggen!');
    } else if (f.kind === 'virus') {
      this.infect();
    } else if (f.kind === 'bait') {
      this.log('sys', `🤔 "${f.name}" ... Moment mal. Ist das ein Scambaiter?`);
    } else {
      this.event(`Der Mitarbeiter öffnet auf deinem PC "${f.name}".`, false);
      this.log('sys', `Du öffnest "${f.name}". Nichts Interessantes.`);
    }
    this.renderRemote();
  }

  toggleBlackout() {
    const c = this.call;
    if (!c?.connected) return;
    c.blackout = !c.blackout;
    this.event(c.blackout ? 'Dein Bildschirm ist plötzlich komplett schwarz! Du siehst gar nichts mehr.' : 'Dein Bildschirm ist wieder normal.', c.blackout);
    this.renderRemote();
  }

  transfer() {
    const c = this.call;
    if (!c?.connected || !c.bankLoggedIn) return;
    const amount = Math.floor(Number($('#bank-amount').value) || 0);
    if (amount <= 0) return;
    if (amount > c.balance) { this.log('sys', 'So viel ist nicht auf dem Konto.'); return; }
    c.balance -= amount;
    if (c.persona.scambaiter) {
      this.log('sys', `💸 Überweisung über ${euro(amount)} wird bearbeitet ...`);
      setTimeout(() => this.baiterReveal(amount), 2500);
    } else {
      c.stolen += amount;
      this.game.addEarnings(amount, `${c.persona.name}: ${euro(amount)} erbeutet!`);
      voice.cash();
      this.log('sys', `💰 ${euro(amount)} überwiesen!`);
    }
    this.event(c.blackout
      ? 'Dein Bildschirm ist immer noch schwarz. Irgendwas passiert da im Hintergrund.'
      : `Du siehst auf deinem Bildschirm, wie ${amount} Euro von deinem Konto an "Callcenter Chaos GmbH" überwiesen werden!`, !c.blackout);
    this.renderRemote();
  }

  baiterReveal(amount) {
    const c = this.call;
    if (!c) return;
    const lines = [
      'HAHAHA! Das war eine virtuelle Maschine, du Genie! Grüße an meine zweihunderttausend Zuschauer! Und jetzt schau mal auf deinen Bildschirm!',
      'Ich lach mich kaputt! Das Geld war nie echt. Du bist gerade live auf YouTube! Ach ja, ich hab mich auch mal auf DEINEN PC geschaltet!',
    ];
    const say = lines[Math.floor(Math.random() * lines.length)];
    this.log('them', say);
    this.say(say, { pitch: 1.1, rate: 1.1 });
    this.game.scambaited(c.persona);
    this.infect(true);
    setTimeout(() => this.endCall(`SCAMBAITER! Das war ein Fake-Konto (${euro(amount)}).`), 2500);
  }

  // ---------------- Viren ----------------
  infect(hard = false) {
    if (this.game.apps?.owned.has('mwpro')) { this.game.toast('🛡️ Malwarebits Pro hat einen Virus blockiert.'); if (this.call) this.call.connected = false; this.renderRemote(); return; }
    voice.buzz();
    this.game.toast('🦠 VIRUS! Schließ die Popups!');
    if (this.call) this.call.connected = false;
    this.lockedUntil = performance.now() + (hard ? 15000 : 8000);
    const layer = $('#virus-layer');
    const n = hard ? 9 : 5;
    for (let i = 0; i < n; i++) setTimeout(() => this.spawnPopup(layer), i * 350);
    this.renderRemote();
  }

  spawnPopup(layer) {
    const p = document.createElement('div');
    p.className = 'popup';
    p.style.left = (5 + Math.random() * 60) + '%';
    p.style.top = (8 + Math.random() * 60) + '%';
    p.innerHTML = `<div class="pt">⚠️ Warnung <button>✕</button></div><div class="pb">${POPUPS[Math.floor(Math.random() * POPUPS.length)]}</div>`;
    p.querySelector('button').addEventListener('click', () => {
      p.remove();
      voice.beep(600, 0.05);
      if (!layer.children.length) this.lockedUntil = 0;
    });
    layer.appendChild(p);
  }

  // ---------------- Darstellung ----------------
  renderTaskbar() {
    this.el.querySelectorAll('#taskbar [data-open]').forEach(b => {
      const w = this.el.querySelector(`.win[data-app="${b.dataset.open}"]`);
      b.classList.toggle('open', !!w && !w.hidden);
    });
  }

  render() {
    const c = this.call;
    const ringing = c?.state === 'ringing';
    const active = c && !ringing;
    $('#incoming').hidden = !ringing;
    $('#tb-ring').hidden = !ringing;
    $('#ph-call').hidden = !active;
    $('#ph-idle').hidden = !!active;
    $('#ph-idle-text').innerHTML = this.game.phase === 'work' ? 'Keine aktiven Anrufe.<br>Warte auf den nächsten Anrufer ...' : 'Feierabend.<br>Gerade keine Anrufe.';
    if (ringing) {
      $('#in-name').textContent = c.persona.name;
      $('#in-scam').textContent = `${c.scam.icon} ${c.scam.name}`;
      $('#in-lure').textContent = c.scam.lure;
    }
    if (active) {
      const t = c.trust ?? 30;
      const [, label, color] = MOODS.find(([min]) => t >= min);
      $('#ph-status').textContent = c.trust == null ? 'VERBINDE ...' : label;
      $('#ph-status').style.color = color;
      $('#ph-trust').style.width = t + '%';
      $('#ph-trust').style.background = color;
      $('#ph-pct').textContent = (c.trust ?? 0) + '%';
      $('#ph-name').textContent = c.persona.name;
      drawFace($('#ph-face'), c.persona.look, t);
      $('#ph-hangup').disabled = c.state === 'ended';
    }
    // Skript
    $('#sc-title').textContent = c ? `${c.scam.icon} ${c.scam.name}` : 'Kein aktiver Anruf';
    $('#sc-lure').textContent = c ? c.scam.lure : 'Sobald ein Anrufer dran ist, steht hier, warum er anruft.';
    $('#sc-tip').textContent = '💡 ' + (c ? c.scam.tip : 'Erst Vertrauen aufbauen, dann RemoteBuddy.');
    const steps = [['RemoteBuddy installiert', c?.installed], ['Code erhalten', c?.codeGiven], ['Verbunden', c?.connected], ['Bank-Login', c?.bankLoggedIn], ['Daten erhalten (Gutschein/ID/Karte)', c && Object.keys(c.revealed).length > 0], [`Erbeutet: ${euro(c?.stolen || 0)}`, (c?.stolen || 0) > 0]];
    $('#sc-steps').innerHTML = steps.map(([n, ok]) => `<span class="${ok ? 'ok' : ''}">${ok ? '☑' : '☐'} ${esc(n)}</span>`).join('');
    this.renderRemote();
    this.renderTaskbar();
  }

  renderRemote() {
    const c = this.call;
    const view = $('#rb-view');
    if (!c || !c.connected) {
      $('#rb-login').hidden = false;
      view.hidden = true;
      if (!c || c.state !== 'active') $('#rb-status').textContent = '';
      return;
    }
    $('#rb-login').hidden = true;
    view.hidden = false;
    const icons = this.files.map((f, i) => `<div class="file" data-i="${i}" title="Doppelklick zum Öffnen"><div class="fi">${f.icon}</div><div class="fn">${esc(f.name)}</div></div>`).join('');
    let bank = '';
    if (c.bankOpen) {
      bank = c.bankLoggedIn
        ? `<div class="bank"><div class="bh">🏦 ${esc(c.persona.bank)}</div><div class="bb">
            <div>Kontoinhaber: <b>${esc(c.persona.name)}</b></div>
            <div class="bal">Kontostand: <b>${euro(c.balance)}</b></div>
            <div>Empfänger: <i>Callcenter Chaos GmbH</i></div>
            <div>Betrag: <input id="bank-amount" type="number" min="1" step="50" value="${Math.min(500, c.balance)}"> € <button id="bank-send">Überweisen</button></div></div></div>`
        : `<div class="bank"><div class="bh">🏦 ${esc(c.persona.bank)}</div><div class="bb login">🔒 Bitte melden Sie sich an.<br><small>Nur der Kontoinhaber kann sich einloggen. Überrede den Anrufer!</small></div></div>`;
    }
    const first = c.persona.name.replace(/^Dr\. /, '').split(' ')[0];
    view.innerHTML = `<div class="victim ${c.blackout ? 'black' : ''}">
        <div class="vdesk">${icons}</div>${bank}
        <div class="vbar"><span>🪟 Start</span><span>${esc(first)}s PC</span>
        <button id="rb-black">${c.blackout ? 'Bildschirm wieder zeigen' : 'Bildschirm schwärzen'}</button></div>
      </div>`;
    view.querySelectorAll('.file').forEach(el => el.addEventListener('dblclick', () => this.openFile(this.files[+el.dataset.i])));
    $('#rb-black').addEventListener('click', () => this.toggleBlackout());
    const send = $('#bank-send');
    if (send) {
      send.addEventListener('click', () => this.transfer());
      $('#bank-amount').addEventListener('keydown', (e) => e.stopPropagation());
    }
  }

  // Werte der Taskleiste (von main.js jedes Frame)
  setStats({ personal, team, quota, review, clock, date }) {
    $('#tb-personal').textContent = `PERSÖNLICH ${euro(personal)}`;
    $('#tb-team').textContent = `TEAM ${euro(team)}`;
    $('#tb-quota').textContent = `QUOTE ${euro(quota)}`;
    $('#tb-review').textContent = `BEURTEILUNG ${review}`;
    $('#tb-clock').textContent = clock;
    $('#tb-date').textContent = date;
  }
}
