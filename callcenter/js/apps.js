// Alle Zusatz-Apps des PCs wie im Original: Daten-Apps (Gutscheine, Identität, Kreditkarte), Scamazon-Shop,
// Rainbit-Casino, Meteor Cookie, Paint, Discorde-Teamchat, Zoomy-Meeting, Malwarebits, Ledger, Browser, Bildschirmrekorder.
import { SCAMS, SCAM_PRICES } from '../config.js';
import { INFO_LABEL, normInfo } from './computer.js';
import * as voice from './voice.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const euro = (n) => Math.round(n).toLocaleString('de-DE') + ' €';
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export const SVG = {
  gift: '<path d="M20 7h-2.2A3 3 0 0012 3.8 3 3 0 006.2 7H4a1 1 0 00-1 1v3h18V8a1 1 0 00-1-1zM9 7a1 1 0 110-2c.8 0 1.6 1 2 2zm6 0h-2c.4-1 1.2-2 2-2a1 1 0 010 2zM4 13v7a1 1 0 001 1h6v-8zm9 8h6a1 1 0 001-1v-7h-7z"/>',
  id: '<path d="M3 5h18v14H3zm2 2v10h14V7zm2 2h4v4H7zm6 0h4v1.5h-4zm0 3h4v1.5h-4zM7 14h10v1.5H7z"/>',
  card: '<path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2zm2 2v2h16V8zm0 5v5h16v-5zm2 2h5v1.5H6z"/>',
  shop: '<path d="M7 7V6a5 5 0 0110 0v1h3l-1 14H5L4 7zm2 0h6V6a3 3 0 00-6 0z"/>',
  casino: '<path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM7.5 15a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>',
  cookie: '<path d="M12 2a10 10 0 1010 10 4 4 0 01-4-4 4 4 0 01-4-4 2 2 0 01-2-2zM8 9a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm4 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm4-1a1 1 0 110 2 1 1 0 010-2zM7 15a1 1 0 110 2 1 1 0 010-2z"/>',
  paint: '<path d="M20.7 5.6l-2.3-2.3a1 1 0 00-1.4 0L9 11.3l3.7 3.7 8-8a1 1 0 000-1.4zM7.5 13a3.5 3.5 0 00-3.5 3.5c0 1.3-1 2-2 2.5 1 1 2.5 2 4.5 2a4 4 0 004-4 3.5 3.5 0 00-3-4z"/>',
  chat: '<path d="M4 3h16a2 2 0 012 2v11a2 2 0 01-2 2H8l-5 4V5a2 2 0 011-2zm4 6a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm4 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm4 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>',
  zoomy: '<path d="M4 4h16v3.5L9.5 17H20v3H4v-3.5L14.5 7H4z"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5zm-1 13.5l6-6-1.4-1.4-4.6 4.6-2.1-2.1L7.5 12z"/>',
  ledger: '<path d="M5 2h12a2 2 0 012 2v16a2 2 0 01-2 2H5zm3 4v2h8V6zm0 4v2h8v-2zm0 4v2h5v-2z"/>',
  web: '<path d="M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-3a15 15 0 00-1.4-4A8 8 0 0118.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 010-4h3.4a16 16 0 000 4zm.8 2h3a15 15 0 001.4 4 8 8 0 01-4.4-4zM8 8H5a8 8 0 014.4-4A15 15 0 008 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14 14 0 010-4h4.6a14 14 0 010 4z"/>',
  rec: '<path d="M4 6h11a2 2 0 012 2v2.5l4-3v9l-4-3V16a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zm4 3a3 3 0 100 6 3 3 0 000-6z"/>',
};

// Bezahl-Portale wie im Original (Healthcare, Dating, Retirement Fund ...): Kreditkarte des Anrufers belasten
export const PORTALS = [
  { id: 'p_kk', name: 'Krankenkasse', emoji: '🏥', color: '#e04848', pay: 1.0, day: 1, line: 'Zusatzbeitrag "Premium-Pflaster"' },
  { id: 'p_date', name: 'Dating', emoji: '💘', color: '#e2477e', pay: 1.2, day: 1, line: 'Herz-Match-Gebühr' },
  { id: 'p_rente', name: 'Rentenfonds', emoji: '👴', color: '#2f9e44', pay: 1.6, day: 2, line: 'Rentenvorsorge "Später reich"' },
  { id: 'p_flug', name: 'Flugticket', emoji: '✈️', color: '#2d7ff9', pay: 1.3, day: 2, line: 'Ticket nach Absurdistan' },
  { id: 'p_gym', name: 'Fitnessstudio', emoji: '💪', color: '#f08a1c', pay: 0.8, day: 3, line: 'Lebenslange Mitgliedschaft' },
  { id: 'p_zahn', name: 'Zahnarzt', emoji: '🦷', color: '#3aa6c9', pay: 1.1, day: 3, line: 'Gold-Füllung (nur Farbe)' },
  { id: 'p_kita', name: 'Kita-Platz', emoji: '🧸', color: '#a66be0', pay: 1.0, day: 4, line: 'Reservierungsgebühr' },
  { id: 'p_nobel', name: 'Nobelpreis', emoji: '🏆', color: '#d4a017', pay: 2.0, day: 4, line: 'Bearbeitungsgebühr Nobelpreis' },
  { id: 'p_wifi', name: 'WLAN-Support', emoji: '📶', color: '#1f8a8a', pay: 0.9, day: 5, line: 'Internet-Reparatur per Telefon' },
  { id: 'p_eth', name: 'Krypto-Wallet', emoji: '🪙', color: '#5b5fc7', pay: 2.2, day: 5, line: 'PinguCoin-Einzahlung' },
  { id: 'p_geb', name: 'Geburtstag', emoji: '🎂', color: '#ff7aa8', pay: 0.7, day: 6, line: 'Überraschungsparty-Service' },
  { id: 'p_blitz', name: 'Blitzschutz', emoji: '⚡', color: '#e0b000', pay: 1.4, day: 6, line: 'Blitz-Versicherung für Ihr Haus' },
  { id: 'p_hoehle', name: 'Höhlentauchen', emoji: '🤿', color: '#24627a', pay: 1.5, day: 7, line: 'Anfängerkurs ohne Rückkehr-Garantie' },
  { id: 'p_game', name: 'Videospiel-Abo', emoji: '🎮', color: '#7b55c9', pay: 0.9, day: 7, line: 'Premium-Pass für alle Spiele' },
  { id: 'p_ubahn', name: 'U-Bahn', emoji: '🚇', color: '#0a7a3a', pay: 0.6, day: 8, line: 'Jahresticket (nur sonntags)' },
  { id: 'p_coin', name: 'Coin-Futures', emoji: '📈', color: '#1d7a35', pay: 2.5, day: 8, line: 'Hebel-Wette auf Keksmasse' },
];

