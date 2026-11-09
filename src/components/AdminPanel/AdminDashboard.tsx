import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ScheduleGrid } from './ScheduleGrid';
import { MonthlyStatsView } from './MonthlyStatsView';
import { CourtsManager } from './CourtsManager';
import { TransactionsView } from './TransactionsView';
import { WhatsAppLogView } from './WhatsAppLogView';
import { DatabaseSyncView } from './DatabaseSyncView';
import { 
  Calendar, 
  BarChart3, 
  Layers, 
  DollarSign, 
  MessageCircle, 
  Database, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Plus, 
  Users,
  BellRing
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { bookings, selectedDate, courts, whatsappLogs } = useApp();
  const [adminSubTab, setAdminSubTab] = useState<'schedule' | 'stats' | 'courts' | 'cashbox' | 'whatsapp' | 'sync'>('schedule');

  // Today calculations
  const todayBookings = bookings.filter(b => b.date === selectedDate && b.status === 'confirmed' && !b.clientName.startsWith('[BLOQUEADO'));
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const todayPending = todayBookings.reduce((sum, b) => sum + b.balanceDue, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
            <ShieldCheck className="w-4 h-4" />
            Panel de Administración General • DeportesPMY
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
            Gestión Centralizada de Turnos & Caja
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Controlá la agenda en tiempo real, registrá cobros en mostrador, revisá las estadísticas mensuales y monitoreá las notificaciones automáticas de WhatsApp.
          </p>
        </div>

        {/* Quick Today Snapshot Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-950/70 p-3 sm:p-4 rounded-2xl border border-slate-800 text-center">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Turnos Hoy</span>
            <span className="text-lg font-black text-white">{todayBookings.length}</span>
          </div>
          <div className="border-x border-slate-800 px-2 sm:px-3">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Cobrado</span>
            <span className="text-lg font-black text-emerald-400 font-mono">${(todayRevenue / 1000).toFixed(0)}k</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">A Cobrar</span>
            <span className="text-lg font-black text-amber-400 font-mono">${(todayPending / 1000).toFixed(0)}k</span>
          </div>
        </div>
      </div>

      {/* Subnavigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setAdminSubTab('schedule')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'schedule'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda & Grilla de Canchas</span>
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
          <span>Estadísticas de Uso Mensual</span>
        </button>

        <button
          onClick={() => setAdminSubTab('courts')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'courts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Canchas & Tarifas</span>
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

        <button
          onClick={() => setAdminSubTab('sync')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            adminSubTab === 'sync'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>BD Central & App Android</span>
        </button>
      </div>

      {/* Main Panel Content Tab Rendering */}
      <div>
        {adminSubTab === 'schedule' && <ScheduleGrid />}
        {adminSubTab === 'stats' && <MonthlyStatsView />}
        {adminSubTab === 'courts' && <CourtsManager />}
        {adminSubTab === 'cashbox' && <TransactionsView />}
        {adminSubTab === 'whatsapp' && <WhatsAppLogView />}
        {adminSubTab === 'sync' && <DatabaseSyncView />}
      </div>

    </div>
  );
};
