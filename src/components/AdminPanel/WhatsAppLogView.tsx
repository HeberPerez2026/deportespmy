import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageCircle, CheckCheck, Clock, Send, Search, Phone, ExternalLink, Copy, Check } from 'lucide-react';

export const WhatsAppLogView: React.FC = () => {
  const { adminWhatsappLogs: whatsappLogs, adminBookings: bookings, triggerWhatsAppSend } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Automatizaciones & Webhooks
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Registro de Notificaciones de WhatsApp
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Cada reserva exitosa genera automáticamente el mensaje con QR y comprobante para el cliente.
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

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-hairline)]">
                <th className="py-3 px-4 font-semibold">Fecha / Hora</th>
                <th className="py-3 px-4 font-semibold">Reserva</th>
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

                return (
                  <tr key={log.id} className="hover:bg-[var(--bg-subtle)]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                      {log.sentAt}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[var(--accent-soft-text)] whitespace-nowrap">
                      #{log.bookingCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                      {log.recipientName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                      {log.recipientPhone}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs truncate" title={log.messagePreview}>
                      {log.messagePreview}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-soft-text)] bg-[var(--accent-soft)] px-2.5 py-0.5 rounded-md">
                        <CheckCheck className="w-3.5 h-3.5" />
                        Enviado
                      </span>
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
                            onClick={() => triggerWhatsAppSend(booking)}
                            className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] hover:opacity-80 cursor-pointer"
                            title="Reenviar a WhatsApp Web/App"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
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
