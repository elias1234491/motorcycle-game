// Spracherkennung (Mikrofon -> Text) und Sprachausgabe (Text -> Stimme) über die Web Speech API.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
// In Claude (Artifact) ist das Mikrofon gesperrt: dort wird getippt.
export const canListen = !!SR && !(window.claude && typeof window.claude.use === 'function');

let rec = null;
let listening = false;
let onFinal = null;
let onInterim = null;

export function setupRecognition(finalCb, interimCb) {
  onFinal = finalCb;
  onInterim = interimCb;
  if (!SR) return;
  rec = new SR();
  rec.lang = 'de-DE';
  rec.continuous = true;
  rec.interimResults = true;
  let buffer = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) buffer += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    onInterim?.((buffer + interim).trim());
  };
  rec.onend = () => {
    const text = buffer.trim();
    buffer = '';
    if (listening) { listening = false; }
    if (text) onFinal?.(text);
    onInterim?.('');
  };
  rec.onerror = (e) => console.warn('Spracherkennung:', e.error);
}

// Push-to-talk: start beim Drücken, stop beim Loslassen
export function startListening() {
  if (!rec || listening) return;
  stopSpeaking();
  listening = true;
  try { rec.start(); } catch { listening = false; }
}
export function stopListening() {
  if (!rec || !listening) return;
  try { rec.stop(); } catch {}
}
export const isListening = () => listening;

// ---------- Sprachausgabe ----------
let germanVoices = [];
function loadVoices() {
  germanVoices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('de'));
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export function speak(text, voice = {}, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return; }
  speechSynthesis.cancel();
  const clean = text.replace(/\*[^*]*\*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) { onEnd?.(); return; }
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'de-DE';
  if (germanVoices.length) u.voice = germanVoices[(voice.index ?? 0) % germanVoices.length];
  u.pitch = voice.pitch ?? 1;
  u.rate = voice.rate ?? 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  speechSynthesis.speak(u);
}
export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ---------- kleine Soundeffekte ----------
let actx = null;
function ctx() { return actx || (actx = new (window.AudioContext || window.webkitAudioContext)()); }
export function beep(freq = 440, dur = 0.15, type = 'sine', vol = 0.15) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {}
}
export function ring() { beep(880, 0.25, 'square', 0.06); setTimeout(() => beep(660, 0.25, 'square', 0.06), 280); }
export function cash() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'triangle', 0.12), i * 70)); }
export function buzz() { beep(110, 0.4, 'sawtooth', 0.12); }
