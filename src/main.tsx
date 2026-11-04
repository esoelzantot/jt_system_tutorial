import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LanguageProvider } from './i18n/I18nContext';
import './styles/global.css';

// The dashboard (and Firebase Auth) is a separate chunk, so the public site never downloads it.
// It stays in Arabic; the language switcher belongs to the public site.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const isAdminRoute = /^\/admin(\/|$)/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <LanguageProvider>
        <App />
      </LanguageProvider>
    )}
  </StrictMode>,
);
