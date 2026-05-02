// /api/stores/[slug].js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Slug requerido' });

  const storeRows = await sql`
    SELECT id, slug, store_name, whatsapp_number, location_city, logo_url, whatsapp_message_template
    FROM stores WHERE slug = ${slug} AND is_active = true LIMIT 1
  `;
  if (!storeRows.length) return res.status(404).json({ error: 'Tienda no encontrada o inactiva' });
  const store = storeRows[0];

  const categories = await sql`
    SELECT DISTINCT pc.id, pc.name, pc.sort_order
    FROM product_categories pc
    JOIN products p ON p.category_id = pc.id
    WHERE pc.store_id = ${store.id} AND p.is_available = true
    ORDER BY pc.sort_order, pc.name
  `;

  const products = await sql`
    SELECT p.id, p.name, p.price_bs, p.description, p.category_id, p.views_count,
      COALESCE(json_agg(json_build_object('url', pi.url, 'is_primary', pi.is_primary, 'sort_order', pi.sort_order) ORDER BY pi.sort_order) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
    FROM products p
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.store_id = ${store.id} AND p.is_available = true
    GROUP BY p.id
    ORDER BY p.category_id NULLS LAST, p.created_at DESC
  `;

  // Incrementar views async
  sql`UPDATE products SET views_count = views_count + 1 WHERE store_id = ${store.id} AND is_available = true`.catch(() => {});

  return res.status(200).json({ store, categories, products });
}
