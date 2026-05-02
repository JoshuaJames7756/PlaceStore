// /api/categories.js
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from './_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const storeRows = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (!storeRows.length) return res.status(404).json({ error: 'Tienda no encontrada' });
  const storeId = storeRows[0].id;

  switch (req.method) {
    case 'GET': {
      const cats = await sql`SELECT * FROM product_categories WHERE store_id = ${storeId} ORDER BY sort_order, name`;
      return res.status(200).json({ categories: cats });
    }
    case 'POST': {
      const { name, sort_order = 0 } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' });
      const [cat] = await sql`INSERT INTO product_categories (store_id, name, sort_order) VALUES (${storeId}, ${name.trim()}, ${sort_order}) RETURNING *`;
      return res.status(201).json({ category: cat });
    }
    case 'DELETE': {
      const id = Number(req.query?.id);
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await sql`DELETE FROM product_categories WHERE id = ${id} AND store_id = ${storeId}`;
      return res.status(200).json({ ok: true });
    }
    default:
      return res.status(405).json({ error: 'Método no permitido' });
  }
}
