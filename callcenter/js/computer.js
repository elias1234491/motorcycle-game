// Der Arbeitsplatz-PC: Telefon-App (KI-Gespräch), RemoteBuddy (Fernzugriff), Online-Banking, Viren, Scambaiter.
import { think } from './brain.js';
import * as voice from './voice.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => Math.round(n).toLocaleString('de-DE') + ' €';

const VIRUS_FILES = ['GRATIS_RAM_DOWNLOAD.exe', 'oma_rezepte.pdf.exe', 'Bildschirmschoner_Delfine.scr', 'iPhone_Gewinn.exe'];
const NORMAL_FILES = [['📁', 'Urlaubsfotos Mallorca'], ['📄', 'Einkaufsliste.txt'], ['🗑️', 'Papierkorb'], ['📁', 'Steuer 2019 (nicht öffnen)'], ['🎵', 'Schlager_Hits.mp3'], ['📄', 'Passwörter (geheim).txt']];
const BAITER_FILES = [['🔴', 'OBS Studio - REC'], ['📄', 'scambait_ideen.txt'], ['💻', 'VirtualBox']];
const POPUPS = ['DEIN PC HAT 9.999 VIREN 😈', 'Gratis iPhone 47 gewonnen!!!', 'Festplatte wird formatiert ... 3%', 'Heiße Singles in Ihrem Callcenter', 'Windoof-Lizenz abgelaufen!', 'Sind Sie ein Roboter? Beweisen Sie es!'];

export class Computer {
  constructor(game) {
    this.game = game;
    this.el = $('#pc');
    this.call = null;
    this.app = 'phone';
    this.infectedUntil = 0;
    this.lockedUntil = 0;
    this.bindUI();
    voice.setupRecognition(
      (text) => this.playerSays(text),
      (interim) => { $('#pc-interim').textContent = interim ? '🎙️ ' + interim : ''; },
    );
  }

