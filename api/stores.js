// /api/stores.js
// GET  ?me=1          → tienda del vendedor autenticado
// GET  ?slug=xxx      → vitrina pública por slug
// POST                → crear tienda nueva
// PATCH               → actualizar logo_url

import { neon } from '@neondatabase/serverless';
import { verificarClerk } from './_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const { me, slug } = req.query;

  // ─── GET público por slug ────────────────────────────────
  if (req.method === 'GET' && slug) {
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

    sql`UPDATE products SET views_count = views_count + 1 WHERE store_id = ${store.id} AND is_available = true`.catch(() => {});

    return res.status(200).json({ store, categories, products });
  }

  // ─── Rutas autenticadas ──────────────────────────────────
  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  // GET ?me=1 → tienda del vendedor
  if (req.method === 'GET' && me) {
    try {
      const rows = await sql`
        SELECT s.*, sub.status AS sub_status, sub.expires_at AS sub_expires_at
        FROM stores s
        LEFT JOIN subscriptions sub
               ON sub.store_id = s.id
              AND sub.status IN ('trial', 'active')
              AND sub.expires_at > NOW()
        WHERE s.clerk_id = ${userId}
        LIMIT 1
      `;
      if (!rows.length) return res.status(404).json({ error: 'Tienda no encontrada' });
      return res.status(200).json({ store: rows[0] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST → crear tienda
  if (req.method === 'POST') {
    const existing = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
    if (existing.length) return res.status(409).json({ error: 'Ya tienes una tienda registrada' });

    const { store_name, whatsapp_number, location_city, logo_url } = req.body;
    const CIUDADES = ['Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Beni', 'Pando'];
    if (!store_name?.trim())              return res.status(400).json({ error: 'Nombre de tienda requerido' });
    if (!whatsapp_number?.trim())         return res.status(400).json({ error: 'Número de WhatsApp requerido' });
    if (!CIUDADES.includes(location_city)) return res.status(400).json({ error: 'Ciudad inválida' });

    const baseSlug     = slugify(store_name);
    const slug         = await generarSlugUnico(baseSlug);
    const trialExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
      const [store] = await sql`
        WITH nueva_tienda AS (
          INSERT INTO stores (clerk_id, slug, store_name, whatsapp_number, location_city, logo_url, is_active, trial_expires)
          VALUES (${userId}, ${slug}, ${store_name.trim()}, ${whatsapp_number.trim()}, ${location_city}, ${logo_url || null}, true, ${trialExpires.toISOString()})
          RETURNING *
        ),
        nueva_sub AS (
          INSERT INTO subscriptions (store_id, status, plan, expires_at)
          SELECT id, 'trial', 'basic', ${trialExpires.toISOString()} FROM nueva_tienda
        )
        SELECT * FROM nueva_tienda
      `;
      return res.status(201).json({ store });
    } catch (err) {
      console.error('DB error:', err.message);
      return res.status(500).json({ error: 'Error al crear la tienda' });
    }
  }

  // PATCH → actualizar logo
  if (req.method === 'PATCH') {
    const { logo_url } = req.body;
    if (!logo_url?.trim()) return res.status(400).json({ error: 'URL de logo requerida' });
    const [store] = await sql`
      UPDATE stores SET logo_url = ${logo_url.trim()}
      WHERE clerk_id = ${userId}
      RETURNING id, store_name, logo_url, slug
    `;
    if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
    return res.status(200).json({ store });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 50);
}

async function generarSlugUnico(base) {
  const rows = await sql`SELECT slug FROM stores WHERE slug = ${base} OR slug LIKE ${base + '-%'} ORDER BY slug`;
  if (!rows.length) return base;
  const usados = new Set(rows.map(r => r.slug));
  if (!usados.has(base)) return base;
  let i = 2;
  while (usados.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
