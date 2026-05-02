// /api/admin/payments.js
import { neon } from '@neondatabase/serverless';
import { verificarAdmin } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);
const PLAN_DURACION_DIAS = 30;

export default async function handler(req) {
  try { verificarAdmin(req); } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }
  switch (req.method) {
    case 'GET':   return listarPagos(req);
    case 'PATCH': return actualizarPago(req);
    default:      return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }
}

async function listarPagos(req) {
  const url    = new URL(req.url);
  const status = url.searchParams.get('status') || 'pending';
  const payments = await sql`
    SELECT p.*, s.store_name, s.slug, s.location_city, s.is_active
    FROM payments p JOIN stores s ON s.id = p.store_id
    WHERE p.status = ${status} ORDER BY p.created_at DESC LIMIT 100
  `;
  return Response.json({ payments });
}

async function actualizarPago(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }
  const { id, action } = body;
  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });
  if (!['verify', 'reject'].includes(action)) return Response.json({ error: 'Acción inválida' }, { status: 400 });

  const payRows = await sql`SELECT * FROM payments WHERE id = ${id} LIMIT 1`;
  if (!payRows.length) return Response.json({ error: 'Pago no encontrado' }, { status: 404 });
  const payment = payRows[0];
  if (payment.status !== 'pending') return Response.json({ error: 'Este pago ya fue procesado' }, { status: 409 });

  if (action === 'reject') {
    const [updated] = await sql`UPDATE payments SET status = 'rejected', verified_at = NOW() WHERE id = ${id} RETURNING *`;
    return Response.json({ payment: updated });
  }

  const newExpiry = new Date(Date.now() + PLAN_DURACION_DIAS * 24 * 60 * 60 * 1000);
  await sql`UPDATE subscriptions SET status = 'expired' WHERE store_id = ${payment.store_id} AND status IN ('trial', 'active')`;
  await sql`INSERT INTO subscriptions (store_id, status, plan, expires_at) VALUES (${payment.store_id}, 'active', 'basic', ${newExpiry.toISOString()})`;
  await sql`UPDATE stores SET is_active = true WHERE id = ${payment.store_id}`;
  const [updated] = await sql`UPDATE payments SET status = 'verified', verified_at = NOW() WHERE id = ${id} RETURNING *`;
  return Response.json({ payment: updated });
}