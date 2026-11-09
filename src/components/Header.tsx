import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Calendar, 
  ShieldCheck, 
  Smartphone, 
  Github, 
  MessageCircle, 
  BarChart3, 
  Star, 
  User, 
  Menu, 
  X, 
  RefreshCw, 
  MapPin, 
  Layers
} from 'lucide-react';

interface HeaderProps {
  onOpenGitHubModal: () => void;
  onOpenWhatsAppHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGitHubModal, onOpenWhatsAppHistory }) => {
  const { 
    currentRole, 
    setCurrentRole, 
    activeTab, 
    setActiveTab, 
    isSyncing, 
    lastSyncTime,
    androidViewMode,
    setAndroidViewMode,
    bookings,
    userPhone
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active bookings count for logged in user
  const myActiveBookingsCount = bookings.filter(
    b => b.clientPhone === userPhone && b.status === 'confirmed'
  ).length;

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      {/* Top micro-bar with location, domain & live DB sync */}
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

        <div className="flex items-center gap-3 ml-auto">
          {/* Real-time DB sync badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/90 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="text-slate-300">
              {isSyncing ? 'Sincronizando...' : 'DB Central Online'}
            </span>
            <RefreshCw className={`w-2.5 h-2.5 text-slate-500 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>

          {/* GitHub Pages Host Info */}
          <button 
            onClick={onOpenGitHubModal}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer text-[11px]"
            title="Información de hosting en GitHub y dominio deportespmy.com.ar"
          >
            <Github className="w-3 h-3" />
            <span className="hidden md:inline">Hosting GitHub</span>
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
              className="flex items-center gap-2.5 text-left group focus:outline-none"
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
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                  Canchas & Reservas Puerto Madryn
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => handleNavClick('turnos')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'turnos' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Reservar Turno
            </button>

            <button
              onClick={() => handleNavClick('canchas')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'canchas' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Espacios & Tarifas
            </button>

            <button
              onClick={() => handleNavClick('mis_turnos')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 relative ${
                activeTab === 'mis_turnos' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              Mis Turnos
              {myActiveBookingsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                  {myActiveBookingsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('valoraciones')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'valoraciones' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Opiniones
            </button>

            <button
              onClick={() => handleNavClick('admin')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin' 
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Panel Admin
            </button>
          </nav>

          {/* Action Tools: Role Switcher & Android App Simulator */}
          <div className="flex items-center gap-2">
            
            {/* Android App preview button */}
            <button
              onClick={() => {
                if (androidViewMode === 'none') {
                  setAndroidViewMode(currentRole === 'admin' ? 'admin_app' : 'player_app');
                } else {
                  setAndroidViewMode('none');
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                androidViewMode !== 'none'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/30'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Simulador de App Móvil Android (Sincronizada)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {androidViewMode !== 'none' ? 'Cerrar App Android' : 'Ver App Android'}
              </span>
            </button>

            {/* Role switch toggle */}
            <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => {
                  setCurrentRole('client');
                  if (activeTab === 'admin') setActiveTab('turnos');
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  currentRole === 'client'
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Jugador
              </button>
              <button
                onClick={() => {
                  setCurrentRole('admin');
                  setActiveTab('admin');
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  currentRole === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin
              </button>
            </div>

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
            Nuestras Canchas & Tarifas
          </button>

          <button
            onClick={() => handleNavClick('mis_turnos')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between ${
              activeTab === 'mis_turnos' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Mis Turnos & Pase QR</span>
            </div>
            {myActiveBookingsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-slate-950">
                {myActiveBookingsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => handleNavClick('valoraciones')}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'valoraciones' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Opiniones & Calificaciones
          </button>

          <button
            onClick={() => {
              setCurrentRole('admin');
              handleNavClick('admin');
            }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 ${
              activeTab === 'admin' ? 'bg-blue-600/30 text-blue-300' : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Panel de Administración & Estadísticas
          </button>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <span>Dominio: deportespmy.com.ar</span>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenGitHubModal();
              }}
              className="text-emerald-400 underline"
            >
              Ver GitHub Setup
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
