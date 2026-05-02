// /api/cron/expire-subscriptions.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const auth = req.headers?.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  try {
    await sql`SELECT expire_subscriptions()`;
    console.log('[cron] expire_subscriptions ejecutado:', new Date().toISOString());
    return res.status(200).json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('[cron] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
