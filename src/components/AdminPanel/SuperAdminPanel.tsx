import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminUser, DeveloperContact } from '../../types';
import { 
  Crown, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Edit3,
  CheckCircle2, 
  X, 
  Building2,
  Mail,
  Phone,
  Lock,
  Globe,
  Check,
  Save,
  AlertTriangle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';

export const SuperAdminPanel: React.FC = () => {
  const { 
    admins, 
    addAdminUser, 
    updateAdminUser,
    deleteAdminUser, 
    toggleAdminUserStatus, 
    isSuperAdmin,
    developerContact,
    updateDeveloperContact,
    profilesByAdmin,
    toggleAdminPaymentPause
  } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New admin user state
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+54 9 280 ');
  const [password, setPassword] = useState('');
  const [assignedComplex, setAssignedComplex] = useState('');

  // Developer contact state
  const [devName, setDevName] = useState(developerContact.developerName);
  const [devRole, setDevRole] = useState(developerContact.roleTitle);
  const [devWhatsapp, setDevWhatsapp] = useState(developerContact.whatsappNumber);
  const [devEmail, setDevEmail] = useState(developerContact.email);
  const [devWeb, setDevWeb] = useState(developerContact.websiteUrl);
  const [devSavedSuccess, setDevSavedSuccess] = useState(false);

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

  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    await updateAdminUser(editingAdmin);
    setEditingAdmin(null);
  };

  const handleDelete = async (id: string) => {
    await deleteAdminUser(id);
    setDeleteConfirmId(null);
  };

  const handleSaveDeveloperContact = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDeveloperContact({
      developerName: devName.trim(),
      roleTitle: devRole.trim(),
      whatsappNumber: devWhatsapp.trim(),
      email: devEmail.trim(),
      websiteUrl: devWeb.trim()
    });
    setDevSavedSuccess(true);
    setTimeout(() => setDevSavedSuccess(false), 3000);
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-[var(--bg-surface)] p-8 rounded-xl border border-[var(--border-hairline)] text-center max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">Sección Exclusiva para SuperAdministradores</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Iniciá sesión con la cuenta de SuperAdmin para crear, modificar, suspender o borrar administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Header bar */}
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 sm:p-7 rounded-xl border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-soft-text)] mb-1">
            <Crown className="w-4 h-4" />
            <span>Panel Maestro · SuperAdmin</span>
          </div>
          <h2 className="font-heading text-2xl font-bold">
            Gestión de Administradores de Complejos
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">
            Creá, modificá, suspendé o eliminá las cuentas de administrador. Cada administrador gestiona las canchas de su complejo deportivo.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Cuenta de Admin</span>
        </button>
      </div>

      {/* Admins Table / Grid */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Cuentas de Administrador Registradas ({admins.length})
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Estas cuentas se encargan de dar de alta canchas, gestionar reservas y cobrar
            </p>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">
            Firestore Sync Activo
          </span>
        </div>

        <div className="divide-y divide-[var(--border-hairline)]">
          {admins.map((admin) => (
            <div 
              key={admin.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-elevated)]/60 transition-colors"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                  admin.role === 'superadmin' 
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                    : 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border border-[var(--accent)]/30'
                }`}>
                  {admin.role === 'superadmin' ? <Crown className="w-5 h-5 text-amber-400" /> : admin.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">{admin.fullName || admin.username}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      admin.role === 'superadmin' 
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}>
                      {admin.role}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      admin.isActive ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}>
                      {admin.isActive ? 'Activo' : 'Suspendido'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                    <span className="font-mono">Usuario: <strong className="text-[var(--text-primary)]">{admin.username}</strong></span>
                    <span className="font-mono">Clave: <strong className="text-[var(--text-primary)]">{admin.password}</strong></span>
                    {admin.assignedComplex && (
                      <span className="text-[var(--accent-soft-text)] font-semibold">• Complejo: {admin.assignedComplex}</span>
                    )}
                    {admin.phone && <span>• Tel: {admin.phone}</span>}
                    {admin.email && <span>• {admin.email}</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Payment Controls, Edit, Suspend/Activate, Delete */}
              {admin.role !== 'superadmin' && (() => {
                const adminKey = admin.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
                const prof = profilesByAdmin[adminKey];
                const mpPaused = Boolean(prof?.mpPaused);
                const transferPaused = Boolean(prof?.transferPaused);

                return (
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => toggleAdminPaymentPause(admin.username, 'mp')}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        mpPaused
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                          : 'bg-sky-500/15 text-sky-300 border-sky-500/35 hover:bg-sky-500/25'
                      }`}
                      title="Pausar o reactivar Mercado Pago de este complejo"
                    >
                      {mpPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                      <span>{mpPaused ? 'MP Pausado' : 'Pausar MP'}</span>
                    </button>

                    <button
                      onClick={() => toggleAdminPaymentPause(admin.username, 'transfer')}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        transferPaused
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                      }`}
                      title="Pausar o reactivar Transferencia CBU de este complejo"
                    >
                      {transferPaused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                      <span>{transferPaused ? 'CBU Pausado' : 'Pausar CBU'}</span>
                    </button>

                    <button
                      onClick={() => setEditingAdmin(admin)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/35 hover:bg-sky-500/25 transition-colors cursor-pointer flex items-center gap-1"
                      title="Modificar datos o clave del administrador"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modificar</span>
                    </button>

                    <button
                      onClick={() => toggleAdminUserStatus(admin.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        admin.isActive 
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25'
                      }`}
                    >
                      {admin.isActive ? 'Suspender' : 'Reactivar'}
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(admin.id)}
                      className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/35 transition-colors cursor-pointer"
                      title="Eliminar este administrador permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* DEVELOPER FOOTER CONTACT CONFIGURATION (EDITABLE BY SUPERADMIN) */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-hairline)]">
          <div>
            <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-0.5">
              Personalización de soporte
            </p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
              Datos de Contacto del Desarrollador (Pie de Página)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Modificá los datos que se muestran en el pie de página reducido de la plataforma.
            </p>
          </div>

          {devSavedSuccess && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>¡Guardado con éxito!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveDeveloperContact} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre o Empresa Desarrolladora</label>
            <input
              type="text"
              required
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej: Estudio de Desarrollo Web PMY"
            />
          </div>

          <div>
            <label className="font-bold text-[var(--text-secondary)] block mb-1">Rol / Especialidad</label>
            <input
              type="text"
              required
              value={devRole}
              onChange={(e) => setDevRole(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Ej: Desarrollo de Software & Soporte Técnico"
            />
          </div>

          <div>
            <label className="font-bold text-[var(--text-secondary)] block mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp de Soporte / Contacto</span>
            </label>
            <input
              type="text"
              required
              value={devWhatsapp}
              onChange={(e) => setDevWhatsapp(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
              placeholder="+54 9 280 412-3456"
            />
          </div>

          <div>
            <label className="font-bold text-[var(--text-secondary)] block mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span>Correo Electrónico de Contacto</span>
            </label>
            <input
              type="email"
              required
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="soporte@deportespmy.com.ar"
            />
          </div>

          <div className="md:col-span-2">
            <label className="font-bold text-[var(--text-secondary)] block mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Sitio Web / Portfolio (Opcional)</span>
            </label>
            <input
              type="url"
              value={devWeb}
              onChange={(e) => setDevWeb(e.target.value)}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
              placeholder="https://deportespmy.com.ar"
            />
          </div>

          <div className="md:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Contacto del Desarrollador</span>
            </button>
          </div>
        </form>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">¿Eliminar este administrador?</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Esta cuenta ya no podrá acceder al panel de administración.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ADMIN MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <h3 className="text-base font-bold font-heading text-[var(--text-primary)] uppercase tracking-wide">
                  Nueva Cuenta de Administrador
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Definí los accesos para el nuevo administrador</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre de Usuario (Login)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: admin_madryn"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] lowercase font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Contraseña</label>
                <input
                  type="text"
                  required
                  placeholder="Contraseña de acceso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre y Apellido del Titular</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Rodríguez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Establecimiento / Complejo Asignado</label>
                <input
                  type="text"
                  placeholder="Ej: Complejo Playa Grande"
                  value={assignedComplex}
                  onChange={(e) => setAssignedComplex(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="admin@complejo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs shadow-md cursor-pointer"
                >
                  Crear Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / MODIFY ADMIN MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <h3 className="text-base font-bold font-heading text-[var(--text-primary)] uppercase tracking-wide">
                  Modificar Cuenta de Administrador
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Editá los accesos o datos del usuario</p>
              </div>
              <button onClick={() => setEditingAdmin(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.username}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, username: e.target.value.toLowerCase().trim() })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Contraseña</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.password}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, password: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre y Apellido del Titular</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.fullName}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, fullName: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Complejo Asignado</label>
                <input
                  type="text"
                  value={editingAdmin.assignedComplex || ''}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, assignedComplex: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingAdmin.email || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingAdmin.phone || ''}
                    onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Estado de la Cuenta</label>
                <select
                  value={editingAdmin.isActive ? 'active' : 'suspended'}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, isActive: e.target.value === 'active' })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="active">Activo (Puede ingresar al panel)</option>
                  <option value="suspended">Suspendido (Acceso bloqueado)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs shadow-md cursor-pointer"
                >
                  Guardar Modificaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
