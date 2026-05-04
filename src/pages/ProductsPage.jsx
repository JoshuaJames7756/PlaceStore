// src/pages/ProductsPage.jsx
import { useState } from 'react';
import { useProducts } from '../hooks/useProducts.js';
import ProductModal from '../components/vendor/ProductModal.jsx';
import styles from './ProductsPage.module.css';

export default function ProductsPage() {
  const {
    products, categories, loading, error,
    crearProducto, editarProducto, eliminarProducto,
    crearCategoria, subirImagen,
  } = useProducts();

  const [modal, setModal]           = useState(null); // null | 'create' | product
  const [filterCat, setFilterCat]   = useState('');
  const [search, setSearch]         = useState('');
  const [confirmId, setConfirmId]   = useState(null);

  const filtered = products.filter(p => {
    const matchCat  = !filterCat || p.category_id === Number(filterCat);
    const matchText = !search    || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchText;
  });

  async function handleSave(payload) {
    if (modal === 'create') {
      await crearProducto(payload);
    } else {
      await editarProducto({ id: modal.id, ...payload });
    }
    setModal(null);
  }

  async function handleDelete() {
    await eliminarProducto(confirmId);
    setConfirmId(null);
  }

  async function toggleDisponible(product) {
    await editarProducto({ id: product.id, is_available: !product.is_available });
  }

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.loader} />
      <p>Cargando tus productos...</p>
    </div>
  );
  
  if (error) return (
    <div className={styles.center}>
      <p className={styles.errorText}>⚠️ {error}</p>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Cabecera con estadísticas rápidas */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Mis productos</h1>
          <div className={styles.stats}>
            <span className={styles.count}>{products.length} productos en total</span>
            <span className={styles.dot}>•</span>
            <span className={styles.countActive}>{products.filter(p => p.is_available).length} disponibles</span>
          </div>
        </div>
        <button className={`btn btn-primary ${styles.addBtn}`} onClick={() => setModal('create')}>
          <span className={styles.plus}>+</span> Agregar producto
        </button>
      </div>

      {/* Barra de herramientas: Filtros y Búsqueda */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.search}
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista / Grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>{products.length === 0 ? '📦' : '🔍'}</div>
          <p>
            {products.length === 0
              ? 'Aún no tienes productos. ¡Comienza a armar tu vitrina!'
              : 'No encontramos productos que coincidan con tus filtros.'}
          </p>
          {products.length === 0 && (
            <button className="btn btn-primary" onClick={() => setModal('create')}>
              Crear mi primer producto
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(product => (
            <div key={product.id} className={`${styles.card} ${!product.is_available ? styles.cardInactive : ''}`}>
              {/* Imagen y Badge de disponibilidad */}
              <div className={styles.imgWrap}>
                {product.images?.[0]
                  ? <img src={product.images[0].url} alt={product.name} className={styles.img} loading="lazy" />
                  : <div className={styles.imgPlaceholder}>🖼️</div>
                }
                <button
                  className={`${styles.badge} ${product.is_available ? styles.badgeOn : styles.badgeOff}`}
                  onClick={() => toggleDisponible(product)}
                  title={product.is_available ? "Marcar como agotado" : "Marcar como disponible"}
                >
                  <div className={styles.statusDot} />
                  {product.is_available ? 'Disponible' : 'Agotado'}
                </button>
              </div>

              {/* Información del Producto */}
              <div className={styles.info}>
                <div className={styles.topInfo}>
                  <p className={styles.name}>{product.name}</p>
                  {product.category_name && (
                    <span className={styles.cat}>{product.category_name}</span>
                  )}
                </div>
                <div className={styles.bottomInfo}>
                  <p className={styles.price}>
                    <span className={styles.currency}>Bs</span> {Number(product.price_bs).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Acciones Rápidas */}
              <div className={styles.actions}>
                <button className={`btn btn-ghost ${styles.editBtn}`} onClick={() => setModal(product)}>
                  Editar
                </button>
                <button className={`btn btn-danger-soft ${styles.deleteBtn}`} onClick={() => setConfirmId(product.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      {modal !== null && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          categories={categories}
          onSave={handleSave}
          onClose={() => setModal(null)}
          onNewCategory={crearCategoria}
          onUploadImage={subirImagen}
        />
      )}

      {/* Overlay de confirmación mejorado */}
      {confirmId && (
        <div className={styles.overlay}>
          <div className={styles.confirmCard}>
            <div className={styles.confirmIcon}>🗑️</div>
            <h3>¿Eliminar producto?</h3>
            <p>Esta acción quitará el producto de tu catálogo permanentemente y no se puede deshacer.</p>
            <div className={styles.confirmBtns}>
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}