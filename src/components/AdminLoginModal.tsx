import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { ShieldCheck, X, KeyRound, AlertCircle, User } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { loginAdmin } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBackHandler(isOpen, onClose, 'admin-login-modal');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor completá usuario y contraseña');
      return;
    }

    const res = loginAdmin(password, username);
    if (res.success) {
      setErrorMsg(null);
      setPassword('');
      setUsername('');
      onClose();
      onLoginSuccess();
    } else {
      setErrorMsg(res.message || 'Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] rounded-xl max-w-sm w-full p-6 shadow-xl space-y-5">
        <div className="flex justify-between items-start pb-3 border-b border-[var(--border-hairline)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl leading-tight">Acceso Clubes</h3>
              <p className="text-xs text-[var(--text-muted)]">Panel de gestión DeportesPMY</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--text-primary)] font-semibold mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Nombre de usuario
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ingresá tu usuario"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-[var(--text-primary)] font-semibold mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="Ingresá tu contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg px-3.5 py-2.5 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            {errorMsg && (
              <p className="text-rose-600 dark:text-rose-400 text-xs mt-2 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold cursor-pointer transition-colors"
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
