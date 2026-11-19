import React, { useEffect, useState } from 'react';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  QrCode,
  Code2,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useBackHandler } from '../hooks/useBackHandler';
import { isNativeAndroidApp } from '../utils/api';

interface PWAInstallButtonProps {
  variant?: 'chip' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'chip' }) => {
  const { canNativeInstall, isInstalled, isIos, promptInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [modalTab, setModalTab] = useState<'android' | 'ios' | 'apk'>('android');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const isNativeAndroid = isNativeAndroidApp();
  const isAndroidBrowser =
    typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');

  useBackHandler(showGuideModal, () => setShowGuideModal(false), 'pwa-install-guide');

  useEffect(() => {
    if (isIos) {
      setModalTab('ios');
    } else {
      setModalTab('android');
    }
  }, [isIos]);

  useEffect(() => {
    if (!showGuideModal || typeof window === 'undefined') return;
    const targetUrl = window.location.origin;
    QRCode.toDataURL(targetUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: '#0D1117',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [showGuideModal]);

  if (isInstalled || isNativeAndroid) {
    if (variant === 'footer') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isNativeAndroid ? 'App Android nativa activa' : 'App instalada en este dispositivo'}
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

  const handleCopy = (cmd: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd).catch(() => {});
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(null), 2000);
    }
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
          <span>App Android / Instalar</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          title="Instalar DeportesPMY como aplicación en tu Android"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>{isAndroidBrowser ? 'Instalar App Android' : 'App Android'}</span>
        </button>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden my-auto">
            <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between bg-[var(--bg-subtle)]/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)]">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    DeportesPMY para Android
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    App instalable al instante · Notificaciones Push · Modo Offline
                  </p>
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

            {/* Sub-tabs */}
            <div className="px-5 pt-3 flex gap-1.5 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/40">
              <button
                type="button"
                onClick={() => setModalTab('android')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'android'
                    ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instalar en Android</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('ios')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'ios'
                    ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Share className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('apk')}
                className={`px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'apk'
                    ? 'border-[var(--accent)] text-[var(--text-primary)] bg-[var(--bg-surface)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>APK / Android Studio</span>
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm text-[var(--text-secondary)]">
              {modalTab === 'android' && (
                <div className="space-y-4">
                  {canNativeInstall && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await promptInstall();
                        if (res === 'accepted') setShowGuideModal(false);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Instalar DeportesPMY ahora en este dispositivo</span>
                    </button>
                  )}

                  {!isAndroidBrowser && qrDataUrl && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <img
                        src={qrDataUrl}
                        alt="QR para abrir en Android"
                        className="w-28 h-28 rounded-lg bg-white p-1.5 shrink-0 shadow-sm"
                      />
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                          <QrCode className="w-4 h-4 text-[var(--accent)]" />
                          <span>Escaneá desde tu celular Android</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Apuntá la cámara de tu teléfono Android a este QR para abrir la web e instalar la aplicación directamente en tu pantalla de inicio.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      Pasos para instalar en Android (Chrome / Edge / Samsung Internet):
                    </p>
                    <ol className="space-y-2 text-xs list-decimal list-inside p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <li>
                        Abrí esta página desde <strong className="text-[var(--text-primary)]">Google Chrome</strong> en tu celular Android.
                      </li>
                      <li>
                        Tocá el menú (<strong className="text-[var(--text-primary)]">⋮</strong> arriba a la derecha).
                      </li>
                      <li>
                        Elegí <strong className="text-[var(--text-primary)]">“Instalar aplicación”</strong> o{' '}
                        <strong className="text-[var(--text-primary)]">“Agregar a la pantalla principal”</strong>.
                      </li>
                      <li>
                        Confirmá <strong className="text-[var(--text-primary)]">“Instalar”</strong>: Android generará el acceso nativo con ícono, pantalla completa y avisos Push en segundo plano.
                      </li>
                    </ol>
                  </div>
                </div>
              )}

              {modalTab === 'ios' && (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed">
                    En <strong className="text-[var(--text-primary)]">iPhone o iPad (Safari)</strong> podés instalar la app en 3 pasos:
                  </p>
                  <ol className="space-y-2.5 text-xs">
                    <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <Share className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>
                        Tocá el botón <strong className="text-[var(--text-primary)]">Compartir</strong> en la barra inferior de Safari.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <PlusSquare className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                      <span>
                        Deslizá hacia abajo y elegí <strong className="text-[var(--text-primary)]">“Agregar a inicio”</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>
                        Confirmá con <strong className="text-[var(--text-primary)]">“Agregar”</strong> y ya tendrás DeportesPMY con ícono propio.
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {modalTab === 'apk' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Proyecto Android Nativo (Capacitor) incluido</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        El código fuente ya cuenta con la carpeta <code className="font-mono font-bold">/android</code> y <code className="font-mono font-bold">capacitor.config.ts</code> configurados con el ID{' '}
                        <code className="font-mono font-bold">ar.com.deportespmy.app</code>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-[var(--text-primary)]">
                      Cómo generar el archivo <code className="font-mono">.apk</code> o <code className="font-mono">.aab</code> para Play Store:
                    </p>
                    <ol className="space-y-2 list-decimal list-inside text-[11px] p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <li>Descargá o cloná el proyecto en tu PC con Android Studio y Java 17+.</li>
                      <li>Ejecutá la sincronización web → Android:</li>
                    </ol>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-[11px] text-[var(--text-primary)]">
                      <span className="truncate">npm run android:sync</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('npm run android:sync')}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
                        title="Copiar comando"
                      >
                        {copiedCmd === 'npm run android:sync' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-[11px] text-[var(--text-primary)]">
                      <span className="truncate">cd android && ./gradlew assembleDebug</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('cd android && ./gradlew assembleDebug')}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
                        title="Copiar comando"
                      >
                        {copiedCmd === 'cd android && ./gradlew assembleDebug' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)]">
                      También podés abrir la carpeta <code className="font-mono">/android</code> en Android Studio y elegir <strong>Build → Build APK(s)</strong> o <strong>Generate Signed Bundle</strong>.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-extrabold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
