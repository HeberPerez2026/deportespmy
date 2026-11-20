import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Booking } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';
import {
  X,
  Users,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle,
  Bell,
  BellRing,
  MessageCircle,
  AlertCircle,
  Send,
  Navigation,
  DollarSign,
} from 'lucide-react';
import { buildGoogleMapsDirectionsUrl } from '../utils/maps';

interface JoinMatchModalProps {
  booking: Booking;
  onClose: () => void;
}

export const JoinMatchModal: React.FC<JoinMatchModalProps> = ({ booking, onClose }) => {
  const {
    bookings,
    courts,
    getBusinessProfileForCourt,
    getSportLabel,
    userName,
    userPhone,
    userEmail,
    joinMatchBooking,
    pushSupported,
    pushPermission,
    isPushEnabled,
    enablePushNotifications,
  } = useApp();

  useBackHandler(true, onClose, 'join-match-modal');

  // Keep synced with live Firestore state
  const liveBooking =
    bookings.find(
      (b) =>
        b.id === booking.id ||
        b.bookingCode.toUpperCase() === booking.bookingCode.toUpperCase()
    ) || booking;

  const court = courts.find((c) => c.id === liveBooking.courtId);
  const profile = getBusinessProfileForCourt(court);
  const complexName = liveBooking.establishment || profile.complexName || court?.establishment || 'Complejo Deportivo';
  const sportLabel = getSportLabel(liveBooking.sport);

  const joinedPlayers = liveBooking.joinedPlayers || [];
  const remainingPlayers = liveBooking.lookingForPlayers
    ? Math.max(0, (liveBooking.neededPlayers || 0) - joinedPlayers.length)
    : 0;
  const estimatedPlayersTotal =
    liveBooking.totalPlayers && liveBooking.totalPlayers > 1
      ? liveBooking.totalPlayers
      : Math.max(2, (liveBooking.neededPlayers || 0) + 1);
  const perPlayerShare =
    liveBooking.perPlayerAmount && liveBooking.perPlayerAmount > 0
      ? liveBooking.perPlayerAmount
      : liveBooking.totalAmount > 0
      ? Math.round(liveBooking.totalAmount / estimatedPlayersTotal)
      : 0;
  const mapsDirectionsUrl = buildGoogleMapsDirectionsUrl(profile, complexName);

  const [name, setName] = useState(userName || '');
  const [phone, setPhone] = useState(userPhone || '');
  const [email, setEmail] = useState(userEmail || '');
  const [notes, setNotes] = useState('');
  const [wantPush, setWantPush] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joinedSuccess, setJoinedSuccess] = useState<{
    remainingPlayers: number;
    pushSent: boolean;
    waSent: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);

    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Completá tu nombre y número de WhatsApp para sumarte.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Opt-in push for this joining player WITHOUT passing the organizer's bookingCode
      if (wantPush && pushSupported && pushPermission !== 'denied' && !isPushEnabled) {
        await enablePushNotifications({
          clientPhone: phone.trim(),
          clientName: name.trim(),
          silentWelcome: true,
        }).catch(() => {});
      }

      const res = await joinMatchBooking(liveBooking.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      });

      if (!res.ok) {
        setErrorMsg(res.error || 'No se pudo completar tu inscripción al partido.');
        return;
      }

      setJoinedSuccess({
        remainingPlayers: res.remainingPlayers,
        pushSent: res.pushSent,
        waSent: res.waSent,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const organizerPhoneDigits = (liveBooking.clientPhone || '').replace(/\D/g, '');
  const waOrganizerMsg = `¡Hola ${liveBooking.clientName}! Me acabo de sumar desde DeportesPMY a tu partido #${liveBooking.bookingCode} en ${liveBooking.courtName} (${liveBooking.date} ${liveBooking.startTime} hs). Soy ${name || 'jugador'}.`;
  const waOrganizerUrl = organizerPhoneDigits
    ? `https://wa.me/${organizerPhoneDigits}?text=${encodeURIComponent(waOrganizerMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(waOrganizerMsg)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl shadow-2xl text-[var(--text-primary)] overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Partido abierto · #{liveBooking.bookingCode}
              </p>
              <h3 className="font-heading text-lg sm:text-xl font-bold truncate">
                Sumarse al turno en {liveBooking.courtName}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Match Summary Card */}
          <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[var(--text-primary)] text-sm">
                {complexName} · {sportLabel}
              </span>
              {remainingPlayers > 0 ? (
                <span className="px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold tabular-nums shrink-0">
                  {remainingPlayers === 1 ? 'Falta 1 jugador' : `Faltan ${remainingPlayers} jugadores`}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                  Equipo completo
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                <span className="font-mono">{liveBooking.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                <span className="font-mono font-semibold text-[var(--text-primary)]">
                  {liveBooking.startTime} a {liveBooking.endTime} hs
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>
                  Organiza: <strong className="text-[var(--text-primary)]">{liveBooking.clientName}</strong>
                </span>
              </div>
              {(profile.address || complexName) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  <span className="truncate">{profile.address || complexName}</span>
                  <a
                    href={mapsDirectionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-soft-text)] hover:underline shrink-0"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>¿Cómo llegar?</span>
                  </a>
                </div>
              )}
            </div>

            {perPlayerShare > 0 && (
              <div className="pt-2 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <DollarSign className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                  <span>
                    Parte estimada por jugador ({estimatedPlayersTotal} jug.):
                  </span>
                </span>
                <strong className="font-mono text-xs text-[var(--accent-soft-text)] tabular-nums">
                  ${perPlayerShare.toLocaleString('es-AR')}
                  <span className="text-[10px] font-normal text-[var(--text-muted)] ml-1">
                    (Total ${liveBooking.totalAmount.toLocaleString('es-AR')})
                  </span>
                </strong>
              </div>
            )}

            {liveBooking.lookingForPlayersMessage && (
              <div className="pt-2 border-t border-[var(--border-hairline)] text-[var(--text-primary)]">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-0.5">
                  Nota del organizador:
                </span>
                <p className="italic">"{liveBooking.lookingForPlayersMessage}"</p>
              </div>
            )}

            {joinedPlayers.length > 0 && (
              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                  Jugadores que ya se sumaron ({joinedPlayers.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {joinedPlayers.map((jp) => (
                    <span
                      key={jp.id}
                      className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[11px] font-medium"
                    >
                      {jp.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {joinedSuccess ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-heading text-xl font-bold text-[var(--text-primary)]">
                  ¡Te sumaste al partido!
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {joinedSuccess.waSent && joinedSuccess.pushSent
                    ? `Avisamos automáticamente por WhatsApp Cloud y Push a ${liveBooking.clientName} que te sumaste.`
                    : joinedSuccess.waSent
                    ? `Enviamos un aviso automático por WhatsApp Cloud a ${liveBooking.clientName} informando que te sumaste.`
                    : joinedSuccess.pushSent
                    ? `Enviamos una notificación Push directa a ${liveBooking.clientName} avisando que te sumaste.`
                    : `Registramos tus datos en el partido de ${liveBooking.clientName} (recibirá el aviso en vivo en su dispositivo).`}
                </p>
                <p className="text-xs font-semibold text-[var(--accent-soft-text)]">
                  {joinedSuccess.remainingPlayers > 0
                    ? `Ahora quedan ${joinedSuccess.remainingPlayers} ${joinedSuccess.remainingPlayers === 1 ? 'lugar disponible' : 'lugares disponibles'}.`
                    : '¡Con vos se completó el equipo!'}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={waOrganizerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Escribirle por WhatsApp a {liveBooking.clientName}</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cerrar y volver a la grilla
                </button>
              </div>
            </div>
          ) : remainingPlayers <= 0 || liveBooking.status === 'cancelled' ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                {liveBooking.status === 'cancelled'
                  ? 'Este turno fue cancelado.'
                  : 'Este partido ya completó todos los jugadores solicitados.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-xs font-semibold cursor-pointer"
              >
                Volver
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Tu nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Martín Sosa"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Tu WhatsApp (para coordinar con el organizador) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+5492804..."
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2 text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tuemail@gmail.com"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  Posición / nivel o comentario (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Juego de arquero / 6ta categoría pádel"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {pushSupported && pushPermission !== 'denied' && !isPushEnabled && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-hairline)] cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={wantPush}
                    onChange={(e) => setWantPush(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 text-[var(--accent-soft-text)]" />
                      Activar avisos Push en este dispositivo
                    </span>
                    <span className="block text-[11px] text-[var(--text-secondary)]">
                      Para recibir futuras invitaciones o avisos de partidos abiertos.
                    </span>
                  </div>
                </label>
              )}

              {isPushEnabled && (
                <div className="flex items-center gap-2 text-[11px] text-[var(--accent-soft-text)] font-medium">
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Al confirmar enviaremos un aviso Push directo a {liveBooking.clientName}.</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-300 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-semibold text-xs sm:text-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Enviando aviso...' : 'Sumarme y avisar'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
