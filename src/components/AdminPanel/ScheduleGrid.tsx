import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Court, TimeSlot, Booking } from '../../types';
import { getUnionHoursRange, getNormalizedCourtSchedule } from '../../utils/scheduleHours';
import { getSafeReceiptUrl } from '../../utils/imageUpload';
import { useBackHandler } from '../../hooks/useBackHandler';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Plus, 
  MessageCircle, 
  CreditCard,
  DollarSign,
  Loader2,
  RotateCcw,
  Bell,
  Repeat,
  Image as ImageIcon,
  Maximize2
} from 'lucide-react';

export const ScheduleGrid: React.FC = () => {
  const { 
    adminCourts: courts, 
    adminBookings: bookings, 
    selectedDate, 
    setSelectedDate,
    getSlotsForCourtAndDate,
    createManualAdminBooking,
    createRecurringAdminBookings,
    cancelRecurringSeries,
    cancelBooking,
    collectBalanceAtCourt,
    blockTimeSlot,
    unblockTimeSlot,
    triggerWhatsAppSend,
    confirmBookingPayment,
    sendManualBookingPush,
    hasBookingPushSubscription
  } = useApp();

  // Selected item modal states
  const [modalSlot, setModalSlot] = useState<{ court: Court; slot: TimeSlot } | null>(null);
  const [activeBookingDetails, setActiveBookingDetails] = useState<Booking | null>(null);

  // Manual booking form inside modal
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+549280');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('Reserva telefónica / mostrador');
  const [isDepositOnly, setIsDepositOnly] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo_mostrador' | 'mercadopago' | 'transferencia'>('efectivo_mostrador');
  const [isRecurring, setIsRecurring] = useState(false);
  const [weeksCount, setWeeksCount] = useState<number>(4);
  const [blockReason, setBlockReason] = useState('Mantenimiento de césped y pintura');
  const [isBlockingMode, setIsBlockingMode] = useState(false);

  // Visual cancellation & refund confirmation modal state
  const [cancelConfirmBooking, setCancelConfirmBooking] = useState<Booking | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [notifyClientOnRefund, setNotifyClientOnRefund] = useState(true);
  const [refundFeedback, setRefundFeedback] = useState<string | null>(null);
  const [isSendingPush, setIsSendingPush] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [pendingPaymentAction, setPendingPaymentAction] = useState<{
    type: 'approve' | 'collect_balance';
    booking: Booking;
  } | null>(null);

  useBackHandler(
    Boolean(modalSlot || activeBookingDetails),
    () => {
      setModalSlot(null);
      setActiveBookingDetails(null);
    },
    'admin-schedule-slot-modal'
  );
  useBackHandler(
    Boolean(pendingPaymentAction),
    () => setPendingPaymentAction(null),
    'admin-schedule-payment-confirm-modal'
  );
  useBackHandler(
    Boolean(cancelConfirmBooking),
    () => {
      if (!isRefunding) {
        setCancelConfirmBooking(null);
        setRefundError(null);
      }
    },
    'admin-schedule-cancel-modal'
  );
  useBackHandler(
    Boolean(receiptPreviewUrl),
    () => setReceiptPreviewUrl(null),
    'admin-schedule-receipt-modal'
  );

  const hours = getUnionHoursRange(courts);

  const pendingBookingsForDate = bookings.filter(b => b.date === selectedDate && b.status === 'pending_payment');

  const handleSlotClick = (court: Court, slot: TimeSlot) => {
    // Check if slot has an existing active booking (confirmed, pending, or blocked)
    const booking = slot.bookingId 
      ? bookings.find(item => item.id === slot.bookingId || item.bookingCode === slot.bookingId)
      : bookings.find(item => item.courtId === court.id && item.date === slot.date && item.startTime === slot.startTime);

    if (slot.status === 'blocked' && !booking) {
      setRefundFeedback(slot.blockedReason || 'Horario bloqueado por torneo/evento.');
      setTimeout(() => setRefundFeedback(null), 5000);
      return;
    }

    if (slot.status === 'booked' || slot.status === 'blocked' || slot.status === 'pending' || booking) {
      if (booking && booking.status !== 'cancelled') {
        setActiveBookingDetails(booking);
        return;
      }
    }

    // Available slot clicked: open manual creation
    setModalSlot({ court, slot });
    setIsBlockingMode(false);
    setIsRecurring(false);
    setWeeksCount(4);
    setClientName('');
    setClientPhone('+549280');
  };

  const handleCreateManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSlot) return;

    if (isBlockingMode) {
      blockTimeSlot(modalSlot.court.id, modalSlot.slot.date, modalSlot.slot.startTime, 60, blockReason);
      setModalSlot(null);
      return;
    }

    if (!clientName.trim() || !clientPhone.trim()) return;

    if (isRecurring) {
      const { createdBookings, skippedDates } = await createRecurringAdminBookings({
        courtId: modalSlot.court.id,
        date: modalSlot.slot.date,
        startTime: modalSlot.slot.startTime,
        durationMinutes: 60,
        clientName,
        clientPhone,
        clientEmail: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '')}@pmy.com`,
        notes,
        totalAmount: modalSlot.slot.price,
        isDepositOnly,
        paymentMethod,
        weeksCount,
      });
      setModalSlot(null);
      const skipMsg = skippedDates.length > 0 ? ` (${skippedDates.length} fechas omitidas por superposición)` : '';
      setRefundFeedback(`Se crearon ${createdBookings.length} turnos fijos semanales${skipMsg}.`);
      setTimeout(() => setRefundFeedback(null), 6500);
      return;
    }

    createManualAdminBooking({
      courtId: modalSlot.court.id,
      date: modalSlot.slot.date,
      startTime: modalSlot.slot.startTime,
      durationMinutes: 60,
      clientName,
      clientPhone,
      clientEmail: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '')}@pmy.com`,
      notes,
      totalAmount: modalSlot.slot.price,
      isDepositOnly,
      paymentMethod,
    });

    setModalSlot(null);
  };

  const handleConfirmCancelAndRefund = async (forceManual = false) => {
    if (!cancelConfirmBooking) return;
    setIsRefunding(true);
    setRefundError(null);

    const res = await cancelBooking(cancelConfirmBooking.id, {
      forceManual,
      notifyWhatsApp: notifyClientOnRefund
    });

    setIsRefunding(false);
    if (!res.success) {
      setRefundError(res.message || 'No se pudo procesar la devolución automática.');
      return;
    }

    setCancelConfirmBooking(null);
    setActiveBookingDetails(null);
    setRefundFeedback(res.message || 'Turno cancelado con éxito.');
    setTimeout(() => setRefundFeedback(null), 6000);
  };

  return (
    <div className="space-y-4">
      {refundFeedback && (
        <div className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-800 dark:text-emerald-200 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{refundFeedback}</span>
          </div>
          <button onClick={() => setRefundFeedback(null)} className="text-emerald-700 dark:text-emerald-300 hover:opacity-80 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Date Switcher & Clean Status Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-hairline)]">
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
            Fecha
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Legend with exact states */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-400/60" /> Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-400 border border-amber-500" /> Reservado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500 border border-sky-400" /> Pagado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[var(--bg-subtle)] border border-[var(--border-strong)]" /> Bloqueado
          </span>
        </div>
      </div>

      {/* Pending Bookings Alert Banner */}
      {pendingBookingsForDate.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/35 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Hay {pendingBookingsForDate.length} {pendingBookingsForDate.length === 1 ? 'turno reservado pendiente' : 'turnos reservados pendientes'} de confirmación para el {selectedDate}.</span>
          </div>
          <span className="text-[11px] text-amber-800 dark:text-amber-300/90">
            Hacé clic en los casilleros amarillos para verificar el pago y confirmarlo.
          </span>
        </div>
      )}

      {/* Interactive Compact Matrix Table or Empty State */}
      {courts.length === 0 || hours.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-8 text-center space-y-2">
          <Clock className="w-8 h-8 text-[var(--accent)] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-[var(--text-primary)] font-heading uppercase tracking-wide">
            No hay canchas configuradas para mostrar horarios
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Ingresá en la pestaña <strong className="text-[var(--text-primary)]">Canchas &amp; Tarifas</strong> para agregar una cancha y definir su rango horario operativo (<code className="font-mono text-[var(--accent-soft-text)]">hora_inicio</code> y <code className="font-mono text-[var(--accent-soft-text)]">hora_fin</code>).
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-x-auto">
          <table className="w-auto min-w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-primary)] border-b border-[var(--border-hairline)]">
                <th className="py-2.5 px-2 font-mono font-semibold sticky left-0 bg-[var(--bg-subtle)] z-10 w-14 min-w-[56px] max-w-[56px] text-center text-xs">
                  Hora
                </th>
                {courts.map((court) => {
                  const sched = getNormalizedCourtSchedule(court);
                  return (
                    <th key={court.id} className="py-2.5 px-2 font-semibold border-l border-[var(--border-hairline)] w-28 min-w-[105px] max-w-[130px] text-center">
                      <div className="truncate text-xs font-bold text-[var(--text-primary)]">{court.name.split('-')[0].trim()}</div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium truncate">
                        {court.sport}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--accent-soft-text)] mt-0.5 tabular-nums">
                        {sched.hora_inicio}–{sched.hora_fin}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {hours.map((hour) => (
                <tr key={hour} className="hover:bg-[var(--bg-elevated)]/50 transition-colors">
                  
                  {/* Hour Header Column */}
                  <td className="py-2 px-1 font-mono text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-subtle)] sticky left-0 z-10 border-r border-[var(--border-hairline)] text-center tabular-nums w-14 min-w-[56px] max-w-[56px]">
                    {hour}
                  </td>

                  {/* Courts Columns */}
                  {courts.map((court) => {
                    const slots = getSlotsForCourtAndDate(court.id, selectedDate);
                    const slot = slots.find(s => s.startTime === hour);
                    if (!slot) {
                      return (
                        <td key={court.id} className="p-1 border-l border-[var(--border-hairline)] w-28 min-w-[105px] max-w-[130px]">
                          <div className="w-full h-15 rounded-xl bg-[var(--bg-canvas)]/70 border border-dashed border-[var(--border-hairline)] flex items-center justify-center text-[10px] font-medium text-[var(--text-muted)]">
                            Cerrado
                          </div>
                        </td>
                      );
                    }

                    const booking = slot.bookingId 
                      ? bookings.find(b => b.id === slot.bookingId || b.bookingCode === slot.bookingId) 
                      : bookings.find(b => b.courtId === court.id && b.date === selectedDate && b.startTime === hour);

                    const isBlocked = slot.status === 'blocked' || booking?.clientName?.startsWith('[BLOQUEADO');
                    const isPending = slot.status === 'pending' || booking?.status === 'pending_payment' || booking?.status === 'awaiting_approval';
                    const isConfirmed = (slot.status === 'booked' || booking?.status === 'confirmed') && !isBlocked && !isPending;
                    
                    // Status evaluation: "Pagado" if 100% paid; "Reservado" if deposit paid or pending
                    const isFullyPaid = isConfirmed && booking && (booking.paymentStatus === 'total_pagado' || booking.balanceDue === 0);
                    const isReserved = (isConfirmed && booking && !isFullyPaid) || (isPending && booking);
                    const needsApproval = booking?.status === 'awaiting_approval';

                    return (
                      <td key={court.id} className="p-1 border-l border-[var(--border-hairline)] w-28 min-w-[105px] max-w-[130px]">
                        {isBlocked ? (
                          <button
                            onClick={() => handleSlotClick(court, slot)}
                            className="w-full h-15 px-1 py-1 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] transition-colors cursor-pointer flex flex-col items-center justify-center text-center"
                            title={slot.blockedReason || booking?.notes || 'Mantenimiento'}
                          >
                            <Lock className="w-3.5 h-3.5 text-[var(--text-muted)] mb-0.5" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] truncate max-w-[95%]">
                              {slot.blockedReason?.startsWith('Torneo') ? 'Torneo' : 'Bloqueado'}
                            </span>
                          </button>
                        ) : isFullyPaid && booking ? (
                          <button
                            onClick={() => handleSlotClick(court, slot)}
                            className="w-full h-15 px-1 py-1 rounded-xl bg-sky-600/90 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center border border-sky-400/70"
                            title={`PAGADO: ${booking.clientName} (#${booking.bookingCode})`}
                          >
                            <span className="font-bold text-[11px] text-sky-100 truncate max-w-[95%] leading-tight text-center">
                              {booking.clientName}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-white mt-0.5 flex items-center gap-1">
                              {booking.recurringGroupId && <Repeat className="w-2.5 h-2.5" />}
                              <span>{booking.recurringGroupId ? `Fijo ${booking.recurringIndex || ''}/${booking.recurringTotal || ''}` : 'Pagado'}</span>
                            </span>
                          </button>
                        ) : isReserved && booking ? (
                          <button
                            onClick={() => handleSlotClick(court, slot)}
                            className={`w-full h-15 px-1 py-1 rounded-xl transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center border-2 ${
                              needsApproval 
                                ? 'bg-amber-400 hover:bg-amber-300 border-rose-500 animate-pulse' 
                                : 'bg-amber-400 hover:bg-amber-300 border-amber-500'
                            }`}
                            title={needsApproval ? `POR APROBAR: ${booking.clientName} - Comprobante enviado` : `RESERVADO: ${booking.clientName} (#${booking.bookingCode}) - Saldo: $${booking.balanceDue.toLocaleString('es-AR')}`}
                          >
                            <span className="font-bold text-[11px] text-[#090D12] truncate max-w-[95%] leading-tight text-center">
                              {booking.clientName}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-[#090D12] mt-0.5 flex items-center gap-1">
                              {booking.recurringGroupId && <Repeat className="w-2.5 h-2.5" />}
                              <span>{needsApproval ? 'A Aprobar' : booking.recurringGroupId ? `Fijo ${booking.recurringIndex || ''}/${booking.recurringTotal || ''}` : 'Reservado'}</span>
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSlotClick(court, slot)}
                            className="w-full h-15 px-1 py-1 rounded-xl bg-emerald-500/10 hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] hover:border-[var(--accent)] border border-dashed border-emerald-500/40 text-[var(--text-primary)] transition-all cursor-pointer flex flex-col items-center justify-center group"
                            title={`Horario Libre (1 hora) - $${slot.price.toLocaleString('es-AR')} - Clic para agendar`}
                          >
                            <span className="font-mono font-black text-xs sm:text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-ink)] leading-tight tabular-nums">
                              ${slot.price.toLocaleString('es-AR')}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 group-hover:text-[var(--accent-ink)] mt-0.5">
                              Libre
                            </span>
                          </button>
                        )}
                      </td>
                    );
                  })}

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MANUAL BOOKING / BLOCK SLOT MODAL */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[var(--text-primary)] space-y-4 border border-[var(--border-strong)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                  {modalSlot.court.name}
                </span>
                <h3 className="text-lg font-bold font-heading text-[var(--text-primary)] uppercase tracking-wide">
                  {isBlockingMode ? 'Bloquear Horario de Cancha' : 'Nueva Reserva Mostrador / Teléfono'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {modalSlot.slot.date} • {modalSlot.slot.startTime} a {modalSlot.slot.endTime} hs (1 hora · ${modalSlot.slot.price.toLocaleString('es-AR')})
                </p>
              </div>
              <button onClick={() => setModalSlot(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode toggle: Reserva vs Bloqueo */}
            <div className="flex bg-[var(--bg-canvas)] p-1 rounded-xl text-xs font-bold border border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setIsBlockingMode(false)}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${!isBlockingMode ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Agendar Cliente
              </button>
              <button
                type="button"
                onClick={() => setIsBlockingMode(true)}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${isBlockingMode ? 'bg-amber-400 text-[#090D12] shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Bloquear / Torneo / Mantenimiento
              </button>
            </div>

            <form onSubmit={handleCreateManualBookingSubmit} className="space-y-3 text-xs">
              
              {isBlockingMode ? (
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Motivo del Bloqueo</label>
                  <input
                    type="text"
                    required
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ej: Mantenimiento de reflectores, Escuelita de fútbol..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre del Cliente</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Nicolás Castro"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Celular (WhatsApp para aviso automático)</label>
                    <input
                      type="tel"
                      required
                      placeholder="+5492804..."
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-[var(--text-secondary)] block mb-1">Medio de Pago</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      >
                        <option value="efectivo_mostrador">Efectivo en Mostrador</option>
                        <option value="mercadopago">Mercado Pago (QR)</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-[var(--text-secondary)] block mb-1">Cobro Inicial</label>
                      {(() => {
                        const courtDeposit = typeof modalSlot.court.depositRequired === 'number' && !isNaN(modalSlot.court.depositRequired) && modalSlot.court.depositRequired >= 0 && modalSlot.court.depositRequired <= 100 ? modalSlot.court.depositRequired : 50;
                        const depAmount = Math.round(modalSlot.slot.price * (courtDeposit / 100));
                        return (
                          <select
                            value={isDepositOnly ? 'seña' : 'total'}
                            onChange={(e) => setIsDepositOnly(e.target.value === 'seña')}
                            className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                          >
                            <option value="total">Total 100% (${modalSlot.slot.price.toLocaleString('es-AR')})</option>
                            <option value="seña">Seña {courtDeposit}% (${depAmount.toLocaleString('es-AR')})</option>
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[var(--text-secondary)] block mb-1">Observaciones</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  {/* Turno Fijo / Abono Semanal Recurrente */}
                  <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5">
                    <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
                      <span className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                        <Repeat className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Repetir como Turno Fijo Semanal (Abono)</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="w-4 h-4 accent-[var(--accent)]"
                      />
                    </label>
                    {isRecurring && (
                      <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-hairline)]">
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          Repetir mismo día y hora durante:
                        </span>
                        <select
                          value={weeksCount}
                          onChange={(e) => setWeeksCount(Number(e.target.value))}
                          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)]"
                        >
                          <option value={4}>4 semanas</option>
                          <option value={6}>6 semanas</option>
                          <option value={8}>8 semanas</option>
                          <option value={12}>12 semanas</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setModalSlot(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer ${
                    isBlockingMode
                      ? 'bg-amber-400 hover:bg-amber-300 text-[#090D12]'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)]'
                  }`}
                >
                  {isBlockingMode ? 'Confirmar Bloqueo' : 'Crear y Notificar WhatsApp'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW / MANAGE EXISTING BOOKING MODAL */}
      {activeBookingDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[var(--text-primary)] space-y-4 border border-[var(--border-strong)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <span className="font-mono text-xs font-bold text-[var(--accent-soft-text)]">
                  #{activeBookingDetails.bookingCode}
                </span>
                <h3 className="text-lg font-bold font-heading text-[var(--text-primary)] uppercase tracking-wide">
                  {activeBookingDetails.courtName}
                </h3>
              </div>
              <button onClick={() => setActiveBookingDetails(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If it was a blocked slot */}
            {activeBookingDetails.clientName.startsWith('[BLOQUEADO') ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-500/15 border border-amber-500/35 rounded-2xl text-amber-900 dark:text-amber-200">
                  <strong>Horario Bloqueado</strong>
                  <p className="mt-1">{activeBookingDetails.notes}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      unblockTimeSlot(activeBookingDetails.id);
                      setActiveBookingDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold cursor-pointer"
                  >
                    Desbloquear y Dejar Libre
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Client info */}
                <div className="p-3 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-hairline)] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Cliente:</span>
                    <strong className="text-[var(--text-primary)]">{activeBookingDetails.clientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Teléfono:</span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{activeBookingDetails.clientPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Fecha y Hora:</span>
                    <span className="font-bold text-[var(--text-primary)]">{activeBookingDetails.date} ({activeBookingDetails.startTime} a {activeBookingDetails.endTime} hs)</span>
                  </div>
                </div>

                {/* Financial details */}
                <div className="p-3 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-hairline)] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Total Cancha:</span>
                    <span className="font-bold text-[var(--text-primary)]">${activeBookingDetails.totalAmount.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                    <span>Abonado ({activeBookingDetails.paymentMethod.toUpperCase()}):</span>
                    <span className="font-extrabold">${activeBookingDetails.amountPaid.toLocaleString('es-AR')}</span>
                  </div>
                  
                  {activeBookingDetails.receiptUrl && (
                    <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Comprobante Adjunto (CBU/Transf.):</p>
                        <button
                          type="button"
                          onClick={() => setReceiptPreviewUrl(getSafeReceiptUrl(activeBookingDetails.receiptUrl))}
                          className="text-[10px] text-sky-400 hover:text-sky-300 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>Pantalla completa</span>
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setReceiptPreviewUrl(getSafeReceiptUrl(activeBookingDetails.receiptUrl))}
                        className="w-full block relative group overflow-hidden rounded-xl border border-[var(--border-strong)] cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        title="Hacer clic para ampliar comprobante sin salir de la página"
                      >
                        <img 
                          src={getSafeReceiptUrl(activeBookingDetails.receiptUrl)} 
                          alt="Comprobante de reserva" 
                          className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="inline-flex items-center gap-1.5 text-xs text-white font-bold bg-[#090D12]/90 px-3 py-1.5 rounded-lg shadow-md border border-white/10">
                            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                            Ampliar Comprobante
                          </span>
                        </div>
                      </button>
                    </div>
                  )}

                  {activeBookingDetails.balanceDue > 0 ? (
                    <div className="flex justify-between text-amber-700 dark:text-amber-300 font-bold pt-1 border-t border-[var(--border-hairline)]">
                      <span>Saldo Pendiente en Cancha:</span>
                      <span>${activeBookingDetails.balanceDue.toLocaleString('es-AR')}</span>
                    </div>
                  ) : (
                    <div className="text-emerald-700 dark:text-emerald-300 font-bold pt-1 border-t border-[var(--border-hairline)]">
                      ✓ Saldo Totalmente Cancelado
                    </div>
                  )}
                </div>

                {/* Estado de notificaciones Push en dispositivo del jugador */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)]">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                    <Bell className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                    <span>Notificaciones Push:</span>
                    <strong className={hasBookingPushSubscription(activeBookingDetails) ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}>
                      {hasBookingPushSubscription(activeBookingDetails) ? 'Activas en dispositivo' : 'Sin suscripción Push'}
                    </strong>
                  </span>
                  {hasBookingPushSubscription(activeBookingDetails) && (
                    <button
                      type="button"
                      disabled={isSendingPush}
                      onClick={async () => {
                        setIsSendingPush(true);
                        const res = await sendManualBookingPush(activeBookingDetails);
                        setIsSendingPush(false);
                        setRefundFeedback(
                          res.sentCount > 0
                            ? `Aviso Push enviado al dispositivo del jugador (#${activeBookingDetails.bookingCode}).`
                            : 'No se encontró suscripción Push activa para este dispositivo.'
                        );
                        setTimeout(() => setRefundFeedback(null), 5000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] hover:opacity-85 text-[var(--accent-soft-text)] font-bold text-[10px] cursor-pointer disabled:opacity-50"
                    >
                      {isSendingPush ? 'Enviando...' : 'Enviar Push'}
                    </button>
                  )}
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  {(activeBookingDetails.status === 'pending_payment' || activeBookingDetails.status === 'awaiting_approval') && (
                    <button
                      type="button"
                      onClick={() => setPendingPaymentAction({ type: 'approve', booking: activeBookingDetails })}
                      className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>✓ Aprobar Pago y Confirmar Turno</span>
                    </button>
                  )}

                  {activeBookingDetails.balanceDue > 0 && activeBookingDetails.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={() => setPendingPaymentAction({ type: 'collect_balance', booking: activeBookingDetails })}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Cobrar Saldo de ${activeBookingDetails.balanceDue.toLocaleString('es-AR')} en Mostrador</span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => triggerWhatsAppSend(activeBookingDetails)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/35 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Reenviar WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRefundError(null);
                        setNotifyClientOnRefund(true);
                        setCancelConfirmBooking(activeBookingDetails);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 border border-rose-500/35 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cancelar y Devolver</span>
                    </button>
                  </div>

                  {activeBookingDetails.recurringGroupId && (
                    <button
                      type="button"
                      onClick={async () => {
                        const gid = activeBookingDetails.recurringGroupId!;
                        const { cancelledCount } = await cancelRecurringSeries(gid);
                        setActiveBookingDetails(null);
                        setRefundFeedback(`Se cancelaron ${cancelledCount} turnos pendientes de la serie fija.`);
                        setTimeout(() => setRefundFeedback(null), 6000);
                      }}
                      className="w-full py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Repeat className="w-3.5 h-3.5" />
                      <span>
                        Cancelar toda la serie fija ({activeBookingDetails.recurringIndex}/{activeBookingDetails.recurringTotal})
                      </span>
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* VISUAL CONFIRMATION MODAL: CANCEL BOOKING & REFUND PAID AMOUNT */}
      {cancelConfirmBooking && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[var(--text-primary)] space-y-4 border border-rose-500/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                    Confirmación Obligatoria
                  </span>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)] font-heading">
                    ¿Cancelar Turno y Devolver Importe?
                  </h3>
                </div>
              </div>
              <button
                onClick={() => !isRefunding && setCancelConfirmBooking(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-[var(--bg-canvas)] rounded-2xl border border-[var(--border-hairline)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Turno:</span>
                <strong className="font-mono text-[var(--text-primary)]">#{cancelConfirmBooking.bookingCode} • {cancelConfirmBooking.date} {cancelConfirmBooking.startTime} hs</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Jugador:</span>
                <strong className="text-[var(--text-primary)]">{cancelConfirmBooking.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Medio de Pago:</span>
                <strong className="uppercase text-[var(--text-secondary)]">{cancelConfirmBooking.paymentMethod}</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-hairline)]">
                <span className="font-bold text-rose-700 dark:text-rose-300">Importe abonado a devolver:</span>
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                  ${cancelConfirmBooking.amountPaid.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {(() => {
              const isCheckoutProAuto = Boolean(
                cancelConfirmBooking.amountPaid > 0 &&
                cancelConfirmBooking.paymentMethod === 'mercadopago' &&
                /^MP-\d{5,}$/.test(cancelConfirmBooking.paymentReference || '')
              );
              return (
                <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                  isCheckoutProAuto
                    ? 'bg-sky-500/15 border-sky-500/35 text-sky-800 dark:text-sky-200'
                    : 'bg-amber-500/15 border-amber-500/35 text-amber-900 dark:text-amber-200'
                }`}>
                  {cancelConfirmBooking.amountPaid <= 0 ? (
                    <span>Este turno no registra dinero acreditado aún. Al confirmar se cancelará y el horario quedará libre inmediatamente.</span>
                  ) : isCheckoutProAuto ? (
                    <span>Al confirmar, el sistema solicitará a <strong>Mercado Pago (Checkout Pro)</strong> el reembolso automático de <strong>${cancelConfirmBooking.amountPaid.toLocaleString('es-AR')}</strong> hacia el jugador y liberará el horario.</span>
                  ) : (
                    <span>
                      Los pagos realizados por <strong>CBU, Alias o transferencia directa</strong> no permiten devolución bancaria automática. Al confirmar, el turno pasará a estado <strong>Reembolsado (${cancelConfirmBooking.amountPaid.toLocaleString('es-AR')})</strong>, se liberará la cancha y deberás transferir el dinero manualmente al jugador.
                    </span>
                  )}
                </div>
              );
            })()}

            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyClientOnRefund}
                onChange={(e) => setNotifyClientOnRefund(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span>Enviar aviso de cancelación y devolución por WhatsApp al jugador</span>
            </label>

            {refundError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <p className="font-bold">{refundError}</p>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => handleConfirmCancelAndRefund(true)}
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
                onClick={() => setCancelConfirmBooking(null)}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => handleConfirmCancelAndRefund(false)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {isRefunding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando Devolución...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {cancelConfirmBooking.amountPaid > 0
                        ? `Confirmar y Devolver $${cancelConfirmBooking.amountPaid.toLocaleString('es-AR')}`
                        : 'Confirmar Cancelación'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR APPROVE PAYMENT / COLLECT BALANCE */}
      {pendingPaymentAction && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/40 text-[var(--text-primary)] space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">
                    {pendingPaymentAction.type === 'approve'
                      ? '¿Confirmar Aprobación de Pago?'
                      : '¿Confirmar Cobro de Saldo en Mostrador?'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Turno #{pendingPaymentAction.booking.bookingCode} · {pendingPaymentAction.booking.clientName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingPaymentAction(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Cancha y fecha:</span>
                <span className="font-semibold">
                  {pendingPaymentAction.booking.courtName.split('-')[0]} ({pendingPaymentAction.booking.date} {pendingPaymentAction.booking.startTime} hs)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">
                  {pendingPaymentAction.type === 'approve' ? 'Monto a acreditar:' : 'Saldo a cobrar:'}
                </span>
                <span className="font-extrabold text-emerald-500 tabular-nums">
                  $
                  {(pendingPaymentAction.type === 'approve'
                    ? (pendingPaymentAction.booking.amountPaid ||
                      pendingPaymentAction.booking.totalAmount * (pendingPaymentAction.booking.isDepositOnly ? 0.5 : 1))
                    : pendingPaymentAction.booking.balanceDue
                  ).toLocaleString('es-AR')}
                </span>
              </div>
              {pendingPaymentAction.booking.receiptUrl && (
                <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between">
                  <span className="text-[var(--text-muted)] font-semibold">Comprobante adjunto:</span>
                  <button
                    type="button"
                    onClick={() => setReceiptPreviewUrl(getSafeReceiptUrl(pendingPaymentAction.booking.receiptUrl))}
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
                onClick={() => setPendingPaymentAction(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingPaymentAction.booking;
                  const code = target.bookingCode;
                  if (pendingPaymentAction.type === 'approve') {
                    const paidAmount = target.amountPaid || target.totalAmount * (target.isDepositOnly ? 0.5 : 1);
                    confirmBookingPayment(
                      target.id,
                      `VERIFIED-ADMIN-${Date.now().toString().slice(-4)}`,
                      paidAmount
                    );
                    setRefundFeedback(`Turno #${code} aprobado y confirmado correctamente.`);
                  } else {
                    collectBalanceAtCourt(target.id);
                    setRefundFeedback(`Saldo cobrado para el turno #${code}. Quedó saldado 100%.`);
                  }
                  setPendingPaymentAction(null);
                  setActiveBookingDetails(null);
                  setTimeout(() => setRefundFeedback(null), 6000);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#090D12] font-extrabold text-xs cursor-pointer shadow-sm"
              >
                Sí, Confirmar Operación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE PREVIEW LIGHTBOX */}
      {receiptPreviewUrl && (
        <div 
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptPreviewUrl(null);
          }}
        >
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-[var(--border-strong)] space-y-3 relative my-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Comprobante de Pago CBU / Transferencia</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setReceiptPreviewUrl(null)} 
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                title="Cerrar comprobante (o presionar Volver)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl bg-black/60 border border-[var(--border-hairline)] max-h-[75vh] flex items-center justify-center p-2">
              <img
                src={receiptPreviewUrl}
                alt="Comprobante de pago"
                className="max-w-full max-h-[70vh] object-contain rounded-lg select-none"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-muted)]">
                Presione Volver o Cerrar para regresar
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
        </div>
      )}

    </div>
  );
};
