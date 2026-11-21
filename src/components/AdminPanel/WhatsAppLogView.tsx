import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCheck, AlertCircle, Send, Search, Copy, Check, Loader2 } from 'lucide-react';

export const WhatsAppLogView: React.FC = () => {
  const { adminWhatsappLogs: whatsappLogs, adminBookings: bookings, triggerWhatsAppSend } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Notificaciones automáticas
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Registro de Notificaciones de WhatsApp
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Historial de envíos automáticos de confirmaciones, aprobaciones, cancelaciones, jugadores faltantes y nuevos torneos.
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
                                    ? `Confirmación reenviada por WhatsApp a ${booking.clientName} (${booking.clientPhone}).`
                                    : res.error || 'No se pudo reenviar la notificación de WhatsApp.',
                                });
                              } finally {
                                setResendingId(null);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] hover:opacity-80 cursor-pointer disabled:opacity-50"
                            title="Reenviar notificación por WhatsApp"
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
