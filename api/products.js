// /api/products.js
// GET    — listar productos de la tienda autenticada
// POST   — crear producto
// PATCH  — editar producto
// DELETE — eliminar producto

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

  // Obtener store_id del vendedor autenticado
  const storeRows = await sql`
    SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1
  `;
  if (!storeRows.length) {
    return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
  }
  const storeId = storeRows[0].id;

  switch (req.method) {
    case 'GET':    return getProductos(storeId);
    case 'POST':   return crearProducto(req, storeId);
    case 'PATCH':  return editarProducto(req, storeId);
    case 'DELETE': return eliminarProducto(req, storeId);
    default:
      return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }
}

// ─── GET ─────────────────────────────────────────────────────

async function getProductos(storeId) {
  const products = await sql`
    SELECT
      p.*,
      pc.name AS category_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id',            pi.id,
            'cloudinary_id', pi.cloudinary_id,
            'url',           pi.url,
            'is_primary',    pi.is_primary,
            'sort_order',    pi.sort_order
          ) ORDER BY pi.sort_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'
      ) AS images
    FROM      products         p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN product_images     pi ON pi.product_id = p.id
    WHERE     p.store_id = ${storeId}
    GROUP BY  p.id, pc.name
    ORDER BY  p.created_at DESC
  `;
  return Response.json({ products });
}

// ─── POST ────────────────────────────────────────────────────

async function crearProducto(req, storeId) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { name, price_bs, description, category_id, is_available = true, images = [] } = body;

  if (!name?.trim())          return Response.json({ error: 'Nombre requerido' }, { status: 400 });
  if (!price_bs || price_bs <= 0) return Response.json({ error: 'Precio inválido' }, { status: 400 });

  // Validar que la categoría pertenece a esta tienda (si se envía)
  if (category_id) {
    const catRows = await sql`
      SELECT id FROM product_categories
      WHERE id = ${category_id} AND store_id = ${storeId}
    `;
    if (!catRows.length) return Response.json({ error: 'Categoría inválida' }, { status: 400 });
  }

  const [product] = await sql`
    INSERT INTO products (store_id, category_id, name, price_bs, description, is_available)
    VALUES (${storeId}, ${category_id || null}, ${name.trim()}, ${price_bs}, ${description?.trim() || null}, ${is_available})
    RETURNING *
  `;

  // Insertar imágenes si vienen en el payload
  if (images.length) {
    for (let i = 0; i < images.length; i++) {
      const { cloudinary_id, url } = images[i];
      await sql`
        INSERT INTO product_images (product_id, cloudinary_id, url, is_primary, sort_order)
        VALUES (${product.id}, ${cloudinary_id}, ${url}, ${i === 0}, ${i})
      `;
    }
  }

  return Response.json({ product }, { status: 201 });
}

// ─── PATCH ───────────────────────────────────────────────────

async function editarProducto(req, storeId) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { id, name, price_bs, description, category_id, is_available } = body;

  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });

  // Verificar que el producto pertenece a esta tienda
  const owned = await sql`
    SELECT id FROM products WHERE id = ${id} AND store_id = ${storeId}
  `;
  if (!owned.length) return Response.json({ error: 'Producto no encontrado' }, { status: 404 });

  const [product] = await sql`
    UPDATE products SET
      name         = COALESCE(${name?.trim() || null}, name),
      price_bs     = COALESCE(${price_bs || null}, price_bs),
      description  = COALESCE(${description?.trim() || null}, description),
      category_id  = COALESCE(${category_id || null}, category_id),
      is_available = COALESCE(${is_available ?? null}, is_available)
    WHERE id = ${id} AND store_id = ${storeId}
    RETURNING *
  `;

  return Response.json({ product });
}

// ─── DELETE ──────────────────────────────────────────────────

async function eliminarProducto(req, storeId) {
  const url = new URL(req.url);
  const id  = Number(url.searchParams.get('id'));

  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });

  const owned = await sql`
    SELECT id FROM products WHERE id = ${id} AND store_id = ${storeId}
  `;
  if (!owned.length) return Response.json({ error: 'Producto no encontrado' }, { status: 404 });

  // Las imágenes se eliminan en cascada (ON DELETE CASCADE en schema)
  await sql`DELETE FROM products WHERE id = ${id}`;

  return Response.json({ ok: true });
}
