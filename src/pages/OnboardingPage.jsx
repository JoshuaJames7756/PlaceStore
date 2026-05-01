// src/pages/OnboardingPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

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

  function validarStep0() {
    if (!form.store_name.trim()) return 'Ingresa el nombre de tu tienda';
    if (!form.location_city)     return 'Selecciona tu ciudad';
    return null;
  }

  function validarStep1() {
    const digits = form.whatsapp_number.replace(/\D/g, '');
    if (!digits)        return 'Ingresa tu número de WhatsApp';
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

            <label className={styles.label}>
              Logo de tu tienda <span className={styles.optional}>(opcional)</span>
              <input
                className={styles.input}
                name="logo_url"
                value={form.logo_url}
                onChange={handleChange}
                placeholder="https://... (URL de imagen)"
                type="url"
              />
              <small className={styles.hint}>También puedes agregarlo desde tu panel</small>
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.btnRow}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Atrás</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
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
