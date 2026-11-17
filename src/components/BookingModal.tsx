import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch, getApiBaseUrl, safeParseJsonResponse } from '../utils/api';
import { Court, PaymentMethod, Booking } from '../types';
import { getNormalizedCourtSchedule, parseSlotHourOrder } from '../utils/scheduleHours';
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
  Info,
  Copy,
  Check,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  FileCheck,
  PauseCircle,
  AlertTriangle,
  Landmark,
  Bell,
  BellRing,
  Download,
  Users,
  Send,
  Navigation,
} from 'lucide-react';
import { downloadBookingReceiptPng } from '../utils/receiptDownload';
import { buildGoogleMapsDirectionsUrl } from '../utils/maps';
import { JoinMatchModal } from './JoinMatchModal';
import { useBackHandler } from '../hooks/useBackHandler';

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
    setActiveTab,
    pushSupported,
    pushPermission,
    isPushEnabled,
    enablePushNotifications,
    requestPlayersForBooking,
    stopLookingForPlayers,
    updateBookingSplitConfig
  } = useApp();

  useBackHandler(true, onClose, 'booking-modal');

  const effectiveProfile = getBusinessProfileForCourt(court);
  const courtAdminId = getAdminIdForCourt(court);
  const hasAutomaticMP = Boolean(effectiveProfile.mpOAuthConnected || effectiveProfile.mpAccessToken);

  // Multi-step state: 1 (Turno) -> 2 (Datos) -> 3 (Pago Online) -> 4 (Confirmado)
  const [step, setStep] = useState<number>(initialSlotTime ? 2 : 1);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>(initialSlotTime || '');
  const durationMinutes = 60; // Turnos estrictamente de 1 hora (60 min)
  
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
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);
  const [isActivatingPush, setIsActivatingPush] = useState(false);

  // Matchmaking: join open slot from Step 1 or ask for missing players in Step 4
  const [activeJoinBooking, setActiveJoinBooking] = useState<Booking | null>(null);
  const [lfpCount, setLfpCount] = useState<number>(1);
  const [lfpNote, setLfpNote] = useState<string>('');
  const [isSendingLfp, setIsSendingLfp] = useState(false);
  const [lfpFeedback, setLfpFeedback] = useState<string | null>(null);
  const [splitPlayersCount, setSplitPlayersCount] = useState<number>(
    court.sport === 'padel' || court.sport === 'tenis' ? 4 : court.sport === 'futbol5' ? 10 : 12
  );
  const [splitSavedNotice, setSplitSavedNotice] = useState(false);

  // Available slots for selected date (scoped estrictamente a hora_inicio..hora_fin)
  const slots = getSlotsForCourtAndDate(court.id, selectedDate);
  const { hora_inicio, hora_fin, nightStartHour } = getNormalizedCourtSchedule(court);
  const hourNum = parseSlotHourOrder(selectedSlotTime || hora_inicio);
  const isNight = hourNum >= nightStartHour;
  const baseHourlyPrice = isNight ? court.hourlyRateNight : court.hourlyRateDay;
  const totalPrice = baseHourlyPrice;

  useEffect(() => {
    if (slots.length === 0) return;
    const match = slots.find((s) => s.startTime === selectedSlotTime);
    if (!match) {
      const firstAvail = slots.find((s) => s.status === 'available') || slots[0];
      if (firstAvail) setSelectedSlotTime(firstAvail.startTime);
    }
  }, [slots, selectedSlotTime]);
  const depositPercent = typeof court.depositRequired === 'number' && !isNaN(court.depositRequired) && court.depositRequired >= 0 && court.depositRequired <= 100 ? court.depositRequired : 50;
  const depositAmount = Math.round(totalPrice * (depositPercent / 100));
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

  // Live Firestore sync while viewing Step 4 (for manual transfers approved/cancelled in real time)
  useEffect(() => {
    if (step !== 4 || !confirmedBooking) return;
    const synced = bookings.find(
      (b) =>
        b.id === confirmedBooking.id ||
        b.bookingCode.toUpperCase() === confirmedBooking.bookingCode.toUpperCase()
    );
    if (!synced) return;
    if (
      synced.status !== confirmedBooking.status ||
      synced.paymentStatus !== confirmedBooking.paymentStatus ||
      synced.paymentReference !== confirmedBooking.paymentReference ||
      synced.amountPaid !== confirmedBooking.amountPaid ||
      synced.balanceDue !== confirmedBooking.balanceDue ||
      synced.lookingForPlayers !== confirmedBooking.lookingForPlayers ||
      synced.neededPlayers !== confirmedBooking.neededPlayers ||
      synced.totalPlayers !== confirmedBooking.totalPlayers ||
      synced.perPlayerAmount !== confirmedBooking.perPlayerAmount ||
      (synced.joinedPlayers?.length || 0) !== (confirmedBooking.joinedPlayers?.length || 0)
    ) {
      setConfirmedBooking(synced);
      if (synced.status === 'confirmed' || synced.status === 'cancelled') {
        setIsWaitingForConfirmation(false);
        setMpCheckoutUrl(null);
      }
    }
  }, [step, bookings, confirmedBooking]);

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
        const resp = await apiFetch(
          `/api/mercadopago/verify-payment?booking_code=${encodeURIComponent(confirmedBooking.bookingCode)}&admin_id=${encodeURIComponent(courtAdminId)}`,
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

          const res = await apiFetch('/api/mercadopago/preference', {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl shadow-2xl text-[var(--text-primary)] overflow-hidden my-8">
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)]">
          <div>
            <p className="text-xs font-semibold text-[var(--accent-soft-text)]">
              Reserva online · DeportesPMY
            </p>
            <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)] leading-tight">
              {court.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-step progress bar */}
        {step < 4 && (
          <div className="px-6 py-3 bg-[var(--bg-canvas)] border-b border-[var(--border-hairline)] flex items-center justify-between text-xs">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] ${step >= 1 ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[var(--bg-subtle)]'}`}>1</span>
              <span>Horario</span>
            </div>
            <div className="flex-1 mx-3 h-px bg-[var(--border-hairline)]" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] ${step >= 2 ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[var(--bg-subtle)]'}`}>2</span>
              <span>Datos</span>
            </div>
            <div className="flex-1 mx-3 h-px bg-[var(--border-hairline)]" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[11px] ${step >= 3 ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-[var(--bg-subtle)]'}`}>3</span>
              <span>Pago</span>
            </div>
          </div>
        )}

        <div className="p-6">
          
          {/* STEP 1: Select Slot (1h fixed) */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Date & Fixed 1h Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                    Duración del turno
                  </label>
                  <div className="h-[42px] px-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                      <Clock className="w-4 h-4 text-[var(--accent-soft-text)]" />
                      <span>1 hora fija (60 min)</span>
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                      {hora_inicio}–{hora_fin} hs
                    </span>
                  </div>
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-[var(--text-primary)]">
                    Horarios disponibles · <span className="font-mono tabular-nums">{selectedDate}</span>
                  </span>
                  <span className="text-[var(--accent-soft-text)] font-medium">Seleccioná horario (1h)</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-60 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isAvailable = slot.status === 'available';
                    const missingCount = slot.missingPlayersCount || 0;
                    const isLooking = missingCount > 0 && Boolean(slot.bookingId);
                    const isClickable = isAvailable || isLooking;
                    const isSelected = selectedSlotTime === slot.startTime && isAvailable;
                    const slotHourOrder = parseSlotHourOrder(slot.startTime);
                    const isNightSlot = slotHourOrder >= nightStartHour;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isClickable}
                        onClick={() => {
                          if (isLooking && slot.bookingId) {
                            const match = bookings.find((b) => b.id === slot.bookingId);
                            if (match) setActiveJoinBooking(match);
                            return;
                          }
                          setSelectedSlotTime(slot.startTime);
                        }}
                        className={`p-2 rounded-lg text-center border text-xs font-medium transition-colors relative tabular-nums ${
                          isLooking
                            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/60 font-semibold cursor-pointer'
                            : !isAvailable
                            ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-transparent cursor-not-allowed line-through opacity-55'
                            : isSelected
                            ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] font-bold cursor-pointer'
                            : 'bg-[var(--bg-canvas)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--accent)] cursor-pointer'
                        }`}
                      >
                        <div className="font-mono text-sm font-bold">{slot.startTime}</div>
                        <div className="font-mono text-[11px] opacity-90">
                          {isLooking
                            ? (missingCount === 1 ? 'Falta 1 · Sumarme' : `Faltan ${missingCount} · Sumarme`)
                            : isAvailable
                            ? `$${slot.price.toLocaleString('es-AR')}`
                            : 'Ocupado'}
                        </div>
                        {isNightSlot && isAvailable && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--night-cue)]" title="Tarifa nocturna con luz" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Court Summary */}
              <div className="p-3.5 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent-soft-text)]" />
                  {court.surface} · {court.isIndoor ? 'Techada' : 'Al aire libre'}
                </span>
                <span className="font-mono font-bold text-[var(--text-primary)] text-sm tabular-nums">
                  ${totalPrice.toLocaleString('es-AR')}
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Continuar con datos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Client Info & WhatsApp Phone */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[var(--accent-soft)] border border-[var(--border-hairline)] rounded-lg text-xs text-[var(--text-primary)] flex items-start gap-2.5">
                <MessageCircle className="w-4 h-4 shrink-0 text-[var(--accent-soft-text)] mt-0.5" />
                <div>
                  <p className="font-semibold">Notificación directa por WhatsApp</p>
                  <p className="text-[var(--text-secondary)] mt-0.5">
                    Al confirmar, generaremos el comprobante del partido para enviarlo directo a tu WhatsApp.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Nombre completo del titular
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Gonzalo Morales"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Celular WhatsApp (con código de área)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+5492804567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                  Ejemplo Puerto Madryn: +54 9 280 456-7890
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Email (para comprobante)
                </label>
                <input
                  type="email"
                  required
                  placeholder="tuemail@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Necesitamos chalecos o alquiler de paletas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>

                <button
                  type="button"
                  disabled={!name.trim() || !phone.trim()}
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Ir al pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Online Payment Checkout */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Payment Split Option */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Modalidad de pago online
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentOption('deposit')}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      paymentOption === 'deposit'
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--accent-soft-text)]">Seña {depositPercent}%</span>
                      <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                        ${depositAmount.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Abonás el {depositPercent}% ahora y el saldo de ${(totalPrice - depositAmount).toLocaleString('es-AR')} en cancha.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentOption('full')}
                    className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      paymentOption === 'full'
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--accent-soft-text)]">Total 100%</span>
                      <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                        ${totalPrice.toLocaleString('es-AR')}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Dejás la cancha cancelada y pasás directo a jugar.
                    </p>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Medio de pago
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMpFlowError(null);
                      setPaymentMethod('mercadopago');
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-colors flex flex-col gap-1 cursor-pointer ${
                      isMpPaused
                        ? 'bg-rose-500/10 border-rose-500/40 text-[var(--text-primary)]'
                        : paymentMethod === 'mercadopago'
                        ? 'bg-[var(--mp-soft)] border-[var(--mp-brand)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-[var(--mp-text)] flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Mercado Pago</span>
                      </span>
                      {isMpPaused ? (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <PauseCircle className="w-3 h-3" /> Suspendido
                        </span>
                      ) : !hasMpConfigured ? (
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">Sin configurar</span>
                      ) : (
                        <span className="text-[10px] text-[var(--mp-text)] font-semibold">
                          {hasAutomaticMP ? 'Automático' : 'App / Alias'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {isMpPaused
                        ? 'Pausado temporalmente por el club'
                        : !hasMpConfigured
                        ? 'El club aún no configuró MP'
                        : hasAutomaticMP
                        ? 'Pagá con tarjeta o saldo y confirmá al instante'
                        : 'Transferí directo al Alias desde tu app'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMpFlowError(null);
                      setPaymentMethod('transferencia');
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-colors flex flex-col gap-1 cursor-pointer ${
                      isTransferPaused
                        ? 'bg-rose-500/10 border-rose-500/40 text-[var(--text-primary)]'
                        : paymentMethod === 'transferencia'
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-[var(--night-cue)]" />
                        <span>CBU / Banco</span>
                      </span>
                      {isTransferPaused ? (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <PauseCircle className="w-3 h-3" /> Suspendido
                        </span>
                      ) : !hasTransferConfigured ? (
                        <span className="text-[10px] text-[var(--text-muted)] font-semibold">Sin configurar</span>
                      ) : (
                        <span className="text-[10px] text-[var(--text-secondary)] font-semibold">Transferencia</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">
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
                <div className={`p-4 border rounded-lg space-y-3 ${
                  isMpPaused ? 'bg-rose-500/10 border-rose-500/40' : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--mp-text)] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{hasAutomaticMP ? 'Mercado Pago Checkout Pro' : 'Cobro con Mercado Pago'}</span>
                    </span>
                    <span className={`text-[11px] font-semibold ${
                      isMpPaused
                        ? 'text-rose-600 dark:text-rose-400'
                        : !hasMpConfigured
                        ? 'text-[var(--text-muted)]'
                        : 'text-[var(--accent-soft-text)]'
                    }`}>
                      {isMpPaused ? 'Suspendido' : !hasMpConfigured ? 'No disponible' : hasAutomaticMP ? 'Confirmación automática' : 'Acreditación directa'}
                    </span>
                  </div>

                  {isMpPaused ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                        <PauseCircle className="w-4 h-4" />
                        <span>Mercado Pago suspendido temporalmente</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        El complejo pausó cobros con Mercado Pago en este momento. {isTransferAvailable ? 'Podés abonar por Transferencia CBU / Banco.' : 'Consultá con el club por WhatsApp.'}
                      </p>
                    </div>
                  ) : hasAutomaticMP ? (
                    <div className="p-3.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-hairline)] space-y-2 text-xs text-[var(--text-secondary)]">
                      <p className="leading-relaxed">
                        Pagás con <strong>tarjetas, dinero en cuenta o QR</strong> directo a la cuenta oficial del complejo{effectiveProfile.mpAccountNickname ? ` (@${effectiveProfile.mpAccountNickname})` : ''}. Tu turno se confirma <strong>automáticamente</strong>.
                      </p>
                      <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-between items-center">
                        <span className="font-semibold text-[var(--text-primary)]">Total a abonar ahora:</span>
                        <strong className="font-mono text-[var(--text-primary)] text-base tabular-nums">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : targetAlias ? (
                    <div className="p-3.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-hairline)] space-y-2 text-xs text-[var(--text-secondary)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[11px] text-[var(--text-muted)] block">Alias de Mercado Pago:</span>
                          <strong className="font-mono text-[var(--text-primary)] text-sm font-bold">
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
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--border-hairline)]"
                        >
                          {copiedAlias ? <Check className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                          <span>{copiedAlias ? 'Copiado' : 'Copiar Alias'}</span>
                        </button>
                      </div>

                      {(effectiveProfile.accountHolder || effectiveProfile.ownerName) && (
                        <div className="text-[11px] pt-1.5 border-t border-[var(--border-hairline)] flex justify-between">
                          <span>Titular:</span>
                          <strong className="text-[var(--text-primary)]">{effectiveProfile.accountHolder || effectiveProfile.ownerName}</strong>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-[var(--border-hairline)] flex justify-between items-center">
                        <span className="font-semibold text-[var(--text-primary)]">Importe a transferir:</span>
                        <strong className="font-mono text-[var(--text-primary)] text-base tabular-nums">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : hasDirectLink ? (
                    <div className="p-3.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-hairline)] space-y-2 text-xs text-[var(--text-secondary)]">
                      <span className="block">
                        Este complejo cuenta con <strong>Link Oficial de Pago</strong> directo.
                      </span>
                      <div className="pt-1.5 border-t border-[var(--border-hairline)] flex justify-between items-center">
                        <span className="font-semibold text-[var(--text-primary)]">Monto:</span>
                        <strong className="font-mono text-[var(--text-primary)] text-base tabular-nums">${amountToPayNow.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                        <Info className="w-4 h-4" />
                        <span>Configuración de Mercado Pago pendiente</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        El complejo aún no conectó su cuenta ni cargó su Alias. {isTransferAvailable ? 'Podés elegir Transferencia Bancaria (CBU).' : 'Método no habilitado.'}
                      </p>
                    </div>
                  )}

                  {mpFlowError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                      {mpFlowError}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'transferencia' && (
                <div className={`p-4 border rounded-lg space-y-3 text-xs ${
                  isTransferPaused ? 'bg-rose-500/10 border-rose-500/40' : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)]'
                }`}>
                  <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                    <span className="flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-[var(--night-cue)]" />
                      <span>Cuenta bancaria (CBU / CVU)</span>
                    </span>
                    <span className={`text-[11px] font-semibold ${
                      isTransferPaused
                        ? 'text-rose-600 dark:text-rose-400'
                        : !hasTransferConfigured
                        ? 'text-[var(--text-muted)]'
                        : 'text-[var(--accent-soft-text)]'
                    }`}>
                      {isTransferPaused ? 'Suspendido' : !hasTransferConfigured ? 'Sin CBU / Alias' : 'Transferencia inmediata'}
                    </span>
                  </div>

                  {isTransferPaused ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                        <PauseCircle className="w-4 h-4" />
                        <span>Transferencia suspendida temporalmente</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        El administrador pausó las transferencias por CBU/Alias. {isMpAvailable ? 'Podés pagar con Mercado Pago.' : 'Contactá al club.'}
                      </p>
                    </div>
                  ) : hasTransferConfigured ? (
                    <>
                      <div className="p-3.5 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-hairline)] space-y-2 text-[var(--text-secondary)]">
                        {targetCbu && (
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-[11px] text-[var(--text-muted)] block">CBU / CVU (22 dígitos):</span>
                              <strong className="font-mono text-[var(--text-primary)] text-xs font-bold">
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
                              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--border-hairline)]"
                            >
                              {copiedCbu ? <Check className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                              <span>{copiedCbu ? 'Copiado' : 'Copiar CBU'}</span>
                            </button>
                          </div>
                        )}

                        {targetAlias && (
                          <div className="flex justify-between items-center pt-1.5 border-t border-[var(--border-hairline)]">
                            <div>
                              <span className="text-[11px] text-[var(--text-muted)] block">Alias bancario:</span>
                              <strong className="font-mono text-[var(--text-primary)] text-xs font-bold">
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
                              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--border-hairline)]"
                            >
                              {copiedAlias ? <Check className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                              <span>{copiedAlias ? 'Copiado' : 'Copiar Alias'}</span>
                            </button>
                          </div>
                        )}

                        {(effectiveProfile.accountHolder || effectiveProfile.ownerName) && (
                          <div className="text-[11px] pt-1.5 border-t border-[var(--border-hairline)] flex justify-between">
                            <span>Titular:</span>
                            <strong className="text-[var(--text-primary)]">{effectiveProfile.accountHolder || effectiveProfile.ownerName}</strong>
                          </div>
                        )}

                        <div className="pt-1.5 border-t border-[var(--border-hairline)] flex justify-between items-center">
                          <span className="font-semibold text-[var(--text-primary)]">Monto a transferir:</span>
                          <strong className="font-mono text-[var(--text-primary)] text-base tabular-nums">${amountToPayNow.toLocaleString('es-AR')}</strong>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[var(--text-secondary)] font-medium mb-1">
                          Nº de operación o comprobante (opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: TRF-98231 o últimos 4 dígitos"
                          value={transferRef}
                          onChange={(e) => setTransferRef(e.target.value)}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Transferencia CBU no disponible</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        El complejo aún no cargó un CBU ni Alias para recibir transferencias.
                      </p>
                    </div>
                  )}

                  {mpFlowError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300">
                      {mpFlowError}
                    </div>
                  )}
                </div>
              )}

              {/* Order summary breakdown */}
              <div className="p-3.5 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-hairline)] space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Turno: <span className="font-mono tabular-nums">{selectedDate} ({selectedSlotTime} hs)</span></span>
                  <span className="font-mono tabular-nums">1 hora (60 min)</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor cancha:</span>
                  <span className="font-mono tabular-nums">${totalPrice.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[var(--accent-soft-text)] font-bold pt-1.5 border-t border-[var(--border-hairline)]">
                  <span>A pagar ahora ({paymentOption === 'deposit' ? `Seña ${depositPercent}%` : 'Total 100%'}):</span>
                  <span className="font-mono text-base tabular-nums">${amountToPayNow.toLocaleString('es-AR')}</span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between text-[11px] text-[var(--night-cue)] font-medium">
                    <span>Saldo restante en cancha:</span>
                    <span className="font-mono tabular-nums">${balanceDue.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>

              {/* Política visible de cancelación y reprogramación */}
              <div className="p-3 bg-[var(--bg-subtle)]/70 rounded-lg border border-[var(--border-hairline)] flex items-start gap-2 text-[11px] text-[var(--text-secondary)]">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Política de cancelación y reprogramación:
                  </span>{' '}
                  Podés reprogramar o cancelar sin penalidad desde <strong>“Mis reservas”</strong> hasta{' '}
                  <strong className="font-mono">{effectiveProfile.cancellationWindowHours ?? 24} hs antes</strong>{' '}
                  del inicio del partido (si abonaste con Mercado Pago, la devolución de la seña es automática).
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  className="px-5 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>{paymentMethod === 'mercadopago' ? 'Preparando Mercado Pago...' : 'Confirmando reserva...'}</span>
                    </>
                  ) : paymentMethod === 'mercadopago' ? (
                    <>
                      <span>
                        {isMpPaused
                          ? 'Mercado Pago suspendido'
                          : !hasMpConfigured
                          ? 'Mercado Pago no configurado'
                          : hasAutomaticMP
                          ? `Pagar $${amountToPayNow.toLocaleString('es-AR')} con Mercado Pago`
                          : `Abrir Mercado Pago ($${amountToPayNow.toLocaleString('es-AR')})`}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>
                        {isTransferPaused
                          ? 'Transferencia suspendida'
                          : !hasTransferConfigured
                          ? 'CBU / Alias no configurado'
                          : 'Confirmar y adjuntar comprobante'}
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
            <div className="space-y-5 text-center py-2">
              
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
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                ) : confirmedBooking.status === 'cancelled' ? (
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-9 h-9" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                    <Clock className="w-10 h-10 animate-pulse" />
                  </div>
                )}
              </div>

              <div>
                <span className={`text-xs font-semibold ${
                  isWaitingForConfirmation
                    ? 'text-sky-600 dark:text-sky-400'
                    : confirmedBooking.status === 'confirmed'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : confirmedBooking.status === 'cancelled'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {isWaitingForConfirmation
                    ? 'Esperando confirmación de pago'
                    : confirmedBooking.status === 'confirmed'
                    ? 'Reserva confirmada y acreditada'
                    : confirmedBooking.status === 'cancelled'
                    ? 'Turno cancelado'
                    : confirmedBooking.status === 'awaiting_approval'
                    ? 'Comprobante enviado · En revisión'
                    : 'Reserva pendiente de verificación'}
                </span>
                
                <h3 className="text-2xl font-bold font-heading mt-1">
                  {isWaitingForConfirmation
                    ? 'Procesando en Mercado Pago'
                    : confirmedBooking.status === 'confirmed'
                    ? `Turno Confirmado #${confirmedBooking.bookingCode}`
                    : confirmedBooking.status === 'cancelled'
                    ? `Reserva Cancelada #${confirmedBooking.bookingCode}`
                    : `Turno Reservado #${confirmedBooking.bookingCode}`}
                </h3>
                
                <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-relaxed">
                  {isWaitingForConfirmation ? (
                    confirmedBooking.paymentMethod === 'mercadopago' && hasAutomaticMP
                      ? 'Estamos verificando tu pago en Mercado Pago en tiempo real. Apenas se apruebe, tu turno quedará confirmado automáticamente.'
                      : confirmedBooking.paymentMethod === 'mercadopago' && !hasAutomaticMP
                      ? 'Copiamos el Alias a tu portapapeles. Abrí Mercado Pago, realizá la transferencia y adjuntá el comprobante abajo para que el club lo apruebe.'
                      : 'Estamos esperando a que realices la transferencia. Adjuntá el comprobante abajo para confirmar tu turno.'
                  ) : confirmedBooking.status === 'confirmed' ? (
                    `Tu turno en ${confirmedBooking.courtName} quedó confirmado para el ${confirmedBooking.date} de ${confirmedBooking.startTime} a ${confirmedBooking.endTime} hs.`
                  ) : confirmedBooking.status === 'cancelled' ? (
                    'Esta reserva fue cancelada y el horario volvió a quedar disponible.'
                  ) : confirmedBooking.status === 'awaiting_approval' ? (
                    'El club ya recibió tu comprobante. En cuanto el administrador apruebe la acreditación, te avisaremos por Push y WhatsApp.'
                  ) : (
                    'Tu reserva fue registrada como pendiente. Adjuntá el comprobante de transferencia o avisá al club para confirmarla.'
                  )}
                </p>
              </div>

              {/* 3-Step Visual Status Timeline */}
              <div className="max-w-md mx-auto grid grid-cols-3 gap-2 p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[11px]">
                <div className="flex flex-col items-center gap-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">1. Registrada</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                    confirmedBooking.status === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : confirmedBooking.status === 'cancelled'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  }`}>
                    {confirmedBooking.status === 'confirmed' ? <Check className="w-3.5 h-3.5" /> : '2'}
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {confirmedBooking.status === 'awaiting_approval'
                      ? '2. En revisión'
                      : confirmedBooking.status === 'confirmed'
                      ? '2. Pago OK'
                      : '2. Pago'}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                    confirmedBooking.status === 'confirmed'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : confirmedBooking.status === 'cancelled'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                  }`}>
                    {confirmedBooking.status === 'confirmed' ? <Check className="w-3.5 h-3.5" /> : '3'}
                  </span>
                  <span className={`font-semibold ${confirmedBooking.status === 'confirmed' ? 'text-[var(--accent-soft-text)]' : 'text-[var(--text-muted)]'}`}>
                    {confirmedBooking.status === 'cancelled' ? '3. Cancelada' : '3. Confirmada'}
                  </span>
                </div>
              </div>

              {isWaitingForConfirmation && hasAutomaticMP && confirmedBooking.paymentMethod === 'mercadopago' && (
                <div className="max-w-md mx-auto p-4 rounded-xl bg-[var(--mp-soft)] border border-[var(--border-hairline)] space-y-3 text-left">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--mp-text)]">
                      Verificando transacción en tiempo real...
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">#{confirmedBooking.bookingCode}</span>
                  </div>

                  <div className="space-y-2 animate-pulse">
                    <div className="h-2.5 bg-[var(--bg-subtle)] rounded w-3/4" />
                    <div className="h-2.5 bg-[var(--bg-subtle)] rounded w-1/2" />
                  </div>

                  {mpFlowError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{mpFlowError}</p>
                  )}

                  {mpCheckoutUrl && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={mpCheckoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 px-4 rounded-lg bg-[var(--mp-brand)] hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-opacity"
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
                        className="py-2.5 px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs cursor-pointer"
                      >
                        Cambiar medio
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Clean Reservation Details Summary */}
              <div className="max-w-md mx-auto bg-[var(--bg-canvas)] p-4 rounded-lg border border-[var(--border-hairline)] text-left space-y-2.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-hairline)]">
                  <span className="font-semibold text-[var(--text-primary)]">Comprobante digital</span>
                  <span className="font-mono text-[var(--accent-soft-text)] font-bold">
                    #{confirmedBooking.bookingCode}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span>Complejo:</span>
                    <strong className="text-[var(--text-primary)]">{effectiveProfile.complexName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancha:</span>
                    <strong className="text-[var(--text-primary)]">{confirmedBooking.courtName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha y horario:</span>
                    <strong className="font-mono text-[var(--text-primary)] tabular-nums">
                      {confirmedBooking.date} · {confirmedBooking.startTime} a {confirmedBooking.endTime} hs
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Titular:</span>
                    <strong className="text-[var(--text-primary)]">{confirmedBooking.clientName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Referencia / Op.:</span>
                    <strong className="font-mono text-[var(--text-primary)]">
                      {confirmedBooking.paymentReference || `#${confirmedBooking.bookingCode}`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Total cancha:</span>
                    <strong className="font-mono text-[var(--text-primary)] tabular-nums">${confirmedBooking.totalAmount.toLocaleString('es-AR')}</strong>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[var(--border-hairline)]">
                    <span>Abonado ({confirmedBooking.paymentMethod.toUpperCase()}):</span>
                    <strong className="font-mono text-[var(--accent-soft-text)] tabular-nums">${confirmedBooking.amountPaid.toLocaleString('es-AR')}</strong>
                  </div>
                  {confirmedBooking.balanceDue > 0 && (
                    <div className="flex justify-between text-[var(--night-cue)] font-medium">
                      <span>Saldo restante en cancha:</span>
                      <strong className="font-mono tabular-nums">${confirmedBooking.balanceDue.toLocaleString('es-AR')}</strong>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => downloadBookingReceiptPng(confirmedBooking, effectiveProfile.complexName)}
                    className="flex-1 py-2 px-3 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--border-hairline)] transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                    <span>Comprobante (.png)</span>
                  </button>
                  <a
                    href={buildGoogleMapsDirectionsUrl(effectiveProfile, effectiveProfile.complexName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-lg bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent-soft-text)] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--border-hairline)] transition-opacity"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>¿Cómo llegar?</span>
                  </a>
                </div>
              </div>

              {/* Web Push Notifications Opt-in Box */}
              {pushSupported && (
                <div className="max-w-md mx-auto p-3.5 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg text-left space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center shrink-0">
                        {isPushEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {isPushEnabled
                            ? `Avisos Push activos para #${confirmedBooking.bookingCode}`
                            : 'Recibir avisos Push en este dispositivo'}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {pushPermission === 'denied'
                            ? 'Notificaciones bloqueadas en el navegador. Habilitalas en ajustes del sitio.'
                            : isPushEnabled
                            ? 'Te notificaremos directo en este dispositivo cuando el club apruebe o actualice tu reserva.'
                            : 'Enterate al instante cuando se confirme el pago o haya cambios en el turno.'}
                        </p>
                      </div>
                    </div>

                    {pushPermission !== 'denied' && (
                      <button
                        type="button"
                        disabled={isActivatingPush}
                        onClick={async () => {
                          setIsActivatingPush(true);
                          const res = await enablePushNotifications({
                            bookingCode: confirmedBooking.bookingCode,
                            clientPhone: confirmedBooking.clientPhone,
                            clientName: confirmedBooking.clientName,
                          });
                          setPushFeedback(res.message);
                          setIsActivatingPush(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                          isPushEnabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)]'
                        }`}
                      >
                        {isActivatingPush ? 'Activando...' : isPushEnabled ? 'Sincronizado' : 'Activar'}
                      </button>
                    )}
                  </div>
                  {pushFeedback && (
                    <p className="text-[11px] text-[var(--accent-soft-text)] font-medium">{pushFeedback}</p>
                  )}
                </div>
              )}

              {/* Payment Receipt Badge */}
              <div className="max-w-md mx-auto p-4 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--mp-text)] flex items-center gap-1.5">
                    {confirmedBooking.paymentMethod === 'mercadopago' ? (
                      <><CreditCard className="w-3.5 h-3.5" /><span>Mercado Pago</span></>
                    ) : (
                      <><Landmark className="w-3.5 h-3.5" /><span>Transferencia CBU / Banco</span></>
                    )}
                  </span>
                  <span className="text-[11px] text-[var(--accent-soft-text)] font-semibold">
                    {confirmedBooking.status === 'cancelled'
                      ? 'Reserva cancelada'
                      : confirmedBooking.paymentStatus === 'total_pagado'
                      ? 'Total 100% pagado'
                      : confirmedBooking.status === 'confirmed'
                      ? `Seña ${depositPercent}% abonada`
                      : 'Pago pendiente'}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] flex justify-between">
                  <span>{confirmedBooking.paymentMethod === 'mercadopago' ? 'Destino:' : 'CBU / Alias:'}</span>
                  <strong className="font-mono text-[var(--text-primary)] font-bold">
                    {confirmedBooking.paymentMethod === 'mercadopago'
                      ? (hasAutomaticMP ? (effectiveProfile.mpAccountNickname ? `@${effectiveProfile.mpAccountNickname}` : 'Checkout Pro Oficial') : (targetAlias || effectiveProfile.mpLink || 'Mercado Pago del Complejo'))
                      : (effectiveProfile.cbu || targetAlias || 'Cuenta Bancaria del Complejo')}
                  </strong>
                </div>
              </div>

              {/* Receipt Attachment Section ONLY for Manual/Offline Transfers */}
              {(!hasAutomaticMP || confirmedBooking.paymentMethod !== 'mercadopago') && (isWaitingForConfirmation || confirmedBooking.status === 'pending_payment' || confirmedBooking.status === 'awaiting_approval') && (
                <div className="p-5 rounded-lg max-w-md mx-auto bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent-soft-text)] shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">Adjuntar comprobante de pago</h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Requerido para verificación manual</p>
                    </div>
                  </div>

                  {!receiptImage ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageIcon className="w-7 h-7 text-[var(--text-muted)] mb-2 group-hover:text-[var(--accent-soft-text)] transition-colors" />
                        <p className="text-xs text-[var(--text-primary)] font-medium">Hacé clic para subir captura</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">JPG, PNG o WEBP (Máx. 2MB)</p>
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
                        className="w-full h-32 object-cover rounded-lg border border-[var(--border-hairline)]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <button
                          type="button"
                          onClick={() => setReceiptImage(null)}
                          className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-500 transition-colors cursor-pointer"
                        >
                          Quitar y cambiar
                        </button>
                      </div>
                    </div>
                  )}

                  {receiptError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{receiptError}</p>
                  )}

                  <button
                    type="button"
                    disabled={!receiptImage || isSubmittingReceipt}
                    onClick={() => {
                      if (!receiptImage) return;
                      setIsSubmittingReceipt(true);

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
                    className="w-full py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--accent-ink)] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isSubmittingReceipt ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Enviando comprobante...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>Confirmar y enviar a verificación</span>
                      </>
                    )}
                  </button>

                  {confirmedBooking.status === 'awaiting_approval' && (
                    <div className="flex items-center justify-center gap-2 text-[var(--accent-soft-text)] font-semibold text-xs">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Comprobante enviado con éxito. Pendiente de aprobación.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Automatic WhatsApp Action Box */}
              <div className="p-4 rounded-lg max-w-md mx-auto bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-3">
                <div className="flex items-center justify-center gap-2 font-semibold text-sm text-[var(--text-primary)]">
                  <MessageCircle className="w-4 h-4 text-[var(--accent-soft-text)]" />
                  <span>
                    {confirmedBooking.status === 'confirmed'
                      ? 'Notificación por WhatsApp lista'
                      : confirmedBooking.status === 'awaiting_approval'
                      ? 'Avisar al club por WhatsApp'
                      : 'Comprobante requerido para WhatsApp'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed text-center">
                  {confirmedBooking.status === 'confirmed'
                    ? 'Turno confirmado. Podés enviar el comprobante a tu WhatsApp o compartirlo con tu equipo:'
                    : confirmedBooking.status === 'awaiting_approval'
                    ? 'El club recibió tu comprobante. Podés avisar también por WhatsApp:'
                    : 'Adjuntá la captura de tu transferencia arriba antes de enviar el aviso por WhatsApp.'}
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
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{confirmedBooking.status === 'confirmed' ? 'Abrir en WhatsApp' : 'Avisar por WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={copyWhatsAppText}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedMessage ? <Check className="w-4 h-4 text-[var(--accent-soft-text)]" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedMessage ? 'Copiado' : 'Copiar texto'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ¿Te faltan jugadores? Matchmaking Push */}
              {confirmedBooking.status !== 'cancelled' && (
                <div className="max-w-md mx-auto p-4 bg-[var(--bg-canvas)] border border-amber-500/35 rounded-lg text-left space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">
                          ¿Te faltan jugadores para este turno?
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Publicalo en la grilla y enviá un Push para que otros jugadores se sumen.
                        </p>
                      </div>
                    </div>
                  </div>

                  {confirmedBooking.lookingForPlayers && (() => {
                    const joinedLen = confirmedBooking.joinedPlayers?.length || 0;
                    const rem = Math.max(0, (confirmedBooking.neededPlayers || 0) - joinedLen);
                    return (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-2">
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          {rem > 0
                            ? `Activo en la grilla: Faltan ${rem} ${rem === 1 ? 'jugador' : 'jugadores'}`
                            : 'Equipo completo'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            await stopLookingForPlayers(confirmedBooking.id);
                            setLfpFeedback('Cerraste la búsqueda de jugadores.');
                          }}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          Cerrar búsqueda
                        </button>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        ¿Cuántos faltan?
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={22}
                        value={lfpCount}
                        onChange={(e) => setLfpCount(Math.max(1, Math.min(22, Number(e.target.value) || 1)))}
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                        Nota / nivel (opcional)
                      </label>
                      <input
                        type="text"
                        value={lfpNote}
                        onChange={(e) => setLfpNote(e.target.value)}
                        placeholder="Ej: Falta arquero / nivel intermedio"
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSendingLfp}
                    onClick={async () => {
                      setIsSendingLfp(true);
                      setLfpFeedback(null);
                      try {
                        if (pushSupported && pushPermission !== 'denied' && !isPushEnabled) {
                          await enablePushNotifications({
                            bookingCode: confirmedBooking.bookingCode,
                            clientPhone: confirmedBooking.clientPhone,
                            clientName: confirmedBooking.clientName,
                            silentWelcome: true,
                          }).catch(() => {});
                        }
                        const res = await requestPlayersForBooking(
                          confirmedBooking.id,
                          lfpCount,
                          lfpNote
                        );
                        if (res.booking) setConfirmedBooking(res.booking);
                        setLfpFeedback(
                          res.pushResult.sentCount > 0
                            ? `¡Publicado en la grilla y notificación Push enviada a ${res.pushResult.sentCount} dispositivo(s)!`
                            : '¡Publicado en la grilla de horarios! Cuando alguien se sume recibirás el aviso de retorno.'
                        );
                      } finally {
                        setIsSendingLfp(false);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSendingLfp
                        ? 'Publicando y enviando Push...'
                        : `Publicar "${lfpCount === 1 ? 'Falta 1' : `Faltan ${lfpCount}`}" en grilla y enviar Push`}
                    </span>
                  </button>

                  {lfpFeedback && (
                    <p className="text-[11px] text-[var(--accent-soft-text)] font-medium">{lfpFeedback}</p>
                  )}

                  {(confirmedBooking.joinedPlayers?.length || 0) > 0 && (
                    <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
                      <span className="text-[11px] font-bold text-[var(--text-primary)] block">
                        Jugadores sumados ({confirmedBooking.joinedPlayers!.length}):
                      </span>
                      {confirmedBooking.joinedPlayers!.map((jp) => (
                        <div key={jp.id} className="text-[11px] flex items-center justify-between gap-2 bg-[var(--bg-surface)] px-2.5 py-1.5 rounded border border-[var(--border-hairline)]">
                          <span>
                            <strong>{jp.name}</strong> · <span className="font-mono">{jp.phone}</span>
                          </span>
                          {jp.notes && <span className="text-[var(--text-muted)] truncate max-w-[140px]">{jp.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* División de seña / cancha entre jugadores */}
                  <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[var(--text-primary)]">
                        Dividir costo entre jugadores:
                      </span>
                      <span className="font-mono text-xs font-bold text-[var(--accent-soft-text)]">
                        ${Math.round(confirmedBooking.totalAmount / Math.max(1, splitPlayersCount)).toLocaleString('es-AR')} c/u
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        max={24}
                        value={splitPlayersCount}
                        onChange={(e) => {
                          setSplitSavedNotice(false);
                          setSplitPlayersCount(Math.max(2, Math.min(24, Number(e.target.value) || 2)));
                        }}
                        className="w-20 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--text-primary)]"
                      />
                      <span className="text-[11px] text-[var(--text-secondary)]">jugadores</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateBookingSplitConfig(confirmedBooking.id, splitPlayersCount);
                          setSplitSavedNotice(true);
                        }}
                        className="ml-auto px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[11px] font-semibold text-[var(--text-primary)] cursor-pointer"
                      >
                        {splitSavedNotice ? 'Guardado ✓' : 'Guardar división'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveTab('turnos');
                  }}
                  className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs cursor-pointer transition-colors"
                >
                  Volver a los turnos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeJoinBooking && (
        <JoinMatchModal
          booking={activeJoinBooking}
          onClose={() => setActiveJoinBooking(null)}
        />
      )}
    </div>
  );
};
