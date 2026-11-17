import React from 'react';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';
import { getIsoDate } from '../data/mockData';
import stadiumBackdrop from '../assets/images/court_futbol_turf_1794821625058.jpg';
import { Calendar, Search, X, MapPin, ShieldCheck, MessageCircle } from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    selectedSport,
    setSelectedSport,
    searchQuery,
    setSearchQuery,
    courts,
    siteContent,
    filterTags,
  } = useApp();

  const sportsFilter: { id: SportType | 'all'; label: string }[] = [
    { id: 'all', label: siteContent.heroAllSportsLabel },
    ...filterTags.map(tag => ({ id: tag.id, label: tag.label }))
  ];

  const activeCourtsCount = courts.filter((c) => c.status === 'active').length;
  const todayIso = getIsoDate(0);
  const tomorrowIso = getIsoDate(1);
  const complexesCount = new Set(
    courts
      .map((c) => (c.establishment || c.adminId || '').trim().toLowerCase())
      .filter(Boolean)
  ).size;

  return (
    <section className="relative overflow-hidden border-b border-[var(--border-hairline)] bg-[var(--bg-hero)] text-[var(--text-primary)]">
      {/* Real turf photography with atmospheric dual-theme floodlight scrim */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <img
          src={stadiumBackdrop}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover opacity-15 dark:opacity-20 saturate-75"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 12% 18%, var(--hero-glow), transparent 46%), radial-gradient(circle at 88% 22%, var(--hero-glow-2), transparent 44%), var(--hero-scrim)`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-11 space-y-6">
        {/* Top Row: Title + Quick Scoreboard KPIs */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
              <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-bright)' }} />
              <span>{siteContent.heroLocationEyebrow}</span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-[var(--text-primary)] uppercase leading-[1.02]">
              {siteContent.heroTitle}
            </h1>

            <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-xl leading-relaxed">
              {siteContent.heroSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-hairline)] flex flex-col items-center justify-center text-center min-w-[108px]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block">
                {siteContent.heroKpiCourtsLabel}
              </span>
              <strong className="font-mono text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                {activeCourtsCount}
              </strong>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-hairline)] flex flex-col items-center justify-center text-center min-w-[108px]">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block">
                {siteContent.heroKpiComplexesLabel}
              </span>
              <strong className="font-mono text-base font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                {complexesCount || (activeCourtsCount > 0 ? 1 : 0)}
              </strong>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-hairline)] text-[var(--text-secondary)]">
              <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-bright)' }} />
              <span className="font-medium">{siteContent.heroBadgeMpLabel}</span>
            </div>
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)]/95 border border-[var(--border-hairline)] text-[var(--text-secondary)]">
              <MessageCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-bright)' }} />
              <span className="font-medium">{siteContent.heroBadgeWaLabel}</span>
            </div>
          </div>
        </div>

        {/* Search & Date Filter Toolbar */}
        <div className="bg-[var(--bg-surface)]/95 border border-[var(--border-hairline)] rounded-2xl p-3 sm:p-4 space-y-3 shadow-md">
          <div className="flex flex-col md:flex-row gap-2.5">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={siteContent.heroSearchPlaceholder}
                className="w-full h-11 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl pl-10 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-bright)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                {siteContent.heroTodayLabel}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowIso)}
                className={`h-11 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  selectedDate === tomorrowIso
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                }`}
              >
                {siteContent.heroTomorrowLabel}
              </button>
              <div className="relative h-11 flex items-center bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl px-3">
                <Calendar className="w-4 h-4 text-[var(--text-muted)] mr-2 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  min={todayIso}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Sport Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
            {sportsFilter.map((s) => {
              const active = selectedSport === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSport(s.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    active
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
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
