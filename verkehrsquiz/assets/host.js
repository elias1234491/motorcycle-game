// Spielleitung (Beamer-Ansicht). Diese Seite ist die „Schiedsrichterin“:
// Sie hält den Spielstand, wertet Antworten aus und schickt den Stand an alle Handys.
import { QUIZ, SHARED_CHARTS, TIPS, QUOTE } from './questions.js';
import { connect, REALTIME_ENABLED } from './transport.js';
import {
  link, esc, fmt, store, SYMBOLS, Sound, soundButton, confetti, checkName, normalizeName,
  podiumHTML, rankingTableHTML, tipsHTML, changeHTML, exportResult
} from './common.js';
import { chartSVG } from './charts.js';

const Q = QUIZ.questions.map((q) => ({ ...q, chart: typeof q.chart === 'string' ? SHARED_CHARTS[q.chart] : q.chart }));
const LIMIT = QUIZ.timeLimit * 1000;
const MAX = QUIZ.maxPlayers;
const ONLINE_MS = 15000;
const SAVE_KEY = 'vq_host_game';
const TYPE_LABEL = { mc: 'Multiple Choice', tf: 'Wahr oder falsch?', estimate: 'Schätzfrage' };

const stage = document.getElementById('stage');
const controls = document.getElementById('controls');
const topbar = document.getElementById('topbar');

let G = null;          // Spielstand
let net = null;        // Verbindung
let seq = 0;
let renderedKey = '';
let lastTickSecond = null;

const now = () => Date.now();
const isLast = (qi) => qi === Q.length - 1;
const players = () => Object.values(G.players);
const isOnline = (p) => now() - p.lastSeen < ONLINE_MS;
const readyMs = (qi) => (isLast(qi) ? 6000 : 4000);

// ===================================================================
//  Spielstand
// ===================================================================
function newGame() {
  G = {
    code: String(10000 + Math.floor(Math.random() * 90000)),
    created: now(),
    phase: 'lobby',
    qi: -1,
    paused: false,
    endsAt: 0,
    pausedRemaining: 0,
    players: {},
    kicked: [],
    answers: {},
    skipped: [],
    played: 0
  };
  save(true);
}

let saveTimer = null;
function save(immediate) {
  clearTimeout(saveTimer);
  if (immediate) store(SAVE_KEY, G);
  else saveTimer = setTimeout(() => store(SAVE_KEY, G), 300);
}

function ranking() {
  return players().sort((a, b) => b.score - a.score || a.totalTime - b.totalTime || a.name.localeCompare(b.name, 'de'));
}
function recomputeRanks() {
  ranking().forEach((p, i) => { p.rank = i + 1; });
}

function remaining() {
  if (G.paused) return G.pausedRemaining;
  return Math.max(0, G.endsAt - now());
}

function answeredCount() {
  return Object.keys(G.answers[G.qi] || {}).filter((id) => G.players[id]).length;
}

// ===================================================================
//  Netzwerk
// ===================================================================
async function startNetwork() {
  if (net) net.close();
  const statusEl = () => document.getElementById('net-status');
  net = await connect(G.code, 'host', onMessage, (s) => {
    const el = statusEl();
    if (el) {
      el.dataset.state = s;
      el.textContent = s === 'connected' ? (REALTIME_ENABLED ? 'online' : 'Demo-Modus') : s === 'error' ? 'Verbindung gestört' : 'verbinde …';
    }
    if (s === 'connected') broadcast(true);
  });
}

