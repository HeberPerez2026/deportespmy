import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Tournament } from '../../types';
import { useBackHandler } from '../../hooks/useBackHandler';
import {
  Trophy,
  Plus,
  Calendar,
  Clock,
  Users,
  Lock,
  Trash2,
  CheckCircle2,
  X,
  DollarSign,
} from 'lucide-react';

export const TournamentsManager: React.FC = () => {
  const {
    tournaments,
    adminCourts,
    businessProfile,
    currentAdminUser,
    filterTags,
    getSportLabel,
    createTournament,
    updateTournament,
    deleteTournament,
    toggleTournamentTeamPaid,
  } = useApp();

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState(filterTags[0]?.id || 'futbol5');
  const [date, setDate] = useState(today);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('21:00');
  const [courtIds, setCourtIds] = useState<string[]>([]);
  const [blockCourts, setBlockCourts] = useState(true);
  const [maxTeams, setMaxTeams] = useState('8');
  const [entryFee, setEntryFee] = useState('45000');
  const [format, setFormat] = useState('Relámpago 1 día');
  const [prizeDescription, setPrizeDescription] = useState('Trofeo + 2 horas de cancha sin cargo');
  const [description, setDescription] = useState('');

  useBackHandler(showFormModal, () => setShowFormModal(false), 'admin-tournament-create-modal');
  useBackHandler(Boolean(selectedTournament), () => setSelectedTournament(null), 'admin-tournament-teams-modal');

  const adminIdKey = (currentAdminUser?.username || '').trim().toLowerCase();
  const scopedTournaments = tournaments
    .filter((t) => !adminIdKey || !t.adminId || t.adminId.toLowerCase() === adminIdKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  const toggleCourtSelection = (cId: string) => {
    setCourtIds((prev) => (prev.includes(cId) ? prev.filter((x) => x !== cId) : [...prev, cId]));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTournament({
      title: title.trim(),
      sport,
      establishment: businessProfile.complexName || currentAdminUser?.assignedComplex || '',
      date,
      endDate: endDate || undefined,
      startTime,
      endTime,
      courtIds: courtIds.length > 0 ? courtIds : adminCourts.map((c) => c.id),
      blockCourts,
      maxTeams: Math.max(2, Number(maxTeams) || 8),
      entryFee: Math.max(0, Number(entryFee) || 0),
      format: format.trim(),
      prizeDescription: prizeDescription.trim(),
      description: description.trim(),
    });
    setShowFormModal(false);
    setTitle('');
    setDescription('');
    setCourtIds([]);
  };

  const activeTeamsTournament = selectedTournament
    ? tournaments.find((t) => t.id === selectedTournament.id) || selectedTournament
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Competencias &amp; Eventos Especiales
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Torneos Relámpago y Reserva de Eventos
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Creá campeonatos o eventos privados, bloqueá automáticamente las canchas asignadas y administrá los equipos inscriptos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCourtIds(adminCourts.slice(0, 1).map((c) => c.id));
            setShowFormModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Torneo / Evento</span>
        </button>
      </div>

      {scopedTournaments.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-10 text-center space-y-2">
          <Trophy className="w-9 h-9 text-[var(--accent)] mx-auto opacity-80" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            No tenés torneos ni eventos creados todavía
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Publicá tu primer torneo relámpago, copa de pádel o evento privado para recibir inscripciones directas desde la web.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scopedTournaments.map((t) => (
            <div
              key={t.id}
              className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-5 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                      {getSportLabel(t.sport)} · {t.format || 'Torneo'}
                    </span>
                    <h3 className="text-base font-extrabold text-[var(--text-primary)] mt-0.5">
                      {t.title}
                    </h3>
                  </div>
                  <select
                    value={t.status}
                    onChange={(e) =>
                      updateTournament({ ...t, status: e.target.value as Tournament['status'] })
                    }
                    className="bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-2 py-1 text-[11px] font-bold text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="open">Inscripción abierta</option>
                    <option value="full">Cupos completos</option>
                    <option value="ongoing">En curso</option>
                    <option value="finished">Finalizado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                    {t.date.split('-').reverse().join('/')}
                    {t.endDate && t.endDate !== t.date ? ` al ${t.endDate.split('-').reverse().join('/')}` : ''}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                    {t.startTime}–{t.endTime} hs
                  </span>
                  <span className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    ${t.entryFee.toLocaleString('es-AR')} x equipo
                  </span>
                </div>

                {t.blockCourts && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-300 flex items-center gap-1.5 font-semibold">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Bloquea {t.courtIds.length || 1} cancha(s) en la grilla durante el evento
                    </span>
                  </div>
                )}

                {t.prizeDescription && (
                  <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-canvas)] p-2.5 rounded-lg border border-[var(--border-hairline)]">
                    <strong className="text-[var(--text-primary)]">Premios:</strong> {t.prizeDescription}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTournament(t)}
                  className="px-3.5 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>
                    Equipos ({t.teams.length}/{t.maxTeams})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => deleteTournament(t.id)}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                  title="Eliminar torneo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-[var(--border-strong)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-lg font-extrabold text-[var(--text-primary)] font-heading">
                  Crear Torneo o Evento
                </h3>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre del Torneo / Evento *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Copa Relámpago Nocturna Fútbol 5"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Disciplina</label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  >
                    {filterTags.map((ft) => (
                      <option key={ft.id} value={ft.id}>{ft.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Formato</label>
                  <input
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    placeholder="Relámpago / Zonas / Cumpleaños"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Fecha Inicio *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Fecha Fin (Opcional)</label>
                  <input
                    type="date"
                    value={endDate}
                    min={date}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Hora Fin</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Cupo Máx. Equipos</label>
                  <input
                    type="number"
                    min={2}
                    max={64}
                    required
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Inscripción por Equipo ($)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {adminCourts.length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-secondary)]">Canchas afectadas</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-amber-500">
                      <input
                        type="checkbox"
                        checked={blockCourts}
                        onChange={(e) => setBlockCourts(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[var(--accent)]"
                      />
                      <span>Bloquear turnos web automáticamente</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {adminCourts.map((c) => {
                      const active = courtIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCourtSelection(c.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                            active
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Premios / Condiciones</label>
                <input
                  type="text"
                  value={prizeDescription}
                  onChange={(e) => setPrizeDescription(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Reglamento / Descripción breve</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Mínimo 3 partidos garantizados, incluye hidratación y pelotas."
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold cursor-pointer"
                >
                  Publicar Torneo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAMS LIST MODAL */}
      {activeTeamsTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl border border-[var(--border-strong)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                  Equipos Inscriptos ({activeTeamsTournament.teams.length}/{activeTeamsTournament.maxTeams})
                </span>
                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                  {activeTeamsTournament.title}
                </h3>
              </div>
              <button onClick={() => setSelectedTournament(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTeamsTournament.teams.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-6">
                Todavía no se inscribieron equipos.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeTeamsTournament.teams.map((tm, idx) => (
                  <div
                    key={tm.id}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">
                        {idx + 1}. {tm.teamName}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Capitán: {tm.captainName} · <span className="font-mono">{tm.captainPhone}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleTournamentTeamPaid(activeTeamsTournament.id, tm.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer border ${
                        tm.paid
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35'
                          : 'bg-amber-500/15 text-amber-500 border-amber-500/35'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{tm.paid ? 'Inscripción Paga' : 'Marcar Pago'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
