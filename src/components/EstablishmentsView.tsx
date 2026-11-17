import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessProfile, Court, Review, SportType } from '../types';
import { CourtCatalog } from './CourtCatalog';
import { ReviewsSection } from './ReviewsSection';
import { SocialFeedShowcase } from './SocialFeedShowcase';
import { EMPTY_BUSINESS_PROFILE, getIsoDate } from '../data/mockData';
import { useBackHandler } from '../hooks/useBackHandler';
import {
  resolveCourtCoverImage,
  SPORT_DEFAULT_IMAGES,
  SPORT_DISPLAY_LABELS,
  FALLBACK_COURT_SVG,
} from '../data/courtMedia';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  ChevronRight,
  ArrowLeft,
  Search,
  X,
  MessageCircle,
  Lock,
  Navigation,
} from 'lucide-react';
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsEmbedUrl } from '../utils/maps';

interface EstablishmentsViewProps {
  onOpenAdminLogin?: () => void;
}

interface EstablishmentItem {
  key: string;
  name: string;
  address: string;
  whatsappNumber: string;
  email: string;
  welcomeNotes: string;
  profile: BusinessProfile;
  courts: Court[];
  reviews: Review[];
  avgRating: number | null;
  sports: SportType[];
  minPrice: number | null;
  coverImage: string;
  mpAvailable: boolean;
  transferAvailable: boolean;
}

