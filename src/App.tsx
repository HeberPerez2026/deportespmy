import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { apiFetch, safeParseJsonResponse } from './utils/api';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CourtCatalog } from './components/CourtCatalog';
import { EstablishmentsView } from './components/EstablishmentsView';
import { ReviewsSection } from './components/ReviewsSection';
import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import {
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Loader2,
  Lock,
  Calendar,
  Building2,
  Star,
  Bell,
  BellRing,
  Download,
  Ticket,
  Search,
  X,
  Clock
} from 'lucide-react';
import { downloadBookingReceiptPng } from './utils/receiptDownload';
import { Booking } from './types';

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isAdminAuthenticated, 
    reviews, 
    bookings,
    confirmBookingPayment, 
    businessProfile,
    courts,
    getBusinessProfileForCourt,
    setSelectedEstablishmentKey,
    siteContent,
    pushSupported,
    pushPermission,
    isPushEnabled,
    trackedBookingCodes,
    enablePushNotifications,
    disablePushNotifications,
    userPhone,
    userName
  } = useApp();
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Mercado Pago Return state
  const [paymentSuccessModal, setPaymentSuccessModal] = useState<{
    bookingCode: string;
    courtName: string;
    date: string;
    time: string;
    paymentId: string;
  } | null>(null);

  const [paymentFailureModal, setPaymentFailureModal] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState<boolean>(false);

  // Player Reservations Tracker & Web Push UI States
  const [isMyBookingsOpen, setIsMyBookingsOpen] = useState(false);
  const [focusedBookingCode, setFocusedBookingCode] = useState<string | null>(null);
  const [lookupCodeInput, setLookupCodeInput] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pushBanner, setPushBanner] = useState<{ title: string; body: string; bookingCode?: string } | null>(null);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [successPushFeedback, setSuccessPushFeedback] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const status = params.get('status');
    const collectionStatus = params.get('collection_status');
    const externalReference = params.get('external_reference');
    const bookingCode = params.get('booking_code') || externalReference || '';
    const paymentId = params.get('payment_id') || params.get('collection_id') || '';
    const adminId = params.get('admin_id') || '';
    const courtName = params.get('court_name') || 'Cancha Reservada';
    const bookingDate = params.get('booking_date') || '';
    const bookingTime = params.get('booking_time') || '';

    const isMercadoPagoReturn = Boolean(
      payment ||
      paymentId ||
      collectionStatus ||
      externalReference ||
      status === 'approved' ||
      status === 'rejected' ||
      status === 'failure' ||
      status === 'pending' ||
      status === 'in_process'
    );

    if (!isMercadoPagoReturn && bookingCode) {
      setFocusedBookingCode(bookingCode.toUpperCase());
      setLookupCodeInput(bookingCode.toUpperCase());
      setIsMyBookingsOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const hasReturnParams = Boolean(payment || status || collectionStatus || bookingCode);
    if (!hasReturnParams) return;

    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({
          type: 'MP_PAYMENT_RETURN',
          payment,
          status,
          collectionStatus,
          bookingCode,
          paymentId,
          adminId,
          courtName,
          bookingDate,
          bookingTime
        }, '*');
        setTimeout(() => {
          window.close();
        }, 400);
      } catch {}
    }

    const isRejected = payment === 'failure' || status === 'failure' || status === 'rejected' || collectionStatus === 'rejected';
    if (isRejected) {
      setPaymentFailureModal(bookingCode || 'Tu reserva');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    let cancelled = false;
    setVerifyingPayment(true);

    (async () => {
      try {
        const query = new URLSearchParams();
        if (paymentId) query.set('payment_id', paymentId);
        if (bookingCode) query.set('booking_code', bookingCode);
        if (adminId) query.set('admin_id', adminId);
        if (collectionStatus) query.set('collection_status', collectionStatus);
        if (status) query.set('status', status);

        const resp = await apiFetch(`/api/mercadopago/verify-payment?${query.toString()}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store'
        });
        const data = await safeParseJsonResponse(resp);

        if (cancelled) return;

        if (data?.verified) {
          if (bookingCode) {
            confirmBookingPayment(bookingCode, `MP-${data.paymentId || paymentId || Date.now()}`, Number(data.amount) || undefined);
          }
          setPaymentSuccessModal({
            bookingCode: bookingCode || data.bookingCode || 'PMY-CONFIRMADO',
            courtName,
            date: bookingDate,
            time: bookingTime,
            paymentId: String(data.paymentId || paymentId || 'MP-APROBADO')
          });
        } else {
          setPaymentFailureModal(bookingCode || 'Tu reserva');
        }
      } catch {
        if (!cancelled) {
          setPaymentFailureModal(bookingCode || 'Tu reserva');
        }
      } finally {
        if (!cancelled) {
          setVerifyingPayment(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [confirmBookingPayment]);

  // Listen to Service Worker Push messages & notification clicks
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'NOTIFICATION_CLICKED' && data.bookingCode) {
        const code = String(data.bookingCode).toUpperCase();
        setFocusedBookingCode(code);
        setLookupCodeInput(code);
        setIsMyBookingsOpen(true);
      } else if (data.type === 'PUSH_RECEIVED' && data.payload) {
        const payload = data.payload;
        setPushBanner({
          title: payload.title || 'Actualización de tu reserva',
          body: payload.body || '',
          bookingCode: payload.bookingCode ? String(payload.bookingCode).toUpperCase() : undefined,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  const handleTogglePlayerPush = async () => {
    if (isTogglingPush) return;
    setIsTogglingPush(true);
    try {
      if (isPushEnabled) {
        await disablePushNotifications();
        setPushBanner({
          title: 'Avisos Push desactivados',
          body: 'Ya no recibirás notificaciones de reserva en este navegador.',
        });
      } else {
        const res = await enablePushNotifications({
          bookingCode: focusedBookingCode || trackedBookingCodes[0] || undefined,
          clientPhone: userPhone || undefined,
          clientName: userName || undefined,
        });
        setPushBanner({
          title: res.ok ? 'Notificaciones Push activas' : 'No se pudieron activar las notificaciones',
          body: res.message,
        });
      }
    } finally {
      setIsTogglingPush(false);
    }
  };

  const trackedBookingsList: Booking[] = (() => {
    const codeSet = new Set(trackedBookingCodes.map((c) => c.toUpperCase()));
    if (focusedBookingCode) codeSet.add(focusedBookingCode.toUpperCase());
    return bookings
      .filter((b) => codeSet.has((b.bookingCode || '').toUpperCase()))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  })();

  const handleLookupBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupCodeInput.trim().toUpperCase().replace(/^#/, '');
    if (!clean) {
      setLookupError('Ingresá el código de tu reserva (ej: PMY-1234).');
      return;
    }
    const found = bookings.find((b) => (b.bookingCode || '').toUpperCase() === clean);
    if (!found) {
      setLookupError(`No encontramos ninguna reserva con el código #${clean}.`);
      return;
    }
    setLookupError(null);
    setFocusedBookingCode(found.bookingCode.toUpperCase());
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '5.0';
  const headingText = reviews.length > 0 
    ? `${avgRating} de 5 en ${reviews.length} ${reviews.length === 1 ? 'partido calificado' : 'partidos jugados'}`
    : siteContent.homeReviewsEmptyHeading;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Header onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />

      {/* Barra secundaria limpia de navegación para jugadores */}
      {!isAdminAuthenticated && (
        <div className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-1.5 overflow-x-auto" aria-label="Navegación principal">
              <button
                type="button"
                onClick={() => {
                  setSelectedEstablishmentKey(null);
                  setActiveTab('turnos');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'turnos'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{siteContent.navTurnosLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('establecimientos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'establecimientos'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{siteContent.navComplejosLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('valoraciones')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'valoraciones'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>{siteContent.navOpinionesLabel}</span>
              </button>
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setLookupError(null);
                  setIsMyBookingsOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-hairline)] transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                <span>
                  Mis reservas{trackedBookingCodes.length > 0 ? ` (${trackedBookingCodes.length})` : ''}
                </span>
              </button>

              {pushSupported && (
                <button
                  type="button"
                  disabled={isTogglingPush}
                  onClick={handleTogglePlayerPush}
                  title={
                    pushPermission === 'denied'
                      ? 'Notificaciones bloqueadas en la configuración del navegador'
                      : isPushEnabled
                      ? 'Avisos Push activos en este dispositivo (clic para desactivar)'
                      : 'Activar avisos Push en este dispositivo'
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    isPushEnabled
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-soft-text)]'
                      : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isPushEnabled ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  <span>{isTogglingPush ? 'Sincronizando...' : isPushEnabled ? 'Push activo' : 'Activar Push'}</span>
                </button>
              )}
            </div>
          </div>

          {pushBanner && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2.5">
              <div className="px-3.5 py-2.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <BellRing className="w-4 h-4 text-[var(--accent-soft-text)] shrink-0" />
                  <div className="min-w-0">
                    <strong className="text-[var(--text-primary)]">{pushBanner.title}</strong>
                    {pushBanner.body && (
                      <span className="text-[var(--text-secondary)] ml-1.5">{pushBanner.body}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pushBanner.bookingCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedBookingCode(pushBanner.bookingCode || null);
                        setLookupCodeInput(pushBanner.bookingCode || '');
                        setIsMyBookingsOpen(true);
                        setPushBanner(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] font-semibold cursor-pointer"
                    >
                      Ver comprobante
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPushBanner(null)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    aria-label="Cerrar aviso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="flex-1">
        {isAdminAuthenticated ? (
          <AdminDashboard />
        ) : (
          <>
            {activeTab === 'turnos' && (
              <>
                <HeroBanner />
                <CourtCatalog onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />

                {/* Community Reviews Band */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                  <div className="bg-[var(--bg-surface)] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-[var(--border-hairline)] shadow-xs">
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-[var(--accent-soft-text)] block">
                        {siteContent.homeReviewsEyebrow}
                      </span>
                      <h3 className="font-heading text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                        {headingText}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl">
                        {siteContent.homeReviewsSubtitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('valoraciones')}
                      className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer shadow-xs"
                    >
                      {siteContent.homeReviewsButtonLabel}
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'establecimientos' && (
              <EstablishmentsView onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />
            )}

            {activeTab === 'valoraciones' && (
              <ReviewsSection />
            )}

            {activeTab === 'admin' && (
              <div className="max-w-md mx-auto my-16 p-8 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)] text-center space-y-4 shadow-xs">
                <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
                  Acceso para complejos
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Este apartado contiene la gestión exclusiva de canchas, tarifas, caja y agenda.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAdminLoginOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
                >
                  Ingresar con usuario y clave
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => setActiveTab('admin')}
      />

      {/* Verificando Pago Mercado Pago Overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-5 text-[var(--text-primary)]">
            <div className="w-14 h-14 rounded-full bg-[var(--mp-soft)] text-[var(--mp-text)] flex items-center justify-center mx-auto">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[var(--mp-text)] block">
                Confirmación automática
              </span>
              <h3 className="font-heading text-2xl font-bold">
                Verificando tu pago con Mercado Pago
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Estamos validando la operación para confirmar tu turno automáticamente.
              </p>
            </div>
            <div className="space-y-2.5 p-4 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-hairline)]">
              <div className="h-2.5 bg-[var(--bg-subtle)] rounded animate-pulse w-3/4 mx-auto" />
              <div className="h-2.5 bg-[var(--bg-subtle)] rounded animate-pulse w-1/2 mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Mercado Pago Payment Success Modal */}
      {paymentSuccessModal && (() => {
        const matchedBooking = bookings.find(
          (b) => (b.bookingCode || '').toUpperCase() === paymentSuccessModal.bookingCode.toUpperCase()
        );
        const matchedCourt = courts.find(
          (c) =>
            (matchedBooking && c.id === matchedBooking.courtId) ||
            c.name.toLowerCase() === paymentSuccessModal.courtName.toLowerCase()
        );
        const modalProfile = getBusinessProfileForCourt(matchedCourt);
        const targetPhone = (modalProfile.whatsappNumber || businessProfile.whatsappNumber || '').replace(/\D/g, '');
        const shareText = `¡Hola! Acabo de abonar mi turno #${paymentSuccessModal.bookingCode} en ${paymentSuccessModal.courtName} para el ${paymentSuccessModal.date || matchedBooking?.date || 'día programado'} por Mercado Pago. Ref: ${paymentSuccessModal.paymentId}`;
        const waUrl = targetPhone
          ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(shareText)}`
          : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

        const printableBooking: Booking = matchedBooking || {
          id: paymentSuccessModal.bookingCode,
          bookingCode: paymentSuccessModal.bookingCode,
          courtId: matchedCourt?.id || '',
          courtName: paymentSuccessModal.courtName,
          establishment: modalProfile.complexName,
          sport: matchedCourt?.sport || 'padel',
          date: paymentSuccessModal.date || '',
          startTime: paymentSuccessModal.time || '',
          endTime: '',
          durationMinutes: 60,
          clientName: userName || 'Jugador',
          clientPhone: userPhone || '',
          clientEmail: '',
          totalAmount: matchedCourt?.hourlyRateDay || 0,
          amountPaid: matchedCourt?.hourlyRateDay || 0,
          balanceDue: 0,
          isDepositOnly: false,
          paymentMethod: 'mercadopago',
          paymentStatus: 'total_pagado',
          paymentReference: paymentSuccessModal.paymentId,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          whatsappSent: false,
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-5 text-[var(--text-primary)] my-8">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">
                  Pago acreditado con éxito
                </span>
                <h3 className="font-heading text-2xl font-bold">
                  Turno confirmado <span className="font-mono">#{paymentSuccessModal.bookingCode}</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Tu pago a través de Mercado Pago fue verificado y el turno ya quedó reservado.
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-hairline)] text-left space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex justify-between">
                  <span>Complejo:</span>
                  <strong className="text-[var(--text-primary)]">{modalProfile.complexName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cancha:</span>
                  <strong className="text-[var(--text-primary)]">{paymentSuccessModal.courtName}</strong>
                </div>
                {(paymentSuccessModal.date || matchedBooking?.date) && (
                  <div className="flex justify-between">
                    <span>Fecha y hora:</span>
                    <strong className="font-mono text-[var(--text-primary)] tabular-nums">
                      {paymentSuccessModal.date || matchedBooking?.date}{' '}
                      {(paymentSuccessModal.time || matchedBooking?.startTime)
                        ? `(${paymentSuccessModal.time || matchedBooking?.startTime} hs)`
                        : ''}
                    </strong>
                  </div>
                )}
                {matchedBooking && (
                  <>
                    <div className="flex justify-between">
                      <span>Importe abonado:</span>
                      <strong className="font-mono text-[var(--accent-soft-text)] tabular-nums">
                        ${matchedBooking.amountPaid.toLocaleString('es-AR')}
                      </strong>
                    </div>
                    {matchedBooking.balanceDue > 0 && (
                      <div className="flex justify-between text-[var(--night-cue)] font-medium">
                        <span>Saldo en cancha:</span>
                        <strong className="font-mono tabular-nums">
                          ${matchedBooking.balanceDue.toLocaleString('es-AR')}
                        </strong>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-2 border-t border-[var(--border-hairline)]">
                  <span>Comprobante MP:</span>
                  <span className="font-mono text-[var(--accent-soft-text)] font-bold">
                    {paymentSuccessModal.paymentId}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => downloadBookingReceiptPng(printableBooking, modalProfile.complexName)}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-2 border border-[var(--border-hairline)] transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[var(--accent-soft-text)]" />
                  <span>Descargar comprobante (.png)</span>
                </button>

                {pushSupported && pushPermission !== 'denied' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await enablePushNotifications({
                        bookingCode: paymentSuccessModal.bookingCode,
                        clientPhone: matchedBooking?.clientPhone || userPhone || undefined,
                        clientName: matchedBooking?.clientName || userName || undefined,
                      });
                      setSuccessPushFeedback(res.message);
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 border transition-colors cursor-pointer ${
                      isPushEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-primary)]'
                    }`}
                  >
                    {isPushEnabled ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4 text-[var(--accent-soft-text)]" />}
                    <span>{isPushEnabled ? 'Avisos Push vinculados a este turno' : 'Activar avisos Push para este turno'}</span>
                  </button>
                )}

                {successPushFeedback && (
                  <p className="text-[11px] text-[var(--accent-soft-text)]">{successPushFeedback}</p>
                )}

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{targetPhone ? 'Avisar al club por WhatsApp' : 'Compartir comprobante por WhatsApp'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessPushFeedback(null);
                    setPaymentSuccessModal(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cerrar y volver a las canchas
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mis Reservas & Comprobantes Tracker Modal */}
      {isMyBookingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-lg w-full shadow-2xl overflow-hidden text-[var(--text-primary)] my-8">
            <div className="flex items-center justify-between px-5 py-4 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[var(--accent-soft-text)]" />
                <div>
                  <h3 className="font-heading text-lg font-bold">Mis Reservas y Comprobantes</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Seguimiento en vivo del estado de tu turno y descarga de comprobante
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMyBookingsOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleLookupBooking} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={lookupCodeInput}
                    onChange={(e) => setLookupCodeInput(e.target.value)}
                    placeholder="Buscar por código (ej: PMY-1234)"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-semibold cursor-pointer"
                >
                  Buscar
                </button>
              </form>

              {lookupError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{lookupError}</p>
              )}

              {trackedBookingsList.length === 0 ? (
                <div className="p-6 text-center bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg space-y-2">
                  <Clock className="w-7 h-7 text-[var(--text-muted)] mx-auto" />
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Todavía no tenés reservas guardadas en este dispositivo
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Cuando reserves un turno o busques tu código arriba, podrás seguir su aprobación en vivo y activar notificaciones Push.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trackedBookingsList.map((b) => {
                    const matchedCourt = courts.find((c) => c.id === b.courtId);
                    const bProfile = getBusinessProfileForCourt(matchedCourt);
                    const isFocused = focusedBookingCode === (b.bookingCode || '').toUpperCase();

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-xl bg-[var(--bg-canvas)] border space-y-3 ${
                          isFocused ? 'border-[var(--accent)]' : 'border-[var(--border-hairline)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-[var(--accent-soft-text)]">
                              #{b.bookingCode}
                            </span>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">
                              {b.courtName}
                            </h4>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              {bProfile.complexName} · {b.date} · {b.startTime} a {b.endTime} hs
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : b.status === 'cancelled'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {b.status === 'confirmed'
                              ? 'Confirmado'
                              : b.status === 'cancelled'
                              ? 'Cancelado'
                              : b.status === 'awaiting_approval'
                              ? 'En revisión'
                              : 'Pendiente'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border-hairline)]">
                          <div>
                            <span>Abonado ({b.paymentMethod.toUpperCase()}):</span>{' '}
                            <strong className="font-mono text-[var(--text-primary)]">
                              ${b.amountPaid.toLocaleString('es-AR')}
                            </strong>
                          </div>
                          <div className="text-right">
                            <span>Saldo en cancha:</span>{' '}
                            <strong className="font-mono text-[var(--text-primary)]">
                              {b.balanceDue > 0 ? `$${b.balanceDue.toLocaleString('es-AR')}` : 'Saldado'}
                            </strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => downloadBookingReceiptPng(b, bProfile.complexName)}
                            className="flex-1 py-2 px-3 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 border border-[var(--border-hairline)] cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                            <span>Comprobante PNG</span>
                          </button>

                          {pushSupported && pushPermission !== 'denied' && b.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await enablePushNotifications({
                                  bookingCode: b.bookingCode,
                                  clientPhone: b.clientPhone,
                                  clientName: b.clientName,
                                });
                                setPushBanner({
                                  title: res.ok ? `Seguimiento activo para #${b.bookingCode}` : 'Aviso Push',
                                  body: res.message,
                                  bookingCode: b.bookingCode,
                                });
                              }}
                              className="py-2 px-3 rounded-lg bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent-soft-text)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 border border-[var(--border-hairline)] cursor-pointer"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              <span>Avisos Push</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mercado Pago Payment Failure Modal */}
      {paymentFailureModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-4 text-[var(--text-primary)]">
            <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading text-2xl font-bold">
                El pago no fue completado
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                La operación en Mercado Pago no se completó o fue rechazada. El horario sigue disponible para reintentarlo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPaymentFailureModal(null)}
              className="w-full py-2.5 px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ThemeProvider>
  );
}
