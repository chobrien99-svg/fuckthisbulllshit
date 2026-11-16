import { redis, storeConfigured, KEYS, RECENT_LIMIT } from '../lib/store.js';

// GET /api/signatures -> { count, recent: [{ name, role }] }
export default async function handler(req, res) {
  if (!storeConfigured) {
    return res.status(503).json({ error: 'Signature storage is not set up yet.' });
  }
  try {
    const [count, recent] = await redis([
      ['SCARD', KEYS.emails],
      ['LRANGE', KEYS.recent, 0, RECENT_LIMIT - 1],
    ]);
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({
      count: Number(count) || 0,
      recent: (recent || []).map((s) => {
        const { name, role } = JSON.parse(s);
        return { name, role };
      }),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load signatures.' });
  }
}
