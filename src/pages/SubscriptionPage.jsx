// src/pages/SubscriptionPage.jsx
import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useStore } from '../hooks/useStore.js';
import styles from './SubscriptionPage.module.css';

const PRECIO_BS = 70;
const QR_URL = 'https://res.cloudinary.com/jvsoftware/image/upload/v1777738268/QR_crcgcx.jpg';

export default function SubscriptionPage() {
  const { getToken } = useAuth();
  const { store, loading } = useStore();

  const [step, setStep]               = useState('info');
  const [method, setMethod]           = useState('qr');
  const [reference, setReference]     = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [sending, setSending]         = useState(false);
  const [error, setError]             = useState('');

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.loaderContainer}>
        <span className={styles.spinner} />
        <p>Cargando suscripción...</p>
      </div>
    </div>
  );

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
        const upRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ file: base64 }),
        });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir comprobante');
        receipt_url = upData.url;
      }
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ method, reference: reference.trim(), receipt_url, amount_bs: PRECIO_BS }),
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
        <div className={styles.headerSection}>
          <h1 className={styles.title}>Suscripción</h1>
          <p className={styles.subtitle}>Gestiona tu plan y mantén tu catálogo activo</p>
        </div>

        <div className={styles.statusCard}>
          <div className={styles.statusFlex}>
            <StatusBadge status={subStatus} />
            <div className={styles.statusInfo}>
              {subStatus === 'trial' && (
                <p>Período de prueba — quedan <strong>{diasRestantes} día{diasRestantes !== 1 ? 's' : ''}</strong></p>
              )}
              {subStatus === 'active' && (
                <p>Tu plan está activo. Vence el <strong>{new Date(store.sub_expires_at).toLocaleDateString('es-BO')}</strong></p>
              )}
              {subStatus === 'expired' && (
                <p>Tu suscripción venció. Tu catálogo no está visible hasta que renueves.</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.planCard}>
          <div className={styles.premiumLabel}>PLAN RECOMENDADO</div>
          <div className={styles.planHeader}>
            <div>
              <p className={styles.planName}>Plan Básico Pro</p>
              <p className={styles.planDesc}>Todo lo que necesitas para vender por WhatsApp</p>
            </div>
            <div className={styles.planPrice}>
              <span className={styles.priceAmount}>Bs {PRECIO_BS}</span>
              <span className={styles.pricePeriod}>/mes</span>
            </div>
          </div>
          <ul className={styles.features}>
            <li><CheckIcon /> Productos ilimitados con imágenes</li>
            <li><CheckIcon /> Categorías personalizadas</li>
            <li><CheckIcon /> Link directo a WhatsApp por producto</li>
            <li><CheckIcon /> Vitrina pública con tu URL propia</li>
            <li><CheckIcon /> Estadísticas de vistas</li>
          </ul>
        </div>

        {step === 'info' && (
          <div className={styles.payCard}>
            <p className={styles.payTitle}>Métodos de pago</p>
            <p className={styles.payDesc}>
              Realiza el pago de <strong>Bs {PRECIO_BS}</strong> por QR o transferencia bancaria, 
              luego envíanos el comprobante y activamos tu plan en menos de 24 horas.
            </p>
            
            <div className={styles.payMethods}>
              <div className={styles.payMethod}>
                <div className={styles.methodHeader}>
                  <strong>QR (BCP)</strong>
                  <span className={styles.methodBadge}>Instantáneo</span>
                </div>
                <div className={styles.qrContainer}>
                  <a href={QR_URL} download="qr-placestore.jpg" target="_blank" rel="noreferrer">
                    <img src={QR_URL} alt="QR de pago" className={styles.qrImage} />
                  </a>
                  <a href={QR_URL} download="qr-placestore.jpg" target="_blank" rel="noreferrer" className={styles.downloadLink}>
                    <span>⬇</span> Descargar QR
                  </a>
                </div>
                <span className={styles.helperText}>Escanea con tu app bancaria</span>
              </div>

              <div className={styles.payMethod}>
                <div className={styles.methodHeader}>
                  <strong>Transferencia</strong>
                </div>
                <div className={styles.bankDetails}>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Banco:</span>
                    <span className={styles.bankValue}>BCP</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Cuenta:</span>
                    <span className={styles.bankValue}>30151429551323</span>
                  </div>
                  <div className={styles.bankRow}>
                    <span className={styles.bankLabel}>Titular:</span>
                    <span className={styles.bankValue}>Joshua - JVSoftware</span>
                  </div>
                </div>
                <p className={styles.helperText}>Copia los datos para tu transferencia</p>
              </div>
            </div>

            <button className={`${styles.actionBtn} btn btn-primary`} onClick={() => setStep('form')}>
              Ya realicé el pago <span className={styles.arrowIcon}>→</span>
            </button>
          </div>
        )}

        {step === 'form' && (
          <div className={`${styles.payCard} ${styles.formAnimation}`}>
            <div className={styles.formHeader}>
              <button className={styles.backBtn} onClick={() => setStep('info')}>← Volver</button>
              <p className={styles.payTitle}>Confirmar Pago</p>
            </div>
            
            <div className={styles.formGrid}>
              <label className={styles.label}>
                Método de pago
                <select className={styles.input} value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="qr">QR Bancario</option>
                  <option value="bank_transfer">Transferencia bancaria</option>
                </select>
              </label>

              <label className={styles.label}>
                Número de referencia
                <input
                  className={styles.input}
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Ej: 4521873"
                />
              </label>

              <label className={styles.label}>
                Comprobante <span className={styles.optional}>(Recomendado)</span>
                <div className={styles.fileUploadWrapper}>
                  <input
                    type="file"
                    id="receipt"
                    accept="image/*"
                    className={styles.fileInputHidden}
                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="receipt" className={styles.fileLabel}>
                    {receiptFile ? '🖼️ Imagen seleccionada' : '📁 Subir captura de pantalla'}
                  </label>
                  {receiptFile && <span className={styles.fileName}>{receiptFile.name}</span>}
                </div>
              </label>
            </div>

            {error && <div className={styles.error}><AlertIcon /> {error}</div>}
            
            <button 
              className={`${styles.actionBtn} btn btn-primary`} 
              onClick={handleEnviar} 
              disabled={sending}
            >
              {sending ? (
                <><span className={styles.miniSpinner}></span> Enviando...</>
              ) : (
                'Finalizar y Enviar'
              )}
            </button>
          </div>
        )}

        {step === 'sent' && (
          <div className={`${styles.sentCard} ${styles.formAnimation}`}>
            <div className={styles.sentIconWrapper}>
              <div className={styles.checkRing}></div>
              <span className={styles.sentIcon}>✓</span>
            </div>
            <h2 className={styles.sentTitle}>¡Recibido!</h2>
            <p className={styles.sentText}>
              Validaremos tu pago en menos de 24 horas. Recibirás una notificación cuando tu plan esté activo.
            </p>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>Regresar al inicio</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    trial:   { label: 'Prueba gratuita', cls: 'badgeTrial' },
    active:  { label: 'Cuenta Activa',   cls: 'badgeActive' },
    expired: { label: 'Vencido',         cls: 'badgeExpired' },
  };
  const { label, cls } = map[status] || map.expired;
  return <span className={`${styles.badge} ${styles[cls]}`}>{label}</span>;
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={styles.checkIcon}>
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
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