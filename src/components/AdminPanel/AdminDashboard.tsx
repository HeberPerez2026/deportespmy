import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ScheduleGrid } from './ScheduleGrid';
import { MonthlyStatsView } from './MonthlyStatsView';
import { CourtsManager } from './CourtsManager';
import { TransactionsView } from './TransactionsView';
import { WhatsAppLogView } from './WhatsAppLogView';
import { DatabaseSyncView } from './DatabaseSyncView';
import { AdminProfileSettings } from './AdminProfileSettings';
import { SuperAdminPanel } from './SuperAdminPanel';
import { 
  Calendar, 
  BarChart3, 
  Layers, 
  DollarSign, 
  MessageCircle, 
  Database, 
  ShieldCheck, 
  LogOut, 
  RefreshCw, 
  ArrowLeft,
  Building2,
  Crown
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    bookings, 
    courts,
    selectedDate, 
    whatsappLogs, 
    businessProfile,
    admins,
    isSuperAdmin,
    currentAdminUser,
    logoutAdmin,
    setActiveTab,
    isSyncing,
    cloudConnected,
    refreshFromCloud
  } = useApp();

  // Admin sub-tabs state with the exact requested order
  const [adminSubTab, setAdminSubTab] = useState<'courts' | 'schedule' | 'cashbox' | 'stats' | 'whatsapp' | 'profile' | 'sync'>('courts');

  // Today calculations for complex admins
  const todayBookings = bookings.filter(b => b.date === selectedDate && b.status === 'confirmed' && !b.clientName.startsWith('[BLOQUEADO'));
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountPaid, 0);

  // If logged in as SuperAdmin: dedicated interface ONLY for managing admin accounts and developer contact
  if (isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* SuperAdmin Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-indigo-900/50 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Nivel SuperAdmin • Acceso Maestro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
              Panel Maestro de Cuentas & Desarrollador
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Como SuperAdmin, tu función es dar de alta, modificar, suspender o borrar administradores, y configurar los datos de soporte del desarrollador. Cada administrador gestiona sus canchas correspondientes.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{cloudConnected ? 'Firestore Conectado en Tiempo Real' : 'Reconectando...'}</span>
              </div>
              <button
                onClick={() => refreshFromCloud()}
                className="px-2.5 py-1 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Actualizar Datos</span>
              </button>
            </div>
          </div>

          {/* SuperAdmin Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('turnos')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                title="Ver el catálogo de canchas como un jugador"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Ver Web como Jugador</span>
              </button>

              <button
                onClick={logoutAdmin}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-rose-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-center w-full max-w-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Administradores Creados</span>
              <span className="text-xl font-black text-amber-400">{admins.filter(a => a.role === 'admin').length}</span>
            </div>
          </div>
        </div>

        {/* SuperAdmin View */}
        <SuperAdminPanel />

      </div>
    );
  }

  // STANDARD ADMIN VIEW: Sports complex manager
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Admin Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-blue-900/50 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de Gestión Deportiva • {businessProfile.complexName || currentAdminUser?.assignedComplex || 'DeportesPMY'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
            Gestión de Canchas, Turnos & Caja
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            {businessProfile.ownerName && <span>Responsable: {businessProfile.ownerName} • </span>}
            {businessProfile.alias ? (
              <span>Alias: <strong className="font-mono text-emerald-400">{businessProfile.alias}</strong></span>
            ) : (
              <span className="text-amber-300 font-semibold">Configurá tu CBU y Alias en Datos del Complejo</span>
            )}
            {businessProfile.whatsappNumber && (
              <span> • WhatsApp: <span className="font-mono">{businessProfile.whatsappNumber}</span></span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span>{cloudConnected ? 'Firestore Conectado en Tiempo Real' : 'Reconectando...'}</span>
            </div>
            <button
              onClick={() => refreshFromCloud()}
              className="px-2.5 py-1 rounded-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar Ahora</span>
            </button>
          </div>
        </div>

        {/* Exit to Player View / Logout Actions */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('turnos')}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              title="Previsualizar el catálogo de canchas como un jugador"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Web como Jugador</span>
            </button>

            <button
              onClick={logoutAdmin}
              className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-rose-500/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>

          {/* Quick Metrics of Today */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center w-full max-w-xs mt-1">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Canchas</span>
              <span className="text-sm font-black text-white">{courts.length}</span>
            </div>
            <div className="border-x border-slate-800 px-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Turnos Hoy</span>
              <span className="text-sm font-black text-emerald-400">{todayBookings.length}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Cobrado Hoy</span>
              <span className="text-sm font-black text-amber-400 font-mono">${(todayRevenue / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs: Order requested:
          1. Canchas & Tarifas
          2. Agenda & Grilla
          3. Caja & Cobranzas
          4. Estadísticas
          5. Notificaciones WhatsApp
          6. Datos del Complejo & Cobro (entre Notificaciones WhatsApp y Base de datos!)
          7. Base de Datos & Backup
      */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        
        {/* 1. Canchas & Tarifas */}
        <button
          onClick={() => setAdminSubTab('courts')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'courts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Canchas & Tarifas ({courts.length})</span>
        </button>

        {/* 2. Agenda & Grilla */}
        <button
          onClick={() => setAdminSubTab('schedule')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda & Grilla de Turnos</span>
        </button>

        {/* 3. Caja & Cobranzas */}
        <button
          onClick={() => setAdminSubTab('cashbox')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'cashbox'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Caja & Cobranzas</span>
        </button>

        {/* 4. Estadísticas */}
        <button
          onClick={() => setAdminSubTab('stats')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'stats'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Estadísticas de Uso</span>
        </button>

        {/* 5. Notificaciones WhatsApp */}
        <button
          onClick={() => setAdminSubTab('whatsapp')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'whatsapp'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-emerald-500" />
          <span>Notificaciones WhatsApp ({whatsappLogs.length})</span>
        </button>

        {/* 6. Datos del Complejo & Cobro (entre Notificaciones WhatsApp y Base de Datos) */}
        <button
          onClick={() => setAdminSubTab('profile')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'profile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Datos del Complejo & Cobro</span>
        </button>

        {/* 7. Base de Datos & Backup */}
        <button
          onClick={() => setAdminSubTab('sync')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'sync'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Datos & Backup</span>
        </button>
      </div>

      {/* Main Panel Content Tab Rendering */}
      <div>
        {adminSubTab === 'courts' && <CourtsManager />}
        {adminSubTab === 'schedule' && <ScheduleGrid />}
        {adminSubTab === 'cashbox' && <TransactionsView />}
        {adminSubTab === 'stats' && <MonthlyStatsView />}
        {adminSubTab === 'whatsapp' && <WhatsAppLogView />}
        {adminSubTab === 'profile' && <AdminProfileSettings />}
        {adminSubTab === 'sync' && <DatabaseSyncView />}
      </div>

    </div>
  );
};
