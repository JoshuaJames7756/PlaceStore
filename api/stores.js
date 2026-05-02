// /api/stores.js
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from './_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  console.log('🔵 stores POST iniciado');
  console.log('🔵 DATABASE_URL existe:', !!process.env.DATABASE_URL);

  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  let userId;
  try {
    ({ userId } = verificarClerk(req));
    console.log('🟢 userId:', userId);
  } catch (err) {
    console.log('🔴 Clerk error:', err.message);
    return Response.json({ error: err.message }, { status: 401 });
  }

  const existing = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (existing.length) {
    return Response.json({ error: 'Ya tienes una tienda registrada' }, { status: 409 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { store_name, whatsapp_number, location_city, logo_url } = body;

  const CIUDADES = ['Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Beni', 'Pando'];

  if (!store_name?.trim())      return Response.json({ error: 'Nombre de tienda requerido' }, { status: 400 });
  if (!whatsapp_number?.trim()) return Response.json({ error: 'Número de WhatsApp requerido' }, { status: 400 });
  if (!CIUDADES.includes(location_city)) return Response.json({ error: 'Ciudad inválida' }, { status: 400 });

  const baseSlug = slugify(store_name);
  const slug     = await generarSlugUnico(baseSlug);
  const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
    return Response.json({ store }, { status: 201 });
  } catch (err) {
    console.error('[stores POST]', err);
    return Response.json({ error: 'Error al crear la tienda' }, { status: 500 });
  }
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