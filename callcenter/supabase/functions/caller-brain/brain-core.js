// Gemeinsame Prompt-Logik für das "Gehirn" der KI-Anrufer und des Chefs.
// Wird sowohl von der Supabase Edge Function als auch vom Browser (eigener API-Key) genutzt.

export const CALLER_SCHEMA = {
  type: 'object',
  properties: {
    say: { type: 'string', description: 'Was der Anrufer laut sagt (1-3 kurze, gesprochene Sätze, Deutsch).' },
    trust: { type: 'integer', description: 'Vertrauen in den Callcenter-Mitarbeiter, 0-100.' },
    action: {
      type: 'string',
      enum: ['none', 'install_remote', 'give_remote_code', 'login_bank', 'hang_up'],
      description: 'Spielaktion dieses Zugs.',
    },
  },
  required: ['say', 'trust', 'action'],
  additionalProperties: false,
};

export const BOSS_SCHEMA = {
  type: 'object',
  properties: {
    say: { type: 'string', description: 'Die Ansprache des Chefs (2-4 Sätze, Deutsch).' },
  },
  required: ['say'],
  additionalProperties: false,
};

const clampText = (s, n) => String(s ?? '').slice(0, n);

function callerSystem(p, scam, remoteCode) {
  return `Du bist ein Charakter in "Callcenter Chaos", einem überdrehten Comedy-Videospiel (wie "Scam With Your Friends"). Spieler spielen Mitarbeiter eines absurden Betrugs-Callcenters und versuchen, dich mit lächerlichen Maschen hereinzulegen. Alles ist Fiktion und Satire; du bist ein fiktiver KI-Anrufer. Dein Job ist, eine lustige, glaubwürdige Figur zu spielen, auf die die Spieler improvisiert reagieren müssen.

DEINE FIGUR
Name: ${p.name}, ${p.age} Jahre, aus ${p.city}
Persönlichkeit: ${p.personality}
Leichtgläubigkeit: ${Math.round(p.gullibility * 100)}% · Technikverständnis: ${Math.round(p.techSkill * 100)}%
Kontostand: ${p.money} € bei der ${p.bank}
${p.scambaiter ? 'GEHEIM: Du bist ein SCAMBAITER. Spiele mit, lass dich scheinbar leicht überzeugen und lass gelegentlich kleine Hinweise auf deine wahre Identität durchblicken (siehe Persönlichkeit). Verrate es nie direkt, außer der Mitarbeiter durchschaut dich eindeutig - dann lachst du ihn aus und legst auf.' : ''}

WARUM DU ANRUFST
${scam.lure}

REGELN
- Du hast angerufen. Antworte immer nur als deine Figur, auf Deutsch, in 1-3 kurzen Sätzen gesprochener Sprache (das wird per Sprachausgabe vorgelesen, also keine Emojis, kein Markdown, keine Regieanweisungen außer ganz kurzen wie *hustet*).
- "trust" (0-100) ist dein aktuelles Vertrauen. Passe es pro Zug realistisch zu deiner Persönlichkeit an: Was zu deiner Figur passt, erhöht es; Widersprüche, Unhöflichkeit, Hetze (wenn du die nicht magst) oder offensichtlicher Unsinn senken es.
- action "install_remote": nur wenn trust >= 50 und der Mitarbeiter dich bittet, ein Fernwartungsprogramm (RemoteBuddy) zu installieren. Du installierst es dann.
- action "give_remote_code": wenn RemoteBuddy installiert ist, trust >= 55 und nach dem Code gefragt wird. Dann sagst du den Code ${remoteCode.split('').join('-')} laut (Ziffer für Ziffer).
- action "login_bank": wenn der Mitarbeiter schon Fernzugriff hat, trust >= 65 und er dich bittet, dich ins Online-Banking einzuloggen.
- action "hang_up": wenn trust unter 15 fällt, du beleidigt wirst, oder du merkst, dass es Betrug ist. Verabschiede dich dabei passend zur Figur.
- Nachrichten in [ECKIGEN KLAMMERN] sind Spielereignisse (z.B. was du auf deinem Bildschirm siehst). Reagiere darauf als deine Figur. Wenn du siehst, dass Geld von deinem Konto abgebucht wird, das du nicht erlaubt hast, wirst du sehr misstrauisch.
- Sonst action "none".`;
}

function bossSystem() {
  return `Du bist Herr Brenner, der cholerische, völlig überdrehte Chef des fiktiven Callcenters in dem Comedy-Videospiel "Callcenter Chaos". Am Ende jedes Arbeitstags hältst du eine Leistungsbeurteilung. Du schreist gerne (Großbuchstaben erlaubt), bist absurd, unfair und lustig, aber nie wirklich verletzend. Antworte auf Deutsch, 2-4 Sätze, ohne Emojis oder Markdown, weil es vorgelesen wird.`;
}

// Baut die Anfrage für die Messages API. input = { mode, persona, scam, remoteCode, history, stats }
export function buildRequest(input) {
  if (input.mode === 'boss') {
    const s = input.stats || {};
    return {
      system: bossSystem(),
      schema: BOSS_SCHEMA,
      messages: [{
        role: 'user',
        content: `Tag ${Number(s.day) || 1}. Quote: ${Number(s.quota) || 0} €. Eingenommen: ${Number(s.earned) || 0} €. ${s.passed ? 'Quote GESCHAFFT.' : 'Quote VERFEHLT - das Team ist GEFEUERT.'} Ereignisse heute: ${clampText(s.events, 400) || 'keine besonderen'}. Halte deine Ansprache.`,
      }],
    };
  }
  const history = Array.isArray(input.history) ? input.history.slice(-40) : [];
  const messages = [];
  for (const h of history) {
    const role = h.role === 'assistant' ? 'assistant' : 'user';
    const content = clampText(h.content, 1200);
    if (!content) continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += '\n' + content;
    else messages.push({ role, content });
  }
  if (!messages.length || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: '[Der Anruf wird angenommen. Der Mitarbeiter hat noch nichts gesagt. Beginne das Gespräch.]' });
  }
  if (messages[messages.length - 1].role !== 'user') {
    messages.push({ role: 'user', content: '[Der Mitarbeiter schweigt einen Moment.]' });
  }
  return {
    system: callerSystem(input.persona, input.scam, String(input.remoteCode || '000000')),
    schema: CALLER_SCHEMA,
    messages,
  };
}

// Erzeugt die Parameter für client.beta.messages.create
export function buildParams(input, model) {
  const req = buildRequest(input);
  return {
    model,
    max_tokens: 2000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: req.schema },
    },
    system: req.system + '\nLatenzkritisch (Live-Telefonat): beginne deine Antwort sofort.',
    messages: req.messages,
  };
}

// Liest die JSON-Antwort aus der API-Response
export function parseResponse(response) {
  if (response.stop_reason === 'refusal') {
    return { say: '*Rauschen* ... Hallo? Die Verbindung ist so schlecht ...', trust: 0, action: 'hang_up', refused: true };
  }
  const text = (response.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    return { say: text || '...', trust: 30, action: 'none' };
  }
}
