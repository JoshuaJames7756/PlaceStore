// src/lib/db.js
// SOLO usar en /api — nunca importar desde el frontend
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('[db] DATABASE_URL no está configurada');
}

export const sql = neon(process.env.DATABASE_URL);
