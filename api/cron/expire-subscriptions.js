// /api/cron/expire-subscriptions.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  const auth = req.headers?.get?.('authorization') || req.headers?.authorization || '';
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    await sql`SELECT expire_subscriptions()`;
    console.log('[cron] expire_subscriptions ejecutado:', new Date().toISOString());
    return Response.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('[cron] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}