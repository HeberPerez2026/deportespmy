import React from 'react';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';
import { getIsoDate } from '../data/mockData';
import stadiumBackdrop from '../assets/images/court_futbol_turf_1794821625058.jpg';
import { Calendar, Search, X, MapPin, ShieldCheck, MessageCircle } from 'lucide-react';

const SPORTS_FILTER: { id: SportType | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos los deportes' },
  { id: 'futbol5', label: 'Fútbol 5' },
  { id: 'padel', label: 'Pádel' },
  { id: 'futbol7', label: 'Fútbol 7' },
  { id: 'tenis', label: 'Tenis' },
  { id: 'basquet', label: 'Básquetbol' },
];

export const HeroBanner: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    selectedSport,
    setSelectedSport,
    searchQuery,
    setSearchQuery,
    courts,
    businessProfile,
  } = useApp();

  const activeCourtsCount = courts.filter((c) => c.status === 'active').length;
  const todayIso = getIsoDate(0);
  const tomorrowIso = getIsoDate(1);
  const complexesCount = new Set(
    courts
      .map((c) => (c.establishment || c.adminId || '').trim().toLowerCase())
      .filter(Boolean)
  ).size;

  return (
    <section className="relative overflow-hidden border-b border-[#2A313C] bg-[#090D12] text-[#F3F4F6]">
      {/* Real turf photography with atmospheric Estadio Nocturno floodlight scrim */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img
          src={stadiumBackdrop}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-20 saturate-75"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 12% 18%, var(--hero-glow), transparent 46%), radial-gradient(circle at 88% 22%, var(--hero-glow-2), transparent 44%), linear-gradient(180deg, rgba(9, 13, 18, 0.88) 0%, rgba(13, 17, 23, 0.96) 100%)`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-11 space-y-6">
        {/* Top Row: Title + Quick Scoreboard KPIs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#CBD5E1]">
              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent-bright)' }} />
              <span>Puerto Madryn, Chubut · Reservas Online · Turnos de 1 hora</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[#F3F4F6] uppercase leading-[1.02]">
              {businessProfile.complexName
                ? `Reservá tu cancha en ${businessProfile.complexName}`
                : 'Reservá tu cancha en Puerto Madryn'}
            </h1>

            <p className="text-sm sm:text-base text-[#CBD5E1] max-w-xl leading-relaxed">
              Consultá horarios disponibles en tiempo real, elegí seña 50% o pago total y recibí tu comprobante al instante por WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#161B22]/90 border border-[#2A313C]">
              <span className="text-[10px] uppercase tracking-wider text-[#8B949E] block">
                Canchas activas
              </span>
              <strong className="font-mono text-base font-bold text-[#F3F4F6] tabular-nums">
                {activeCourtsCount}
              </strong>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-[#161B22]/90 border border-[#2A313C]">
              <span className="text-[10px] uppercase tracking-wider text-[#8B949E] block">
                Complejos
              </span>
              <strong className="font-mono text-base font-bold text-[#F3F4F6] tabular-nums">
                {complexesCount || (activeCourtsCount > 0 ? 1 : 0)}
              </strong>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#161B22]/90 border border-[#2A313C] text-[#CBD5E1]">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-bright)' }} />
              <span className="font-medium">Mercado Pago &amp; Transferencia</span>
            </div>
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#161B22]/90 border border-[#2A313C] text-[#CBD5E1]">
              <MessageCircle className="w-4 h-4" style={{ color: 'var(--accent-bright)' }} />
              <span className="font-medium">Confirmación WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Search & Date Filter Toolbar */}
        <div className="bg-[#161B22]/95 border border-[#2A313C] rounded-2xl p-3 sm:p-4 space-y-3 shadow-lg">
          <div className="flex flex-col md:flex-row gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#8B949E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cancha, establecimiento o superficie..."
                className="w-full h-11 bg-[#0D1117] border border-[#2A313C] rounded-xl pl-10 pr-9 text-sm text-[#F3F4F6] placeholder:text-[#8B949E] focus:outline-none focus:border-[var(--accent-bright)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8B949E] hover:text-[#F3F4F6] cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Date Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className={`h-11 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedDate === todayIso
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                    : 'bg-[#0D1117] text-[#CBD5E1] border-[#2A313C] hover:border-[#3B4454]'
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowIso)}
                className={`h-11 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedDate === tomorrowIso
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                    : 'bg-[#0D1117] text-[#CBD5E1] border-[#2A313C] hover:border-[#3B4454]'
                }`}
              >
                Mañana
              </button>
              <div className="relative h-11 flex items-center bg-[#0D1117] border border-[#2A313C] rounded-xl px-3">
                <Calendar className="w-4 h-4 text-[#8B949E] mr-2 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  min={todayIso}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-semibold text-[#F3F4F6] focus:outline-none cursor-pointer tabular-nums"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          {/* Sport Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
            {SPORTS_FILTER.map((s) => {
              const active = selectedSport === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSport(s.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                      : 'bg-[#0D1117] text-[#CBD5E1] border-[#2A313C] hover:text-[#F3F4F6] hover:border-[#3B4454]'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
