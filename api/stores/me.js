// /api/stores/me.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

function verificarClerk(req) {
  const auth  = req.headers?.get?.('authorization') || req.headers?.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) throw new Error('No autorizado: token ausente');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('No autorizado: token malformado');
  let payload;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  } catch {
    throw new Error('No autorizado: payload inválido');
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error('No autorizado: token expirado');
  if (!payload.sub) throw new Error('No autorizado: sub ausente');
  return { userId: payload.sub };
}

export default async function handler(req) {
  console.log('🔵 stores/me iniciado');
  console.log('🔵 DATABASE_URL existe:', !!process.env.DATABASE_URL);

  if (req.method !== 'GET') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  let userId;
  try {
    ({ userId } = verificarClerk(req));
    console.log('🟢 userId:', userId);
  } catch (err) {
    console.log('🔴 Clerk error:', err.message);
    return Response.json({ error: err.message }, { status: 401 });
  }

  try {
    console.log('🔵 Ejecutando query...');
    const rows = await sql`
      SELECT s.*, sub.status AS sub_status, sub.expires_at AS sub_expires_at
      FROM stores s
      LEFT JOIN subscriptions sub
             ON sub.store_id = s.id
            AND sub.status IN ('trial', 'active')
            AND sub.expires_at > NOW()
      WHERE s.clerk_id = ${userId}
      LIMIT 1
    `;
    console.log('🟢 Query ejecutada, filas:', rows.length);
    if (!rows.length) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
    return Response.json({ store: rows[0] });
  } catch (err) {
    console.log('🔴 DB error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}