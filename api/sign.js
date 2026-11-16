import { createHash } from 'node:crypto';
import { redis, storeConfigured, KEYS, RECENT_LIMIT } from '../lib/store.js';

const ROLES = [
  'A person who read the resignation',
  'A shareholder who would like a CEO',
  'A recovering open-letter signer',
  'Just tired',
];
const MAX_PER_IP_PER_HOUR = 10;

function clean(s, max) {
  return String(s || '')
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// POST /api/sign  { name, email, role, website }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!storeConfigured) {
    return res.status(503).json({ error: 'Signing opens shortly. Storage is not set up yet.' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body || {};

  // Honeypot: bots fill every field. Pretend it worked.
  if (body.website) return res.status(200).json({ ok: true });

  const name = clean(body.name, 80);
  const email = clean(body.email, 200).toLowerCase();
  const role = ROLES.includes(body.role) ? body.role : ROLES[0];

  if (name.length < 2) return res.status(400).json({ error: 'We need a name. Your actual one.' });
  if (/https?:|www\.|\.(com|net|org|io|xyz)\b/i.test(name)) {
    return res.status(400).json({ error: 'Names only, no links.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "That email doesn't look right." });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const emailHash = createHash('sha256').update(email).digest('hex');

  try {
    const [hits] = await redis([
      ['INCR', KEYS.rate(ip)],
      ['EXPIRE', KEYS.rate(ip), 3600, 'NX'],
    ]);
    if (Number(hits) > MAX_PER_IP_PER_HOUR) {
      return res.status(429).json({ error: 'Too many signatures from here. Go outside, try later.' });
    }

    const [added] = await redis([['SADD', KEYS.emails, emailHash]]);
    if (Number(added) === 0) {
      const [count] = await redis([['SCARD', KEYS.emails]]);
      return res.status(409).json({ error: "You've already signed. Once is plenty.", count: Number(count) });
    }

    const at = new Date().toISOString();
    const [, , , count] = await redis([
      ['HSET', KEYS.all, emailHash, JSON.stringify({ name, email, role, at })],
      ['LPUSH', KEYS.recent, JSON.stringify({ name, role, at })],
      ['LTRIM', KEYS.recent, 0, RECENT_LIMIT - 1],
      ['SCARD', KEYS.emails],
    ]);
    return res.status(200).json({ ok: true, count: Number(count) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something broke. Try again in a minute.' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
