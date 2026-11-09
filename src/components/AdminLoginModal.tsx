import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, ShieldCheck, X, KeyRound, AlertCircle, Crown, User } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const { loginAdmin } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginAdmin(password, username);
    if (res.success) {
      setErrorMsg(null);
      setPassword('');
      setUsername('');
      onClose();
      onLoginSuccess();
    } else {
      setErrorMsg(res.message || 'Contraseña o usuario incorrecto');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-heading">Acceso de Administración</h3>
              <p className="text-[11px] text-slate-400">DeportesPMY • Control Central</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Usuario (Opcional si usa clave directa)
            </label>
            <input
              type="text"
              placeholder="Ej: superadmin o admin"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-400" />
              Contraseña de Acceso
            </label>
            <input
              type="password"
              autoFocus
              required
              placeholder="Ingresá tu contraseña..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errorMsg && (
              <p className="text-rose-400 text-[11px] mt-1.5 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>

          {/* Key Reference Cards */}
          <div className="space-y-1.5">
            <div className="p-2.5 bg-amber-950/30 border border-amber-900/40 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-400">SuperAdmin Maestro:</span>
                <div className="text-[10px] text-slate-400">
                  Clave: <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-mono font-bold">superadmin2026</code> (Crea y administra cuentas)
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-blue-950/30 border border-blue-900/40 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-400">Administrador General:</span>
                <div className="text-[10px] text-slate-400">
                  Clave directa: <code className="bg-slate-950 px-1 py-0.5 rounded text-blue-300 font-mono font-bold">pmy2026</code>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-lg shadow-blue-600/30"
            >
              Ingresar al Panel
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
