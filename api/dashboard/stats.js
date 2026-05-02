// /api/dashboard/stats.js
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  if (req.method !== 'GET') return Response.json({ error: 'Método no permitido' }, { status: 405 });

  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }

  const storeRows = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (!storeRows.length) return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
  const storeId = storeRows[0].id;

  const [statsRow] = await sql`
    SELECT
      COUNT(*)                                    AS total_products,
      COUNT(*) FILTER (WHERE is_available = true) AS available_products,
      COALESCE(SUM(views_count), 0)               AS total_views,
      COUNT(DISTINCT category_id) FILTER (WHERE category_id IS NOT NULL) AS total_categories
    FROM products WHERE store_id = ${storeId}
  `;

  const [topRow] = await sql`SELECT name, views_count FROM products WHERE store_id = ${storeId} ORDER BY views_count DESC LIMIT 1`;

  return Response.json({
    stats: {
      total_products:     Number(statsRow.total_products),
      available_products: Number(statsRow.available_products),
      total_views:        Number(statsRow.total_views),
      total_categories:   Number(statsRow.total_categories),
      top_product:        topRow || null,
    },
  });
}