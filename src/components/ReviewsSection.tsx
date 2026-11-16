import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Court, SportType } from '../types';
import { processImageUpload } from '../utils/imageUpload';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  Plus,
  Camera,
  X,
  Loader2,
  AlertCircle,
  Trash2,
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
  <div className="flex items-center justify-between gap-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3 py-2">
    <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 cursor-pointer"
          title={`${n} de 5`}
        >
          <Star
            className={`w-4 h-4 ${
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-[var(--border-strong)]'
            }`}
          />
        </button>
      ))}
      <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] ml-1 w-6 text-right tabular-nums">
        {value}/5
      </span>
    </div>
  </div>
);

const StarDisplayBar: React.FC<{ value: number; sizeClass?: string }> = ({
  value,
  sizeClass = 'w-4 h-4',
}) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((starIndex) => {
      const fillPercent = Math.max(0, Math.min(1, value - (starIndex - 1))) * 100;
      return (
        <span key={starIndex} className={`relative inline-block ${sizeClass}`}>
          <Star className={`${sizeClass} text-[var(--border-strong)]`} />
          {fillPercent > 0 && (
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fillPercent}%` }}
            >
              <Star className={`${sizeClass} fill-amber-400 text-amber-400`} />
            </span>
          )}
        </span>
      );
    })}
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
    deleteReview,
    isAdminAuthenticated,
    isSuperAdmin,
    siteContent,
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [courtId, setCourtId] = useState(scopedCourts[0]?.id || '');
  const [name, setName] = useState('');
  const [surfaceScore, setSurfaceScore] = useState(5);
  const [lightingScore, setLightingScore] = useState(5);
  const [facilitiesScore, setFacilitiesScore] = useState(5);
  const [serviceScore, setServiceScore] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Automatic general average of the 4 category criteria
  const calculatedOverallRating = Number(
    ((surfaceScore + lightingScore + facilitiesScore + serviceScore) / 4).toFixed(1)
  );

  useEffect(() => {
    if (scopedCourts.length > 0 && !scopedCourts.some((c) => c.id === courtId)) {
      setCourtId(scopedCourts[0].id);
    }
  }, [scopedCourts, courtId]);

  const filteredReviews = scopedReviews.filter((r) => {
    if (selectedSportFilter === 'all') return true;
    return r.sport === selectedSportFilter;
  });

  const hasReviews = scopedReviews.length > 0;
  const overallAvg = hasReviews
    ? (scopedReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / scopedReviews.length).toFixed(1)
    : '—';

  const surfaceAvg = hasReviews
    ? (
        scopedReviews.reduce((sum, r) => sum + (r.scores?.surface || r.rating), 0) /
        scopedReviews.length
      ).toFixed(1)
    : '0.0';

  const lightingAvg = hasReviews
    ? (
        scopedReviews.reduce((sum, r) => sum + (r.scores?.lighting || r.rating), 0) /
        scopedReviews.length
      ).toFixed(1)
    : '0.0';

  const facilitiesAvg = hasReviews
    ? (
        scopedReviews.reduce((sum, r) => sum + (r.scores?.facilities || r.rating), 0) /
        scopedReviews.length
      ).toFixed(1)
    : '0.0';

  const serviceAvg = hasReviews
    ? (
        scopedReviews.reduce((sum, r) => sum + (r.scores?.service || r.rating), 0) /
        scopedReviews.length
      ).toFixed(1)
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
      rating: calculatedOverallRating,
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
    setSurfaceScore(5);
    setLightingScore(5);
    setFacilitiesScore(5);
    setServiceScore(5);
    setPhotos([]);
    setPhotoError(null);
  };

  const breakdownRows = [
    { label: siteContent.reviewsSurfaceLabel, avg: surfaceAvg },
    { label: siteContent.reviewsLightingLabel, avg: lightingAvg },
    { label: siteContent.reviewsFacilitiesLabel, avg: facilitiesAvg },
    { label: siteContent.reviewsServiceLabel, avg: serviceAvg },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Rating Overview */}
      <div className="bg-[var(--bg-surface)] rounded-xl p-6 sm:p-8 border border-[var(--border-hairline)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-[var(--border-hairline)] pb-6 md:pb-0 md:pr-8 space-y-3">
            <p className="text-xs font-semibold text-[var(--accent-soft-text)]">
              {complexNameOverride
                ? `Opiniones · ${complexNameOverride}`
                : siteContent.reviewsEyebrow}
            </p>
            <div className="flex items-baseline gap-3.5">
              <span className="font-heading text-5xl sm:text-6xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {overallAvg}
              </span>
              <div>
                <StarDisplayBar value={hasReviews ? Number(overallAvg) : 0} sizeClass="w-4 h-4" />
                <span className="text-xs text-[var(--text-muted)] mt-1 block tabular-nums">
                  {hasReviews
                    ? `${scopedReviews.length} ${scopedReviews.length === 1 ? 'opinión publicada' : 'opiniones publicadas'}`
                    : 'Sin valoraciones registradas'}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {siteContent.reviewsDescription}
            </p>

            {scopedCourts.length > 0 && (
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{siteContent.reviewsWriteButtonLabel}</span>
              </button>
            )}
          </div>

          <div className="md:col-span-7 space-y-3.5">
            {breakdownRows.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-[var(--text-primary)]">{row.label}</span>
                  <span className="font-mono font-semibold text-[var(--text-secondary)] tabular-nums">
                    {row.avg} / 5.0
                  </span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--accent)] h-full rounded-full transition-all"
                    style={{ width: `${(Number(row.avg) / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sport Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'futbol5', label: 'Fútbol 5' },
            { id: 'padel', label: 'Pádel' },
            { id: 'futbol7', label: 'Fútbol 7' },
            { id: 'tenis', label: 'Tenis' },
            { id: 'basquet', label: 'Básquet' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedSportFilter(f.id as SportType | 'all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                selectedSportFilter === f.id
                  ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-[var(--accent)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {filteredReviews.length} {filteredReviews.length === 1 ? 'reseña' : 'reseñas'}
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((rev) => {
          const safeRating = Math.max(1, Math.min(5, Number(rev.rating) || 5));
          const isConfirmingDelete = deleteConfirmId === rev.id;

          return (
            <article
              key={rev.id}
              className="bg-[var(--bg-surface)] rounded-xl p-6 border border-[var(--border-hairline)] space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-bold flex items-center justify-center text-sm shrink-0">
                    {rev.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">{rev.userName}</h4>
                    <div className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                      <span className="text-[var(--text-secondary)] font-medium">{rev.courtName}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{rev.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="flex items-center gap-1.5">
                    <StarDisplayBar value={safeRating} sizeClass="w-3.5 h-3.5" />
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)] ml-1 tabular-nums">
                      {safeRating.toFixed(1)}
                    </span>
                  </div>

                  {isSuperAdmin && (
                    isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteReview(rev.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(rev.id)}
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                        title="Eliminar opinión (SuperAdmin)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)] tabular-nums">
                Piso <strong className="text-[var(--text-primary)]">{rev.scores?.surface ?? safeRating}/5</strong>
                {' · '}
                Iluminación <strong className="text-[var(--text-primary)]">{rev.scores?.lighting ?? safeRating}/5</strong>
                {' · '}
                Vestuarios <strong className="text-[var(--text-primary)]">{rev.scores?.facilities ?? safeRating}/5</strong>
                {' · '}
                Atención <strong className="text-[var(--text-primary)]">{rev.scores?.service ?? safeRating}/5</strong>
              </p>

              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                &ldquo;{rev.comment}&rdquo;
              </p>

              {rev.photos && rev.photos.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {rev.photos.map((photoSrc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxPhoto(photoSrc)}
                      className="group w-24 h-24 rounded-lg overflow-hidden border border-[var(--border-hairline)] cursor-pointer bg-[var(--bg-subtle)]"
                      title="Ampliar foto"
                    >
                      <img
                        src={photoSrc}
                        alt={`Foto de ${rev.userName} (${idx + 1})`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}

              {rev.adminReply ? (
                <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-soft-text)]" />
                    <span>Respuesta del complejo</span>
                    <span className="text-[var(--text-muted)] font-mono font-normal">({rev.adminReply.date})</span>
                  </div>
                  <p className="text-[var(--text-secondary)] pl-5">{rev.adminReply.text}</p>
                </div>
              ) : isAdminAuthenticated ? (
                <div className="pt-1">
                  {adminReplyReviewId === rev.id ? (
                    <div className="p-3 bg-[var(--bg-subtle)] rounded-lg space-y-2 text-xs">
                      <label className="font-semibold text-[var(--text-primary)] block">
                        Responder como administrador:
                      </label>
                      <textarea
                        rows={2}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escribí una respuesta formal para este jugador..."
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs text-[var(--text-primary)]"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setAdminReplyReviewId(null)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)] font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdminReplySubmit(rev.id)}
                          className="px-4 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] font-semibold cursor-pointer"
                        >
                          Publicar respuesta
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdminReplyReviewId(rev.id)}
                      className="text-xs font-semibold text-[var(--accent-soft-text)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Responder como complejo</span>
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}

        {filteredReviews.length === 0 && (
          <div className="bg-[var(--bg-surface)] rounded-xl p-10 border border-[var(--border-hairline)] text-center max-w-md mx-auto space-y-2">
            <MessageSquare className="w-6 h-6 text-[var(--text-muted)] mx-auto" />
            <h4 className="font-heading font-bold text-[var(--text-primary)] text-lg">
              {siteContent.reviewsEmptyTitle}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {siteContent.reviewsEmptySubtitle}
            </p>
          </div>
        )}
      </div>

      {/* WRITE REVIEW MODAL */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-[var(--text-primary)] my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <h3 className="font-heading text-xl font-bold">
                {complexNameOverride
                  ? `Dejar opinión sobre ${complexNameOverride}`
                  : siteContent.reviewsModalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  Cancha a calificar
                </label>
                <select
                  value={courtId}
                  onChange={(e) => setCourtId(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
                >
                  {scopedCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.establishment && !complexNameOverride ? ` — ${c.establishment}` : ''} ({c.sport})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  Tu nombre completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Pereyra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              {/* Automatic Average General Score */}
              <div className="p-3.5 bg-[var(--bg-canvas)] rounded-lg text-center border border-[var(--border-hairline)] space-y-1.5">
                <span className="font-semibold text-[var(--text-primary)] block">
                  Puntuación general (promedio automático)
                </span>
                <div className="flex items-center justify-center gap-3">
                  <StarDisplayBar value={calculatedOverallRating} sizeClass="w-6 h-6" />
                  <span className="font-mono text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                    {calculatedOverallRating.toFixed(1)} <span className="text-xs font-normal text-[var(--text-muted)]">/ 5.0</span>
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Se calcula automáticamente al puntuar los 4 rubros debajo.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-[var(--text-primary)] block">
                  Valoración por rubro (1 a 5)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <StarSelectorRow label="Césped / Piso" value={surfaceScore} onChange={setSurfaceScore} />
                  <StarSelectorRow label="Iluminación" value={lightingScore} onChange={setLightingScore} />
                  <StarSelectorRow label="Vestuarios" value={facilitiesScore} onChange={setFacilitiesScore} />
                  <StarSelectorRow label="Atención" value={serviceScore} onChange={setServiceScore} />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                  Comentario detallado
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detallá tu experiencia en el turno, estado del piso, vestuarios y atención..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--text-primary)]">
                    Adjuntar fotos (Opcional, máx. 3)
                  </label>
                  <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                    {photos.length}/3
                  </span>
                </div>

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((src, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-subtle)]"
                      >
                        <img src={src} alt={`Adjunto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600"
                          title="Quitar foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {photos.length < 3 && (
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg border border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer transition-colors">
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando imagen...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Seleccionar fotos (JPG, PNG, WEBP)</span>
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
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{photoError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setIsWriteModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="px-5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-[var(--accent-ink)] font-semibold text-xs cursor-pointer"
                >
                  Publicar reseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-lg bg-black/90 text-white border border-white/20 flex items-center justify-center cursor-pointer hover:bg-rose-600"
              aria-label="Cerrar imagen"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxPhoto}
              alt="Foto ampliada de reseña"
              className="max-w-full max-h-[85vh] rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};
