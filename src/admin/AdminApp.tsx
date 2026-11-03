import { useEffect, useState } from 'react';
import { FeedbackProvider } from './components/feedback';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { watchAdminSession, type AdminSession } from './services/adminAuth';
import { A } from './strings';
import './admin.css';

/** /admin — the login screen until an admin session exists, then the dashboard. */
export default function AdminApp() {
  const [session, setSession] = useState<AdminSession>({ status: 'loading' });

  useEffect(() => {
    document.title = A.pageTitle;
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.append(robots);
    const unsubscribe = watchAdminSession(setSession);
    return () => {
      unsubscribe();
      robots.remove();
    };
  }, []);

  return (
    <FeedbackProvider>
      <div className="adm">
        {session.status === 'loading' && (
          <div className="adm-boot" role="status" aria-label="…">
            <span className="adm-spinner" />
          </div>
        )}
        {session.status === 'signed-out' && <LoginPage />}
        {session.status === 'signed-in' && <Dashboard email={session.email} />}
      </div>
    </FeedbackProvider>
  );
}
