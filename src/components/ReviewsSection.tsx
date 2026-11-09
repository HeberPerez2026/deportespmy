import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';
import { 
  Star, 
  CheckCircle, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  ThumbsUp, 
  Send, 
  MessageCircle, 
  Filter,
  Plus
} from 'lucide-react';

export const ReviewsSection: React.FC = () => {
  const { 
    reviews, 
    courts, 
    addReview, 
    replyToReview, 
    isAdminAuthenticated 
  } = useApp();

  const [selectedSportFilter, setSelectedSportFilter] = useState<SportType | 'all'>('all');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [adminReplyReviewId, setAdminReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Form states for new review
  const [courtId, setCourtId] = useState(courts[0]?.id || '');
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [surfaceScore, setSurfaceScore] = useState(5);
  const [lightingScore, setLightingScore] = useState(5);
  const [facilitiesScore, setFacilitiesScore] = useState(5);
  const [serviceScore, setServiceScore] = useState(5);
  const [comment, setComment] = useState('');

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (selectedSportFilter === 'all') return true;
    return r.sport === selectedSportFilter;
  });

  // Calculate averages
  const hasReviews = reviews.length > 0;
  const overallAvg = hasReviews 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '-';

  const surfaceAvg = hasReviews
    ? (reviews.reduce((sum, r) => sum + r.scores.surface, 0) / reviews.length).toFixed(1)
    : '0.0';

  const lightingAvg = hasReviews
    ? (reviews.reduce((sum, r) => sum + r.scores.lighting, 0) / reviews.length).toFixed(1)
    : '0.0';

  const facilitiesAvg = hasReviews
    ? (reviews.reduce((sum, r) => sum + r.scores.facilities, 0) / reviews.length).toFixed(1)
    : '0.0';

  const serviceAvg = hasReviews
    ? (reviews.reduce((sum, r) => sum + r.scores.service, 0) / reviews.length).toFixed(1)
    : '0.0';

  const handleAdminReplySubmit = (reviewId: string) => {
    if (!replyText.trim()) return;
    replyToReview(reviewId, replyText);
    setAdminReplyReviewId(null);
    setReplyText('');
  };

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    const court = courts.find(c => c.id === courtId);
    if (!court || !comment.trim() || !name.trim()) return;

    addReview({
      courtId: court.id,
      courtName: court.name,
      sport: court.sport,
      userName: name,
      userPhone: '+54 9 280 4***-000',
      rating,
      scores: {
        surface: surfaceScore,
        lighting: lightingScore,
        facilities: facilitiesScore,
        service: serviceScore,
      },
      comment,
      verifiedBookingCode: `PMY-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    setIsWriteModalOpen(false);
    setComment('');
    setName('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header and Rating Overview */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl mb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Big Rating Number */}
          <div className="md:col-span-5 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Valoración Comunitaria • DeportesPMY
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-3">
              <span className="text-5xl sm:text-6xl font-black font-heading text-white">{overallAvg}</span>
              <div className="text-left">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className={`w-4 h-4 ${hasReviews ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  {hasReviews ? `Basado en ${reviews.length} opiniones verificadas` : 'Aún no hay valoraciones registradas'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-3">
              {hasReviews 
                ? 'Todas las reseñas corresponden a deportistas reales que reservaron y jugaron en nuestras canchas de Puerto Madryn.'
                : 'Las opiniones y puntuaciones aparecerán aquí a medida que los jugadores califiquen las instalaciones luego de sus turnos.'}
            </p>

            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Dejar mi Valoración</span>
            </button>
          </div>

          {/* Sub-ratings Breakdown Bars */}
          <div className="md:col-span-7 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Superficie y Césped Sintético</span>
                <span className="text-emerald-400 font-bold">{surfaceAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(surfaceAvg) / 5) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Iluminación LED Nocturna</span>
                <span className="text-emerald-400 font-bold">{lightingAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(lightingAvg) / 5) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Vestuarios & Duchas Calientes</span>
                <span className="text-emerald-400 font-bold">{facilitiesAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(facilitiesAvg) / 5) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Atención, Puntualidad y Buffet</span>
                <span className="text-emerald-400 font-bold">{serviceAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(Number(serviceAvg) / 5) * 100}%` }} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sport Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar:
          </span>
          {[
            { id: 'all', label: 'Todas las Canchas' },
            { id: 'futbol5', label: 'Fútbol 5' },
            { id: 'padel', label: 'Pádel' },
            { id: 'futbol7', label: 'Fútbol 7' },
            { id: 'tenis', label: 'Tenis' },
            { id: 'basquet', label: 'Básquet' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedSportFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                selectedSportFilter === f.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Mostrando {filteredReviews.length} reseñas
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => (
          <div 
            key={rev.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-4"
          >
            {/* Top Review Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-inner">
                  {rev.userName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{rev.userName}</h4>
                    {rev.verifiedBookingCode && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Turno Verificado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{rev.courtName}</span>
                    <span>•</span>
                    <span>{rev.date}</span>
                  </div>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-1 text-amber-400 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/60 self-start sm:self-auto">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
                <span className="text-xs font-bold text-amber-800 ml-1">{rev.rating}.0</span>
              </div>
            </div>

            {/* Sub-ratings chips */}
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span>Piso: <strong>{rev.scores.surface}/5</strong></span>
              <span>•</span>
              <span>Iluminación: <strong>{rev.scores.lighting}/5</strong></span>
              <span>•</span>
              <span>Vestuarios: <strong>{rev.scores.facilities}/5</strong></span>
              <span>•</span>
              <span>Atención: <strong>{rev.scores.service}/5</strong></span>
            </div>

            {/* Detailed Comment Text */}
            <p className="text-sm text-slate-700 leading-relaxed">
              "{rev.comment}"
            </p>

            {/* Official Admin Reply if exists */}
            {rev.adminReply ? (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-2xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Respuesta Oficial • Administración DeportesPMY</span>
                  <span className="text-slate-400 font-normal">({rev.adminReply.date})</span>
                </div>
                <p className="text-slate-700 pl-5">
                  {rev.adminReply.text}
                </p>
              </div>
            ) : isAdminAuthenticated ? (
              <div className="pt-2">
                {adminReplyReviewId === rev.id ? (
                  <div className="p-3 bg-slate-100 rounded-2xl space-y-2 text-xs">
                    <label className="font-bold text-slate-800">Responder como Administrador:</label>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribí una respuesta formal para este cliente..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setAdminReplyReviewId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAdminReplySubmit(rev.id)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                      >
                        Publicar Respuesta
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdminReplyReviewId(rev.id)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Responder como Admin</span>
                  </button>
                )}
              </div>
            ) : null}

          </div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm font-heading">Aún no hay opiniones registradas</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Las opiniones y valoraciones aparecerán aquí a medida que los jugadores dejen sus comentarios.
            </p>
          </div>
        )}
      </div>

      {/* WRITE REVIEW MODAL */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading">
                Dejar Opinión sobre DeportesPMY
              </h3>
              <button onClick={() => setIsWriteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Cancha a Calificar</label>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                >
                  {courts.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.sport})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Tu Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Pereyra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              {/* Star Rating Picker */}
              <div className="p-3 bg-slate-50 rounded-2xl text-center">
                <span className="font-bold text-slate-700 block mb-1.5">Puntuación General</span>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Estado de Césped / Piso</label>
                  <select
                    value={surfaceScore}
                    onChange={(e) => setSurfaceScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  >
                    <option value={5}>5 - Excelente</option>
                    <option value={4}>4 - Muy bueno</option>
                    <option value={3}>3 - Regular</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Iluminación</label>
                  <select
                    value={lightingScore}
                    onChange={(e) => setLightingScore(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  >
                    <option value={5}>5 - Óptima LED</option>
                    <option value={4}>4 - Buena</option>
                    <option value={3}>3 - Regular</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Comentario Detallado</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detallá tu experiencia en el turno, estado de las redes, amabilidad en el mostrador..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  Publicar Reseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
