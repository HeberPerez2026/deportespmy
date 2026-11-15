import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CourtCatalog } from './components/CourtCatalog';
import { ReviewsSection } from './components/ReviewsSection';
import { AdminDashboard } from './components/AdminPanel/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';
import { CheckCircle, AlertCircle, MessageCircle, Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isAdminAuthenticated, 
    reviews, 
    confirmBookingPayment, 
    businessProfile,
    courts,
    getBusinessProfileForCourt
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
    // Check if user is returning from Mercado Pago Checkout Pro
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

    // If opened inside Checkout Pro popup window, notify the parent BookingModal and close automatically
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

    // Same-tab / mobile redirect: verify payment cleanly against backend Mercado Pago API
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

        const resp = await fetch(`/api/mercadopago/verify-payment?${query.toString()}`);
        const data = await resp.json();

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
    ? `★ ${avgRating} estrellas en ${reviews.length} ${reviews.length === 1 ? 'partido calificado' : 'partidos jugados'}`
    : '¡Sé el primero en calificar tu partido y dejar tu opinión!';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Header with Player Navigation & Top-Right Admin Login */}
      <Header
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1">
        
        {/* EXCLUSIVE ADMIN VIEW: WHEN LOGGED IN AS ADMIN, STRICTLY LOCK TO ADMIN PANEL */}
        {isAdminAuthenticated ? (
          <AdminDashboard />
        ) : (
          <>
            {/* PLAYER VIEW 1: RESERVAS & HERO */}
            {activeTab === 'turnos' && (
              <>
                <HeroBanner />
                <CourtCatalog onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />
                
                {/* Quick Community Reviews preview teaser */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-emerald-900/40">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Comunidad Deportiva de Puerto Madryn
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black font-heading">
                        {headingText}
                      </h3>
                      <p className="text-xs text-slate-300 max-w-lg">
                        Conocé las opiniones de jugadores reales sobre el estado del césped, la iluminación y la atención del buffet.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('valoraciones')}
                      className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm whitespace-nowrap shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                    >
                      Ver Todas las Opiniones
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* PLAYER VIEW 2: NUESTRAS CANCHAS & TARIFAS */}
            {activeTab === 'canchas' && (
              <div className="py-6">
                <CourtCatalog onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />
              </div>
            )}

            {/* PLAYER VIEW 4: OPINIONES Y VALORACIONES */}
            {activeTab === 'valoraciones' && (
              <ReviewsSection />
            )}

            {/* UN-AUTHENTICATED ADMIN LOGIN PROMPT */}
            {activeTab === 'admin' && (
              <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Requiere Acceso de Administrador</h3>
                <p className="text-xs text-slate-600">
                  Este apartado contiene la gestión exclusiva de canchas, tarifas, caja y agenda.
                </p>
                <button
                  onClick={() => setIsAdminLoginOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Ingresar Contraseña de Admin
                </button>
              </div>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <Footer onOpenAdminLogin={() => setIsAdminLoginOpen(true)} />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={() => setActiveTab('admin')}
      />

      {/* Verificando Pago Mercado Pago Overlay */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 text-white">
            <div className="w-16 h-16 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block">
                Confirmación Automática
              </span>
              <h3 className="text-xl font-black font-heading text-white">
                Verificando tu pago con Mercado Pago...
              </h3>
              <p className="text-xs text-slate-300">
                Estamos validando la transacción en tiempo real para confirmar tu turno automáticamente.
              </p>
            </div>
            <div className="space-y-2.5 p-4 bg-slate-950 rounded-2xl border border-slate-800">
              <div className="h-3 bg-slate-800 rounded-full animate-pulse w-3/4 mx-auto" />
              <div className="h-3 bg-slate-800 rounded-full animate-pulse w-1/2 mx-auto" />
              <div className="h-3 bg-slate-800 rounded-full animate-pulse w-2/3 mx-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Mercado Pago Payment Success Modal */}
      {paymentSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5 animate-in fade-in zoom-in duration-200 text-white">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block">
                ¡Pago Acreditado con Éxito!
              </span>
              <h3 className="text-2xl font-black font-heading text-white">
                Turno Confirmado #{paymentSuccessModal.bookingCode}
              </h3>
              <p className="text-xs text-slate-300">
                Tu pago a través de Mercado Pago fue procesado correctamente.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Cancha:</span>
                <strong className="text-white">{paymentSuccessModal.courtName}</strong>
              </div>
              {paymentSuccessModal.date && (
                <div className="flex justify-between">
                  <span>Fecha y Hora:</span>
                  <strong className="text-white">{paymentSuccessModal.date} {paymentSuccessModal.time ? `(${paymentSuccessModal.time} hs)` : ''}</strong>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span>Comprobante MP:</span>
                <span className="font-mono text-emerald-400 font-bold">{paymentSuccessModal.paymentId}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
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
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-slate-950" />
                    <span>{targetPhone ? 'Avisar al Club por WhatsApp' : 'Compartir Comprobante por WhatsApp'}</span>
                  </a>
                );
              })()}

              <button
                type="button"
                onClick={() => setPaymentSuccessModal(null)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cerrar y Ver Canchas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mercado Pago Payment Failure Modal */}
      {paymentFailureModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 text-white">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-heading text-white">
                El pago no fue completado
              </h3>
              <p className="text-xs text-slate-300">
                La operación en Mercado Pago no se completó o fue rechazada. El turno se encuentra disponible para volver a intentarlo cuando desees.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPaymentFailureModal(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
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
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
