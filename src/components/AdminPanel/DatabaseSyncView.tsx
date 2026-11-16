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
    adminCourts: courts,
    adminBookings: bookings,
    reviews,
    adminWhatsappLogs: whatsappLogs 
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
      <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Sincronización en Tiempo Real
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Base de Datos Centralizada de Reservas
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Permite que cada turno reservado por cualquier usuario se refleje en vivo en todos los dispositivos y en el mostrador.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--accent-soft)] px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--accent-soft-text)] tabular-nums">
            <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-[var(--accent)]' : 'bg-amber-500'}`} />
            <span>Última Sincronización: {lastSyncTime.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={() => refreshFromCloud()}
            className="px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Nube</span>
          </button>
        </div>
      </div>

      {/* Database stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">Canchas Activas</span>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{courts.length} espacios</div>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">Turnos Sincronizados</span>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{bookings.length} reservas</div>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">Reseñas en Nube</span>
          <div className="text-xl font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{reviews.length} opiniones</div>
        </div>

        <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-hairline)]">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">WhatsApp Disparados</span>
          <div className="text-xl font-bold text-[var(--accent)] tabular-nums mt-0.5">{whatsappLogs.length} envíos</div>
        </div>
      </div>

      {/* Cloud Architecture Explanation */}
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-2.5">
        <div className="flex items-center gap-2 text-[var(--accent-soft-text)] font-semibold text-xs uppercase tracking-wider">
          <Globe className="w-4 h-4" />
          <span>Arquitectura de Sincronización · deportespmy.com.ar</span>
        </div>
        <h3 className="text-base font-bold font-heading">
          Sincronización Automática entre Teléfonos y Computadoras
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Cada vez que un jugador realiza una reserva online o abona una seña con Mercado Pago, el turno se registra de inmediato en la base de datos central en la nube. Un proceso en segundo plano verifica cambios automáticamente, garantizando que ninguna cancha se superponga y que el mostrador de administración vea los turnos al instante.
        </p>
      </div>

      {/* Export & Import Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export JSON */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm">
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Exportar Copia de Seguridad Completa (JSON)</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Descargá un backup íntegro de toda la plataforma (canchas, tarifas, turnos, clientes, pagos y registros de WhatsApp).
          </p>
          <button
            onClick={handleDownload}
            className="w-full py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar deportespmy_central_db.json</span>
          </button>
        </div>

        {/* Import JSON */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-hairline)] space-y-3">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)] text-sm">
            <Upload className="w-4 h-4 text-[var(--accent)]" />
            <span>Importar / Restaurar Base de Datos</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Pegá un archivo JSON exportado previamente para restaurar los turnos y sincronizarlos con la nube.
          </p>

          <textarea
            rows={3}
            placeholder='Pegar contenido JSON aquí...'
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            className="w-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-lg p-2.5 text-[11px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />

          <div className="flex items-center justify-between">
            {importStatus === 'success' && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ¡Base de datos importada con éxito!
              </span>
            )}
            {importStatus === 'error' && (
              <span className="text-xs text-rose-600 font-semibold">
                Formato JSON inválido
              </span>
            )}
            <button
              onClick={handleImport}
              disabled={!importJsonText.trim()}
              className="ml-auto px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-fg)] font-semibold text-xs cursor-pointer"
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
