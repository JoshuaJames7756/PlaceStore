// /api/payments.js
// POST — registrar pago pendiente de verificación
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../src/lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }

  const storeRows = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (!storeRows.length) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
  const storeId = storeRows[0].id;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { method, reference, receipt_url, amount_bs } = body;

  const METODOS = ['tigo_money', 'bank_transfer'];
  if (!METODOS.includes(method))   return Response.json({ error: 'Método inválido' }, { status: 400 });
  if (!reference?.trim())          return Response.json({ error: 'Referencia requerida' }, { status: 400 });
  if (!amount_bs || amount_bs <= 0) return Response.json({ error: 'Monto inválido' }, { status: 400 });

  // Evitar duplicado de referencia para esta tienda
  const dup = await sql`
    SELECT id FROM payments
    WHERE store_id = ${storeId} AND reference = ${reference.trim()} AND status = 'pending'
    LIMIT 1
  `;
  if (dup.length) {
    return Response.json({ error: 'Ya existe un pago pendiente con esa referencia' }, { status: 409 });
  }

  const [payment] = await sql`
    INSERT INTO payments (store_id, amount_bs, method, reference, receipt_url, status)
    VALUES (${storeId}, ${amount_bs}, ${method}, ${reference.trim()}, ${receipt_url || null}, 'pending')
    RETURNING *
  `;

  return Response.json({ payment }, { status: 201 });
}
