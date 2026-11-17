import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tournament } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';
import { buildGoogleMapsDirectionsUrl } from '../utils/maps';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  DollarSign,
  MapPin,
  X,
  CheckCircle2,
  AlertCircle,
  Navigation,
} from 'lucide-react';

export const TournamentsView: React.FC = () => {
  const {
    tournaments,
    courts,
    profilesByAdmin,
    businessProfile,
    getSportLabel,
    registerTeamInTournament,
    userName,
    userPhone,
    setActiveTab,
  } = useApp();

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState(userName || '');
  const [captainPhone, setCaptainPhone] = useState(userPhone || '+549280');
  const [playersCount, setPlayersCount] = useState('6');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useBackHandler(
    Boolean(selectedTournament),
    () => {
      setSelectedTournament(null);
      setFeedback(null);
    },
    'player-tournament-register-modal'
  );

  const visibleTournaments = tournaments
    .filter((t) => t.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));

  const resolveProfileForTournament = (t: Tournament) => {
    const key = (t.adminId || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return (key && profilesByAdmin[key]) || profilesByAdmin['default'] || businessProfile;
  };

  const handleOpenRegister = (t: Tournament) => {
    setSelectedTournament(t);
    setTeamName('');
    setCaptainName(userName || '');
    setCaptainPhone(userPhone || '+549280');
    setNotes('');
    setFeedback(null);
  };

  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament || !teamName.trim() || !captainName.trim() || !captainPhone.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    const res = await registerTeamInTournament(selectedTournament.id, {
      teamName: teamName.trim(),
      captainName: captainName.trim(),
      captainPhone: captainPhone.trim(),
      playersCount: Math.max(1, Number(playersCount) || 5),
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    setFeedback({ ok: res.ok, text: res.message });
    if (res.ok) {
      setTimeout(() => {
        setSelectedTournament(null);
        setFeedback(null);
      }, 2200);
    }
  };

  const statusMeta: Record<Tournament['status'], { label: string; cls: string }> = {
    open: { label: 'Inscripción abierta', cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35' },
    full: { label: 'Cupos completos', cls: 'bg-amber-500/15 text-amber-500 border-amber-500/35' },
    ongoing: { label: 'En juego', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/35' },
    finished: { label: 'Finalizado', cls: 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]' },
    cancelled: { label: 'Cancelado', cls: 'bg-rose-500/15 text-rose-500 border-rose-500/35' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
            Competencias · Puerto Madryn
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1">
            Torneos Relámpago &amp; Eventos
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            Sumá a tu equipo a los campeonatos oficiales y relámpagos de fin de semana en los complejos deportivos de la ciudad.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('turnos')}
          className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] cursor-pointer shrink-0 self-start sm:self-auto"
        >
          Ver canchas y horarios
        </button>
      </div>

      {visibleTournaments.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)] p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-[var(--accent)] mx-auto opacity-85" />
          <h2 className="text-lg font-extrabold text-[var(--text-primary)]">
            Aún no hay torneos publicados
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Cuando los complejos publiquen sus torneos relámpago o copas por equipo, podrás inscribirte directamente desde acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {visibleTournaments.map((t) => {
            const prof = resolveProfileForTournament(t);
            const spotsLeft = Math.max(0, t.maxTeams - t.teams.length);
            const meta = statusMeta[t.status] || statusMeta.open;
            const tournamentCourts = courts.filter((c) => t.courtIds.includes(c.id));
            const mapsHref = buildGoogleMapsDirectionsUrl(prof, t.establishment || prof.complexName);

            return (
              <div
                key={t.id}
                className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)] p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-sm hover:border-[var(--border-strong)] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                        {getSportLabel(t.sport)} {t.format ? `· ${t.format}` : ''}
                      </span>
                      <h3 className="text-xl font-extrabold text-[var(--text-primary)] mt-0.5 leading-snug">
                        {t.title}
                      </h3>
                      {(t.establishment || prof.complexName) && (
                        <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                          <span>{t.establishment || prof.complexName}</span>
                          {prof.address ? <span className="text-[var(--text-muted)]">· {prof.address}</span> : null}
                        </p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {t.date.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Clock className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {t.startTime}–{t.endTime} hs
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">
                        {t.entryFee > 0 ? `$${t.entryFee.toLocaleString('es-AR')} x equipo` : 'Inscripción gratuita'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Users className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">
                        {t.teams.length}/{t.maxTeams} equipos ({spotsLeft} lib.)
                      </span>
                    </div>
                  </div>

                  {tournamentCourts.length > 0 && (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Canchas: {tournamentCourts.map((c) => c.name).join(', ')}
                    </p>
                  )}

                  {t.prizeDescription && (
                    <div className="text-xs text-[var(--text-secondary)] bg-[var(--accent-soft)]/40 border border-[var(--accent)]/25 rounded-xl p-2.5">
                      <strong className="text-[var(--text-primary)]">Premios:</strong> {t.prizeDescription}
                    </div>
                  )}

                  {t.description && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--border-hairline)]">
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>¿Cómo llegar?</span>
                  </a>

                  {t.status === 'open' && spotsLeft > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleOpenRegister(t)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Inscribir a mi equipo</span>
                    </button>
                  ) : (
                    <span className="flex-1 text-right text-xs font-bold text-[var(--text-muted)]">
                      {t.status === 'finished' ? 'Competencia finalizada' : 'Sin cupos disponibles'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--border-strong)] space-y-4">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                  Inscripción de Equipo
                </span>
                <h3 className="text-lg font-extrabold text-[var(--text-primary)]">{selectedTournament.title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  {selectedTournament.date.split('-').reverse().join('/')} · {selectedTournament.startTime} hs ·{' '}
                  {selectedTournament.entryFee > 0
                    ? `$${selectedTournament.entryFee.toLocaleString('es-AR')} x equipo`
                    : 'Sin costo'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTournament(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  feedback.ok
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-500'
                }`}
              >
                {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTeam} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre del Equipo *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej: Los Piratas FC"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Capitán / Delegado *</label>
                <input
                  type="text"
                  required
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">WhatsApp Capitán *</label>
                  <input
                    type="tel"
                    required
                    value={captainPhone}
                    onChange={(e) => setCaptainPhone(e.target.value)}
                    placeholder="+5492804..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs font-mono text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Cant. Jugadores</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={playersCount}
                    onChange={(e) => setPlayersCount(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Comentarios (Opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Categoría, disponibilidad horaria..."
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setSelectedTournament(null)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Enviando...' : 'Confirmar Inscripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
