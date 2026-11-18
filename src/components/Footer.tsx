import React from 'react';
import { useApp } from '../context/AppContext';
import { useTheme, COLOR_PALETTES } from '../context/ThemeContext';
import { Phone, Mail, Globe, Palette, Sun, Moon } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export const Footer: React.FC = () => {
  const { developerContact, siteContent } = useApp();
  const { palette, setPalette, mode, toggleMode } = useTheme();

  const cleanWhatsapp = (developerContact.whatsappNumber || '').replace(/\D/g, '');
  const hasAnyContact = Boolean(
    developerContact.whatsappNumber ||
      developerContact.email ||
      developerContact.websiteUrl
  );

  return (
    <footer className="bg-[var(--bg-surface)] border-t border-[var(--border-hairline)] text-[var(--text-secondary)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs">
          {/* Developer Contact Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="space-y-0.5">
              {developerContact.developerName && (
                <p className="font-semibold text-[var(--text-primary)]">
                  {developerContact.developerName}
                </p>
              )}
              {developerContact.roleTitle && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  {developerContact.roleTitle}
                </p>
              )}
            </div>

            {hasAnyContact && (
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {developerContact.whatsappNumber && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hola, me contacto desde DeportesPMY')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono tabular-nums"
                  >
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--accent-bright)' }} />
                    <span>{developerContact.whatsappNumber}</span>
                  </a>
                )}

                {developerContact.email && (
                  <a
                    href={`mailto:${developerContact.email}`}
                    className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" style={{ color: 'var(--accent-bright)' }} />
                    <span>{developerContact.email}</span>
                  </a>
                )}

                {developerContact.websiteUrl && (
                  <a
                    href={developerContact.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent-bright)' }} />
                    <span>{developerContact.websiteUrl.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Install App + Theme Mode Toggle & ARCA QR */}
          <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[var(--border-hairline)]">
            {siteContent.arcaQrCodeUrl && (
              <a
                href={siteContent.arcaQrCodeUrl}
                target="_blank"
                rel="noreferrer"
                title="Formulario 960 - ARCA (AFIP)"
                className="inline-flex items-center gap-2 hover:opacity-85 transition-opacity bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg border border-[var(--border-hairline)]"
              >
                <img
                  src={siteContent.arcaQrCodeUrl}
                  alt="QR ARCA Formulario 960"
                  className="w-10 h-10 object-contain rounded bg-white p-0.5"
                />
                <div className="text-[10px] text-[var(--text-muted)] leading-tight">
                  <span className="font-semibold text-[var(--text-primary)] block">Data Fiscal</span>
                  <span>ARCA F. 960</span>
                </div>
              </a>
            )}

            <PWAInstallButton variant="footer" />

            <button
              type="button"
              onClick={toggleMode}
              aria-label={mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              title={mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer transition-colors"
            >
              {mode === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tema Oscuro</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-[var(--text-muted)] inline-flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                <span>Color:</span>
              </span>
              <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-full border border-[var(--border-hairline)]">
                {COLOR_PALETTES.map((p) => {
                  const isSelected = palette === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPalette(p.id)}
                      title={`${p.name} — ${p.description}`}
                      aria-label={`Color ${p.name}`}
                      className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                        isSelected
                          ? 'scale-110 ring-2 ring-[var(--text-primary)] ring-offset-2 ring-offset-[var(--bg-subtle)]'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${p.swatchPrimary} 0%, ${p.swatchSecondary} 100%)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
