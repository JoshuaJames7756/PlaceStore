// src/pages/AdminPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import styles from './AdminPage.module.css';

const TABS = ['Pagos pendientes', 'Pagos verificados', 'Tiendas'];

export default function AdminPage() {
  const { getToken } = useAuth();
  const [tab, setTab] = useState(0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>Admin Panel</h1>
          <p className={styles.subtitle}>Gestión centralizada de PlaceStore</p>
        </div>
      </header>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {TABS.map((t, i) => (
            <button 
              key={t} 
              className={`${styles.tab} ${tab === i ? styles.tabActive : ''}`} 
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className={styles.content}>
        {tab === 0 && <PagosTab getToken={getToken} status="pending" />}
        {tab === 1 && <PagosTab getToken={getToken} status="verified" />}
        {tab === 2 && <TiendasTab getToken={getToken} />}
      </main>
    </div>
  );
}

function PagosTab({ getToken, status }) {
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [actioning, setActioning] = useState(null);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res   = await fetch(`/api/admin?section=payments&status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error(err);
    } finally { 
      setLoading(false); 
    }
  }, [status, getToken]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  async function handleAction(id, action) {
    const confirmMsg = action === 'reject' ? '¿Rechazar este pago?' : '¿Confirmar verificación y activar tienda?';
    if (!window.confirm(confirmMsg)) return;

    setActioning(id);
    try {
      const token = await getToken();
      const res   = await fetch('/api/admin?section=payments', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ id, action }),
      });
      if (res.ok) setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    } finally { 
      setActioning(null); 
    }
  }

  if (loading) return <SkeletonList />;
  if (!payments.length) return <Empty text={status === 'pending' ? 'No hay pagos por verificar. ¡Buen trabajo!' : 'No hay historial de pagos verificados.'} />;

  return (
    <div className={styles.list}>
      {payments.map(p => (
        <div key={p.id} className={styles.payCard}>
          <div className={styles.payMain}>
            <div className={styles.payInfo}>
              <div className={styles.payHeader}>
                <span className={styles.payStore}>{p.store_name}</span>
                <span className={`${styles.methodBadge} ${p.method === 'QR' ? styles.methodQr : styles.methodTrans}`}>
                  {p.method}
                </span>
              </div>
              <p className={styles.payMeta}>{p.location_city} · Ref: <strong>{p.reference}</strong></p>
            </div>
            <div className={styles.payRight}>
              <p className={styles.payAmount}>Bs {Number(p.amount_bs).toFixed(2)}</p>
              <p className={styles.payDate}>{formatDate(p.created_at)}</p>
            </div>
          </div>
          
          <div className={styles.payFooter}>
            <div className={styles.payDetail}>
              {p.receipt_url && (
                <a href={p.receipt_url} target="_blank" rel="noreferrer" className={styles.receiptLink}>
                   Comprobante ↗
                </a>
              )}
            </div>
            {status === 'pending' && (
              <div className={styles.payActions}>
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: '0.8rem', padding: '8px 16px', color: 'var(--color-danger)' }} 
                  onClick={() => handleAction(p.id, 'reject')} 
                  disabled={actioning === p.id}
                >
                  Rechazar
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.8rem', padding: '8px 16px' }} 
                  onClick={() => handleAction(p.id, 'verify')} 
                  disabled={actioning === p.id}
                >
                  {actioning === p.id ? 'Procesando...' : 'Verificar y activar'}
                </button>
              </div>
            )}
            {status === 'verified' && (
              <span className={styles.verifiedTag}>
                <span className={styles.dotOn} style={{width: 6, height: 6}} /> Verificado el {formatDate(p.verified_at)}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TiendasTab({ getToken }) {
  const [stores, setStores]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => fetchStores(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  async function fetchStores(q = '') {
    setLoading(true);
    try {
      const token = await getToken();
      const res   = await fetch(`/api/admin?section=stores&q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStores(data.stores || []);
    } catch {}
    finally { setLoading(false); }
  }

  async function toggleStore(id, current) {
    setToggling(id);
    try {
      const token = await getToken();
      const res   = await fetch('/api/admin?section=stores', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ id, is_active: !current }),
      });
      if (res.ok) setStores(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s));
    } catch {}
    finally { setToggling(null); }
  }

  return (
    <div className={styles.storesSection}>
      <div className={styles.searchWrapper}>
        <input 
          className={styles.searchInput} 
          placeholder="Buscar tienda, ciudad o slug..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
        {loading && <span className={styles.miniSpinner} />}
      </div>

      {!stores.length && !loading ? <Empty text="No se encontraron tiendas con ese nombre." /> : (
        <div className={styles.storeTable}>
          <div className={styles.tableHead}>
            <span>Tienda</span>
            <span>Ciudad</span>
            <span>Suscripción</span>
            <span>Productos</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {stores.map(s => (
            <div key={s.id} className={styles.tableRow}>
              <div className={styles.storeCell}>
                <p className={styles.storeName}>{s.store_name}</p>
                <code className={styles.storeSlug}>/{s.slug}</code>
              </div>
              <span className={styles.cell}>{s.location_city}</span>
              <span className={styles.cell}><SubTag status={s.sub_status} expires={s.sub_expires_at} /></span>
              <span className={styles.cell}>{s.product_count}</span>
              <span className={styles.cell}>
                <div className={`${styles.statusBadge} ${s.is_active ? styles.badgeOn : styles.badgeOff}`}>
                  <span className={styles.activeDot} />
                  {s.is_active ? 'Activa' : 'Inactiva'}
                </div>
              </span>
              <div className={styles.cellActions}>
                <a href={`/tienda/${s.slug}`} target="_blank" rel="noreferrer" className={styles.linkBtn}>Ver ↗</a>
                <button
                  className={`btn ${s.is_active ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ 
                    fontSize: '0.7rem', 
                    padding: '4px 10px', 
                    color: s.is_active ? 'var(--color-danger)' : '' 
                  }}
                  onClick={() => toggleStore(s.id, s.is_active)}
                  disabled={toggling === s.id}
                >
                  {toggling === s.id ? '...' : s.is_active ? 'Suspender' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubTag({ status, expires }) {
  if (!status) return <span className={styles.subTagNone}>Sin plan</span>;
  const label = status === 'trial' ? 'Prueba' : status === 'active' ? `Vence ${formatDate(expires)}` : 'Vencido';
  const cls   = status === 'active' ? styles.subTagActive : status === 'trial' ? styles.subTagTrial : styles.subTagExpired;
  return <span className={`${styles.subTag} ${cls}`}>{label}</span>;
}

function SkeletonList() {
  return (
    <div className={styles.list}>
      {[1,2,3].map(i => <div key={i} className={styles.skeletonCard} />)}
    </div>
  );
}

function Empty({ text }) { 
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>📂</div>
      <p>{text}</p>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
}