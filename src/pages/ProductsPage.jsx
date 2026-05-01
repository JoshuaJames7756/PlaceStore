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

  if (loading) return <div className={styles.center}>Cargando productos...</div>;
  if (error)   return <div className={styles.center}>{error}</div>;

  return (
    <div className={styles.page}>
      {/* Cabecera */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis productos</h1>
          <p className={styles.count}>{products.length} producto{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('create')}>
          + Agregar producto
        </button>
      </div>

      {/* Filtros */}
      <div className={styles.filters}>
        <input
          className={styles.search}
          placeholder="Buscar producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          {products.length === 0
            ? 'Aún no tienes productos. ¡Agrega el primero!'
            : 'No hay productos que coincidan con la búsqueda.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(product => (
            <div key={product.id} className={`${styles.card} ${!product.is_available ? styles.cardInactive : ''}`}>
              {/* Imagen */}
              <div className={styles.imgWrap}>
                {product.images?.[0]
                  ? <img src={product.images[0].url} alt={product.name} className={styles.img} loading="lazy" />
                  : <div className={styles.imgPlaceholder}>📦</div>
                }
                <button
                  className={`${styles.badge} ${product.is_available ? styles.badgeOn : styles.badgeOff}`}
                  onClick={() => toggleDisponible(product)}
                  title="Cambiar disponibilidad"
                >
                  {product.is_available ? 'Disponible' : 'Agotado'}
                </button>
              </div>

              {/* Info */}
              <div className={styles.info}>
                <p className={styles.name}>{product.name}</p>
                {product.category_name && (
                  <p className={styles.cat}>{product.category_name}</p>
                )}
                <p className={styles.price}>Bs {Number(product.price_bs).toFixed(2)}</p>
              </div>

              {/* Acciones */}
              <div className={styles.actions}>
                <button className="btn btn-ghost" onClick={() => setModal(product)}>
                  Editar
                </button>
                <button className="btn btn-danger" onClick={() => setConfirmId(product.id)}>
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

      {/* Confirm eliminar */}
      {confirmId && (
        <div className={styles.overlay}>
          <div className={styles.confirm}>
            <p>¿Eliminar este producto? Esta acción no se puede deshacer.</p>
            <div className={styles.confirmBtns}>
              <button className="btn btn-ghost" onClick={() => setConfirmId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
