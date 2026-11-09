import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  Smartphone, 
  Globe, 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertTriangle 
} from 'lucide-react';

export const DatabaseSyncView: React.FC = () => {
  const { 
    exportDatabaseJson, 
    importDatabaseJson, 
    resetDatabase, 
    lastSyncTime, 
    isSyncing,
    courts,
    bookings,
    reviews,
    whatsappLogs 
  } = useApp();

  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleDownload = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deportespmy_central_db_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!importJsonText.trim()) return;
    const ok = importDatabaseJson(importJsonText);
    if (ok) {
      setImportStatus('success');
      setTimeout(() => setImportStatus(null), 3000);
      setImportJsonText('');
    } else {
      setImportStatus('error');
    }
  };

  const sampleApiCall = `// Ejemplo de sincronización en tiempo real para Android (Retrofit / Ktor / OkHttp)
val api = DeportesPmyClient.create("https://deportespmy.com.ar/api")

// 1. Obtener canchas y turnos en tiempo real
val courts = api.getCourts()
val slotsToday = api.getSlots(date = "2026-11-08")

// 2. Crear reserva desde la App Android
val booking = api.createBooking(
    courtId = "cancha-1-f5",
    date = "2026-11-08",
    startTime = "20:00",
    clientName = "Jugador Android",
    clientPhone = "+5492804...",
    paymentMethod = "mercadopago"
)

// 3. Notificación automática WhatsApp se envía por webhook al instante`;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Arquitectura de Datos & Sincronización
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Base de Datos Central & API Android
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Motor de persistencia en tiempo real para la web y las aplicaciones móviles de Puerto Madryn.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sincronizado Central: {lastSyncTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Database stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Canchas Activas</span>
          <div className="text-xl font-black text-slate-900">{courts.length} espacios</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Turnos Registrados</span>
          <div className="text-xl font-black text-slate-900">{bookings.length} reservas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Reseñas en BD</span>
          <div className="text-xl font-black text-slate-900">{reviews.length} opiniones</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">WhatsApp Disparados</span>
          <div className="text-xl font-black text-emerald-600">{whatsappLogs.length} envíos</div>
        </div>
      </div>

      {/* Export & Import Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export JSON */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Download className="w-4 h-4 text-blue-600" />
            <span>Exportar Base de Datos Completa (JSON)</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Descargá una copia de seguridad íntegra de toda la plataforma (canchas, tarifas, turnos de clientes, logs de WhatsApp y reseñas) para migración o backup.
          </p>
          <button
            onClick={handleDownload}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Descargar deportespmy_central_db.json</span>
          </button>
        </div>

        {/* Import JSON */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Importar / Restaurar Base de Datos</span>
          </div>
          <p className="text-xs text-slate-500">
            Pegá la estructura JSON para actualizar los datos en memoria y sincronizar con los clientes.
          </p>

          <textarea
            rows={3}
            placeholder='Pegar contenido de deportespmy_central_db.json...'
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />

          <div className="flex items-center justify-between">
            {importStatus === 'success' && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ¡Base de datos importada con éxito!
              </span>
            )}
            {importStatus === 'error' && (
              <span className="text-xs text-rose-600 font-bold">
                Formato JSON inválido
              </span>
            )}
            <button
              onClick={handleImport}
              disabled={!importJsonText.trim()}
              className="ml-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
            >
              Cargar y Sincronizar
            </button>
          </div>
        </div>

      </div>

      {/* Android SDK & Real-Time API Docs */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm font-heading">
                Conexión en Tiempo Real con las Aplicaciones Android
              </h3>
              <span className="text-xs text-slate-400">
                1 App Android para Administrar Canchas + 1 App Android para Jugadores
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(sampleApiCall);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? '¡Copiado!' : 'Copiar Código Android'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Ambas aplicaciones de Android pueden consultar el mismo backend central de <strong className="text-white">deportespmy.com.ar</strong> mediante HTTP REST y WebSockets para cambios inmediatos. Los turnos creados en la web se reflejan instantáneamente en los teléfonos del complejo.
        </p>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
          <pre>{sampleApiCall}</pre>
        </div>
      </div>

      {/* Danger Zone: Reset DB */}
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Restablecer base de datos inicial de demostración (reinicia canchas y turnos)</span>
        </div>
        <button
          onClick={() => {
            if (confirm('¿Restablecer toda la base de datos a sus valores iniciales de fábrica?')) {
              resetDatabase();
            }
          }}
          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-xs"
        >
          Resetear BD
        </button>
      </div>

    </div>
  );
};
