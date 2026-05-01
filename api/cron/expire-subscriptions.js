// /api/cron/expire-subscriptions.js
// Llamado diariamente por Vercel Crons (vercel.json > crons)
// Ejecuta la función PostgreSQL expire_subscriptions()
import { sql } from '../../src/lib/db.js';

export default async function handler(req) {
  // Vercel Crons envía Authorization: Bearer <CRON_SECRET> en producción
  const auth = req.headers['authorization'] || '';
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
