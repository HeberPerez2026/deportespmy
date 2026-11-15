import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiUrl, getApiBaseUrl, safeParseJsonResponse } from '../utils/api';
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
  ExternalLink,
  Upload,
  Image as ImageIcon,
  FileCheck,
  PauseCircle,
  AlertTriangle
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
    bookings,
    generateWhatsAppMessage,
    triggerWhatsAppSend,
    confirmBookingPayment,
    submitPaymentReceipt,
    userPhone,
    userName,
    userEmail,
    getAdminIdForCourt,
    getBusinessProfileForCourt,
    setActiveTab
  } = useApp();

  const effectiveProfile = getBusinessProfileForCourt(court);
  const courtAdminId = getAdminIdForCourt(court);
  const hasAutomaticMP = Boolean(effectiveProfile.mpOAuthConnected || effectiveProfile.mpAccessToken);

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
  const [mpCheckoutUrl, setMpCheckoutUrl] = useState<string | null>(null);
  const [mpFlowError, setMpFlowError] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

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
  const targetCbu = (effectiveProfile.cbu || '').trim();
  const hasDirectLink = !!(effectiveProfile.mpLink && effectiveProfile.mpLink.trim().startsWith('http'));
  const isMpPaused = Boolean(effectiveProfile.mpPaused);
  const isTransferPaused = Boolean(effectiveProfile.transferPaused);
  const hasMpConfigured = Boolean(hasAutomaticMP || targetAlias || hasDirectLink);
  const hasTransferConfigured = Boolean(targetCbu || targetAlias);
  const isMpAvailable = !isMpPaused && hasMpConfigured;
  const isTransferAvailable = !isTransferPaused && hasTransferConfigured;

  // Automatically default to an available payment method when opening Step 3
  useEffect(() => {
    if (paymentMethod === 'mercadopago' && !isMpAvailable && isTransferAvailable) {
      setPaymentMethod('transferencia');
    } else if (paymentMethod === 'transferencia' && !isTransferAvailable && isMpAvailable) {
      setPaymentMethod('mercadopago');
    }
  }, [paymentMethod, isMpAvailable, isTransferAvailable]);

  // Real-time automatic verification watcher when waiting for Checkout Pro OAuth confirmation
  useEffect(() => {
    if (!isWaitingForConfirmation || !confirmedBooking || !hasAutomaticMP || confirmedBooking.paymentMethod !== 'mercadopago') {
      return;
    }

    let cancelled = false;

    const finalizePayment = (paymentRef: string, amount?: number) => {
      if (cancelled) return;
      const updated = confirmBookingPayment(confirmedBooking.bookingCode, paymentRef, amount);
      setConfirmedBooking(updated || { ...confirmedBooking, status: 'confirmed', paymentReference: paymentRef });
      setIsWaitingForConfirmation(false);
      setMpCheckoutUrl(null);
    };

    // 1. Check if Firestore snapshot already updated booking to 'confirmed' (e.g. via server Webhook)
    const syncedBooking = bookings.find(b => b.bookingCode === confirmedBooking.bookingCode);
    if (syncedBooking && syncedBooking.status === 'confirmed') {
      setConfirmedBooking(syncedBooking);
      setIsWaitingForConfirmation(false);
      setMpCheckoutUrl(null);
      return;
    }

    // 2. Listen for postMessage from Checkout Pro popup return
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const apiBase = getApiBaseUrl();
      const isTrustedApiOrigin = Boolean(apiBase) && origin === apiBase;
      if (
        !isTrustedApiOrigin &&
        !origin.endsWith('.run.app') &&
        !origin.endsWith('.onrender.com') &&
        !origin.endsWith('.koyeb.app') &&
        !origin.endsWith('.vercel.app') &&
        !origin.includes('localhost') &&
        !origin.includes('deportespmy.com.ar') &&
        origin !== window.location.origin
      ) {
        return;
      }
      if (event.data?.type === 'MP_PAYMENT_RETURN') {
        const { bookingCode, paymentId, status, collectionStatus } = event.data;
        if (bookingCode && bookingCode !== confirmedBooking.bookingCode) return;
        const ok = status === 'approved' || collectionStatus === 'approved' || status === 'success';
        if (ok) {
          finalizePayment(`MP-${paymentId || Date.now()}`, amountToPayNow);
        } else if (status === 'rejected' || collectionStatus === 'rejected') {
          setMpFlowError('El pago fue rechazado o cancelado en Mercado Pago. Podés reintentar o elegir otro medio.');
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // 3. Real-time polling against /api/mercadopago/verify-payment every 2.5 seconds
    const pollInterval = setInterval(async () => {
      if (cancelled) return;
      try {
        const resp = await fetch(
          apiUrl(`/api/mercadopago/verify-payment?booking_code=${encodeURIComponent(confirmedBooking.bookingCode)}&admin_id=${encodeURIComponent(courtAdminId)}`),
          { headers: { Accept: 'application/json' }, cache: 'no-store' }
        );
        if (!resp.ok) return;
        const data = await safeParseJsonResponse(resp);
        if (data?.verified) {
          finalizePayment(`MP-${data.paymentId || Date.now()}`, Number(data.amount) || amountToPayNow);
        }
      } catch {}
    }, 2500);

    return () => {
      cancelled = true;
      window.removeEventListener('message', handleMessage);
      clearInterval(pollInterval);
    };
  }, [isWaitingForConfirmation, confirmedBooking, hasAutomaticMP, bookings, courtAdminId, amountToPayNow, confirmBookingPayment]);

  // Handle Checkout Pro preference creation & CBU transfer reservation
  const handleConfirmAndPay = async () => {
    setIsProcessing(true);
    setMpFlowError(null);

    if (paymentMethod === 'mercadopago') {
      if (isMpPaused) {
        setMpFlowError('El complejo pausó temporalmente los cobros con Mercado Pago. Elegí otro medio disponible.');
        setIsProcessing(false);
        return;
      }
      if (!hasMpConfigured) {
        setMpFlowError('Este complejo aún no conectó Mercado Pago ni configuró su Alias.');
        setIsProcessing(false);
        return;
      }

      try {
        // 1. Official Automatic OAuth / Checkout Pro flow
        if (hasAutomaticMP) {
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

          const res = await fetch(apiUrl('/api/mercadopago/preference'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
              adminId: courtAdminId,
              origin: window.location.origin
            })
          });

          const data = await safeParseJsonResponse(res);
          if (!res.ok || !data.init_point) {
            setMpFlowError(data?.error || 'No se pudo iniciar el checkout de Mercado Pago.');
            setIsProcessing(false);
            return;
          }

          setMpCheckoutUrl(data.init_point);
          setConfirmedBooking(newBooking);
          setIsWaitingForConfirmation(true);
          setStep(4);

          // Open Mercado Pago Checkout Pro directly in popup / new tab (avoids iframe X-Frame-Options block)
          const payWin = window.open(
            data.init_point,
            'mp_checkout_popup',
            'width=640,height=780,scrollbars=yes,resizable=yes'
          );
          if (!payWin) {
            setMpFlowError('Tu navegador bloqueó la ventana de pago. Hacé clic en "Abrir Mercado Pago" abajo para completar el pago.');
          }
          setIsProcessing(false);
          return;
        }

        // 2. Direct Link / Alias Flow: create PENDING booking (like CBU)
        const pendingBookingObj = createBooking({
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
          paymentReference: hasDirectLink ? `MP-LINK-${Date.now().toString().slice(-4)}` : `MP-ALIAS-${Date.now().toString().slice(-4)}`,
          status: 'pending_payment'
        });

        // Open external Mercado Pago
        if (hasDirectLink) {
          const cleanLink = effectiveProfile.mpLink!.trim();
          try {
            window.open(cleanLink, '_blank', 'noopener,noreferrer');
          } catch {}
        } else if (targetAlias) {
          try {
            await navigator.clipboard.writeText(targetAlias);
            setCopiedAlias(true);
            setTimeout(() => setCopiedAlias(false), 3000);
          } catch {}

          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          const mpUrl = isMobile ? 'mercadopago://' : 'https://www.mercadopago.com.ar';
          
          try {
            // Avoid _blank for custom protocols on mobile to prevent empty tabs
            if (isMobile) {
              window.location.href = mpUrl;
            } else {
              window.open(mpUrl, '_blank', 'noopener,noreferrer');
            }
          } catch {}
        }

        setConfirmedBooking(pendingBookingObj);
        setIsWaitingForConfirmation(true);
        setStep(4);
        // Do not trigger WhatsApp yet; wait for user to confirm payment in Step 4

      } catch (err: any) {
        console.error('Error al procesar Mercado Pago:', err);
        setMpFlowError(err?.message || 'Error al registrar la reserva. Por favor intenta nuevamente.');
      } finally {
        setIsProcessing(false);
      }

    } else {
      // CBU / Transferencia Bancaria: block strictly if paused or unconfigured
      if (isTransferPaused) {
        setMpFlowError('Las transferencias bancarias están suspendidas temporalmente por este complejo.');
        setIsProcessing(false);
        return;
      }
      if (!hasTransferConfigured) {
        setMpFlowError('Este complejo aún no cargó su CBU ni Alias. No se puede realizar una transferencia hasta que lo configure.');
        setIsProcessing(false);
        return;
      }

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
          setMpFlowError(err?.message || 'Error al registrar la reserva.');
        } finally {
          setIsProcessing(false);
        }
      }, 400);
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
                    onClick={() => {
                      setMpFlowError(null);
                      setPaymentMethod('mercadopago');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      isMpPaused
                        ? paymentMethod === 'mercadopago'
                          ? 'bg-rose-950/40 border-rose-500/70 text-rose-200 ring-2 ring-rose-500/30'
                          : 'bg-slate-800/40 text-slate-400 border-rose-900/50 opacity-80'
                        : paymentMethod === 'mercadopago'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200 ring-2 ring-sky-400/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs text-sky-300 flex items-center gap-1.5">
                        <span>💙</span> Mercado Pago
                      </span>
                      {isMpPaused ? (
                        <span className="text-[10px] bg-rose-500/25 text-rose-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <PauseCircle className="w-3 h-3" /> Suspendido
                        </span>
                      ) : !hasMpConfigured ? (
                        <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">Sin configurar</span>
                      ) : (
                        <span className="text-[10px] bg-sky-500/25 text-sky-300 px-2 py-0.5 rounded-full font-bold">
                          {hasAutomaticMP ? 'Automático' : 'App / Alias'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {isMpPaused
                        ? 'Pausado temporalmente por el club'
                        : !hasMpConfigured
                        ? 'El club aún no configuró MP'
                        : hasAutomaticMP
                        ? 'Pagá con tarjeta o saldo y confirmá al instante'
                        : 'Transferí directo a nuestro Alias por la app'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMpFlowError(null);
                      setPaymentMethod('transferencia');
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                      isTransferPaused
                        ? paymentMethod === 'transferencia'
                          ? 'bg-rose-950/40 border-rose-500/70 text-rose-200 ring-2 ring-rose-500/30'
                          : 'bg-slate-800/40 text-slate-400 border-rose-900/50 opacity-80'
                        : paymentMethod === 'transferencia'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/50'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                        <span>🏦</span> CBU / Banco
                      </span>
                      {isTransferPaused ? (
                        <span className="text-[10px] bg-rose-500/25 text-rose-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <PauseCircle className="w-3 h-3" /> Suspendido
                        </span>
                      ) : !hasTransferConfigured ? (
                        <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-bold">Sin configurar</span>
                      ) : (
                        <span className="text-[10px] bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full font-bold">Transferencia</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {isTransferPaused
                        ? 'Pausado temporalmente por el club'
                        : !hasTransferConfigured
                        ? 'El club aún no cargó CBU ni Alias'
                        : 'Transferencia a CBU / CVU bancario'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Method Specific Form Details */}
              {paymentMethod === 'mercadopago' && (
                <div className={`p-4 border rounded-2xl space-y-3 ${
                  isMpPaused ? 'bg-rose-950/30 border-rose-500/40' : 'bg-sky-950/30 border-sky-800/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <span>💙</span> {hasAutomaticMP ? 'Mercado Pago Checkout Pro' : 'Cobro Online con Mercado Pago'}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                      isMpPaused
                        ? 'bg-rose-500/20 text-rose-300'
                        : !hasMpConfigured
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {isMpPaused ? 'Método Suspendido' : !hasMpConfigured ? 'No Disponible' : hasAutomaticMP ? 'Confirmación Automática' : 'Acreditación Directa'}
                    </span>
                  </div>

                  {isMpPaused ? (
                    <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <PauseCircle className="w-4 h-4 text-rose-400" />
                        <span>Mercado Pago Suspendido Temporalmente</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        El administrador de este complejo pausó los cobros con Mercado Pago en este momento. {isTransferAvailable ? 'Podés abonar mediante Transferencia CBU / Banco.' : 'Consultá con el club por WhatsApp.'}
                      </p>
                    </div>
                  ) : hasAutomaticMP ? (
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                      <p className="text-slate-200 leading-relaxed">
                        Pagás de forma segura con <strong>Tarjetas, Dinero en cuenta o QR</strong> directo a la cuenta oficial del complejo{effectiveProfile.mpAccountNickname ? ` (@${effectiveProfile.mpAccountNickname})` : ''}. Tu turno se confirma <strong>automáticamente</strong> al instante.
                      </p>
                      <div className="pt-1 border-t border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-slate-200">Total a abonar ahora:</span>
                        <strong className="text-white text-base font-black">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : targetAlias ? (
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
                        El administrador de este complejo aún no conectó su cuenta ni ingresó su Alias. {isTransferAvailable ? 'Podés elegir Transferencia Bancaria (CBU).' : 'Este método no está habilitado por el momento.'}
                      </p>
                    </div>
                  )}

                  {mpFlowError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                      {mpFlowError}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'transferencia' && (
                <div className={`p-4 border rounded-2xl space-y-3 text-xs ${
                  isTransferPaused ? 'bg-rose-950/30 border-rose-500/40' : 'bg-amber-950/20 border-amber-800/50'
                }`}>
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>🏦</span> Datos de la Cuenta Bancaria (CBU / CVU)
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isTransferPaused
                        ? 'bg-rose-500/20 text-rose-300'
                        : !hasTransferConfigured
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {isTransferPaused ? 'Método Suspendido' : !hasTransferConfigured ? 'Sin CBU / Alias' : 'Transferencia Inmediata'}
                    </span>
                  </div>

                  {isTransferPaused ? (
                    <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <PauseCircle className="w-4 h-4 text-rose-400" />
                        <span>Transferencia Bancaria Suspendida Temporalmente</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        El administrador de este complejo pausó las transferencias por CBU/Alias en este momento. {isMpAvailable ? 'Podés pagar con Mercado Pago.' : 'Contactá al club para coordinar.'}
                      </p>
                    </div>
                  ) : hasTransferConfigured ? (
                    <>
                      <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                        {targetCbu && (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[10px] text-slate-400 block">CBU / CVU (22 dígitos):</span>
                              <strong className="font-mono text-slate-100 text-xs font-bold tracking-wider">
                                {targetCbu}
                              </strong>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(targetCbu);
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
                    </>
                  ) : (
                    <div className="p-3.5 bg-amber-950/40 border border-amber-600/30 rounded-xl text-xs text-amber-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Transferencia CBU no disponible</span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        El complejo aún no ha cargado un CBU ni Alias para recibir transferencias. Por seguridad, no es posible reservar por transferencia ni enviar comprobantes hasta que el club configure su cuenta.
                      </p>
                    </div>
                  )}

                  {mpFlowError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
                      {mpFlowError}
                    </div>
                  )}
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
                  disabled={
                    isProcessing ||
                    (paymentMethod === 'mercadopago' && !isMpAvailable) ||
                    (paymentMethod === 'transferencia' && !isTransferAvailable)
                  }
                  onClick={handleConfirmAndPay}
                  className={`px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xl ${
                    paymentMethod === 'mercadopago'
                      ? 'bg-sky-400 hover:bg-sky-300 shadow-sky-400/25'
                      : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{paymentMethod === 'mercadopago' ? 'Preparando Mercado Pago...' : 'Confirmando Reserva...'}</span>
                    </>
                  ) : paymentMethod === 'mercadopago' ? (
                    <>
                      <span>
                        {isMpPaused
                          ? 'Mercado Pago Suspendido'
                          : !hasMpConfigured
                          ? 'Mercado Pago No Configurado'
                          : hasAutomaticMP
                          ? `Pagar $${amountToPayNow.toLocaleString('es-AR')} con Mercado Pago`
                          : `Abrir Mercado Pago y Transferir $${amountToPayNow.toLocaleString('es-AR')}`}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>
                        {isTransferPaused
                          ? 'Transferencia Suspendida'
                          : !hasTransferConfigured
                          ? 'CBU / Alias No Configurado'
                          : 'Confirmar Reserva y Adjuntar Comprobante'}
                      </span>
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
                    confirmedBooking.paymentMethod === 'mercadopago' && hasAutomaticMP
                      ? 'Estamos verificando tu pago en Mercado Pago en tiempo real. Apenas se apruebe, tu turno quedará confirmado automáticamente.'
                      : confirmedBooking.paymentMethod === 'mercadopago' && !hasAutomaticMP
                      ? 'Copiamos el Alias a tu portapapeles. Abrí Mercado Pago, realizá la transferencia y adjuntá el comprobante abajo para que el club lo apruebe.'
                      : 'Estamos esperando a que realices la transferencia. Adjuntá el comprobante abajo para confirmar tu turno.'
                  ) : confirmedBooking.status === 'confirmed' ? (
                    `Tu turno en ${confirmedBooking.courtName} quedó reservado para el ${confirmedBooking.date} de ${confirmedBooking.startTime} a ${confirmedBooking.endTime} hs.`
                  ) : (
                    'Tu reserva ha sido registrada como pendiente. El club verificará el depósito y confirmará el turno a la brevedad. Recibirás un mensaje por WhatsApp.'
                  )}
                </p>
              </div>

              {/* Real-time Skeleton Loader when verifying automatic OAuth Checkout Pro payment */}
              {isWaitingForConfirmation && hasAutomaticMP && confirmedBooking.paymentMethod === 'mercadopago' && (
                <div className="max-w-md mx-auto p-4 rounded-2xl bg-sky-950/35 border border-sky-500/35 space-y-3 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                      Verificando transacción en tiempo real...
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">#{confirmedBooking.bookingCode}</span>
                  </div>

                  {/* Skeleton shimmer bars */}
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-slate-800 rounded-lg w-3/4" />
                    <div className="h-3 bg-slate-800 rounded-lg w-1/2" />
                  </div>

                  {mpFlowError && (
                    <p className="text-[11px] text-rose-300 font-semibold">{mpFlowError}</p>
                  )}

                  {mpCheckoutUrl && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={mpCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Mercado Pago</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setIsWaitingForConfirmation(false);
                          setStep(3);
                        }}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                      >
                        Cambiar Medio
                      </button>
                    </div>
                  )}
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

              {/* Payment Receipt Badge */}
              <div className="max-w-md mx-auto p-4 bg-sky-950/30 border border-sky-500/30 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                    {confirmedBooking.paymentMethod === 'mercadopago' ? '💙 Pago Mercado Pago' : '🏦 Transferencia CBU / Banco'}
                  </span>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                    {confirmedBooking.paymentStatus === 'total_pagado' ? 'Total 100% Pagado' : confirmedBooking.status === 'confirmed' ? 'Seña 50% Abonada' : 'Pago Pendiente'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 flex justify-between">
                  <span>{confirmedBooking.paymentMethod === 'mercadopago' ? 'Destino:' : 'CBU / Alias:'}</span>
                  <strong className="font-mono text-emerald-400 font-bold">
                    {confirmedBooking.paymentMethod === 'mercadopago' 
                      ? (hasAutomaticMP ? (effectiveProfile.mpAccountNickname ? `@${effectiveProfile.mpAccountNickname}` : 'Checkout Pro Oficial') : (targetAlias || effectiveProfile.mpLink || 'Mercado Pago del Complejo'))
                      : (effectiveProfile.cbu || targetAlias || 'Cuenta Bancaria del Complejo')}
                  </strong>
                </div>
              </div>

              {/* Receipt Attachment Section ONLY for Manual/Offline Transfers (Alias/Link/CBU without automatic OAuth) */}
              {(!hasAutomaticMP || confirmedBooking.paymentMethod !== 'mercadopago') && (isWaitingForConfirmation || confirmedBooking.status === 'pending_payment' || confirmedBooking.status === 'awaiting_approval') && (
                <div className="p-5 rounded-2xl max-w-md mx-auto bg-slate-800/50 border border-slate-700 space-y-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-white leading-tight">Adjuntar Comprobante de Pago</h4>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Requerido para verificación manual</p>
                    </div>
                  </div>

                  {!receiptImage ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-8 h-8 text-slate-500 mb-2 group-hover:text-emerald-400 transition-colors" />
                        <p className="text-[11px] text-slate-400 font-bold group-hover:text-slate-300 transition-colors">Hacé clic para subir captura</p>
                        <p className="text-[10px] text-slate-500 mt-1">JPG, PNG o PDF (Máx 2MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setReceiptError(null);
                          if (!file) return;
                          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                            setReceiptError('Formato inválido. Subí una imagen JPG, PNG o WEBP del comprobante.');
                            return;
                          }
                          if (file.size > 2 * 1024 * 1024) {
                            setReceiptError('El archivo supera los 2MB permitidos. Comprimilo o elegí otra captura.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => setReceiptImage(reader.result as string);
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="relative group">
                      <img 
                        src={receiptImage} 
                        alt="Comprobante" 
                        className="w-full h-32 object-cover rounded-xl border border-slate-600 shadow-inner"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <button 
                          onClick={() => setReceiptImage(null)}
                          className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-500 transition-colors"
                        >
                          Quitar y Cambiar
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 bg-emerald-500 text-slate-950 p-1 rounded-full shadow-lg">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}

                  {receiptError && (
                    <p className="text-[11px] text-rose-400 font-semibold">{receiptError}</p>
                  )}

                  <button
                    type="button"
                    disabled={!receiptImage || isSubmittingReceipt}
                    onClick={() => {
                      if (!receiptImage) return;
                      setIsSubmittingReceipt(true);
                      
                      // Transition to awaiting_approval
                      const updated = submitPaymentReceipt(
                        confirmedBooking.bookingCode, 
                        receiptImage,
                        `REF-${confirmedBooking.paymentMethod.toUpperCase()}-${Date.now().toString().slice(-4)}`
                      );

                      if (updated) {
                        setConfirmedBooking(updated);
                        setIsWaitingForConfirmation(false);
                      }
                      
                      setTimeout(() => {
                        setIsSubmittingReceipt(false);
                        triggerWhatsAppSend(updated || confirmedBooking);
                      }, 800);
                    }}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    {isSubmittingReceipt ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Enviando Comprobante...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>Confirmar y Enviar a Verificación</span>
                      </>
                    )}
                  </button>
                  
                  {confirmedBooking.status === 'awaiting_approval' && (
                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-[11px] animate-pulse">
                      <CheckCircle className="w-3 h-3" />
                      <span>Comprobante enviado con éxito. Pendiente de aprobación.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Automatic WhatsApp Action Box (ONLY enabled after payment verification or real receipt upload) */}
              <div className={`p-4 rounded-2xl max-w-md mx-auto space-y-3 ${
                confirmedBooking.status === 'confirmed' ? 'bg-emerald-950/40 border border-emerald-500/40' : 'bg-amber-950/40 border border-amber-500/40'
              }`}>
                <div className={`flex items-center justify-center gap-2 font-bold text-sm ${
                  confirmedBooking.status === 'confirmed' ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  <MessageCircle className="w-5 h-5" />
                  <span>
                    {confirmedBooking.status === 'confirmed'
                      ? 'Notificación por WhatsApp Generada'
                      : confirmedBooking.status === 'awaiting_approval'
                      ? 'Avisar al Club por WhatsApp'
                      : 'Comprobante Requerido para WhatsApp'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed text-center">
                  {confirmedBooking.status === 'confirmed' 
                    ? '¡Turno confirmado! Podés enviar el ticket oficial a tu WhatsApp o compartirlo con tus amigos:'
                    : confirmedBooking.status === 'awaiting_approval'
                    ? 'El club recibió tu comprobante. Podés apurar la verificación avisando también por WhatsApp:'
                    : 'Por seguridad, debés adjuntar la captura real de tu transferencia arriba antes de enviar el aviso de comprobante por WhatsApp.'}
                </p>

                {(confirmedBooking.status === 'confirmed' || confirmedBooking.status === 'awaiting_approval') && (
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirmedBooking.status === 'confirmed') {
                          triggerWhatsAppSend(confirmedBooking);
                        } else {
                          const cleanPhone = (effectiveProfile.whatsappNumber || '').replace(/\D/g, '');
                          const shareText = `¡Hola! Acabo de reservar el turno #${confirmedBooking.bookingCode} en ${confirmedBooking.courtName} para el ${confirmedBooking.date} a las ${confirmedBooking.startTime} hs y ya adjunté mi comprobante de pago por ${confirmedBooking.paymentMethod.toUpperCase()}.`;
                          const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}` : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                          window.open(url, '_blank');
                        }
                      }}
                      className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                        confirmedBooking.status === 'confirmed' 
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30' 
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 fill-slate-950" />
                      <span>{confirmedBooking.status === 'confirmed' ? 'Abrir en WhatsApp' : 'Avisar Comprobante por WhatsApp'}</span>
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
                )}
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
