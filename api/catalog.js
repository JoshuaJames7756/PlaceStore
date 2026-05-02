// /api/catalog.js
// GET ?feed=1&city=&q=&page=   → feed público paginado
// GET ?og=1&id=123             → HTML con Open Graph para WhatsApp

import { neon } from '@neondatabase/serverless';

const sql      = neon(process.env.DATABASE_URL);
const PAGE_SIZE = 24;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { feed, og, id } = req.query;

  // ─── OG HTML ────────────────────────────────────────────
  if (og && id) {
    const appUrl = process.env.VITE_APP_URL || 'https://placestore.vercel.app';
    try {
      const rows = await sql`
        SELECT p.id, p.name, p.price_bs, p.description,
          s.store_name, s.slug, s.logo_url,
          pi.url AS image_url
        FROM products p
        JOIN stores s ON s.id = p.store_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
        WHERE p.id = ${Number(id)} AND p.is_available = true AND s.is_active = true
        LIMIT 1
      `;
      const html = rows.length ? buildOgHtml(rows[0], appUrl) : buildFallbackHtml(appUrl);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(html);
    } catch {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(buildFallbackHtml(process.env.VITE_APP_URL || ''));
    }
  }

  // ─── Feed público ────────────────────────────────────────
  if (feed) {
    const city   = req.query.city  || '';
    const q      = req.query.q     || '';
    const page   = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const products = await sql`
      SELECT p.id, p.name, p.price_bs, p.description, p.views_count,
        s.store_name, s.slug AS store_slug, s.location_city,
        s.logo_url AS store_logo, pi.url AS primary_image
      FROM products p
      JOIN stores s ON s.id = p.store_id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE p.is_available = true AND s.is_active = true
      AND (${city} = '' OR s.location_city = ${city})
      AND (${q} = '' OR p.name ILIKE ${'%' + q + '%'} OR s.store_name ILIKE ${'%' + q + '%'})
      ORDER BY p.views_count DESC, p.created_at DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;

    const [{ total }] = await sql`
      SELECT COUNT(*) AS total
      FROM products p JOIN stores s ON s.id = p.store_id
      WHERE p.is_available = true AND s.is_active = true
      AND (${city} = '' OR s.location_city = ${city})
      AND (${q} = '' OR p.name ILIKE ${'%' + q + '%'} OR s.store_name ILIKE ${'%' + q + '%'})
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

  return res.status(400).json({ error: 'Parámetro requerido: feed o og' });
}

// ─── OG Helpers ─────────────────────────────────────────────

function buildOgHtml(product, appUrl) {
  const pageUrl  = `${appUrl}/p/${product.id}`;
  const title    = `${esc(product.name)} — Bs ${product.price_bs}`;
  const desc     = product.description
    ? `${product.description.slice(0, 120)}... | ${product.store_name} en PlaceStore`
    : `${product.store_name} vende este producto en PlaceStore. Precio: Bs ${product.price_bs}`;
  const image    = product.image_url || product.logo_url || `${appUrl}/og-default.png`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>${title}</title>
<meta property="og:type" content="product"/>
<meta property="og:url" content="${esc(pageUrl)}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="PlaceStore"/>
<meta property="product:price:amount" content="${product.price_bs}"/>
<meta property="product:price:currency" content="BOB"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<link rel="canonical" href="${esc(pageUrl)}"/>
<meta http-equiv="refresh" content="0;url=${esc(pageUrl)}"/>
</head><body><script>window.location.replace("${pageUrl.replace(/"/g, '\\"')}")</script></body></html>`;
}

function buildFallbackHtml(appUrl) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>PlaceStore</title>
<meta property="og:title" content="PlaceStore"/>
<meta property="og:description" content="Catálogos digitales para el comercio boliviano."/>
<meta property="og:image" content="${appUrl}/og-default.png"/>
<meta http-equiv="refresh" content="0;url=${appUrl}"/>
</head><body><script>window.location.replace("${appUrl}")</script></body></html>`;
}

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
