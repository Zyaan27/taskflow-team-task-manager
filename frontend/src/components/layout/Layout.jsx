import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

const NavItem = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-ink-700'
      }`
    }
  >
    <span className="text-base">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-ink-900 border-r border-ink-600 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-ink-600">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              TF
            </div>
            <span className="font-semibold text-slate-100 tracking-tight">TaskFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-widest px-3 mb-2 mt-1">
            Main
          </p>
          <NavItem to="/dashboard" icon="⬡" label="Dashboard" />
          <NavItem to="/projects" icon="◫" label="Projects" />

          <p className="text-xs font-medium text-slate-600 uppercase tracking-widest px-3 mb-2 mt-4">
            Account
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all w-full text-left"
          >
            <span>↩</span>
            <span>Sign out</span>
          </button>
        </nav>

        {/* User badge */}
        <div className="p-3 border-t border-ink-600">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-violet-500/30 border border-violet-500/50 flex items-center justify-center text-violet-300 font-semibold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