// Shop-Sortiment (Preise vom PERSÖNLICHEN Konto, wie im Original)
const SHOP = {
  'Maschen': SCAMS.filter(s => SCAM_PRICES[s.id]).map(s => ({ id: 'scam:' + s.id, name: s.name, emoji: s.icon, desc: `Sofort freischalten (sonst ab Tag ${s.day}).`, price: SCAM_PRICES[s.id], color: '#2d7ff9' })),
  'Business-Apps': [
    { id: 'mwpro', name: 'Malwarebits Pro', emoji: '🛡️', desc: 'Echtzeitschutz: blockt Viren automatisch.', price: 1000, color: '#1f9d55' },
    { id: 'ledger', name: 'Ledger', emoji: '📒', desc: 'Kontobuch für persönliche und Team-Einnahmen.', price: 0, color: '#2f6fd6' },
    { id: 'zoomy', name: 'Zoomy', emoji: '🎥', desc: 'Meetings mit Webcam und Chat fürs Team.', price: 0, color: '#2d8cff' },
    { id: 'discorde', name: 'Discorde', emoji: '💬', desc: 'Der Chat für dein Callcenter-Team.', price: 0, color: '#5865f2' },
  ],
  'Bezahl-Portale': PORTALS.filter(p => p.day > 1).map(p => ({ id: p.id, name: p.name, emoji: p.emoji, desc: `${p.line}. Sonst ab Tag ${p.day}.`, price: Math.round(p.pay * 400 / 50) * 50, color: p.color })),
  'Spiele & Software': [
    { id: 'rainbit', name: 'Rainbit', emoji: '🎰', desc: 'Original Büro-Casino: Slots, Crash, Münzwurf, Blackjack.', price: 200, color: '#7b2ff7' },
    { id: 'cookie', name: 'Meteor Cookie', emoji: '🍪', desc: 'Kekse klicken. Viele Kekse. Sehr viele.', price: 150, color: '#c27c2c' },
    { id: 'paint', name: 'JW Paint', emoji: '🎨', desc: 'Malen und an die Pinnwand im Büro hängen.', price: 0, color: '#e2533a' },
    { id: 'recorder', name: 'Banditcam', emoji: '🎬', desc: 'Bildschirmrekorder für deine Webcam.', price: 100, color: '#c0392b' },
  ],
  'Physische Waren': [
    { id: 'spray', name: 'Bärenspray', emoji: '🧴', desc: 'Leistungs-Feedback für Augen, Nase und Arbeitsmoral.', price: 35, color: '#8bd450' },
    { id: 'baton', name: 'Schlagstock (definitiv richtig geschrieben)', emoji: '🏏', desc: 'Für ruhige Teambesprechungen.', price: 120, color: '#555' },
    { id: 'taser', name: 'Motivations-Taser', emoji: '⚡', desc: 'Gibt verwertbares Feedback mit 50.000 Volt.', price: 350, color: '#ffd23a' },
    { id: 'shotgun', name: 'Konfliktlösungs-Flinte', emoji: '🎉', desc: 'Macht aus Großraumbüro offenes Raumkonzept. Schießt Konfetti.', price: 650, color: '#ff7a1a' },
    { id: 'sniper', name: 'Remote-Work-Scharfschütze', emoji: '🎯', desc: 'Nimm an Meetings von weit weg teil.', price: 1800, color: '#3b6fd8' },
    { id: 'strike_rival', name: 'Luftschlag auf die Konkurrenz', emoji: '🚀', desc: 'Raketen auf das Callcenter gegenüber. Deren Kunden rufen jetzt bei euch an.', price: 9000, color: '#d83a32', consumable: true },
    { id: 'strike_self', name: 'Luftschlag auf euch selbst', emoji: '💥', desc: 'Bestellt eine volle Raketen-Salve auf euer eigenes Büro. Moral kann variieren.', price: 6000, color: '#8a1a10', consumable: true },
  ],
};

export class Apps {
  constructor(game, pc) {
    this.game = game;
    this.pc = pc;
    this.owned = new Set(['paint', 'ledger', 'zoomy', 'discorde']);
    this.ledger = [];
    this.chat = [];
    this.cookies = { n: 0, life: 0, click: 1, units: [0, 0, 0, 0], tick: 0 };
    this.win = {};
    this.buildInfoApps();
    this.buildPortals();
    this.buildShop();
    this.buildBrowser();
    this.buildLedger();
    this.buildMalwarebits();
    this.buildDiscorde();
    this.buildZoomy();
    this.buildPaint();
    this.buildRainbit();
    this.buildCookie();
    this.buildRecorder();
    this.refreshIcons();
    setInterval(() => this.cookieTick(), 250);
  }

  // ---------- Hilfen ----------
  spend(price, what) {
    if (this.game.personal < price) { this.game.toast(`Zu wenig Geld auf deinem persönlichen Konto für ${what}.`); voice.buzz(); return false; }
    this.game.personal -= price;
    this.log(`${what}`, -price);
    return true;
  }
  personalGain(amount, what) {
    this.game.personal += amount;
    this.log(what, amount);
  }
  log(text, amount) {
    this.ledger.unshift({ t: this.game.clock, text, amount });
    this.ledger.length = Math.min(this.ledger.length, 60);
    this.renderLedger?.();
  }
  refreshIcons() {
    for (const [id, w] of Object.entries(this.win)) {
      const portal = PORTALS.find(p => p.id === id);
      w.icon.hidden = portal ? !(this.owned.has(id) || portal.day <= this.game.day) : !this.owned.has(id) && !w.always;
    }
  }
  resetRun() {
    this.owned = new Set(['paint', 'ledger', 'zoomy', 'discorde']);
    this.ledger = [];
    this.refreshIcons();
    this.renderShop();
  }
  highlight(type) {
    const id = { giftcard: 'gift', taxid: 'ident', creditcard: 'ccard' }[type];
    if (id) this.pc.openWin(id);
  }

