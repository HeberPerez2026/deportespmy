import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessProfile, Court, Review, SportType } from '../types';
import { CourtCatalog } from './CourtCatalog';
import { ReviewsSection } from './ReviewsSection';
import { EMPTY_BUSINESS_PROFILE, getIsoDate } from '../data/mockData';
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
  Calendar as CalendarIcon,
  MessageCircle,
  CreditCard,
  Landmark,
  Layers,
  Lock
} from 'lucide-react';

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
  courts: Court[];
  reviews: Review[];
  avgRating: number | null;
  sports: SportType[];
  minPrice: number | null;
  coverImage: string;
  mpAvailable: boolean;
  transferAvailable: boolean;
}

const SPORT_LABELS: Record<SportType, { label: string; emoji: string }> = {
  futbol5: { label: 'Fútbol 5', emoji: '⚽' },
  futbol7: { label: 'Fútbol 7', emoji: '⚽' },
  padel: { label: 'Pádel', emoji: '🎾' },
  tenis: { label: 'Tenis', emoji: '🎾' },
  basquet: { label: 'Básquet', emoji: '🏀' },
};

const FALLBACK_COVERS: Record<SportType, string> = {
  futbol5: 'https://images.unsplash.com/photo-1529900245534-47fbf8204e61?auto=format&fit=crop&w=1200&q=80',
  futbol7: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80',
  padel: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
  tenis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80',
  basquet: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
};

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
  } = useApp();

  const [estSearch, setEstSearch] = useState('');
  const [estSportFilter, setEstSportFilter] = useState<SportType | 'all'>('all');
  const [detailSubTab, setDetailSubTab] = useState<'canchas' | 'opiniones'>('canchas');

  // Group active sports centers across admins & courts
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

    // 1. Seed entries from active standard admins (so configured complexes appear even before adding courts)
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

    // 2. Assign every court to its owning establishment group
    courts.forEach((court) => {
      const ownerKey = normalizeKey(getAdminIdForCourt(court) || court.adminId);
      if (ownerKey && inactiveAdminKeys.has(ownerKey)) return;

      const fallbackSlug = normalizeKey(court.establishment || 'centro-deportivo') || 'centro-deportivo';
      const key = ownerKey || `est_${fallbackSlug}`;

      if (!groups.has(key)) {
        const matchedAdmin = admins.find((a) => normalizeKey(a.username) === ownerKey);
        const prof = (ownerKey && profilesByAdmin[ownerKey]) || profilesByAdmin['default'] || EMPTY_BUSINESS_PROFILE;
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

      // Hide unconfigured empty shells that have neither a name nor courts
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
      const coverImage =
        firstCourt?.images?.[0] ||
        firstCourt?.imageUrl ||
        (firstCourt ? FALLBACK_COVERS[firstCourt.sport] : FALLBACK_COVERS.futbol5);

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
  // VIEW B: INSIDE A SPECIFIC ESTABLISHMENT (100% scoped to this center only)
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

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Establishment Dedicated Hero Header */}
        <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white border-b border-emerald-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
            {/* Back button */}
            <div>
              <button
                type="button"
                onClick={handleBackToDirectory}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Volver a Establecimientos</span>
              </button>
            </div>

            {/* Complex Main Info Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
              <div className="lg:col-span-4 h-48 sm:h-52 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative">
                <img
                  src={selectedEst.coverImage}
                  alt={selectedEst.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500/90 text-slate-950 text-[11px] font-black">
                  {selectedEst.courts.length}{' '}
                  {selectedEst.courts.length === 1 ? 'Cancha disponible' : 'Canchas disponibles'}
                </span>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      Centro Deportivo Habilitado
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black font-heading text-white">
                      {selectedEst.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{selectedEst.address}</span>
                    </p>
                  </div>

                  {selectedEst.avgRating !== null ? (
                    <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-2xl">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-amber-300">
                        {selectedEst.avgRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-300">
                        ({selectedEst.reviews.length}{' '}
                        {selectedEst.reviews.length === 1 ? 'opinión' : 'opiniones'})
                      </span>
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                      Sin opiniones aún
                    </span>
                  )}
                </div>

                {selectedEst.welcomeNotes && (
                  <p className="text-xs sm:text-sm text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 leading-relaxed">
                    {selectedEst.welcomeNotes}
                  </p>
                )}

                {/* Sports & Contact Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedEst.sports.map((sp) => (
                      <span
                        key={sp}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <span>{SPORT_LABELS[sp]?.emoji}</span>
                        <span>{SPORT_LABELS[sp]?.label || sp}</span>
                      </span>
                    ))}
                    {selectedEst.mpAvailable && (
                      <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Mercado Pago
                      </span>
                    )}
                    {selectedEst.transferAvailable && (
                      <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                        <Landmark className="w-3 h-3" />
                        Transferencia CBU/Alias
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp del Complejo</span>
                      </a>
                    )}
                    {selectedEst.email && (
                      <a
                        href={`mailto:${selectedEst.email}`}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedEst.email}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scoped Sub-navigation Tabs inside Establishment */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setDetailSubTab('canchas')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    detailSubTab === 'canchas'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Canchas y Turnos ({selectedEst.courts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailSubTab('opiniones')}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    detailSubTab === 'opiniones'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>Opiniones de este Centro ({selectedEst.reviews.length})</span>
                </button>
              </div>

              {detailSubTab === 'canchas' && (
                <div className="flex flex-wrap items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-emerald-400 hidden sm:inline" />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      selectedDate === todayStr
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(tomorrowStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                      selectedDate === tomorrowStr
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Mañana
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="py-1.5 px-2.5 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 border border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    title="Elegir fecha"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scoped Body Content: ONLY this establishment's courts or reviews */}
        {detailSubTab === 'canchas' ? (
          <div>
            {selectedEst.sports.length > 1 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSport('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    selectedSport === 'all'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos ({selectedEst.courts.length})
                </button>
                {selectedEst.sports.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSelectedSport(sp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1 ${
                      selectedSport === sp
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{SPORT_LABELS[sp]?.emoji}</span>
                    <span>{SPORT_LABELS[sp]?.label || sp}</span>
                  </button>
                ))}
              </div>
            )}

            <CourtCatalog
              onOpenAdminLogin={onOpenAdminLogin}
              courtsOverride={selectedEst.courts}
              complexNameOverride={selectedEst.name}
            />
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
    <div className="min-h-screen bg-slate-50">
      {/* Directory Header Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white border-b border-emerald-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              Guía de Complejos Deportivos
            </span>
            <h1 className="text-2xl sm:text-4xl font-black font-heading">
              Establecimientos y Centros Deportivos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Elegí un complejo deportivo para ver exclusivamente sus canchas, fotos, horarios disponibles, ubicación y opiniones de jugadores.
            </p>
          </div>

          {/* Search and Sport Filters */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-emerald-400" />
              </div>
              <input
                type="text"
                value={estSearch}
                onChange={(e) => setEstSearch(e.target.value)}
                placeholder="Buscar establecimiento por nombre, dirección o cancha..."
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-950/80 border border-slate-700 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {estSearch && (
                <button
                  type="button"
                  onClick={() => setEstSearch('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setEstSportFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                  estSportFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                Todos los Centros ({establishments.length})
              </button>
              {(Object.keys(SPORT_LABELS) as SportType[]).map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setEstSportFilter(sp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer flex items-center gap-1.5 transition-all ${
                    estSportFilter === sp
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <span>{SPORT_LABELS[sp].emoji}</span>
                  <span>{SPORT_LABELS[sp].label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Establishments Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {establishments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
                Aún no hay establecimientos registrados
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
                Cuando los administradores configuren su complejo y publiquen canchas, aparecerán listados aquí para que los jugadores puedan ingresar a cada centro deportivo.
              </p>
            </div>
            {isAdminAuthenticated ? (
              <button
                onClick={() => setActiveTab('admin')}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>Ir al Panel de Administración</span>
              </button>
            ) : (
              <button
                onClick={() => (onOpenAdminLogin ? onOpenAdminLogin() : setActiveTab('admin'))}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Acceso Administrador</span>
              </button>
            )}
          </div>
        ) : filteredEstablishments.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">No se encontraron establecimientos</h3>
            <p className="text-xs text-slate-600">
              Probá limpiando la búsqueda o eligiendo otro deporte.
            </p>
            <button
              type="button"
              onClick={() => {
                setEstSearch('');
                setEstSportFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
            >
              Ver Todos los Establecimientos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEstablishments.map((est) => (
              <div
                key={est.key}
                onClick={() => handleEnterEstablishment(est.key)}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Cover Photo */}
                  <div className="relative h-48 bg-slate-900 overflow-hidden">
                    <img
                      src={est.coverImage}
                      alt={est.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-slate-950/80 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 backdrop-blur-sm">
                        {est.courts.length} {est.courts.length === 1 ? 'Cancha' : 'Canchas'}
                      </span>
                    </div>

                    {est.avgRating !== null && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/85 text-amber-400 text-xs font-bold border border-slate-700 backdrop-blur-sm">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{est.avgRating.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">({est.reviews.length})</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <h3 className="text-lg font-extrabold font-heading leading-tight drop-shadow">
                        {est.name}
                      </h3>
                      <p className="text-xs text-slate-200 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{est.address}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    {est.sports.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {est.sports.map((sp) => (
                          <span
                            key={sp}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/70"
                          >
                            {SPORT_LABELS[sp]?.emoji} {SPORT_LABELS[sp]?.label || sp}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Complejo en configuración de canchas.</p>
                    )}

                    {est.welcomeNotes && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {est.welcomeNotes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {est.mpAvailable && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold">
                          Mercado Pago
                        </span>
                      )}
                      {est.transferAvailable && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          Transferencia CBU/Alias
                        </span>
                      )}
                      {est.whatsappNumber && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {est.whatsappNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {est.minPrice !== null ? (
                      <>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">
                          Turnos desde
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          ${est.minPrice.toLocaleString('es-AR')}
                          <span className="text-[11px] font-normal text-slate-500">/h</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold">Ver perfil del centro</span>
                    )}
                  </div>

                  <span className="px-4 py-2 rounded-xl bg-slate-900 group-hover:bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors">
                    <span>Ingresar</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
