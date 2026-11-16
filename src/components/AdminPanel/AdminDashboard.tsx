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
  RefreshCw, 
  Building2,
  Crown
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    adminBookings: bookings, 
    adminCourts: courts,
    selectedDate, 
    adminWhatsappLogs: whatsappLogs, 
    businessProfile,
    admins,
    isSuperAdmin,
    currentAdminUser,
    isSyncing,
    cloudConnected,
    refreshFromCloud
  } = useApp();

  // Admin sub-tabs state with the exact requested order
  const [adminSubTab, setAdminSubTab] = useState<'courts' | 'schedule' | 'cashbox' | 'stats' | 'whatsapp' | 'profile' | 'sync'>('courts');

  // Today calculations for complex admins
  const todayBookings = bookings.filter(b => b.date === selectedDate && b.status === 'confirmed' && !b.clientName.startsWith('[BLOQUEADO'));
  const todayRevenue = todayBookings.reduce((sum, b) => sum + b.amountPaid, 0);

  if (isSuperAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl p-6 sm:p-7 border border-[var(--border-hairline)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-soft-text)] mb-1">
              <Crown className="w-4 h-4" />
              <span>SuperAdmin · Control maestro</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold">
              Cuentas de Complejos y Soporte
            </h1>
            <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1 max-w-xl">
              Administrá las cuentas de cada complejo deportivo y los datos de contacto técnico de la plataforma.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
              <span className="text-[var(--text-muted)]">
                Estado nube: <strong className="text-[var(--text-primary)]">{cloudConnected ? 'Conectado' : 'Reconectando'}</strong>
              </span>
              <button
                type="button"
                onClick={() => refreshFromCloud()}
                className="px-3 py-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="bg-[var(--bg-canvas)] px-4 py-2.5 rounded-lg border border-[var(--border-hairline)] text-center min-w-[130px]">
              <span className="text-[11px] text-[var(--text-muted)] block">Administradores</span>
              <span className="font-mono text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {admins.filter(a => a.role === 'admin').length}
              </span>
            </div>
          </div>
        </div>

        <SuperAdminPanel />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl p-6 sm:p-7 border border-[var(--border-hairline)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-soft-text)] mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel de gestión · {businessProfile.complexName || currentAdminUser?.assignedComplex || 'DeportesPMY'}</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold">
            Canchas, Turnos y Caja
          </h1>
          <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1 max-w-xl">
            {businessProfile.ownerName && <span>Responsable: {businessProfile.ownerName} · </span>}
            {businessProfile.mpOAuthConnected ? (
              <span className="font-semibold text-[var(--mp-text)]">
                Mercado Pago conectado{businessProfile.mpAccountNickname ? ` (@${businessProfile.mpAccountNickname})` : ''}
              </span>
            ) : businessProfile.alias ? (
              <span>Alias: <strong className="font-mono text-[var(--text-primary)]">{businessProfile.alias}</strong></span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Conectá tu Mercado Pago en Datos del Complejo</span>
            )}
            {businessProfile.whatsappNumber && (
              <span> · WhatsApp: <span className="font-mono">{businessProfile.whatsappNumber}</span></span>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
            <span className="text-[var(--text-muted)]">
              Base en nube: <strong className="text-[var(--text-primary)]">{cloudConnected ? 'Activa' : 'Reconectando'}</strong>
            </span>
            <button
              type="button"
              onClick={() => refreshFromCloud()}
              className="px-3 py-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="grid grid-cols-3 gap-3 bg-[var(--bg-canvas)] px-4 py-2.5 rounded-lg border border-[var(--border-hairline)] text-center">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Canchas</span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">{courts.length}</span>
            </div>
            <div className="border-x border-[var(--border-hairline)] px-3">
              <span className="text-[10px] text-[var(--text-muted)] block">Turnos hoy</span>
              <span className="font-mono text-sm font-bold text-[var(--accent-soft-text)] tabular-nums">{todayBookings.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Cobrado hoy</span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">${(todayRevenue / 1000).toFixed(0)}k</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={() => setAdminSubTab('courts')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'courts'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Canchas & Tarifas ({courts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('schedule')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'schedule'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Agenda & Grilla</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('cashbox')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'cashbox'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Caja & Cobranzas</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('stats')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'stats'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Estadísticas</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('whatsapp')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'whatsapp'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp ({whatsappLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('profile')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'profile'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Datos del Complejo & Cobro</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminSubTab('sync')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer border ${
            adminSubTab === 'sync'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Base de Datos</span>
        </button>
      </div>

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