  // ---------------- UI-Grundgerüst ----------------
  bindUI() {
    this.el.querySelectorAll('[data-app]').forEach(b => b.addEventListener('click', () => this.showApp(b.dataset.app)));
    $('#pc-standup').addEventListener('click', () => this.game.standUp());
    $('#pc-accept').addEventListener('click', () => this.acceptCall());
    $('#pc-decline').addEventListener('click', () => this.declineCall());
    $('#pc-hangup').addEventListener('click', () => this.endCall('Du hast aufgelegt.'));
    const input = $('#pc-text');
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) { this.playerSays(input.value.trim()); input.value = ''; }
    });
    const talk = $('#pc-talk');
    const start = (e) => { e.preventDefault(); this.startTalk(); };
    const stop = (e) => { e.preventDefault(); this.stopTalk(); };
    talk.addEventListener('mousedown', start); talk.addEventListener('mouseup', stop); talk.addEventListener('mouseleave', stop);
    talk.addEventListener('touchstart', start); talk.addEventListener('touchend', stop);
    if (!voice.canListen) { talk.hidden = true; input.placeholder = 'Was sagst du dem Anrufer? (Enter = senden)'; }
    $('#rb-connect').addEventListener('click', () => this.remoteConnect());
    $('#rb-id').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') this.remoteConnect(); });
    $('#notes-area').addEventListener('keydown', (e) => e.stopPropagation());
  }

  open(desk) {
    this.desk = desk;
    this.el.classList.add('show');
    $('#pc-title').textContent = `Microhard Doors 95 - Platz ${desk.index + 1}`;
    this.render();
  }
  close() {
    this.el.classList.remove('show');
    this.stopTalk();
  }
  get isOpen() { return this.el.classList.contains('show'); }

  showApp(app) {
    this.app = app;
    this.el.querySelectorAll('[data-app]').forEach(b => b.classList.toggle('active', b.dataset.app === app));
    this.el.querySelectorAll('.app').forEach(a => a.classList.toggle('show', a.id === 'app-' + app));
    this.render();
  }

  // Tastatur, solange der PC offen ist (V = Sprechen)
  keyDown(e) {
    if (e.code === 'KeyV' && !e.repeat) this.startTalk();
  }
  keyUp(e) {
    if (e.code === 'KeyV') this.stopTalk();
  }
  startTalk() {
    if (!this.call || this.call.state !== 'active') return;
    voice.startListening();
    $('#pc-talk').classList.add('on');
  }
  stopTalk() {
    voice.stopListening();
    $('#pc-talk').classList.remove('on');
  }

  // ---------------- Anrufe ----------------
  ring(call) {
    this.call = { ...call, state: 'ringing', history: [], trust: null, installed: false, codeGiven: false, connected: false,
      bankLoggedIn: false, blackout: false, balance: call.persona.money, stolen: 0, thinking: false, queue: [], ringStart: performance.now() };
    this.files = this.makeDesktopFiles(call.persona);
    this.render();
  }

  acceptCall() {
    const c = this.call;
    if (!c || c.state !== 'ringing') return;
    c.state = 'active';
    voice.stopSpeaking();
    this.log('sys', `Anruf angenommen. Masche: ${c.scam.icon} ${c.scam.name}`);
    this.render();
    this.ask(); // Anrufer beginnt
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
    c.history.push({ role: 'user', content: `Mitarbeiter: ${text}` });
    this.game.net.send('bubble', { desk: this.desk?.index, text: '🎧 ' + text.slice(0, 60) });
    this.ask();
  }

  // Spielereignis: reactive=true -> Anrufer reagiert sofort
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
    this.renderTyping(true);
    const res = await think({ mode: 'caller', persona: c.persona, scam: c.scam, remoteCode: c.code, history: c.history });
    if (this.call !== c) return;
    c.thinking = false;
    this.renderTyping(false);
    if (c.state !== 'active') return;
    if (res.error && !c.warned) { c.warned = true; this.log('sys', 'KI nicht erreichbar, nutze Offline-Modus: ' + res.error); }
    const trust = Math.max(0, Math.min(100, Number(res.trust) || 0));
    c.trust = trust;
    c.history.push({ role: 'assistant', content: res.say, trust, action: res.action });
    this.log('them', res.say);
    this.game.net.send('bubble', { desk: this.desk?.index, text: c.persona.emoji + ' ' + String(res.say).slice(0, 70) });
    voice.speak(res.say, c.persona.voice);
    this.handleAction(res.action);
    this.render();
    if (c.pending && c.state === 'active') { c.pending = false; this.ask(); }
  }

  handleAction(action) {
    const c = this.call;
    switch (action) {
      case 'install_remote':
        c.installed = true;
        this.log('sys', '✅ Der Anrufer hat RemoteBuddy installiert. Frag nach dem Code!');
        break;
      case 'give_remote_code':
        c.installed = true; c.codeGiven = true;
        this.log('sys', '🔑 Code erhalten - tippe ihn in RemoteBuddy ein.');
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
    const box = $('#pc-log');
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    const name = who === 'me' ? 'Du' : who === 'them' ? (this.call?.persona.emoji || '📞') + ' Anrufer' : '';
    d.innerHTML = name ? `<b>${name}:</b> ${esc(text)}` : esc(text);
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  // ---------------- RemoteBuddy ----------------
  makeDesktopFiles(p) {
    const files = NORMAL_FILES.sort(() => Math.random() - 0.5).slice(0, 4).map(([icon, name]) => ({ icon, name, kind: 'normal' }));
    files.unshift({ icon: '🏦', name: 'Online-Banking', kind: 'bank' });
    if (Math.random() < 0.6) files.push({ icon: '💾', name: VIRUS_FILES[Math.floor(Math.random() * VIRUS_FILES.length)], kind: 'virus' });
    if (p.scambaiter) BAITER_FILES.forEach(([icon, name]) => { if (Math.random() < 0.7) files.push({ icon, name, kind: 'bait' }); });
    return files.sort(() => Math.random() - 0.5);
  }

  remoteConnect() {
    const c = this.call;
    const id = $('#rb-id').value.replace(/\D/g, '');
    const status = $('#rb-status');
    if (!c || c.state !== 'active') { status.textContent = 'Keine aktive Verbindung zu einem Anrufer.'; return; }
    if (performance.now() < this.lockedUntil) { status.textContent = 'Dein PC ist infiziert! Erst die Popups schließen.'; return; }
    if (!c.installed) { status.textContent = 'Der Anrufer hat RemoteBuddy noch nicht installiert.'; return; }
    if (id !== c.code) { status.textContent = '❌ Falsche Partner-ID.'; voice.buzz(); return; }
    c.connected = true;
    status.textContent = '✅ Verbunden!';
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
      this.log('sys', `💸 Überweisung über ${euro(amount)} ... wird bearbeitet ...`);
      setTimeout(() => this.baiterReveal(amount), 2500);
    } else {
      c.stolen += amount;
      this.game.addEarnings(amount, `${c.persona.emoji} ${euro(amount)} erbeutet!`);
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
      'Ich lache mich kaputt! Das Geld war nie echt. Du bist gerade live auf YouTube! Ach ja, ich hab mich auch mal auf DEINEN PC geschaltet!',
    ];
    const say = lines[Math.floor(Math.random() * lines.length)];
    this.log('them', say);
    voice.speak(say, { pitch: 1.1, rate: 1.1 });
    this.game.scambaited(c.persona);
    this.infect(true);
    setTimeout(() => this.endCall(`SCAMBAITER! Das war ein Fake-Konto - ${euro(amount)} Fake-Geld.`), 2500);
  }

  // ---------------- Viren ----------------
  infect(hard = false) {
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

  // ---------------- Rendering ----------------
  renderTyping(on) {
    $('#pc-typing').style.visibility = on ? 'visible' : 'hidden';
  }

  render() {
    const c = this.call;
    const phoneStates = { idle: !c, ringing: c?.state === 'ringing', active: c && c.state !== 'ringing' };
    $('#phone-idle').style.display = phoneStates.idle ? '' : 'none';
    $('#phone-ring').style.display = phoneStates.ringing ? '' : 'none';
    $('#phone-call').style.display = phoneStates.active ? '' : 'none';
    $('#phone-tab-dot').style.display = phoneStates.ringing ? '' : 'none';
    if (phoneStates.idle) {
      $('#phone-idle-text').textContent = this.game.phase === 'work' ? 'Warte auf eingehende Anrufe ...' : 'Gerade keine Anrufe (Feierabend / Pause).';
      $('#pc-log').innerHTML = '';
    }
    if (phoneStates.ringing) {
      $('#ring-number').textContent = c.number;
      $('#ring-lure').textContent = c.scam.lure;
      $('#ring-tip').textContent = '💡 ' + c.scam.tip;
      $('#ring-scam').textContent = `${c.scam.icon} ${c.scam.name}`;
    }
    if (phoneStates.active) {
      const t = c.trust;
      const mood = t == null ? ['📞', '...'] : t >= 70 ? ['😊', 'vertraut dir'] : t >= 45 ? ['🙂', 'interessiert'] : t >= 25 ? ['🤨', 'skeptisch'] : ['😠', 'misstrauisch'];
      $('#call-who').textContent = `${c.number} · ${c.scam.icon} ${c.scam.name}`;
      $('#call-mood').textContent = `${mood[0]} ${mood[1]}`;
      $('#call-trust').style.width = (t ?? 0) + '%';
      $('#call-trust').style.background = t >= 60 ? '#3c3' : t >= 30 ? '#fb3' : '#e33';
      const steps = [['RemoteBuddy installiert', c.installed], ['Code erhalten', c.codeGiven], ['Verbunden', c.connected], ['Bank-Login', c.bankLoggedIn]];
      $('#call-steps').innerHTML = steps.map(([n, ok]) => `<span class="${ok ? 'ok' : ''}">${ok ? '✔' : '○'} ${n}</span>`).join('');
      $('#pc-hangup').disabled = c.state === 'ended';
    }
    this.renderRemote();
  }

  renderRemote() {
    const c = this.call;
    const view = $('#rb-view');
    const idWrap = $('#rb-login');
    if (!c || !c.connected) {
      idWrap.style.display = '';
      view.style.display = 'none';
      if (!c || c.state !== 'active') $('#rb-status').textContent = c ? '' : 'Kein aktiver Anruf.';
      return;
    }
    idWrap.style.display = 'none';
    view.style.display = '';
    const icons = this.files.map((f, i) => `<div class="file" data-i="${i}"><div class="fi">${f.icon}</div><div class="fn">${esc(f.name)}</div></div>`).join('');
    let bank = '';
    if (c.bankOpen) {
      bank = c.bankLoggedIn
        ? `<div class="bank"><div class="bh">🏦 ${esc(c.persona.bank)}</div>
            <div>Kontoinhaber: <b>${esc(c.persona.name)}</b></div>
            <div class="bal">Kontostand: <b>${euro(c.balance)}</b></div>
            <div class="row">Empfänger: <i>Callcenter Chaos GmbH</i></div>
            <div class="row">Betrag: <input id="bank-amount" type="number" min="1" step="50" value="${Math.min(500, c.balance)}"> € <button id="bank-send">Überweisen</button></div></div>`
        : `<div class="bank"><div class="bh">🏦 ${esc(c.persona.bank)}</div><div class="login">🔒 Bitte melden Sie sich an.<br><small>Nur der Kontoinhaber kann sich einloggen. Überrede den Anrufer!</small></div></div>`;
    }
    view.innerHTML = `<div class="victim ${c.blackout ? 'black' : ''}">
        <div class="vdesk">${icons}</div>${bank}
        <div class="vbar"><span>🪟 Start</span><span>${esc(c.persona.name.replace(/^Dr\. /, '').split(' ')[0])}s PC</span>
        <button id="rb-black">${c.blackout ? '🌕 Bildschirm zeigen' : '🌑 Bildschirm schwärzen'}</button></div>
      </div>`;
    view.querySelectorAll('.file').forEach(el => el.addEventListener('dblclick', () => this.openFile(this.files[+el.dataset.i])));
    view.querySelectorAll('.file').forEach(el => el.addEventListener('click', () => { if (matchMedia('(pointer:coarse)').matches) this.openFile(this.files[+el.dataset.i]); }));
    $('#rb-black').addEventListener('click', () => this.toggleBlackout());
    const send = $('#bank-send');
    if (send) {
      send.addEventListener('click', () => this.transfer());
      $('#bank-amount').addEventListener('keydown', (e) => e.stopPropagation());
    }
  }
}
