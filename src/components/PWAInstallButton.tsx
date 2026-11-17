import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useBackHandler } from '../hooks/useBackHandler';

interface PWAInstallButtonProps {
  variant?: 'chip' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'chip' }) => {
  const { canNativeInstall, isInstalled, isIos, promptInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  useBackHandler(showGuideModal, () => setShowGuideModal(false), 'pwa-install-guide');

  if (isInstalled) {
    if (variant === 'footer') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          App instalada en este dispositivo
        </span>
      );
    }
    return null;
  }

  const handleClick = async () => {
    if (canNativeInstall) {
      const outcome = await promptInstall();
      if (outcome === 'unavailable') {
        setShowGuideModal(true);
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'footer' ? (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Instalar App en tu celular</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          title="Instalar DeportesPMY como aplicación en tu celular"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Instalar App</span>
        </button>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-subtle)]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">Instalar DeportesPMY</h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">Acceso directo y modo App en pantalla completa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm text-[var(--text-secondary)]">
              {isIos ? (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed">
                    En <strong className="text-[var(--text-primary)]">iPhone o iPad (Safari)</strong> podés instalar la app en 3 pasos:
                  </p>
                  <ol className="space-y-2.5 text-xs">
                    <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <Share className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>Tocá el botón <strong className="text-[var(--text-primary)]">Compartir</strong> en la barra inferior de Safari.</span>
                    </li>
                    <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <PlusSquare className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>Deslizá hacia abajo y elegí <strong className="text-[var(--text-primary)]">“Agregar a inicio”</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Confirmá con <strong className="text-[var(--text-primary)]">“Agregar”</strong> y ya tendrás DeportesPMY con ícono propio.</span>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed">
                    Si tu navegador todavía no mostró el cartel automático de instalación, podés instalarla manualmente:
                  </p>
                  <ol className="space-y-2 text-xs list-decimal list-inside p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                    <li>Abrí el menú del navegador (<strong className="text-[var(--text-primary)]">⋮</strong> arriba a la derecha en Chrome o Edge).</li>
                    <li>Seleccioná <strong className="text-[var(--text-primary)]">“Instalar aplicación”</strong> o <strong className="text-[var(--text-primary)]">“Agregar a la pantalla principal”</strong>.</li>
                    <li>Confirmá para abrir DeportesPMY como app nativa.</li>
                  </ol>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-extrabold text-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
