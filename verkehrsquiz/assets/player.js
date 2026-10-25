// Handy-Ansicht der Mitspielenden.
import { QUIZ, TIPS, QUOTE } from './questions.js';
import { connect } from './transport.js';
import { link, esc, fmt, store, SYMBOLS, SYMBOL_NAMES, Sound, soundButton, confetti, checkName, normalizeName, changeHTML } from './common.js';

const app = document.getElementById('app');
const SESSION = 'vq_player';

// Geräte-/Tab-Kennung: bleibt beim Neuladen erhalten (sessionStorage) und wird
// zusätzlich mit der Sitzung gespeichert, damit man nach dem Schließen wieder einsteigen kann.
const newToken = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const tabToken = {
  get() { try { return sessionStorage.getItem('vq_token'); } catch (e) { return null; } },
  set(v) { try { sessionStorage.setItem('vq_token', v); } catch (e) { /* egal */ } }
};
let token = tabToken.get();
if (!token) { token = newToken(); tabToken.set(token); }

let net = null;
let me = null;           // { code, name, id }
let joined = false;
let state = null;
let receivedAt = 0;
let pending = null;      // gesendete, noch nicht bestätigte Antwort
let renderedKey = '';
let missing = 0;
let pingTimer = null;
let joinTimers = [];

const now = () => Date.now();
const mine = () => state?.players.find((p) => p.id === me?.id);

// ---------------------------------------------------------------
//  Beitreten
// ---------------------------------------------------------------
function showJoin(error = '', presetCode = '', presetName = '') {
  joined = false;
  renderedKey = '';
  document.body.className = 'player';
  app.innerHTML = `
    <section class="join-card">
      <h1>Mitspielen</h1>
      <p class="muted">Gib den Spielcode vom Beamer und deinen Spitznamen ein.</p>
      <form id="join-form" novalidate>
        <label for="f-code">Spielcode</label>
        <input id="f-code" name="code" inputmode="numeric" autocomplete="off" pattern="[0-9]*" maxlength="6" placeholder="z. B. 48213" value="${esc(presetCode)}" required>
        <label for="f-name">Spitzname</label>
        <input id="f-name" name="name" maxlength="16" autocomplete="nickname" autocapitalize="words" placeholder="z. B. Radlerin Mia" value="${esc(presetName)}" required>
        <p class="form-error" id="f-error" role="alert">${esc(error)}</p>
        <button class="btn btn-primary btn-big btn-block" type="submit">Los geht's!</button>
      </form>
      <p class="muted small">Keine Anmeldung nötig. Bitte einen freundlichen Spitznamen wählen – keine echten Nachnamen.</p>
    </section>`;
  const form = document.getElementById('join-form');
  const codeEl = document.getElementById('f-code');
  const nameEl = document.getElementById('f-name');
  (presetCode ? nameEl : codeEl).focus();
  codeEl.addEventListener('input', () => { codeEl.value = codeEl.value.replace(/\D/g, ''); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = codeEl.value.trim();
    const name = normalizeName(nameEl.value);
    const err = !/^\d{4,6}$/.test(code) ? 'Der Spielcode hat 4 bis 6 Ziffern.' : checkName(name);
    if (err) { document.getElementById('f-error').textContent = err; return; }
    join(code, name);
  });
}

function showMessage(icon, title, text, actions = '') {
  renderedKey = '';
  document.body.className = 'player';
  app.innerHTML = `<section class="msg-card"><div class="msg-icon">${icon}</div><h1>${title}</h1><p>${text}</p>${actions}</section>`;
}

