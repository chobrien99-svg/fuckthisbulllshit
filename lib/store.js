// Tiny client for Upstash Redis (the "Redis" storage option in the Vercel
// Marketplace). Talks to its REST API with fetch, so no npm packages needed.
// Vercel sets these environment variables automatically when you connect
// the database to the project.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeConfigured = Boolean(URL_ && TOKEN);

// Run several Redis commands in one round trip. Returns an array of results.
export async function redis(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

export const KEYS = {
  emails: 'ftb:emails',     // set of hashed emails (dedupe + count)
  recent: 'ftb:recent',     // list of latest public signatures
  all: 'ftb:signatures',    // hash: email hash -> full record (for deletion requests)
  rate: (ip) => `ftb:rl:${ip}`,
};

export const RECENT_LIMIT = 60;
