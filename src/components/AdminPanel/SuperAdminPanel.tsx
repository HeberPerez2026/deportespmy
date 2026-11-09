import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminUser } from '../../types';
import { 
  Crown, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  X, 
  Building2,
  Mail,
  Phone,
  Lock,
  UserCheck
} from 'lucide-react';

export const SuperAdminPanel: React.FC = () => {
  const { admins, addAdminUser, deleteAdminUser, toggleAdminUserStatus, isSuperAdmin } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New admin user state
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+54 9 280 ');
  const [password, setPassword] = useState('');
  const [assignedComplex, setAssignedComplex] = useState('');

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    await addAdminUser({
      username: username.trim().toLowerCase(),
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password: password.trim(),
      role: 'admin',
      assignedComplex: assignedComplex.trim(),
      isActive: true
    });

    setIsAddModalOpen(false);
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setAssignedComplex('');
  };

  const handleDelete = async (id: string) => {
    await deleteAdminUser(id);
    setDeleteConfirmId(null);
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Sección Exclusiva para SuperAdministradores</h3>
        <p className="text-xs text-slate-600">
          Iniciá sesión con la cuenta principal de SuperAdmin para crear y gestionar otros administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-indigo-900/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Crown className="w-4 h-4" />
            <span>Gestión Maestra • Nivel SuperAdmin</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading">
            Administración de Cuentas de Acceso
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Creá cuentas de administradores para que los encargados de cada complejo o cancha gestionen turnos, cobros y tarifas.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Cuenta de Administrador</span>
        </button>
      </div>

      {/* Admins Table / Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Cuentas Habilitadas ({admins.length})
          </h3>
          <span className="text-xs text-slate-500">
            Sincronizado en tiempo real con Firestore
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {admins.map((admin) => (
            <div 
              key={admin.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                  admin.role === 'superadmin' 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {admin.role === 'superadmin' ? <Crown className="w-5 h-5 text-amber-600" /> : admin.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{admin.fullName || admin.username}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      admin.role === 'superadmin' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {admin.role}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      admin.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {admin.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono text-slate-700">Usuario: <strong>{admin.username}</strong></span>
                    {admin.assignedComplex && (
                      <span>• Complejo: <strong>{admin.assignedComplex}</strong></span>
                    )}
                    {admin.email && <span>• {admin.email}</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {admin.role !== 'superadmin' && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => toggleAdminUserStatus(admin.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      admin.isActive 
                        ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {admin.isActive ? 'Suspender' : 'Reactivar'}
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(admin.id)}
                    className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                    title="Eliminar este administrador"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-slate-900">¿Eliminar este administrador?</h3>
            <p className="text-xs text-slate-600">
              Esta cuenta ya no podrá acceder al panel de administración.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  Nueva Cuenta de Administrador
                </h3>
                <p className="text-xs text-slate-500">Definí los accesos para el nuevo usuario</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre de Usuario (Para loguearse)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: admin_canchas"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 lowercase font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contraseña de Acceso</label>
                <input
                  type="text"
                  required
                  placeholder="Contraseña segura"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Martín Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Establecimiento / Complejo Asignado</label>
                <input
                  type="text"
                  placeholder="Ej: Complejo Costanera"
                  value={assignedComplex}
                  onChange={(e) => setAssignedComplex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="admin@complejo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  Crear Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