const normalizeKey = (val?: string | null): string =>
  (val || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

export const EstablishmentsView: React.FC<EstablishmentsViewProps> = ({ onOpenAdminLogin }) => {
  const {
    courts,
    reviews,
    admins,
    profilesByAdmin,
    getAdminIdForCourt,
    selectedEstablishmentKey,
    setSelectedEstablishmentKey,
    selectedDate,
    setSelectedDate,
    selectedSport,
    setSelectedSport,
    isAdminAuthenticated,
    setActiveTab,
    siteContent,
    filterTags,
    getSportLabel,
  } = useApp();

  const [estSearch, setEstSearch] = useState('');
  const [estSportFilter, setEstSportFilter] = useState<SportType | 'all'>('all');
  const [detailSubTab, setDetailSubTab] = useState<'canchas' | 'opiniones'>('canchas');

  useBackHandler(Boolean(selectedEstablishmentKey), () => setSelectedEstablishmentKey(null), 'establishment-detail');

  const establishments = useMemo<EstablishmentItem[]>(() => {
    const groups = new Map<
      string,
      {
        key: string;
        profile: BusinessProfile;
        assignedComplex?: string;
        adminEmail?: string;
        adminPhone?: string;
        courts: Court[];
      }
    >();

    const inactiveAdminKeys = new Set(
      admins.filter((a) => !a.isActive).map((a) => normalizeKey(a.username))
    );

    admins
      .filter((a) => a.isActive && a.role === 'admin')
      .forEach((adm) => {
        const key = normalizeKey(adm.username);
        if (!key) return;
        const prof = profilesByAdmin[key] || EMPTY_BUSINESS_PROFILE;
        groups.set(key, {
          key,
          profile: prof,
          assignedComplex: adm.assignedComplex,
          adminEmail: adm.email,
          adminPhone: adm.phone,
          courts: [],
        });
      });

    courts.forEach((court) => {
      const ownerKey = normalizeKey(getAdminIdForCourt(court) || court.adminId);
      if (ownerKey && inactiveAdminKeys.has(ownerKey)) return;

      const fallbackSlug = normalizeKey(court.establishment || 'centro-deportivo') || 'centro-deportivo';
      const key = ownerKey || `est_${fallbackSlug}`;

      if (!groups.has(key)) {
        const matchedAdmin = admins.find((a) => normalizeKey(a.username) === ownerKey);
        const prof =
          (ownerKey && profilesByAdmin[ownerKey]) ||
          profilesByAdmin['default'] ||
          EMPTY_BUSINESS_PROFILE;
        groups.set(key, {
          key,
          profile: prof,
          assignedComplex: matchedAdmin?.assignedComplex || court.establishment,
          adminEmail: matchedAdmin?.email,
          adminPhone: matchedAdmin?.phone,
          courts: [],
        });
      }

      groups.get(key)!.courts.push(court);
    });

    const list: EstablishmentItem[] = [];
    groups.forEach((grp) => {
      const name = (
        grp.profile.complexName ||
        grp.assignedComplex ||
        grp.courts[0]?.establishment ||
        ''
      ).trim();

      if (!name && grp.courts.length === 0) return;

      const courtIds = new Set(grp.courts.map((c) => c.id));
      const estReviews = reviews.filter((r) => courtIds.has(r.courtId));
      const avgRating =
        estReviews.length > 0
          ? estReviews.reduce((sum, r) => sum + r.rating, 0) / estReviews.length
          : null;

      const sports = Array.from(new Set(grp.courts.map((c) => c.sport)));
      const prices = grp.courts
        .flatMap((c) => [c.hourlyRateDay, c.hourlyRateNight])
        .filter((p) => Number.isFinite(p) && p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : null;

      const firstCourt = grp.courts[0];
      const coverImage = firstCourt
        ? resolveCourtCoverImage(firstCourt.sport, firstCourt.images, firstCourt.imageUrl)
        : SPORT_DEFAULT_IMAGES.futbol5;

      const mpAvailable =
        !grp.profile.mpPaused &&
        Boolean(
          grp.profile.mpOAuthConnected ||
            grp.profile.mpAccessToken ||
            grp.profile.alias?.trim() ||
            (grp.profile.mpLink && grp.profile.mpLink.trim().startsWith('http'))
        );
      const transferAvailable =
        !grp.profile.transferPaused &&
        Boolean(grp.profile.cbu?.trim() || grp.profile.alias?.trim());

      list.push({
        key: grp.key,
        name: name || 'Centro Deportivo',
        address: grp.profile.address?.trim() || 'Puerto Madryn, Chubut',
        whatsappNumber: grp.profile.whatsappNumber?.trim() || grp.adminPhone || '',
        email: grp.profile.email?.trim() || grp.adminEmail || '',
        welcomeNotes: grp.profile.welcomeNotes?.trim() || '',
        profile: grp.profile,
        courts: grp.courts,
        reviews: estReviews,
        avgRating,
        sports,
        minPrice,
        coverImage,
        mpAvailable,
        transferAvailable,
      });
    });

    return list.sort((a, b) => b.courts.length - a.courts.length || a.name.localeCompare(b.name));
  }, [admins, courts, profilesByAdmin, reviews, getAdminIdForCourt]);

  const selectedEst = useMemo(
    () => establishments.find((e) => e.key === selectedEstablishmentKey) || null,
    [establishments, selectedEstablishmentKey]
  );

  const filteredEstablishments = useMemo(() => {
    return establishments.filter((est) => {
      if (estSportFilter !== 'all' && !est.sports.includes(estSportFilter)) {
        return false;
      }
      if (estSearch.trim()) {
        const q = estSearch.toLowerCase().trim();
        const matchName = est.name.toLowerCase().includes(q);
        const matchAddress = est.address.toLowerCase().includes(q);
        const matchCourts = est.courts.some((c) => c.name.toLowerCase().includes(q));
        if (!matchName && !matchAddress && !matchCourts) {
          return false;
        }
      }
      return true;
    });
  }, [establishments, estSearch, estSportFilter]);

  const handleEnterEstablishment = (key: string) => {
    setSelectedEstablishmentKey(key);
    setSelectedSport('all');
    setDetailSubTab('canchas');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDirectory = () => {
    setSelectedEstablishmentKey(null);
    setSelectedSport('all');
    setDetailSubTab('canchas');
  };

  // ============================================================================
  // VIEW B: INSIDE A SPECIFIC ESTABLISHMENT
  // ============================================================================
  if (selectedEst) {
    const todayStr = getIsoDate(0);
    const tomorrowStr = getIsoDate(1);
    const cleanPhone = selectedEst.whatsappNumber.replace(/\D/g, '');
    const waHref = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          `¡Hola ${selectedEst.name}! Te escribo desde DeportesPMY para consultar por turnos.`
        )}`
      : null;

    const paymentMethodsList: string[] = [];
    if (selectedEst.mpAvailable) paymentMethodsList.push('Mercado Pago');
    if (selectedEst.transferAvailable) paymentMethodsList.push('Transferencia CBU/Alias');
    const selectedMapsDirectionsUrl = buildGoogleMapsDirectionsUrl(selectedEst.profile, selectedEst.name);
    const selectedMapsEmbedUrl = buildGoogleMapsEmbedUrl(selectedEst.profile, selectedEst.name);

    return (
      <div className="min-h-screen bg-[var(--bg-canvas)]">
        {/* Establishment Header */}
        <div className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            <div>
              <button
                type="button"
                onClick={handleBackToDirectory}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{siteContent.estBackToDirectoryLabel}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              <div className="lg:col-span-4 aspect-[16/10] rounded-xl overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-hairline)] relative">
                <img
                  src={selectedEst.coverImage}
                  alt={selectedEst.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = FALLBACK_COURT_SVG;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/70 text-white text-xs font-semibold tabular-nums">
                  {selectedEst.courts.length}{' '}
                  {selectedEst.courts.length === 1 ? 'cancha' : 'canchas'}
                </span>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-1">
                      {siteContent.estDetailBadgeLabel}
                    </p>
                    <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
                      {selectedEst.name}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      <span>{selectedEst.address}</span>
                    </p>
                  </div>

                  {selectedEst.avgRating !== null ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs font-semibold tabular-nums">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                      <span className="text-[var(--text-primary)] font-mono">
                        {selectedEst.avgRating.toFixed(1)}
                      </span>
                      <span className="text-[var(--text-muted)]">
                        ({selectedEst.reviews.length}{' '}
                        {selectedEst.reviews.length === 1 ? 'opinión' : 'opiniones'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Sin opiniones aún</span>
                  )}
                </div>

                {selectedEst.welcomeNotes && (
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                    {selectedEst.welcomeNotes}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border-hairline)] text-xs">
                  <div className="space-y-1 text-[var(--text-secondary)]">
                    {selectedEst.sports.length > 0 && (
                      <p>
                        <span className="font-semibold text-[var(--text-primary)]">Disciplinas: </span>
                        {selectedEst.sports.map((sp) => getSportLabel(sp)).join(' · ')}
                      </p>
                    )}
                    {paymentMethodsList.length > 0 && (
                      <p>
                        <span className="font-semibold text-[var(--text-primary)]">Cobros habilitados: </span>
                        {paymentMethodsList.join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={selectedMapsDirectionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent-soft-text)] font-semibold text-xs inline-flex items-center gap-1.5 transition-opacity whitespace-nowrap"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>¿Cómo llegar?</span>
                    </a>
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>{siteContent.estWhatsappButtonLabel}</span>
                      </a>
                    )}
                    {selectedEst.email && (
                      <a
                        href={`mailto:${selectedEst.email}`}
                        className="px-3.5 py-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)] text-[var(--text-primary)] font-medium text-xs inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>{selectedEst.email}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Sub-navigation Underline Tabs + Date Picker */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border-hairline)]">
              <div className="flex items-center gap-6 text-sm">
                <button
                  type="button"
                  onClick={() => setDetailSubTab('canchas')}
                  className={`py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    detailSubTab === 'canchas'
                      ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {siteContent.estCourtsTabLabel} ({selectedEst.courts.length})
                </button>

                <button
                  type="button"
                  onClick={() => setDetailSubTab('opiniones')}
                  className={`py-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    detailSubTab === 'opiniones'
                      ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                      : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {siteContent.estReviewsTabLabel} ({selectedEst.reviews.length})
                </button>
              </div>

              {detailSubTab === 'canchas' && (
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border cursor-pointer transition-colors ${
                      selectedDate === todayStr
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {siteContent.heroTodayLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(tomorrowStr)}
                    className={`px-3 py-1.5 rounded-lg font-semibold border cursor-pointer transition-colors ${
                      selectedDate === tomorrowStr
                        ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {siteContent.heroTomorrowLabel}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="py-1.5 px-2.5 text-xs font-mono rounded-lg bg-[var(--bg-canvas)] text-[var(--text-primary)] border border-[var(--border-hairline)] cursor-pointer focus:outline-none focus:border-[var(--accent)]"
                    title="Elegir fecha"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scoped Body Content */}
        {detailSubTab === 'canchas' ? (
          <div>
            {selectedEst.sports.length > 1 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSport('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                    selectedSport === 'all'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-[var(--accent)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  Todas ({selectedEst.courts.length})
                </button>
                {selectedEst.sports.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSelectedSport(sp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      selectedSport === sp
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-[var(--accent)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {getSportLabel(sp)}
                  </button>
                ))}
              </div>
            )}

            <CourtCatalog
              onOpenAdminLogin={onOpenAdminLogin}
              courtsOverride={selectedEst.courts}
              complexNameOverride={selectedEst.name}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
              <SocialFeedShowcase profile={selectedEst.profile} complexName={selectedEst.name} />
            </div>
          </div>
        ) : (
          <ReviewsSection
            courtsOverride={selectedEst.courts}
            complexNameOverride={selectedEst.name}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW A: ALL ESTABLISHMENTS DIRECTORY
  // ============================================================================
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)]">
      {/* Editorial Directory Header */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-hairline)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold text-[var(--accent-soft-text)]">
              {siteContent.estEyebrow}
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] leading-tight">
              {siteContent.estTitle}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {siteContent.estSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2">
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={estSearch}
                onChange={(e) => setEstSearch(e.target.value)}
                placeholder={siteContent.estSearchPlaceholder}
                className="w-full h-11 pl-10 pr-9 text-sm bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              {estSearch && (
                <button
                  type="button"
                  onClick={() => setEstSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="lg:col-span-7 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEstSportFilter('all')}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                  estSportFilter === 'all'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-[var(--accent)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                {siteContent.estAllSportsLabel} ({establishments.length})
              </button>
              {filterTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setEstSportFilter(tag.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                    estSportFilter === tag.id
                      ? 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-[var(--accent)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Establishments Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {establishments.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
            <div className="w-12 h-12 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
                {siteContent.estEmptyTitle}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
                {siteContent.estEmptySubtitle}
              </p>
            </div>
            {isAdminAuthenticated ? (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Ir al Panel de Administración</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (onOpenAdminLogin ? onOpenAdminLogin() : setActiveTab('admin'))}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Acceso Clubes</span>
              </button>
            )}
          </div>
        ) : filteredEstablishments.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-8 sm:p-10 text-center max-w-md mx-auto space-y-4">
            <Search className="w-7 h-7 text-[var(--text-muted)] mx-auto" />
            <h3 className="font-heading text-xl font-bold text-[var(--text-primary)]">
              No se encontraron establecimientos
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Probá limpiando la búsqueda o seleccionando otro deporte.
            </p>
            <button
              type="button"
              onClick={() => {
                setEstSearch('');
                setEstSportFilter('all');
              }}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] font-semibold text-xs cursor-pointer"
            >
              Ver todos los complejos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEstablishments.map((est) => {
              const paymentInfo = [
                est.mpAvailable ? 'Mercado Pago' : '',
                est.transferAvailable ? 'Transferencia CBU/Alias' : '',
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <article
                  key={est.key}
                  onClick={() => handleEnterEstablishment(est.key)}
                  className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors duration-150 overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-[var(--bg-subtle)] overflow-hidden">
                      <img
                        src={est.coverImage}
                        alt={est.name}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_COURT_SVG;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between text-xs">
                        <span className="px-2.5 py-1 rounded-md bg-black/70 text-white font-semibold tabular-nums">
                          {est.courts.length} {est.courts.length === 1 ? 'cancha' : 'canchas'}
                        </span>

                        {est.avgRating !== null && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/70 text-amber-300 font-mono font-semibold tabular-nums">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {est.avgRating.toFixed(1)} ({est.reviews.length})
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3.5 left-4 right-4 text-white">
                        <h3 className="font-heading text-xl font-bold leading-tight">
                          {est.name}
                        </h3>
                        <p className="text-xs text-white/85 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{est.address}</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-5 space-y-2.5 text-xs">
                      {est.sports.length > 0 ? (
                        <p className="font-semibold text-[var(--text-primary)]">
                          {est.sports.map((sp) => getSportLabel(sp)).join(' · ')}
                        </p>
                      ) : (
                        <p className="text-[var(--text-muted)]">Complejo en configuración</p>
                      )}

                      {est.welcomeNotes && (
                        <p className="text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {est.welcomeNotes}
                        </p>
                      )}

                      {(paymentInfo || est.whatsappNumber) && (
                        <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--text-muted)]">
                          {paymentInfo && <span>{paymentInfo}</span>}
                          {est.whatsappNumber && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3" />
                              {est.whatsappNumber}
                            </span>
                          )}
                        </div>
                      )}

                      <div>
                        <a
                          href={buildGoogleMapsDirectionsUrl(est.profile, est.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-soft-text)] hover:underline"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>¿Cómo llegar? en Google Maps</span>
                        </a>
                      </div>

                      <SocialFeedShowcase profile={est.profile} complexName={est.name} compact />
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border-hairline)] flex items-center justify-between">
                    <div>
                      {est.minPrice !== null ? (
                        <>
                          <span className="text-[11px] text-[var(--text-muted)] block">
                            {siteContent.estMinPriceLabel}
                          </span>
                          <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                            ${est.minPrice.toLocaleString('es-AR')}
                            <span className="text-xs font-normal text-[var(--text-muted)]">/h</span>
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)] font-medium">
                          Ver perfil del complejo
                        </span>
                      )}
                    </div>

                    <span className="px-3.5 py-2 rounded-lg bg-[var(--accent)] group-hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs inline-flex items-center gap-1 transition-colors">
                      <span>{siteContent.estEnterButtonLabel}</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