async function join(code, name) {
  showMessage('<span class="spinner"></span>', 'Verbinde …', `Du trittst dem Spiel <b>${esc(code)}</b> als <b>${esc(name)}</b> bei.`);
  Sound.tone(1, 0.01, 'sine', 0.0001); // Audio auf dem Handy freischalten (Nutzer-Geste)
  if (net) net.close();
  me = { code, name };
  net = await connect(code, 'player', onMessage, (s) => {
    if (s === 'connected' && joined) net.send({ type: 'hello', token });
  });
  const send = () => net.send({ type: 'join', token, name });
  joinTimers.forEach(clearTimeout);
  send();
  joinTimers = [setTimeout(send, 2000), setTimeout(send, 4500),
    setTimeout(() => { if (!joined) { net.close(); net = null; showJoin('Kein Spiel mit diesem Code gefunden. Prüfe den Code auf dem Beamer.', code, name); } }, 8000)];
}

function onMessage(msg) {
  if (!msg) return;
  if (msg.type === 'joined' && msg.token === token) {
    joinTimers.forEach(clearTimeout);
    if (!msg.ok) { joined = false; if (store(SESSION)?.token === token) store(SESSION, null); return showJoin(msg.reason, me.code, me.name); }
    if (joined && me.id === msg.id) return;
    joined = true;
    me = { code: me.code, name: msg.name, id: msg.id };
    store(SESSION, { ...me, token, ts: now() });
    clearInterval(pingTimer);
    pingTimer = setInterval(() => net && net.send({ type: 'ping', token }), 5000);
    keepAwake();
    net.send({ type: 'hello', token });
    if (!state) showMessage('✅', `Du bist dabei, ${esc(me.name)}!`, 'Schau auf den Beamer – gleich geht es los.');
    return;
  }
  if (msg.type === 'kicked' && msg.token === token) {
    leave();
    return showMessage('🚫', 'Du wurdest entfernt', 'Die Spielleitung hat dich aus dem Spiel genommen.',
      `<a class="btn btn-primary" href="${link('mitspielen/')}">Zur Startseite für Mitspielende</a>`);
  }
  if (msg.type === 'state' && joined && msg.code === me.code) {
    state = msg;
    receivedAt = now();
    if (!mine()) {
      if (++missing >= 2) {
        // Spielleitung kennt uns nicht (mehr) – z. B. neues Spiel mit gleichem Code
        joined = false;
        return join(me.code, me.name);
      }
      return;
    }
    missing = 0;
    if (pending && (state.qi !== pending.qi || state.phase !== 'question' || mine().answered)) pending = null;
    render();
  }
}

function leave() {
  joined = false;
  clearInterval(pingTimer);
  joinTimers.forEach(clearTimeout);
  if (store(SESSION)?.token === token) store(SESSION, null);
  if (net) { net.close(); net = null; }
}

// ---------------------------------------------------------------
//  Anzeige
// ---------------------------------------------------------------
function render() {
  const p = mine();
  const key = `${state.phase}|${state.qi}|${state.paused}|${p.answered || !!pending}`;
  if (key === renderedKey) return updateTimer();
  const prevPhase = renderedKey.split('|')[0];
  renderedKey = key;
  const fn = { lobby: rLobby, ready: rReady, question: rQuestion, reveal: rReveal, board: rBoard, final: rFinal }[state.phase];
  document.body.className = `player phase-${state.phase}`;
  app.innerHTML = `<div class="p-top"><span class="p-name">${esc(me.name)}</span><span class="p-score">${fmt(p.score)} P.</span><button class="icon-btn small" id="p-sound"></button></div>
    <div class="p-body">${fn(p)}</div>${state.paused ? '<div class="paused-overlay"><span>⏸ Pause</span></div>' : ''}`;
  soundButton(document.getElementById('p-sound'));
  if (state.phase === 'question' && !p.answered && !pending) {
    app.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.c)));
  }
  if (state.phase === 'reveal' && prevPhase !== 'reveal' && p.last?.qi === state.qi) {
    Sound.play(p.last.ok ? 'right' : 'wrong');
    navigator.vibrate?.(p.last.ok ? [60, 40, 60] : 250);
  }
  if (state.phase === 'final' && prevPhase !== 'final') {
    saveResult();
    if (p.rank <= 3) confetti(5000);
    Sound.play('fanfare');
  }
  updateTimer();
}