  // ---------- Gutscheine / Identität / Kreditkarte ----------
  buildInfoApps() {
    const defs = [
      ['gift', 'giftcard', 'Gutscheine', '#f08a1c', SVG.gift, 'Gutschein-Einlöser', 'Löse Gutscheinkarten ein, die der Anrufer gekauft hat.', 'Gutschein-Code (XXXX-0000-XXXX)', 400],
      ['ident', 'taxid', 'Identität', '#b3261e', SVG.id, 'Identitäts-Klau-O-Mat', 'Prüfe die Steuer-ID eines Anrufers gegen das Register.', 'Steuer-ID (00 000 000 000)', 250],
      ['ccard', 'creditcard', 'Kreditkarte', '#1f8a8a', SVG.card, 'Karten-Kassierer', 'Buche über die Kreditkarte des Anrufers ab.', 'Kartennummer (0000 0000 0000 0000)', 600],
    ];
    for (const [id, type, title, color, svg, head, sub, label, base] of defs) {
      const { win, body, icon } = this.pc.addApp({ id, title, color, svg, w: 440, h: 300 });
      this.win[id] = { win, icon, always: true };
      body.innerHTML = `<div class="ia">
        <div class="ia-head"><span class="ia-logo" style="background:${color}"><svg viewBox="0 0 24 24">${svg}</svg></span><div><b>${head}</b><small>${sub}</small></div><span class="ia-flag">🇩🇪</span></div>
        <div class="ia-box"><div class="ia-note">Gib die Daten ein für <b>bis zu ${euro(base)}</b>.</div>
          <label>${label}</label><input class="ia-in" autocomplete="off"><div class="ia-row"><span class="ia-msg"></span><button class="ia-go">Prüfen</button></div></div></div>`;
      const input = body.querySelector('.ia-in'), msg = body.querySelector('.ia-msg');
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
      const go = () => {
        const c = this.pc.call;
        msg.className = 'ia-msg';
        if (!c || c.state === 'ringing') { msg.textContent = 'Kein Anrufer in der Leitung.'; return; }
        if (c.redeemed[type]) { msg.textContent = 'Schon eingelöst.'; return; }
        if (normInfo(input.value) !== normInfo(c.data[type])) { msg.textContent = '❌ Ungültig. Lass es dir nochmal vorlesen.'; voice.buzz(); return; }
        c.redeemed[type] = true;
        input.value = '';
        if (c.persona.scambaiter) {
          msg.textContent = '❌ Fake-Daten! Das war ein Scambaiter.';
          this.game.scambaited(c.persona);
          return;
        }
        const amount = Math.round(base * (0.7 + Math.min(1.5, c.persona.money / 20000)) / 10) * 10;
        c.stolen += amount;
        this.game.addEarnings(amount, `${INFO_LABEL[type]} von ${c.persona.name}: +${euro(amount)}`);
        voice.cash();
        msg.className = 'ia-msg ok';
        msg.textContent = `✔ Verifiziert: ${euro(amount)} verdient.`;
        this.pc.render();
      };
      body.querySelector('.ia-go').addEventListener('click', go);
    }
  }

