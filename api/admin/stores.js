// /api/admin/stores.js
import { neon } from '@neondatabase/serverless';
import { verificarAdmin } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  try { verificarAdmin(req); } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }
  switch (req.method) {
    case 'GET':   return listarTiendas(req);
    case 'PATCH': return toggleTienda(req);
    default:      return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }
}

async function listarTiendas(req) {
  const url    = new URL(req.url);
  const search = url.searchParams.get('q') || '';
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
  return Response.json({ stores });
}

async function toggleTienda(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }
  const { id, is_active } = body;
  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });
  const [store] = await sql`UPDATE stores SET is_active = ${Boolean(is_active)} WHERE id = ${id} RETURNING id, store_name, is_active`;
  return Response.json({ store });
}