// Echtzeit-Transport: Supabase Realtime (Broadcast) oder – ohne Konfiguration –
// BroadcastChannel im selben Browser (Demo-Modus).
//
// Zwei Kanäle pro Spiel:
//   vq-<code>-down : Spielleitung → alle Handys (Spielstand)
//   vq-<code>-up   : Handys → Spielleitung (Beitreten, Antworten, Ping)
// So bekommen die Handys nicht die Nachrichten der anderen Handys.

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const REALTIME_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);

let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 20 } }
      }));
  }
  return clientPromise;
}

/**
 * @param {string} code  Spielcode
 * @param {'host'|'player'} role
 * @param {(msg:object)=>void} onMessage
 * @param {(status:string)=>void} [onStatus]  'connected' | 'connecting' | 'error'
 */
export async function connect(code, role, onMessage, onStatus = () => {}) {
  const listenName = `vq-${code}-${role === 'host' ? 'up' : 'down'}`;
  const sendName = `vq-${code}-${role === 'host' ? 'down' : 'up'}`;

  if (!REALTIME_ENABLED) {
    const listen = new BroadcastChannel(listenName);
    const out = new BroadcastChannel(sendName);
    listen.onmessage = (e) => onMessage(e.data);
    setTimeout(() => onStatus('connected'), 0);
    return {
      send: (msg) => out.postMessage(msg),
      close: () => { listen.close(); out.close(); }
    };
  }

  onStatus('connecting');
  const client = await getClient();
  const opts = { config: { broadcast: { self: false, ack: false } } };

  const listen = client.channel(listenName, opts);
  listen.on('broadcast', { event: 'm' }, ({ payload }) => onMessage(payload));
  listen.subscribe((status) => {
    if (status === 'SUBSCRIBED') onStatus('connected');
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus('error');
    else if (status === 'CLOSED') onStatus('connecting');
  });

  // Die Spielleitung sendet viel → per WebSocket. Handys senden selten →
  // ohne Abo über die REST-Schnittstelle (spart Nachrichten an alle anderen).
  const out = client.channel(sendName, opts);
  let outSubscribed = false;
  const subscribeOut = () => {
    if (outSubscribed) return;
    outSubscribed = true;
    out.subscribe();
  };
  if (role === 'host') subscribeOut();

  return {
    async send(msg) {
      try {
        const res = await out.send({ type: 'broadcast', event: 'm', payload: msg });
        if (res !== 'ok' && !outSubscribed) subscribeOut();   // Fallback: WebSocket
      } catch (e) {
        subscribeOut();
      }
    },
    close() { client.removeChannel(listen); client.removeChannel(out); }
  };
}
