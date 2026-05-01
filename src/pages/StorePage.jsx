// src/pages/StorePage.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styles from './StorePage.module.css';

const APP_URL = import.meta.env.VITE_APP_URL || '';

export default function StorePage() {
  const { slug } = useParams();

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeCat, setActiveCat] = useState('');
  const [search, setSearch]     = useState('');
  const [lightbox, setLightbox] = useState(null); // { images, idx }

  useEffect(() => {
    fetch(`/api/stores/${slug}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error)))
      .then(setData)
      .catch(err => setError(typeof err === 'string' ? err : 'Error al cargar la tienda'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className={styles.center}><span className={styles.spinner} /></div>;
  if (error)   return <div className={styles.center}><p className={styles.errorMsg}>{error}</p></div>;

  const { store, categories, products } = data;

  const filtered = products.filter(p => {
    const matchCat  = !activeCat || p.category_id === Number(activeCat);
    const matchText = !search    || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  function buildWhatsAppUrl(product) {
    const template = store.whatsapp_message_template || '¡Hola! Me interesa: {product}';
    const msg      = template.replace('{product}', product.name);
    const number   = store.whatsapp_number.replace(/\D/g, '');
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  }

  function primaryImage(images) {
    return images?.find(i => i.is_primary)?.url || images?.[0]?.url || null;
  }

  return (
    <div className={styles.page}>
      {/* Header de tienda */}
      <header className={styles.storeHeader}>
        <div className={styles.storeHeaderInner}>
          {store.logo_url
            ? <img src={store.logo_url} alt={store.store_name} className={styles.logo} />
            : <div className={styles.logoFallback}>{store.store_name[0]}</div>
          }
          <div>
            <h1 className={styles.storeName}>{store.store_name}</h1>
            <p className={styles.storeCity}>📍 {store.location_city}</p>
          </div>
          <a
            href={buildWhatsAppUrl({ name: 'tu catálogo' })}
            target="_blank"
            rel="noreferrer"
            className={`btn btn-primary ${styles.btnWa}`}
          >
            <WhatsAppIcon /> Contactar
          </a>
        </div>
      </header>

      <div className={styles.container}>
        {/* Filtros */}
        <div className={styles.filters}>
          <input
            className={styles.search}
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {categories.length > 0 && (
            <div className={styles.cats}>
              <button
                className={`${styles.catBtn} ${!activeCat ? styles.catActive : ''}`}
                onClick={() => setActiveCat('')}
              >
                Todos
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  className={`${styles.catBtn} ${activeCat === String(c.id) ? styles.catActive : ''}`}
                  onClick={() => setActiveCat(activeCat === String(c.id) ? '' : String(c.id))}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid de productos */}
        {filtered.length === 0 ? (
          <div className={styles.empty}>No hay productos en esta sección.</div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(product => {
              const img = primaryImage(product.images);
              return (
                <div key={product.id} className={styles.card}>
                  <div
                    className={styles.imgWrap}
                    onClick={() => product.images?.length && setLightbox({ images: product.images, idx: 0 })}
                    style={{ cursor: product.images?.length ? 'zoom-in' : 'default' }}
                  >
                    {img
                      ? <img src={img} alt={product.name} className={styles.img} loading="lazy" />
                      : <div className={styles.imgPlaceholder}>📦</div>
                    }
                    {product.images?.length > 1 && (
                      <span className={styles.imgCount}>+{product.images.length - 1}</span>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.productName}>{product.name}</p>
                    {product.description && (
                      <p className={styles.productDesc}>{product.description}</p>
                    )}
                    <p className={styles.productPrice}>Bs {Number(product.price_bs).toFixed(2)}</p>
                  </div>

                  <div className={styles.cardFooter}>
                    <a
                      href={buildWhatsAppUrl(product)}
                      target="_blank"
                      rel="noreferrer"
                      className={`btn btn-primary ${styles.btnBuy}`}
                    >
                      <WhatsAppIcon /> Comprar
                    </a>
                    <button
                      className={styles.shareBtn}
                      onClick={() => shareProduct(product, store, APP_URL)}
                      title="Compartir"
                    >
                      <ShareIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <span>Catálogo creado con</span>
          <a href="/" className={styles.footerBrand}>PlaceStore</a>
        </footer>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          idx={lightbox.idx}
          onClose={() => setLightbox(null)}
          onChange={idx => setLightbox(l => ({ ...l, idx }))}
        />
      )}
    </div>
  );
}

// ─── Lightbox ───────────────────────────────────────────────

function Lightbox({ images, idx, onClose, onChange }) {
  const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowRight') onChange(Math.min(idx + 1, sorted.length - 1));
      if (e.key === 'ArrowLeft')  onChange(Math.max(idx - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx]);

  return (
    <div className={styles.lbOverlay} onClick={onClose}>
      <div className={styles.lbContent} onClick={e => e.stopPropagation()}>
        <img src={sorted[idx].url} alt="" className={styles.lbImg} />
        {sorted.length > 1 && (
          <div className={styles.lbNav}>
            <button
              className={styles.lbArrow}
              onClick={() => onChange(Math.max(idx - 1, 0))}
              disabled={idx === 0}
            >‹</button>
            <span className={styles.lbCounter}>{idx + 1} / {sorted.length}</span>
            <button
              className={styles.lbArrow}
              onClick={() => onChange(Math.min(idx + 1, sorted.length - 1))}
              disabled={idx === sorted.length - 1}
            >›</button>
          </div>
        )}
        <button className={styles.lbClose} onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────

async function shareProduct(product, store, appUrl) {
  const url  = `${appUrl}/p/${product.id}`;
  const text = `${product.name} — Bs ${Number(product.price_bs).toFixed(2)} | ${store.store_name}`;

  if (navigator.share) {
    try { await navigator.share({ title: product.name, text, url }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    alert('¡Enlace copiado!');
  } catch {}
}

// ─── Iconos SVG inline ──────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
