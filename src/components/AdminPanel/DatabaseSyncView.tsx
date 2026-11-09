import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
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
    cloudConnected,
    refreshFromCloud,
    courts,
    bookings,
    reviews,
    whatsappLogs 
  } = useApp();

  const [importJsonText, setImportJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Sincronización en Tiempo Real
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Base de Datos Centralizada de Reservas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Permite que cada turno reservado por cualquier usuario se refleje en vivo en todos los dispositivos y en el mostrador.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800">
            <span className={`w-2.5 h-2.5 rounded-full ${cloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>Última Sincronización: {lastSyncTime.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => refreshFromCloud()}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Nube</span>
          </button>
        </div>
      </div>

      {/* Database stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Canchas Activas</span>
          <div className="text-xl font-black text-slate-900">{courts.length} espacios</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Turnos Sincronizados</span>
          <div className="text-xl font-black text-slate-900">{bookings.length} reservas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Reseñas en Nube</span>
          <div className="text-xl font-black text-slate-900">{reviews.length} opiniones</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">WhatsApp Disparados</span>
          <div className="text-xl font-black text-emerald-600">{whatsappLogs.length} envíos</div>
        </div>
      </div>

      {/* Cloud Architecture Explanation */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Globe className="w-4 h-4" />
          <span>Arquitectura de Sincronización en deportespmy.com.ar</span>
        </div>
        <h3 className="text-base font-bold text-white font-heading">
          Sincronización Automática entre Teléfonos y Computadoras
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Cada vez que un jugador realiza una reserva online o abona una seña con Mercado Pago, el turno se registra de inmediato en la base de datos central en la nube. Un proceso en segundo plano verifica cambios cada 8 segundos y al volver a la pestaña, garantizando que ninguna cancha se superponga y que el mostrador de administración vea los turnos al instante.
        </p>
      </div>

      {/* Export & Import Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export JSON */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Download className="w-4 h-4 text-blue-600" />
            <span>Exportar Copia de Seguridad Completa (JSON)</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Descargá un backup íntegro de toda la plataforma (canchas, tarifas, turnos, clientes, pagos y registros de WhatsApp).
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
            Pegá un archivo JSON exportado previamente para restaurar los turnos y sincronizarlos con la nube.
          </p>

          <textarea
            rows={3}
            placeholder='Pegar contenido JSON aquí...'
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

      {/* Danger Zone: Reset DB */}
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Restablecer base de datos inicial (reinicia turnos y canchas a valores de fábrica)</span>
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