  // ---------- Bezahl-Portale (Kreditkarte belasten) ----------
  buildPortals() {
    for (const p of PORTALS) {
      const svg = SVG.card;
      const { win, body, icon } = this.pc.addApp({ id: p.id, title: p.name, color: p.color, svg, w: 400, h: 330 });
      icon.querySelector('.ico').innerHTML = `<span style="font-size:24px">${p.emoji}</span>`;
      this.win[p.id] = { win, icon };
      const base = Math.round(500 * p.pay / 10) * 10;
      body.innerHTML = `<div class="po"><div class="po-head" style="background:${p.color}"><span>${p.emoji}</span><div><b>${esc(p.name)}</b><small>Sicheres Bezahlportal</small></div></div>
        <div class="po-body"><div class="po-item">${esc(p.line)}</div><div class="po-price">${euro(base)}</div>
        <label>Kreditkartennummer des Kunden</label><input class="po-in" placeholder="0000 0000 0000 0000" autocomplete="off">
        <button class="po-go" style="background:${p.color}">Zahlung abschließen</button><div class="po-msg"></div></div></div>`;
      const input = body.querySelector('.po-in'), msg = body.querySelector('.po-msg');
      const go = () => {
        const c = this.pc.call;
        msg.className = 'po-msg';
        if (!c || c.state === 'ringing') { msg.textContent = 'Kein Kunde in der Leitung.'; return; }
        if (normInfo(input.value) !== normInfo(c.data.creditcard)) { msg.textContent = '❌ Karte abgelehnt. Nummer stimmt nicht.'; voice.buzz(); return; }
        c.charges ||= [];
        if (c.charges.includes(p.id)) { msg.textContent = 'Diese Karte wurde hier schon belastet.'; return; }
        if (c.charges.length >= 3) { msg.textContent = '❌ Karte gesperrt: Die Bank hat Verdacht geschöpft.'; return; }
        input.value = '';
        c.charges.push(p.id);
        if (c.persona.scambaiter) { msg.textContent = '❌ Testkarte eines Scambaiters!'; this.game.scambaited(c.persona); return; }
        const amount = Math.round(base * (0.6 + Math.min(1.6, c.persona.money / 20000)) / 10) * 10;
        c.stolen += amount;
        this.game.addEarnings(amount, `${p.emoji} ${p.name}: ${c.persona.name} zahlt ${euro(amount)}`);
        voice.cash();
        msg.className = 'po-msg ok'; msg.textContent = `✔ Zahlung erfolgreich: ${euro(amount)}`;
        this.pc.event(`Auf deinem Handy kommt eine SMS: Deine Kreditkarte wurde mit ${amount} Euro belastet ("${p.name}").`, false);
        this.pc.render();
      };
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); });
      body.querySelector('.po-go').addEventListener('click', go);
    }
  }

  // ---------- Scamazon ----------
  buildShop() {
    const { win, body, icon } = this.pc.addApp({ id: 'shop', title: 'Scamazon', color: '#f08a1c', svg: SVG.shop, w: 760, h: 520, pinned: true });
    this.win.shop = { win, icon, always: true };
    this.shopTab = 'Maschen';
    body.innerHTML = `<div class="sz"><div class="sz-top"><span class="sz-logo"><b>$</b> SCAMAZON <i>MARKT</i></span><span class="sz-bal"></span></div>
      <div class="sz-tabs">${Object.keys(SHOP).map(t => `<button data-t="${t}">${t}</button>`).join('')}</div><div class="sz-grid"></div></div>`;
    body.querySelectorAll('.sz-tabs button').forEach(b => b.addEventListener('click', () => { this.shopTab = b.dataset.t; this.renderShop(); }));
    this.shopBody = body;
    this.renderShop();
  }
  renderShop() {
    const b = this.shopBody;
    if (!b) return;
    b.querySelector('.sz-bal').textContent = `Hallo, ${this.game.me?.name || 'Mitarbeiter'} · ${euro(this.game.personal)}`;
    b.querySelectorAll('.sz-tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === this.shopTab));
    const grid = b.querySelector('.sz-grid');
    grid.innerHTML = '';
    for (const it of SHOP[this.shopTab]) {
      const owned = this.isOwned(it);
      const can = this.game.personal >= it.price;
      const label = owned ? 'FREIGESCHALTET' : it.price === 0 ? 'GRATIS' : can ? `KAUFEN ${euro(it.price)}` : `BRAUCHE ${euro(it.price)}`;
      const card = el(`<div class="sz-card"><div class="sz-img" style="background:${it.color}">${it.emoji}</div><b>${esc(it.name)}</b><p>${esc(it.desc)}</p>
        <div class="sz-price">${it.price ? euro(it.price) : 'GRATIS'}</div><button class="sz-buy ${owned ? 'own' : can || !it.price ? 'ok' : 'no'}" ${owned ? 'disabled' : ''}>${label}</button></div>`);
      card.querySelector('button').addEventListener('click', () => this.buy(it));
      grid.appendChild(card);
    }
  }
  isOwned(it) {
    if (it.consumable) return false;
    if (it.id.startsWith('scam:')) return this.game.unlockedScams.has(it.id.slice(5)) || SCAMS.find(s => 'scam:' + s.id === it.id).day <= this.game.day;
    const portal = PORTALS.find(p => p.id === it.id);
    if (portal) return this.owned.has(it.id) || portal.day <= this.game.day;
    return this.owned.has(it.id) || this.game.inventory?.includes(it.id);
  }
  buy(it) {
    if (this.isOwned(it)) return;
    if (it.price && !this.spend(it.price, it.name)) { this.renderShop(); return; }
    voice.cash();
    if (it.id.startsWith('scam:')) { this.game.unlockedScams.add(it.id.slice(5)); this.game.toast(`🔓 Masche freigeschaltet: ${it.emoji} ${it.name}`); }
    else if (it.id.startsWith('strike_')) this.game.airstrike(it.id === 'strike_rival' ? 'rival' : 'self', true);
    else if (SHOP['Physische Waren'].includes(it)) { this.game.giveItem(it.id); this.game.toast(`📦 ${it.name} wurde an deinen Platz geliefert. Steh auf und benutze es (Q wechselt, Klick benutzt).`); }
    else { this.owned.add(it.id); this.refreshIcons(); this.game.toast(`${it.emoji} ${it.name} installiert. Das Symbol liegt auf dem Desktop.`); this.pc.openWin(it.id); }
    this.renderShop();
  }

  // ---------- Browser ----------
  buildBrowser() {
    const { win, body, icon } = this.pc.addApp({ id: 'web', title: 'Browser', color: '#3aa6c9', svg: SVG.web, w: 620, h: 440, pinned: true });
    this.win.web = { win, icon, always: true };
    const pages = {
      'gugel.de': `<div class="gg"><h1><span style="color:#4285f4">G</span><span style="color:#ea4335">u</span><span style="color:#fbbc05">g</span><span style="color:#4285f4">e</span><span style="color:#34a853">l</span></h1><input class="gg-in" placeholder="Gugel-Suche"><div class="gg-res"></div></div>`,
      'scamazon.de': null,
    };
    body.innerHTML = `<div class="br"><div class="br-bar"><button class="br-b">←</button><button class="br-b">⟳</button><input class="br-url" value="https://gugel.de"></div><div class="br-page"></div></div>`;
    const page = body.querySelector('.br-page');
    const results = [
      ['Wie werde ich reich ohne zu arbeiten? (12 Tipps)', 'tipps.example · Tipp 1: Ruf Leute an.'],
      ['Rainbit - Das Original Büro-Casino', 'Im Scamazon-Shop erhältlich.'],
      ['Ist mein Chef ein Roboter? Test', 'Wenn er ständig "QUOTE" schreit: ja.'],
      ['RemoteBuddy - Fernwartung für Anfänger', 'Partner-ID eingeben, verbinden, fertig.'],
      ['Warum ruft mich Oma Gertrud ständig zurück?', 'Sie hat Ihre Nummer auf einem Klebezettel.'],
    ];
    const show = () => {
      page.innerHTML = pages['gugel.de'];
      const inp = page.querySelector('.gg-in'), res = page.querySelector('.gg-res');
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key !== 'Enter') return;
        res.innerHTML = results.map(([t, d]) => `<div class="gg-r"><a>${t}</a><small>${d}</small></div>`).join('');
        res.querySelectorAll('a').forEach((a, i) => a.addEventListener('click', () => { if (i === 1) this.pc.openWin('shop'); if (i === 3) this.pc.openWin('remote'); }));
      });
    };
    body.querySelector('.br-url').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { if (/scamazon/i.test(e.target.value)) this.pc.openWin('shop'); show(); } });
    body.querySelectorAll('.br-b').forEach(b => b.addEventListener('click', show));
    show();
  }

  // ---------- Ledger ----------
  buildLedger() {
    const { win, body, icon } = this.pc.addApp({ id: 'ledger', title: 'Ledger', color: '#2f6fd6', svg: SVG.ledger, w: 380, h: 380 });
    this.win.ledger = { win, icon };
    body.innerHTML = `<div class="lg"><div class="lg-sum"></div><div class="lg-list"></div></div>`;
    this.renderLedger = () => {
      body.querySelector('.lg-sum').innerHTML = `<span>Persönlich <b>${euro(this.game.personal)}</b></span><span>Team <b>${euro(this.game.earned)}</b></span>`;
      body.querySelector('.lg-list').innerHTML = this.ledger.length
        ? this.ledger.map(r => `<div class="lg-row"><span>${r.t}</span><span>${esc(r.text)}</span><b class="${r.amount < 0 ? 'neg' : ''}">${r.amount > 0 ? '+' : ''}${euro(r.amount)}</b></div>`).join('')
        : '<div class="lg-empty">Noch keine Buchungen heute.</div>';
    };
    this.renderLedger();
  }

  // ---------- Malwarebits ----------
  buildMalwarebits() {
    const { win, body, icon } = this.pc.addApp({ id: 'mw', title: 'Malwarebits', color: '#1f9d55', svg: SVG.shield, w: 380, h: 280 });
    this.win.mw = { win, icon, always: true };
    body.innerHTML = `<div class="mw"><div class="mw-head">🛡️ Malwarebits <span class="mw-tier"></span></div><div class="mw-stat"></div><div class="mw-bar"><i></i></div><button class="mw-scan">Jetzt scannen</button></div>`;
    const stat = body.querySelector('.mw-stat'), bar = body.querySelector('.mw-bar i'), btn = body.querySelector('.mw-scan');
    const render = () => {
      body.querySelector('.mw-tier').textContent = this.owned.has('mwpro') ? 'PRO' : 'GRATIS';
      stat.textContent = this.owned.has('mwpro') ? 'Echtzeitschutz aktiv. Viren werden automatisch blockiert.' : 'Echtzeitschutz aus. Kauf Pro im Scamazon-Shop.';
    };
    btn.addEventListener('click', () => {
      btn.disabled = true; let p = 0;
      const t = setInterval(() => {
        p += 4; bar.style.width = p + '%';
        if (p >= 100) {
          clearInterval(t); btn.disabled = false;
          const n = document.querySelectorAll('#virus-layer .popup').length;
          document.querySelector('#virus-layer').innerHTML = '';
          this.pc.lockedUntil = 0;
          stat.textContent = n ? `${n} Bedrohungen entfernt.` : 'Keine Bedrohungen gefunden.';
          setTimeout(render, 2500);
        }
      }, 80);
    });
    this.renderMw = render;
    render();
  }

  // ---------- Discorde (Teamchat) ----------
  buildDiscorde() {
    const { win, body, icon } = this.pc.addApp({ id: 'discorde', title: 'Discorde', color: '#5865f2', svg: SVG.chat, w: 460, h: 400, dark: true });
    this.win.discorde = { win, icon };
    body.innerHTML = `<div class="dc"><div class="dc-side"><b>KONTAKTE</b><div class="dc-people"></div></div><div class="dc-main"><div class="dc-head"># callcenter-team</div><div class="dc-log"></div><div class="dc-in"><input placeholder="Nachricht schreiben ..." autocomplete="off"><button>➤</button></div></div></div>`;
    const input = body.querySelector('input');
    const send = () => {
      const t = input.value.trim();
      if (!t) return;
      input.value = '';
      this.addChat(this.game.me?.name || 'Du', t);
      this.game.net.send('chat', { name: this.game.me?.name, text: t.slice(0, 300) });
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
    body.querySelector('.dc-in button').addEventListener('click', send);
    this.dcBody = body;
    this.game.net.on('chat', (m) => this.addChat(String(m.name || '?').slice(0, 16), String(m.text || '').slice(0, 300)));
    // Spam-Bot mit verseuchtem "Gratis Nitro"-Link (wie im Original)
    setInterval(() => {
      if (this.game.phase === 'work' && Math.random() < 0.35) this.addChat('Nitro-Bot', 'DU HAST 1 MONAT DISCORDE NITRO GEWONNEN! KLICK ZUM EINLÖSEN', true);
    }, 70000);
    this.renderPeople();
  }
  addChat(name, text, trap = false) {
    this.chat.push({ name, text, trap });
    if (this.chat.length > 80) this.chat.shift();
    const log = this.dcBody.querySelector('.dc-log');
    const row = el(`<div class="dc-msg"><b>${esc(name)}</b><div>${esc(text)}</div></div>`);
    if (trap) {
      row.classList.add('trap');
      row.addEventListener('click', () => { row.remove(); this.pc.infect(); this.game.toast('Das war natürlich kein Nitro.'); });
    }
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    this.zoomChat?.(name, text);
    if (!this.pc.isOpen || this.win.discorde.win.hidden) voice.beep(980, 0.06, 'sine', 0.05);
  }
  renderPeople() {
    if (!this.dcBody) return;
    const names = [this.game.me?.name || 'Du', ...[...this.game.net.peers.values()].map(p => p.name)];
    this.dcBody.querySelector('.dc-people').innerHTML = names.map(n => `<div class="dc-p"><i></i>${esc(n)}<small>online</small></div>`).join('');
  }

  // ---------- Zoomy (Meeting mit Webcams) ----------
  buildZoomy() {
    const { win, body, icon } = this.pc.addApp({ id: 'zoomy', title: 'Zoomy', color: '#2d8cff', svg: SVG.zoomy, w: 640, h: 400, dark: true });
    this.win.zoomy = { win, icon };
    body.innerHTML = `<div class="zm"><div class="zm-tiles"></div><div class="zm-chat"><b>Meeting-Chat</b><div class="zm-log"></div><input placeholder="Nachricht ..." autocomplete="off"></div><div class="zm-foot">Zoomy-Meeting · <span class="zm-n">1</span> Teilnehmer</div></div>`;
    this.zmBody = body;
    const input = body.querySelector('input');
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter' || !input.value.trim()) return;
      const t = input.value.trim(); input.value = '';
      this.addChat(this.game.me?.name || 'Du', t);
      this.game.net.send('chat', { name: this.game.me?.name, text: t.slice(0, 300) });
    });
    this.zoomChat = (name, text) => {
      const log = body.querySelector('.zm-log');
      log.appendChild(el(`<div class="zm-m"><b>${esc(name)}</b> ${esc(text)}</div>`));
      log.scrollTop = log.scrollHeight;
    };
    this.zoomTiles = new Map();
  }
  // Kacheln: eigene Webcam + Kollegen (von main.js gerendert)
  zoomyCanvases() {
    if (!this.pc.isOpen || this.win.zoomy.win.hidden) return null;
    const ids = ['me', ...this.game.remotes.keys()];
    const tiles = this.zmBody.querySelector('.zm-tiles');
    for (const id of ids) {
      if (this.zoomTiles.has(id)) continue;
      const name = id === 'me' ? (this.game.me?.name || 'Du') : this.game.remotes.get(id)?.name || '?';
      const t = el(`<div class="zm-t"><canvas width="320" height="180"></canvas><span>${esc(name)}</span></div>`);
      tiles.appendChild(t);
      this.zoomTiles.set(id, t.querySelector('canvas'));
    }
    for (const [id, c] of this.zoomTiles) if (!ids.includes(id)) { c.parentElement.remove(); this.zoomTiles.delete(id); }
    this.zmBody.querySelector('.zm-n').textContent = ids.length;
    return this.zoomTiles;
  }

  // ---------- JW Paint ----------
  buildPaint() {
    const { win, body, icon } = this.pc.addApp({ id: 'paint', title: 'JW Paint', color: '#e2533a', svg: SVG.paint, w: 600, h: 440 });
    this.win.paint = { win, icon };
    const cols = ['#111', '#fff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ff80ab'];
    body.innerHTML = `<div class="pt"><div class="pt-tools">${cols.map(c => `<button class="pt-c" data-c="${c}" style="background:${c}"></button>`).join('')}
      <select class="pt-size"><option value="3">fein</option><option value="8" selected>mittel</option><option value="18">dick</option></select>
      <button class="pt-clear">Leeren</button><button class="pt-pin">An die Pinnwand</button></div><canvas width="560" height="330"></canvas></div>`;
    const cv = body.querySelector('canvas'), g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    let color = '#111', down = false, last = null;
    body.querySelectorAll('.pt-c').forEach(b => b.addEventListener('click', () => { color = b.dataset.c; body.querySelectorAll('.pt-c').forEach(x => x.classList.toggle('on', x === b)); }));
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener('pointerdown', (e) => { down = true; last = pos(e); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointermove', (e) => {
      if (!down) return;
      const p = pos(e);
      g.strokeStyle = color; g.lineWidth = +body.querySelector('.pt-size').value; g.lineCap = 'round';
      g.beginPath(); g.moveTo(...last); g.lineTo(...p); g.stroke();
      last = p;
    });
    body.querySelector('.pt-size').addEventListener('keydown', (e) => e.stopPropagation());
    body.querySelector('.pt-clear').addEventListener('click', () => { g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); });
    body.querySelector('.pt-pin').addEventListener('click', () => {
      this.game.office.setPinboard(cv);
      // kleine Version an die Kollegen schicken
      const s = document.createElement('canvas'); s.width = 112; s.height = 66;
      s.getContext('2d').drawImage(cv, 0, 0, 112, 66);
      const url = s.toDataURL('image/jpeg', 0.5);
      if (url.length < 3500) this.game.net.send('paint', { url });
      this.game.toast('🎨 Dein Kunstwerk hängt jetzt an der Pinnwand neben der Küche.');
    });
  }

  // ---------- Rainbit (Casino) ----------
  buildRainbit() {
    const { win, body, icon } = this.pc.addApp({ id: 'rainbit', title: 'Rainbit', color: '#7b2ff7', svg: SVG.casino, w: 560, h: 440, dark: true });
    this.win.rainbit = { win, icon };
    body.innerHTML = `<div class="rb2"><div class="rb2-top"><span class="rb2-logo">RAINBIT<small>ORIGINAL BÜRO-CASINO</small></span><span class="rb2-bal"></span></div>
      <div class="rb2-tabs"><button data-g="slots" class="on">SLOTS</button><button data-g="crash">CRASH</button><button data-g="coin">MÜNZWURF</button><button data-g="bj">BLACKJACK</button></div>
      <div class="rb2-bet">Einsatz <input type="number" min="10" step="10" value="50"> €</div><div class="rb2-game"></div><div class="rb2-msg"></div></div>`;
    this.rbBody = body;
    body.querySelector('.rb2-bet input').addEventListener('keydown', (e) => e.stopPropagation());
    body.querySelectorAll('.rb2-tabs button').forEach(b => b.addEventListener('click', () => {
      body.querySelectorAll('.rb2-tabs button').forEach(x => x.classList.toggle('on', x === b));
      this.casinoGame(b.dataset.g);
    }));
    this.casinoGame('slots');
  }
  bet() {
    const v = Math.floor(+this.rbBody.querySelector('.rb2-bet input').value || 0);
    if (v < 10) { this.casinoMsg('Mindesteinsatz 10 €.'); return 0; }
    if (!this.spend(v, 'Rainbit-Einsatz')) return 0;
    return v;
  }
  casinoMsg(t, win = false) {
    const m = this.rbBody.querySelector('.rb2-msg');
    m.textContent = t; m.className = 'rb2-msg' + (win ? ' win' : '');
    this.rbBody.querySelector('.rb2-bal').textContent = euro(this.game.personal);
    if (win) { voice.cash(); this.confetti(this.rbBody.querySelector('.rb2-game')); }
  }
  confetti(host) {
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('i');
      p.className = 'cf';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = `hsl(${Math.random() * 360},90%,60%)`;
      p.style.animationDelay = Math.random() * 0.3 + 's';
      host.appendChild(p);
      setTimeout(() => p.remove(), 1600);
    }
  }
  casinoGame(kind) {
    const g = this.rbBody.querySelector('.rb2-game');
    this.casinoMsg('');
    if (kind === 'slots') {
      const sym = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '💎'];
      g.innerHTML = `<div class="sl"><span>🍒</span><span>🍋</span><span>🔔</span></div><button class="rb2-go">DREHEN</button><small class="rb2-help">3 gleiche = 10×, 💎💎💎 = 25×, 2 gleiche = 2×</small>`;
      g.querySelector('.rb2-go').addEventListener('click', () => {
        const b = this.bet(); if (!b) return;
        const reels = [...g.querySelectorAll('.sl span')];
        let n = 0;
        const t = setInterval(() => {
          reels.forEach(r => (r.textContent = sym[Math.floor(Math.random() * sym.length)]));
          if (++n > 12) {
            clearInterval(t);
            const r = reels.map(x => x.textContent);
            const same = r[0] === r[1] && r[1] === r[2], two = r[0] === r[1] || r[1] === r[2] || r[0] === r[2];
            const mult = same ? (r[0] === '💎' ? 25 : 10) : two ? 2 : 0;
            if (mult) { this.personalGain(b * mult, 'Rainbit-Gewinn (Slots)'); this.casinoMsg(`Gewonnen: ${euro(b * mult)}!`, true); }
            else this.casinoMsg('Leider nichts. Nochmal?');
          }
        }, 70);
      });
    } else if (kind === 'crash') {
      g.innerHTML = `<div class="cr"><b class="cr-x">1.00×</b><canvas width="460" height="150"></canvas></div><button class="rb2-go">START</button>`;
      const btn = g.querySelector('.rb2-go'), x = g.querySelector('.cr-x'), cv = g.querySelector('canvas'), cg = cv.getContext('2d');
      let run = null;
      btn.addEventListener('click', () => {
        if (run) { // auszahlen
          const m = run.m; clearInterval(run.t); run = null;
          this.personalGain(Math.floor(this.crashBet * m), 'Rainbit-Gewinn (Crash)');
          this.casinoMsg(`Ausgezahlt bei ${m.toFixed(2)}×: ${euro(this.crashBet * m)}`, true);
          btn.textContent = 'START';
          return;
        }
        const b = this.bet(); if (!b) return;
        this.crashBet = b;
        const crashAt = Math.max(1, 0.97 / (1 - Math.random()));
        const pts = [];
        run = { m: 1, t: setInterval(() => {
          run.m *= 1.012;
          pts.push(run.m);
          x.textContent = run.m.toFixed(2) + '×';
          cg.clearRect(0, 0, 460, 150);
          cg.strokeStyle = '#36d46a'; cg.lineWidth = 3; cg.beginPath();
          pts.forEach((v, i) => { const px = i / Math.max(60, pts.length) * 450 + 5, py = 145 - Math.min(140, (v - 1) * 40); i ? cg.lineTo(px, py) : cg.moveTo(px, py); });
          cg.stroke();
          if (run.m >= crashAt) {
            clearInterval(run.t); run = null;
            x.textContent = `CRASH ${crashAt.toFixed(2)}×`;
            this.casinoMsg('Gecrasht! Einsatz verloren.');
            btn.textContent = 'START';
            voice.buzz();
          }
        }, 60) };
        btn.textContent = 'AUSZAHLEN';
      });
    } else if (kind === 'coin') {
      g.innerHTML = `<div class="cn">🪙</div><div class="cn-btns"><button data-s="Kopf" class="rb2-go">KOPF</button><button data-s="Zahl" class="rb2-go">ZAHL</button></div><small class="rb2-help">Richtig geraten = 1,95×</small>`;
      g.querySelectorAll('[data-s]').forEach(btn => btn.addEventListener('click', () => {
        const b = this.bet(); if (!b) return;
        const coin = g.querySelector('.cn'); coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip');
        setTimeout(() => {
          const r = Math.random() < 0.5 ? 'Kopf' : 'Zahl';
          coin.textContent = r === 'Kopf' ? '👑' : '🔢';
          if (r === btn.dataset.s) { this.personalGain(Math.floor(b * 1.95), 'Rainbit-Gewinn (Münzwurf)'); this.casinoMsg(`${r}! Gewonnen: ${euro(b * 1.95)}`, true); }
          else this.casinoMsg(`${r}. Verloren.`);
        }, 700);
      }));
    } else {
      g.innerHTML = `<div class="bj"><div>DEALER <span class="bj-d"></span></div><div>DU <span class="bj-p"></span></div></div><div class="cn-btns"><button class="rb2-go bj-deal">AUSTEILEN</button><button class="rb2-go bj-hit" disabled>KARTE</button><button class="rb2-go bj-stand" disabled>STEHEN</button></div>`;
      const card = () => ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K', 'A'][Math.floor(Math.random() * 13)];
      const val = (h) => { let s = 0, a = 0; for (const c of h) { if (c === 'A') { a++; s += 11; } else s += /[BDK]/.test(c) ? 10 : +c; } while (s > 21 && a--) s -= 10; return s; };
      let st = null;
      const show = (hide) => {
        g.querySelector('.bj-d').textContent = hide ? `${st.d[0]} 🂠` : `${st.d.join(' ')} (${val(st.d)})`;
        g.querySelector('.bj-p').textContent = `${st.p.join(' ')} (${val(st.p)})`;
      };
      const btns = (on) => { g.querySelector('.bj-hit').disabled = !on; g.querySelector('.bj-stand').disabled = !on; g.querySelector('.bj-deal').disabled = on; };
      const finish = () => {
        while (val(st.d) < 17) st.d.push(card());
        show(false); btns(false);
        const p = val(st.p), d = val(st.d);
        if (p > 21) this.casinoMsg('Überkauft. Verloren.');
        else if (d > 21 || p > d) { this.personalGain(st.b * 2, 'Rainbit-Gewinn (Blackjack)'); this.casinoMsg(`Gewonnen: ${euro(st.b * 2)}!`, true); }
        else if (p === d) { this.personalGain(st.b, 'Rainbit (Unentschieden)'); this.casinoMsg('Unentschieden. Einsatz zurück.'); }
        else this.casinoMsg('Der Dealer gewinnt.');
      };
      g.querySelector('.bj-deal').addEventListener('click', () => {
        const b = this.bet(); if (!b) return;
        st = { b, p: [card(), card()], d: [card(), card()] };
        show(true); btns(true);
        if (val(st.p) === 21) finish();
      });
      g.querySelector('.bj-hit').addEventListener('click', () => { st.p.push(card()); show(true); if (val(st.p) > 21) finish(); });
      g.querySelector('.bj-stand').addEventListener('click', finish);
    }
  }

  // ---------- Meteor Cookie (Clicker) ----------
  buildCookie() {
    const { win, body, icon } = this.pc.addApp({ id: 'cookie', title: 'Meteor Cookie', color: '#3a2a1a', svg: SVG.cookie, w: 360, h: 470, dark: true });
    this.win.cookie = { win, icon };
    this.units = [['Sicherheits-Screener', 0.5, 15], ['Praktikant am Ofen', 3, 120], ['Keks-Fabrik', 15, 1300], ['Keks-Meteor-Labor', 80, 14000]];
    body.innerHTML = `<div class="ck"><button class="ck-big">🍪</button><div class="ck-n"></div><div class="ck-tabs"><button class="on" data-t="a">Automatisierung</button><button data-t="c">Klick-Kraft</button><button data-t="b">Boosts</button></div><div class="ck-list"></div><div class="ck-life"></div></div>`;
    this.ckBody = body;
    this.ckTab = 'a';
    body.querySelector('.ck-big').addEventListener('click', (e) => {
      this.cookies.n += this.cookies.click; this.cookies.life += this.cookies.click;
      const f = el(`<span class="ck-pop">+${this.cookies.click}</span>`);
      f.style.left = (e.offsetX || 60) + 'px'; f.style.top = (e.offsetY || 40) + 'px';
      e.currentTarget.appendChild(f); setTimeout(() => f.remove(), 700);
      this.renderCookie();
    });
    body.querySelectorAll('.ck-tabs button').forEach(b => b.addEventListener('click', () => {
      this.ckTab = b.dataset.t;
      body.querySelectorAll('.ck-tabs button').forEach(x => x.classList.toggle('on', x === b));
      this.renderCookie(true);
    }));
    this.renderCookie(true);
  }
  cookieTick() {
    const rate = this.units.reduce((a, [, r], i) => a + r * this.cookies.units[i], 0);
    if (!rate) return;
    this.cookies.n += rate / 4; this.cookies.life += rate / 4;
    if (!this.win.cookie.win.hidden && this.pc.isOpen) this.renderCookie();
  }
  renderCookie(full = false) {
    const b = this.ckBody, c = this.cookies;
    b.querySelector('.ck-n').textContent = `${Math.floor(c.n).toLocaleString('de-DE')} Kekse`;
    b.querySelector('.ck-life').textContent = `LEBENSZEIT-KEKSMASSE: ${Math.floor(c.life).toLocaleString('de-DE')}`;
    if (!full && this.ckLast === this.ckTab + Math.floor(c.n / 5)) return;
    this.ckLast = this.ckTab + Math.floor(c.n / 5);
    const list = b.querySelector('.ck-list');
    let rows = [];
    if (this.ckTab === 'a') rows = this.units.map(([n, r, p], i) => { const cost = Math.ceil(p * Math.pow(1.15, c.units[i])); return [`${n}`, `${r}/s · besitzt ${c.units[i]}`, cost, () => { c.units[i]++; }]; });
    else if (this.ckTab === 'c') { const cost = 20 * Math.pow(3, Math.log2(c.click)); rows = [[`Stärkerer Zeigefinger`, `Klick-Kraft ${c.click} → ${c.click * 2}`, Math.ceil(cost), () => { c.click *= 2; }]]; }
    else rows = [
      ['Keks-Meteorschauer', 'Lässt Kekse vom Büro-Himmel regnen (alle sehen es)', 500, () => { this.game.cookieRain(true); }],
      ['Kekse verkaufen', '1.000 Kekse → 25 € persönlich', 1000, () => { this.personalGain(25, 'Keks-Verkauf'); }],
    ];
    list.innerHTML = '';
    for (const [n, d, cost, fn] of rows) {
      const r = el(`<div class="ck-row"><div><b>${esc(n)}</b><small>${esc(d)}</small></div><button ${c.n < cost ? 'disabled' : ''}>${cost.toLocaleString('de-DE')} 🍪</button></div>`);
      r.querySelector('button').addEventListener('click', () => { if (c.n < cost) return; c.n -= cost; fn(); this.renderCookie(true); });
      list.appendChild(r);
    }
  }

  // ---------- Banditcam (Bildschirmrekorder) ----------
  buildRecorder() {
    const { win, body, icon } = this.pc.addApp({ id: 'recorder', title: 'Banditcam', color: '#c0392b', svg: SVG.rec, w: 420, h: 340, dark: true });
    this.win.recorder = { win, icon };
    body.innerHTML = `<div class="rc"><video class="rc-v" controls playsinline></video><div class="rc-row"><button class="rc-go">● Aufnahme (6 s)</button><span class="rc-msg">Nimmt deine Webcam auf.</span></div></div>`;
    const btn = body.querySelector('.rc-go'), msg = body.querySelector('.rc-msg'), video = body.querySelector('video');
    btn.addEventListener('click', () => {
      if (typeof MediaRecorder === 'undefined' || !this.pc.camCanvas.captureStream) { msg.textContent = 'Aufnahme wird hier nicht unterstützt.'; return; }
      this.pc.openWin('cam');
      const rec = new MediaRecorder(this.pc.camCanvas.captureStream(24));
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => { video.src = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); video.play().catch(() => {}); btn.disabled = false; msg.textContent = 'Fertig! Abspielen ▶'; };
      rec.start(); btn.disabled = true; msg.textContent = '● Nimmt auf ...';
      setTimeout(() => rec.stop(), 6000);
    });
  }
}
