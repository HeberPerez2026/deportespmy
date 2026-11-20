import React, { useState, useMemo } from 'react';
import { useApp, getLocalDayDateString } from '../context/AppContext';
import { AvailablePlayer, Booking, SportType } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';
import {
  X,
  UserPlus,
  Users,
  Clock,
  Phone,
  User,
  MessageCircle,
  BellRing,
  Bell,
  Trash2,
  CheckCircle,
  Send,
  Calendar,
} from 'lucide-react';

interface AvailablePlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvailablePlayersModal: React.FC<AvailablePlayersModalProps> = ({ isOpen, onClose }) => {
  const {
    availablePlayers,
    myAvailablePlayerId,
    registerAvailablePlayer,
    unregisterAvailablePlayer,
    inviteAvailablePlayerToBooking,
    filterTags,
    getSportLabel,
    bookings,
    trackedBookingCodes,
    userName,
    userPhone,
    pushSupported,
    pushPermission,
    isPushEnabled,
    enablePushNotifications,
  } = useApp();

  useBackHandler(isOpen, onClose, 'available-players-modal');

  const [sportFilter, setSportFilter] = useState<string>('all');
  const [showJoinForm, setShowJoinForm] = useState<boolean>(false);
  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(userPhone || '');
  const [preferredSports, setPreferredSports] = useState<SportType[]>(() =>
    filterTags[0]?.id ? [filterTags[0].id] : ['futbol5']
  );
  const [timePreference, setTimePreference] = useState('');
  const [notes, setNotes] = useState('');
  const [activatePushOnJoin, setActivatePushOnJoin] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [selectedInviteBookingId, setSelectedInviteBookingId] = useState<string>('');
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [invitingWaPlayerId, setInvitingWaPlayerId] = useState<string | null>(null);

  const todayStr = getLocalDayDateString();

