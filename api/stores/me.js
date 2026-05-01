export default async function handler(req) {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Método no permitido' }, { status: 405 });
  }

  // LOG 1 — confirma que la función arranca
  console.log('🔵 stores/me iniciado');
  console.log('🔵 DATABASE_URL existe:', !!process.env.DATABASE_URL);

  let userId;
  try {
    ({ userId } = verificarClerk(req));
    console.log('🟢 userId:', userId);
  } catch (err) {
    console.log('🔴 Clerk error:', err.message);
    return Response.json({ error: err.message }, { status: 401 });
  }

  try {
    console.log('🔵 Ejecutando query...');
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
    console.log('🟢 Query ejecutada, filas:', rows.length);

    if (!rows.length) {
      return Response.json({ error: 'Tienda no encontrada' }, { status: 404 });
    }

    return Response.json({ store: rows[0] });
  } catch (err) {
    console.log('🔴 DB error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}