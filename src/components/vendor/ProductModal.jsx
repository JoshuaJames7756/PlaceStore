// src/components/vendor/ProductModal.jsx
import { useState, useRef } from 'react';
import styles from './ProductModal.module.css';

export default function ProductModal({ product, categories, onSave, onClose, onNewCategory, onUploadImage }) {
  const isEdit = !!product;

  const [form, setForm] = useState({
    name:        product?.name        || '',
    price_bs:    product?.price_bs    || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    is_available: product?.is_available ?? true,
  });

  const [images, setImages]         = useState(product?.images || []);
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [newCat, setNewCat]         = useState('');
  const [addingCat, setAddingCat]   = useState(false);
  const fileRef                     = useRef(null);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB'); return; }

    setUploading(true);
    setError('');
    try {
      const result = await onUploadImage(file);
      setImages(prev => [
        ...prev,
        { ...result, is_primary: prev.length === 0, sort_order: prev.length },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeImage(idx) {
    setImages(prev => {
      const next = prev.filter((_, i) => i !== idx);
      // Asegurar que haya una primaria
      if (next.length && !next.some(i => i.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  }

  function setPrimary(idx) {
    setImages(prev => prev.map((img, i) => ({ ...img, is_primary: i === idx })));
  }

  async function handleAddCat() {
    if (!newCat.trim()) return;
    setAddingCat(true);
    try {
      const cat = await onNewCategory(newCat.trim());
      setForm(prev => ({ ...prev, category_id: cat.id }));
      setNewCat('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingCat(false);
    }
  }

  async function handleSubmit() {
    if (!form.name.trim())         { setError('Nombre requerido'); return; }
    if (!form.price_bs || Number(form.price_bs) <= 0) { setError('Precio inválido'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        price_bs:    Number(form.price_bs),
        category_id: form.category_id || null,
        images,
      });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEdit ? 'Editar producto' : 'Nuevo producto'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {/* Imágenes */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Imágenes</p>
            <div className={styles.imgGrid}>
              {images.map((img, idx) => (
                <div key={idx} className={`${styles.imgThumb} ${img.is_primary ? styles.imgPrimary : ''}`}>
                  <img src={img.url} alt="" />
                  <div className={styles.imgOverlay}>
                    {!img.is_primary && (
                      <button className={styles.imgBtn} onClick={() => setPrimary(idx)} title="Principal">★</button>
                    )}
                    <button className={styles.imgBtn} onClick={() => removeImage(idx)} title="Eliminar">✕</button>
                  </div>
                  {img.is_primary && <span className={styles.primaryTag}>Principal</span>}
                </div>
              ))}

              {images.length < 5 && (
                <button
                  className={styles.addImg}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? '⏳' : '+'}
                  <span>{uploading ? 'Subiendo...' : 'Agregar'}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className={styles.fileInput} onChange={handleFile} />
          </div>

          {/* Nombre */}
          <label className={styles.label}>
            Nombre del producto
            <input
              className={styles.input}
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Camiseta polo blanca"
              maxLength={120}
            />
          </label>

          {/* Precio */}
          <label className={styles.label}>
            Precio (Bs)
            <div className={styles.prefixWrap}>
              <span className={styles.prefix}>Bs</span>
              <input
                className={`${styles.input} ${styles.inputPrefixed}`}
                name="price_bs"
                value={form.price_bs}
                onChange={handleChange}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.50"
              />
            </div>
          </label>

          {/* Descripción */}
          <label className={styles.label}>
            Descripción <span className={styles.optional}>(opcional)</span>
            <textarea
              className={styles.textarea}
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe el producto brevemente..."
              rows={3}
              maxLength={500}
            />
          </label>

          {/* Categoría */}
          <label className={styles.label}>
            Categoría <span className={styles.optional}>(opcional)</span>
            <select
              className={styles.input}
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
            >
              <option value="">Sin categoría</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          {/* Nueva categoría inline */}
          <div className={styles.newCatRow}>
            <input
              className={styles.input}
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              placeholder="Nueva categoría..."
              onKeyDown={e => e.key === 'Enter' && handleAddCat()}
            />
            <button
              className="btn btn-ghost"
              onClick={handleAddCat}
              disabled={addingCat || !newCat.trim()}
            >
              {addingCat ? '...' : '+ Crear'}
            </button>
          </div>

          {/* Disponibilidad */}
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              name="is_available"
              checked={form.is_available}
              onChange={handleChange}
            />
            Disponible para la venta
          </label>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}
