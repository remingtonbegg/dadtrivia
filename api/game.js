import { Redis } from '@upstash/redis';

// Works with either the Vercel KV integration (KV_REST_API_*) or the
// Upstash Marketplace integration (UPSTASH_REDIS_REST_*).
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const TTL = 4 * 60 * 60; // games auto-expire after 4 hours
const PIN_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const keys = (pin) => ({
  meta: `game:${pin}:meta`,
  players: `game:${pin}:players`,
  scores: `game:${pin}:scores`,
  answers: `game:${pin}:answers`,
});

function genPin() {
  let s = '';
  for (let i = 0; i < 6; i++) s += PIN_CHARS[Math.floor(Math.random() * PIN_CHARS.length)];
  return s;
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function snapshot(pin) {
  const k = keys(pin);
  const [meta, players, scores, answersRaw] = await Promise.all([
    redis.get(k.meta),
    redis.hgetall(k.players),
    redis.hgetall(k.scores),
    redis.hgetall(k.answers),
  ]);
  if (!meta) return null;
  const playersOut = {};
  for (const id of Object.keys(players || {})) {
    playersOut[id] = { name: players[id], pts: Number((scores || {})[id] || 0) };
  }
  const answers = {};
  for (const field of Object.keys(answersRaw || {})) {
    const sep = field.indexOf(':');
    const qIdx = field.slice(0, sep);
    const id = field.slice(sep + 1);
    let val = answersRaw[field];
    if (typeof val === 'string') { try { val = JSON.parse(val); } catch (e) { /* keep string */ } }
    (answers[qIdx] || (answers[qIdx] = {}))[id] = val;
  }
  return { ...meta, players: playersOut, answers };
}

export default async function handler(req, res) {
  try {
    if (!redis.url && !process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
      return res.status(500).json({ error: 'Database not configured. Connect a Vercel KV / Upstash Redis store to this project.' });
    }

    if (req.method === 'GET') {
      const pin = String(req.query.pin || '').toUpperCase();
      if (!pin) return res.status(400).json({ error: 'pin required' });
      const snap = await snapshot(pin);
      if (!snap) return res.status(404).json({ error: 'Game not found' });
      return res.status(200).json(snap);
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const action = body.action;
    const pin = String(body.pin || '').toUpperCase();

    if (action === 'create') {
      let newPin;
      for (let tries = 0; tries < 6; tries++) {
        newPin = genPin();
        if (!(await redis.exists(`game:${newPin}:meta`))) break;
      }
      const meta = {
        state: 'lobby', currentQ: -1, answerRevealed: false, correctAnswer: null,
        answer: null, hintRevealed: false,
        questions: body.questions || [], settings: body.settings || {},
        createdAt: Date.now(),
      };
      await redis.set(keys(newPin).meta, meta, { ex: TTL });
      return res.status(200).json({ pin: newPin });
    }

    if (!pin) return res.status(400).json({ error: 'pin required' });
    const k = keys(pin);

    if (action === 'join') {
      const meta = await redis.get(k.meta);
      if (!meta) return res.status(404).json({ error: 'Game not found. Check the PIN.' });
      if (meta.state === 'gameover') return res.status(409).json({ error: 'This game has already ended.' });
      const id = genId();
      await redis.hset(k.players, { [id]: body.name || 'Player' });
      await redis.hset(k.scores, { [id]: 0 });
      await Promise.all([redis.expire(k.players, TTL), redis.expire(k.scores, TTL)]);
      return res.status(200).json({ playerId: id });
    }

    if (action === 'update') {
      const meta = await redis.get(k.meta);
      if (!meta) return res.status(404).json({ error: 'Game not found' });
      Object.assign(meta, body.patch || {});
      await redis.set(k.meta, meta, { ex: TTL });
      return res.status(200).json({ ok: true });
    }

    if (action === 'answer') {
      if (!body.playerId) return res.status(400).json({ error: 'playerId required' });
      const field = `${body.qIdx}:${body.playerId}`;
      const value = { name: body.name, ts: Date.now() };
      if (body.choice != null) value.choice = body.choice;
      if (body.guess != null) value.guess = body.guess;
      await redis.hset(k.answers, { [field]: JSON.stringify(value) });
      await redis.expire(k.answers, TTL);
      return res.status(200).json({ ok: true });
    }

    if (action === 'score') {
      const updates = body.updates || {};
      for (const id of Object.keys(updates)) {
        const delta = Number(updates[id]) || 0;
        const v = await redis.hincrby(k.scores, id, delta);
        if (v < 0) await redis.hset(k.scores, { [id]: 0 });
      }
      await redis.expire(k.scores, TTL);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    return res.status(500).json({ error: e && e.message ? e.message : 'server error' });
  }
}
