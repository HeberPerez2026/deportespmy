import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Star, 
  Phone, 
  ChevronRight,
  ShieldCheck,
  CreditCard,
  User,
  Sparkles
} from 'lucide-react';

interface UserPortalProps {
  onOpenReviewModalForBooking?: (booking: Booking) => void;
}

export const UserPortal: React.FC<UserPortalProps> = ({ onOpenReviewModalForBooking }) => {
  const { 
    bookings, 
    cancelBooking, 
    triggerWhatsAppSend, 
    userPhone, 
    setUserPhone, 
    userName, 
    setUserName,
    setActiveTab,
    addReview,
    courts
  } = useApp();

  const [filterPhone, setFilterPhone] = useState(userPhone);
  const [selectedPassBooking, setSelectedPassBooking] = useState<Booking | null>(null);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [surfaceScore, setSurfaceScore] = useState(5);
  const [lightingScore, setLightingScore] = useState(5);
  const [facilitiesScore, setFacilitiesScore] = useState(5);
  const [serviceScore, setServiceScore] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Normalize phone for comparison
  const cleanFilter = filterPhone.replace(/\D/g, '');
  const userBookings = bookings.filter(b => {
    const cleanBPhone = b.clientPhone.replace(/\D/g, '');
    return cleanBPhone.includes(cleanFilter) || cleanFilter.includes(cleanBPhone);
  });

  const activeBookings = userBookings.filter(b => b.status === 'confirmed');
  const pastOrCancelledBookings = userBookings.filter(b => b.status !== 'confirmed');

  const handleConfirmCancel = (id: string) => {
    cancelBooking(id);
    setCancellingBookingId(null);
  };

  const handleSaveReview = () => {
    if (!reviewBooking) return;
    addReview({
      courtId: reviewBooking.courtId,
      courtName: reviewBooking.courtName,
      sport: reviewBooking.sport,
      userName: reviewBooking.clientName,
      userPhone: reviewBooking.clientPhone.slice(0, 8) + '***',
      rating: ratingVal,
      scores: {
        surface: surfaceScore,
        lighting: lightingScore,
        facilities: facilitiesScore,
        service: serviceScore,
      },
      comment: reviewComment,
      verifiedBookingCode: reviewBooking.bookingCode,
    });
    setReviewSubmitted(true);
    setTimeout(() => {
      setReviewSubmitted(false);
      setReviewBooking(null);
      setReviewComment('');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Profile Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
            <User className="w-4 h-4" />
            Portal del Jugador • DeportesPMY
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
            Mis Turnos & Pases de Cancha
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Revisá tus reservas activas, mostrá tu QR de acceso en recepción o abrí el mensaje de WhatsApp.
          </p>
        </div>

        {/* Phone number filter switcher */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <label className="text-xs text-slate-400 block font-semibold flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            Teléfono de Consulta (WhatsApp)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={filterPhone}
              onChange={(e) => {
                setFilterPhone(e.target.value);
                setUserPhone(e.target.value);
              }}
              placeholder="+5492804567890"
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* ACTIVE BOOKINGS SECTION */}
      <div className="space-y-6 mb-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 font-heading flex items-center gap-2">
            <span>Próximos Partidos Confirmados</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {activeBookings.length}
            </span>
          </h2>
          <button
            onClick={() => setActiveTab('turnos')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
          >
            <span>+ Reservar otro turno</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {activeBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-slate-800">No tenés turnos activos para este número de teléfono</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Podés buscar otro celular arriba o reservar una cancha en minutos con confirmación por WhatsApp.
            </p>
            <button
              onClick={() => setActiveTab('turnos')}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 cursor-pointer shadow-md inline-flex items-center gap-1.5"
            >
              <span>Ver Canchas Disponibles</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeBookings.map((booking) => {
              const isSeña = booking.paymentStatus === 'seña_pagada';

              return (
                <div 
                  key={booking.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4">
                    
                    {/* Top Row: Code and Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          #{booking.bookingCode}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {booking.sport.toUpperCase()}
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirmada
                      </span>
                    </div>

                    {/* Court and Time */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 font-heading">
                        {booking.courtName}
                      </h3>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2 font-medium">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Fecha: <strong>{booking.date}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 font-medium">
                          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Horario: <strong>{booking.startTime} a {booking.endTime} hs</strong> ({booking.durationMinutes} min)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Blvd. Brown 1420, Puerto Madryn</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Status Box */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monto total de cancha:</span>
                        <span className="font-bold text-slate-800">${booking.totalAmount.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Abonado Online ({booking.paymentMethod}):</span>
                        <span className="font-extrabold">${booking.amountPaid.toLocaleString('es-AR')}</span>
                      </div>
                      {isSeña && (
                        <div className="flex justify-between text-amber-700 font-semibold pt-1 border-t border-slate-200">
                          <span>Saldo pendiente en cancha:</span>
                          <span>${booking.balanceDue.toLocaleString('es-AR')}</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Action buttons */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center mt-4">
                    
                    <button
                      onClick={() => setSelectedPassBooking(booking)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <QrCode className="w-4 h-4 text-emerald-400" />
                      <span>Ver Pase QR</span>
                    </button>

                    <button
                      onClick={() => triggerWhatsAppSend(booking)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setCancellingBookingId(booking.id)}
                      className="px-3 py-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PAST & HISTORY SECTION */}
      {pastOrCancelledBookings.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 font-heading">
            Historial de Turnos & Opiniones
          </h2>

          <div className="bg-white rounded-3xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-sm">
            {pastOrCancelledBookings.map((b) => (
              <div key={b.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">#{b.bookingCode}</span>
                    <span className="text-sm font-bold text-slate-900">{b.courtName}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${b.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                      {b.status === 'cancelled' ? 'Cancelado / Reembolsado' : 'Finalizado'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {b.date} • {b.startTime} a {b.endTime} hs • Total: ${b.totalAmount.toLocaleString('es-AR')}
                  </div>
                </div>

                {b.status !== 'cancelled' && (
                  <button
                    onClick={() => setReviewBooking(b)}
                    className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>Calificar Cancha</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR PASS MODAL */}
      {selectedPassBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-sm w-full p-6 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Pase de Acceso DeportesPMY
              </span>
              <button onClick={() => setSelectedPassBooking(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg font-heading">{selectedPassBooking.courtName}</h3>
              <p className="text-xs text-slate-400">
                Presentá este código en la recepción del complejo al llegar.
              </p>
            </div>

            {/* QR Mockup */}
            <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 flex flex-col items-center justify-center shadow-inner">
              <div className="grid grid-cols-4 gap-1.5 w-36 h-36 p-1 border-2 border-slate-950">
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-200"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-200"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-200"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-200"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-200"></div>
                <div className="bg-slate-950 rounded-sm"></div>
                <div className="bg-slate-950 rounded-sm"></div>
              </div>
              <span className="text-[10px] text-slate-900 font-mono font-bold mt-1">#{selectedPassBooking.bookingCode}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Titular:</span>
                <strong className="text-white">{selectedPassBooking.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Horario:</span>
                <strong className="text-white">{selectedPassBooking.date} {selectedPassBooking.startTime} hs</strong>
              </div>
              <div className="flex justify-between">
                <span>Estado Pago:</span>
                <strong className="text-emerald-400">
                  {selectedPassBooking.paymentStatus === 'total_pagado' ? '100% Abonado' : `Resta abonar $${selectedPassBooking.balanceDue.toLocaleString('es-AR')}`}
                </strong>
              </div>
            </div>

            <button
              onClick={() => setSelectedPassBooking(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
            >
              Cerrar Pase
            </button>
          </div>
        </div>
      )}

      {/* CANCEL CONFIRMATION DIALOG */}
      {cancellingBookingId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-lg text-slate-900 font-heading">¿Cancelar este turno?</h3>
              <p className="text-xs text-slate-600">
                Según las políticas de DeportesPMY, se liberará el turno y se generará un crédito o reintegro según tu medio de pago.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCancellingBookingId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Volver
              </button>
              <button
                onClick={() => handleConfirmCancel(cancellingBookingId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer shadow-md"
              >
                Sí, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW WRITE MODAL */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading">
                Dejar Opinión sobre {reviewBooking.courtName}
              </h3>
              <button onClick={() => setReviewBooking(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-lg">¡Muchas gracias por tu valoración!</h4>
                <p className="text-xs text-slate-500">Tu comentario detallado ya fue publicado en la web.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* General Star Rating */}
                <div className="text-center py-2 bg-slate-50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-600 block mb-1">Calificación General</span>
                  <div className="flex justify-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingVal(star)}
                        className="p-1 cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Star className={`w-7 h-7 ${star <= ratingVal ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-ratings breakdown */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Césped / Piso</label>
                    <select
                      value={surfaceScore}
                      onChange={(e) => setSurfaceScore(Number(e.target.value))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs"
                    >
                      <option value={5}>5 - Excelente estado</option>
                      <option value={4}>4 - Muy bueno</option>
                      <option value={3}>3 - Aceptable</option>
                      <option value={2}>2 - Desgastado</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Iluminación</label>
                    <select
                      value={lightingScore}
                      onChange={(e) => setLightingScore(Number(e.target.value))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs"
                    >
                      <option value={5}>5 - Óptima sin sombras</option>
                      <option value={4}>4 - Buena luz LED</option>
                      <option value={3}>3 - Regular</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Vestuarios / Duchas</label>
                    <select
                      value={facilitiesScore}
                      onChange={(e) => setFacilitiesScore(Number(e.target.value))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs"
                    >
                      <option value={5}>5 - Muy limpios y agua caliente</option>
                      <option value={4}>4 - Buenos y prolijos</option>
                      <option value={3}>3 - Regulares</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Atención & Buffet</label>
                    <select
                      value={serviceScore}
                      onChange={(e) => setServiceScore(Number(e.target.value))}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2 text-xs"
                    >
                      <option value={5}>5 - De diez, muy amables</option>
                      <option value={4}>4 - Buena atención</option>
                      <option value={3}>3 - Normal</option>
                    </select>
                  </div>
                </div>

                {/* Detailed Comment Input */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Comentario detallado de tu experiencia
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Contale a otros deportistas cómo fue el pique, las pelotas, el tercer tiempo..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewBooking(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!reviewComment.trim()}
                    onClick={handleSaveReview}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Publicar Opinión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