function publicState() {
  const q = Q[G.qi];
  const showSolution = ['reveal', 'board', 'final'].includes(G.phase);
  const ans = G.answers[G.qi] || {};
  return {
    type: 'state',
    seq: ++seq,
    code: G.code,
    phase: G.phase,
    qi: G.qi,
    total: Q.length,
    played: G.played,
    paused: G.paused,
    remaining: ['ready', 'question'].includes(G.phase) ? remaining() : 0,
    limit: LIMIT,
    readyTotal: G.qi >= 0 ? readyMs(G.qi) : 0,
    double: isLast(G.qi),
    nextDouble: G.phase === 'board' && isLast(G.qi + 1),
    nAnswers: q ? q.answers.length : 0,
    qtype: q ? q.type : null,
    correct: showSolution && q ? q.correct : null,
    players: ranking().map((p) => ({
      id: p.id, name: p.name, score: p.score, correct: p.correct, rank: p.rank, prevRank: p.prevRank || 0,
      answered: Boolean(ans[p.id]), last: p.last
    }))
  };
}

let bcTimer = null;
function broadcast(immediate) {
  if (!net) return;
  if (immediate) {
    clearTimeout(bcTimer); bcTimer = null;
    net.send(publicState());
  } else if (!bcTimer) {
    bcTimer = setTimeout(() => { bcTimer = null; net.send(publicState()); }, 400);
  }
}

function findByToken(token) {
  return players().find((p) => p.token === token);
}

function onMessage(msg) {
  if (!msg || !G || typeof msg.token !== 'string') return;
  const p = findByToken(msg.token);
  if (p) p.lastSeen = now();

  switch (msg.type) {
    case 'join': return handleJoin(msg);
    case 'hello':
    case 'ping':
      if (msg.type === 'hello') broadcast();
      if (p) updatePartial();
      return;
    case 'answer': return handleAnswer(p, msg);
  }
}

function reply(token, ok, reason, player) {
  net.send({ type: 'joined', token, ok, reason, id: player?.id, name: player?.name, code: G.code });
}

function handleJoin({ token, name }) {
  name = normalizeName(name);
  if (G.kicked.includes(token)) return reply(token, false, 'Du wurdest von der Spielleitung entfernt.');
  if (G.phase === 'final') return reply(token, false, 'Dieses Spiel ist schon vorbei.');

  const same = findByToken(token);
  if (same) {                                 // Wiedereinstieg vom selben Gerät
    same.lastSeen = now();
    reply(token, true, '', same);
    afterPlayersChanged();
    return;
  }
  const bad = checkName(name);
  if (bad) return reply(token, false, bad);

  const byName = players().find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (byName) {
    if (isOnline(byName)) return reply(token, false, 'Dieser Spitzname ist schon vergeben. Bitte wähle einen anderen.');
    byName.token = token;                      // Wiedereinstieg von einem anderen Gerät – Punkte bleiben
    byName.lastSeen = now();
    reply(token, true, '', byName);
    afterPlayersChanged();
    return;
  }
  if (players().length >= MAX) return reply(token, false, `Das Spiel ist voll (${MAX} Spieler).`);

  const id = Math.random().toString(36).slice(2, 9);
  G.players[id] = {
    id, token, name, score: 0, correct: 0, streak: 0, totalTime: 0,
    rank: players().length + 1, prevRank: 0, last: null, lastSeen: now(), joined: now()
  };
  // Wer später einsteigt, hat die bisherigen Fragen verpasst (zählt für den Gleichstand als volle Zeit)
  G.players[id].totalTime = G.played * LIMIT;
  recomputeRanks();
  reply(token, true, '', G.players[id]);
  Sound.play('join');
  afterPlayersChanged();
}

function handleAnswer(p, { qi, c }) {
  if (!p || G.phase !== 'question' || G.paused || qi !== G.qi) return;
  const q = Q[G.qi];
  if (!Number.isInteger(c) || c < 0 || c >= q.answers.length) return;
  G.answers[G.qi] = G.answers[G.qi] || {};
  if (G.answers[G.qi][p.id]) { broadcast(); return; }   // schon beantwortet → nur Bestätigung
  G.answers[G.qi][p.id] = { c, t: Math.min(LIMIT, LIMIT - remaining()) };
  save();
  broadcast();
  updatePartial();
}

