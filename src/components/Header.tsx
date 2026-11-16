import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAdminLogin }) => {
  const {
    activeTab,
    setActiveTab,
    isAdminAuthenticated,
    logoutAdmin,
    setSelectedEstablishmentKey,
  } = useApp();

  const handleGoHome = () => {
    setSelectedEstablishmentKey(null);
    setActiveTab('turnos');
  };

  const handleAdminAction = () => {
    if (isAdminAuthenticated && activeTab === 'admin') {
      logoutAdmin();
      return;
    }
    if (isAdminAuthenticated) {
      setActiveTab('admin');
      return;
    }
    onOpenAdminLogin();
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090D12]/95 backdrop-blur-md border-b border-[#2A313C] text-[#F3F4F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo mejorado + DeportesPMY */}
        <button
          type="button"
          onClick={handleGoHome}
          className="flex items-center gap-3 text-left cursor-pointer group shrink-0 focus:outline-none"
        >
          <span className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 transition-transform duration-200 group-hover:scale-105"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="dpmyShieldGrad" x1="4" y1="4" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="var(--accent-bright)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
              </defs>
              {/* Escudo atlético angular */}
              <path
                d="M22 2.5L38.5 8.2V21.5C38.5 31.2 31.3 38.4 22 41.5C12.7 38.4 5.5 31.2 5.5 21.5V8.2L22 2.5Z"
                fill="#161B22"
                stroke="url(#dpmyShieldGrad)"
                strokeWidth="2.4"
              />
              {/* Campo deportivo estilizado interior */}
              <rect
                x="11.5"
                y="12"
                width="21"
                height="16.5"
                rx="3"
                stroke="url(#dpmyShieldGrad)"
                strokeWidth="1.75"
                opacity="0.9"
              />
              {/* Línea de mediocampo y círculo central */}
              <line
                x1="22"
                y1="12"
                x2="22"
                y2="28.5"
                stroke="url(#dpmyShieldGrad)"
                strokeWidth="1.5"
                opacity="0.75"
              />
              <circle
                cx="22"
                cy="20.25"
                r="3.2"
                fill="url(#dpmyShieldGrad)"
              />
              {/* Destello de movimiento */}
              <path
                d="M15 33.2L22 36L29 33.2"
                stroke="var(--accent-bright)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="font-heading text-xl sm:text-[22px] font-extrabold tracking-tight text-white">
            Deportes<span style={{ color: 'var(--accent-bright)' }}>PMY</span>
          </span>
        </button>

        {/* Único botón derecho: Acceso Administrador / Cerrar Sesión */}
        <button
          type="button"
          onClick={handleAdminAction}
          className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
            isAdminAuthenticated && activeTab === 'admin'
              ? 'bg-rose-500/15 hover:bg-rose-600 text-rose-200 hover:text-white border-rose-500/40'
              : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] border-transparent shadow-sm'
          }`}
        >
          {isAdminAuthenticated && activeTab === 'admin' ? (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>{isAdminAuthenticated ? 'Panel Administrador' : 'Acceso Administrador'}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
