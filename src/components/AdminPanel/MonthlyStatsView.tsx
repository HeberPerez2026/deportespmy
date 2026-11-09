import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Award, 
  Download, 
  Printer, 
  DollarSign, 
  Users, 
  BarChart2, 
  PieChart, 
  Flame,
  ArrowUpRight
} from 'lucide-react';

export const MonthlyStatsView: React.FC = () => {
  const { getMonthlyStats, bookings } = useApp();
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');

  const stats = getMonthlyStats(selectedMonth);

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Reporte Mensual de DeportesPMY - deportespmy.com.ar'],
      ['Mes', stats.monthLabel],
      ['Ingresos Totales (ARS)', stats.totalRevenue],
      ['Total Turnos', stats.totalBookings],
      ['Horas Jugadas', stats.totalHoursPlayed],
      ['Ocupacion Promedio (%)', stats.averageOccupancyRate],
      [],
      ['Desglose por Deporte'],
      ['Deporte', 'Turnos', 'Ingresos (ARS)', 'Porcentaje (%)'],
      ...stats.sportBreakdown.map(s => [s.sportName, s.bookingsCount, s.revenue, s.percentage + '%']),
      [],
      ['Horas Pico de Demanda'],
      ['Franja Horaria', 'Cantidad de Reservas'],
      ...stats.peakHours.map(p => [p.hour, p.bookingsCount]),
      [],
      ['Top Clientes Recurrentes'],
      ['Nombre', 'WhatsApp', 'Turnos Jugados', 'Gasto Total (ARS)'],
      ...stats.topClients.map(c => [c.name, c.phone, c.bookingsCount, c.totalSpent])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deportespmy_estadisticas_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Analítica & Métricas de Negocio
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Estadísticas Mensuales de Uso
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="2026-11">Noviembre 2026</option>
              <option value="2026-10">Octubre 2026</option>
            </select>
          </div>

          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            Ingresos Totales
          </span>
          <div className="text-2xl font-black text-slate-900 font-heading mt-1">
            ${stats.totalRevenue.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            +18.4% vs mes anterior
          </span>
        </div>

        {/* Total Bookings */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            Turnos Reservados
          </span>
          <div className="text-2xl font-black text-slate-900 font-heading mt-1">
            {stats.totalBookings}
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">
            {stats.totalHoursPlayed} horas de cancha jugadas
          </span>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            Ocupación Promedio
          </span>
          <div className="text-2xl font-black text-slate-900 font-heading mt-1">
            {stats.averageOccupancyRate}%
          </div>
          <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
            94% en horario nocturno (19 a 23h)
          </span>
        </div>

        {/* Ticket Average */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            Ticket Promedio
          </span>
          <div className="text-2xl font-black text-slate-900 font-heading mt-1">
            ${Math.round(stats.totalRevenue / stats.totalBookings).toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-purple-600 font-semibold mt-1 block">
            Pádel y F5 son los líderes
          </span>
        </div>

      </div>

      {/* TWO COLUMN CHARTS & BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sports Breakdown Bar Chart */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Demanda & Recaudación por Deporte</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">100% de ocupación analizada</span>
          </div>

          <div className="space-y-4">
            {stats.sportBreakdown.map((s) => (
              <div key={s.sport} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>{s.sportName}</span>
                    <span className="text-slate-400 font-normal">({s.bookingsCount} turnos)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">${s.revenue.toLocaleString('es-AR')}</span>
                    <span className="text-emerald-600 ml-1.5 font-mono">({s.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Breakdown */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Horarios Pico de Demanda</span>
            </h3>
            <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
              Alta Concurrencia
            </span>
          </div>

          <div className="space-y-2.5">
            {stats.peakHours.map((peak, idx) => {
              const maxVal = Math.max(...stats.peakHours.map(p => p.bookingsCount));
              const pct = (peak.bookingsCount / maxVal) * 100;

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-24 font-mono text-slate-600 shrink-0">{peak.hour}</span>
                  <div className="flex-1 bg-slate-100 h-5 rounded-lg overflow-hidden relative">
                    <div 
                      className={`h-full rounded-lg transition-all duration-500 flex items-center pl-2 ${
                        peak.bookingsCount >= 35 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-300 text-slate-700'
                      }`}
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[10px]">{peak.bookingsCount} turnos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* TOP RECURRING CLIENTS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 font-heading flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span>Clientes Más Recurrentes del Mes (Puerto Madryn)</span>
          </h3>
          <span className="text-xs text-slate-500">Programas de fidelización & torneos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-4 font-bold">Cliente</th>
                <th className="py-2.5 px-4 font-bold">WhatsApp</th>
                <th className="py-2.5 px-4 font-bold text-center">Partidos Jugados</th>
                <th className="py-2.5 px-4 font-bold text-right">Inversión Total</th>
                <th className="py-2.5 px-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.topClients.map((client, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                      {i + 1}
                    </span>
                    <span>{client.name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-700 font-bold">{client.phone}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-800">
                      {client.bookingsCount} turnos
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    ${client.totalSpent.toLocaleString('es-AR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent('¡Hola ' + client.name + '! Desde DeportesPMY queremos agradecerte por ser uno de nuestros deportistas más fieles este mes.')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] inline-flex items-center gap-1"
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
