// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center', padding: '24px' }}>
      <p style={{ fontSize: '4rem' }}>🔦</p>
      <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 700 }}>Página no encontrada</h1>
      <p style={{ color: 'var(--color-text-2)', fontSize: '0.9375rem' }}>Esta URL no existe o la tienda no está activa.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '8px' }}>Ir al inicio</Link>
    </div>
  );
}
