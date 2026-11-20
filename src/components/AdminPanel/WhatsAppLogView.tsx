import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { META_WHATSAPP_TEMPLATES, MetaWhatsAppTemplateSpec } from '../../data/whatsappTemplates';
import { getWhatsAppCloudStatus, WhatsAppCloudStatus } from '../../services/whatsappCloud';
import { CheckCheck, AlertCircle, Send, Search, Copy, Check, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export const WhatsAppLogView: React.FC = () => {
  const { adminWhatsappLogs: whatsappLogs, adminBookings: bookings, triggerWhatsAppSend } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<WhatsAppCloudStatus | null>(null);

  useEffect(() => {
    getWhatsAppCloudStatus().then(setCloudStatus).catch(() => {});
  }, []);

  const filteredLogs = whatsappLogs.filter(log => 
    log.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.recipientPhone.includes(searchTerm) ||
    log.bookingCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getEventBadgeLabel = (eventType?: string) => {
    switch (eventType) {
      case 'booking_confirmed': return 'Confirmación';
      case 'booking_approved': return 'Aprobación de turno';
      case 'booking_cancelled': return 'Cancelación';
      case 'missing_players': return 'Faltan jugadores';
      case 'player_joined': return 'Jugador sumado';
      case 'tournament_created': return 'Nuevo torneo';
      case 'manual_resend': return 'Reenvío';
      default: return 'Notificación';
    }
  };

  const isTemplateActiveOnServer = (id: MetaWhatsAppTemplateSpec['id']): boolean => {
    if (!cloudStatus) return false;
    switch (id) {
      case 'booking_confirmed': return cloudStatus.hasBookingTemplate;
      case 'booking_approved': return cloudStatus.hasBookingApprovedTemplate;
      case 'booking_cancelled': return cloudStatus.hasBookingCancelledTemplate;
      case 'missing_players': return cloudStatus.hasMissingPlayersTemplate;
      case 'tournament_created': return cloudStatus.hasTournamentCreatedTemplate;
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            WhatsApp Cloud API (Meta)
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Registro de Notificaciones de WhatsApp
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Envíos automáticos mediante WhatsApp Cloud API para confirmaciones, aprobaciones, cancelaciones, jugadores faltantes y nuevos torneos.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] w-64"
          />
        </div>
      </div>

      {/* Meta Templates Reference Card */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--bg-subtle)]/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-[var(--accent-soft-text)] shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Plantillas listas para Meta WhatsApp Manager (5)
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Copiá el cuerpo exacto de cada plantilla para aprobarla en Meta Business Suite y vinculá su nombre en las variables de entorno del servidor.
              </p>
            </div>
          </div>
          {showTemplates ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
        </button>

        {showTemplates && (
          <div className="px-5 pb-5 pt-1 border-t border-[var(--border-hairline)] grid grid-cols-1 lg:grid-cols-2 gap-4">
            {META_WHATSAPP_TEMPLATES.map((tpl) => {
              const activeOnServer = isTemplateActiveOnServer(tpl.id);
              return (
                <div
                  key={tpl.id}
                  className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">{tpl.title}</h4>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{tpl.description}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          activeOnServer
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        {activeOnServer ? 'Activa en servidor' : 'Texto directo'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)]">Nombre: {tpl.metaName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)]">{tpl.category}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)]">{tpl.language}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)]">
                        {tpl.envVar}
                      </span>
                    </div>

                    <pre className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[11px] font-sans text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                      {tpl.body}
                    </pre>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Variables ordenadas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tpl.variables.map((v) => (
                          <span
                            key={v.index}
                            className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-secondary)]"
                            title={`Ejemplo: ${v.example}`}
                          >
                            <strong className="font-mono text-[var(--accent-soft-text)]">{`{{${v.index}}}`}</strong> {v.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(`tpl-name-${tpl.id}`, tpl.metaName)}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `tpl-name-${tpl.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === `tpl-name-${tpl.id}` ? 'Nombre copiado' : 'Copiar nombre'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(`tpl-body-${tpl.id}`, tpl.body)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] hover:opacity-85 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === `tpl-body-${tpl.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === `tpl-body-${tpl.id}` ? 'Plantilla copiada' : 'Copiar plantilla'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sendFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            sendFeedback.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span>{sendFeedback.text}</span>
          <button
            type="button"
            onClick={() => setSendFeedback(null)}
            className="text-[11px] font-bold hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-hairline)]">
                <th className="py-3 px-4 font-semibold">Fecha / Hora</th>
                <th className="py-3 px-4 font-semibold">Reserva / Tipo</th>
                <th className="py-3 px-4 font-semibold">Destinatario</th>
                <th className="py-3 px-4 font-semibold">WhatsApp</th>
                <th className="py-3 px-4 font-semibold">Mensaje Generado</th>
                <th className="py-3 px-4 font-semibold text-center">Estado</th>
                <th className="py-3 px-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredLogs.map((log) => {
                const booking = bookings.find(b => b.bookingCode === log.bookingCode);
                const isSuccess = log.status === 'sent' || log.status === 'delivered' || log.status === 'read';

                return (
                  <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                      {log.sentAt}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-[var(--accent-soft-text)] block">
                        #{log.bookingCode}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {getEventBadgeLabel(log.eventType)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {log.recipientName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                      {log.recipientPhone}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs" title={log.messagePreview}>
                      <p className="truncate">{log.messagePreview}</p>
                      {log.errorMessage && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 truncate mt-0.5" title={log.errorMessage}>
                          {log.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isSuccess ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-md">
                          <CheckCheck className="w-3.5 h-3.5" />
                          Enviado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-md"
                          title={log.errorMessage || 'Error en envío'}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCopy(log.id, log.messagePreview)}
                          className="p-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          title="Copiar texto del mensaje"
                        >
                          {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {booking && (
                          <button
                            disabled={resendingId === log.id}
                            onClick={async () => {
                              setResendingId(log.id);
                              try {
                                const res = await triggerWhatsAppSend(booking);
                                setSendFeedback({
                                  ok: res.ok,
                                  text: res.ok
                                    ? `Confirmación reenviada por WhatsApp Cloud a ${booking.clientName} (${booking.clientPhone}).`
                                    : res.error || 'No se pudo reenviar por WhatsApp Cloud API.',
                                });
                              } finally {
                                setResendingId(null);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] hover:opacity-80 cursor-pointer disabled:opacity-50"
                            title="Reenviar por WhatsApp Cloud API"
                          >
                            {resendingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
