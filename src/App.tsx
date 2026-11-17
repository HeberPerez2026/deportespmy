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
import { AvailablePlayersModal } from './components/AvailablePlayersModal';
import { JoinMatchModal } from './components/JoinMatchModal';
import { TournamentsView } from './components/TournamentsView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useBackHandler } from './hooks/useBackHandler';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { buildGoogleMapsDirectionsUrl } from './utils/maps';
import { getIsoDate } from './data/mockData';
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
  Clock,
  Users,
  Send,
  Trash2,
  Trophy,
  WifiOff,
  Navigation,
  RefreshCw,
  ShieldCheck,
  DollarSign,
} from 'lucide-react';
import { downloadBookingReceiptPng } from './utils/receiptDownload';
import { Booking } from './types';

const MainContent: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { 
    activeTab, 
    setActiveTab, 
    isAdminAuthenticated, 
    reviews, 
    bookings,
    tournaments,
    confirmBookingPayment, 
    confirmTournamentTeamPayment,
    businessProfile,
    courts,
    getBusinessProfileForCourt,
    getSlotsForCourtAndDate,
    getHoursUntilBookingStart,
    rescheduleBooking,
    cancelBookingByPlayer,
    toggleJoinedPlayerPayment,
    updateBookingSplitConfig,
    setSelectedEstablishmentKey,
    siteContent,
    pushSupported,
    pushPermission,
    isPushEnabled,
    trackedBookingCodes,
    enablePushNotifications,
    disablePushNotifications,
    userPhone,
    userName,
    availablePlayers,
    requestPlayersForBooking,
    stopLookingForPlayers,
    removeJoinedPlayerFromBooking
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
  const [pushBanner, setPushBanner] = useState<{
    title: string;
    body: string;
    bookingCode?: string;
    joinBookingCode?: string;
  } | null>(null);
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [successPushFeedback, setSuccessPushFeedback] = useState<string | null>(null);

  // Matchmaking modals & Missing Players editor inside Mis Reservas
  const [isAvailablePlayersOpen, setIsAvailablePlayersOpen] = useState(false);
  const [pendingJoinBookingCode, setPendingJoinBookingCode] = useState<string | null>(null);
  const [editingLfpBookingId, setEditingLfpBookingId] = useState<string | null>(null);
  const [lfpCountInput, setLfpCountInput] = useState<number>(1);
  const [lfpNoteInput, setLfpNoteInput] = useState<string>('');
  const [lfpSendingId, setLfpSendingId] = useState<string | null>(null);
  const [lfpFeedbackByBooking, setLfpFeedbackByBooking] = useState<Record<string, string>>({});

  // Self-service cancel, reschedule & split cost inside Mis Reservas
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingActionFeedback, setBookingActionFeedback] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [rescheduleTargetBooking, setRescheduleTargetBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(getIsoDate(0));
  const [rescheduleSlotTime, setRescheduleSlotTime] = useState<string>('');
  const [reschedulingBusy, setReschedulingBusy] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [splitPlayersDraft, setSplitPlayersDraft] = useState<Record<string, number>>({});

  // Intercept browser/mobile Back button: redirect to main page / close modals instead of leaving the app
  useBackHandler(
    !isAdminAuthenticated && activeTab !== 'turnos',
    () => {
      setSelectedEstablishmentKey(null);
      setActiveTab('turnos');
    },
    'player-tab'
  );
  useBackHandler(isAdminLoginOpen, () => setIsAdminLoginOpen(false), 'admin-login');
  useBackHandler(isMyBookingsOpen, () => setIsMyBookingsOpen(false), 'my-bookings');
  useBackHandler(
    Boolean(rescheduleTargetBooking),
    () => {
      setRescheduleTargetBooking(null);
      setRescheduleError(null);
    },
    'reschedule-booking-modal'
  );
  useBackHandler(isAvailablePlayersOpen, () => setIsAvailablePlayersOpen(false), 'available-players');
  useBackHandler(
    Boolean(paymentSuccessModal),
    () => {
      setSuccessPushFeedback(null);
      setPaymentSuccessModal(null);
    },
    'payment-success'
  );
  useBackHandler(Boolean(paymentFailureModal), () => setPaymentFailureModal(null), 'payment-failure');

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
    const joinBooking = params.get('join_booking') || '';

    if (joinBooking) {
      setPendingJoinBookingCode(joinBooking.toUpperCase());
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

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
          const refId = `MP-${data.paymentId || paymentId || Date.now()}`;
          const verifiedAmt = Number(data.amount) || undefined;
          if (bookingCode) {
            if (bookingCode.toUpperCase().startsWith('TRN-')) {
              confirmTournamentTeamPayment(bookingCode, undefined, refId, verifiedAmt);
            } else {
              confirmBookingPayment(bookingCode, refId, verifiedAmt);
            }
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
  }, [confirmBookingPayment, confirmTournamentTeamPayment]);

  // Listen to Service Worker Push messages, notification clicks & local real-time match banners
  useEffect(() => {
    const handleCustomBanner = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      setPushBanner({
        title: detail.title || 'Novedad en tu partido',
        body: detail.body || '',
        bookingCode: detail.bookingCode ? String(detail.bookingCode).toUpperCase() : undefined,
        joinBookingCode: detail.joinBookingCode ? String(detail.joinBookingCode).toUpperCase() : undefined,
      });
    };

    window.addEventListener('deportespmy:push_banner', handleCustomBanner);

    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('deportespmy:push_banner', handleCustomBanner);
      };
    }

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'NOTIFICATION_CLICKED') {
        if (data.joinBookingCode) {
          setPendingJoinBookingCode(String(data.joinBookingCode).toUpperCase());
        } else if (data.bookingCode) {
          const code = String(data.bookingCode).toUpperCase();
          setFocusedBookingCode(code);
          setLookupCodeInput(code);
          setIsMyBookingsOpen(true);
        }
      } else if (data.type === 'PUSH_RECEIVED' && data.payload) {
        const payload = data.payload;
        setPushBanner({
          title: payload.title || 'Actualización de tu reserva',
          body: payload.body || '',
          bookingCode: payload.bookingCode ? String(payload.bookingCode).toUpperCase() : undefined,
          joinBookingCode: payload.joinBookingCode ? String(payload.joinBookingCode).toUpperCase() : undefined,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      window.removeEventListener('deportespmy:push_banner', handleCustomBanner);
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

              {(() => {
                const hasOngoing = tournaments.some((t) => t.status === 'ongoing');
                const hasOpen = tournaments.some((t) => t.status === 'open');
                const hasHighlight = hasOngoing || hasOpen;
                return (
                  <button
                    type="button"
                    onClick={() => setActiveTab('torneos')}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTab === 'torneos'
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] shadow-xs'
                        : hasHighlight
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <Trophy
                      className={`w-3.5 h-3.5 ${
                        hasHighlight && activeTab !== 'torneos'
                          ? 'text-amber-500 animate-bounce motion-reduce:animate-none'
                          : ''
                      }`}
                    />
                    <span>{siteContent.navTorneosLabel || 'Torneos'}</span>
                    {hasHighlight && (
                      <span className="inline-flex items-center gap-1 ml-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-slate-950">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping motion-reduce:animate-none" />
                        <span>{hasOngoing ? 'En curso' : 'Abierto'}</span>
                      </span>
                    )}
                  </button>
                );
              })()}

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

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsAvailablePlayersOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent-soft-text)] border border-[var(--border-hairline)] transition-opacity cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  Jugadores disponibles{availablePlayers.length > 0 ? ` (${availablePlayers.length})` : ''}
                </span>
              </button>

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

              <PWAInstallButton variant="chip" />

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
                  {pushBanner.joinBookingCode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingJoinBookingCode(pushBanner.joinBookingCode || null);
                        setPushBanner(null);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer"
                    >
                      Sumarme al partido
                    </button>
                  ) : pushBanner.bookingCode ? (
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
                  ) : null}
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

      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/35 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Estás sin conexión a internet. Podés consultar turnos e información en caché; al reconectarte se sincronizarán tus reservas.
          </span>
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
                <CourtCatalog
                  onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
                  onOpenAvailablePlayers={() => setIsAvailablePlayersOpen(true)}
                />

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

            {activeTab === 'torneos' && (
              <TournamentsView />
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
                    const cancelWindowHours = bProfile.cancellationWindowHours ?? 24;
                    const hoursRemaining = getHoursUntilBookingStart(b);
                    const withinFreeWindow = hoursRemaining >= cancelWindowHours;
                    const bMapsUrl = buildGoogleMapsDirectionsUrl(bProfile, bProfile.complexName);
                    const actionFeedback = bookingActionFeedback[b.id];
                    const defaultPlayers =
                      b.totalPlayers ||
                      (b.sport === 'padel' || b.sport === 'tenis' ? 4 : b.sport === 'futbol5' ? 10 : 12);
                    const draftPlayers = splitPlayersDraft[b.id] ?? defaultPlayers;
                    const perPlayerCost = Math.round(b.totalAmount / Math.max(1, draftPlayers));

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-xl bg-[var(--bg-canvas)] border space-y-3 ${
                          isFocused ? 'border-[var(--accent)]' : 'border-[var(--border-hairline)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[var(--accent-soft-text)]">
                                #{b.bookingCode}
                              </span>
                              {b.recurringGroupId && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300 text-[10px] font-bold">
                                  Fijo {b.recurringIndex}/{b.recurringTotal}
                                </span>
                              )}
                            </div>
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

                        {/* Política visible de cancelación / reprogramación */}
                        {b.status !== 'cancelled' && (
                          <div className="flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-secondary)]">
                            <ShieldCheck className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${withinFreeWindow ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span>
                              Ventana sin cargo: <strong className="font-mono">{cancelWindowHours} hs antes</strong>.{' '}
                              {withinFreeWindow
                                ? `Faltan ${Math.max(1, Math.floor(hoursRemaining))} hs (podés reprogramar o cancelar).`
                                : hoursRemaining > 0
                                ? `Faltan menos de ${cancelWindowHours} hs (${Math.max(1, Math.floor(hoursRemaining))} hs restantes).`
                                : 'Horario ya iniciado o finalizado.'}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => downloadBookingReceiptPng(b, bProfile.complexName)}
                            className="py-2 px-3 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 border border-[var(--border-hairline)] cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                            <span>PNG</span>
                          </button>

                          <a
                            href={bMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 border border-[var(--border-hairline)]"
                          >
                            <Navigation className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                            <span>¿Cómo llegar?</span>
                          </a>

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
                              <span>Push</span>
                            </button>
                          )}

                          {b.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (editingLfpBookingId === b.id) {
                                  setEditingLfpBookingId(null);
                                } else {
                                  const joinedLen = b.joinedPlayers?.length || 0;
                                  const curRem = b.lookingForPlayers
                                    ? Math.max(1, (b.neededPlayers || 1) - joinedLen)
                                    : 1;
                                  setLfpCountInput(curRem);
                                  setLfpNoteInput(b.lookingForPlayersMessage || '');
                                  setEditingLfpBookingId(b.id);
                                }
                              }}
                              className={`py-2 px-3 rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-1.5 border cursor-pointer ${
                                b.lookingForPlayers
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300'
                                  : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border-[var(--border-hairline)] text-[var(--text-primary)]'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>
                                {b.lookingForPlayers
                                  ? `Faltan ${Math.max(0, (b.neededPlayers || 0) - (b.joinedPlayers?.length || 0))}`
                                  : '¿Faltan jugadores?'}
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Self-service Reprogramar & Cancelar buttons */}
                        {b.status !== 'cancelled' && hoursRemaining > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={!withinFreeWindow}
                              onClick={() => {
                                setRescheduleTargetBooking(b);
                                setRescheduleDate(b.date || getIsoDate(0));
                                setRescheduleSlotTime('');
                                setRescheduleError(null);
                              }}
                              title={
                                withinFreeWindow
                                  ? 'Cambiar fecha u horario de este turno'
                                  : `Solo disponible hasta ${cancelWindowHours} hs antes del turno`
                              }
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] disabled:opacity-45 disabled:cursor-not-allowed border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                              <span>Reprogramar</span>
                            </button>

                            {confirmCancelId === b.id ? (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  type="button"
                                  disabled={cancellingId === b.id}
                                  onClick={async () => {
                                    setCancellingId(b.id);
                                    try {
                                      const res = await cancelBookingByPlayer(b.id);
                                      setBookingActionFeedback((prev) => ({
                                        ...prev,
                                        [b.id]: {
                                          ok: res.success,
                                          text:
                                            res.message ||
                                            (res.mpRefunded
                                              ? `Reserva cancelada y devolución automática en Mercado Pago por $${res.refundAmount.toLocaleString('es-AR')}.`
                                              : res.success
                                              ? 'Reserva cancelada correctamente.'
                                              : 'No se pudo cancelar fuera de término.'),
                                        },
                                      }));
                                      setConfirmCancelId(null);
                                    } finally {
                                      setCancellingId(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                  {cancellingId === b.id ? 'Cancelando...' : 'Confirmar cancelación'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmCancelId(null)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={!withinFreeWindow}
                                onClick={() => setConfirmCancelId(b.id)}
                                title={
                                  withinFreeWindow
                                    ? 'Cancelar reserva y liberar horario'
                                    : `Solo disponible hasta ${cancelWindowHours} hs antes del turno`
                                }
                                className="ml-auto px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-45 disabled:cursor-not-allowed border border-rose-500/30 text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer"
                              >
                                Cancelar reserva
                              </button>
                            )}
                          </div>
                        )}

                        {actionFeedback && (
                          <div
                            className={`p-2.5 rounded-lg text-xs border ${
                              actionFeedback.ok
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {actionFeedback.text}
                          </div>
                        )}

                        {/* División de costo por jugador */}
                        {b.status !== 'cancelled' && (
                          <div className="pt-2.5 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                              <DollarSign className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                              <span>Dividir entre</span>
                              <input
                                type="number"
                                min={2}
                                max={24}
                                value={draftPlayers}
                                onChange={(e) => {
                                  const nextVal = Math.max(2, Math.min(24, Number(e.target.value) || 2));
                                  setSplitPlayersDraft((prev) => ({ ...prev, [b.id]: nextVal }));
                                }}
                                onBlur={() => updateBookingSplitConfig(b.id, draftPlayers)}
                                className="w-14 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded px-2 py-0.5 text-center font-mono font-bold text-[var(--text-primary)]"
                              />
                              <span>jug.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[var(--accent-soft-text)]">
                                ${perPlayerCost.toLocaleString('es-AR')} c/u
                              </span>
                              <button
                                type="button"
                                onClick={() => updateBookingSplitConfig(b.id, draftPlayers)}
                                className="px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] font-semibold cursor-pointer"
                              >
                                Aplicar
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Missing Players Editor & Joined Players List with per-player payment control */}
                        {(editingLfpBookingId === b.id || b.lookingForPlayers || (b.joinedPlayers?.length || 0) > 0) && b.status !== 'cancelled' && (
                          <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2.5 text-xs">
                            {b.lookingForPlayers && (() => {
                              const joinedLen = b.joinedPlayers?.length || 0;
                              const rem = Math.max(0, (b.neededPlayers || 0) - joinedLen);
                              return (
                                <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                                    {rem > 0
                                      ? `Publicado en grilla: Faltan ${rem} ${rem === 1 ? 'jugador' : 'jugadores'}`
                                      : 'Cupo de jugadores completado'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => stopLookingForPlayers(b.id)}
                                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                                  >
                                    Cerrar búsqueda
                                  </button>
                                </div>
                              );
                            })()}

                            {editingLfpBookingId === b.id && (
                              <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                      ¿Cuántos faltan?
                                    </label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={22}
                                      value={lfpCountInput}
                                      onChange={(e) => setLfpCountInput(Math.max(1, Math.min(22, Number(e.target.value) || 1)))}
                                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                                      Nota (opcional)
                                    </label>
                                    <input
                                      type="text"
                                      value={lfpNoteInput}
                                      onChange={(e) => setLfpNoteInput(e.target.value)}
                                      placeholder="Ej: Falta 1 para F5 / nivel intermedio"
                                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    />
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={lfpSendingId === b.id}
                                  onClick={async () => {
                                    setLfpSendingId(b.id);
                                    try {
                                      if (pushSupported && pushPermission !== 'denied' && !isPushEnabled) {
                                        await enablePushNotifications({
                                          bookingCode: b.bookingCode,
                                          clientPhone: b.clientPhone,
                                          clientName: b.clientName,
                                          silentWelcome: true,
                                        }).catch(() => {});
                                      }
                                      const res = await requestPlayersForBooking(b.id, lfpCountInput, lfpNoteInput);
                                      setLfpFeedbackByBooking((prev) => ({
                                        ...prev,
                                        [b.id]:
                                          res.pushResult.sentCount > 0
                                            ? `Publicado en grilla y Push enviado a ${res.pushResult.sentCount} dispositivo(s).`
                                            : 'Publicado en la grilla. Recibirás un Push cuando alguien se sume.',
                                      }));
                                      setEditingLfpBookingId(null);
                                    } finally {
                                      setLfpSendingId(null);
                                    }
                                  }}
                                  className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>
                                    {lfpSendingId === b.id
                                      ? 'Publicando...'
                                      : 'Publicar en grilla y enviar Push'}
                                  </span>
                                </button>
                              </div>
                            )}

                            {lfpFeedbackByBooking[b.id] && (
                              <p className="text-[11px] text-[var(--accent-soft-text)] font-medium">
                                {lfpFeedbackByBooking[b.id]}
                              </p>
                            )}

                            {(b.joinedPlayers?.length || 0) > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-[var(--text-primary)] block">
                                  Control de jugadores sumados y su parte (${perPlayerCost.toLocaleString('es-AR')} c/u):
                                </span>
                                {b.joinedPlayers!.map((jp) => {
                                  const jpPhone = (jp.phone || '').replace(/\D/g, '');
                                  const waUrl = jpPhone
                                    ? `https://wa.me/${jpPhone}?text=${encodeURIComponent(`¡Hola ${jp.name}! Gracias por sumarte al partido #${b.bookingCode} (${b.courtName}, ${b.date} ${b.startTime} hs). La parte por jugador es $${perPlayerCost.toLocaleString('es-AR')}.`)}`
                                    : '';
                                  return (
                                    <div
                                      key={jp.id}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-semibold text-[var(--text-primary)] truncate">
                                          {jp.name}{' '}
                                          <span className="font-mono font-normal text-[var(--text-secondary)]">
                                            ({jp.phone})
                                          </span>
                                        </p>
                                        {jp.notes && (
                                          <p className="text-[11px] text-[var(--text-muted)] truncate">{jp.notes}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => toggleJoinedPlayerPayment(b.id, jp.id, perPlayerCost)}
                                          className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer transition-colors ${
                                            jp.paid
                                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                              : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                          }`}
                                          title="Marcar o desmarcar pago de su parte"
                                        >
                                          {jp.paid ? `Pagó $${(jp.paidAmount || perPlayerCost).toLocaleString('es-AR')} ✓` : 'Pendiente'}
                                        </button>
                                        {waUrl && (
                                          <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] hover:opacity-80"
                                            title="Escribir por WhatsApp"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                          </a>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => removeJoinedPlayerFromBooking(b.id, jp.id)}
                                          className="p-1.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                                          title="Quitar jugador"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reprogramación de Turno */}
      {rescheduleTargetBooking && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-md w-full shadow-2xl overflow-hidden text-[var(--text-primary)]">
            <div className="flex items-center justify-between px-5 py-4 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[var(--accent-soft-text)]" />
                <div>
                  <h3 className="font-heading text-base font-bold">
                    Reprogramar #{rescheduleTargetBooking.bookingCode}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {rescheduleTargetBooking.courtName} · Turno actual: {rescheduleTargetBooking.date} {rescheduleTargetBooking.startTime} hs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRescheduleTargetBooking(null);
                  setRescheduleError(null);
                }}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1.5">
                  Nueva fecha
                </label>
                <input
                  type="date"
                  min={getIsoDate(0)}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleSlotTime('');
                    setRescheduleError(null);
                  }}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1.5">
                  Horarios disponibles en {rescheduleDate}
                </label>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {getSlotsForCourtAndDate(rescheduleTargetBooking.courtId, rescheduleDate).map((slot) => {
                    const isAvail = slot.status === 'available';
                    const isSelected = rescheduleSlotTime === slot.startTime;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!isAvail}
                        onClick={() => setRescheduleSlotTime(slot.startTime)}
                        className={`py-2 px-1 rounded-lg font-mono font-semibold text-xs border transition-colors ${
                          !isAvail
                            ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-transparent opacity-45 line-through cursor-not-allowed'
                            : isSelected
                            ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] cursor-pointer'
                            : 'bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-hairline)] cursor-pointer'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              </div>

              {rescheduleError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-medium">
                  {rescheduleError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleTargetBooking(null);
                    setRescheduleError(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!rescheduleSlotTime || reschedulingBusy}
                  onClick={async () => {
                    if (!rescheduleSlotTime) return;
                    setReschedulingBusy(true);
                    setRescheduleError(null);
                    try {
                      const res = await rescheduleBooking(
                        rescheduleTargetBooking.id,
                        rescheduleDate,
                        rescheduleSlotTime
                      );
                      if (!res.ok) {
                        setRescheduleError(res.message);
                        return;
                      }
                      setBookingActionFeedback((prev) => ({
                        ...prev,
                        [rescheduleTargetBooking.id]: {
                          ok: true,
                          text: res.message,
                        },
                      }));
                      setRescheduleTargetBooking(null);
                    } finally {
                      setReschedulingBusy(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-bold cursor-pointer"
                >
                  {reschedulingBusy ? 'Reprogramando...' : 'Confirmar cambio'}
                </button>
              </div>
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

      {/* Lista de Jugadores Disponibles Hoy */}
      <AvailablePlayersModal
        isOpen={isAvailablePlayersOpen}
        onClose={() => setIsAvailablePlayersOpen(false)}
      />

      {/* Sumarse a un partido desde notificación Push / URL */}
      {(() => {
        const joinTargetBooking = pendingJoinBookingCode
          ? bookings.find((b) => (b.bookingCode || '').toUpperCase() === pendingJoinBookingCode.toUpperCase())
          : undefined;
        if (!joinTargetBooking) return null;
        return (
          <JoinMatchModal
            booking={joinTargetBooking}
            onClose={() => setPendingJoinBookingCode(null)}
          />
        );
      })()}
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
