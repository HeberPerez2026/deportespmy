import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  CreditCard, 
  MessageCircle, 
  MapPin, 
  Mail, 
  User, 
  CheckCircle2, 
  Save,
  HelpCircle
} from 'lucide-react';

export const AdminProfileSettings: React.FC = () => {
  const { businessProfile, updateBusinessProfile } = useApp();

  const [ownerName, setOwnerName] = useState(businessProfile.ownerName || '');
  const [complexName, setComplexName] = useState(businessProfile.complexName || '');
  const [cbu, setCbu] = useState(businessProfile.cbu || '');
  const [alias, setAlias] = useState(businessProfile.alias || '');
  const [accountHolder, setAccountHolder] = useState(businessProfile.accountHolder || '');
  const [whatsappNumber, setWhatsappNumber] = useState(businessProfile.whatsappNumber || '');
  const [address, setAddress] = useState(businessProfile.address || '');
  const [email, setEmail] = useState(businessProfile.email || '');
  const [welcomeNotes, setWelcomeNotes] = useState(businessProfile.welcomeNotes || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBusinessProfile({
      ownerName: ownerName.trim(),
      complexName: complexName.trim(),
      cbu: cbu.trim(),
      alias: alias.trim().toUpperCase(),
      accountHolder: accountHolder.trim(),
      whatsappNumber: whatsappNumber.trim(),
      address: address.trim(),
      email: email.trim(),
      welcomeNotes: welcomeNotes.trim()
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Configuración del Establecimiento
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Información del Administrador & Datos de Cobro
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Esta información se utiliza en los mensajes automáticos de WhatsApp, en las transferencias bancarias y en la cabecera de la web.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>¡Datos guardados con éxito!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Complex & Administrator Identity */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Identidad del Complejo Deportivo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nombre y Apellido del Responsable</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Ej: Marcelo Gallardo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nombre Comercial del Complejo / Club</label>
              <input
                type="text"
                required
                value={complexName}
                onChange={(e) => setComplexName(e.target.value)}
                placeholder="Ej: Complejo Deportivo Costanera PMY"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial Details for Payment (CBU, Alias) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Datos Bancarios y Mercado Pago para Cobros de Reservas</span>
          </div>

          <p className="text-xs text-slate-500">
            Los clientes verán estos datos al seleccionar la opción de pago por Transferencia o Seña previa al partido.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Alias de Transferencia (MP / Banco)</label>
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Ej: DEPORTES.PMY.MP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-emerald-700"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">CBU / CVU (22 dígitos)</label>
              <input
                type="text"
                value={cbu}
                onChange={(e) => setCbu(e.target.value)}
                placeholder="Ej: 0000003100012345678901"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Titular de la Cuenta</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Ej: Deportes Puerto Madryn SRL"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Contact & Address Details */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
            <MessageCircle className="w-4 h-4 text-teal-600" />
            <span>Contacto, WhatsApp & Ubicación del Complejo</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Número de WhatsApp (con código de país)</label>
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="Ej: +5492804567890"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Desde este número se abrirán las notificaciones a los jugadores</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Correo Electrónico de Contacto</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reservas@deportespmy.com.ar"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Dirección Física en Puerto Madryn</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Boulevard Brown 1420 (Costanera frente al mar)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Instrucciones o Aclaraciones para el Jugador</label>
            <textarea
              rows={2}
              value={welcomeNotes}
              onChange={(e) => setWelcomeNotes(e.target.value)}
              placeholder="Ej: Presentarse 10 minutos antes. Contamos con vestuarios con agua caliente, alquiler de paletas y buffet..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Este texto se agregará automáticamente al final de cada confirmación de WhatsApp</span>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Información del Administrador</span>
          </button>
        </div>

      </form>

    </div>
  );
};
