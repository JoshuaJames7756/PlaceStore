// /api/stores/me.js
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  try {
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
    if (!rows.length) return res.status(404).json({ error: 'Tienda no encontrada' });
    return res.status(200).json({ store: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
