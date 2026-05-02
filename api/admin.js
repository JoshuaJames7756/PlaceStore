// /api/admin.js
// GET  ?section=payments&status=pending  → listar pagos
// GET  ?section=stores&q=               → listar tiendas
// PATCH ?section=payments               → verificar/rechazar pago
// PATCH ?section=stores                 → toggle tienda

import { neon } from '@neondatabase/serverless';
import { verificarAdmin } from './_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);
const PLAN_DURACION_DIAS = 30;

export default async function handler(req, res) {
  try { verificarAdmin(req); } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const { section } = req.query;

  // ─── Pagos ───────────────────────────────────────────────
  if (section === 'payments') {
    if (req.method === 'GET') {
      const status = req.query.status || 'pending';
      const payments = await sql`
        SELECT p.*, s.store_name, s.slug, s.location_city, s.is_active
        FROM payments p JOIN stores s ON s.id = p.store_id
        WHERE p.status = ${status} ORDER BY p.created_at DESC LIMIT 100
      `;
      return res.status(200).json({ payments });
    }

    if (req.method === 'PATCH') {
      const { id, action } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      if (!['verify', 'reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });

      const payRows = await sql`SELECT * FROM payments WHERE id = ${id} LIMIT 1`;
      if (!payRows.length) return res.status(404).json({ error: 'Pago no encontrado' });
      if (payRows[0].status !== 'pending') return res.status(409).json({ error: 'Este pago ya fue procesado' });

      if (action === 'reject') {
        const [updated] = await sql`UPDATE payments SET status = 'rejected', verified_at = NOW() WHERE id = ${id} RETURNING *`;
        return res.status(200).json({ payment: updated });
      }

      const newExpiry = new Date(Date.now() + PLAN_DURACION_DIAS * 24 * 60 * 60 * 1000);
      await sql`UPDATE subscriptions SET status = 'expired' WHERE store_id = ${payRows[0].store_id} AND status IN ('trial', 'active')`;
      await sql`INSERT INTO subscriptions (store_id, status, plan, expires_at) VALUES (${payRows[0].store_id}, 'active', 'basic', ${newExpiry.toISOString()})`;
      await sql`UPDATE stores SET is_active = true WHERE id = ${payRows[0].store_id}`;
      const [updated] = await sql`UPDATE payments SET status = 'verified', verified_at = NOW() WHERE id = ${id} RETURNING *`;
      return res.status(200).json({ payment: updated });
    }
  }

  // ─── Tiendas ─────────────────────────────────────────────
  if (section === 'stores') {
    if (req.method === 'GET') {
      const search = req.query.q || '';
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

    if (req.method === 'PATCH') {
      const { id, is_active } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const [store] = await sql`UPDATE stores SET is_active = ${Boolean(is_active)} WHERE id = ${id} RETURNING id, store_name, is_active`;
      return res.status(200).json({ store });
    }
  }

  return res.status(400).json({ error: 'Parámetro section requerido: payments o stores' });
}
