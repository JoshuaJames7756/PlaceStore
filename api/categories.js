// /api/categories.js
// GET  — listar categorías de la tienda
// POST — crear categoría
// DELETE — eliminar categoría

import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../src/lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }

  const storeRows = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (!storeRows.length) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
  const storeId = storeRows[0].id;

  switch (req.method) {
    case 'GET': {
      const cats = await sql`
        SELECT * FROM product_categories
        WHERE store_id = ${storeId}
        ORDER BY sort_order, name
      `;
      return Response.json({ categories: cats });
    }

    case 'POST': {
      let body;
      try { body = await req.json(); } catch {
        return Response.json({ error: 'Body inválido' }, { status: 400 });
      }
      const { name, sort_order = 0 } = body;
      if (!name?.trim()) return Response.json({ error: 'Nombre requerido' }, { status: 400 });

      const [cat] = await sql`
        INSERT INTO product_categories (store_id, name, sort_order)
        VALUES (${storeId}, ${name.trim()}, ${sort_order})
        RETURNING *
      `;
      return Response.json({ category: cat }, { status: 201 });
    }

    case 'DELETE': {
      const url = new URL(req.url);
      const id  = Number(url.searchParams.get('id'));
      if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });

      await sql`
        DELETE FROM product_categories
        WHERE id = ${id} AND store_id = ${storeId}
      `;
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }
}
