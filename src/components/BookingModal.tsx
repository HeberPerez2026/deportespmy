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
    confirmMercadoPagoBooking,
    verifyAndConfirmMercadoPagoPayment,
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
  const [cardNumber, setCardNumber] = useState('4509 2384 1920 3821');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('841');
  const [cardHolder, setCardHolder] = useState(userName || 'Gonzalo Morales');
  const [transferRef, setTransferRef] = useState('');

  // Processing, Error & Created Booking
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [mpOpened, setMpOpened] = useState(false);
  const [isVerifyingMp, setIsVerifyingMp] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<{ text: string; isSuccess: boolean } | null>(null);

  // Available slots for selected date
  const slots = getSlotsForCourtAndDate(court.id, selectedDate);
  const hourNum = parseInt(selectedSlotTime.split(':')[0], 10);
  const isNight = hourNum >= 18;
  const baseHourlyPrice = isNight ? court.hourlyRateNight : court.hourlyRateDay;
  const totalPrice = durationMinutes === 90 ? Math.round(baseHourlyPrice * 1.5) : baseHourlyPrice;
  const depositAmount = Math.round(totalPrice * (court.depositRequired / 100));
  const amountToPayNow = paymentOption === 'deposit' ? depositAmount : totalPrice;
  const balanceDue = totalPrice - amountToPayNow;

  // Open Mercado Pago web or app by creating a backend preference
  const openMercadoPagoPayment = async () => {
    setMpOpened(true);
    const aliasToCopy = businessProfile.alias || 'DEPORTES.PMY.MP';
    try {
      navigator.clipboard.writeText(aliasToCopy);
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2500);
    } catch {}

    try {
      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Reserva ${court.name} - ${selectedDate} (${selectedSlotTime})`,
          unit_price: amountToPayNow,
          quantity: 1,
          clientName: name,
          clientEmail: email
        })
      });
      const data = await res.json();
      if (data.init_point) {
        window.open(data.init_point, '_blank');
        return;
      }
    } catch {}

    const targetUrl = businessProfile.mpLink && businessProfile.mpLink.startsWith('http')
      ? businessProfile.mpLink
      : 'https://www.mercadopago.com.ar';

    window.open(targetUrl, '_blank');
  };

  // Handle Booking submission & smooth online payment processing (zero alerts)
  const handleConfirmAndPay = () => {
    setPaymentError(null);

    // Validation for Card
    if (paymentMethod === 'tarjeta') {
      const cleanCardNum = cardNumber.replace(/\s/g, '');
      const cleanCvv = cardCvv.replace(/\D/g, '');
      if (cleanCardNum.length < 12 || !cardExpiry.trim() || cleanCvv.length < 3) {
        setPaymentError('Por favor completá los datos de tu tarjeta (número de 12+ dígitos, vencimiento y CVV).');
        return;
      }
    }

    // Auto trigger MP checkout if not opened yet
    if (paymentMethod === 'mercadopago' && !mpOpened) {
      openMercadoPagoPayment();
    }

    setIsProcessing(true);

    setTimeout(() => {
      try {
        const refCode = paymentMethod === 'transferencia'
          ? (transferRef.trim() || `TRF-${Math.floor(100000 + Math.random() * 900000)}`)
          : paymentMethod === 'tarjeta'
          ? `TARJETA-${cardNumber.replace(/\s/g, '').slice(-4)}`
          : paymentMethod === 'mercadopago'
          ? `MP-PREF-${Math.floor(100000 + Math.random() * 900000)}`
          : undefined;

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
          paymentMethod,
          paymentReference: refCode,
        });

        setConfirmedBooking(newBooking);
        setStep(4);
      } catch (err) {
        setPaymentError('No se pudo procesar la reserva: ' + (err as Error).message);
      } finally {
        setIsProcessing(false);
      }
    }, 800);
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
              
              {paymentError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-xs font-bold text-rose-300">
                  ⚠️ {paymentError}
                </div>
              )}

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

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === 'mercadopago'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span className="text-xs">💙 Mercado Pago</span>
                    <span className="text-[10px] text-slate-400">QR o Saldo MP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tarjeta')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === 'tarjeta'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs">Tarjeta Débito/Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                      paymentMethod === 'transferencia'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span className="text-xs">🏦 Transferencia</span>
                    <span className="text-[10px] text-slate-400">Alias o CBU</span>
                  </button>
                </div>
              </div>

              {/* Method Specific Form Details */}
              {paymentMethod === 'mercadopago' && (
                <div className="p-4 bg-sky-950/30 border border-sky-800/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">Mercado Pago • Pago Online Inmediato</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">Acreditación Automática</span>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between items-center">
                      <span>Monto a Abonar Ahora:</span>
                      <strong className="text-white text-base font-black">${amountToPayNow.toLocaleString('es-AR')}</strong>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Alias Mercado Pago del Complejo:</span>
                        <strong className="font-mono text-emerald-400 text-sm font-black">
                          {businessProfile.alias || 'DEPORTES.PMY.MP'}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(businessProfile.alias || 'DEPORTES.PMY.MP');
                          setCopiedAlias(true);
                          setTimeout(() => setCopiedAlias(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                      >
                        {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                      </button>
                    </div>

                    {(businessProfile.accountHolder || businessProfile.ownerName) && (
                      <div className="flex justify-between text-slate-400 text-[11px] pt-1">
                        <span>Titular:</span>
                        <span className="text-slate-300">{businessProfile.accountHolder || businessProfile.ownerName}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-300">
                    Al presionar <strong>"Pagar y Confirmar Reserva"</strong>, se abrirá automáticamente la aplicación o web de Mercado Pago y se copiará el Alias para que abones los <strong className="text-white">${amountToPayNow.toLocaleString('es-AR')}</strong>.
                  </p>

                  <button
                    type="button"
                    onClick={openMercadoPagoPayment}
                    className="w-full py-2 px-3 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Abrir Mercado Pago en una pestaña nueva</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {paymentMethod === 'tarjeta' && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Número de Tarjeta</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Vencimiento</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nombre en la Tarjeta</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'transferencia' && (
                <div className="p-4 bg-amber-950/25 border border-amber-800/50 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-amber-300 font-bold">
                    <span>Datos Bancarios del Complejo</span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full">Transferencia Inmediata</span>
                  </div>
                  
                  <div className="space-y-2 text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Alias:</span>
                        <strong className="font-mono text-emerald-400 text-sm font-black">
                          {businessProfile.alias || 'DEPORTES.PMY.MP'}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(businessProfile.alias || 'DEPORTES.PMY.MP');
                          setCopiedAlias(true);
                          setTimeout(() => setCopiedAlias(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                      >
                        {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedAlias ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {businessProfile.cbu && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">CBU / CVU:</span>
                          <span className="font-mono text-slate-200 text-xs font-bold">{businessProfile.cbu}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(businessProfile.cbu);
                            setCopiedCbu(true);
                            setTimeout(() => setCopiedCbu(false), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                        >
                          {copiedCbu ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{copiedCbu ? '¡Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-1 border-t border-slate-800 text-[11px] flex justify-between">
                      <span className="text-slate-400">Titular:</span>
                      <strong className="text-white">{businessProfile.accountHolder || businessProfile.ownerName || 'Administración de Canchas'}</strong>
                    </div>

                    <div className="pt-1 border-t border-slate-800 flex justify-between text-xs">
                      <span><strong>Monto a Transferir:</strong></span>
                      <span className="text-white font-bold">${amountToPayNow.toLocaleString('es-AR')}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Nº de Operación / Comprobante (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej: TRF-98231 o últimos 4 dígitos"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm font-mono"
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
                  disabled={isProcessing}
                  onClick={handleConfirmAndPay}
                  className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xl shadow-emerald-500/25"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Procesando Pago Seguro...</span>
                    </>
                  ) : (
                    <>
                      <span>Pagar y Confirmar Reserva</span>
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
              
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg ${
                confirmedBooking.status === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-500/20'
              }`}>
                {confirmedBooking.status === 'confirmed' ? <CheckCircle className="w-10 h-10" /> : <Clock className="w-10 h-10 animate-pulse" />}
              </div>

              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${confirmedBooking.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {confirmedBooking.status === 'confirmed' ? '¡Reserva Exitosa y Pago Acreditado!' : '⏳ Reserva Pendiente de Pago en Mercado Pago'}
                </span>
                <h3 className="text-2xl font-black text-white font-heading mt-1">
                  Turno #{confirmedBooking.bookingCode} ({confirmedBooking.status === 'confirmed' ? 'Confirmado' : 'Pendiente de Webhook'})
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Tu turno en {confirmedBooking.courtName} para el {confirmedBooking.date} de {confirmedBooking.startTime} a {confirmedBooking.endTime} hs.
                </p>
              </div>

              {/* If pending MP webhook confirmation */}
              {confirmedBooking.status === 'pending' && (
                <div className="max-w-md mx-auto p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">⏳ Pago Pendiente de Verificación MP</span>
                    <span className="text-[11px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                      Pendiente en API
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Tu turno se guardó como <strong>PENDIENTE</strong>. El sistema consultará la API / Webhook de Mercado Pago para verificar que la transacción figure APROBADA antes de otorgar el turno definitivo.
                  </p>
                  
                  {verifyMessage && (
                    <div className={`p-3 rounded-xl text-xs font-bold border ${verifyMessage.isSuccess ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-rose-500/20 text-rose-300 border-rose-500/50'}`}>
                      {verifyMessage.text}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isVerifyingMp}
                    onClick={async () => {
                      setIsVerifyingMp(true);
                      setVerifyMessage(null);
                      const res = await verifyAndConfirmMercadoPagoPayment(confirmedBooking.id);
                      setIsVerifyingMp(false);
                      setVerifyMessage({ text: res.message, isSuccess: res.success });
                      if (res.success && res.booking) {
                        setConfirmedBooking(res.booking);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    {isVerifyingMp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Verificando con API MercadoPago...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>✓ Verificar Estado del Pago con MercadoPago</span>
                      </>
                    )}
                  </button>
                </div>
              )}

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

              {/* Direct Mercado Pago Action Card if user selected Mercado Pago */}
              {confirmedBooking.paymentMethod === 'mercadopago' && (
                <div className="max-w-md mx-auto p-4 bg-sky-950/40 border border-sky-500/40 rounded-2xl text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">💙 Pago por Mercado Pago</span>
                    <span className="text-[11px] bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full font-bold">
                      ${confirmedBooking.amountPaid.toLocaleString('es-AR')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Si aún no abonaste o querés verificar tu pago, podés abrir Mercado Pago directamente o transferir al Alias:
                  </p>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Alias para transferir:</span>
                      <strong className="font-mono text-emerald-400 text-sm font-black">{businessProfile.alias || 'DEPORTES.PMY.MP'}</strong>
                      {(businessProfile.accountHolder || businessProfile.ownerName) && (
                        <span className="text-[11px] text-slate-400 block">Titular: {businessProfile.accountHolder || businessProfile.ownerName}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(businessProfile.alias || 'DEPORTES.PMY.MP');
                        setCopiedAlias(true);
                        setTimeout(() => setCopiedAlias(false), 2000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                    >
                      {copiedAlias ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedAlias ? '¡Copiado!' : 'Copiar Alias'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={openMercadoPagoPayment}
                    className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
                  >
                    <span>Abrir Mercado Pago</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              )}

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