function afterPlayersChanged() {
  save();
  broadcast();
  updatePartial();
}

// ===================================================================
//  Spielablauf
// ===================================================================
function startGame() {
  if (!players().length) return;
  Sound.play('start');
  nextQuestion();
}

function nextQuestion() {
  const qi = G.qi + 1;
  if (qi >= Q.length) return finish();
  G.qi = qi;
  G.phase = 'ready';
  G.paused = false;
  G.endsAt = now() + readyMs(qi);
  commit();
}

function startQuestion() {
  G.phase = 'question';
  G.endsAt = now() + LIMIT;
  G.answers[G.qi] = G.answers[G.qi] || {};
  lastTickSecond = null;
  Sound.play('start');
  commit();
}

function endQuestion() {
  const q = Q[G.qi];
  const dbl = isLast(G.qi) ? 2 : 1;
  const ans = G.answers[G.qi] || {};
  for (const p of players()) {
    p.prevRank = p.rank;
    const a = ans[p.id];
    if (a && a.c === q.correct) {
      const base = Math.round(1000 - 500 * Math.min(a.t, LIMIT) / LIMIT);
      p.streak += 1;
      const bonus = Math.min((p.streak - 1) * 100, 500);
      const points = (base + bonus) * dbl;
      p.score += points;
      p.correct += 1;
      p.totalTime += a.t;
      p.last = { qi: G.qi, ok: true, points, bonus: bonus * dbl, streak: p.streak, choice: a.c };
    } else {
      p.streak = 0;
      p.totalTime += a ? a.t : LIMIT;
      p.last = { qi: G.qi, ok: false, points: 0, bonus: 0, streak: 0, choice: a ? a.c : null };
    }
  }
  G.played += 1;
  recomputeRanks();
  // Nach der ersten gewerteten Frage gibt es noch keine sinnvolle „Veränderung“
  if (G.played === 1) players().forEach((p) => { p.prevRank = p.rank; });
  G.phase = 'reveal';
  G.paused = false;
  Sound.play('reveal');
  commit();
}

function showBoard() {
  if (isLast(G.qi)) return finish();
  G.phase = 'board';
  commit();
}

function skipQuestion() {
  if (!['ready', 'question'].includes(G.phase)) return;
  G.skipped.push(G.qi);
  delete G.answers[G.qi];
  if (isLast(G.qi)) return finish();
  nextQuestion();
}

function togglePause() {
  if (!['ready', 'question'].includes(G.phase)) return;
  if (G.paused) {
    G.endsAt = now() + G.pausedRemaining;
    G.paused = false;
  } else {
    G.pausedRemaining = Math.max(0, G.endsAt - now());
    G.paused = true;
  }
  commit();
}

function finish() {
  if (G.phase === 'lobby' || !players().length) { G.phase = 'final'; commit(); return; }
  G.phase = 'final';
  G.paused = false;
  recomputeRanks();
  store('vq_result', buildResult());
  Sound.play('fanfare');
  commit();
  confetti(7000);
}

function buildResult() {
  return {
    code: G.code, date: now(), title: QUIZ.title, total: G.played,
    ranking: ranking().map((p) => ({
      id: p.id, rank: p.rank, prevRank: p.prevRank, name: p.name, score: p.score, correct: p.correct, totalTime: p.totalTime
    }))
  };
}

function kick(id) {
  const p = G.players[id];
  if (!p) return;
  if (!confirm(`„${p.name}“ wirklich aus dem Spiel entfernen?`)) return;
  G.kicked.push(p.token);
  net.send({ type: 'kicked', token: p.token });
  delete G.players[id];
  recomputeRanks();
  afterPlayersChanged();
  if (G.phase === 'lobby') render(true);
  renderPlayersDialog();
}

function commit() {
  save(true);
  broadcast(true);
  render();
}

