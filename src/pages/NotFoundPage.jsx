// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <p className={styles.icon}>🔦</p>
          <div className={styles.pulse} />
        </div>
        
        <h1 className={styles.title}>Página no encontrada</h1>
        
        <p className={styles.description}>
          Esta URL no existe o la tienda no está activa. 
          Verifica el enlace o regresa al inicio.
        </p>
        
        <Link to="/" className={`btn btn-primary ${styles.homeBtn}`}>
          Ir al inicio
        </Link>

        <div className={styles.footerBrand}>
          PlaceStore by <span className={styles.brand}>JVSoftware</span>
        </div>
      </div>
    </div>
  );
}