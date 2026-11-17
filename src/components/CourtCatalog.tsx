import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking, Court } from '../types';
import { BookingModal } from './BookingModal';
import { JoinMatchModal } from './JoinMatchModal';
import { AvailablePlayersModal } from './AvailablePlayersModal';
import {
  resolveCourtGallery,
  SPORT_DISPLAY_LABELS,
  FALLBACK_COURT_SVG,
} from '../data/courtMedia';
import {
  formatSlotHour,
  getNormalizedCourtSchedule,
  parseSlotHourOrder,
} from '../utils/scheduleHours';
import {
  Star,
  ChevronRight,
  ChevronLeft,
  PlusCircle,
  Search,
  Lock,
  Building2,
  Users,
} from 'lucide-react';

interface CourtCatalogProps {
  onOpenAdminLogin?: () => void;
  onOpenAvailablePlayers?: () => void;
  courtsOverride?: Court[];
  complexNameOverride?: string;
}

export const CourtCatalog: React.FC<CourtCatalogProps> = ({
  onOpenAdminLogin,
  onOpenAvailablePlayers,
  courtsOverride,
  complexNameOverride,
}) => {
  const {
    courts,
    bookings,
    availablePlayers,
    reviews,
    selectedSport,
    selectedDate,
    searchQuery,
    setSearchQuery,
    getSlotsForCourtAndDate,
    isAdminAuthenticated,
    setActiveTab,
    siteContent,
    getSportLabel,
  } = useApp();

  const [activeBookingCourt, setActiveBookingCourt] = useState<Court | null>(null);
  const [selectedInitialSlot, setSelectedInitialSlot] = useState<string | undefined>(undefined);
  const [activeJoinBooking, setActiveJoinBooking] = useState<Booking | null>(null);
  const [isLocalAvailablePlayersOpen, setIsLocalAvailablePlayersOpen] = useState(false);
  const [photoIndexByCourt, setPhotoIndexByCourt] = useState<Record<string, number>>({});

  const sourceCourts = courtsOverride ?? courts;
  const activeComplexTitle = complexNameOverride || siteContent.catalogEyebrow;

  const filteredCourts = sourceCourts.filter((court) => {
    if (selectedSport !== 'all' && court.sport !== selectedSport) {
      return false;
    }

    if (!courtsOverride && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = court.name.toLowerCase().includes(q);
      const estMatch = court.establishment ? court.establishment.toLowerCase().includes(q) : false;
      const surfaceMatch = court.surface ? court.surface.toLowerCase().includes(q) : false;
      if (!nameMatch && !estMatch && !surfaceMatch) {
        return false;
      }
    }

    return true;
  });

  const handleOpenBooking = (court: Court, slotTime?: string) => {
    setActiveBookingCourt(court);
    setSelectedInitialSlot(slotTime);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 mb-8 border-b border-[var(--border-hairline)] gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--accent-soft-text)]">
            {activeComplexTitle}
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
            {siteContent.catalogTitlePrefix} <span className="font-mono tabular-nums">{selectedDate}</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {siteContent.catalogSubtitle}
          </p>
        </div>

        {/* Clean Unboxed Legend + Available Players Trigger */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          {sourceCourts.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--accent)]" />
                {siteContent.catalogLegendAvailable}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Faltan jugadores (sumate)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--border-strong)]" />
                {siteContent.catalogLegendOccupied}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[var(--night-cue)]" />
                {siteContent.catalogLegendNight}
              </span>
            </div>
          )}

          {!isAdminAuthenticated && (
            <button
              type="button"
              onClick={() => {
                if (onOpenAvailablePlayers) onOpenAvailablePlayers();
                else setIsLocalAvailablePlayersOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent-soft-text)] border border-[var(--border-hairline)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-opacity"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Jugadores disponibles ({availablePlayers.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State 1: No courts in DB yet */}
      {sourceCourts.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-12 h-12 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h3 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
              {siteContent.catalogEmptyTitle}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
              {siteContent.catalogEmptySubtitle}
            </p>
          </div>

          <div className="pt-1">
            {isAdminAuthenticated ? (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cargar primera cancha en el panel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onOpenAdminLogin) onOpenAdminLogin();
                  else setActiveTab('admin');
                }}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{siteContent.catalogEmptyButtonLabel}</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredCourts.length === 0 ? (
        /* Empty State 2: Filter yielded 0 results */
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-8 sm:p-10 text-center max-w-md mx-auto space-y-4">
          <div className="w-11 h-11 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="font-heading text-xl font-bold text-[var(--text-primary)]">
            {siteContent.catalogNoResultsTitle}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {siteContent.catalogNoResultsSubtitle}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs cursor-pointer transition-colors"
          >
            {siteContent.catalogNoResultsButtonLabel}
          </button>
        </div>
      ) : (
        /* Courts Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredCourts.map((court) => {
            const slots = getSlotsForCourtAndDate(court.id, selectedDate);
            const availableSlotsCount = slots.filter((s) => s.status === 'available').length;
            const sportLabel = getSportLabel(court.sport);
            const gallery = resolveCourtGallery(court.sport, court.images, court.imageUrl);
            const activePhotoIdx = (photoIndexByCourt[court.id] || 0) % gallery.length;
            const activePhoto = gallery[activePhotoIdx];

            const courtReviews = reviews.filter((r) => r.courtId === court.id);
            const liveReviewCount =
              courtReviews.length > 0 ? courtReviews.length : court.reviewCount || 0;
            const liveRating =
              courtReviews.length > 0
                ? courtReviews.reduce((s, r) => s + r.rating, 0) / courtReviews.length
                : court.rating || 0;

            const schedule = getNormalizedCourtSchedule(court);
            const scheduleLabel = `${schedule.hora_inicio} a ${schedule.hora_fin} hs`;

            return (
              <article
                key={court.id}
                className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)] overflow-hidden flex flex-col justify-between transition-all duration-150 hover:border-[var(--border-strong)] shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Court Media Header */}
                  <div className="relative aspect-[16/10] overflow-hidden group bg-[var(--bg-subtle)]">
                    <img
                      src={activePhoto}
                      alt={court.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_COURT_SVG;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Photo Carousel Controls */}
                    {gallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoIndexByCourt((prev) => ({
                              ...prev,
                              [court.id]: (activePhotoIdx - 1 + gallery.length) % gallery.length,
                            }));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/65 hover:bg-black/85 text-white flex items-center justify-center cursor-pointer transition-colors"
                          aria-label="Foto anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoIndexByCourt((prev) => ({
                              ...prev,
                              [court.id]: (activePhotoIdx + 1) % gallery.length,
                            }));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/65 hover:bg-black/85 text-white flex items-center justify-center cursor-pointer transition-colors"
                          aria-label="Siguiente foto"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3.5 right-4 text-[11px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded-md tabular-nums">
                          {activePhotoIdx + 1}/{gallery.length}
                        </div>
                      </>
                    )}

                    {/* Top Single Tag + Rating */}
                    <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-md bg-black/70 text-white font-semibold backdrop-blur-sm">
                        {sportLabel} · {court.isIndoor ? 'Techada' : 'Aire libre'}
                      </span>

                      {liveReviewCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/70 text-amber-300 font-mono font-semibold backdrop-blur-sm tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {liveRating.toFixed(1)} ({liveReviewCount})
                        </span>
                      )}
                    </div>

                    {/* Bottom Court Title on Photo */}
                    <div className="absolute bottom-3.5 left-4 right-16 text-white">
                      {court.establishment && (
                        <p className="text-xs font-medium text-white/80 mb-0.5">
                          {court.establishment}
                        </p>
                      )}
                      <h3 className="font-heading text-2xl font-bold leading-tight">
                        {court.name}
                      </h3>
                      <p className="text-xs text-white/85 mt-0.5">
                        {court.surface} · {court.hasLighting ? 'Iluminación LED' : 'Luz natural'}
                      </p>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 sm:p-6 space-y-5">
                    {/* Rates Row (Tabular Numbers, No Pill Cluster) */}
                    <div className="grid grid-cols-3 gap-3 pb-4 border-b border-[var(--border-hairline)]">
                      <div>
                        <span className="text-xs text-[var(--text-muted)] block">{siteContent.catalogRateDayLabel}</span>
                        <span className="font-mono text-base font-bold text-[var(--text-primary)] tabular-nums">
                          ${court.hourlyRateDay.toLocaleString('es-AR')}
                          <span className="text-xs font-normal text-[var(--text-muted)]">/h</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-[var(--text-muted)] block">{siteContent.catalogRateNightLabel}</span>
                        <span className="font-mono text-base font-bold text-[var(--text-primary)] tabular-nums">
                          ${court.hourlyRateNight.toLocaleString('es-AR')}
                          <span className="text-xs font-normal text-[var(--text-muted)]">/h</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-[var(--text-muted)] block">{siteContent.catalogDepositLabel}</span>
                        <span className="font-mono text-base font-bold text-[var(--accent-soft-text)] tabular-nums">
                          {court.depositRequired || 50}%
                        </span>
                      </div>
                    </div>

                    {/* Amenities as clean dot-separated editorial line */}
                    {court.amenities && court.amenities.length > 0 && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        <span className="font-semibold text-[var(--text-primary)]">{siteContent.catalogIncludesLabel} </span>
                        {court.amenities.join(' · ')}
                      </p>
                    )}

                    {/* Quick Time Slots Strip (Amplitud horaria completa configurada por el admin) */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2.5 gap-2">
                        <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                          {siteContent.catalogSchedulesPrefix} ({availableSlotsCount} libres · <span className="text-[var(--text-muted)] font-mono">{scheduleLabel}</span>)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenBooking(court)}
                          className="text-[var(--accent-soft-text)] hover:underline font-semibold cursor-pointer shrink-0"
                        >
                          {siteContent.catalogFullScheduleLabel}
                        </button>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {slots.map((slot) => {
                          const isAvailable = slot.status === 'available';
                          const missingCount = slot.missingPlayersCount || 0;
                          const isLookingForPlayers = missingCount > 0 && Boolean(slot.bookingId);
                          const isClickable = isAvailable || isLookingForPlayers;
                          const slotHourOrder = parseSlotHourOrder(slot.startTime);
                          const isNight = slotHourOrder >= schedule.nightStartHour;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isClickable}
                              title={
                                isLookingForPlayers
                                  ? `Faltan ${missingCount} ${missingCount === 1 ? 'jugador' : 'jugadores'} · Clic para sumarte al partido`
                                  : isAvailable
                                  ? `Reservar ${slot.startTime} hs`
                                  : 'Horario ocupado'
                              }
                              onClick={() => {
                                if (isLookingForPlayers && slot.bookingId) {
                                  const match = bookings.find((b) => b.id === slot.bookingId);
                                  if (match) setActiveJoinBooking(match);
                                  return;
                                }
                                if (isAvailable) {
                                  handleOpenBooking(court, slot.startTime);
                                }
                              }}
                              className={`py-1.5 px-1 rounded-lg text-xs font-mono font-semibold transition-colors duration-150 text-center border relative tabular-nums flex flex-col items-center justify-center leading-tight ${
                                isLookingForPlayers
                                  ? 'bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-slate-950 border-amber-500/60 cursor-pointer'
                                  : !isAvailable
                                  ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-transparent line-through cursor-not-allowed opacity-55'
                                  : 'bg-[var(--accent-soft)] hover:bg-[var(--accent)] text-[var(--accent-soft-text)] hover:text-[var(--accent-ink)] border-[var(--border-hairline)] hover:border-[var(--accent)] cursor-pointer'
                              }`}
                            >
                              <span>{slot.startTime}</span>
                              {isLookingForPlayers && (
                                <span className="font-sans text-[10px] font-bold tracking-tight">
                                  {missingCount === 1 ? 'Falta 1' : `Faltan ${missingCount}`}
                                </span>
                              )}
                              {isNight && isAvailable && (
                                <span
                                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--night-cue)]"
                                  title={`Tarifa nocturna con luz (desde ${formatSlotHour(schedule.nightStartHour)})`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 sm:px-6 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-hairline)] flex items-center justify-between gap-4">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {siteContent.catalogCardFooterHint}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenBooking(court)}
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>{siteContent.catalogReserveButtonLabel}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeBookingCourt && (
        <BookingModal
          court={activeBookingCourt}
          initialSlotTime={selectedInitialSlot}
          onClose={() => setActiveBookingCourt(null)}
        />
      )}

      {activeJoinBooking && (
        <JoinMatchModal
          booking={activeJoinBooking}
          onClose={() => setActiveJoinBooking(null)}
        />
      )}

      {!onOpenAvailablePlayers && (
        <AvailablePlayersModal
          isOpen={isLocalAvailablePlayersOpen}
          onClose={() => setIsLocalAvailablePlayersOpen(false)}
        />
      )}
    </section>
  );
};
