import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MessageCircle, CheckCheck, Clock, Send, Search, Phone, ExternalLink, Copy, Check } from 'lucide-react';

export const WhatsAppLogView: React.FC = () => {
  const { whatsappLogs, bookings, triggerWhatsAppSend } = useApp();
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
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
            Automatizaciones & Webhooks
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Registro de Notificaciones de WhatsApp
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cada reserva exitosa genera automáticamente el mensaje con QR y comprobante para el cliente.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-bold">Fecha / Hora</th>
                <th className="py-3 px-4 font-bold">Reserva</th>
                <th className="py-3 px-4 font-bold">Destinatario</th>
                <th className="py-3 px-4 font-bold">WhatsApp</th>
                <th className="py-3 px-4 font-bold">Mensaje Generado</th>
                <th className="py-3 px-4 font-bold text-center">Estado</th>
                <th className="py-3 px-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const booking = bookings.find(b => b.bookingCode === log.bookingCode);

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.sentAt}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      #{log.bookingCode}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                      {log.recipientName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {log.recipientPhone}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.messagePreview}>
                      {log.messagePreview}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Enviado
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleCopy(log.id, log.messagePreview)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                          title="Copiar texto del mensaje"
                        >
                          {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {booking && (
                          <button
                            onClick={() => triggerWhatsAppSend(booking)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer"
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
