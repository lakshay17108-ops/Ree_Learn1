import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../hooks/useAuth';

export const AppShell = ({ title, children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isTeacher, isPrincipal } = useAuth();
  const homePath = isPrincipal ? '/principal/dashboard' : isTeacher ? '/teacher/dashboard' : '/student/dashboard';

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface">
      <Sidebar isOpen={menuOpen} onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
        <Topbar title={title} menuOpen={menuOpen} onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 p-4 sm:p-6">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 text-xs text-slate-500 sm:px-6">
          <span>© {new Date().getFullYear()} EduTrack</span>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link className="hover:text-brand" to={homePath}>Dashboard</Link>
            <Link className="hover:text-brand" to="/meetings">Meetings</Link>
            <Link className="hover:text-brand" to="/terms">Terms</Link>
            <Link className="hover:text-brand" to="/privacy">Privacy</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
};
