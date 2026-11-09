import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Phone, 
  Mail, 
  Globe, 
  Lock, 
  Code2, 
  ShieldCheck 
} from 'lucide-react';

interface FooterProps {
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  const { setActiveTab, isAdminAuthenticated, developerContact } = useApp();

  const cleanDevPhone = (developerContact.whatsappNumber || '+5492804123456').replace(/\D/g, '');

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-6 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Compact Developer Contact Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Developer identity and role */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center text-indigo-400 shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm">
                Desarrollado por: <span className="text-indigo-400">{developerContact.developerName}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {developerContact.roleTitle} • Puerto Madryn, Argentina
              </p>
            </div>
          </div>

          {/* Developer direct contact links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            {developerContact.whatsappNumber && (
              <a 
                href={`https://wa.me/${cleanDevPhone}?text=Hola%20${encodeURIComponent(developerContact.developerName)},%20te%20contacto%20desde%20DeportesPMY`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Contactar al desarrollador por WhatsApp"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{developerContact.whatsappNumber}</span>
              </a>
            )}

            {developerContact.email && (
              <a 
                href={`mailto:${developerContact.email}`}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
                title="Enviar correo al desarrollador"
              >
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{developerContact.email}</span>
              </a>
            )}

            {developerContact.websiteUrl && (
              <a 
                href={developerContact.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-mono transition-colors"
                title="Visitar sitio del desarrollador"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{developerContact.websiteUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>

          {/* Admin access button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isAdminAuthenticated) {
                  setActiveTab('admin');
                } else {
                  onOpenAdminLogin();
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isAdminAuthenticated ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>Panel Administrador</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Acceso Admin</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Minimal Copyright Row */}
        <div className="mt-4 pt-4 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 gap-2">
          <div>
            © 2026 DeportesPMY • Todos los derechos reservados.
          </div>
          <div className="font-mono text-emerald-500/80">
            deportespmy.com.ar
          </div>
        </div>

      </div>
    </footer>
  );
};
