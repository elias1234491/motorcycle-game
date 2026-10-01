// Online-Koop über Supabase Realtime (Presence + Broadcast). Ohne Konfiguration: Solo.
import { CONFIG } from '../config.js';

export const netAvailable = () => !!(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY);

export class Net {
  constructor() {
    this.id = Math.random().toString(36).slice(2, 10);
    this.joinedAt = Date.now();
    this.channel = null;
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

  async join(room, me) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
    const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    this.me = me;
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
      for (const id of this.peers.keys()) if (!next.has(id)) this.emit('leave', id);
      for (const [id, p] of next) if (!this.peers.has(id)) this.emit('join', { id, ...p });
      this.peers = next;
      this.emit('peers', this.peers);
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
    if (this.peers.size + 1 > CONFIG.MAX_PLAYERS) {
      await this.leave();
      throw new Error('Raum ist voll (max. ' + CONFIG.MAX_PLAYERS + ' Spieler)');
    }
  }

  send(t, data = {}) {
    if (!this.online) return;
    this.channel.send({ type: 'broadcast', event: 'msg', payload: { t, from: this.id, ...data } });
  }

  async leave() {
    if (this.channel) await this.channel.unsubscribe();
    this.online = false;
  }
}
