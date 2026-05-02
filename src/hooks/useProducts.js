// src/hooks/useProducts.js
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useProducts() {
  const { getToken } = useAuth();
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products',   { headers }),
        fetch('/api/categories', { headers }),
      ]);
      if (!prodRes.ok) throw new Error('Error al cargar productos');
      if (!catRes.ok)  throw new Error('Error al cargar categorías');
      const [prodData, catData] = await Promise.all([prodRes.json(), catRes.json()]);
      setProducts(prodData.products);
      setCategories(catData.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function crearProducto(payload) {
    const token = await getToken();
    const res   = await fetch('/api/products', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear producto');
    setProducts(prev => [data.product, ...prev]);
    return data.product;
  }

  async function editarProducto(payload) {
    const token = await getToken();
    const res   = await fetch('/api/products', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al editar producto');
    setProducts(prev => prev.map(p => p.id === data.product.id ? { ...p, ...data.product } : p));
    return data.product;
  }

  async function eliminarProducto(id) {
    const token = await getToken();
    const res   = await fetch(`/api/products?id=${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar producto');
    setProducts(prev => prev.filter(p => p.id !== id));
  }

  async function crearCategoria(name) {
    const token = await getToken();
    const res   = await fetch('/api/categories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear categoría');
    setCategories(prev => [...prev, data.category]);
    return data.category;
  }

  async function subirImagen(file) {
    const token  = await getToken();
    const base64 = await fileToBase64(file);
    const res    = await fetch('/api/upload-image', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ file: base64 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
    return data;
  }

  return { products, categories, loading, error, crearProducto, editarProducto, eliminarProducto, crearCategoria, subirImagen, refetch: fetchAll };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
