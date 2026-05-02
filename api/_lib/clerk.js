export function verificarClerk(req) {
  const auth  = req.headers?.get?.('authorization') || req.headers?.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) throw new Error('No autorizado: token ausente');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('No autorizado: token malformado');
  let payload;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
  } catch {
    throw new Error('No autorizado: payload inválido');
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) throw new Error('No autorizado: token expirado');
  if (!payload.sub) throw new Error('No autorizado: sub ausente');
  return { userId: payload.sub };
}

export function verificarAdmin(req) {
  const { userId } = verificarClerk(req);
  if (!process.env.ADMIN_CLERK_ID) throw new Error('ADMIN_CLERK_ID no configurado');
  if (userId !== process.env.ADMIN_CLERK_ID) throw new Error('Prohibido: acceso de admin requerido');
  return { userId };
}