// Taktgeber
setInterval(() => {
  if (!G || G.paused) return;
  if (G.phase === 'ready' && now() >= G.endsAt) startQuestion();
  else if (G.phase === 'question') {
    const online = players().filter(isOnline);
    const answered = G.answers[G.qi] || {};
    const allIn = online.length > 0 && online.every((p) => answered[p.id]);
    if (now() >= G.endsAt || allIn) endQuestion();
    else updateCountdown();
  } else if (G.phase === 'ready') updateReady();
}, 100);

// Herzschlag: regelmäßig Stand senden (für Nachzügler und Wiedereinsteiger)
setInterval(() => {
  if (!G || !net) return;
  broadcast(true);
  updatePartial();
}, 2500);

// ===================================================================
//  Darstellung
// ===================================================================
function render(force) {
  const key = `${G.phase}|${G.qi}|${G.paused}`;
  renderTopbar();
  renderControls();
  if (!force && key === renderedKey) return updatePartial();
  renderedKey = key;
  document.body.dataset.phase = G.phase;
  const fn = { lobby: renderLobby, ready: renderReady, question: renderQuestion, reveal: renderReveal, board: renderBoard, final: renderFinal }[G.phase];
  stage.innerHTML = '';
  fn();
  updatePartial();
}

function joinURL() {
  return link(`mitspielen/?code=${G.code}`);
}

function renderTopbar() {
  const inGame = !['lobby', 'final'].includes(G.phase);
  topbar.innerHTML = `
    <div class="tb-left">
      <span class="tb-code" title="Spielcode">Code <b>${G.code}</b></span>
      ${inGame ? `<span class="tb-q">Frage ${G.qi + 1} / ${Q.length}</span>` : ''}
      <span class="tb-players"><span id="tb-count">${players().length}</span> / ${MAX} Spieler</span>
      <span class="net-status" id="net-status" data-state="connected">${REALTIME_ENABLED ? 'online' : 'Demo-Modus'}</span>
    </div>
    <div class="tb-right">
      <button class="icon-btn" id="btn-sound"></button>
      <button class="icon-btn" id="btn-fs" title="Vollbild (F)" aria-label="Vollbild">⛶</button>
    </div>`;
  soundButton(document.getElementById('btn-sound'));
  document.getElementById('btn-fs').onclick = toggleFullscreen;
}

