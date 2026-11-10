import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Court, TimeSlot, Booking } from '../../types';
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
  DollarSign
} from 'lucide-react';

export const ScheduleGrid: React.FC = () => {
  const { 
    courts, 
    bookings, 
    selectedDate, 
    setSelectedDate,
    getSlotsForCourtAndDate,
    createManualAdminBooking,
    cancelBooking,
    collectBalanceAtCourt,
    blockTimeSlot,
    unblockTimeSlot,
    triggerWhatsAppSend,
    confirmBookingPayment
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
  const [blockReason, setBlockReason] = useState('Mantenimiento de césped y pintura');
  const [isBlockingMode, setIsBlockingMode] = useState(false);

  const hours = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
    '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
  ];

  const pendingBookingsForDate = bookings.filter(b => b.date === selectedDate && b.status === 'pending_payment');

  const handleSlotClick = (court: Court, slot: TimeSlot) => {
    // Check if slot has an existing booking (confirmed, pending, or blocked)
    const booking = slot.bookingId 
      ? bookings.find(item => item.id === slot.bookingId || item.bookingCode === slot.bookingId)
      : bookings.find(item => item.courtId === court.id && item.date === slot.date && item.startTime === slot.startTime);

    if (slot.status === 'booked' || slot.status === 'blocked' || slot.status === 'pending' || booking) {
      if (booking) {
        setActiveBookingDetails(booking);
        return;
      }
    }

    // Available slot clicked: open manual creation
    setModalSlot({ court, slot });
    setIsBlockingMode(false);
    setClientName('');
    setClientPhone('+549280');
  };

  const handleCreateManualBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSlot) return;

    if (isBlockingMode) {
      blockTimeSlot(modalSlot.court.id, modalSlot.slot.date, modalSlot.slot.startTime, 60, blockReason);
      setModalSlot(null);
      return;
    }

    if (!clientName.trim() || !clientPhone.trim()) return;

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

  return (
    <div className="space-y-4">
      
      {/* Date Switcher & Clean Status Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Fecha:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Legend with exact states */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 border border-emerald-400" /> Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-amber-400 border border-amber-500" /> Reservado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-blue-600" /> Pagado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-slate-200 border border-slate-300" /> Bloqueado
          </span>
        </div>
      </div>

      {/* Pending Bookings Alert Banner */}
      {pendingBookingsForDate.length > 0 && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-amber-950 font-bold">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span>Hay {pendingBookingsForDate.length} {pendingBookingsForDate.length === 1 ? 'turno reservado pendiente' : 'turnos reservados pendientes'} de confirmación para el {selectedDate}.</span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium">
            Hacé clic en los casilleros amarillos para verificar el pago y confirmarlo.
          </span>
        </div>
      )}

      {/* Interactive Compact Matrix Table (Taller and Narrower Buttons) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-auto min-w-full border-collapse text-xs text-left">
          <thead>
            <tr className="bg-slate-900 text-white border-b border-slate-800">
              <th className="py-2.5 px-2 font-mono font-bold sticky left-0 bg-slate-900 z-10 w-14 min-w-[56px] max-w-[56px] text-center text-xs">
                Hora
              </th>
              {courts.map((court) => (
                <th key={court.id} className="py-2.5 px-1 font-bold border-l border-slate-800 w-28 min-w-[105px] max-w-[125px] text-center">
                  <div className="truncate text-xs font-bold">{court.name.split('-')[0].trim()}</div>
                  <div className="text-[10px] text-slate-400 font-normal truncate">
                    {court.sport.toUpperCase()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hours.map((hour) => (
              <tr key={hour} className="hover:bg-slate-50/60 transition-colors">
                
                {/* Hour Header Column */}
                <td className="py-2 px-1 font-mono text-xs font-black text-slate-800 bg-slate-100 sticky left-0 z-10 border-r border-slate-200 text-center w-14 min-w-[56px] max-w-[56px]">
                  {hour}
                </td>

                {/* Courts Columns */}
                {courts.map((court) => {
                  const slots = getSlotsForCourtAndDate(court.id, selectedDate);
                  const slot = slots.find(s => s.startTime === hour);
                  if (!slot) return <td key={court.id} className="p-1 border-l border-slate-100 w-28 min-w-[105px] max-w-[125px] text-center text-slate-300">-</td>;

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
                    <td key={court.id} className="p-1 border-l border-slate-100 w-28 min-w-[105px] max-w-[125px]">
                      {isBlocked ? (
                        <button
                          onClick={() => handleSlotClick(court, slot)}
                          className="w-full h-15 px-1 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-colors cursor-pointer flex flex-col items-center justify-center text-center shadow-xs"
                          title={slot.blockedReason || booking?.notes || 'Mantenimiento'}
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Bloqueado
                          </span>
                        </button>
                      ) : isFullyPaid && booking ? (
                        <button
                          onClick={() => handleSlotClick(court, slot)}
                          className="w-full h-15 px-1 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center border border-blue-400"
                          title={`PAGADO: ${booking.clientName} (#${booking.bookingCode})`}
                        >
                          <span className="font-bold text-[11px] text-blue-100 truncate max-w-[95%] leading-tight text-center">
                            {booking.clientName}
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-white mt-0.5">
                            Pagado
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
                          <span className="font-bold text-[11px] text-amber-950 truncate max-w-[95%] leading-tight text-center">
                            {booking.clientName}
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-950 mt-0.5">
                            {needsApproval ? 'A Aprobar' : 'Reservado'}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSlotClick(court, slot)}
                          className="w-full h-15 px-1 py-1 rounded-xl bg-emerald-50/80 hover:bg-emerald-500 hover:text-slate-950 border-2 border-dashed border-emerald-300 text-emerald-950 transition-all cursor-pointer flex flex-col items-center justify-center group shadow-xs"
                          title={`Horario Libre - $${slot.price.toLocaleString('es-AR')} - Clic para agendar`}
                        >
                          <span className="font-mono font-black text-xs sm:text-sm text-slate-900 group-hover:text-slate-950 leading-tight">
                            ${slot.price.toLocaleString('es-AR')}
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-700 group-hover:text-slate-950 mt-0.5">
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

      {/* CREATE MANUAL BOOKING / BLOCK SLOT MODAL */}
      {modalSlot && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  {modalSlot.court.name}
                </span>
                <h3 className="text-lg font-bold font-heading">
                  {isBlockingMode ? 'Bloquear Horario de Cancha' : 'Nueva Reserva Mostrador / Teléfono'}
                </h3>
                <p className="text-xs text-slate-500">
                  {modalSlot.slot.date} a las {modalSlot.slot.startTime} hs (Valor: ${modalSlot.slot.price.toLocaleString('es-AR')})
                </p>
              </div>
              <button onClick={() => setModalSlot(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode toggle: Reserva vs Bloqueo */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsBlockingMode(false)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${!isBlockingMode ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
              >
                Agendar Cliente
              </button>
              <button
                type="button"
                onClick={() => setIsBlockingMode(true)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${isBlockingMode ? 'bg-white shadow text-amber-700' : 'text-slate-500'}`}
              >
                Bloquear / Torneo / Mantenimiento
              </button>
            </div>

            <form onSubmit={handleCreateManualBookingSubmit} className="space-y-3 text-xs">
              
              {isBlockingMode ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Motivo del Bloqueo</label>
                  <input
                    type="text"
                    required
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ej: Mantenimiento de reflectores, Escuelita de fútbol..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Nombre del Cliente</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Nicolás Castro"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Celular (WhatsApp para aviso automático)</label>
                    <input
                      type="tel"
                      required
                      placeholder="+5492804..."
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Medio de Pago</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                      >
                        <option value="efectivo_mostrador">Efectivo en Mostrador</option>
                        <option value="mercadopago">Mercado Pago (QR)</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Cobro Inicial</label>
                      <select
                        value={isDepositOnly ? 'seña' : 'total'}
                        onChange={(e) => setIsDepositOnly(e.target.value === 'seña')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                      >
                        <option value="total">Total 100% (${modalSlot.slot.price.toLocaleString('es-AR')})</option>
                        <option value="seña">Seña 50% (${Math.round(modalSlot.slot.price * 0.5).toLocaleString('es-AR')})</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Observaciones</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalSlot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md ${
                    isBlockingMode ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">
                  #{activeBookingDetails.bookingCode}
                </span>
                <h3 className="text-lg font-bold font-heading">
                  {activeBookingDetails.courtName}
                </h3>
              </div>
              <button onClick={() => setActiveBookingDetails(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If it was a blocked slot */}
            {activeBookingDetails.clientName.startsWith('[BLOQUEADO') ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900">
                  <strong>Horario Bloqueado</strong>
                  <p className="mt-1">{activeBookingDetails.notes}</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      unblockTimeSlot(activeBookingDetails.id);
                      setActiveBookingDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 cursor-pointer"
                  >
                    Desbloquear y Dejar Libre
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Client info */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cliente:</span>
                    <strong className="text-slate-900">{activeBookingDetails.clientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Teléfono:</span>
                    <span className="font-mono font-bold text-emerald-700">{activeBookingDetails.clientPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fecha y Hora:</span>
                    <span className="font-bold">{activeBookingDetails.date} ({activeBookingDetails.startTime} hs)</span>
                  </div>
                </div>

                {/* Financial details */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Cancha:</span>
                    <span className="font-bold">${activeBookingDetails.totalAmount.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Abonado ({activeBookingDetails.paymentMethod.toUpperCase()}):</span>
                    <span className="font-extrabold">${activeBookingDetails.amountPaid.toLocaleString('es-AR')}</span>
                  </div>
                  
                  {activeBookingDetails.receiptUrl && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Comprobante Adjunto:</p>
                      <a 
                        href={activeBookingDetails.receiptUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block relative group overflow-hidden rounded-xl border border-slate-300"
                      >
                        <img 
                          src={activeBookingDetails.receiptUrl} 
                          alt="Recibo" 
                          className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-1 rounded-lg">Ver pantalla completa</span>
                        </div>
                      </a>
                    </div>
                  )}

                  {activeBookingDetails.balanceDue > 0 ? (
                    <div className="flex justify-between text-amber-700 font-bold pt-1 border-t border-slate-200">
                      <span>Saldo Pendiente en Cancha:</span>
                      <span>${activeBookingDetails.balanceDue.toLocaleString('es-AR')}</span>
                    </div>
                  ) : (
                    <div className="text-emerald-700 font-bold pt-1 border-t border-slate-200">
                      ✓ Saldo Totalmente Cancelado
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  {(activeBookingDetails.status === 'pending_payment' || activeBookingDetails.status === 'awaiting_approval') && (
                    <button
                      onClick={() => {
                        const paidAmount = activeBookingDetails.totalAmount * (activeBookingDetails.isDepositOnly ? 0.5 : 1);
                        const confirmed = confirmBookingPayment(
                          activeBookingDetails.id, 
                          `VERIFIED-ADMIN-${Date.now().toString().slice(-4)}`, 
                          paidAmount
                        );
                        if (confirmed) setActiveBookingDetails(confirmed);
                      }}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>✓ Aprobar Pago y Confirmar Turno</span>
                    </button>
                  )}

                  {activeBookingDetails.balanceDue > 0 && activeBookingDetails.status === 'confirmed' && (
                    <button
                      onClick={() => {
                        collectBalanceAtCourt(activeBookingDetails.id);
                        setActiveBookingDetails(prev => prev ? { ...prev, amountPaid: prev.totalAmount, balanceDue: 0, paymentStatus: 'total_pagado' } : null);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Cobrar Saldo de ${activeBookingDetails.balanceDue.toLocaleString('es-AR')} en Mostrador</span>
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => triggerWhatsAppSend(activeBookingDetails)}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>Reenviar WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        cancelBooking(activeBookingDetails.id);
                        setActiveBookingDetails(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs cursor-pointer"
                    >
                      Cancelar Turno
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
