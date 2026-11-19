import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Tournament, TournamentTeam } from '../../types';
import { useBackHandler } from '../../hooks/useBackHandler';
import { getSafeReceiptUrl } from '../../utils/imageUpload';
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
  AlertTriangle,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type TeamPaymentAction =
  | { type: 'approve_or_mark_paid'; tournament: Tournament; team: TournamentTeam }
  | { type: 'refund'; tournament: Tournament; team: TournamentTeam };

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
    confirmTournamentTeamPayment,
    refundTournamentTeam,
  } = useApp();

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // Delete confirmation & unrefunded block state
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Tournament | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Team payment confirmation & refund state
  const [paymentActionTarget, setPaymentActionTarget] = useState<TeamPaymentAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [manualRefundPrompt, setManualRefundPrompt] = useState<string | null>(null);
  const [managerNotice, setManagerNotice] = useState<string | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptZoomed, setReceiptZoomed] = useState(false);
  const [receiptLoadError, setReceiptLoadError] = useState(false);

  const openReceiptPreview = (rawUrl?: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const safe = getSafeReceiptUrl(rawUrl);
    if (!safe) return;
    setReceiptLoadError(false);
    setReceiptZoomed(false);
    setReceiptPreviewUrl(safe);
  };

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
  useBackHandler(
    Boolean(deleteConfirmTarget),
    () => {
      if (!actionBusy) {
        setDeleteConfirmTarget(null);
        setDeleteErrorMsg(null);
      }
    },
    'admin-tournament-delete-modal'
  );
  useBackHandler(
    Boolean(paymentActionTarget),
    () => {
      if (!actionBusy) {
        setPaymentActionTarget(null);
        setActionError(null);
        setManualRefundPrompt(null);
      }
    },
    'admin-tournament-payment-confirm-modal'
  );
  useBackHandler(Boolean(receiptPreviewUrl), () => setReceiptPreviewUrl(null), 'admin-tournament-receipt-modal');

  const adminIdKey = (currentAdminUser?.username || '').trim().toLowerCase();
  const scopedTournaments = tournaments
    .filter((t) => !adminIdKey || !t.adminId || t.adminId.toLowerCase() === adminIdKey)
    .sort((a, b) => b.date.localeCompare(a.date));

  const toggleCourtSelection = (cId: string) => {
    setCourtIds((prev) => (prev.includes(cId) ? prev.filter((x) => x !== cId) : [...prev, cId]));
  };

  const showTempNotice = (msg: string) => {
    setManagerNotice(msg);
    setTimeout(() => setManagerNotice(null), 5500);
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

  const handleExecuteDeleteTournament = async () => {
    if (!deleteConfirmTarget) return;
    setActionBusy(true);
    setDeleteErrorMsg(null);
    const res = await deleteTournament(deleteConfirmTarget.id);
    setActionBusy(false);
    if (!res.ok) {
      setDeleteErrorMsg(res.message || 'Debés devolver el dinero de las inscripciones pagas antes de eliminar.');
      return;
    }
    const deletedTitle = deleteConfirmTarget.title;
    setDeleteConfirmTarget(null);
    showTempNotice(`Torneo "${deletedTitle}" eliminado correctamente.`);
  };

  const handleConfirmPaymentAction = async (forceManual = false) => {
    if (!paymentActionTarget) return;
    setActionBusy(true);
    setActionError(null);

    if (paymentActionTarget.type === 'approve_or_mark_paid') {
      const { tournament, team } = paymentActionTarget;
      await confirmTournamentTeamPayment(
        tournament.id,
        team.id,
        team.paymentReference || `ADMIN-OK-${Date.now().toString().slice(-4)}`,
        Number(team.amountPaid || tournament.entryFee || 0)
      );
      setActionBusy(false);
      setPaymentActionTarget(null);
      showTempNotice(`Pago confirmado para el equipo "${team.teamName}" (#${team.bookingCode || 'TRN'}).`);
      return;
    }

    // Refund team inscription
    const { tournament, team } = paymentActionTarget;
    const res = await refundTournamentTeam(tournament.id, team.id, { forceManual });
    setActionBusy(false);
    if (!res.success) {
      if (res.manualRefundRequired) {
        setManualRefundPrompt(res.message || 'No se pudo reembolsar automáticamente por MP.');
      } else {
        setActionError(res.message || 'Error al procesar devolución.');
      }
      return;
    }

    setPaymentActionTarget(null);
    setManualRefundPrompt(null);
    showTempNotice(res.message || `Devolución completada para "${team.teamName}".`);
  };

  const getUnrefundedPaidTeams = (t: Tournament): TournamentTeam[] =>
    (t.teams || []).filter((tm) => {
      if (tm.refunded || tm.paymentStatus === 'refunded') return false;
      const paidAmt = Number(tm.amountPaid ?? (tm.paid ? t.entryFee : 0));
      return Boolean(tm.paid || tm.paymentStatus === 'paid' || (tm.paymentStatus === 'awaiting_approval' && paidAmt > 0));
    });

  const activeTeamsTournament = selectedTournament
    ? tournaments.find((t) => t.id === selectedTournament.id) || selectedTournament
    : null;

  const liveDeleteTarget = deleteConfirmTarget
    ? tournaments.find((t) => t.id === deleteConfirmTarget.id) || deleteConfirmTarget
    : null;

  return (
    <div className="space-y-6">
      {managerNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-200 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{managerNotice}</span>
          </div>
          <button type="button" onClick={() => setManagerNotice(null)} className="cursor-pointer opacity-75 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Competencias &amp; Eventos Especiales
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Torneos Relámpago y Reserva de Eventos
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Creá campeonatos o eventos privados, bloqueá automáticamente las canchas asignadas y administrá los pagos y devoluciones de equipos.
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
          {scopedTournaments.map((t) => {
            const activeCount = (t.teams || []).filter((tm) => !tm.refunded && tm.paymentStatus !== 'refunded').length;
            const awaitingCount = (t.teams || []).filter((tm) => !tm.refunded && tm.paymentStatus === 'awaiting_approval').length;
            return (
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
                    <span className="flex items-center gap-1 font-bold text-[var(--text-primary)] tabular-nums">
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
                      Equipos ({activeCount}/{t.maxTeams})
                    </span>
                    {awaitingCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black">
                        {awaitingCount} por aprobar
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteErrorMsg(null);
                      setDeleteConfirmTarget(t);
                    }}
                    className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer"
                    title="Eliminar torneo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-strong)] space-y-4 my-auto">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[var(--border-strong)] space-y-4 my-auto">
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
                {activeTeamsTournament.teams.map((tm, idx) => {
                  const isPaid = !tm.refunded && (Boolean(tm.paid) || tm.paymentStatus === 'paid');
                  const isAwaiting = !tm.refunded && tm.paymentStatus === 'awaiting_approval';
                  const isRefunded = Boolean(tm.refunded || tm.paymentStatus === 'refunded');
                  const paidAmt = Number(tm.amountPaid ?? (isPaid ? activeTeamsTournament.entryFee : 0));

                  return (
                    <div
                      key={tm.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-[var(--text-primary)]">
                            {idx + 1}. {tm.teamName}
                          </p>
                          {tm.bookingCode && (
                            <span className="text-[10px] font-mono bg-[var(--bg-surface)] px-1.5 py-0.5 rounded border border-[var(--border-hairline)] text-[var(--text-muted)]">
                              #{tm.bookingCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Capitán: {tm.captainName} · <span className="font-mono">{tm.captainPhone}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          {tm.paymentMethod && (
                            <span className="uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                              {tm.paymentMethod}
                            </span>
                          )}
                          {tm.receiptUrl && (
                            <button
                              type="button"
                              onClick={(e) => openReceiptPreview(tm.receiptUrl, e)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Ver Comprobante</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {isRefunded ? (
                          <span className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold text-[11px]">
                            ↩ Reembolsado ${(tm.refundAmount ?? paidAmt).toLocaleString('es-AR')}
                          </span>
                        ) : isPaid ? (
                          <>
                            <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/35 font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pago ${paidAmt.toLocaleString('es-AR')}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null);
                                setManualRefundPrompt(null);
                                setPaymentActionTarget({ type: 'refund', tournament: activeTeamsTournament, team: tm });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/35 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Devolver</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActionError(null);
                                setPaymentActionTarget({ type: 'approve_or_mark_paid', tournament: activeTeamsTournament, team: tm });
                              }}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer border ${
                                isAwaiting
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border-amber-500/35'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isAwaiting ? 'Aprobar Comprobante' : 'Marcar Pago'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TOURNAMENT MODAL (BLOCKS UNTIL ALL PAID FEES ARE REFUNDED) */}
      {liveDeleteTarget && (() => {
        const unrefundedTeams = getUnrefundedPaidTeams(liveDeleteTarget);
        const unrefundedTotal = unrefundedTeams.reduce(
          (sum, tm) => sum + Number(tm.amountPaid ?? (tm.paid ? liveDeleteTarget.entryFee : 0)),
          0
        );

        return (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-500/40 space-y-4 my-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                      ¿Eliminar torneo &quot;{liveDeleteTarget.title}&quot;?
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Esta acción quitará el torneo y liberará las canchas bloqueadas.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    setDeleteConfirmTarget(null);
                    setDeleteErrorMsg(null);
                  }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {unrefundedTeams.length > 0 ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/35 space-y-2.5 text-xs">
                  <p className="font-bold text-amber-500">
                    No podés eliminar este torneo todavía: hay {unrefundedTeams.length} equipo(s) con dinero abonado sin devolver (${unrefundedTotal.toLocaleString('es-AR')}).
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Devolvé la inscripción a cada equipo antes de eliminar:
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {unrefundedTeams.map((tm) => {
                      const amt = Number(tm.amountPaid ?? liveDeleteTarget.entryFee ?? 0);
                      return (
                        <div
                          key={tm.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)]"
                        >
                          <div>
                            <p className="font-bold text-[var(--text-primary)]">{tm.teamName}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {tm.captainName} · ${amt.toLocaleString('es-AR')} ({tm.paymentMethod || 'pago'})
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null);
                              setManualRefundPrompt(null);
                              setPaymentActionTarget({ type: 'refund', tournament: liveDeleteTarget, team: tm });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Devolver ${amt.toLocaleString('es-AR')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                  No quedan pagos pendientes de devolución. Podés confirmar la eliminación definitiva del torneo.
                </div>
              )}

              {deleteErrorMsg && (
                <p className="text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
                  {deleteErrorMsg}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    setDeleteConfirmTarget(null);
                    setDeleteErrorMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={actionBusy || unrefundedTeams.length > 0}
                  onClick={handleExecuteDeleteTournament}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-45 disabled:cursor-not-allowed text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {actionBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sí, Eliminar Torneo</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM TEAM PAYMENT CHANGE OR REFUND MODAL */}
      {paymentActionTarget && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[var(--border-strong)] space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                    paymentActionTarget.type === 'refund'
                      ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  {paymentActionTarget.type === 'refund' ? <RotateCcw className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {paymentActionTarget.type === 'refund'
                      ? '¿Confirmar Devolución de Inscripción?'
                      : '¿Confirmar Pago de Inscripción?'}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Equipo <strong>{paymentActionTarget.team.teamName}</strong> · {paymentActionTarget.tournament.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setPaymentActionTarget(null);
                  setActionError(null);
                  setManualRefundPrompt(null);
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Capitán:</span>
                <span className="font-bold">{paymentActionTarget.team.captainName} ({paymentActionTarget.team.captainPhone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Importe:</span>
                <span className="font-extrabold text-[var(--accent)] tabular-nums">
                  ${Number(paymentActionTarget.team.amountPaid ?? paymentActionTarget.tournament.entryFee ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
              {paymentActionTarget.team.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Medio:</span>
                  <span className="uppercase font-bold">{paymentActionTarget.team.paymentMethod}</span>
                </div>
              )}
            </div>

            {actionError && (
              <p className="text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5">
                {actionError}
              </p>
            )}

            {manualRefundPrompt && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/35 text-xs space-y-2">
                <p className="font-bold text-amber-500">{manualRefundPrompt}</p>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleConfirmPaymentAction(true)}
                  className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold cursor-pointer"
                >
                  Registrar Devolución Manual de Todos Modos
                </button>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setPaymentActionTarget(null);
                  setActionError(null);
                  setManualRefundPrompt(null);
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => handleConfirmPaymentAction(false)}
                className={`px-5 py-2 rounded-xl font-extrabold text-xs cursor-pointer flex items-center gap-1.5 ${
                  paymentActionTarget.type === 'refund'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                {actionBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {paymentActionTarget.type === 'refund' ? 'Sí, Devolver Dinero' : 'Sí, Confirmar Pago'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE PREVIEW MODAL (PORTAL) */}
      {receiptPreviewUrl && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReceiptPreviewUrl(null);
          }}
        >
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-[var(--border-strong)] space-y-3 relative my-auto">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">Comprobante de Inscripción</h4>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!receiptLoadError && (
                  <button
                    type="button"
                    onClick={() => setReceiptZoomed((z) => !z)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                    title={receiptZoomed ? 'Reducir zoom' : 'Ampliar zoom'}
                  >
                    {receiptZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setReceiptPreviewUrl(null)} 
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  title="Cerrar comprobante"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-xl bg-black/70 border border-[var(--border-hairline)] max-h-[75vh] flex items-center justify-center p-2">
              {receiptLoadError ? (
                <div className="p-6 text-center space-y-2 text-xs text-[var(--text-secondary)]">
                  <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
                  <p className="font-bold text-[var(--text-primary)]">No se pudo decodificar la imagen del comprobante.</p>
                </div>
              ) : (
                <img
                  src={receiptPreviewUrl}
                  alt="Comprobante del equipo"
                  onError={() => setReceiptLoadError(true)}
                  onClick={() => setReceiptZoomed((z) => !z)}
                  className={`rounded-lg select-none cursor-zoom-in transition-transform duration-200 ${
                    receiptZoomed ? 'w-full max-w-none scale-125 origin-center cursor-zoom-out' : 'max-w-full max-h-[70vh] object-contain'
                  }`}
                />
              )}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[var(--text-muted)]">
                Tocá la imagen para hacer zoom · Cerrar para regresar
              </span>
              <button
                type="button"
                onClick={() => setReceiptPreviewUrl(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold text-xs cursor-pointer transition-colors"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
