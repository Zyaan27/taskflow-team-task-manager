import { useState } from 'react';

// Modal
export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-ink-800 border border-ink-600 rounded-2xl shadow-2xl w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-600">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors w-7 h-7 flex items-center justify-center rounded-md hover:bg-ink-600"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// Status Badge
export const StatusBadge = ({ status }) => {
  const styles = {
    todo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    in_progress: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    done: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
  };
  const labels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
  return (
    <span className={`badge border ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  );
};

// Priority Badge
export const PriorityBadge = ({ priority }) => {
  const styles = {
    low: 'bg-sky-400/20 text-sky-300 border-sky-400/30',
    medium: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    high: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
  };
  return (
    <span className={`badge border ${styles[priority] || styles.medium}`}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  );
};

// Role Badge
export const RoleBadge = ({ role }) => (
  <span className={`badge border ${
    role === 'admin'
      ? 'bg-violet-400/20 text-violet-300 border-violet-400/30'
      : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }`}>
    {role?.charAt(0).toUpperCase() + role?.slice(1)}
  </span>
);

// Error message
export const ErrorMsg = ({ error }) => {
  if (!error) return null;
  const msg = error?.response?.data?.message
    || error?.response?.data?.errors?.[0]?.msg
    || error?.message
    || 'Something went wrong';
  return (
    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm px-4 py-3 rounded-lg">
      {msg}
    </div>
  );
};

// Loading spinner
export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <div className={`${sizes[size]} rounded-full border-2 border-violet-500 border-t-transparent animate-spin`} />
  );
};

// Empty state
export const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="text-4xl mb-4 opacity-50">{icon}</div>
    <h3 className="text-slate-200 font-medium text-lg mb-1">{title}</h3>
    {description && <p className="text-slate-500 text-sm mb-5 max-w-xs">{description}</p>}
    {action}
  </div>
);

// Confirm dialog
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, danger = true }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <p className="text-slate-400 text-sm mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <button onClick={onClose} className="btn-secondary">Cancel</button>
      <button
        onClick={() => { onConfirm(); onClose(); }}
        className={danger ? 'btn-danger' : 'btn-primary'}
      >
        Confirm
      </button>
    </div>
  </Modal>
);

// Select dropdown
export const Select = ({ value, onChange, options, className = '' }) => (
  <select
    value={value}
    onChange={onChange}
    className={`input ${className}`}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// Avatar
export const Avatar = ({ name, size = 'sm' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  return (
    <div className={`${sizes[size]} rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 font-semibold flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
};
