// /api/admin/payments.js
import { neon } from '@neondatabase/serverless';
import { verificarAdmin } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);
const PLAN_DURACION_DIAS = 30;

export default async function handler(req, res) {
  try { verificarAdmin(req); } catch (err) {
    return res.status(401).json({ error: err.message });
  }
  switch (req.method) {
    case 'GET':   return listarPagos(req, res);
    case 'PATCH': return actualizarPago(req, res);
    default:      return res.status(405).json({ error: 'Método no permitido' });
  }
}

async function listarPagos(req, res) {
  const status = req.query?.status || 'pending';
  const payments = await sql`
    SELECT p.*, s.store_name, s.slug, s.location_city, s.is_active
    FROM payments p JOIN stores s ON s.id = p.store_id
    WHERE p.status = ${status} ORDER BY p.created_at DESC LIMIT 100
  `;
  return res.status(200).json({ payments });
}

async function actualizarPago(req, res) {
  const { id, action } = req.body;
  if (!id) return res.status(400).json({ error: 'ID requerido' });
  if (!['verify', 'reject'].includes(action)) return res.status(400).json({ error: 'Acción inválida' });

  const payRows = await sql`SELECT * FROM payments WHERE id = ${id} LIMIT 1`;
  if (!payRows.length) return res.status(404).json({ error: 'Pago no encontrado' });
  const payment = payRows[0];
  if (payment.status !== 'pending') return res.status(409).json({ error: 'Este pago ya fue procesado' });

  if (action === 'reject') {
    const [updated] = await sql`UPDATE payments SET status = 'rejected', verified_at = NOW() WHERE id = ${id} RETURNING *`;
    return res.status(200).json({ payment: updated });
  }

  const newExpiry = new Date(Date.now() + PLAN_DURACION_DIAS * 24 * 60 * 60 * 1000);
  await sql`UPDATE subscriptions SET status = 'expired' WHERE store_id = ${payment.store_id} AND status IN ('trial', 'active')`;
  await sql`INSERT INTO subscriptions (store_id, status, plan, expires_at) VALUES (${payment.store_id}, 'active', 'basic', ${newExpiry.toISOString()})`;
  await sql`UPDATE stores SET is_active = true WHERE id = ${payment.store_id}`;
  const [updated] = await sql`UPDATE payments SET status = 'verified', verified_at = NOW() WHERE id = ${id} RETURNING *`;
  return res.status(200).json({ payment: updated });
}
