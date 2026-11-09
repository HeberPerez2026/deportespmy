import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  MessageCircle, 
  Lock
} from 'lucide-react';

interface FooterProps {
  onOpenAdminLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  const { setActiveTab, isAdminAuthenticated } = useApp();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-900">
          
          {/* Brand & City */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-lg font-black text-white tracking-tighter">PMY</span>
              </div>
              <span className="font-heading font-extrabold text-xl text-white">
                Deportes<span className="text-emerald-400">PMY</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              El complejo deportivo más completo de Puerto Madryn frente al mar. Fútbol 5, Fútbol 7, Pádel Panorámico WPT, Tenis de polvo de ladrillo y multiespacio cerrado.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>deportespmy.com.ar</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs font-heading">
              Navegación Rápida
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => setActiveTab('turnos')} className="hover:text-emerald-400 transition-colors cursor-pointer">
                  Reservar Turnos Online
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('canchas')} className="hover:text-emerald-400 transition-colors cursor-pointer">
                  Nuestras Canchas & Tarifas
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('valoraciones')} className="hover:text-emerald-400 transition-colors cursor-pointer">
                  Opiniones de Jugadores
                </button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    if (isAdminAuthenticated) {
                      setActiveTab('admin');
                    } else {
                      onOpenAdminLogin();
                    }
                  }} 
                  className="hover:text-blue-400 transition-colors text-slate-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Lock className="w-3 h-3 text-blue-400" />
                  <span>Acceso Administrador</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Location & Schedule */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs font-heading">
              Ubicación & Horarios
            </h4>
            <div className="space-y-2 text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Boulevard Brown 1420 (Costanera frente al Golfo Nuevo), Puerto Madryn, Chubut</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Lunes a Domingos de 08:00 a 01:00 hs (Feriados inclusive)</span>
              </div>
            </div>
          </div>

          {/* Contact & WhatsApp */}
          <div className="space-y-2.5 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs font-heading">
              Contacto & WhatsApp
            </h4>
            <div className="space-y-2 text-slate-400">
              <a 
                href="https://wa.me/5492804567890?text=Hola%20DeportesPMY!%20Quiero%20hacer%20una%20consulta%20sobre%20turnos"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <MessageCircle className="w-4 h-4" />
                <span>+54 9 280 456-7890 (Recepción)</span>
              </a>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span>reservas@deportespmy.com.ar</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  if (isAdminAuthenticated) {
                    setActiveTab('admin');
                  } else {
                    onOpenAdminLogin();
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-600/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>{isAdminAuthenticated ? 'Ir al Panel Admin' : 'Ingreso Administrador'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div>
            © 2026 DeportesPMY • Todos los derechos reservados. Puerto Madryn, Argentina.
          </div>
          <div className="flex items-center gap-4">
            <span>Mercado Pago Argentina Integrado</span>
            <span>•</span>
            <span>Notificaciones Automáticas WhatsApp</span>
            <span>•</span>
            <span className="font-mono text-emerald-500">deportespmy.com.ar</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
