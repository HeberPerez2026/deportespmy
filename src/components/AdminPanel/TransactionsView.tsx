import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Booking, Tournament, TournamentTeam } from '../../types';
import { useBackHandler } from '../../hooks/useBackHandler';
import { exportCashboxReportPdf, CashboxPeriodType, getPeriodBounds } from '../../utils/cashboxPdfExport';
import { getSafeReceiptUrl } from '../../utils/imageUpload';
import {
  CheckCircle,
  AlertTriangle,
  X,
  Loader2,
  RotateCcw,
  FileDown,
  Calendar,
  Trophy,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface TournamentPaymentRow {
  kind: 'tournament';
  id: string;
  tournament: Tournament;
  team: TournamentTeam;
  code: string;
  clientLabel: string;
  conceptLabel: string;
  dateStr: string;
  timeStr: string;
  method: string;
  amountPaid: number;
  pendingAmount: number;
  isPaid: boolean;
  isAwaiting: boolean;
  isRefunded: boolean;
  refundAmount: number;
  receiptUrl?: string;
}

export const TransactionsView: React.FC = () => {
  const {
    adminBookings: bookings,
    adminCourts: courts,
    tournaments,
    currentAdminUser,
    isSuperAdmin,
    businessProfile,
    collectBalanceAtCourt,
    confirmBookingPayment,
    cancelBooking,
    confirmTournamentTeamPayment,
    refundTournamentTeam,
  } = useApp();

  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [collectConfirmBooking, setCollectConfirmBooking] = useState<{
    action: 'collect_balance' | 'approve_booking';
    booking: Booking;
  } | null>(null);
  const [tournamentConfirmTarget, setTournamentConfirmTarget] = useState<{
    action: 'approve' | 'refund';
    tournament: Tournament;
    team: TournamentTeam;
  } | null>(null);

  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptZoomed, setReceiptZoomed] = useState(false);
  const [receiptLoadError, setReceiptLoadError] = useState(false);

  const openReceiptPreview = (rawUrl?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const safe = getSafeReceiptUrl(rawUrl);
    if (!safe) return;
    setReceiptLoadError(false);
    setReceiptZoomed(false);
    setReceiptPreviewUrl(safe);
  };

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
  useBackHandler(
    Boolean(collectConfirmBooking),
    () => setCollectConfirmBooking(null),
    'admin-transactions-collect-confirm-modal'
  );
  useBackHandler(
    Boolean(tournamentConfirmTarget),
    () => {
      if (!isRefunding) {
        setTournamentConfirmTarget(null);
        setRefundError(null);
      }
    },
    'admin-transactions-tournament-confirm-modal'
  );
  useBackHandler(Boolean(receiptPreviewUrl), () => setReceiptPreviewUrl(null), 'admin-transactions-receipt-modal');

  const adminIdKey = (currentAdminUser?.username || '').trim().toLowerCase();
  const scopedTournaments = (currentAdminUser && !isSuperAdmin)
    ? tournaments.filter((t) => !adminIdKey || !t.adminId || t.adminId.toLowerCase() === adminIdKey)
    : tournaments;

  const confirmedBookings = bookings.filter(
    (b) => (b.status === 'confirmed' || b.status === 'awaiting_approval') && !b.clientName.startsWith('[BLOQUEADO')
  );
  const refundedBookings = bookings.filter(
    (b) => b.status === 'cancelled' && b.paymentStatus === 'reembolsado' && !b.clientName.startsWith('[BLOQUEADO')
  );

  // Extract tournament inscriptions into ledger rows
  const allTournamentRows: TournamentPaymentRow[] = scopedTournaments
    .filter((t) => t.status !== 'cancelled')
    .flatMap((t) =>
      (t.teams || []).map((tm) => {
        const isRefunded = Boolean(tm.refunded || tm.paymentStatus === 'refunded');
        const isPaid = !isRefunded && (Boolean(tm.paid) || tm.paymentStatus === 'paid');
        const isAwaiting = !isRefunded && tm.paymentStatus === 'awaiting_approval';
        const paidAmt = Number(tm.amountPaid ?? (isPaid ? t.entryFee : 0));
        const pendingAmt = !isPaid && !isRefunded ? Number(t.entryFee || 0) : 0;
        const refundAmt = Number(tm.refundAmount ?? (isRefunded ? paidAmt || t.entryFee : 0));
        const dateStr = (tm.registeredAt ? tm.registeredAt.slice(0, 10) : t.date) || t.date;
        return {
          kind: 'tournament' as const,
          id: `${t.id}_${tm.id}`,
          tournament: t,
          team: tm,
          code: tm.bookingCode || `TRN-${tm.id.slice(-4).toUpperCase()}`,
          clientLabel: `${tm.teamName} (${tm.captainName})`,
          conceptLabel: `TORNEO · ${t.title}`,
          dateStr,
          timeStr: t.startTime,
          method: tm.paymentMethod || 'efectivo_mostrador',
          amountPaid: isPaid ? paidAmt : 0,
          pendingAmount: pendingAmt,
          isPaid,
          isAwaiting,
          isRefunded,
          refundAmount: refundAmt,
          receiptUrl: tm.receiptUrl,
        };
      })
    );

  const activeTournamentRows = allTournamentRows.filter((r) => !r.isRefunded && (r.isPaid || r.isAwaiting || r.pendingAmount > 0));
  const refundedTournamentRows = allTournamentRows.filter((r) => r.isRefunded);

  // Aggregations (Turnos + Torneos)
  const totalCollected =
    confirmedBookings.reduce((sum, b) => sum + b.amountPaid, 0) +
    activeTournamentRows.filter((r) => r.isPaid).reduce((sum, r) => sum + r.amountPaid, 0);

  const totalPending =
    confirmedBookings.reduce((sum, b) => sum + b.balanceDue, 0) +
    activeTournamentRows.reduce((sum, r) => sum + r.pendingAmount, 0);

  const mpCollected =
    confirmedBookings.filter((b) => b.paymentMethod === 'mercadopago').reduce((sum, b) => sum + b.amountPaid, 0) +
    activeTournamentRows.filter((r) => r.isPaid && r.method === 'mercadopago').reduce((sum, r) => sum + r.amountPaid, 0);

  const cashCollected =
    confirmedBookings.filter((b) => b.paymentMethod === 'efectivo_mostrador').reduce((sum, b) => sum + b.amountPaid, 0) +
    activeTournamentRows.filter((r) => r.isPaid && r.method === 'efectivo_mostrador').reduce((sum, r) => sum + r.amountPaid, 0);

  const filteredBookings = (filterMethod === 'reembolsado' ? refundedBookings : confirmedBookings).filter((b) => {
    if (filterMethod === 'all' || filterMethod === 'reembolsado') return true;
    return b.paymentMethod === filterMethod;
  });

  const filteredTournaments = (filterMethod === 'reembolsado' ? refundedTournamentRows : activeTournamentRows).filter((r) => {
    if (filterMethod === 'all' || filterMethod === 'reembolsado') return true;
    return r.method === filterMethod;
  });

  const totalRefundedCount = refundedBookings.length + refundedTournamentRows.length;

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

  const handleConfirmCollectOrApproveBooking = () => {
    if (!collectConfirmBooking) return;
    const { action, booking } = collectConfirmBooking;
    if (action === 'approve_booking') {
      const paidAmt = booking.amountPaid || booking.totalAmount * (booking.isDepositOnly ? 0.5 : 1);
      confirmBookingPayment(booking.id, `VERIFIED-CAJA-${Date.now().toString().slice(-4)}`, paidAmt);
      setRefundNotice(`Pago aprobado para el turno #${booking.bookingCode}.`);
    } else {
      collectBalanceAtCourt(booking.id);
      setRefundNotice(`Saldo cobrado en recepción para #${booking.bookingCode}.`);
    }
    setCollectConfirmBooking(null);
    setTimeout(() => setRefundNotice(null), 5000);
  };

  const handleExecuteTournamentAction = async (forceManual = false) => {
    if (!tournamentConfirmTarget) return;
    const { action, tournament, team } = tournamentConfirmTarget;
    if (action === 'approve') {
      await confirmTournamentTeamPayment(
        tournament.id,
        team.id,
        team.paymentReference || `TRN-CAJA-${Date.now().toString().slice(-4)}`,
        Number(team.amountPaid || tournament.entryFee || 0)
      );
      setTournamentConfirmTarget(null);
      setRefundNotice(`Inscripción cobrada/aprobada para "${team.teamName}" (${tournament.title}).`);
      setTimeout(() => setRefundNotice(null), 5000);
      return;
    }

    setIsRefunding(true);
    setRefundError(null);
    const res = await refundTournamentTeam(tournament.id, team.id, { forceManual });
    setIsRefunding(false);
    if (!res.success) {
      setRefundError(res.message || 'No se pudo procesar la devolución.');
      return;
    }
    setTournamentConfirmTarget(null);
    setRefundNotice(res.message || `Devolución registrada para "${team.teamName}".`);
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
              Caja &amp; Liquidaciones (Turnos + Torneos)
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
            <option value="reembolsado">Cancelados / Reembolsados ({totalRefundedCount})</option>
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
                  tournaments: scopedTournaments,
                  filters: {
                    periodType: pdfPeriodType,
                    anchorDate: pdfAnchorDate,
                    month: pdfMonth,
                    year: pdfYear,
                    complexLabel: businessProfile.complexName || 'DeportesPMY',
                  },
                });
                setPdfSuccessNotice(
                  `PDF ${pdfPeriodType} descargado (${res.count} operaciones · Neto $${res.netCollected.toLocaleString('es-AR')}).`
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
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Turnos + inscripciones pagas</span>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Saldo a Cobrar
          </span>
          <div className="text-2xl font-bold text-amber-600 font-heading tabular-nums mt-1">
            ${totalPending.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Señas y torneos pendientes</span>
        </div>

        <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
            Mercado Pago Online
          </span>
          <div className="text-2xl font-bold text-[var(--mp-brand)] font-heading tabular-nums mt-1">
            ${mpCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Acreditado en Mercado Pago</span>
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
                <th className="py-3 px-4 font-semibold">Cliente / Equipo</th>
                <th className="py-3 px-4 font-semibold">Concepto</th>
                <th className="py-3 px-4 font-semibold">Fecha</th>
                <th className="py-3 px-4 font-semibold">Medio de Pago</th>
                <th className="py-3 px-4 font-semibold text-right">Abonado</th>
                <th className="py-3 px-4 font-semibold text-right">Saldo Restante</th>
                <th className="py-3 px-4 font-semibold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredBookings.length === 0 && filteredTournaments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[var(--text-muted)] text-xs">
                    No hay movimientos ni cobros registrados en la caja actualmente.
                  </td>
                </tr>
              ) : (
                <>
                  {filteredTournaments.map((tr) => (
                    <tr key={tr.id} className="hover:bg-[var(--bg-subtle)]/60 bg-amber-500/[0.03]">
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>#{tr.code}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{tr.clientLabel}</td>
                      <td className="py-3 px-4 text-amber-500 font-semibold">{tr.conceptLabel}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] font-mono tabular-nums">
                        {tr.dateStr} {tr.timeStr}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)] px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                            {tr.method}
                          </span>
                          {tr.receiptUrl && (
                            <button
                              type="button"
                              onClick={(e) => openReceiptPreview(tr.receiptUrl, e)}
                              className="p-1 rounded bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 cursor-pointer"
                              title="Ver comprobante adjunto"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        <div className="flex flex-col items-end">
                          <span className={tr.isAwaiting ? 'text-rose-500' : tr.isPaid ? 'text-emerald-500' : 'text-[var(--text-muted)]'}>
                            ${tr.amountPaid.toLocaleString('es-AR')}
                          </span>
                          {tr.isAwaiting && (
                            <span className="text-[9px] bg-rose-500 text-white px-1 rounded font-black uppercase mt-0.5">
                              Por Aprobar
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {tr.pendingAmount > 0 ? (
                          <span className="text-amber-500">${tr.pendingAmount.toLocaleString('es-AR')}</span>
                        ) : (
                          <span className="text-[var(--text-muted)] font-normal">Saldado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {tr.isRefunded ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                            ↩ Reembolsado ${tr.refundAmount.toLocaleString('es-AR')}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {!tr.isPaid ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setRefundError(null);
                                  setTournamentConfirmTarget({
                                    action: 'approve',
                                    tournament: tr.tournament,
                                    team: tr.team,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-bold text-[10px] cursor-pointer shadow-xs"
                              >
                                {tr.isAwaiting ? 'Aprobar Pago' : 'Cobrar Inscripción'}
                              </button>
                            ) : (
                              <>
                                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">✓ Paga</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRefundError(null);
                                    setTournamentConfirmTarget({
                                      action: 'refund',
                                      tournament: tr.tournament,
                                      team: tr.team,
                                    });
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold text-[10px] cursor-pointer"
                                >
                                  Devolver
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[var(--bg-subtle)]/60">
                      <td className="py-3 px-4 font-mono font-semibold text-[var(--text-secondary)]">#{b.bookingCode}</td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">{b.clientName}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{b.courtName.split('-')[0]}</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)] font-mono tabular-nums">{b.date} {b.startTime}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)] px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                            {b.paymentMethod}
                          </span>
                          {b.receiptUrl && (
                            <button
                              type="button"
                              onClick={(e) => openReceiptPreview(b.receiptUrl, e)}
                              className="p-1 rounded bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 cursor-pointer transition-colors"
                              title="Ver comprobante adjunto"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
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
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
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
                            {b.status === 'awaiting_approval' ? (
                              <button
                                type="button"
                                onClick={() => setCollectConfirmBooking({ action: 'approve_booking', booking: b })}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-bold text-[10px] cursor-pointer shadow-xs"
                              >
                                Aprobar Pago
                              </button>
                            ) : b.balanceDue > 0 ? (
                              <button
                                type="button"
                                onClick={() => setCollectConfirmBooking({ action: 'collect_balance', booking: b })}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-bold text-[10px] cursor-pointer shadow-xs"
                              >
                                Cobrar Saldo
                              </button>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">✓ Saldado</span>
                            )}
                            <button
                              type="button"
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
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL: COLLECT BALANCE OR APPROVE BOOKING */}
      {collectConfirmBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/40 text-[var(--text-primary)] space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    {collectConfirmBooking.action === 'approve_booking'
                      ? '¿Confirmar Aprobación de Pago?'
                      : '¿Confirmar Cobro de Saldo?'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Turno #{collectConfirmBooking.booking.bookingCode} · {collectConfirmBooking.booking.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectConfirmBooking(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Cancha:</span>
                <span className="font-semibold">{collectConfirmBooking.booking.courtName.split('-')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Importe a registrar:</span>
                <span className="font-extrabold text-emerald-500 tabular-nums">
                  $
                  {(collectConfirmBooking.action === 'approve_booking'
                    ? (collectConfirmBooking.booking.amountPaid ||
                      collectConfirmBooking.booking.totalAmount * (collectConfirmBooking.booking.isDepositOnly ? 0.5 : 1))
                    : collectConfirmBooking.booking.balanceDue
                  ).toLocaleString('es-AR')}
                </span>
              </div>
              {collectConfirmBooking.booking.receiptUrl && (
                <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between">
                  <span className="text-[var(--text-muted)] font-semibold">Comprobante adjunto:</span>
                  <button
                    type="button"
                    onClick={(e) => openReceiptPreview(collectConfirmBooking.booking.receiptUrl, e)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Ver Comprobante</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setCollectConfirmBooking(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCollectOrApproveBooking}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-extrabold text-xs cursor-pointer shadow-sm"
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: TOURNAMENT TEAM PAYMENT OR REFUND */}
      {tournamentConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--border-strong)] text-[var(--text-primary)] space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    tournamentConfirmTarget.action === 'refund'
                      ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  {tournamentConfirmTarget.action === 'refund' ? <RotateCcw className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    {tournamentConfirmTarget.action === 'refund'
                      ? '¿Confirmar Devolución de Inscripción?'
                      : '¿Confirmar Cobro de Inscripción?'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {tournamentConfirmTarget.team.teamName} · {tournamentConfirmTarget.tournament.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => {
                  setTournamentConfirmTarget(null);
                  setRefundError(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Capitán:</span>
                <span className="font-semibold">{tournamentConfirmTarget.team.captainName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Monto:</span>
                <span className="font-extrabold text-[var(--accent)] tabular-nums">
                  ${Number(tournamentConfirmTarget.team.amountPaid ?? tournamentConfirmTarget.tournament.entryFee ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {refundError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-500 space-y-2">
                <p className="font-bold">{refundError}</p>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => handleExecuteTournamentAction(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                >
                  Registrar Devolución Manual Igualmente
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => {
                  setTournamentConfirmTarget(null);
                  setRefundError(null);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => handleExecuteTournamentAction(false)}
                className={`px-5 py-2 rounded-xl font-extrabold text-xs cursor-pointer flex items-center gap-1.5 ${
                  tournamentConfirmTarget.action === 'refund'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-[#090D12]'
                }`}
              >
                {isRefunding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sí, Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CANCEL BOOKING & REFUND MONEY */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-500/40 text-[var(--text-primary)] space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    ¿Cancelar y Devolver Dinero?
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Turno #{cancelTarget.bookingCode} · {cancelTarget.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => setCancelTarget(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Cancha / Fecha:</span>
                <span className="font-bold">
                  {cancelTarget.courtName.split('-')[0]} ({cancelTarget.date} {cancelTarget.startTime})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Importe a devolver:</span>
                <span className="font-extrabold text-emerald-400 tabular-nums">
                  ${cancelTarget.amountPaid.toLocaleString('es-AR')}
                </span>
              </div>
              <p className="text-[11px] text-sky-400 font-semibold pt-1 border-t border-[var(--border-hairline)]">
                {cancelTarget.paymentMethod === 'mercadopago' && cancelTarget.amountPaid > 0
                  ? 'Se intentará el reembolso automático a la cuenta de Mercado Pago del cliente.'
                  : 'Se registrará el reintegro en caja y la cancha quedará libre en la grilla.'}
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span>Enviar aviso de devolución por WhatsApp al jugador</span>
            </label>

            {refundError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <p className="font-bold">{refundError}</p>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => handleConfirmRefund(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                >
                  Registrar Devolución Manual Igualmente
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => handleConfirmRefund(false)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isRefunding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirmar Devolución</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE PREVIEW (PORTAL) */}
      {receiptPreviewUrl && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptPreviewUrl(null);
          }}
        >
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-[var(--border-strong)] space-y-3 relative my-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">Comprobante de Pago</h4>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!receiptLoadError && (
                  <button
                    type="button"
                    onClick={() => setReceiptZoomed((z) => !z)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                    title={receiptZoomed ? 'Reducir zoom' : 'Ampliar zoom'}
                  >
                    {receiptZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setReceiptPreviewUrl(null)} 
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  title="Cerrar comprobante"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-xl bg-black/70 border border-[var(--border-hairline)] max-h-[75vh] flex items-center justify-center p-2">
              {receiptLoadError ? (
                <div className="p-6 text-center space-y-2 text-xs text-[var(--text-secondary)]">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="font-bold text-[var(--text-primary)]">No se pudo decodificar la imagen del comprobante.</p>
                  <p>Pedile al jugador que envíe una captura más liviana por WhatsApp si es necesario.</p>
                </div>
              ) : (
                <img
                  src={receiptPreviewUrl}
                  alt="Comprobante de pago"
                  onError={() => setReceiptLoadError(true)}
                  onClick={() => setReceiptZoomed((z) => !z)}
                  className={`rounded-lg select-none cursor-zoom-in transition-transform duration-200 ${
                    receiptZoomed ? 'w-full max-w-none scale-125 origin-center cursor-zoom-out' : 'max-w-full max-h-[70vh] object-contain'
                  }`}
                />
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-muted)]">
                Tocá la imagen para hacer zoom · Cerrar para regresar
              </span>
              <button
                type="button"
                onClick={() => setReceiptPreviewUrl(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
