// /api/products.js
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from './_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

  const storeRows = await sql`SELECT id FROM stores WHERE clerk_id = ${userId} LIMIT 1`;
  if (!storeRows.length) return res.status(404).json({ error: 'Tienda no encontrada' });
  const storeId = storeRows[0].id;

  switch (req.method) {
    case 'GET':    return getProductos(res, storeId);
    case 'POST':   return crearProducto(req, res, storeId);
    case 'PATCH':  return editarProducto(req, res, storeId);
    case 'DELETE': return eliminarProducto(req, res, storeId);
    default:       return res.status(405).json({ error: 'Método no permitido' });
  }
}

async function getProductos(res, storeId) {
  const products = await sql`
    SELECT p.*, pc.name AS category_name,
      COALESCE(json_agg(json_build_object('id', pi.id, 'cloudinary_id', pi.cloudinary_id, 'url', pi.url, 'is_primary', pi.is_primary, 'sort_order', pi.sort_order) ORDER BY pi.sort_order) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
    FROM products p
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.store_id = ${storeId}
    GROUP BY p.id, pc.name
    ORDER BY p.created_at DESC
  `;
  return res.status(200).json({ products });
}

async function crearProducto(req, res, storeId) {
  const body = req.body;
  const { name, price_bs, description, category_id, is_available = true, images = [] } = body;
  if (!name?.trim())              return res.status(400).json({ error: 'Nombre requerido' });
  if (!price_bs || price_bs <= 0) return res.status(400).json({ error: 'Precio inválido' });
  if (category_id) {
    const catRows = await sql`SELECT id FROM product_categories WHERE id = ${category_id} AND store_id = ${storeId}`;
    if (!catRows.length) return res.status(400).json({ error: 'Categoría inválida' });
  }
  const [product] = await sql`
    INSERT INTO products (store_id, category_id, name, price_bs, description, is_available)
    VALUES (${storeId}, ${category_id || null}, ${name.trim()}, ${price_bs}, ${description?.trim() || null}, ${is_available})
    RETURNING *
  `;
  if (images.length) {
    for (let i = 0; i < images.length; i++) {
      const { cloudinary_id, url } = images[i];
      await sql`INSERT INTO product_images (product_id, cloudinary_id, url, is_primary, sort_order) VALUES (${product.id}, ${cloudinary_id}, ${url}, ${i === 0}, ${i})`;
    }
  }
  return res.status(201).json({ product });
}

async function editarProducto(req, res, storeId) {
  const body = req.body;
  const { id, name, price_bs, description, category_id, is_available } = body;
  if (!id) return res.status(400).json({ error: 'ID requerido' });
  const owned = await sql`SELECT id FROM products WHERE id = ${id} AND store_id = ${storeId}`;
  if (!owned.length) return res.status(404).json({ error: 'Producto no encontrado' });
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
  return res.status(200).json({ product });
}

async function eliminarProducto(req, res, storeId) {
  const id = Number(req.query?.id);
  if (!id) return res.status(400).json({ error: 'ID requerido' });
  const owned = await sql`SELECT id FROM products WHERE id = ${id} AND store_id = ${storeId}`;
  if (!owned.length) return res.status(404).json({ error: 'Producto no encontrado' });
  await sql`DELETE FROM products WHERE id = ${id}`;
  return res.status(200).json({ ok: true });
}