const rLobby = () => `<div class="p-center"><div class="msg-icon">✅</div><h1>Du bist dabei!</h1>
  <p>Schau auf den Beamer – gleich geht es los.</p><p class="muted">${state.players.length} Spieler sind im Spiel.</p></div>`;

const rReady = () => `<div class="p-center"><p class="q-kicker">Frage ${state.qi + 1} von ${state.total}</p>
  ${state.double ? '<div class="double-banner">Achtung, doppelte Punkte! <b>×2</b></div>' : ''}
  <h1>Mach dich bereit!</h1><p>Lies die Frage auf dem Beamer.</p><div class="ready-bar"><span id="p-ready"></span></div></div>`;

function rQuestion(p) {
  if (p.answered || pending) {
    const c = pending ? pending.c : null;
    return `<div class="p-center"><div class="msg-icon">${c != null ? `<span class="sym-big t${c}">${SYMBOLS[c]}</span>` : '📨'}</div>
      <h1>Antwort gesendet!</h1><p>Warte auf die anderen …</p><p class="p-timer-text"><span id="p-timer"></span></p></div>`;
  }
  const n = state.nAnswers;
  const labels = state.qtype === 'tf' ? ['Wahr', 'Falsch'] : null;
  return `<div class="p-timerbar"><span id="p-timebar"></span></div>
    <p class="p-hint">Frage ${state.qi + 1}${state.double ? ' · ×2 Punkte' : ''} – wähle auf dem Handy die Antwort vom Beamer · <b id="p-timer"></b></p>
    <div class="p-tiles n${n}">${Array.from({ length: n }, (_, i) =>
      `<button class="tile t${i}" data-c="${i}" aria-label="Antwort ${SYMBOL_NAMES[i]}${labels ? ': ' + labels[i] : ''}"><span class="sym">${SYMBOLS[i]}</span>${labels ? `<span class="tile-text">${labels[i]}</span>` : ''}</button>`).join('')}</div>`;
}

function rReveal(p) {
  if (!p.last || p.last.qi !== state.qi) {
    return `<div class="p-center"><div class="msg-icon">⏳</div><h1>Diese Runde hast du verpasst</h1><p>Bei der nächsten Frage bist du dabei!</p></div>`;
  }
  const l = p.last;
  document.body.classList.add(l.ok ? 'fb-right' : 'fb-wrong');
  const noAnswer = l.choice == null;
  return `<div class="p-center feedback">
    <div class="fb-icon">${l.ok ? '✓' : '✗'}</div>
    <h1>${l.ok ? 'Richtig!' : noAnswer ? 'Zeit abgelaufen' : 'Leider falsch'}</h1>
    <p class="fb-points">+${fmt(l.points)} Punkte</p>
    ${l.ok && l.bonus ? `<p class="fb-streak">🔥 ${l.streak} richtig in Folge: +${fmt(l.bonus)} Serienbonus</p>` : ''}
    ${!l.ok ? `<p>Richtig war <span class="sym-inline t${state.correct}">${SYMBOLS[state.correct]}</span> – die Erklärung steht auf dem Beamer.</p>` : ''}
    <p class="fb-rank">Du bist auf <b>Platz ${p.rank}</b> von ${state.players.length}</p></div>`;
}

function rBoard(p) {
  return `<div class="p-center"><p class="q-kicker">Zwischenstand</p>
    <div class="big-rank">${p.rank}.</div><p>Platz von ${state.players.length} · ${changeHTML(p)}</p>
    <p class="fb-points">${fmt(p.score)} Punkte</p><p class="muted">${p.correct} von ${state.played} richtig</p>
    ${state.nextDouble ? '<div class="double-banner small">Achtung: Die letzte Frage zählt doppelt! <b>×2</b></div>' : ''}</div>`;
}

