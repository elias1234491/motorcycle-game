// Gemeinsame Bausteine für alle Seiten: Kopfzeile, Sound, Konfetti, Hilfsfunktionen.

export const ROOT = new URL('../', import.meta.url);
export const link = (path = '') => new URL(path, ROOT).href;

export const SYMBOLS = ['▲', '◆', '●', '■'];
export const SYMBOL_NAMES = ['Dreieck', 'Raute', 'Kreis', 'Quadrat'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const fmt = (n) => Number(n).toLocaleString('de-DE');

export function store(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { return null; }
}

// ---------- Kopf- und Fußzeile ----------
const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1f9d55"/><circle cx="12.5" cy="25" r="5.5" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="27.5" cy="25" r="5.5" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M12.5 25l5-9h7l3 9M17.5 16l-2-3h-3M24.5 16l1.5-3h3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 7c3 0 6 2 6 5-3 0-6-2-6-5z" fill="#bfe9ff"/></svg>`;

export function renderChrome(active) {
  const header = document.querySelector('[data-site-header]');
  if (header) {
    const items = [
      ['start', '', 'Start'],
      ['mitspielen', 'mitspielen/', 'Mitspielen'],
      ['leiten', 'leiten/', 'Quiz leiten'],
      ['infos', 'infos/', 'Infos']
    ];
    header.className = 'site-header';
    header.innerHTML = `
      <a class="brand" href="${link('')}">${LOGO}<span>Verkehrsverhalten<small>das Quiz</small></span></a>
      <button class="nav-toggle" aria-label="Menü" aria-expanded="false">☰</button>
      <nav class="site-nav">${items.map(([k, p, t]) =>
        `<a href="${link(p)}"${k === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
    const btn = header.querySelector('.nav-toggle');
    btn.addEventListener('click', () => {
      const open = header.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open);
    });
  }
  const footer = document.querySelector('[data-site-footer]');
  if (footer) {
    footer.className = 'site-footer';
    footer.innerHTML = `<p>Ein Schulprojekt zum Referat „Verkehrsverhalten – Mobilität, Umwelt und wie wir sie neu denken“ ·
      <a href="${link('infos/')}">Quellen &amp; Impressum</a></p>`;
  }
}

// ---------- Sound (WebAudio, ohne Dateien) ----------
let audioCtx = null;
export const Sound = {
  get on() { return store('vq_sound') !== false; },
  set on(v) { store('vq_sound', !!v); },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0) {
    if (!this.on) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime + delay;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* kein Audio verfügbar */ }
  },
  play(name) {
    const T = (f, d, ty, v, dl) => this.tone(f, d, ty, v, dl);
    switch (name) {
      case 'tick': T(880, 0.05, 'square', 0.05); break;
      case 'start': T(523, 0.12); T(659, 0.12, 'sine', 0.15, 0.12); T(784, 0.2, 'sine', 0.15, 0.24); break;
      case 'reveal': T(660, 0.15, 'triangle'); T(990, 0.3, 'triangle', 0.15, 0.15); break;
      case 'right': T(784, 0.12, 'triangle'); T(1175, 0.25, 'triangle', 0.15, 0.1); break;
      case 'wrong': T(220, 0.3, 'sawtooth', 0.08); break;
      case 'join': T(1046, 0.08, 'sine', 0.08); break;
      case 'fanfare': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => T(f, 0.22, 'triangle', 0.15, i * 0.16)); break;
    }
  }
};

export function soundButton(btn) {
  const update = () => { btn.textContent = Sound.on ? '🔊' : '🔇'; btn.title = Sound.on ? 'Ton aus' : 'Ton an'; btn.setAttribute('aria-label', btn.title); };
  btn.addEventListener('click', () => { Sound.on = !Sound.on; update(); if (Sound.on) Sound.play('join'); });
  update();
}

// ---------- Konfetti ----------
export function confetti(duration = 5000) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const colors = ['#1f9d55', '#38a8e0', '#f28c28', '#ffd23f', '#ffffff', '#7b5cd6'];
  const parts = Array.from({ length: 180 }, () => ({
    x: Math.random() * c.width, y: -20 - Math.random() * c.height * 0.6,
    w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
    vx: -2 + Math.random() * 4, vy: 2 + Math.random() * 4,
    r: Math.random() * Math.PI, vr: -0.2 + Math.random() * 0.4,
    color: colors[(Math.random() * colors.length) | 0]
  }));
  const end = performance.now() + duration;
  (function frame(now) {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.03;
      if (p.y > c.height + 20 && now < end) { p.y = -20; p.x = Math.random() * c.width; p.vy = 2 + Math.random() * 3; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (now < end + 4000) requestAnimationFrame(frame);
    else { c.remove(); removeEventListener('resize', resize); }
  })(performance.now());
}

// ---------- Spitznamen prüfen ----------
const BAD = ['arsch', 'fick', 'fuck', 'fotze', 'hure', 'nutte', 'wichs', 'schlampe', 'bitch', 'hitler', 'nazi',
  'penis', 'vagina', 'porno', 'porn', 'sex', 'schwuchtel', 'spast', 'mongo', 'missgeburt', 'hurensohn', 'kanake',
  'neger', 'nigga', 'nigger', 'behindert', 'pimmel', 'schwanz', 'titte', 'kacke', 'scheiß', 'scheiss', 'shit',
  'cunt', 'whore', 'slut', 'idiot', 'wixer', 'wixxer', 'ficker', 'pussy', 'drecks', 'sieg heil', '88'];
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', 'ß': 'ss' };

export function normalizeName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

/** Gibt einen Fehlertext zurück oder '' wenn der Name in Ordnung ist. */
export function checkName(name) {
  const n = normalizeName(name);
  if (n.length < 2) return 'Der Spitzname braucht mindestens 2 Zeichen.';
  if (n.length > 16) return 'Der Spitzname darf höchstens 16 Zeichen haben.';
  if (!/^[\p{L}\p{N} ._\-!?]+$/u.test(n)) return 'Bitte nur Buchstaben, Zahlen und einfache Zeichen verwenden.';
  const raw = n.toLowerCase();
  const plain = raw.replace(/[013457@$!ß]/g, (c) => LEET[c]).replace(/[^a-zäöü]/g, '');
  if (BAD.some((w) => w === '88' ? /(^|\D)88(\D|$)/.test(raw) : plain.includes(w.replace(/\s/g, '')))) {
    return 'Bitte wähle einen freundlichen Spitznamen.';
  }
  return '';
}

// ---------- Ergebnis-Export ----------
export function resultCSV(result) {
  const rows = [['Platz', 'Spitzname', 'Punkte', 'Richtige Antworten', 'Fragen gesamt', 'Gesamtantwortzeit (s)']];
  for (const p of result.ranking) {
    rows.push([p.rank, p.name, p.score, p.correct, result.total, (p.totalTime / 1000).toFixed(1).replace('.', ',')]);
  }
  return '﻿' + rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

export function download(filename, text, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportResult(result) {
  const d = new Date(result.date || Date.now());
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  download(`verkehrsquiz-ergebnis-${stamp}-${result.code || ''}.csv`, resultCSV(result));
}

// ---------- Siegerpodest + Rangliste (HTML) ----------
export function podiumHTML(ranking) {
  const top = [ranking[1], ranking[0], ranking[2]];
  const medal = ['🥈', '🥇', '🥉'];
  const cls = ['second', 'first', 'third'];
  return `<div class="podium">${top.map((p, i) => p ? `
    <div class="podium-place ${cls[i]}" style="--d:${[1, 2, 0][i] * 0.5}s">
      <div class="podium-name">${medal[i]} ${esc(p.name)}</div>
      <div class="podium-score">${fmt(p.score)} P.</div>
      <div class="podium-block"><span>${p.rank}</span></div>
    </div>` : '<div class="podium-place empty"></div>').join('')}</div>`;
}

export function changeHTML(p) {
  if (!p.prevRank) return '<span class="chg new">neu</span>';
  const d = p.prevRank - p.rank;
  if (d > 0) return `<span class="chg up" title="${d} Plätze aufgestiegen">▲${d}</span>`;
  if (d < 0) return `<span class="chg down" title="${-d} Plätze abgestiegen">▼${-d}</span>`;
  return '<span class="chg same" title="unverändert">–</span>';
}

export function rankingTableHTML(ranking, total, highlightId) {
  return `<table class="ranking-table">
    <thead><tr><th>Platz</th><th>Spitzname</th><th>Punkte</th><th>Richtig</th><th>±</th></tr></thead>
    <tbody>${ranking.map((p) => `<tr${p.id === highlightId ? ' class="me"' : ''}>
      <td>${p.rank}.</td><td>${esc(p.name)}</td><td>${fmt(p.score)}</td><td>${p.correct} / ${total}</td><td>${changeHTML(p)}</td></tr>`).join('')}
    </tbody></table>`;
}

export function tipsHTML(tips, quote) {
  return `<section class="tips">
      <h2>Das kannst du ab morgen tun</h2>
      <div class="tip-grid">${tips.map((t) => `<article class="tip"><div class="tip-icon">${t.icon}</div>
        <h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></article>`).join('')}</div>
    </section>
    <blockquote class="final-quote">„${esc(quote)}“</blockquote>`;
}
