// Online-Koop. Zwei Wege:
//  - in Claude (Artifact): die eingebaute "room"-Fähigkeit (alle, die die Seite offen haben)
//  - sonst: Supabase Realtime (Presence + Broadcast), wenn in config.js eingetragen
import { CONFIG } from '../config.js';

const inClaude = !!(window.claude && typeof window.claude.use === 'function');
let roomApi = null;

export async function initNet() {
  if (!inClaude) return;
  try { roomApi = await window.claude.use('room'); } catch { roomApi = null; }
}
export const netAvailable = () => !!roomApi || !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY);

export class Net {
  constructor() {
    this.id = Math.random().toString(36).slice(2, 10);
    this.joinedAt = Date.now();
    this.peers = new Map();      // id -> { name, color, joinedAt }
    this.handlers = {};
    this.online = false;
  }

  on(evt, fn) { (this.handlers[evt] ||= []).push(fn); }
  emit(evt, data) { (this.handlers[evt] || []).forEach(fn => fn(data)); }

  get isHost() {
    if (!this.online) return true;
    const all = [...this.peers.entries()].map(([id, p]) => ({ id, joinedAt: p.joinedAt }));
    all.push({ id: this.id, joinedAt: this.joinedAt });
    all.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id));
    return all[0].id === this.id;
  }

  // Gemeinsame Auswertung der Teilnehmerliste (Supabase-Presence oder Room-Peers)
  setPeers(next) {
    for (const id of this.peers.keys()) if (!next.has(id)) this.emit('leave', id);
    for (const [id, p] of next) if (!this.peers.has(id)) this.emit('join', { id, ...p });
    this.peers = next;
    this.emit('peers', this.peers);
  }

  async join(room, me) {
    this.me = me;
    if (roomApi) await this.joinClaudeRoom(room, me);
    else await this.joinSupabase(room, me);
    if (this.peers.size + 1 > CONFIG.MAX_PLAYERS) {
      await this.leave();
      throw new Error('Raum ist voll (max. ' + CONFIG.MAX_PLAYERS + ' Spieler)');
    }
  }

  // ---------- Claude Room ----------
  async joinClaudeRoom(room, me) {
    const r = await roomApi.join('ccc-' + room.toLowerCase());
    this.room = r;
    await r.presence({ name: me.name, color: me.color, joinedAt: this.joinedAt });
    const sync = (peers) => {
      const next = new Map();
      for (const p of peers) {
        if (p.sameTab) { this.id = p.peer; continue; }
        if (!p.presence?.name) continue;
        next.set(p.peer, { name: String(p.presence.name).slice(0, 16), color: Number(p.presence.color) || 0x888888, joinedAt: Number(p.presence.joinedAt) || 0 });
        if (typeof p.presence.x === 'number') this.emit('pos', { from: p.peer, x: p.presence.x, z: p.presence.z, ry: p.presence.ry });
      }
      this.setPeers(next);
    };
    r.onPeers((change) => sync(change.peers));
    r.on('msg', (m) => {
      if (m.sameTab || !m.data?.t) return;
      this.emit(m.data.t, { ...m.data, from: m.peer });
    });
    this.online = true;
    // kurz warten, bis die anderen sich gemeldet haben (Host-Wahl)
    await new Promise(res => setTimeout(res, 1500));
    sync(r.peers());
  }

  // ---------- Supabase ----------
  async joinSupabase(room, me) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
    const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    this.channel = sb.channel(`ccc-room-${room}`, {
      config: { presence: { key: this.id }, broadcast: { self: false } },
    });
    this.channel.on('presence', { event: 'sync' }, () => {
      const st = this.channel.presenceState();
      const next = new Map();
      for (const [id, metas] of Object.entries(st)) {
        if (id === this.id || !metas[0]) continue;
        next.set(id, metas[0]);
      }
      this.setPeers(next);
    });
    this.channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (payload && payload.t) this.emit(payload.t, payload);
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Zeitüberschreitung beim Verbinden')), 10000);
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timer);
          await this.channel.track({ name: me.name, color: me.color, joinedAt: this.joinedAt });
          this.online = true;
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timer);
          reject(new Error('Realtime: ' + status));
        }
      });
    });
  }

  send(t, data = {}) {
    if (!this.online) return;
    if (this.room) {
      // Positionen laufen über Presence (hohe Rate), alles andere als Nachricht
      if (t === 'pos') this.room.presence({ x: data.x, z: data.z, ry: data.ry }).catch(() => {});
      else this.room.emit('msg', { t, ...data }).catch(() => {});
      return;
    }
    this.channel.send({ type: 'broadcast', event: 'msg', payload: { t, from: this.id, ...data } });
  }

  async leave() {
    if (this.room) await this.room.leave();
    if (this.channel) await this.channel.unsubscribe();
    this.online = false;
  }
}