function btn(label, action, cls = '', attrs = '') {
  return `<button class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
}

function renderControls() {
  const P = G.phase;
  let html = '';
  if (P === 'lobby') {
    html = btn('▶ Spiel starten', 'start', 'btn-primary btn-big', players().length ? '' : 'disabled') +
      btn('Neues Spiel', 'new', 'btn-ghost');
  } else if (P === 'ready' || P === 'question') {
    html = btn(G.paused ? '▶ Fortsetzen' : '⏸ Pausieren', 'pause', 'btn-secondary') +
      (P === 'question' ? btn('Jetzt auflösen', 'reveal', 'btn-primary') : '') +
      btn('⏭ Frage überspringen', 'skip', 'btn-ghost') +
      btn('👥 Spieler', 'players', 'btn-ghost') +
      btn('■ Beenden', 'end', 'btn-danger');
  } else if (P === 'reveal') {
    html = btn(isLast(G.qi) ? '🏆 Zum Finale' : 'Zwischenstand →', 'board', 'btn-primary btn-big') +
      btn('👥 Spieler', 'players', 'btn-ghost') + btn('■ Beenden', 'end', 'btn-danger');
  } else if (P === 'board') {
    html = btn('Nächste Frage →', 'next', 'btn-primary btn-big') +
      btn('👥 Spieler', 'players', 'btn-ghost') + btn('■ Beenden', 'end', 'btn-danger');
  } else if (P === 'final') {
    html = btn('⬇ Rangliste als Datei (CSV)', 'export', 'btn-secondary') +
      `<a class="btn btn-ghost" href="${link('ergebnis/')}" target="_blank" rel="noopener">Ergebnis-Seite öffnen</a>` +
      btn('Neues Spiel', 'new', 'btn-primary');
  }
  controls.innerHTML = html;
}

controls.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b || b.disabled) return;
  doAction(b.dataset.action);
});

function doAction(a) {
  switch (a) {
    case 'start': return startGame();
    case 'pause': return togglePause();
    case 'reveal': return G.phase === 'question' && endQuestion();
    case 'skip': return confirm('Diese Frage überspringen? Es gibt keine Punkte dafür.') && skipQuestion();
    case 'board': return showBoard();
    case 'next': return nextQuestion();
    case 'end': return confirm('Spiel jetzt beenden und Siegerehrung zeigen?') && finish();
    case 'players': return openPlayersDialog();
    case 'export': return exportResult(buildResult());
    case 'new':
      if (G.phase !== 'final' && players().length && !confirm('Neues Spiel starten? Das aktuelle Spiel geht verloren.')) return;
      newGame(); renderedKey = ''; startNetwork(); render(true); return;
  }
}

// Tastatur: Leertaste/→ = weiter, P = Pause, F = Vollbild
document.addEventListener('keydown', (e) => {
  if (!G || e.target.closest('input, textarea, dialog')) return;
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  else if (e.key === 'p' || e.key === 'P') togglePause();
  else if (e.key === ' ' || e.key === 'ArrowRight') {
    e.preventDefault();
    const map = { lobby: 'start', question: 'reveal', reveal: 'board', board: 'next' };
    if (map[G.phase]) doAction(map[G.phase]);
  }
});

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

// ---------- Lobby ----------
function renderLobby() {
  const url = joinURL();
  stage.innerHTML = `
    <section class="lobby">
      <div class="lobby-join">
        <p class="lobby-step">Handy raus und mitspielen!</p>
        <div class="qr-box">${qrSVG(url)}</div>
        <p class="lobby-url">${esc(url.replace(/^https?:\/\//, '').replace(/\?.*$/, ''))}</p>
        <p class="lobby-codelabel">Spielcode</p>
        <div class="big-code" aria-label="Spielcode ${G.code}">${G.code.split('').map((d) => `<span>${d}</span>`).join('')}</div>
        ${REALTIME_ENABLED ? '' : `<p class="demo-hint">Demo-Modus: Echtzeit-Server noch nicht eingerichtet. Mitspielen klappt nur in weiteren Tabs dieses Browsers. Anleitung: README.md</p>`}
      </div>
      <div class="lobby-players">
        <h2><span id="lobby-count">0</span> / ${MAX} Spieler</h2>
        <ul class="player-chips" id="lobby-list"></ul>
        <p class="lobby-empty" id="lobby-empty">Noch niemand da – scannt den QR-Code!</p>
      </div>
    </section>`;
}

function qrSVG(text) {
  if (typeof window.qrcode !== 'function') return `<p>${esc(text)}</p>`;
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}

function updateLobby() {
  const list = document.getElementById('lobby-list');
  if (!list) return;
  const ps = players().sort((a, b) => a.joined - b.joined);
  document.getElementById('lobby-count').textContent = ps.length;
  document.getElementById('lobby-empty').hidden = ps.length > 0;
  const existing = new Map([...list.children].map((li) => [li.dataset.id, li]));
  for (const p of ps) {
    let li = existing.get(p.id);
    if (!li) {
      li = document.createElement('li');
      li.dataset.id = p.id;
      li.innerHTML = `<span class="chip-name"></span><button class="chip-x" title="Entfernen" aria-label="${esc(p.name)} entfernen">×</button>`;
      li.querySelector('.chip-x').onclick = () => kick(p.id);
      list.appendChild(li);
    }
    existing.delete(p.id);
    li.querySelector('.chip-name').textContent = p.name;
    li.classList.toggle('offline', !isOnline(p));
  }
  existing.forEach((li) => li.remove());
}

// ---------- Vorbereitung („Achtung, doppelte Punkte!“) ----------
function renderReady() {
  const q = Q[G.qi];
  stage.innerHTML = `
    <section class="ready">
      <p class="q-kicker">Frage ${G.qi + 1} von ${Q.length} · ${TYPE_LABEL[q.type]}</p>
      ${isLast(G.qi) ? '<div class="double-banner">Achtung, doppelte Punkte! <b>×2</b></div>' : ''}
      <h1 class="q-text">${esc(q.question)}</h1>
      <div class="ready-bar"><span id="ready-fill"></span></div>
      ${G.paused ? pausedOverlay() : ''}
    </section>`;
}
function updateReady() {
  const f = document.getElementById('ready-fill');
  if (f) f.style.width = `${100 - (remaining() / readyMs(G.qi)) * 100}%`;
}

const pausedOverlay = () => '<div class="paused-overlay"><span>⏸ Pause</span></div>';

// ---------- Frage ----------
function tilesHTML(q, mode) {
  return `<div class="answer-grid n${q.answers.length}">${q.answers.map((a, i) => {
    const state = mode === 'reveal' ? (i === q.correct ? ' is-correct' : ' is-wrong') : '';
    return `<div class="tile t${i}${state}"><span class="sym" aria-hidden="true">${SYMBOLS[i]}</span><span class="tile-text">${esc(a)}</span>${mode === 'reveal' && i === q.correct ? '<span class="tick">✓</span>' : ''}</div>`;
  }).join('')}</div>`;
}

function renderQuestion() {
  const q = Q[G.qi];
  stage.innerHTML = `
    <section class="question">
      <div class="q-head">
        <p class="q-kicker">Frage ${G.qi + 1} von ${Q.length} · ${TYPE_LABEL[q.type]}</p>
        ${isLast(G.qi) ? '<span class="double-badge">×2 Punkte</span>' : ''}
      </div>
      <div class="q-row">
        <h1 class="q-text">${esc(q.question)}</h1>
        <div class="q-side">
          <div class="countdown" id="countdown">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="cd-bg"/><circle cx="60" cy="60" r="52" class="cd-fg" id="cd-ring" pathLength="100"/></svg>
            <span id="cd-num">${Math.ceil(remaining() / 1000)}</span>
          </div>
          <p class="answered"><b id="ans-count">0</b> / <span id="ans-total">${players().length}</span><br>Antworten</p>
        </div>
      </div>
      ${tilesHTML(q, 'question')}
      ${G.paused ? pausedOverlay() : ''}
    </section>`;
  updateCountdown();
}

function updateCountdown() {
  const num = document.getElementById('cd-num');
  if (!num) return;
  const r = remaining();
  const s = Math.ceil(r / 1000);
  num.textContent = s;
  document.getElementById('cd-ring').style.strokeDashoffset = String(100 - (r / LIMIT) * 100);
  document.getElementById('countdown').classList.toggle('hurry', s <= 5);
  if (s !== lastTickSecond && s <= 5 && s > 0 && !G.paused) Sound.play('tick');
  lastTickSecond = s;
}

function updateAnswered() {
  const el = document.getElementById('ans-count');
  if (!el) return;
  el.textContent = answeredCount();
  document.getElementById('ans-total').textContent = players().length;
}

// ---------- Auflösung ----------
function renderReveal() {
  const q = Q[G.qi];
  const ans = Object.values(G.answers[G.qi] || {});
  const counts = q.answers.map((_, i) => ans.filter((a) => a.c === i).length);
  const max = Math.max(1, ...counts);
  const right = counts[q.correct];
  const total = players().length;
  stage.innerHTML = `
    <section class="reveal">
      <p class="q-kicker">Auflösung · Frage ${G.qi + 1} von ${Q.length}${isLast(G.qi) ? ' · ×2 Punkte' : ''}</p>
      <h1 class="q-text small">${esc(q.question)}</h1>
      <div class="reveal-grid">
        <div class="reveal-left">
          <div class="dist" style="--n:${counts.length}" role="img" aria-label="Verteilung der Antworten">
            ${counts.map((c, i) => `<div class="dist-col t${i}${i === q.correct ? ' is-correct' : ''}">
              <span class="dist-num">${c}</span>
              <div class="dist-bar" style="--p:${c / max}"></div>
              <span class="dist-sym">${SYMBOLS[i]}${i === q.correct ? ' ✓' : ''}</span></div>`).join('')}
          </div>
          <div class="correct-answer"><span class="sym t${q.correct}">${SYMBOLS[q.correct]}</span>
            <span><small>Richtig:</small> ${esc(q.answers[q.correct])}</span></div>
          <p class="reveal-stat">${right} von ${total} ${total === 1 ? 'Person hat' : 'Personen haben'} richtig geantwortet.</p>
        </div>
        <div class="reveal-right">
          <div class="explain"><span class="explain-icon">💡</span><p>${esc(q.explanation)}</p></div>
          ${chartSVG(q.chart)}
        </div>
      </div>
    </section>`;
}

// ---------- Zwischenstand (Top 5) ----------
function renderBoard() {
  const r = ranking();
  const top = r.slice(0, 5);
  stage.innerHTML = `
    <section class="board">
      <h1>Zwischenstand <small>nach Frage ${G.qi + 1} von ${Q.length}</small></h1>
      ${isLast(G.qi + 1) ? '<div class="double-banner small">Achtung: Die letzte Frage zählt doppelt! <b>×2</b></div>' : ''}
      <ol class="leader" style="--rows:${Math.max(1, top.length)}">
        ${top.map((p) => {
          const from = p.prevRank && p.prevRank <= 5 ? p.prevRank - 1 : 5;
          const gained = p.last && p.last.qi === G.qi ? p.last.points : 0;
          return `<li class="leader-row" style="--pos:${from}" data-to="${p.rank - 1}" data-from="${from}">
            <span class="lr-rank">${p.rank}</span>
            <span class="lr-name">${esc(p.name)}</span>
            ${changeHTML(p)}
            <span class="lr-correct">${p.correct} ✓</span>
            ${gained ? `<span class="lr-gain">+${fmt(gained)}</span>` : ''}
            <span class="lr-score" data-from="${p.score - gained}" data-to="${p.score}">${fmt(p.score - gained)}</span>
          </li>`;
        }).join('')}
      </ol>
      ${r.length > 5 ? `<p class="board-more">… und ${r.length - 5} weitere. Euren Platz seht ihr auf dem Handy!</p>` : ''}
    </section>`;
  requestAnimationFrame(() => setTimeout(() => {
    stage.querySelectorAll('.leader-row').forEach((li) => {
      li.style.setProperty('--pos', li.dataset.to);
      li.classList.add('moved');
    });
    stage.querySelectorAll('.lr-score').forEach((el) => countUp(el, +el.dataset.from, +el.dataset.to, 1200));
  }, 700));
}

function countUp(el, from, to, ms) {
  const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

// ---------- Finale ----------
function renderFinal() {
  const result = buildResult();
  stage.innerHTML = `
    <section class="final">
      <h1>Siegerehrung 🏆</h1>
      ${result.ranking.length ? podiumHTML(result.ranking) : '<p>Keine Mitspielenden.</p>'}
      <div class="final-grid">
        <div class="final-table">${rankingTableHTML(result.ranking, result.total)}</div>
        <div>${tipsHTML(TIPS, QUOTE)}</div>
      </div>
    </section>`;
}

// ---------- Teilaktualisierungen ----------
function updatePartial() {
  if (!G) return;
  const c = document.getElementById('tb-count');
  if (c) c.textContent = players().length;
  if (G.phase === 'lobby') {
    updateLobby();
    const start = controls.querySelector('[data-action="start"]');
    if (start) start.disabled = players().length === 0;
  }
  if (G.phase === 'question') updateAnswered();
  renderPlayersDialog();
}

// ---------- Spieler verwalten ----------
const dialog = document.getElementById('players-dialog');
function openPlayersDialog() {
  renderPlayersDialog(true);
  dialog.showModal();
}
function renderPlayersDialog(force) {
  if (!dialog || (!dialog.open && !force)) return;
  const list = dialog.querySelector('ul');
  list.innerHTML = ranking().map((p) => `<li>
      <span class="dot ${isOnline(p) ? 'on' : 'off'}" title="${isOnline(p) ? 'verbunden' : 'nicht verbunden'}"></span>
      <span class="pd-name">${esc(p.name)}</span><span class="pd-score">${fmt(p.score)} P.</span>
      <button class="btn btn-danger btn-small" data-kick="${p.id}">Entfernen</button></li>`).join('') ||
    '<li>Noch keine Spieler.</li>';
}
dialog?.addEventListener('click', (e) => {
  const k = e.target.closest('[data-kick]');
  if (k) kick(k.dataset.kick);
  if (e.target.closest('[data-close]') || e.target === dialog) dialog.close();
});

// ===================================================================
//  Start der Seite
// ===================================================================
function boot() {
  const saved = store(SAVE_KEY);
  const resumable = saved && saved.phase && saved.phase !== 'final' && now() - saved.created < 4 * 3600 * 1000;
  stage.innerHTML = `
    <section class="setup">
      <h1>Quiz leiten</h1>
      <p class="setup-lead">Diese Ansicht ist für den Beamer gemacht. Starte ein neues Spiel – dann erscheinen Spielcode und QR-Code.</p>
      <div class="setup-actions">
        <button class="btn btn-primary btn-big" id="btn-new">▶ Neues Spiel starten</button>
        ${resumable ? `<button class="btn btn-secondary btn-big" id="btn-resume">↻ Laufendes Spiel fortsetzen (Code ${esc(saved.code)})</button>` : ''}
      </div>
      <ul class="setup-hints">
        <li><b>Tipp:</b> Mit <kbd>F</kbd> oder ⛶ geht es in den Vollbildmodus.</li>
        <li><kbd>Leertaste</kbd> = weiter, <kbd>P</kbd> = Pause.</li>
        <li>${QUIZ.questions.length} Fragen · ${QUIZ.timeLimit} Sekunden pro Frage · bis zu ${MAX} Spieler · ca. 15 Minuten</li>
        ${REALTIME_ENABLED ? '' : '<li class="demo-hint">Demo-Modus: In <code>assets/config.js</code> ist noch kein Supabase-Projekt eingetragen. Dann klappt Mitspielen nur in weiteren Tabs dieses Browsers.</li>'}
      </ul>
    </section>`;
  controls.innerHTML = '';
  topbar.innerHTML = `<div class="tb-left"><a class="tb-home" href="${link('')}">← Startseite</a></div>
    <div class="tb-right"><button class="icon-btn" id="btn-sound"></button><button class="icon-btn" id="btn-fs" aria-label="Vollbild">⛶</button></div>`;
  soundButton(document.getElementById('btn-sound'));
  document.getElementById('btn-fs').onclick = toggleFullscreen;

  document.getElementById('btn-new').onclick = () => {
    newGame(); startNetwork(); render(true);
  };
  const r = document.getElementById('btn-resume');
  if (r) r.onclick = () => {
    G = saved;
    // Alle gelten als kurz verbunden, bis ihre Handys sich melden
    players().forEach((p) => { p.lastSeen = now(); });
    if (G.paused === false && ['ready', 'question'].includes(G.phase) && G.endsAt < now()) {
      G.endsAt = now() + 3000;    // kleine Gnadenfrist nach dem Neuladen
    }
    startNetwork(); render(true);
  };
}

window.addEventListener('beforeunload', () => { if (G) store(SAVE_KEY, G); });
boot();
