// /api/stores/update.js
// PATCH — actualizar logo_url de la tienda autenticada
import { neon } from '@neondatabase/serverless';
import { verificarClerk } from '../_lib/clerk.js';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Método no permitido' });

  let userId;
  try {
    ({ userId } = verificarClerk(req));
  } catch (err) {
    return res.status(401).json({ error: err.message });
  }

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
