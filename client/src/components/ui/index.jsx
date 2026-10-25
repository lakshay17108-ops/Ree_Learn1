import React from 'react';
import { Loader2 } from 'lucide-react';

// Simple class name merger (no external deps)
const cn = (...classes) => classes.filter(Boolean).join(' ');

export const Button = ({ variant = 'primary', size = 'md', loading, disabled, onClick, children, type = 'button', className = '' }) => {
  const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    primary:   'bg-[#4338ca] text-white hover:bg-[#3730a3]',
    secondary: 'bg-white border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8fafc]',
    danger:    'bg-[#dc2626] text-white hover:bg-red-700',
    ghost:     'bg-transparent text-[#4338ca] hover:bg-indigo-50'
  };
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-6 text-base' };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Badge = ({ variant = 'default', children, className = '' }) => {
  const base = 'text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1';
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    danger:  'bg-red-50 text-red-700 border border-red-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    info:    'bg-indigo-50 text-indigo-700 border border-indigo-200'
  };
  return <span className={cn(base, variants[variant], className)}>{children}</span>;
};

export const Card = ({ children, className = '', title, description, action }) => (
  <div className={cn('bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden', className)}>
    {(title || description || action) && (
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
        <div>
          {title && <h3 className="text-base font-semibold text-[#0f172a]">{title}</h3>}
          {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="text-base font-semibold text-[#0f172a]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-4' };
  return <div className={cn('border-[#4338ca] border-t-transparent rounded-full animate-spin', sizes[size], className)} />;
};

export const Table = ({ children, className = '' }) => (
  <div className={cn('w-full overflow-x-auto', className)}>
    <table className="w-full border-collapse">{children}</table>
  </div>
);
export const TableHead     = ({ children }) => <thead className="bg-[#f8fafc]">{children}</thead>;
export const TableBody     = ({ children }) => <tbody>{children}</tbody>;
export const TableRow      = ({ children, className = '' }) => <tr className={cn('hover:bg-[#f8fafc] transition-colors', className)}>{children}</tr>;
export const TableHeaderCell = ({ children, className = '' }) => (
  <th className={cn('px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider', className)}>{children}</th>
);
export const TableCell = ({ children, className = '' }) => (
  <td className={cn('px-4 py-3 text-sm text-[#0f172a] border-t border-[#e2e8f0]', className)}>{children}</td>
);

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'bg-[#4338ca]' }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl shadow-sm p-5 flex items-center gap-4">
    {Icon && (
      <div className={cn('p-2.5 rounded-lg text-white flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
    )}
    <div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-[#0f172a] mt-0.5">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#e2e8f0] rounded-xl bg-[#f8fafc]">
    {Icon && <Icon className="w-12 h-12 text-slate-300 mb-3" />}
    <h3 className="text-base font-semibold text-[#0f172a] mb-1">{title}</h3>
    <p className="text-sm text-slate-500 max-w-sm mb-5">{description}</p>
    {action}
  </div>
);
