import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Court, SportType } from '../types';
import { processImageUpload } from '../utils/imageUpload';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  Filter,
  Plus,
  Camera,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ReviewsSectionProps {
  courtsOverride?: Court[];
  complexNameOverride?: string;
}

const StarSelectorRow: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
    <span className="text-[11px] font-bold text-slate-700">{label}</span>
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 cursor-pointer hover:scale-110 transition-transform"
          title={`${n} de 5`}
        >
          <Star
            className={`w-4 h-4 ${
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            }`}
          />
        </button>
      ))}
      <span className="text-[11px] font-bold text-slate-600 ml-1 w-5 text-right">{value}/5</span>
    </div>
  </div>
);

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  courtsOverride,
  complexNameOverride,
}) => {
  const {
    reviews,
    courts,
    addReview,
    replyToReview,
    isAdminAuthenticated,
  } = useApp();

  const scopedCourts = courtsOverride ?? courts;
  const scopedCourtIds = new Set(scopedCourts.map((c) => c.id));
  const scopedReviews = courtsOverride
    ? reviews.filter((r) => scopedCourtIds.has(r.courtId))
    : reviews;

  const [selectedSportFilter, setSelectedSportFilter] = useState<SportType | 'all'>('all');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [adminReplyReviewId, setAdminReplyReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Form states for new review
  const [courtId, setCourtId] = useState(scopedCourts[0]?.id || '');
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [surfaceScore, setSurfaceScore] = useState(5);
  const [lightingScore, setLightingScore] = useState(5);
  const [facilitiesScore, setFacilitiesScore] = useState(5);
  const [serviceScore, setServiceScore] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (scopedCourts.length > 0 && !scopedCourts.some((c) => c.id === courtId)) {
      setCourtId(scopedCourts[0].id);
    }
  }, [scopedCourts, courtId]);

  // Filter reviews by sport
  const filteredReviews = scopedReviews.filter((r) => {
    if (selectedSportFilter === 'all') return true;
    return r.sport === selectedSportFilter;
  });

  // Calculate averages strictly from scopedReviews
  const hasReviews = scopedReviews.length > 0;
  const overallAvg = hasReviews
    ? (scopedReviews.reduce((sum, r) => sum + r.rating, 0) / scopedReviews.length).toFixed(1)
    : '-';

  const surfaceAvg = hasReviews
    ? (scopedReviews.reduce((sum, r) => sum + (r.scores?.surface || r.rating), 0) / scopedReviews.length).toFixed(1)
    : '0.0';

  const lightingAvg = hasReviews
    ? (scopedReviews.reduce((sum, r) => sum + (r.scores?.lighting || r.rating), 0) / scopedReviews.length).toFixed(1)
    : '0.0';

  const facilitiesAvg = hasReviews
    ? (scopedReviews.reduce((sum, r) => sum + (r.scores?.facilities || r.rating), 0) / scopedReviews.length).toFixed(1)
    : '0.0';

  const serviceAvg = hasReviews
    ? (scopedReviews.reduce((sum, r) => sum + (r.scores?.service || r.rating), 0) / scopedReviews.length).toFixed(1)
    : '0.0';

  const handleAdminReplySubmit = (reviewId: string) => {
    if (!replyText.trim()) return;
    replyToReview(reviewId, replyText);
    setAdminReplyReviewId(null);
    setReplyText('');
  };

  const handlePhotoFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setPhotoError(null);
    const remainingSlots = Math.max(0, 3 - photos.length);
    if (remainingSlots === 0) {
      setPhotoError('Podés adjuntar hasta 3 fotos por reseña.');
      e.target.value = '';
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    setUploadingPhoto(true);

    try {
      const processed: string[] = [];
      for (const file of files) {
        const dataUrl = await processImageUpload(file, {
          maxDimension: 1000,
          quality: 0.75,
          maxDataUrlLength: 210000,
        });
        processed.push(dataUrl);
      }
      setPhotos((prev) => [...prev, ...processed].slice(0, 3));
    } catch (err: any) {
      setPhotoError(err?.message || 'No se pudo procesar la foto seleccionada.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
    setPhotoError(null);
  };

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    const court = scopedCourts.find((c) => c.id === courtId);
    if (!court || !comment.trim() || !name.trim()) return;

    addReview({
      courtId: court.id,
      courtName: court.name,
      sport: court.sport,
      userName: name.trim(),
      userPhone: '',
      rating,
      scores: {
        surface: surfaceScore,
        lighting: lightingScore,
        facilities: facilitiesScore,
        service: serviceScore,
      },
      comment: comment.trim(),
      ...(photos.length > 0 ? { photos } : {}),
      ...(court.adminId ? { adminId: court.adminId } : {}),
    });

    setIsWriteModalOpen(false);
    setComment('');
    setName('');
    setRating(5);
    setSurfaceScore(5);
    setLightingScore(5);
    setFacilitiesScore(5);
    setServiceScore(5);
    setPhotos([]);
    setPhotoError(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header and Rating Overview */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl mb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Big Rating Number */}
          <div className="md:col-span-5 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              {complexNameOverride
                ? `Opiniones • ${complexNameOverride}`
                : 'Opiniones de la Comunidad • DeportesPMY'}
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-3">
              <span className="text-5xl sm:text-6xl font-black font-heading text-white">{overallAvg}</span>
              <div className="text-left">
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        hasReviews && i <= Math.round(Number(overallAvg))
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 mt-1 block">
                  {hasReviews
                    ? `Basado en ${scopedReviews.length} ${scopedReviews.length === 1 ? 'opinión publicada' : 'opiniones publicadas'}`
                    : 'Aún no hay valoraciones registradas'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-3">
              {hasReviews
                ? 'Conocé la experiencia de otros jugadores sobre el estado de las canchas, iluminación, vestuarios y atención.'
                : 'Compartí tu experiencia sobre el piso, iluminación, vestuarios y atención para ayudar a otros jugadores.'}
            </p>

            {scopedCourts.length > 0 && (
              <button
                onClick={() => setIsWriteModalOpen(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Dejar mi Valoración</span>
              </button>
            )}
          </div>

          {/* Sub-ratings Breakdown Bars */}
          <div className="md:col-span-7 space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Superficie y Césped Sintético</span>
                <span className="text-emerald-400 font-bold">{surfaceAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(Number(surfaceAvg) / 5) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Iluminación LED Nocturna</span>
                <span className="text-emerald-400 font-bold">{lightingAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(Number(lightingAvg) / 5) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Vestuarios &amp; Duchas Calientes</span>
                <span className="text-emerald-400 font-bold">{facilitiesAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(Number(facilitiesAvg) / 5) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Atención, Puntualidad y Buffet</span>
                <span className="text-emerald-400 font-bold">{serviceAvg} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${(Number(serviceAvg) / 5) * 100}%` }} />
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
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedSportFilter(f.id as SportType | 'all')}
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
          Mostrando {filteredReviews.length} {filteredReviews.length === 1 ? 'reseña' : 'reseñas'}
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow space-y-4"
          >
            {/* Top Review Row (sin etiqueta falsa de turno verificado) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm shadow-inner">
                  {rev.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{rev.userName}</h4>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-medium text-slate-700">{rev.courtName}</span>
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
              <span>Piso: <strong>{rev.scores?.surface ?? rev.rating}/5</strong></span>
              <span>•</span>
              <span>Iluminación: <strong>{rev.scores?.lighting ?? rev.rating}/5</strong></span>
              <span>•</span>
              <span>Vestuarios: <strong>{rev.scores?.facilities ?? rev.rating}/5</strong></span>
              <span>•</span>
              <span>Atención: <strong>{rev.scores?.service ?? rev.rating}/5</strong></span>
            </div>

            {/* Detailed Comment Text */}
            <p className="text-sm text-slate-700 leading-relaxed">
              "{rev.comment}"
            </p>

            {/* Attached Review Photos */}
            {rev.photos && rev.photos.length > 0 && (
              <div className="flex flex-wrap gap-2.5 pt-1">
                {rev.photos.map((photoSrc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxPhoto(photoSrc)}
                    className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer bg-slate-100"
                    title="Ampliar foto"
                  >
                    <img
                      src={photoSrc}
                      alt={`Foto de ${rev.userName} (${idx + 1})`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Official Admin Reply if exists */}
            {rev.adminReply ? (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/70 rounded-2xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Respuesta del Complejo</span>
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
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAdminReplySubmit(rev.id)}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-900 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading">
                {complexNameOverride
                  ? `Dejar Opinión sobre ${complexNameOverride}`
                  : 'Dejar Opinión sobre la Cancha'}
              </h3>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  {scopedCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.establishment && !complexNameOverride ? ` — ${c.establishment}` : ''} ({c.sport})
                    </option>
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

              {/* Overall Star Rating Picker */}
              <div className="p-3 bg-slate-50 rounded-2xl text-center border border-slate-200/70">
                <span className="font-bold text-slate-700 block mb-1.5">Puntuación General</span>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* All 4 Category Sub-scores: Superficie, Iluminación, Vestuarios, Atención */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">Valoración por Rubro (1 a 5)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <StarSelectorRow
                    label="Césped / Piso"
                    value={surfaceScore}
                    onChange={setSurfaceScore}
                  />
                  <StarSelectorRow
                    label="Iluminación"
                    value={lightingScore}
                    onChange={setLightingScore}
                  />
                  <StarSelectorRow
                    label="Vestuarios"
                    value={facilitiesScore}
                    onChange={setFacilitiesScore}
                  />
                  <StarSelectorRow
                    label="Atención"
                    value={serviceScore}
                    onChange={setServiceScore}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Comentario Detallado</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detallá tu experiencia en el turno, estado del piso, vestuarios y atención..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              {/* Photo Attachment Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Adjuntar Fotos (Opcional, máx. 3)</label>
                  <span className="text-[11px] text-slate-400">{photos.length}/3</span>
                </div>

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((src, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={src} alt={`Adjunto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600"
                          title="Quitar foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < 3 && (
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer transition-colors">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando imagen...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Seleccionar Fotos de la Cancha / Vestuarios (JPG, PNG, WEBP)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingPhoto}
                      onChange={handlePhotoFilesChange}
                      className="hidden"
                    />
                  </label>
                )}

                {photoError && (
                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{photoError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Publicar Reseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-slate-900 text-white border border-slate-700 flex items-center justify-center cursor-pointer shadow-xl hover:bg-rose-600"
              aria-label="Cerrar imagen"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxPhoto}
              alt="Foto ampliada de reseña"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
};
