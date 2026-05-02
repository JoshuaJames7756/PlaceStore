// /api/admin/stores.js
import { neon } from '@neondatabase/serverless';
import { verificarAdmin } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  try { verificarAdmin(req); } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  switch (req.method) {
    case 'GET':   return listarTiendas(req, res);
    case 'PATCH': return toggleTienda(req, res);
    default:      return res.status(405).json({ error: 'Método no permitido' });
  }
}

async function listarTiendas(req, res) {
  const search = req.query?.q || '';
  const stores = await sql`
    SELECT s.id, s.slug, s.store_name, s.location_city, s.whatsapp_number, s.is_active, s.created_at,
      sub.status AS sub_status, sub.expires_at AS sub_expires_at, COUNT(p.id) AS product_count
    FROM stores s
    LEFT JOIN subscriptions sub ON sub.store_id = s.id AND sub.status IN ('trial', 'active') AND sub.expires_at > NOW()
    LEFT JOIN products p ON p.store_id = s.id
    WHERE (${search} = '' OR s.store_name ILIKE ${'%' + search + '%'} OR s.location_city ILIKE ${'%' + search + '%'} OR s.slug ILIKE ${'%' + search + '%'})
    GROUP BY s.id, sub.status, sub.expires_at
    ORDER BY s.created_at DESC LIMIT 200
  `;
  return res.status(200).json({ stores });
}

async function toggleTienda(req, res) {
  const { id, is_active } = req.body;
  if (!id) return res.status(400).json({ error: 'ID requerido' });
  const [store] = await sql`UPDATE stores SET is_active = ${Boolean(is_active)} WHERE id = ${id} RETURNING id, store_name, is_active`;
  return res.status(200).json({ store });
}