function rFinal(p) {
  const medal = ['🥇', '🥈', '🥉'][p.rank - 1] || '🏁';
  return `<div class="p-center"><div class="msg-icon">${medal}</div><h1>Platz ${p.rank} von ${state.players.length}</h1>
    <p class="fb-points">${fmt(p.score)} Punkte</p><p>${p.correct} von ${state.played} Fragen richtig</p>
    <a class="btn btn-primary btn-block" href="${link('ergebnis/')}">Rangliste &amp; Tipps ansehen</a>
    <section class="tips compact"><h2>Das kannst du ab morgen tun</h2>
      <ul>${TIPS.map((t) => `<li><span>${t.icon}</span> <b>${esc(t.title)}</b></li>`).join('')}</ul></section>
    <blockquote class="final-quote small">„${esc(QUOTE)}“</blockquote></div>`;
}

function saveResult() {
  store('vq_result', {
    code: state.code, date: now(), title: QUIZ.title, total: state.played, me: me.id,
    ranking: state.players.map((p) => ({ id: p.id, rank: p.rank, prevRank: p.prevRank, name: p.name, score: p.score, correct: p.correct, totalTime: 0 }))
  });
  store(SESSION, null);
}

function localRemaining() {
  if (!state) return 0;
  if (state.paused) return state.remaining;
  return Math.max(0, state.remaining - (now() - receivedAt));
}

function updateTimer() {
  const r = localRemaining();
  const t = document.getElementById('p-timer');
  if (t) t.textContent = `${Math.ceil(r / 1000)} s`;
  const bar = document.getElementById('p-timebar');
  if (bar) bar.style.width = `${(r / state.limit) * 100}%`;
  const rb = document.getElementById('p-ready');
  if (rb) rb.style.width = `${Math.max(0, 100 - (r / (state.readyTotal || 4000)) * 100)}%`;
}

function answer(c) {
  if (!state || state.phase !== 'question' || state.paused) return;
  pending = { qi: state.qi, c, sent: now(), tries: 1 };
  navigator.vibrate?.(40);
  net.send({ type: 'answer', token, qi: state.qi, c });
  render();
}

setInterval(() => {
  if (!joined || !state) return;
  updateTimer();
  // Antwort erneut senden, falls die Spielleitung sie noch nicht bestätigt hat
  if (pending && state.phase === 'question' && state.qi === pending.qi && !mine()?.answered &&
      now() - pending.sent > 1500 && pending.tries < 5) {
    pending.sent = now(); pending.tries++;
    net.send({ type: 'answer', token, qi: pending.qi, c: pending.c });
  }
  // Länger nichts gehört → Hinweis anzeigen und Stand anfordern
  const lost = now() - receivedAt > 10000 && state.phase !== 'final';
  document.body.classList.toggle('conn-lost', lost);
  if (lost && net) net.send({ type: 'hello', token });
}, 250);

let wakeLock = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* egal */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    wakeLock = null;
    if (joined) { keepAwake(); net?.send({ type: 'hello', token }); }
  }
});

// ---------------------------------------------------------------
//  Start
// ---------------------------------------------------------------
const params = new URLSearchParams(location.search);
const urlCode = (params.get('code') || '').replace(/\D/g, '').slice(0, 6);
const session = store(SESSION);
const fresh = session && session.token && (!urlCode || urlCode === session.code) && now() - session.ts < 4 * 3600 * 1000;
if (fresh && session.token === token) {
  join(session.code, session.name);       // Neuladen / Verbindungsabbruch → automatisch wieder rein
} else {
  showJoin('', urlCode || (fresh ? session.code : ''), store('vq_lastname') || '');
  if (fresh) {
    const box = document.createElement('div');
    box.className = 'rejoin';
    box.innerHTML = `<p>Du warst eben schon als <b>${esc(session.name)}</b> im Spiel ${esc(session.code)}.</p>
      <button class="btn btn-secondary btn-block" type="button">↻ Als ${esc(session.name)} wieder einsteigen</button>`;
    box.querySelector('button').onclick = () => { token = session.token; tabToken.set(token); join(session.code, session.name); };
    document.querySelector('.join-card').prepend(box);
  }
}
addEventListener('submit', () => { const n = document.getElementById('f-name'); if (n) store('vq_lastname', n.value); }, true);
