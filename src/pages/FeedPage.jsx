// src/pages/FeedPage.jsx
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './FeedPage.module.css';

const CIUDADES = ['Todas', 'Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro', 'Potosí', 'Sucre', 'Tarija', 'Beni', 'Pando'];

export default function FeedPage() {
  const [products, setProducts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination]   = useState(null);
  const [city, setCity]               = useState('');
  const [q, setQ]                     = useState('');
  const [inputQ, setInputQ]           = useState('');
  const loaderRef                     = useRef(null);

  // Debounce para la búsqueda
  useEffect(() => {
    const t = setTimeout(() => setQ(inputQ), 400);
    return () => clearTimeout(t);
  }, [inputQ]);

  // Fetch inicial y por filtros
  useEffect(() => { fetchPage(1, true); }, [city, q]);

  async function fetchPage(page, reset = false) {
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ feed: '1', page });
      if (city) params.set('city', city);
      if (q)    params.set('q', q);
      const res  = await fetch(`/api/catalog?${params}`);
      const data = await res.json();
      setProducts(prev => reset ? data.products : [...prev, ...data.products]);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error fetching feed:", err);
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  }

  // Scroll Infinito
  useEffect(() => {
    if (!loaderRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pagination?.hasMore && !loadingMore) {
          fetchPage(pagination.page + 1);
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [pagination, loadingMore]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>PlaceStore</Link>
          <div className={styles.headerDivider} />
          <p className={styles.tagline}>Descubre negocios en Bolivia</p>
        </div>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.filtersInner}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Buscar productos o tiendas..."
              value={inputQ}
              onChange={e => setInputQ(e.target.value)}
            />
            {inputQ && <button className={styles.clearBtn} onClick={() => setInputQ('')}>✕</button>}
          </div>
          
          <div className={styles.cityFilters}>
            {CIUDADES.map(c => {
              const val = c === 'Todas' ? '' : c;
              return (
                <button
                  key={c}
                  className={`${styles.cityBtn} ${city === val ? styles.cityActive : ''}`}
                  onClick={() => setCity(val)}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className={styles.main}>
        {pagination && (
          <div className={styles.resultsInfo}>
            <p className={styles.resultCount}>
              Mostrando <strong>{pagination.total}</strong> producto{pagination.total !== 1 ? 's' : ''}
              {city ? <span> en <b>{city}</b></span> : ''}
              {q ? <span> para "<b>{q}</b>"</span> : ''}
            </p>
          </div>
        )}

        {loading ? (
          <div className={styles.grid}>
            {[...Array(12)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyIcon}>🔦</p>
            <h3>No encontramos resultados</h3>
            <p>Prueba ajustando los filtros o buscando algo más general.</p>
            {(city || q) && (
              <button className="btn btn-ghost" onClick={() => { setCity(''); setInputQ(''); }}>
                Limpiar todos los filtros
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map(p => <FeedCard key={p.id} product={p} />)}
          </div>
        )}

        <div ref={loaderRef} className={styles.loaderTrigger}>
          {loadingMore && (
            <div className={styles.loadMoreContent}>
              <span className={styles.spinner} />
              <p>Cargando más productos...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FeedCard({ product: p }) {
  function buildWaUrl() {
    const number = p.store_whatsapp?.replace(/\D/g, '') || '';
    const msg    = `¡Hola! Vi tu catálogo en PlaceStore y me interesa este producto: ${p.name}. ¿Está disponible?`;
    return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <article className={styles.card}>
      <Link to={`/tienda/${p.store_slug}`} className={styles.cardImgWrap}>
        {p.primary_image
          ? <img src={p.primary_image} alt={p.name} className={styles.cardImg} loading="lazy" />
          : <div className={styles.cardImgPlaceholder}>📦</div>
        }
        <div className={styles.cityBadge}>{p.location_city}</div>
      </Link>
      
      <div className={styles.cardBody}>
        <Link to={`/tienda/${p.store_slug}`} className={styles.storeHeader}>
          {p.store_logo
            ? <img src={p.store_logo} alt={p.store_name} className={styles.storeLogo} />
            : <span className={styles.storeLogoFallback}>{p.store_name[0]}</span>
          }
          <span className={styles.storeName}>{p.store_name}</span>
        </Link>
        
        <h2 className={styles.productName}>{p.name}</h2>
        <p className={styles.productPrice}>
          <span className={styles.currency}>Bs</span> {Number(p.price_bs).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
        </p>
      </div>
      
      <div className={styles.cardFooter}>
        <Link to={`/tienda/${p.store_slug}`} className={`btn btn-ghost ${styles.btnSee}`}>
          Ver tienda
        </Link>
        <a href={buildWaUrl()} target="_blank" rel="noreferrer" className={`btn btn-primary ${styles.btnWa}`}>
          <WaIcon /> Pedir
        </a>
      </div>
    </article>
  );
}

function WaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}