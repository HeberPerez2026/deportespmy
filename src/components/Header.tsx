import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  ShieldCheck, 
  Star, 
  Menu, 
  X, 
  RefreshCw, 
  MapPin, 
  Layers,
  Lock,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onOpenAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAdminLogin }) => {
  const { 
    activeTab, 
    setActiveTab, 
    isSyncing, 
    cloudConnected,
    isAdminAuthenticated,
    logoutAdmin,
    refreshFromCloud
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      
      {/* Top micro-bar with location, domain & live cloud sync */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs text-slate-400 border-b border-slate-800/80 flex flex-wrap justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <MapPin className="w-3.5 h-3.5" />
            Puerto Madryn, Chubut • Blvd. Brown 1420
          </span>
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <span className="hidden sm:inline-block text-slate-400 font-mono">
            deportespmy.com.ar
          </span>
        </div>

        {/* Live Cloud DB Sync Badge */}
        <div className="flex items-center gap-2 ml-auto">
          <button 
            onClick={() => refreshFromCloud()}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-750 text-[11px] cursor-pointer transition-colors"
            title="Sincronización en tiempo real con la nube"
          >
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : cloudConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-slate-300">
              {isSyncing ? 'Sincronizando...' : cloudConnected ? 'Nube en Tiempo Real' : 'Modo Offline'}
            </span>
            <RefreshCw className={`w-2.5 h-2.5 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleNavClick('turnos')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <span className="text-xl font-black text-white tracking-tighter">PMY</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-extrabold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                    Deportes<span className="text-emerald-400">PMY</span>
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/30">
                    Turnos
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                  Reserva Online de Canchas
                </p>
              </div>
            </button>
          </div>

          {/* Player Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => handleNavClick('turnos')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'turnos' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Reservar Turno
            </button>

            <button
              onClick={() => handleNavClick('canchas')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'canchas' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Nuestras Canchas
            </button>

            <button
              onClick={() => handleNavClick('valoraciones')}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'valoraciones' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Opiniones
            </button>
          </nav>

          {/* Top Right Action: Admin Login Button */}
          <div className="flex items-center gap-3">
            
            {isAdminAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('admin')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-slate-800 text-blue-300 hover:bg-slate-750 border border-blue-500/30'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Panel Administrador</span>
                </button>

                <button
                  onClick={logoutAdmin}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
                  title="Cerrar Sesión Administrador"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" />
                <span>Acceso Administrador</span>
              </button>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => handleNavClick('turnos')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'turnos' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            Reservar Turnos
          </button>

          <button
            onClick={() => handleNavClick('canchas')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'canchas' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            Nuestras Canchas
          </button>

          <button
            onClick={() => handleNavClick('valoraciones')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'valoraciones' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Opiniones de Jugadores
          </button>

          <div className="pt-2 border-t border-slate-800">
            {isAdminAuthenticated ? (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white flex items-center gap-2.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Panel de Administración
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdminLogin();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-blue-300 bg-slate-800 flex items-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                Acceso Administrador
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
