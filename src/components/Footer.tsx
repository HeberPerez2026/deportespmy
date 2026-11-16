import React from 'react';
import { useApp } from '../context/AppContext';
import { Phone, Mail, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  const { developerContact } = useApp();

  const cleanWhatsapp = (developerContact.whatsappNumber || '').replace(/\D/g, '');
  const hasAnyContact = Boolean(
    developerContact.whatsappNumber ||
      developerContact.email ||
      developerContact.websiteUrl
  );

  return (
    <footer className="bg-[#090D12] border-t border-[#2A313C] text-[#CBD5E1] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-0.5">
            {developerContact.developerName && (
              <p className="font-semibold text-[#F3F4F6]">
                {developerContact.developerName}
              </p>
            )}
            {developerContact.roleTitle && (
              <p className="text-[11px] text-[#8B949E]">
                {developerContact.roleTitle}
              </p>
            )}
          </div>

          {hasAnyContact && (
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {developerContact.whatsappNumber && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent('Hola, me contacto desde DeportesPMY')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#CBD5E1] hover:text-[#F3F4F6] transition-colors font-mono tabular-nums"
                >
                  <Phone className="w-3.5 h-3.5" style={{ color: 'var(--accent-bright)' }} />
                  <span>{developerContact.whatsappNumber}</span>
                </a>
              )}

              {developerContact.email && (
                <a
                  href={`mailto:${developerContact.email}`}
                  className="inline-flex items-center gap-1.5 text-[#CBD5E1] hover:text-[#F3F4F6] transition-colors"
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
                  className="inline-flex items-center gap-1.5 text-[#CBD5E1] hover:text-[#F3F4F6] transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent-bright)' }} />
                  <span>{developerContact.websiteUrl.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
