// /api/stores.js
// POST — Crear tienda nueva + activar trial 7 días
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../src/lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  // 1. Verificar auth
  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 401 });
  }

  // 2. Verificar que no tenga tienda ya creada
  const existing = await sql`
    SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1
  `;
  if (existing.length) {
    return Response.json({ error: 'Ya tienes una tienda registrada' }, { status: 409 });
  }

  // 3. Parsear body
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { store_name, whatsapp_number, location_city, logo_url } = body;

  // 4. Validaciones
  const CIUDADES = [
    'Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro',
    'Potosí', 'Sucre', 'Tarija', 'Beni', 'Pando'
  ];

  if (!store_name?.trim())       return Response.json({ error: 'Nombre de tienda requerido' }, { status: 400 });
  if (!whatsapp_number?.trim())  return Response.json({ error: 'Número de WhatsApp requerido' }, { status: 400 });
  if (!CIUDADES.includes(location_city)) return Response.json({ error: 'Ciudad inválida' }, { status: 400 });

  // 5. Generar slug único
  const baseSlug = slugify(store_name);
  const slug     = await generarSlugUnico(baseSlug);

  // 6. Insertar tienda + suscripción trial en transacción
  const trialExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    const [store] = await sql`
      WITH nueva_tienda AS (
        INSERT INTO stores (
          clerk_id, slug, store_name, whatsapp_number,
          location_city, logo_url, is_active, trial_expires
        ) VALUES (
          ${userId}, ${slug}, ${store_name.trim()}, ${whatsapp_number.trim()},
          ${location_city}, ${logo_url || null}, true, ${trialExpires.toISOString()}
        )
        RETURNING *
      ),
      nueva_sub AS (
        INSERT INTO subscriptions (store_id, status, plan, expires_at)
        SELECT id, 'trial', 'basic', ${trialExpires.toISOString()}
        FROM   nueva_tienda
      )
      SELECT * FROM nueva_tienda
    `;

    return Response.json({ store }, { status: 201 });
  } catch (err) {
    console.error('[stores POST]', err);
    return Response.json({ error: 'Error al crear la tienda' }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

async function generarSlugUnico(base) {
  // Intentar slug base primero, luego base-2, base-3...
  const rows = await sql`
    SELECT slug FROM stores
    WHERE  slug = ${base} OR slug LIKE ${base + '-%'}
    ORDER  BY slug
  `;
  if (!rows.length) return base;

  const usados = new Set(rows.map(r => r.slug));
  if (!usados.has(base)) return base;

  let i = 2;
  while (usados.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