  // Active bookings owned/tracked by viewer that can be used to invite available players
  const myActiveBookings: Booking[] = useMemo(() => {
    const codeSet = new Set(trackedBookingCodes.map((c) => c.toUpperCase()));
    return bookings
      .filter((b) => b.status !== 'cancelled' && codeSet.has((b.bookingCode || '').toUpperCase()))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [bookings, trackedBookingCodes]);

  const effectiveInviteBooking = useMemo(() => {
    if (selectedInviteBookingId) {
      return myActiveBookings.find((b) => b.id === selectedInviteBookingId) || myActiveBookings[0];
    }
    return myActiveBookings.find((b) => b.lookingForPlayers) || myActiveBookings[0];
  }, [selectedInviteBookingId, myActiveBookings]);

  const filteredPlayers = useMemo(() => {
    if (sportFilter === 'all') return availablePlayers;
    return availablePlayers.filter((p) => p.preferredSports.includes(sportFilter));
  }, [availablePlayers, sportFilter]);

  if (!isOpen) return null;

  const myEntry = availablePlayers.find((p) => p.id === myAvailablePlayerId) || null;

  const toggleSportChoice = (sportId: string) => {
    setPreferredSports((prev) =>
      prev.includes(sportId)
        ? prev.length > 1
          ? prev.filter((s) => s !== sportId)
          : prev
        : [...prev, sportId]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    if (!name.trim() || !phone.trim()) {
      setFormError('Ingresá tu nombre y WhatsApp para figurar en la lista de hoy.');
      return;
    }

    setIsSaving(true);
    try {
      if (activatePushOnJoin && pushSupported && pushPermission !== 'denied' && !isPushEnabled) {
        await enablePushNotifications({
          clientPhone: phone.trim(),
          clientName: name.trim(),
          silentWelcome: true,
        }).catch(() => {});
      }

      await registerAvailablePlayer({
        name: name.trim(),
        phone: phone.trim(),
        preferredSports,
        timePreference: timePreference.trim(),
        notes: notes.trim(),
      });

      setShowJoinForm(false);
      setFeedbackBanner('¡Ya estás en la lista de jugadores disponibles por hoy (hasta las 23:59 hs)!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInvitePlayer = async (player: AvailablePlayer) => {
    if (!effectiveInviteBooking || invitingPlayerId) return;
    setInvitingPlayerId(player.id);
    try {
      const res = await inviteAvailablePlayerToBooking(player, effectiveInviteBooking, { channel: 'push' });
      if (res.sentCount > 0) {
        setFeedbackBanner(`Invitación Push enviada a ${player.name} para tu turno #${effectiveInviteBooking.bookingCode}.`);
      } else {
        setFeedbackBanner(
          `${player.name} no tiene notificaciones Push activas en este momento. Podés invitarlo usando el botón WhatsApp Cloud.`
        );
      }
    } finally {
      setInvitingPlayerId(null);
    }
  };

  const handleInvitePlayerViaWhatsApp = async (player: AvailablePlayer) => {
    if (invitingWaPlayerId) return;
    if (!effectiveInviteBooking) {
      setFeedbackBanner('Primero reservá o seleccioná uno de tus turnos para enviar una invitación por WhatsApp Cloud.');
      return;
    }
    setInvitingWaPlayerId(player.id);
    try {
      const res = await inviteAvailablePlayerToBooking(player, effectiveInviteBooking, { channel: 'whatsapp' });
      if (res.waSent) {
        setFeedbackBanner(`Invitación enviada por WhatsApp Cloud a ${player.name} (${player.phone}) para el turno #${effectiveInviteBooking.bookingCode}.`);
      } else {
        setFeedbackBanner(
          res.waError || 'No se pudo enviar la invitación por WhatsApp Cloud API.'
        );
      }
    } finally {
      setInvitingWaPlayerId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl shadow-2xl text-[var(--text-primary)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-lg sm:text-xl font-bold leading-tight">
                Jugadores disponibles hoy
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-[var(--accent-soft-text)]" />
                <span>
                  Lista vigente solo hoy (<span className="font-mono">{todayStr}</span>) · Se limpia automáticamente a las 23:59 hs
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {feedbackBanner && (
            <div className="p-3 rounded-lg bg-[var(--accent-soft)] border border-[var(--border-hairline)] flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                <CheckCircle className="w-4 h-4 text-[var(--accent-soft-text)] shrink-0" />
                <span>{feedbackBanner}</span>
              </span>
              <button
                type="button"
                onClick={() => setFeedbackBanner(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Own registration banner or CTA to join */}
          {myEntry && !showJoinForm ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>Estás apuntado hoy como "{myEntry.name}"</span>
                </p>
                <p className="text-[var(--text-secondary)]">
                  Tu disponibilidad caduca automáticamente al finalizar el día de hoy (23:59 hs).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setName(myEntry.name);
                    setPhone(myEntry.phone);
                    setPreferredSports(myEntry.preferredSports);
                    setTimePreference(myEntry.timePreference || '');
                    setNotes(myEntry.notes || '');
                    setShowJoinForm(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-semibold hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await unregisterAvailablePlayer(myEntry.id);
                    setFeedbackBanner('Te quitaste de la lista de jugadores disponibles de hoy.');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold inline-flex items-center gap-1 hover:bg-rose-500/25 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bajarme</span>
                </button>
              </div>
            </div>
          ) : !showJoinForm ? (
            <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  ¿Tenés ganas de jugar hoy y no tenés equipo?
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Apuntate en la lista del día para que quienes buscan jugadores puedan sumarte por Push o WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJoinForm(true)}
                className="px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Apuntarme hoy</span>
              </button>
            </div>
          ) : null}

          {/* Registration Form */}
          {showJoinForm && (
            <form
              onSubmit={handleRegister}
              className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--accent)]/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[var(--accent-soft-text)]" />
                  <span>{myEntry ? 'Actualizar mi disponibilidad de hoy' : 'Apuntarme como disponible hoy'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Tu nombre *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Lucas Fernández"
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg pl-8 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    WhatsApp de contacto *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+5492804..."
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                  Deportes que podés jugar hoy
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {filterTags.map((tag) => {
                    const selected = preferredSports.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleSportChoice(tag.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Franja horaria disponible (opcional)
                  </label>
                  <input
                    type="text"
                    value={timePreference}
                    onChange={(e) => setTimePreference(e.target.value)}
                    placeholder="Ej: De 19:00 a 23:00 hs"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Categoría / posición / nota (opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: 6ta pádel / Arquero F5"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {pushSupported && pushPermission !== 'denied' && !isPushEnabled && (
                <label className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activatePushOnJoin}
                    onChange={(e) => setActivatePushOnJoin(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>
                    <strong className="text-[var(--text-primary)]">Activar notificaciones Push:</strong> recibí invitaciones directas cuando alguien necesite un jugador para su turno.
                  </span>
                </label>
              )}

              {formError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{formError}</p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Tu registro expira hoy a las 23:59 hs.
                </span>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-semibold text-xs cursor-pointer"
                >
                  {isSaving ? 'Guardando...' : 'Publicar disponibilidad hoy'}
                </button>
              </div>
            </form>
          )}

          {/* Optional booking selector for sending Push invitations */}
          {myActiveBookings.length > 0 && (
            <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                <span>Invitar a tu turno:</span>
              </span>
              <select
                value={effectiveInviteBooking?.id || ''}
                onChange={(e) => setSelectedInviteBookingId(e.target.value)}
                className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {myActiveBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    #{b.bookingCode} · {b.courtName} ({b.date} {b.startTime} hs)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sport Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSportFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                sportFilter === 'all'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-hairline)]'
              }`}
            >
              Todos ({availablePlayers.length})
            </button>
            {filterTags.map((tag) => {
              const count = availablePlayers.filter((p) => p.preferredSports.includes(tag.id)).length;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSportFilter(tag.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    sportFilter === tag.id
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-hairline)]'
                  }`}
                >
                  {tag.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Players List */}
          {filteredPlayers.length === 0 ? (
            <div className="p-8 text-center bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl space-y-2">
              <Users className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No hay jugadores anotados para hoy todavía
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Sé el primero en apuntarte por el día de hoy si querés sumarte a un partido que le falte gente.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredPlayers.map((player) => {
                const isMe = player.id === myAvailablePlayerId;

                return (
                  <div
                    key={player.id}
                    className={`p-3.5 rounded-xl bg-[var(--bg-canvas)] border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isMe ? 'border-[var(--accent)]/60' : 'border-[var(--border-hairline)]'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="text-sm font-bold text-[var(--text-primary)]">
                          {player.name}
                        </h5>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-[10px] font-bold">
                            Vos
                          </span>
                        )}
                        {player.pushDeviceId && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                            title="Acepta invitaciones rápidas"
                          >
                            <Bell className="w-3 h-3" />
                            Push
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {player.preferredSports.map((sp) => (
                          <span
                            key={sp}
                            className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium"
                          >
                            {getSportLabel(sp)}
                          </span>
                        ))}
                        {player.timePreference && (
                          <span className="text-[var(--text-secondary)] font-mono">
                            · {player.timePreference}
                          </span>
                        )}
                      </div>

                      {player.notes && (
                        <p className="text-xs text-[var(--text-secondary)]">{player.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {!isMe && effectiveInviteBooking && player.pushDeviceId && (
                        <button
                          type="button"
                          disabled={invitingPlayerId === player.id}
                          onClick={() => handleInvitePlayer(player)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] hover:opacity-90 text-[var(--accent-soft-text)] border border-[var(--border-hairline)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {invitingPlayerId === player.id ? (
                            <BellRing className="w-3.5 h-3.5 animate-pulse" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Invitar Push</span>
                        </button>
                      )}

                      {!isMe && (
                        <button
                          type="button"
                          disabled={invitingWaPlayerId === player.id}
                          onClick={() => handleInvitePlayerViaWhatsApp(player)}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{invitingWaPlayerId === player.id ? 'Enviando...' : 'WhatsApp Cloud'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
