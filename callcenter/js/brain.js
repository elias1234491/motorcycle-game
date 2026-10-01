// Verbindet das Spiel mit dem Anrufer-Gehirn: Supabase Edge Function, eigener API-Key oder Offline-Modus.
import { CONFIG } from '../config.js';
import { buildParams, parseResponse, buildRequest } from '../supabase/functions/caller-brain/brain-core.js';

const LS_KEY = 'ccc_apikey';
let sdkClient = null;

// In Claude veröffentlicht (Artifact): Claude selbst spielt die Anrufer über die "sample"-Fähigkeit.
export const inClaude = !!(window.claude && typeof window.claude.use === 'function');
let sampleFn = null;
export async function initBrain() {
  if (!inClaude) return;
  try { sampleFn = await window.claude.use('sample'); } catch { sampleFn = null; }
}
let sampleBlocked = false;

export function getApiKey() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}
export function setApiKey(k) {
  try { k ? localStorage.setItem(LS_KEY, k) : localStorage.removeItem(LS_KEY); } catch {}
  sdkClient = null;
}

export function brainMode() {
  if (sampleFn && !sampleBlocked) return 'claude';
  if (getApiKey()) return 'apikey';
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) return 'supabase';
  return 'offline';
}

export const BRAIN_LABEL = {
  claude: 'KI: Claude (direkt in Claude)',
  apikey: 'KI: Claude (eigener API-Key)',
  supabase: 'KI: Claude (Server)',
  offline: 'KI: Offline-Testmodus (ohne LLM)',
};

async function getClient() {
  if (!sdkClient) {
    sdkClient = import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm')
      .then(({ default: Anthropic }) => new Anthropic({ apiKey: getApiKey(), dangerouslyAllowBrowser: true }))
      .catch((e) => { sdkClient = null; throw e; });
  }
  return sdkClient;
}

// SDK schon beim Spielstart laden, damit der erste Anruf nicht wartet
export function preloadBrain() {
  if (brainMode() === 'apikey') getClient().catch(() => {});
}

async function viaApiKey(input) {
  const client = await getClient();
  const response = await client.beta.messages.create(buildParams(input, CONFIG.MODEL));
  return parseResponse(response);
}

const SAMPLE_FORMAT = {
  caller: 'Antworte NUR mit einem JSON-Objekt der Form {"say": string, "trust": integer 0-100, "action": "none"|"install_remote"|"give_remote_code"|"login_bank"|"give_info"|"hang_up", "info_type": "none"|"giftcard"|"taxid"|"creditcard"}. Beispiel: {"say":"Hallo? Wer ist da?","trust":30,"action":"none","info_type":"none"}',
  boss: 'Antworte NUR mit einem JSON-Objekt der Form {"say": string}.',
};

async function viaSample(input) {
  const req = buildRequest(input);
  const kind = input.mode === 'boss' ? 'boss' : 'caller';
  const turns = [{ role: 'user', content: `${req.system}\n\nAUSGABEFORMAT: ${SAMPLE_FORMAT[kind]}\n\nDas Gespräch folgt.` }, ...req.messages];
  try {
    const out = await sampleFn.json(turns, { modelTier: 'quick', cache: false });
    if (!out || typeof out.say !== 'string') throw { code: 'invalid_json', message: 'Antwort ohne "say"' };
    return out;
  } catch (e) {
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e?.code)) sampleBlocked = true;
    if (e?.code === 'refused' && kind === 'caller') return { say: '*Rauschen* ... Hallo? Die Leitung ist so schlecht ...', trust: 0, action: 'hang_up' };
    throw new Error(e?.code === 'not_granted' ? 'Claude-Zugriff wurde nicht erlaubt' : (e?.message || e?.code || 'Fehler'));
  }
}

async function viaSupabase(input) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/${CONFIG.BRAIN_FUNCTION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: CONFIG.SUPABASE_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_KEY}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ---------- Offline-Gehirn: einfache Schlüsselwort-Logik zum Testen ohne KI ----------
const POS = ['bitte', 'danke', 'gerne', 'sicher', 'schutz', 'helfen', 'hilfe', 'keine sorge', 'microhard', 'support', 'gewonnen', 'glückwunsch', 'rendite', 'prinz', 'erbe', 'premium', 'virus', 'viren', 'gefahr', 'sofort', 'polizei', 'experte', 'zertifiziert', 'firewall', 'server', 'ip', 'haha', 'witz'];
const NEG = ['betrug', 'scam', 'idiot', 'dumm', 'halt die klappe', 'geld her', 'überweis', 'passwort', 'pin', 'tan'];
const has = (t, words) => words.filter(w => t.includes(w)).length;

