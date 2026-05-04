// src/pages/HomePage.jsx
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import styles from './HomePage.module.css';

const FEATURES = [
  {
    icon: '📦',
    title: 'Catálogo sin límites',
    desc: 'Sube todos tus productos con fotos, precios y categorías. Sin restricciones.',
  },
  {
    icon: '💬',
    title: 'Venta directa a WhatsApp',
    desc: 'Cada producto tiene un botón que lleva al cliente directo a tu WhatsApp.',
  },
  {
    icon: '🔗',
    title: 'Tu link propio',
    desc: 'placestore.app/tienda/tu-negocio — compártelo en Instagram, Facebook o donde quieras.',
  },
  {
    icon: '📊',
    title: 'Estadísticas reales',
    desc: 'Ve cuántas veces vieron tus productos y cuáles generan más interés.',
  },
];

const STEPS = [
  { n: '01', title: 'Crea tu tienda', desc: 'Nombre, ciudad y número de WhatsApp. Listo en 2 minutos.' },
  { n: '02', title: 'Sube tus productos', desc: 'Fotos, precio y descripción. Organiza por categorías.' },
  { n: '03', title: 'Comparte y vende', desc: 'Manda tu link por WhatsApp o ponlo en tu bio de Instagram.' },
];

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroRef.current) {
            const y = window.scrollY;
            heroRef.current.style.setProperty('--scroll-y', `${y * 0.25}px`);
          }
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleCTA() {
    if (isSignedIn) navigate('/dashboard');
  }

  return (
    <div className={styles.page}>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.navBrand}>PlaceStore</span>
          <div className={styles.navRight}>
            <Link to="/feed" className={styles.navLink}>Explorar</Link>
            {isSignedIn ? (
              <Link to="/dashboard" className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                Mi panel →
              </Link>
            ) : (
              <SignInButton mode="modal">
                <button className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
                  Crear mi tienda
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.heroDot} />
          <div className={styles.heroDot} />
        </div>

        {/* heroInner centra el grid sin romper el fondo full-width */}
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <div className={styles.heroBadge}>
              <span className={styles.badgeIcon}>🇧🇴</span> Hecho para negocios bolivianos
            </div>
            <h1 className={styles.heroTitle}>
              Tu catálogo online.<br />
              <span className={styles.heroAccent}>Tus clientes en WhatsApp.</span>
            </h1>
            <p className={styles.heroDesc}>
              Crea tu vitrina digital en minutos. Comparte tu link y recibe pedidos
              directamente por WhatsApp, sin comisiones ni complicaciones.
            </p>
            <div className={styles.heroCTAs}>
              {isSignedIn ? (
                <button className={`btn btn-primary ${styles.ctaMain}`} onClick={handleCTA}>
                  Ir a mi panel →
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className={`btn btn-primary ${styles.ctaMain}`}>
                    Empieza gratis — 30 días
                  </button>
                </SignInButton>
              )}
              <Link to="/feed" className={`btn btn-ghost ${styles.ctaSecondary}`}>
                Ver catálogos
              </Link>
            </div>
            <p className={styles.heroSub}>Sin tarjeta de crédito · Bs 70/mes después del trial</p>
          </div>

          <div className={styles.heroMock} aria-hidden="true">
            <div className={styles.mockPhone}>
              <div className={styles.mockBar} />
              <div className={styles.mockStore}>
                <div className={styles.mockLogo} />
                <div className={styles.mockStoreName} />
              </div>
              <div className={styles.mockGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.mockCard}>
                    <div className={styles.mockImg} style={{ animationDelay: `${i * 0.1}s` }} />
                    <div className={styles.mockName} />
                    <div className={styles.mockPrice} />
                    <div className={styles.mockBtn} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Todo lo que tu negocio necesita</h2>
          <div className={styles.featuresGrid}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIconContainer}>
                  <span className={styles.featureIcon}>{f.icon}</span>
                </div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className={styles.howto}>
        <div className={styles.sectionInner}>
          <div className={styles.centeredHeader}>
            <h2 className={styles.sectionTitle}>¿Cómo funciona?</h2>
            <p className={styles.sectionSubtitle}>Tres pasos para digitalizar tu negocio hoy mismo.</p>
          </div>
          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <div key={s.n} className={styles.step}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepNum}>{s.n}</div>
                  {i < STEPS.length - 1 && <div className={styles.stepConnector} />}
                </div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Un precio. Sin sorpresas.</h2>
          <div className={styles.priceCard}>
            <div className={styles.priceLeft}>
              <p className={styles.planLabel}>Plan Profesional</p>
              <p className={styles.planPrice}>Bs 70 <span>/mes</span></p>
              <p className={styles.planTrial}>Prueba gratuita de 30 días</p>
            </div>
            <ul className={styles.priceFeatures}>
              <li><span className={styles.check}>✓</span> Productos ilimitados</li>
              <li><span className={styles.check}>✓</span> Imágenes en alta calidad</li>
              <li><span className={styles.check}>✓</span> Pedidos directo a WhatsApp</li>
              <li><span className={styles.check}>✓</span> Link personalizado</li>
              <li><span className={styles.check}>✓</span> Panel de estadísticas</li>
            </ul>
            <div className={styles.priceAction}>
              {isSignedIn ? (
                <button className={`btn btn-primary ${styles.priceCTA}`} onClick={handleCTA}>
                  Ir a mi panel →
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className={`btn btn-primary ${styles.priceCTA}`}>
                    Empezar gratis
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerInfo}>
            <span className={styles.footerBrand}>PlaceStore</span>
            <p className={styles.footerText}>Impulsando el comercio digital en Bolivia.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/feed" className={styles.footerLink}>Explorar tiendas</Link>
            <span className={styles.footerCredit}>© 2026 JVSoftware</span>
          </div>
        </div>
      </footer>

    </div>
  );
}