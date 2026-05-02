// /api/payments.js
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from './_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const storeRows = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (!storeRows.length) return res.status(404).json({ error: 'Tienda no encontrada' });
  const storeId = storeRows[0].id;

  const { method, reference, receipt_url, amount_bs } = req.body;
  const METODOS = ['tigo_money', 'bank_transfer'];
  if (!METODOS.includes(method))    return res.status(400).json({ error: 'Método inválido' });
  if (!reference?.trim())           return res.status(400).json({ error: 'Referencia requerida' });
  if (!amount_bs || amount_bs <= 0) return res.status(400).json({ error: 'Monto inválido' });

  const dup = await sql`SELECT id FROM payments WHERE store_id = ${storeId} AND reference = ${reference.trim()} AND status = 'pending' LIMIT 1`;
  if (dup.length) return res.status(409).json({ error: 'Ya existe un pago pendiente con esa referencia' });

  const [payment] = await sql`
    INSERT INTO payments (store_id, amount_bs, method, reference, receipt_url, status)
    VALUES (${storeId}, ${amount_bs}, ${method}, ${reference.trim()}, ${receipt_url || null}, 'pending')
    RETURNING *
  `;
  return res.status(201).json({ payment });
}
