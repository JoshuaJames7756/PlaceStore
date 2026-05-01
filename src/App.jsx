// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

// Pages
import HomePage         from './pages/HomePage.jsx';
import FeedPage         from './pages/FeedPage.jsx';
import StorePage        from './pages/StorePage.jsx';
import OnboardingPage   from './pages/OnboardingPage.jsx';
import DashboardPage    from './pages/DashboardPage.jsx';
import ProductsPage     from './pages/ProductsPage.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';
import AdminPage        from './pages/AdminPage.jsx';
import NotFoundPage     from './pages/NotFoundPage.jsx';

// Guarda de ruta autenticada
function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/"              element={<HomePage />} />
        <Route path="/feed"          element={<FeedPage />} />
        <Route path="/tienda/:slug"  element={<StorePage />} />

        {/* /p/:id es interceptada por vercel.json → Edge Function OG */}
        {/* Solo llega aquí si el usuario navega directamente desde la SPA */}
        <Route path="/p/:id" element={<Navigate to="/" replace />} />

        {/* Autenticadas */}
        <Route path="/registro" element={
          <ProtectedRoute><OnboardingPage /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/dashboard/productos" element={
          <ProtectedRoute><ProductsPage /></ProtectedRoute>
        } />
        <Route path="/dashboard/suscripcion" element={
          <ProtectedRoute><SubscriptionPage /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><AdminPage /></ProtectedRoute>
        } />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
