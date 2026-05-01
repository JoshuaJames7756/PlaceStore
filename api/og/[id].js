// /api/og/[id].js
// Edge Function: genera HTML estático con Open Graph tags
// Interceptada por vercel.json ANTES de llegar a la SPA React
// WhatsApp scraper recibe meta tags correctos; usuario real usa la SPA normalmente

import { neon } from '@neondatabase/serverless';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url  = new URL(req.url);
  const id   = url.pathname.split('/').pop();

  if (!id || isNaN(Number(id))) {
    return htmlResponse(buildFallbackHtml());
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const rows = await sql`
      SELECT
        p.id,
        p.name,
        p.price_bs,
        p.description,
        s.store_name,
        s.slug,
        s.logo_url,
        pi.url AS image_url
      FROM   products       p
      JOIN   stores         s  ON s.id = p.store_id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE  p.id = ${Number(id)}
      AND    p.is_available = true
      AND    s.is_active = true
      LIMIT  1
    `;

    if (!rows.length) {
      return htmlResponse(buildFallbackHtml());
    }

    const product  = rows[0];
    const appUrl   = process.env.VITE_APP_URL || 'https://placestore.vercel.app';
    const pageUrl  = `${appUrl}/p/${product.id}`;
    const storeUrl = `${appUrl}/tienda/${product.slug}`;

    const title       = `${product.name} — Bs ${product.price_bs}`;
    const description = product.description
      ? `${product.description.slice(0, 120)}... | ${product.store_name} en PlaceStore`
      : `${product.store_name} vende este producto en PlaceStore. Precio: Bs ${product.price_bs}`;
    const image       = product.image_url || product.logo_url || `${appUrl}/og-default.png`;

    return htmlResponse(buildOgHtml({ title, description, image, pageUrl, storeUrl, product }));

  } catch (err) {
    console.error('[OG] DB error:', err);
    return htmlResponse(buildFallbackHtml());
  }
}

// ─── Helpers ────────────────────────────────────────────────

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}

function buildOgHtml({ title, description, image, pageUrl, storeUrl, product }) {
  const appUrl = process.env.VITE_APP_URL || 'https://placestore.vercel.app';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escHtml(title)}</title>

  <!-- Open Graph (WhatsApp, Facebook, Telegram) -->
  <meta property="og:type"        content="product" />
  <meta property="og:url"         content="${escHtml(pageUrl)}" />
  <meta property="og:title"       content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:image"       content="${escHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name"   content="PlaceStore" />
  <meta property="og:locale"      content="es_BO" />
  <meta property="product:price:amount"   content="${product.price_bs}" />
  <meta property="product:price:currency" content="BOB" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image"       content="${escHtml(image)}" />

  <!-- Canonical + redirect al frontend real para usuarios -->
  <link rel="canonical" href="${escHtml(pageUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escHtml(pageUrl)}" />
</head>
<body>
  <p>Redirigiendo a <a href="${escHtml(storeUrl)}">${escHtml(product.store_name)}</a>...</p>
  <script>window.location.replace("${escJs(pageUrl)}")</script>
</body>
</html>`;
}

function buildFallbackHtml() {
  const appUrl = process.env.VITE_APP_URL || 'https://placestore.vercel.app';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>PlaceStore — Catálogos para el comercio local</title>
  <meta property="og:type"        content="website" />
  <meta property="og:url"         content="${appUrl}" />
  <meta property="og:title"       content="PlaceStore" />
  <meta property="og:description" content="Crea tu vitrina digital y vende por WhatsApp. Catálogos profesionales para negocios en Bolivia." />
  <meta property="og:image"       content="${appUrl}/og-default.png" />
  <meta property="og:site_name"   content="PlaceStore" />
  <link rel="canonical" href="${appUrl}" />
  <meta http-equiv="refresh" content="0;url=${appUrl}" />
</head>
<body>
  <script>window.location.replace("${appUrl}")</script>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escJs(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
