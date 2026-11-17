import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking } from '../../types';
import { useBackHandler } from '../../hooks/useBackHandler';
import { exportCashboxReportPdf, CashboxPeriodType, getPeriodBounds } from '../../utils/cashboxPdfExport';
import { CheckCircle, AlertTriangle, X, Loader2, RotateCcw, FileDown, Calendar } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { adminBookings: bookings, adminCourts: courts, businessProfile, collectBalanceAtCourt, cancelBooking } = useApp();
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);

  const todayIso = new Date().toISOString().split('T')[0];
  const [pdfPeriodType, setPdfPeriodType] = useState<CashboxPeriodType>('mensual');
  const [pdfAnchorDate, setPdfAnchorDate] = useState<string>(todayIso);
  const [pdfMonth, setPdfMonth] = useState<string>(todayIso.slice(0, 7));
  const [pdfYear, setPdfYear] = useState<string>(todayIso.slice(0, 4));
  const [pdfSuccessNotice, setPdfSuccessNotice] = useState<string | null>(null);

  useBackHandler(
    Boolean(cancelTarget),
    () => {
      if (!isRefunding) {
        setCancelTarget(null);
        setRefundError(null);
      }
    },
    'admin-transactions-refund-modal'
  );

  const confirmedBookings = bookings.filter(b => (b.status === 'confirmed' || b.status === 'awaiting_approval') && !b.clientName.startsWith('[BLOQUEADO'));
  const refundedBookings = bookings.filter(b => b.status === 'cancelled' && b.paymentStatus === 'reembolsado' && !b.clientName.startsWith('[BLOQUEADO'));

  // Aggregations
  const totalCollected = confirmedBookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPending = confirmedBookings.reduce((sum, b) => sum + b.balanceDue, 0);
  const mpCollected = confirmedBookings.filter(b => b.paymentMethod === 'mercadopago').reduce((sum, b) => sum + b.amountPaid, 0);
  const cashCollected = confirmedBookings.filter(b => b.paymentMethod === 'efectivo_mostrador').reduce((sum, b) => sum + b.amountPaid, 0);
  const bankCollected = confirmedBookings.filter(b => b.paymentMethod === 'transferencia' || b.paymentMethod === 'tarjeta').reduce((sum, b) => sum + b.amountPaid, 0);

  const filteredBookings = (filterMethod === 'reembolsado' ? refundedBookings : confirmedBookings).filter(b => {
    if (filterMethod === 'all' || filterMethod === 'reembolsado') return true;
    return b.paymentMethod === filterMethod;
  });

  const handleConfirmRefund = async (forceManual = false) => {
    if (!cancelTarget) return;
    setIsRefunding(true);
    setRefundError(null);
    const res = await cancelBooking(cancelTarget.id, { forceManual, notifyWhatsApp });
    setIsRefunding(false);
    if (!res.success) {
      setRefundError(res.message || 'No se pudo procesar la devolución.');
      return;
    }
    setCancelTarget(null);
    setRefundNotice(res.message || 'Devolución registrada.');
    setTimeout(() => setRefundNotice(null), 6000);
  };

  return (
    <div className="space-y-6">
      {refundNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-200 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{refundNotice}</span>
          </div>
          <button onClick={() => setRefundNotice(null)} className="text-emerald-700 dark:text-emerald-300 hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
              Caja &amp; Liquidaciones
            </span>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
              Control de Cobranzas y Arqueo de Caja
            </h2>
          </div>

          {/* Filter */}
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
          >
            <option value="all">Todos los Medios de Pago</option>
            <option value="mercadopago">Mercado Pago</option>
            <option value="efectivo_mostrador">Efectivo Mostrador</option>
            <option value="transferencia">Transferencia Bancaria</option>
            <option value="tarjeta">Tarjeta Débito/Crédito</option>
            <option value="reembolsado">Cancelados / Reembolsados ({refundedBookings.length})</option>
          </select>
        </div>

        {/* Export Balance PDF Bar (Semanal / Mensual / Anual) */}
        <div className="pt-4 border-t border-[var(--border-hairline)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5 mr-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
              Balance PDF:
            </span>
            {(['semanal', 'mensual', 'anual'] as CashboxPeriodType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPdfPeriodType(type)}
                className={`px-3 py-1.5 rounded-lg font-bold capitalize text-xs cursor-pointer transition-colors border ${
                  pdfPeriodType === type
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}

            {pdfPeriodType === 'semanal' && (
              <input
                type="date"
                value={pdfAnchorDate}
                onChange={(e) => setPdfAnchorDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] tabular-nums"
                title="Elegí cualquier día de la semana a exportar"
              />
            )}
            {pdfPeriodType === 'mensual' && (
              <input
                type="month"
                value={pdfMonth}
                onChange={(e) => setPdfMonth(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] tabular-nums"
              />
            )}
            {pdfPeriodType === 'anual' && (
              <input
                type="number"
                min={2024}
                max={2035}
                value={pdfYear}
                onChange={(e) => setPdfYear(e.target.value)}
                className="w-24 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] tabular-nums"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-[var(--text-muted)]">
              {getPeriodBounds({
                periodType: pdfPeriodType,
                anchorDate: pdfAnchorDate,
                month: pdfMonth,
                year: pdfYear,
                complexLabel: businessProfile.complexName || 'DeportesPMY',
              }).periodLabel}
            </span>
            <button
              type="button"
              onClick={() => {
                const res = exportCashboxReportPdf({
                  bookings,
                  courts,
                  filters: {
                    periodType: pdfPeriodType,
                    anchorDate: pdfAnchorDate,
                    month: pdfMonth,
                    year: pdfYear,
                    complexLabel: businessProfile.complexName || 'DeportesPMY',
                  },
                });
                setPdfSuccessNotice(
                  `PDF ${pdfPeriodType} descargado (${res.count} turnos activos · Neto $${res.netCollected.toLocaleString('es-AR')}).`
                );
                setTimeout(() => setPdfSuccessNotice(null), 5000);
              }}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar Balance PDF</span>
            </button>
          </div>
        </div>

        {pdfSuccessNotice && (
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{pdfSuccessNotice}</span>
          </div>
        )}
      </div>

      {/* Cashbox KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Total Recaudado
          </span>
          <div className="text-2xl font-bold text-[var(--accent)] font-heading tabular-nums mt-1">
            ${totalCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Acreditado en cuentas y caja</span>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Saldo a Cobrar en Cancha
          </span>
          <div className="text-2xl font-bold text-amber-600 font-heading tabular-nums mt-1">
            ${totalPending.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Señas pendientes de cancelación</span>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Mercado Pago Online
          </span>
          <div className="text-2xl font-bold text-[var(--mp-brand)] font-heading tabular-nums mt-1">
            ${mpCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Acreditado en tu cuenta Mercado Pago</span>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Efectivo en Recepción
          </span>
          <div className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums mt-1">
            ${cashCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Caja física mostrador</span>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-hairline)]">
                <th className="py-3 px-4 font-semibold">Comprobante</th>
                <th className="py-3 px-4 font-semibold">Cliente</th>
                <th className="py-3 px-4 font-semibold">Cancha</th>
                <th className="py-3 px-4 font-semibold">Fecha / Turno</th>
                <th className="py-3 px-4 font-semibold">Medio de Pago</th>
                <th className="py-3 px-4 font-semibold text-right">Abonado</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Restante</th>
                <th className="py-3 px-4 font-semibold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--text-muted)] text-xs">
                    No hay movimientos ni cobros registrados en la caja actualmente.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-subtle)]/60">
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--text-secondary)]">#{b.bookingCode}</td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{b.clientName}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{b.courtName.split('-')[0]}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] font-mono tabular-nums">{b.date} {b.startTime}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)] px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <div className="flex flex-col items-end">
                        <span className={b.status === 'awaiting_approval' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          ${b.amountPaid.toLocaleString('es-AR')}
                        </span>
                        {b.status === 'awaiting_approval' && (
                          <span className="text-[9px] bg-rose-500 text-white px-1 rounded font-black uppercase mt-0.5 animate-pulse">
                            Por Aprobar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {b.balanceDue > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400">${b.balanceDue.toLocaleString('es-AR')}</span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-normal">Saldado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.status === 'cancelled' && b.paymentStatus === 'reembolsado' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          ↩ Reembolsado ${(b.refundAmount ?? b.amountPaid).toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {b.balanceDue > 0 ? (
                            <button
                              onClick={() => collectBalanceAtCourt(b.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-bold text-[10px] cursor-pointer shadow-xs"
                            >
                              Cobrar Saldo
                            </button>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">✓ Saldado</span>
                          )}
                          <button
                            onClick={() => {
                              setRefundError(null);
                              setNotifyWhatsApp(true);
                              setCancelTarget(b);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold text-[10px] cursor-pointer"
                            title="Cancelar turno y devolver importe abonado"
                          >
                            Devolver
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Confirmation Modal for Refund from Cashbox */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[var(--text-primary)] space-y-4 border border-rose-500/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                    Confirmación de Devolución
                  </span>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)] font-heading">
                    ¿Cancelar Turno #{cancelTarget.bookingCode} y Reembolsar?
                  </h3>
                </div>
              </div>
              <button
                onClick={() => !isRefunding && setCancelTarget(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-hairline)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Cliente:</span>
                <strong className="text-[var(--text-primary)]">{cancelTarget.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Turno:</span>
                <strong className="font-mono text-[var(--text-secondary)]">{cancelTarget.date} {cancelTarget.startTime} hs</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-hairline)]">
                <span className="font-bold text-rose-700 dark:text-rose-300">Importe a devolver al jugador:</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                  ${cancelTarget.amountPaid.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
              cancelTarget.paymentMethod === 'mercadopago' && /^MP-\d{5,}$/.test(cancelTarget.paymentReference || '')
                ? 'bg-sky-500/15 border-sky-500/35 text-sky-800 dark:text-sky-200'
                : 'bg-amber-500/15 border-amber-500/35 text-amber-900 dark:text-amber-200'
            }`}>
              {cancelTarget.paymentMethod === 'mercadopago' && /^MP-\d{5,}$/.test(cancelTarget.paymentReference || '') ? (
                <span>Este pago ingresó por <strong>Mercado Pago Checkout Pro</strong>: el sistema solicitará el reembolso automático hacia el medio de pago del jugador.</span>
              ) : (
                <span>Los pagos por <strong>CBU, Alias o efectivo</strong> no se revierten automáticamente desde el sistema bancario. El turno se liberará y quedará registrado como reembolsado para que realices la transferencia manual al jugador.</span>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span>Notificar cancelación y devolución por WhatsApp al jugador</span>
            </label>

            {refundError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-700 dark:text-rose-200 space-y-2">
                <p className="font-bold">{refundError}</p>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => handleConfirmRefund(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                >
                  Cancelar Turno Igualmente (Devolución Manual)
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => handleConfirmRefund(false)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {isRefunding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar y Devolver ${cancelTarget.amountPaid.toLocaleString('es-AR')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
