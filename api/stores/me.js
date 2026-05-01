// /api/stores/me.js
// GET — Retorna la tienda del vendedor autenticado + estado de suscripción
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../../src/lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }

  const rows = await sql`
    SELECT
      s.*,
      sub.status      AS sub_status,
      sub.expires_at  AS sub_expires_at
    FROM   stores        s
    LEFT JOIN subscriptions sub
           ON sub.store_id = s.id
          AND sub.status  IN ('trial', 'active')
          AND sub.expires_at > NOW()
    WHERE  s.clerk_id = ${userId}
    LIMIT  1
  `;

  if (!rows.length) {
    return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
  }

  return Response.json({ store: rows[0] });
}
