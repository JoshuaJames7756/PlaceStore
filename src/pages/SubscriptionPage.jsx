// src/pages/SubscriptionPage.jsx
import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../hooks/useStore.js';
import styles from './SubscriptionPage.module.css';

const PRECIO_BS = 50;

export default function SubscriptionPage() {
  const { getToken } = useAuth();
  const { store, loading } = useStore();

  const [step, setStep]           = useState('info');
  const [method, setMethod]       = useState('tigo_money');
  const [reference, setReference] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState('');

  if (loading) return <div className={styles.center}><span className={styles.spinner} /></div>;

  const subStatus     = store?.sub_status || (store?.is_active ? 'trial' : 'expired');
  const diasRestantes = store?.trial_expires
    ? Math.max(0, Math.ceil((new Date(store.trial_expires) - Date.now()) / 86400000))
    : null;

  async function handleEnviar() {
    if (!reference.trim()) { setError('Ingresa el número de referencia'); return; }
    setSending(true);
    setError('');
    try {
      const token = await getToken();
      let receipt_url = null;
      if (receiptFile) {
        const base64 = await fileToBase64(receiptFile);
        const upRes  = await fetch('/api/upload-image', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ file: base64 }),
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir comprobante');
        receipt_url = upData.url;
      }
      const res = await fetch('/api/payments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ method, reference: reference.trim(), receipt_url, amount_bs: PRECIO_BS }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar pago');
      setStep('sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Mi suscripción</h1>

        <div className={styles.statusCard}>
          <StatusBadge status={subStatus} />
          <div className={styles.statusInfo}>
            {subStatus === 'trial'   && <p>Período de prueba — quedan <strong>{diasRestantes} día{diasRestantes !== 1 ? 's' : ''}</strong></p>}
            {subStatus === 'active'  && <p>Tu plan está activo. Vence el <strong>{new Date(store.sub_expires_at).toLocaleDateString('es-BO')}</strong></p>}
            {subStatus === 'expired' && <p>Tu suscripción venció. Tu catálogo no está visible hasta que renueves.</p>}
          </div>
        </div>

        <div className={styles.planCard}>
          <div className={styles.planHeader}>
            <div>
              <p className={styles.planName}>Plan Básico</p>
              <p className={styles.planDesc}>Catálogo ilimitado · WhatsApp directo · Sin comisiones</p>
            </div>
            <div className={styles.planPrice}>
              <span className={styles.priceAmount}>Bs {PRECIO_BS}</span>
              <span className={styles.pricePeriod}>/mes</span>
            </div>
          </div>
          <ul className={styles.features}>
            <li>✓ Productos ilimitados con imágenes</li>
            <li>✓ Categorías personalizadas</li>
            <li>✓ Link directo a WhatsApp por producto</li>
            <li>✓ Vitrina pública con tu URL propia</li>
            <li>✓ Estadísticas de vistas</li>
          </ul>
        </div>

        {step === 'info' && (
          <div className={styles.payCard}>
            <p className={styles.payTitle}>¿Cómo pagar?</p>
            <p className={styles.payDesc}>Realiza el pago de <strong>Bs {PRECIO_BS}</strong> por Tigo Money o transferencia bancaria, luego envíanos el comprobante y activamos tu plan en menos de 24 horas.</p>
            <div className={styles.payMethods}>
              <div className={styles.payMethod}>
                <strong>Tigo Money</strong>
                <span>Número: <strong>7XXXXXXX</strong></span>
                <span>Titular: PlaceStore</span>
              </div>
              <div className={styles.payMethod}>
                <strong>Transferencia bancaria</strong>
                <span>Banco: BCP · Cuenta: XXXXXXXXXX</span>
                <span>Titular: PlaceStore</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => setStep('form')}>Ya realicé el pago →</button>
          </div>
        )}

        {step === 'form' && (
          <div className={styles.payCard}>
            <p className={styles.payTitle}>Enviar comprobante</p>
            <label className={styles.label}>
              Método de pago
              <select className={styles.input} value={method} onChange={e => setMethod(e.target.value)}>
                <option value="tigo_money">Tigo Money</option>
                <option value="bank_transfer">Transferencia bancaria</option>
              </select>
            </label>
            <label className={styles.label}>
              Número de referencia / transacción
              <input className={styles.input} value={reference} onChange={e => setReference(e.target.value)} placeholder="Ej: 4521873" />
            </label>
            <label className={styles.label}>
              Foto del comprobante <span className={styles.optional}>(recomendado)</span>
              <input type="file" accept="image/*" className={styles.fileInput} onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
              {receiptFile && <span className={styles.fileName}>{receiptFile.name}</span>}
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.formBtns}>
              <button className="btn btn-ghost" onClick={() => setStep('info')}>← Atrás</button>
              <button className="btn btn-primary" onClick={handleEnviar} disabled={sending}>
                {sending ? 'Enviando...' : 'Enviar comprobante'}
              </button>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div className={styles.sentCard}>
            <div className={styles.sentIcon}>✅</div>
            <h2 className={styles.sentTitle}>¡Comprobante recibido!</h2>
            <p className={styles.sentText}>Revisaremos tu pago y activaremos tu plan en menos de 24 horas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { trial: { label: 'Prueba gratuita', cls: 'badgeTrial' }, active: { label: 'Activo', cls: 'badgeActive' }, expired: { label: 'Vencido', cls: 'badgeExpired' } };
  const { label, cls } = map[status] || map.expired;
  return <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>;
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej(new Error('Error al leer archivo'));
    r.readAsDataURL(file);
  });
}
