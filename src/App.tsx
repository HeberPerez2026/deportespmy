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
import { CheckCircle, AlertCircle, MessageCircle, Loader2, Lock, Calendar, Building2, Star } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isAdminAuthenticated, 
    reviews, 
    confirmBookingPayment, 
    businessProfile,
    courts,
    getBusinessProfileForCourt,
    setSelectedEstablishmentKey,
    siteContent
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const status = params.get('status');
    const collectionStatus = params.get('collection_status');
    const bookingCode = params.get('booking_code') || params.get('external_reference') || '';
    const paymentId = params.get('payment_id') || params.get('collection_id') || '';
    const adminId = params.get('admin_id') || '';
    const courtName = params.get('court_name') || 'Cancha Reservada';
    const bookingDate = params.get('booking_date') || '';
    const bookingTime = params.get('booking_time') || '';

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
          </div>
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
      {paymentSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-xl text-center space-y-5 text-[var(--text-primary)]">
            <div className="w-14 h-14 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-[var(--accent-soft-text)] block">
                Pago acreditado con éxito
              </span>
              <h3 className="font-heading text-2xl font-bold">
                Turno confirmado <span className="font-mono">#{paymentSuccessModal.bookingCode}</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Tu pago a través de Mercado Pago fue procesado correctamente.
              </p>
            </div>

            <div className="p-4 bg-[var(--bg-canvas)] rounded-lg border border-[var(--border-hairline)] text-left space-y-2 text-xs text-[var(--text-secondary)]">
              <div className="flex justify-between">
                <span>Cancha:</span>
                <strong className="text-[var(--text-primary)]">{paymentSuccessModal.courtName}</strong>
              </div>
              {paymentSuccessModal.date && (
                <div className="flex justify-between">
                  <span>Fecha y hora:</span>
                  <strong className="font-mono text-[var(--text-primary)] tabular-nums">
                    {paymentSuccessModal.date} {paymentSuccessModal.time ? `(${paymentSuccessModal.time} hs)` : ''}
                  </strong>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[var(--border-hairline)]">
                <span>Comprobante MP:</span>
                <span className="font-mono text-[var(--accent-soft-text)] font-bold">
                  {paymentSuccessModal.paymentId}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {(() => {
                const matchedCourt = courts.find(c => c.name.toLowerCase() === paymentSuccessModal.courtName.toLowerCase());
                const modalProfile = getBusinessProfileForCourt(matchedCourt);
                const targetPhone = (modalProfile.whatsappNumber || businessProfile.whatsappNumber || '').replace(/\D/g, '');
                const shareText = `¡Hola! Acabo de abonar mi turno #${paymentSuccessModal.bookingCode} en ${paymentSuccessModal.courtName} para el ${paymentSuccessModal.date || 'día programado'} por Mercado Pago. Ref: ${paymentSuccessModal.paymentId}`;
                const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(shareText)}` : `https://wa.me/?text=${encodeURIComponent(shareText)}`;

                return (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{targetPhone ? 'Avisar al club por WhatsApp' : 'Compartir comprobante por WhatsApp'}</span>
                  </a>
                );
              })()}

              <button
                type="button"
                onClick={() => setPaymentSuccessModal(null)}
                className="w-full py-2.5 px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
              >
                Cerrar y volver a las canchas
              </button>
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
