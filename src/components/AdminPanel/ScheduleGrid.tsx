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
    triggerWhatsAppSend
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

  const handleSlotClick = (court: Court, slot: TimeSlot) => {
    if (slot.status === 'booked' || slot.status === 'blocked') {
      const b = bookings.find(item => item.id === slot.bookingId);
      if (b) {
        setActiveBookingDetails(b);
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
    <div className="space-y-6">
      
      {/* Date Switcher & Action Topbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            Fecha de la Agenda:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" /> Libre (Click para agendar)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-600" /> Reservado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500" /> Bloqueado / Mantenimiento
          </span>
        </div>
      </div>

      {/* Interactive Time Slot Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse text-xs text-left min-w-[750px]">
          <thead>
            <tr className="bg-slate-900 text-white border-b border-slate-800">
              <th className="py-3.5 px-4 font-bold sticky left-0 bg-slate-900 z-10 w-24">
                Horario
              </th>
              {courts.map((court) => (
                <th key={court.id} className="py-3.5 px-3 font-bold border-l border-slate-800 min-w-[130px]">
                  <div>{court.name.split('-')[0].trim()}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {court.sport.toUpperCase()} • {court.isIndoor ? 'Techada' : 'Aire Libre'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hours.map((hour) => (
              <tr key={hour} className="hover:bg-slate-50/70 transition-colors">
                
                {/* Hour Header Column */}
                <td className="py-3 px-4 font-mono font-bold text-slate-700 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200">
                  {hour} hs
                </td>

                {/* Courts Columns */}
                {courts.map((court) => {
                  const slots = getSlotsForCourtAndDate(court.id, selectedDate);
                  const slot = slots.find(s => s.startTime === hour);
                  if (!slot) return <td key={court.id} className="p-2 border-l border-slate-100">-</td>;

                  const booking = slot.bookingId ? bookings.find(b => b.id === slot.bookingId) : null;
                  const isBlocked = slot.status === 'blocked';
                  const isBooked = slot.status === 'booked';

                  return (
                    <td key={court.id} className="p-1.5 border-l border-slate-100">
                      {isBlocked ? (
                        <button
                          onClick={() => handleSlotClick(court, slot)}
                          className="w-full text-left p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-1 font-bold text-[11px]">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span>BLOQUEADO</span>
                          </div>
                          <div className="text-[10px] text-amber-700 truncate mt-0.5">
                            {slot.blockedReason || 'Mantenimiento'}
                          </div>
                        </button>
                      ) : isBooked && booking ? (
                        <button
                          onClick={() => handleSlotClick(court, slot)}
                          className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer shadow-xs ${
                            booking.paymentStatus === 'seña_pagada'
                              ? 'bg-blue-50 border border-blue-300 text-blue-900 hover:bg-blue-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-[11px]">
                            <span className="truncate">{booking.clientName}</span>
                            <span className="text-[9px] opacity-80">#{booking.bookingCode}</span>
                          </div>
                          <div className="text-[10px] flex items-center justify-between mt-1 opacity-90">
                            <span>{booking.durationMinutes}m</span>
                            <span>
                              {booking.paymentStatus === 'seña_pagada' ? 'Resta cobrar' : 'Total pago'}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSlotClick(court, slot)}
                          className="w-full py-2 px-1 text-center rounded-xl bg-emerald-50/60 hover:bg-emerald-500 hover:text-slate-950 border border-dashed border-emerald-300/80 text-emerald-800 transition-all font-semibold cursor-pointer group"
                        >
                          <span className="text-[11px] block font-mono font-bold">${slot.price.toLocaleString('es-AR')}</span>
                          <span className="text-[9px] opacity-75 group-hover:opacity-100">+ Reservar</span>
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
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Cancha:</span>
                    <span className="font-bold">${activeBookingDetails.totalAmount.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Abonado ({activeBookingDetails.paymentMethod}):</span>
                    <span className="font-extrabold">${activeBookingDetails.amountPaid.toLocaleString('es-AR')}</span>
                  </div>
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
                  {activeBookingDetails.balanceDue > 0 && (
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