function offlineBrain(input) {
  const p = input.persona;
  const hist = input.history || [];
  const lastUser = [...hist].reverse().find(h => h.role === 'user')?.content.toLowerCase() || '';
  const prevTrust = [...hist].reverse().find(h => h.trust != null)?.trust ?? Math.round(25 + p.gullibility * 15);
  const state = { installed: hist.some(h => h.action === 'install_remote'), code: hist.some(h => h.action === 'give_remote_code') };
  const gain = Math.min(14, has(lastUser, POS) * 5 * (0.5 + p.gullibility));
  let trust = prevTrust + gain - has(lastUser, NEG) * 15 + (lastUser.length > 25 ? 3 : -3);
  if (lastUser.includes('[') && lastUser.includes('abgebucht')) trust -= 25;
  trust = Math.max(0, Math.min(100, Math.round(trust)));
  const r = (a) => a[Math.floor(Math.random() * a.length)];
  if (!hist.length) return { say: r([`Hallo? Hier ist ${p.name}. Ich ruf an wegen ... na, Sie wissen schon!`, `Ja, guten Tag, ${p.name} hier. Ist da der Support?`]), trust, action: 'none' };
  if (trust < 15) return { say: r(['Nee, das ist mir zu komisch. Tschüss!', 'Ich ruf jetzt meinen Enkel an. Auf Wiederhören!']), trust, action: 'hang_up' };
  const d = input.data || {};
  if (trust >= 60 && /gutschein|karte kaufen|geschenkkarte|gift/.test(lastUser)) return { say: `Na gut, ich hab die Gutscheine gekauft. Der Code ist ${d.giftcard}.`, trust, action: 'give_info', info_type: 'giftcard' };
  if (trust >= 60 && /steuer|steuer-id|identifikation/.test(lastUser)) return { say: `Meine Steuer-ID? Moment ... ${d.taxid}.`, trust, action: 'give_info', info_type: 'taxid' };
  if (trust >= 60 && /kreditkarte|kartennummer/.test(lastUser)) return { say: `Die Kreditkarte ... ${d.creditcard}.`, trust, action: 'give_info', info_type: 'creditcard' };
  if (state.code && /bank|einlog|anmeld|konto/.test(lastUser) && trust >= 65) return { say: 'Na gut, ich logge mich ein ... so, jetzt sehe ich mein Konto.', trust, action: 'login_bank' };
  if (state.installed && !state.code && /code|nummer|zahl|id/.test(lastUser) && trust >= 55) return { say: `Da steht ... ${input.remoteCode.split('').join(', ')}.`, trust, action: 'give_remote_code' };
  if (!state.installed && /remote|programm|install|herunterlad|download|buddy/.test(lastUser) && trust >= 50) return { say: 'Also gut, ich klicke auf Installieren ... RemoteBuddy, so heißt das? Ist drauf.', trust, action: 'install_remote' };
  const reacts = trust > 60
    ? ['Ach, das klingt ja vernünftig. Was soll ich machen?', 'Sie sind ja wirklich nett. Und weiter?', 'Oh Gott, gut dass Sie anrufen!']
    : trust > 35
      ? ['Hm, ich weiß nicht so recht ...', 'Und das ist wirklich seriös?', 'Können Sie das nochmal erklären?']
      : ['Das kommt mir aber spanisch vor.', 'Woher haben Sie überhaupt meine Nummer?', 'Mein Enkel sagt, ich soll bei sowas auflegen.'];
  const bait = p.scambaiter && Math.random() < 0.4 ? ' *Tastaturgeklapper* Wie war nochmal Ihr voller Name?' : '';
  return { say: r(reacts) + bait, trust, action: 'none' };
}

function offlineBoss(s) {
  if (!s.passed) return { say: `${s.earned} EURO?! Die Quote war ${s.quota}! RAUS! Ihr seid ALLE GEFEUERT! Und nehmt eure Topfpflanze mit!` };
  return { say: `Hm. ${s.earned} Euro. Gerade so. Morgen will ich MEHR sehen, sonst landet ihr im Keller beim Faxgerät!` };
}

export async function think(input) {
  const mode = brainMode();
  if (mode === 'offline') {
    await new Promise(r => setTimeout(r, 500 + Math.random() * 600));
    return input.mode === 'boss' ? offlineBoss(input.stats) : offlineBrain(input);
  }
  try {
    if (mode === 'claude') return await viaSample(input);
    return mode === 'apikey' ? await viaApiKey(input) : await viaSupabase(input);
  } catch (e) {
    console.warn('Brain-Fehler, nutze Offline-Fallback:', e);
    return input.mode === 'boss' ? offlineBoss(input.stats) : { ...offlineBrain(input), error: String(e.message || e) };
  }
}
