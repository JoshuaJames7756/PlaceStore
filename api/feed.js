// /api/feed.js
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const PAGE_SIZE = 24;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const city   = req.query?.city  || '';
  const q      = req.query?.q     || '';
  const page   = Math.max(1, Number(req.query?.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const products = await sql`
    SELECT p.id, p.name, p.price_bs, p.description, p.views_count,
      s.store_name, s.slug AS store_slug, s.location_city,
      s.logo_url AS store_logo, pi.url AS primary_image
    FROM      products       p
    JOIN      stores         s  ON s.id = p.store_id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
    WHERE p.is_available = true AND s.is_active = true
    AND   (${city} = '' OR s.location_city = ${city})
    AND   (${q} = '' OR p.name ILIKE ${'%' + q + '%'} OR s.store_name ILIKE ${'%' + q + '%'})
    ORDER BY p.views_count DESC, p.created_at DESC
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `;

  const [{ total }] = await sql`
    SELECT COUNT(*) AS total
    FROM products p JOIN stores s ON s.id = p.store_id
    WHERE p.is_available = true AND s.is_active = true
    AND   (${city} = '' OR s.location_city = ${city})
    AND   (${q} = '' OR p.name ILIKE ${'%' + q + '%'} OR s.store_name ILIKE ${'%' + q + '%'})
  `;

  return res.status(200).json({
    products,
    pagination: {
      page,
      total:      Number(total),
      totalPages: Math.ceil(Number(total) / PAGE_SIZE),
      hasMore:    offset + products.length < Number(total),
    },
  });
}
