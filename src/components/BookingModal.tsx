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
    getBusinessProfileForCourt,
    setActiveTab
  } = useApp();

  const effectiveProfile = getBusinessProfileForCourt(court);

  // Multi-step state: 1 (Turno) -> 2 (Datos) -> 3 (Pago Online) -> 4 (Confirmado)
  const [step, setStep] = useState<number>(initialSlotTime ? 2 : 1);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>(initialSlotTime || '19:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(court.sport === 'padel' || court.sport === 'tenis' ? 90 : 60);
  
  // Client input states (clean from 0, no mock hardcoded values)
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(userPhone || '');
  const [email, setEmail] = useState(userEmail || '');
  const [notes, setNotes] = useState('');

  // Payment states: ONLY Mercado Pago or CBU
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full'>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');
  const [transferRef, setTransferRef] = useState('');

  // Processing & Created Booking
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);

  const [isWaitingForConfirmation, setIsWaitingForConfirmation] = useState(false);

  // Available slots for selected date
  const slots = getSlotsForCourtAndDate(court.id, selectedDate);
  const hourNum = parseInt(selectedSlotTime.split(':')[0], 10);
  const isNight = hourNum >= 18;
  const baseHourlyPrice = isNight ? court.hourlyRateNight : court.hourlyRateDay;
  const totalPrice = durationMinutes === 90 ? Math.round(baseHourlyPrice * 1.5) : baseHourlyPrice;
  const depositAmount = Math.round(totalPrice * (court.depositRequired / 100));
  const amountToPayNow = paymentOption === 'deposit' ? depositAmount : totalPrice;
  const balanceDue = totalPrice - amountToPayNow;

  const targetAlias = (effectiveProfile.alias || '').trim();
  const hasDirectLink = !!(effectiveProfile.mpLink && effectiveProfile.mpLink.trim().startsWith('http'));

  // Handle Checkout Pro preference creation & CBU transfer reservation
  const handleConfirmAndPay = async () => {
    setIsProcessing(true);

    if (paymentMethod === 'mercadopago') {
      // Validate that the court's establishment has configured payment data
      if (!targetAlias && !hasDirectLink && !effectiveProfile.mpAccessToken) {
        alert('Este complejo deportivo aún no ha configurado sus datos de cobro por Mercado Pago (Alias o Link). Por favor comunicate con el complejo o seleccioná Transferencia Bancaria (CBU).');
        setIsProcessing(false);
        return;
      }

      try {
        // 1. Create booking in pending_payment status first
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
          paymentMethod: 'mercadopago',
          paymentReference: `MP-PENDING-${Date.now()}`,
          status: 'pending_payment'
        });

        // 2. If token is present, try official Checkout Pro
        if (effectiveProfile.mpAccessToken) {
          const res = await fetch('/api/mercadopago/preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: newBooking.id,
              bookingCode: newBooking.bookingCode,
              courtName: court.name,
              date: selectedDate,
              startTime: selectedSlotTime,
              unit_price: amountToPayNow,
              quantity: 1,
              clientName: name,
              clientEmail: email,
              clientPhone: phone,
              accessToken: effectiveProfile.mpAccessToken
            })
          });

          const data = await res.json();
          if (data.init_point) {
            window.location.href = data.init_point;
            return;
          }
        }

        // 3. Direct Link Flow (if complex configured their own Mercado Pago link, e.g. https://link.mercadopago.com.ar/...)
        if (hasDirectLink) {
          const cleanLink = effectiveProfile.mpLink!.trim();
          try {
            window.open(cleanLink, '_blank');
          } catch {
            window.location.href = cleanLink;
          }

          setConfirmedBooking(newBooking);
          setIsWaitingForConfirmation(true);
          setStep(4);
          return;
        }

        // 4. Zero-Config Alias Flow: copy alias to clipboard and safely open Mercado Pago
        if (targetAlias) {
          try {
            await navigator.clipboard.writeText(targetAlias);
            setCopiedAlias(true);
            setTimeout(() => setCopiedAlias(false), 3000);
          } catch {}

          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          const mpUrl = isMobile ? 'mercadopago://' : 'https://www.mercadopago.com.ar';

          try {
            window.open(mpUrl, '_blank');
          } catch {
            window.location.href = mpUrl;
          }

          // Show "Waiting for confirmation" screen
          setConfirmedBooking(newBooking);
          setIsWaitingForConfirmation(true);
          setStep(4);
        }

      } catch (err: any) {
        console.error('Error al procesar Mercado Pago:', err);
        alert('Error al registrar la reserva. Por favor intenta nuevamente.');
      } finally {
        setIsProcessing(false);
      }

    } else {
      // CBU / Transferencia Bancaria
      setTimeout(() => {
        try {
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
            paymentMethod: 'transferencia',
            paymentReference: transferRef.trim() ? `CBU-${transferRef.trim()}` : `CBU-${Date.now().toString().slice(-6)}`,
            status: 'pending_payment' // ALWAYS pending for CBU
          });

          setConfirmedBooking(newBooking);
          setStep(4);
        } catch (err: any) {
          alert('Error al registrar reserva: ' + (err?.message || 'Error'));
        } finally {
          setIsProcessing(false);
        }
      }, 700);
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

              {/* Payment Method Selector: ONLY Mercado Pago or CBU */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Seleccionar Medio de Pago
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      paymentMethod === 'mercadopago'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-sky-300 flex items-center gap-1.5">
                        <span>💙</span> Mercado Pago
                      </span>
                      <span className="text-[10px] bg-sky-500/25 text-sky-300 px-2 py-0.5 rounded-full font-bold">App / Alias</span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Transferí directo a nuestro Alias por la app
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      paymentMethod === 'transferencia'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                        <span>🏦</span> CBU / Banco
                      </span>
                      <span className="text-[10px] bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full font-bold">Transferencia</span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      Transferencia a CBU / CVU bancario
                    </span>
                  </button>
                </div>
              </div>

              {/* Method Specific Form Details */}
              {paymentMethod === 'mercadopago' && (
                <div className="p-4 bg-sky-950/30 border border-sky-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <span>💙</span> Cobro Online con Mercado Pago
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                      Acreditación Directa
                    </span>
                  </div>

                  {targetAlias ? (
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Alias de Mercado Pago del Complejo:</span>
                          <strong className="font-mono text-emerald-400 text-sm font-black tracking-wide">
                            {targetAlias}
                          </strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(targetAlias);
                            setCopiedAlias(true);
                            setTimeout(() => setCopiedAlias(false), 2500);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                        >
                          {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                        </button>
                      </div>

                      {(effectiveProfile.accountHolder || effectiveProfile.ownerName) && (
                        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                          <span>Titular:</span>
                          <strong className="text-slate-200">{effectiveProfile.accountHolder || effectiveProfile.ownerName}</strong>
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-slate-200">Importe a transferir:</span>
                        <strong className="text-white text-base font-black">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : hasDirectLink ? (
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                      <span className="text-slate-300 block">
                        Este complejo cuenta con <strong>Link Oficial de Pago</strong> para abonar de forma directa.
                      </span>
                      <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-slate-200">Monto:</span>
                        <strong className="text-white text-base font-black">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-950/40 border border-amber-600/30 rounded-xl text-xs text-amber-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <Info className="w-4 h-4 text-amber-400" />
                        <span>Configuración de Mercado Pago pendiente</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        El administrador de este complejo aún no ha ingresado su Alias o Link de cobro en el sistema. Podés elegir <strong>Transferencia Bancaria</strong> o coordinar directamente con el club.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slate-300">
                    Al presionar el botón de abajo, {targetAlias ? 'se copiará el Alias y se abrirá Mercado Pago para que transfieras el importe exacto.' : 'se registrará tu reserva y podrás coordinar el pago.'}
                  </p>
                </div>
              )}

              {paymentMethod === 'transferencia' && (
                <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>🏦</span> Datos de la Cuenta Bancaria (CBU / CVU)
                    </span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                      Transferencia Inmediata
                    </span>
                  </div>

                  {effectiveProfile.cbu || targetAlias ? (
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                      {effectiveProfile.cbu && (
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-slate-400 block">CBU / CVU (22 dígitos):</span>
                            <strong className="font-mono text-slate-100 text-xs font-bold tracking-wider">
                              {effectiveProfile.cbu}
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(effectiveProfile.cbu);
                              setCopiedCbu(true);
                              setTimeout(() => setCopiedCbu(false), 2500);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                          >
                            {copiedCbu ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{copiedCbu ? '¡Copiado!' : 'Copiar CBU'}</span>
                          </button>
                        </div>
                      )}

                      {targetAlias && (
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Alias Bancario:</span>
                            <strong className="font-mono text-emerald-400 text-xs font-bold">
                              {targetAlias}
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(targetAlias);
                              setCopiedAlias(true);
                              setTimeout(() => setCopiedAlias(false), 2500);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                          >
                            {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                          </button>
                        </div>
                      )}

                      {(effectiveProfile.accountHolder || effectiveProfile.ownerName) && (
                        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between">
                          <span>Titular:</span>
                          <strong className="text-slate-200">{effectiveProfile.accountHolder || effectiveProfile.ownerName}</strong>
                        </div>
                      )}

                      <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-slate-200">Monto a transferir:</span>
                        <strong className="text-white text-base font-black">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl text-xs text-amber-200 space-y-1">
                      <p className="text-[11px] text-slate-300">
                        El complejo aún no ha ingresado CBU ni Alias en su panel. Podés confirmar la reserva y coordinar el pago por mostrador o WhatsApp.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 mb-1">Nº de Operación o Comprobante (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: TRF-98231 o últimos 4 dígitos"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>
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
                  disabled={isProcessing || (paymentMethod === 'mercadopago' && !targetAlias && !hasDirectLink && !effectiveProfile.mpAccessToken)}
                  onClick={handleConfirmAndPay}
                  className={`px-6 py-3 rounded-xl disabled:opacity-50 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xl ${
                    paymentMethod === 'mercadopago'
                      ? 'bg-sky-400 hover:bg-sky-300 shadow-sky-400/25'
                      : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{paymentMethod === 'mercadopago' ? 'Abriendo Mercado Pago...' : 'Confirmando Reserva...'}</span>
                    </>
                  ) : paymentMethod === 'mercadopago' ? (
                    <>
                      <span>{targetAlias || hasDirectLink ? `Abrir Mercado Pago y Transferir $${amountToPayNow.toLocaleString('es-AR')}` : 'Mercado Pago No Configurado'}</span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Confirmar Reserva y Enviar Comprobante</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: Success / Waiting / Pending Verification */}
          {step === 4 && confirmedBooking && (
            <div className="space-y-6 text-center py-2">
              
              <div className="flex flex-col items-center justify-center">
                {isWaitingForConfirmation ? (
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-sky-500/20 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-20 h-20 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-sky-400" />
                    </div>
                  </div>
                ) : confirmedBooking.status === 'confirmed' ? (
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                    <Clock className="w-10 h-10 animate-pulse" />
                  </div>
                )}
              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  isWaitingForConfirmation ? 'text-sky-400' : 
                  confirmedBooking.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {isWaitingForConfirmation ? '⏳ Esperando Confirmación de Pago...' : 
                   confirmedBooking.status === 'confirmed' ? '¡Reserva Exitosa y Pago Acreditado!' : '📋 Reserva Pendiente de Verificación'}
                </span>
                
                <h3 className="text-2xl font-black text-white font-heading mt-1">
                  {isWaitingForConfirmation ? 'Procesando en Mercado Pago' : 
                   confirmedBooking.status === 'confirmed' ? `Turno Confirmado #${confirmedBooking.bookingCode}` : `Turno Reservado #${confirmedBooking.bookingCode}`}
                </h3>
                
                <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
                  {isWaitingForConfirmation ? (
                    'Estamos esperando a que realices la transferencia en la app de Mercado Pago. Una vez confirmada por el club, recibirás el aviso oficial.'
                  ) : confirmedBooking.status === 'confirmed' ? (
                    `Tu turno en ${confirmedBooking.courtName} quedó reservado para el ${confirmedBooking.date} de ${confirmedBooking.startTime} a ${confirmedBooking.endTime} hs.`
                  ) : (
                    'Tu reserva ha sido registrada con éxito. El club verificará el depósito y confirmará el turno a la brevedad. Recibirás un mensaje automático por WhatsApp.'
                  )}
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
                    {confirmedBooking.paymentMethod === 'mercadopago' ? '💙 Transferencia Mercado Pago' : '🏦 Transferencia CBU / Banco'}
                  </span>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                    {confirmedBooking.paymentStatus === 'total_pagado' ? 'Total 100% Pagado' : 'Seña 50% Abonada'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>{confirmedBooking.paymentMethod === 'mercadopago' ? 'Alias de destino:' : 'CBU / Alias:'}</span>
                  <strong className="font-mono text-emerald-400 font-bold">
                    {confirmedBooking.paymentMethod === 'mercadopago' 
                      ? (targetAlias || effectiveProfile.mpLink || 'Mercado Pago del Complejo')
                      : (effectiveProfile.cbu || targetAlias || 'Cuenta Bancaria del Complejo')}
                  </strong>
                </div>
              </div>

              {/* Automatic WhatsApp Action Box */}
              <div className={`p-4 rounded-2xl max-w-md mx-auto space-y-3 ${
                confirmedBooking.status === 'confirmed' ? 'bg-emerald-950/40 border border-emerald-500/40' : 'bg-amber-950/40 border border-amber-500/40'
              }`}>
                <div className={`flex items-center justify-center gap-2 font-bold text-sm ${
                  confirmedBooking.status === 'confirmed' ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  <MessageCircle className="w-5 h-5" />
                  <span>{confirmedBooking.status === 'confirmed' ? 'Notificación por WhatsApp Generada' : 'Avisar al Club por WhatsApp'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {confirmedBooking.status === 'confirmed' 
                    ? 'Enviá el comprobante oficial a tu WhatsApp o compartilo con tu grupo de amigos del partido:'
                    : 'Para que el club verifique tu transferencia CBU/Alias más rápido, podés enviar el comprobante de pago por WhatsApp ahora mismo:'}
                </p>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmedBooking.status === 'confirmed') {
                        triggerWhatsAppSend(confirmedBooking);
                      } else {
                        const cleanPhone = (effectiveProfile.whatsappNumber || '').replace(/\D/g, '');
                        if (cleanPhone) {
                          const text = `¡Hola! Acabo de reservar el turno #${confirmedBooking.bookingCode} para el ${confirmedBooking.date} a las ${confirmedBooking.startTime} hs. Aquí adjunto el comprobante de mi transferencia por ${confirmedBooking.paymentMethod.toUpperCase()}.`;
                          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
                        } else {
                          alert('El complejo deportivo aún no ha configurado un teléfono de WhatsApp en su perfil.');
                        }
                      }
                    }}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                      confirmedBooking.status === 'confirmed' 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30' 
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 fill-slate-950" />
                    <span>{confirmedBooking.status === 'confirmed' ? 'Abrir en WhatsApp' : 'Enviar Comprobante'}</span>
                  </button>

                  {confirmedBooking.status === 'confirmed' && (
                    <button
                      type="button"
                      onClick={copyWhatsAppText}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedMessage ? '¡Mensaje Copiado!' : 'Copiar Texto'}</span>
                    </button>
                  )}
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
