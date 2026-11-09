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
    isSuperAdmin,
    currentAdminUser,
    logoutAdmin,
    setActiveTab,
    isSyncing,
    cloudConnected,
    refreshFromCloud
  } = useApp();

  const [adminSubTab, setAdminSubTab] = useState<'courts' | 'profile' | 'schedule' | 'cashbox' | 'stats' | 'whatsapp' | 'superadmin' | 'sync'>('courts');

  // Today calculations
  const todayBookings = bookings.filter(b => b.date === selectedDate && b.status === 'confirmed' && !b.clientName.startsWith('[BLOQUEADO'));
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const todayPending = todayBookings.reduce((sum, b) => sum + b.balanceDue, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Exclusive Admin Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-blue-900/50 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
            {isSuperAdmin ? <Crown className="w-4 h-4 text-amber-400" /> : <ShieldCheck className="w-4 h-4" />}
            <span>{isSuperAdmin ? 'Panel Maestro de SuperAdmin' : 'Panel de Gestión Deportiva'} • {businessProfile.complexName || 'DeportesPMY'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
            Gestión de Canchas, Turnos & Caja
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            {businessProfile.ownerName ? `Responsable: ${businessProfile.ownerName} | ` : ''}
            Alias: <strong className="font-mono text-emerald-400">{businessProfile.alias}</strong> | WhatsApp: <span className="font-mono">{businessProfile.whatsappNumber}</span>
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

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        
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

        <button
          onClick={() => setAdminSubTab('profile')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'profile'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos del Complejo & Cobro</span>
        </button>

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

        {isSuperAdmin && (
          <button
            onClick={() => setAdminSubTab('superadmin')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              adminSubTab === 'superadmin'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-600" />
            <span>Gestión SuperAdmin</span>
          </button>
        )}

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
        {adminSubTab === 'profile' && <AdminProfileSettings />}
        {adminSubTab === 'schedule' && <ScheduleGrid />}
        {adminSubTab === 'cashbox' && <TransactionsView />}
        {adminSubTab === 'stats' && <MonthlyStatsView />}
        {adminSubTab === 'whatsapp' && <WhatsAppLogView />}
        {adminSubTab === 'superadmin' && <SuperAdminPanel />}
        {adminSubTab === 'sync' && <DatabaseSyncView />}
      </div>

    </div>
  );
};
