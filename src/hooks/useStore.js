// src/hooks/useStore.js
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useStore() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [store, setStore]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }
    fetchStore();
  }, [isLoaded, isSignedIn]);

  async function fetchStore() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res   = await fetch('/api/stores?me=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) { setStore(null); return; }
      if (!res.ok) throw new Error('Error al cargar la tienda');
      const data = await res.json();
      setStore(data.store);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function crearTienda(payload) {
    const token = await getToken();
    const res   = await fetch('/api/stores', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear la tienda');
    setStore(data.store);
    return data.store;
  }

  return { store, loading, error, crearTienda, refetch: fetchStore };
}
