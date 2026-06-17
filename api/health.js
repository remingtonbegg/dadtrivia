import { Redis } from '@upstash/redis';

// Same env handling as api/game.js — accepts Vercel KV or Upstash names.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export default async function handler(req, res) {
  if (!url || !token) {
    return res.status(500).json({
      ok: false,
      error: 'No KV / Upstash env vars found. Connect a store to this project and redeploy.',
    });
  }
  try {
    const redis = new Redis({ url, token });
    const key = 'health:ping';
    const stamp = Date.now();
    await redis.set(key, stamp, { ex: 60 });
    const got = await redis.get(key);
    return res.status(200).json({ ok: true, store: 'connected', roundtrip: Number(got) === stamp });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e && e.message ? e.message : 'connection failed' });
  }
}
