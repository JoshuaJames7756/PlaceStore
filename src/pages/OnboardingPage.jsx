// src/pages/OnboardingPage.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../hooks/useStore.js';
import styles from './OnboardingPage.module.css';

const CIUDADES = [
  'Cochabamba', 'Santa Cruz', 'La Paz', 'Oruro',
  'Potosí', 'Sucre', 'Tarija', 'Beni', 'Pando',
];

const STEPS = ['Tu tienda', 'Contacto', 'Listo'];

export default function OnboardingPage() {
  const navigate        = useNavigate();
  const { crearTienda } = useStore();
  const { getToken }    = useAuth();
  const fileRef         = useRef(null);

  const [step, setStep]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [logoPreview, setLogoPreview] = useState(null);

  const [form, setForm] = useState({
    store_name:      '',
    location_city:   '',
    whatsapp_number: '',
    logo_url:        '',
  });

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5MB'); return; }

    setUploading(true);
    setError('');
    try {
      const base64 = await fileToBase64(file);
      const token  = await getToken();
      const res    = await fetch('/api/upload-image', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ file: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
      setForm(prev => ({ ...prev, logo_url: data.url }));
      setLogoPreview(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function validarStep0() {
    if (!form.store_name.trim()) return 'Ingresa el nombre de tu tienda';
    if (!form.location_city)     return 'Selecciona tu ciudad';
    return null;
  }

  function validarStep1() {
    const digits = form.whatsapp_number.replace(/\D/g, '');
    if (!digits)           return 'Ingresa tu número de WhatsApp';
    if (digits.length < 8) return 'Número demasiado corto';
    return null;
  }

  function avanzar() {
    const err = step === 0 ? validarStep0() : validarStep1();
    if (err) { setError(err); return; }
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    const err = validarStep1();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await crearTienda(form);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.header}>
          <span className={styles.logo}>PlaceStore</span>
          <p className={styles.subtitle}>Configura tu vitrina en 2 minutos</p>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((label, i) => (
            <div key={label} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${i <= step ? styles.dotActive : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${i === step ? styles.labelActive : ''}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`${styles.stepLine} ${i < step ? styles.lineActive : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Paso 0 */}
        {step === 0 && (
          <div className={styles.fields}>
            <label className={styles.label}>
              Nombre de tu tienda
              <input
                className={styles.input}
                name="store_name"
                value={form.store_name}
                onChange={handleChange}
                placeholder="Ej: Importadora Fernández"
                maxLength={80}
                autoFocus
              />
            </label>

            <label className={styles.label}>
              Ciudad
              <select
                className={styles.input}
                name="location_city"
                value={form.location_city}
                onChange={handleChange}
              >
                <option value="">Selecciona tu ciudad</option>
                {CIUDADES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button className={`btn btn-primary ${styles.btnFull}`} onClick={avanzar}>
              Continuar →
            </button>
          </div>
        )}

        {/* Paso 1 */}
        {step === 1 && (
          <div className={styles.fields}>
            <label className={styles.label}>
              Número de WhatsApp
              <div className={styles.prefixWrap}>
                <span className={styles.prefix}>+591</span>
                <input
                  className={`${styles.input} ${styles.inputPrefixed}`}
                  name="whatsapp_number"
                  value={form.whatsapp_number}
                  onChange={handleChange}
                  placeholder="70000000"
                  type="tel"
                  maxLength={15}
                  autoFocus
                />
              </div>
              <small className={styles.hint}>Los clientes te escribirán a este número</small>
            </label>

            {/* Logo picker */}
            <div className={styles.label}>
              <span>Logo de tu tienda <span className={styles.optional}>(opcional)</span></span>
              <div className={styles.logoPicker} onClick={() => fileRef.current?.click()}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className={styles.logoPreview} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    {uploading ? <span className={styles.uploadSpinner} /> : <span>＋ Subir logo</span>}
                  </div>
                )}
                {logoPreview && !uploading && (
                  <div className={styles.logoOverlay}>Cambiar</div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoFile}
              />
              <small className={styles.hint}>También puedes agregarlo desde tu panel</small>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.btnRow}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Atrás</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || uploading}>
                {loading ? 'Creando...' : 'Crear mi tienda'}
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: éxito */}
        {step === 2 && (
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <h2 className={styles.successTitle}>¡Tu tienda está lista!</h2>
            <p className={styles.successText}>
              Tienes <strong>7 días gratis</strong> para explorar PlaceStore.
              Agrega tus productos y empieza a vender por WhatsApp.
            </p>
            <button
              className={`btn btn-primary ${styles.btnFull}`}
              onClick={() => navigate('/dashboard/productos')}
            >
              Agregar mis productos →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej(new Error('Error al leer archivo'));
    r.readAsDataURL(file);
  });
}
