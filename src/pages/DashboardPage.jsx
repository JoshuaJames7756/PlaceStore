// src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../hooks/useStore.js';
import styles from './DashboardPage.module.css';

const APP_URL = import.meta.env.VITE_APP_URL || '';

export default function DashboardPage() {
  const { getToken, signOut } = useAuth();
  const { store, loading: storeLoading, error } = useStore();

  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied]             = useState(false);

  useEffect(() => {
    if (!store) return;
    getToken()
      .then(token => fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      }))
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [store]);

  if (storeLoading) {
    return <div className={styles.center}><span className={styles.spinner} /></div>;
  }

  if (error) {
    return <div style={{ color: 'red', padding: '2rem' }}>Error: {error}</div>;
  }

  if (!store) {
    return (
      <div className={styles.center}>
        <div className={styles.noStore}>
          <p>Aún no tienes una tienda configurada.</p>
          <Link to="/registro" className="btn btn-primary">Crear mi tienda</Link>
        </div>
      </div>
    );
  }

  const catalogUrl    = `${APP_URL}/tienda/${store.slug}`;
  const diasRestantes = store.trial_expires
    ? Math.max(0, Math.ceil((new Date(store.trial_expires) - Date.now()) / 86400000))
    : null;
  const subStatus = store.sub_status || (store.is_active ? 'trial' : 'expired');
  const waText    = encodeURIComponent('Mira mi catalogo: ' + catalogUrl);

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className={styles.page}>

      <header className={styles.topbar}>
        <span className={styles.brand}>PlaceStore</span>
        <div className={styles.topbarRight}>
          <span className={styles.storeName}>{store.store_name}</span>
          <button
            className="btn btn-ghost"
            onClick={() => signOut()}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Salir
          </button>
        </div>
      </header>

      <div className={styles.container}>

        <SubBanner status={subStatus} diasRestantes={diasRestantes} />

        <div className={styles.catalogCard}>
          <div className={styles.catalogInfo}>
            <p className={styles.catalogLabel}>Tu catálogo público</p>
            <a href={catalogUrl} target="_blank" rel="noreferrer" className={styles.catalogUrl}>
              {catalogUrl}
            </a>
          </div>
          <div className={styles.catalogActions}>
            <button
              className={`btn btn-ghost ${styles.copyBtn}`}
              onClick={copiarEnlace}
            >
              {copied ? 'Copiado' : 'Copiar enlace'}
            </button>
            
              href={'https://wa.me/?text=' + waText}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ fontSize: '0.875rem' }}
            >
              Compartir en WhatsApp
            </a>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard
            label="Productos activos"
            value={statsLoading ? '-' : stats?.available_products ?? 0}
            icon="📦"
            sub={statsLoading ? '' : (stats?.total_products ?? 0) + ' en total'}
          />
          <StatCard
            label="Vistas al catálogo"
            value={statsLoading ? '-' : stats?.total_views ?? 0}
            icon="👁️"
            sub="desde el inicio"
          />
          <StatCard
            label="Categorías"
            value={statsLoading ? '-' : stats?.total_categories ?? 0}
            icon="🗂️"
            sub="creadas"
          />
          <StatCard
            label="Producto más visto"
            value={statsLoading ? '-' : (stats?.top_product?.name || 'Sin datos')}
            icon="🏆"
            sub={stats?.top_product ? stats.top_product.views_count + ' vistas' : ''}
            small
          />
        </div>

        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>Acciones rápidas</h2>
          <div className={styles.actionGrid}>
            <Link to="/dashboard/productos" className={styles.actionCard}>
              <span className={styles.actionIcon}>📦</span>
              <span className={styles.actionLabel}>Gestionar productos</span>
              <span className={styles.actionArrow}>→</span>
            </Link>
            <Link to="/dashboard/suscripcion" className={styles.actionCard}>
              <span className={styles.actionIcon}>💳</span>
              <span className={styles.actionLabel}>Mi suscripción</span>
              <span className={styles.actionArrow}>→</span>
            </Link>
            
              href={catalogUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.actionCard}
            >
              <span className={styles.actionIcon}>🛍️</span>
              <span className={styles.actionLabel}>Ver mi vitrina</span>
              <span className={styles.actionArrow}>&#x2197;</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function SubBanner({ status, diasRestantes }) {
  if (status === 'active') return null;

  if (status === 'trial') {
    return (
      <div className={`${styles.banner} ${styles.bannerTrial}`}>
        <span>
          {'Periodo de prueba — ' + diasRestantes + ' dia' + (diasRestantes !== 1 ? 's' : '') + ' restante' + (diasRestantes !== 1 ? 's' : '')}
        </span>
        <Link to="/dashboard/suscripcion" className={styles.bannerLink}>Activar plan →</Link>
      </div>
    );
  }

  return (
    <div className={`${styles.banner} ${styles.bannerExpired}`}>
      <span>Tu suscripción ha vencido. Tu catálogo no está visible.</span>
      <Link to="/dashboard/suscripcion" className={styles.bannerLink}>Renovar ahora →</Link>
    </div>
  );
}

function StatCard({ label, value, icon, sub, small }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statIcon}>{icon}</span>
      <p className={`${styles.statValue} ${small ? styles.statValueSmall : ''}`}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}