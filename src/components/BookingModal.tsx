import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Court, PaymentMethod, Booking } from '../types';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle, 
  MessageCircle, 
  QrCode, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Info,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';

interface BookingModalProps {
  court: Court;
  initialSlotTime?: string;
  onClose: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ court, initialSlotTime, onClose }) => {
  const { 
    selectedDate, 
    setSelectedDate,
    getSlotsForCourtAndDate, 
    createBooking,
    generateWhatsAppMessage,
    getWhatsAppShareUrl,
    triggerWhatsAppSend,
    userPhone,
    userName,
    userEmail,
    businessProfile,
    setActiveTab
  } = useApp();

  // Multi-step state: 1 (Turno) -> 2 (Datos) -> 3 (Pago Online) -> 4 (Confirmado)
  const [step, setStep] = useState<number>(initialSlotTime ? 2 : 1);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>(initialSlotTime || '19:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(court.sport === 'padel' || court.sport === 'tenis' ? 90 : 60);
  
  // Client input states
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(userPhone || '+5492804567890');
  const [email, setEmail] = useState(userEmail || 'jugador@gmail.com');
  const [notes, setNotes] = useState('');

  // Payment states
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');

  // Processing & Created Booking
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);

  // Available slots for selected date
  const slots = getSlotsForCourtAndDate(court.id, selectedDate);
  const hourNum = parseInt(selectedSlotTime.split(':')[0], 10);
  const isNight = hourNum >= 18;
  const baseHourlyPrice = isNight ? court.hourlyRateNight : court.hourlyRateDay;
  const totalPrice = durationMinutes === 90 ? Math.round(baseHourlyPrice * 1.5) : baseHourlyPrice;
  const depositAmount = Math.round(totalPrice * (court.depositRequired / 100));
  const amountToPayNow = paymentOption === 'deposit' ? depositAmount : totalPrice;
  const balanceDue = totalPrice - amountToPayNow;

  // Handle Booking submission & Mercado Pago Checkout Pro redirect
  const handleConfirmAndPay = async () => {
    setIsProcessing(true);

    try {
      if (paymentMethod === 'mercadopago') {
        // 1. Create a held booking with status 'pending_payment'
        const pendingBooking = createBooking({
          courtId: court.id,
          date: selectedDate,
          startTime: selectedSlotTime,
          durationMinutes,
          clientName: name,
          clientPhone: phone,
          clientEmail: email,
          notes,
          totalAmount: totalPrice,
          isDepositOnly: paymentOption === 'deposit',
          paymentMethod: 'mercadopago',
          status: 'pending_payment'
        });

        // 2. Request preference from backend
        const res = await fetch('/api/mercadopago/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: pendingBooking.id,
            bookingCode: pendingBooking.bookingCode,
            courtName: court.name,
            date: selectedDate,
            startTime: selectedSlotTime,
            title: `Reserva ${court.name} - ${selectedDate} (${selectedSlotTime} hs)`,
            unit_price: amountToPayNow,
            quantity: 1,
            clientName: name,
            clientEmail: email,
            clientPhone: phone
          })
        });

        if (!res.ok) {
          throw new Error('No se pudo conectar con el servidor de pagos de Mercado Pago.');
        }

        const data = await res.json();
        
        if (data.init_point) {
          // Direct redirect to Mercado Pago Checkout Pro
          window.location.href = data.init_point;
          return;
        } else {
          throw new Error('No se recibió la URL de pago de Mercado Pago.');
        }
      } else {
        // Efectivo mostrador
        const newBooking = createBooking({
          courtId: court.id,
          date: selectedDate,
          startTime: selectedSlotTime,
          durationMinutes,
          clientName: name,
          clientPhone: phone,
          clientEmail: email,
          notes,
          totalAmount: totalPrice,
          isDepositOnly: paymentOption === 'deposit',
          paymentMethod: 'efectivo_mostrador',
          status: 'confirmed'
        });

        setConfirmedBooking(newBooking);
        setStep(4);
      }
    } catch (err: any) {
      alert('Error al iniciar el pago: ' + (err?.message || 'Ocurrió un error inesperado'));
    } finally {
      setIsProcessing(false);
    }
  };

  const copyWhatsAppText = () => {
    if (!confirmedBooking) return;
    const msg = generateWhatsAppMessage(confirmedBooking);
    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 overflow-hidden my-8">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Reserva Online • DeportesPMY
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-mono">deportespmy.com.ar</span>
            </div>
            <h2 className="text-lg font-bold text-white font-heading">
              {court.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step progress bar */}
        {step < 4 && (
          <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>1</span>
              <span>Horario</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-800" />
            <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>2</span>
              <span>Tus Datos</span>
            </div>
            <div className="w-8 h-0.5 bg-slate-800" />
            <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'}`}>3</span>
              <span>Pago Seguro</span>
            </div>
          </div>
        )}

        <div className="p-6">
          
          {/* STEP 1: Select Slot & Duration */}
          {step === 1 && (
            <div className="space-y-6">
              
              {/* Date & Duration Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Fecha
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Duración del Turno
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDurationMinutes(60)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        durationMinutes === 60 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      60 Minutos (1h)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDurationMinutes(90)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        durationMinutes === 90 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      90 Minutos (1.5h)
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Horarios Disponibles para {selectedDate}</span>
                  <span className="text-[11px] font-normal text-emerald-400">Verde = Libre</span>
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isAvailable = slot.status === 'available';
                    const isSelected = selectedSlotTime === slot.startTime;
                    const slotHour = parseInt(slot.startTime.split(':')[0], 10);
                    const isNightSlot = slotHour >= 18;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSlotTime(slot.startTime)}
                        className={`p-2.5 rounded-xl text-center border text-xs font-semibold transition-all relative ${
                          !isAvailable
                            ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
                            : 'bg-slate-800/90 text-slate-200 border-slate-700/80 hover:border-emerald-500/60 hover:bg-slate-750'
                        }`}
                      >
                        <div className="text-sm font-bold">{slot.startTime}</div>
                        <div className="text-[10px] opacity-80">
                          {isAvailable ? `$${(durationMinutes === 90 ? Math.round(slot.price * 1.5) : slot.price).toLocaleString('es-AR')}` : 'Ocupado'}
                        </div>
                        {isNightSlot && isAvailable && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" title="Tarifa nocturna con luz" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Court Amenities Summary */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {court.surface} • {court.isIndoor ? 'Techada' : 'Al aire libre'}
                </span>
                <span className="font-bold text-emerald-300">
                  Total: ${totalPrice.toLocaleString('es-AR')}
                </span>
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>Continuar con Datos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: Client Info & WhatsApp Phone */}
          {step === 2 && (
            <div className="space-y-4">
              
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-bold">Notificación Automática por WhatsApp</p>
                  <p className="text-slate-300 mt-0.5">
                    Al confirmar, el sistema generará y enviará inmediatamente el comprobante con código QR y detalles del partido a tu número de WhatsApp.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Nombre Completo del Titular
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Gonzalo Morales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Celular WhatsApp (Con código de área)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+5492804567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Ejemplo Puerto Madryn: +54 9 280 456-7890
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  Email (Para comprobante electrónico)
                </label>
                <input
                  type="email"
                  required
                  placeholder="tuemail@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Notas o Solicitudes Adicionales (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Necesitamos 10 chalecos, paletas de pádel o reserva de parrilla post-partido..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>

              {/* Step 2 Actions */}
              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>

                <button
                  type="button"
                  disabled={!name.trim() || !phone.trim()}
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <span>Ir a Pago Online</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: Online Payment Checkout */}
          {step === 3 && (
            <div className="space-y-5">
              
              {/* Payment Split Option (50% Seña vs 100% Total) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Modalidad de Pago Online
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('deposit')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      paymentOption === 'deposit'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-400">Seña 50%</span>
                      <span className="text-sm font-extrabold text-white">${depositAmount.toLocaleString('es-AR')}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Abonás la mitad ahora y el saldo restante de ${depositAmount.toLocaleString('es-AR')} en la cancha antes de jugar.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('full')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      paymentOption === 'full'
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-400">Pago Total 100%</span>
                      <span className="text-sm font-extrabold text-white">${totalPrice.toLocaleString('es-AR')}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Dejás la cancha 100% cancelada. Llegás al complejo y pasás directo a jugar.
                    </p>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Seleccionar Medio de Pago
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      paymentMethod === 'mercadopago'
                        ? 'bg-sky-500/15 border-sky-400 text-sky-200 ring-1 ring-sky-400'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-sky-300 flex items-center gap-1.5">
                        <span>💙</span> Mercado Pago
                      </span>
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">Online</span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Tarjetas, Saldo MP, DEBIN o Efectivo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo_mostrador')}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      paymentMethod === 'efectivo_mostrador'
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-emerald-300 flex items-center gap-1.5">
                        <span>💵</span> Efectivo en Cancha
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">En Club</span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Abonar en el mostrador antes de jugar
                    </span>
                  </button>
                </div>
              </div>

              {/* Method Specific Form Details */}
              {paymentMethod === 'mercadopago' && (
                <div className="p-4 bg-sky-950/30 border border-sky-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">Mercado Pago Checkout Pro</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">Acreditación Inmediata</span>
                  </div>

                  {/* Badges of accepted methods in Checkout Pro */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Tarjetas Débito y Crédito</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                      <span className="text-sm">💙</span>
                      <span>Dinero en cuenta MP</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                      <span className="text-sm">⚡</span>
                      <span>Débito Inmediato (DEBIN)</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                      <span className="text-sm">🧾</span>
                      <span>Pago Fácil / RapiPago</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Monto a pagar ahora en Mercado Pago:</span>
                      <strong className="text-white text-base font-black">${amountToPayNow.toLocaleString('es-AR')}</strong>
                    </div>
                    {businessProfile.complexName && (
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                        <span>Establecimiento receptor:</span>
                        <strong className="text-slate-200">{businessProfile.complexName}</strong>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400">
                    Al presionar <strong>"Continuar al Pago con Mercado Pago"</strong>, serás redirigido a la pasarela oficial protegida de Mercado Pago. Al finalizar el pago, tu reserva se confirmará automáticamente.
                  </p>
                </div>
              )}

              {paymentMethod === 'efectivo_mostrador' && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span>Pago en Cancha / Mostrador</span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full">Sin cargo online</span>
                  </div>
                  <p className="text-slate-300">
                    Tu turno quedará agendado en el sistema con saldo pendiente de <strong className="text-white">${totalPrice.toLocaleString('es-AR')}</strong>. Recordá presentarte 10 minutos antes en la administración del complejo para abonar antes de ingresar a la cancha.
                  </p>
                </div>
              )}

              {/* Order summary breakdown */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Turno: {selectedDate} ({selectedSlotTime} hs)</span>
                  <span className="text-slate-400">{durationMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor Cancha:</span>
                  <span>${totalPrice.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
                  <span>A Pagar Ahora ({paymentOption === 'deposit' ? 'Seña 50%' : 'Total 100%'}):</span>
                  <span className="text-base">${amountToPayNow.toLocaleString('es-AR')}</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between text-[11px] text-amber-300">
                    <span>Saldo a pagar en cancha:</span>
                    <span>${balanceDue.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>

              {/* Step 3 Actions */}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmAndPay}
                  className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xl shadow-emerald-500/25"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{paymentMethod === 'mercadopago' ? 'Conectando con Mercado Pago...' : 'Confirmando Reserva...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{paymentMethod === 'mercadopago' ? 'Continuar al Pago con Mercado Pago' : 'Confirmar Turno en Mostrador'}</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: Success & Automated WhatsApp Confirmation */}
          {step === 4 && confirmedBooking && (
            <div className="space-y-6 text-center py-2">
              
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  ¡Reserva Exitosa y Pago Acreditado!
                </span>
                <h3 className="text-2xl font-black text-white font-heading mt-1">
                  Turno Confirmado #{confirmedBooking.bookingCode}
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Tu turno en {confirmedBooking.courtName} quedó reservado para el {confirmedBooking.date} de {confirmedBooking.startTime} a {confirmedBooking.endTime} hs.
                </p>
              </div>

              {/* Clean Reservation Details Summary Card */}
              <div className="max-w-md mx-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Detalles del Turno Reservado</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    #{confirmedBooking.bookingCode}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cancha:</span>
                    <strong className="text-white">{confirmedBooking.courtName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha y Horario:</span>
                    <strong className="text-white">{confirmedBooking.date} • {confirmedBooking.startTime} a {confirmedBooking.endTime} hs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Titular del Turno:</span>
                    <strong className="text-white">{confirmedBooking.clientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Cancha:</span>
                    <strong className="text-white">${confirmedBooking.totalAmount.toLocaleString('es-AR')}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Monto Abonado ({confirmedBooking.paymentMethod.toUpperCase()}):</span>
                    <strong className="text-emerald-400">${confirmedBooking.amountPaid.toLocaleString('es-AR')}</strong>
                  </div>
                  {confirmedBooking.balanceDue > 0 && (
                    <div className="flex justify-between text-amber-300">
                      <span>Saldo restante a pagar en la cancha:</span>
                      <strong>${confirmedBooking.balanceDue.toLocaleString('es-AR')}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Receipt Badge */}
              <div className="max-w-md mx-auto p-4 bg-sky-950/30 border border-sky-500/30 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>💙</span> {confirmedBooking.paymentMethod === 'mercadopago' ? 'Pago Online Mercado Pago' : 'Pago en Cancha'}
                  </span>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                    {confirmedBooking.paymentStatus === 'total_pagado' ? 'Total 100% Pagado' : confirmedBooking.paymentStatus === 'seña_pagada' ? 'Seña 50% Acreditada' : 'Pendiente Mostrador'}
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  Comprobante de operación: <strong className="font-mono text-white">{confirmedBooking.paymentReference || `#${confirmedBooking.bookingCode}`}</strong>
                </div>
              </div>

              {/* Automatic WhatsApp Action Box */}
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
                  <MessageCircle className="w-5 h-5 text-emerald-400" />
                  <span>Notificación por WhatsApp Generada</span>
                </div>
                <p className="text-xs text-slate-300">
                  Enviá el comprobante oficial a tu WhatsApp o compartilo con tu grupo de amigos del partido:
                </p>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => triggerWhatsAppSend(confirmedBooking)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-slate-950" />
                    <span>Abrir en WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyWhatsAppText}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedMessage ? '¡Mensaje Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
              </div>

              {/* Final dismiss buttons */}
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveTab('turnos');
                  }}
                  className="px-8 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  Listo, Volver a los Turnos
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
