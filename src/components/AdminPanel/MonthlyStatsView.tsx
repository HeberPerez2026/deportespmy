import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { exportMonthlyStatsPdf } from '../../utils/monthlyStatsPdfExport';
import { 
  TrendingUp, 
  Calendar, 
  Award, 
  FileDown, 
  Printer, 
  DollarSign, 
  Users, 
  PieChart, 
  Flame,
  CheckCircle
} from 'lucide-react';

export const MonthlyStatsView: React.FC = () => {
  const { getMonthlyStats, tournaments, businessProfile, currentAdminUser, isSuperAdmin } = useApp();
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  const stats = getMonthlyStats(selectedMonth);
  const ticketAverage = stats.totalBookings > 0 ? Math.round(stats.totalRevenue / stats.totalBookings) : 0;

  const adminIdKey = (currentAdminUser?.username || '').trim().toLowerCase();
  const scopedTournaments = (currentAdminUser && !isSuperAdmin)
    ? tournaments.filter((t) => !adminIdKey || !t.adminId || t.adminId.toLowerCase() === adminIdKey)
    : tournaments;

  // Export PDF
  const handleExportPDF = () => {
    exportMonthlyStatsPdf({
      stats,
      complexLabel: businessProfile.complexName || 'DeportesPMY',
      monthKey: selectedMonth,
      tournaments: scopedTournaments,
    });
    setPdfNotice(`Estadísticas mensuales exportadas en PDF (${selectedMonth}).`);
    setTimeout(() => setPdfNotice(null), 5000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Analítica &amp; Métricas de Negocio
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Estadísticas Mensuales de Uso
          </h2>
          {pdfNotice && (
            <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5 mt-1">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{pdfNotice}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)]">
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={currentMonthKey}>Mes Actual ({currentMonthKey})</option>
              {currentMonthKey !== '2026-11' && <option value="2026-11">Noviembre 2026</option>}
              {currentMonthKey !== '2026-10' && <option value="2026-10">Octubre 2026</option>}
            </select>
          </div>

          {/* Export PDF button */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-canvas)] text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--border-hairline)]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">
            Ingresos Totales
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums mt-1">
            ${stats.totalRevenue.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--accent-soft-text)] font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            {(stats.tournamentRevenue || 0) > 0
              ? `Incluye $${(stats.tournamentRevenue || 0).toLocaleString('es-AR')} de torneos (${stats.tournamentTeamsPaid || 0})`
              : 'Turnos confirmados + torneos'}
          </span>
        </div>

        {/* Total Bookings */}
        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] flex items-center justify-center mb-3">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">
            Turnos Reservados
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums mt-1">
            {stats.totalBookings}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-medium mt-1 block">
            {stats.totalHoursPlayed} horas de cancha jugadas
          </span>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] flex items-center justify-center mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">
            Ocupación Promedio
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums mt-1">
            {stats.averageOccupancyRate}%
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-medium mt-1 block">
            94% en horario nocturno (19 a 23h)
          </span>
        </div>

        {/* Ticket Average */}
        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <div className="w-9 h-9 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] flex items-center justify-center mb-3">
            <Award className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">
            Ticket Promedio
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums mt-1">
            ${ticketAverage.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-secondary)] font-medium mt-1 block">
            Promedio por turno confirmado
          </span>
        </div>

      </div>

      {/* TWO COLUMN CHARTS & BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sports Breakdown Bar Chart */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[var(--text-primary)] font-heading flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[var(--accent)]" />
              <span>Demanda & Recaudación por Deporte</span>
            </h3>
            <span className="text-xs text-[var(--text-muted)]">100% analizado</span>
          </div>

          <div className="space-y-4">
            {stats.sportBreakdown.map((s) => (
              <div key={s.sport} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                    <span>{s.sportName}</span>
                    <span className="text-[var(--text-muted)] font-normal">({s.bookingsCount} turnos)</span>
                  </div>
                  <div className="text-right tabular-nums">
                    <span className="font-bold text-[var(--text-primary)]">${s.revenue.toLocaleString('es-AR')}</span>
                    <span className="text-[var(--accent-soft-text)] ml-1.5 font-mono">({s.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-[var(--bg-subtle)] h-2.5 rounded-sm overflow-hidden">
                  <div 
                    className="bg-[var(--accent)] h-full rounded-sm transition-all duration-500"
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Breakdown */}
        <div className="lg:col-span-5 bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[var(--text-primary)] font-heading flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Horarios Pico de Demanda</span>
            </h3>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Alta Concurrencia
            </span>
          </div>

          <div className="space-y-2.5">
            {stats.peakHours.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-6">Aún no hay turnos confirmados en este mes.</p>
            ) : stats.peakHours.map((peak, idx) => {
              const maxVal = Math.max(1, ...stats.peakHours.map(p => p.bookingsCount));
              const pct = (peak.bookingsCount / maxVal) * 100;

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-24 font-mono text-[var(--text-secondary)] tabular-nums shrink-0">{peak.hour}</span>
                  <div className="flex-1 bg-[var(--bg-subtle)] h-5 rounded overflow-hidden relative">
                    <div 
                      className={`h-full rounded transition-all duration-500 flex items-center pl-2 ${
                        peak.bookingsCount >= 35 ? 'bg-amber-500 text-slate-950 font-semibold' : 'bg-[var(--border-strong)] text-[var(--text-primary)]'
                      }`}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[10px] tabular-nums">{peak.bookingsCount} turnos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* TOP RECURRING CLIENTS */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[var(--text-primary)] font-heading flex items-center gap-2">
            <Users className="w-4 h-4 text-[var(--accent)]" />
            <span>Clientes Más Recurrentes del Mes (Puerto Madryn)</span>
          </h3>
          <span className="text-xs text-[var(--text-muted)]">Fidelización & torneos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-hairline)]">
                <th className="py-2.5 px-4 font-semibold">Cliente</th>
                <th className="py-2.5 px-4 font-semibold">WhatsApp</th>
                <th className="py-2.5 px-4 font-semibold text-center">Partidos Jugados</th>
                <th className="py-2.5 px-4 font-semibold text-right">Inversión Total</th>
                <th className="py-2.5 px-4 font-semibold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {stats.topClients.map((client, i) => (
                <tr key={i} className="hover:bg-[var(--bg-subtle)]/60">
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-bold flex items-center justify-center text-[10px] tabular-nums">
                      {i + 1}
                    </span>
                    <span>{client.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--accent-soft-text)] font-semibold">{client.phone}</td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    <span className="bg-[var(--bg-subtle)] px-2.5 py-0.5 rounded font-semibold text-[var(--text-primary)]">
                      {client.bookingsCount} turnos
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[var(--text-primary)] tabular-nums">
                    ${client.totalSpent.toLocaleString('es-AR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent('¡Hola ' + client.name + '! Desde DeportesPMY queremos agradecerte por ser uno de nuestros deportistas más fieles este mes.')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-md bg-[var(--accent-soft)] text-[var(--accent-soft-text)] hover:opacity-80 font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      Enviar Promo
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
