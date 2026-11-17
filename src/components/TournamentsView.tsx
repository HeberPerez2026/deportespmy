import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, Tournament, TournamentTeam } from '../types';
import { useBackHandler } from '../hooks/useBackHandler';
import { buildGoogleMapsDirectionsUrl } from '../utils/maps';
import { apiFetch, getApiBaseUrl, safeParseJsonResponse } from '../utils/api';
import { processImageUpload, getSafeReceiptUrl } from '../utils/imageUpload';
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
  CreditCard,
  Landmark,
  Copy,
  Upload,
  Loader2,
  ExternalLink,
  MessageCircle,
  ArrowLeft,
  Banknote,
} from 'lucide-react';

export const TournamentsView: React.FC = () => {
  const {
    tournaments,
    courts,
    profilesByAdmin,
    businessProfile,
    getSportLabel,
    registerTeamInTournament,
    confirmTournamentTeamPayment,
    userName,
    userPhone,
    setActiveTab,
  } = useApp();

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Team & Captain
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState(userName || '');
  const [captainPhone, setCaptainPhone] = useState(userPhone || '+549280');
  const [playersCount, setPlayersCount] = useState('6');
  const [notes, setNotes] = useState('');

  // Step 2: Payment method & Transfer receipt
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');
  const [transferRef, setTransferRef] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 3: Live Checkout / Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredTeam, setRegisteredTeam] = useState<TournamentTeam | null>(null);
  const [mpCheckoutUrl, setMpCheckoutUrl] = useState<string | null>(null);
  const [isWaitingMp, setIsWaitingMp] = useState(false);
  const [mpPaymentConfirmed, setMpPaymentConfirmed] = useState(false);

  const resetModalState = () => {
    setSelectedTournament(null);
    setStep(1);
    setTeamName('');
    setCaptainName(userName || '');
    setCaptainPhone(userPhone || '+549280');
    setNotes('');
    setTransferRef('');
    setReceiptDataUrl('');
    setErrorMsg(null);
    setRegisteredTeam(null);
    setMpCheckoutUrl(null);
    setIsWaitingMp(false);
    setMpPaymentConfirmed(false);
  };

  useBackHandler(
    Boolean(selectedTournament),
    () => {
      if (step === 2 && !submitting) {
        setStep(1);
        setErrorMsg(null);
      } else {
        resetModalState();
      }
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

  const activeProfile = selectedTournament ? resolveProfileForTournament(selectedTournament) : businessProfile;
  const tournamentAdminId = (selectedTournament?.adminId || 'default').trim().toLowerCase() || 'default';
  const hasAutomaticMP = Boolean((activeProfile.mpOAuthConnected || activeProfile.mpAccessToken) && !activeProfile.mpPaused);
  const hasMpLink = Boolean(activeProfile.mpLink && activeProfile.mpLink.trim().length > 5 && !activeProfile.mpPaused);
  const hasMpAlias = Boolean(activeProfile.alias && !activeProfile.mpPaused);
  const hasMpConfigured = !activeProfile.mpPaused && (hasAutomaticMP || hasMpLink || hasMpAlias);
  const hasTransferConfigured = !activeProfile.transferPaused && Boolean(activeProfile.cbu || activeProfile.alias);

  const handleOpenRegister = (t: Tournament) => {
    const prof = resolveProfileForTournament(t);
    const mpAvail = !prof.mpPaused && Boolean(prof.mpOAuthConnected || prof.mpAccessToken || prof.mpLink || prof.alias);
    const transAvail = !prof.transferPaused && Boolean(prof.cbu || prof.alias);

    setSelectedTournament(t);
    setStep(1);
    setTeamName('');
    setCaptainName(userName || '');
    setCaptainPhone(userPhone || '+549280');
    setNotes('');
    setTransferRef('');
    setReceiptDataUrl('');
    setErrorMsg(null);
    setRegisteredTeam(null);
    setMpCheckoutUrl(null);
    setIsWaitingMp(false);
    setMpPaymentConfirmed(false);
    setPaymentMethod(mpAvail ? 'mercadopago' : transAvail ? 'transferencia' : 'efectivo_mostrador');
  };

  const handleCopyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {}
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    setErrorMsg(null);
    try {
      const compressed = await processImageUpload(file, {
        maxDimension: 800,
        quality: 0.65,
        maxDataUrlLength: 85000,
        maxInputSizeMB: 8,
      });
      setReceiptDataUrl(compressed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo cargar la imagen del comprobante.');
    } finally {
      setUploadingReceipt(false);
      e.target.value = '';
    }
  };

  // Real-time MP verification polling + popup return listener while waiting on Step 3
  useEffect(() => {
    if (!isWaitingMp || !registeredTeam?.bookingCode || !selectedTournament || !hasAutomaticMP) return;
    let cancelled = false;

    const handleVerified = async (ref: string, amt?: number) => {
      if (cancelled) return;
      cancelled = true;
      await confirmTournamentTeamPayment(
        selectedTournament.id,
        registeredTeam.id,
        ref,
        amt || selectedTournament.entryFee
      );
      setRegisteredTeam((prev) =>
        prev
          ? {
              ...prev,
              paid: true,
              paymentStatus: 'paid',
              paymentReference: ref,
              amountPaid: amt || selectedTournament.entryFee,
            }
          : prev
      );
      setIsWaitingMp(false);
      setMpPaymentConfirmed(true);
    };

    const onMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const apiBase = getApiBaseUrl();
      const isTrusted =
        (apiBase && origin === apiBase) ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.koyeb.app') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('deportespmy.com.ar') ||
        origin === window.location.origin;
      if (!isTrusted) return;
      if (event.data?.type === 'MP_PAYMENT_RETURN') {
        const { bookingCode, paymentId, status, collectionStatus } = event.data;
        if (bookingCode && bookingCode !== registeredTeam.bookingCode) return;
        if (status === 'approved' || collectionStatus === 'approved' || status === 'success') {
          handleVerified(`MP-${paymentId || Date.now()}`, selectedTournament.entryFee);
        } else if (status === 'rejected' || collectionStatus === 'rejected') {
          setErrorMsg('El pago fue rechazado en Mercado Pago. Podés reintentar desde el botón de abajo.');
          setIsWaitingMp(false);
        }
      }
    };

    window.addEventListener('message', onMessage);

    const poll = setInterval(async () => {
      if (cancelled) return;
      try {
        const resp = await apiFetch(
          `/api/mercadopago/verify-payment?booking_code=${encodeURIComponent(registeredTeam.bookingCode!)}&admin_id=${encodeURIComponent(tournamentAdminId)}`,
          { headers: { Accept: 'application/json' }, cache: 'no-store' }
        );
        if (!resp.ok) return;
        const data = await safeParseJsonResponse(resp);
        if (data?.verified) {
          handleVerified(`MP-${data.paymentId || Date.now()}`, Number(data.amount) || selectedTournament.entryFee);
        }
      } catch {}
    }, 2500);

    return () => {
      cancelled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(poll);
    };
  }, [isWaitingMp, registeredTeam, selectedTournament, hasAutomaticMP, tournamentAdminId, confirmTournamentTeamPayment]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    if (!teamName.trim() || !captainName.trim() || !captainPhone.trim()) {
      setErrorMsg('Completá el nombre del equipo, capitán y WhatsApp.');
      return;
    }

    setErrorMsg(null);

    // Free tournament: register right away
    if (Number(selectedTournament.entryFee || 0) <= 0) {
      setSubmitting(true);
      const res = await registerTeamInTournament(selectedTournament.id, {
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        playersCount: Math.max(1, Number(playersCount) || 5),
        notes: notes.trim() || undefined,
        paymentMethod: 'efectivo_mostrador',
        paymentStatus: 'paid',
        amountPaid: 0,
        paid: true,
        adminId: tournamentAdminId,
      });
      setSubmitting(false);
      if (!res.ok || !res.team) {
        setErrorMsg(res.message);
        return;
      }
      setRegisteredTeam(res.team);
      setMpPaymentConfirmed(true);
      setStep(3);
      return;
    }

    setStep(2);
  };

  const handleConfirmPayment = async () => {
    if (!selectedTournament) return;
    setErrorMsg(null);
    setSubmitting(true);

    const entryFee = Number(selectedTournament.entryFee || 0);
    const bookingCode = `TRN-${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;

    try {
      if (paymentMethod === 'mercadopago') {
        if (!hasMpConfigured) {
          setErrorMsg('Mercado Pago no está habilitado por este complejo.');
          setSubmitting(false);
          return;
        }

        if (hasAutomaticMP) {
          const resReg = await registerTeamInTournament(selectedTournament.id, {
            teamName: teamName.trim(),
            captainName: captainName.trim(),
            captainPhone: captainPhone.trim(),
            playersCount: Math.max(1, Number(playersCount) || 5),
            notes: notes.trim() || undefined,
            bookingCode,
            paymentMethod: 'mercadopago',
            paymentStatus: 'pending',
            paymentReference: `MP-PENDING-${Date.now()}`,
            amountPaid: 0,
            paid: false,
            adminId: tournamentAdminId,
          });

          if (!resReg.ok || !resReg.team) {
            setErrorMsg(resReg.message);
            setSubmitting(false);
            return;
          }

          const prefRes = await apiFetch('/api/mercadopago/preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              bookingId: resReg.team.id,
              bookingCode: resReg.team.bookingCode || bookingCode,
              courtName: `Torneo: ${selectedTournament.title} (${teamName.trim()})`,
              date: selectedTournament.date,
              startTime: selectedTournament.startTime,
              unit_price: entryFee,
              quantity: 1,
              clientName: captainName.trim(),
              clientPhone: captainPhone.trim(),
              adminId: tournamentAdminId,
              origin: window.location.origin,
            }),
          });
          const prefData = await safeParseJsonResponse(prefRes);
          if (!prefRes.ok || !prefData?.init_point) {
            setErrorMsg(prefData?.error || 'No se pudo generar el link de pago con Mercado Pago.');
            setSubmitting(false);
            return;
          }

          setRegisteredTeam(resReg.team);
          setMpCheckoutUrl(prefData.init_point);
          setIsWaitingMp(true);
          setStep(3);

          const payWin = window.open(
            prefData.init_point,
            'mp_checkout_tournament',
            'width=640,height=780,scrollbars=yes,resizable=yes'
          );
          if (!payWin) {
            setErrorMsg('Tu navegador bloqueó la ventana emergente. Hacé clic en "Pagar en Mercado Pago" abajo.');
          }
          setSubmitting(false);
          return;
        }

        // MP Alias or Direct Link -> requires receipt or reference
        if (hasMpLink && activeProfile.mpLink) {
          try {
            window.open(activeProfile.mpLink.trim(), '_blank', 'noopener,noreferrer');
          } catch {}
        }

        const resReg = await registerTeamInTournament(selectedTournament.id, {
          teamName: teamName.trim(),
          captainName: captainName.trim(),
          captainPhone: captainPhone.trim(),
          playersCount: Math.max(1, Number(playersCount) || 5),
          notes: notes.trim() || undefined,
          bookingCode,
          paymentMethod: 'mercadopago',
          paymentStatus: 'awaiting_approval',
          paymentReference: transferRef.trim() || `MP-ALIAS-${Date.now().toString().slice(-4)}`,
          receiptUrl: receiptDataUrl || undefined,
          amountPaid: entryFee,
          paid: false,
          adminId: tournamentAdminId,
        });
        setSubmitting(false);
        if (!resReg.ok || !resReg.team) {
          setErrorMsg(resReg.message);
          return;
        }
        setRegisteredTeam(resReg.team);
        setStep(3);
        return;
      }

      if (paymentMethod === 'transferencia') {
        if (!hasTransferConfigured) {
          setErrorMsg('Este complejo aún no configuró CBU/Alias para transferencias.');
          setSubmitting(false);
          return;
        }
        if (!receiptDataUrl && !transferRef.trim()) {
          setErrorMsg('Adjuntá la foto del comprobante o ingresá el número de operación.');
          setSubmitting(false);
          return;
        }

        const resReg = await registerTeamInTournament(selectedTournament.id, {
          teamName: teamName.trim(),
          captainName: captainName.trim(),
          captainPhone: captainPhone.trim(),
          playersCount: Math.max(1, Number(playersCount) || 5),
          notes: notes.trim() || undefined,
          bookingCode,
          paymentMethod: 'transferencia',
          paymentStatus: 'awaiting_approval',
          paymentReference: transferRef.trim() ? `CBU-${transferRef.trim()}` : `CBU-${Date.now().toString().slice(-5)}`,
          receiptUrl: receiptDataUrl || undefined,
          amountPaid: entryFee,
          paid: false,
          adminId: tournamentAdminId,
        });
        setSubmitting(false);
        if (!resReg.ok || !resReg.team) {
          setErrorMsg(resReg.message);
          return;
        }
        setRegisteredTeam(resReg.team);
        setStep(3);
        return;
      }

      // Cash fallback when online payment isn't available
      const resReg = await registerTeamInTournament(selectedTournament.id, {
        teamName: teamName.trim(),
        captainName: captainName.trim(),
        captainPhone: captainPhone.trim(),
        playersCount: Math.max(1, Number(playersCount) || 5),
        notes: notes.trim() || undefined,
        bookingCode,
        paymentMethod: 'efectivo_mostrador',
        paymentStatus: 'pending',
        amountPaid: 0,
        paid: false,
        adminId: tournamentAdminId,
      });
      setSubmitting(false);
      if (!resReg.ok || !resReg.team) {
        setErrorMsg(resReg.message);
        return;
      }
      setRegisteredTeam(resReg.team);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar la inscripción.');
      setSubmitting(false);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
            const activeTeamsCount = (t.teams || []).filter((tm) => !tm.refunded && tm.paymentStatus !== 'refunded').length;
            const spotsLeft = Math.max(0, t.maxTeams - activeTeamsCount);
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
                        {activeTeamsCount}/{t.maxTeams} equipos ({spotsLeft} lib.)
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

      {/* TOURNAMENT REGISTRATION CHECKOUT MODAL (3-STEP LIKE BOOKINGMODAL) */}
      {selectedTournament && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[var(--border-strong)] space-y-4 my-auto text-[var(--text-primary)]">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                  Inscripción a Torneo · Paso {step} de {selectedTournament.entryFee > 0 ? 3 : 2}
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
                onClick={resetModalState}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2 border bg-rose-500/15 border-rose-500/35 text-rose-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: TEAM DATA */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-3 text-xs">
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
                    onClick={resetModalState}
                    className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold cursor-pointer disabled:opacity-60"
                  >
                    {submitting
                      ? 'Procesando...'
                      : selectedTournament.entryFee > 0
                        ? `Continuar al Pago ($${selectedTournament.entryFee.toLocaleString('es-AR')})`
                        : 'Confirmar Inscripción Gratuita'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: PAYMENT METHOD & CHECKOUT (MATCHES BOOKING MODAL) */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] font-semibold">Equipo a inscribir</p>
                    <p className="font-bold text-sm text-[var(--text-primary)]">{teamName}</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Cap: {captainName} · {captainPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[var(--text-muted)] block">Total inscripción</span>
                    <span className="text-xl font-extrabold text-[var(--accent)] tabular-nums">
                      ${selectedTournament.entryFee.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-[var(--text-secondary)] block">Elegí el medio de pago</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {hasMpConfigured && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('mercadopago')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                          paymentMethod === 'mercadopago'
                            ? 'bg-sky-500/15 border-sky-500 text-[var(--text-primary)] ring-1 ring-sky-500'
                            : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-sky-500 shrink-0" />
                        <div>
                          <span className="font-bold block">Mercado Pago</span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {hasAutomaticMP ? 'Acreditación instantánea' : 'Link / Alias directo'}
                          </span>
                        </div>
                      </button>
                    )}

                    {hasTransferConfigured && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transferencia')}
                        className={`p-3 rounded-xl border text-left flex items-center gap-2.5 cursor-pointer transition-all ${
                          paymentMethod === 'transferencia'
                            ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--text-primary)] ring-1 ring-[var(--accent)]'
                            : 'bg-[var(--bg-canvas)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <Landmark className="w-5 h-5 text-[var(--accent)] shrink-0" />
                        <div>
                          <span className="font-bold block">Transferencia Bancaria</span>
                          <span className="text-[10px] text-[var(--text-muted)]">CBU / Alias + comprobante</span>
                        </div>
                      </button>
                    )}

                    {!hasMpConfigured && !hasTransferConfigured && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('efectivo_mostrador')}
                        className="p-3 rounded-xl border bg-[var(--accent-soft)] border-[var(--accent)] text-left flex items-center gap-2.5 cursor-pointer sm:col-span-2"
                      >
                        <Banknote className="w-5 h-5 text-[var(--accent)] shrink-0" />
                        <div>
                          <span className="font-bold block">Abonar en Recepción del Complejo</span>
                          <span className="text-[10px] text-[var(--text-muted)]">El complejo aún no habilitó cobro online</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* MERCADO PAGO ALIAS INFO (IF NOT AUTOMATIC) */}
                {paymentMethod === 'mercadopago' && !hasAutomaticMP && (
                  <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
                    <p className="font-bold text-sky-600 dark:text-sky-300">
                      Datos de Mercado Pago del complejo:
                    </p>
                    {activeProfile.alias && (
                      <div className="flex items-center justify-between gap-2 bg-[var(--bg-canvas)] p-2 rounded-lg border border-[var(--border-hairline)]">
                        <span className="font-mono font-bold">
                          Alias: {activeProfile.alias}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText('mp_alias', activeProfile.alias || '')}
                          className="px-2 py-1 rounded bg-sky-500/20 text-sky-400 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === 'mp_alias' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[var(--text-secondary)] block">
                        Adjuntar Comprobante o Nº de Operación
                      </label>
                      <input
                        type="text"
                        value={transferRef}
                        onChange={(e) => setTransferRef(e.target.value)}
                        placeholder="N° de comprobante MP (opcional si subís foto)"
                        className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono"
                      />
                      <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-sky-500/40 bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] cursor-pointer font-bold text-sky-500">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingReceipt ? 'Comprimiendo...' : receiptDataUrl ? '✓ Comprobante adjunto (Cambiar)' : 'Subir captura del pago'}</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleReceiptChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}

                {/* TRANSFERENCIA CBU DETAILS & RECEIPT UPLOAD */}
                {paymentMethod === 'transferencia' && hasTransferConfigured && (
                  <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5">
                    <p className="font-bold text-[var(--text-primary)]">
                      Transferí ${selectedTournament.entryFee.toLocaleString('es-AR')} a la cuenta del complejo:
                    </p>
                    {activeProfile.accountHolder && (
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Titular: <strong className="text-[var(--text-primary)]">{activeProfile.accountHolder}</strong>
                      </p>
                    )}
                    {activeProfile.cbu && (
                      <div className="flex items-center justify-between gap-2 bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-hairline)]">
                        <span className="font-mono text-[11px] truncate">CBU: {activeProfile.cbu}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText('cbu', activeProfile.cbu || '')}
                          className="px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}
                    {activeProfile.alias && (
                      <div className="flex items-center justify-between gap-2 bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border-hairline)]">
                        <span className="font-mono text-[11px] truncate">Alias: {activeProfile.alias}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText('alias', activeProfile.alias || '')}
                          className="px-2 py-1 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedKey === 'alias' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <label className="font-semibold text-[var(--text-secondary)] block">
                        Subí el comprobante de transferencia *
                      </label>
                      <input
                        type="text"
                        value={transferRef}
                        onChange={(e) => setTransferRef(e.target.value)}
                        placeholder="Nº de transferencia (ej: 00459821)"
                        className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono"
                      />
                      <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-[var(--accent)]/50 bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] cursor-pointer font-bold text-[var(--accent-soft-text)]">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingReceipt ? 'Procesando imagen...' : receiptDataUrl ? '✓ Comprobante listo (Cambiar foto)' : 'Subir foto del comprobante'}</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleReceiptChange} className="hidden" />
                      </label>
                      {receiptDataUrl && (
                        <img
                          src={getSafeReceiptUrl(receiptDataUrl)}
                          alt="Vista previa comprobante"
                          className="h-24 rounded-lg border border-[var(--border-hairline)] object-contain mx-auto"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center gap-2 pt-3 border-t border-[var(--border-hairline)]">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setErrorMsg(null);
                    }}
                    disabled={submitting}
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={submitting || uploadingReceipt}
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : paymentMethod === 'mercadopago' && hasAutomaticMP ? (
                      <span>Pagar ${selectedTournament.entryFee.toLocaleString('es-AR')} con Mercado Pago</span>
                    ) : (
                      <span>Confirmar Inscripción y Enviar</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: LIVE WAITING OR FINAL CONFIRMATION */}
            {step === 3 && registeredTeam && (
              <div className="space-y-4 text-center py-2">
                {isWaitingMp ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center mx-auto">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <h4 className="text-lg font-extrabold text-[var(--text-primary)]">
                      Esperando acreditación de Mercado Pago...
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                      Completá el pago en la ventana emergente de Mercado Pago. En cuanto se apruebe, tu inscripción <strong>#{registeredTeam.bookingCode}</strong> se confirmará automáticamente.
                    </p>
                    {mpCheckoutUrl && (
                      <a
                        href={mpCheckoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir Mercado Pago</span>
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                        mpPaymentConfirmed || registeredTeam.paid
                          ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35'
                          : 'bg-amber-500/15 text-amber-500 border-amber-500/35'
                      }`}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-extrabold text-[var(--text-primary)]">
                      {mpPaymentConfirmed || registeredTeam.paid
                        ? '¡Inscripción y Pago Confirmados!'
                        : '¡Inscripción Registrada · En Revisión!'}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Equipo <strong>{registeredTeam.teamName}</strong> · Código{' '}
                      <span className="font-mono font-bold text-[var(--accent)]">#{registeredTeam.bookingCode}</span>
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-3">
                      {mpPaymentConfirmed || registeredTeam.paid
                        ? 'El lugar de tu equipo quedó confirmado y contabilizado en el torneo.'
                        : 'El administrador del complejo revisará tu comprobante/seña para aprobar el pago de la inscripción.'}
                    </p>

                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {activeProfile.whatsappNumber && (
                        <a
                          href={`https://wa.me/${activeProfile.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `¡Hola! Acabo de inscribir al equipo "${registeredTeam.teamName}" en el torneo "${selectedTournament.title}" (Código #${registeredTeam.bookingCode}).`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-500 font-bold text-xs flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Avisar por WhatsApp</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={resetModalState}
                        className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs cursor-pointer"
                      >
                        Listo, Volver a Torneos
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
