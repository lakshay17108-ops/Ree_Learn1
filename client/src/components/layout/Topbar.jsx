import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Topbar = ({ title, onMenuClick, menuOpen = false }) => {
  const { user } = useAuth();
  
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls="main-navigation" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 sm:block">{user?.name}</span>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
};
