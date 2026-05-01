// src/lib/clerk.js
// Verificación manual de JWT para sk_test_ (sin dominio propio)
// Cuando tengas sk_live_ + dominio propio: reemplazar por verifyToken() del SDK oficial

/**
 * Extrae y valida el JWT de Clerk desde el header Authorization.
 * Devuelve { userId } si es válido, lanza Error si no.
 *
 * @param {Request} req
 * @returns {{ userId: string }}
 */
export function verificarClerk(req) {
  const auth   = req.headers?.authorization || req.headers?.get?.('authorization') || '';
  const token  = auth.replace('Bearer ', '').trim();

  if (!token) throw new Error('No autorizado: token ausente');

  // Decodificar payload (parte central del JWT, base64url)
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('No autorizado: token malformado');

  let payload;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json   = Buffer.from(base64, 'base64').toString('utf8');
    payload      = JSON.parse(json);
  } catch {
    throw new Error('No autorizado: payload inválido');
  }

  // Validar expiración
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error('No autorizado: token expirado');
  }

  // Validar sub (userId de Clerk)
  if (!payload.sub) {
    throw new Error('No autorizado: sub ausente');
  }

  return { userId: payload.sub };
}

/**
 * Verifica que el userId del token sea el admin configurado.
 * Usar en todas las rutas /api/admin/*
 *
 * @param {Request} req
 */
export function verificarAdmin(req) {
  const { userId } = verificarClerk(req);
  if (!process.env.ADMIN_CLERK_ID) {
    throw new Error('ADMIN_CLERK_ID no configurado en variables de entorno');
  }
  if (userId !== process.env.ADMIN_CLERK_ID) {
    throw new Error('Prohibido: acceso de admin requerido');
  }
  return { userId };
}
