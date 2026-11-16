import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminUser, SiteContent } from '../../types';
import {
  Crown,
  UserPlus,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  Mail,
  Phone,
  Globe,
  Save,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  Type,
  MessageSquare,
  Star,
  RotateCcw,
  Search,
  Users,
} from 'lucide-react';

interface TextFieldConfig {
  key: keyof SiteContent;
  label: string;
  multiline?: boolean;
}

interface TextGroupConfig {
  title: string;
  description: string;
  fields: TextFieldConfig[];
}

const SITE_CONTENT_GROUPS: TextGroupConfig[] = [
  {
    title: 'Portada Principal (Hero)',
    description: 'Textos principales de bienvenida, buscador, contadores y chips de filtro.',
    fields: [
      { key: 'heroLocationEyebrow', label: 'Etiqueta superior de ubicación' },
      { key: 'heroTitle', label: 'Título principal de portada' },
      { key: 'heroSubtitle', label: 'Subtítulo descriptivo de portada', multiline: true },
      { key: 'heroKpiCourtsLabel', label: 'Etiqueta KPI "Canchas activas"' },
      { key: 'heroKpiComplexesLabel', label: 'Etiqueta KPI "Complejos"' },
      { key: 'heroBadgeMpLabel', label: 'Insignia de cobro online' },
      { key: 'heroBadgeWaLabel', label: 'Insignia de WhatsApp' },
      { key: 'heroSearchPlaceholder', label: 'Placeholder del buscador principal' },
      { key: 'heroTodayLabel', label: 'Botón fecha "Hoy"' },
      { key: 'heroTomorrowLabel', label: 'Botón fecha "Mañana"' },
      { key: 'heroAllSportsLabel', label: 'Chip "Todos los deportes"' },
    ],
  },
  {
    title: 'Navegación y Banda de Comunidad',
    description: 'Pestañas superiores del jugador y bloque de reseñas al pie del inicio.',
    fields: [
      { key: 'navTurnosLabel', label: 'Pestaña 1 (Turnos)' },
      { key: 'navComplejosLabel', label: 'Pestaña 2 (Complejos)' },
      { key: 'navOpinionesLabel', label: 'Pestaña 3 (Opiniones)' },
      { key: 'homeReviewsEyebrow', label: 'Etiqueta superior banda de opiniones' },
      { key: 'homeReviewsEmptyHeading', label: 'Título cuando aún no hay opiniones' },
      { key: 'homeReviewsSubtitle', label: 'Descripción banda de opiniones', multiline: true },
      { key: 'homeReviewsButtonLabel', label: 'Botón "Explorar opiniones"' },
    ],
  },
  {
    title: 'Catálogo de Canchas y Grilla de Horarios',
    description: 'Encabezados, leyendas de colores, etiquetas de tarifa y botones de tarjeta.',
    fields: [
      { key: 'catalogEyebrow', label: 'Sobretítulo del catálogo' },
      { key: 'catalogTitlePrefix', label: 'Prefijo de disponibilidad (antes de fecha)' },
      { key: 'catalogSubtitle', label: 'Subtítulo del catálogo', multiline: true },
      { key: 'catalogLegendAvailable', label: 'Leyenda "Disponible"' },
      { key: 'catalogLegendOccupied', label: 'Leyenda "Ocupado"' },
      { key: 'catalogLegendNight', label: 'Leyenda "Tarifa nocturna"' },
      { key: 'catalogRateDayLabel', label: 'Etiqueta "Tarifa diurna"' },
      { key: 'catalogRateNightLabel', label: 'Etiqueta "Nocturno c/luz"' },
      { key: 'catalogDepositLabel', label: 'Etiqueta "Seña reserva"' },
      { key: 'catalogIncludesLabel', label: 'Etiqueta "Incluye:"' },
      { key: 'catalogSchedulesPrefix', label: 'Etiqueta "Horarios"' },
      { key: 'catalogFullScheduleLabel', label: 'Enlace "Ver agenda completa"' },
      { key: 'catalogCardFooterHint', label: 'Texto pie de tarjeta de cancha' },
      { key: 'catalogReserveButtonLabel', label: 'Botón "Reservar"' },
      { key: 'catalogEmptyTitle', label: 'Título cuando no hay canchas' },
      { key: 'catalogEmptySubtitle', label: 'Mensaje cuando no hay canchas', multiline: true },
      { key: 'catalogEmptyButtonLabel', label: 'Botón estado vacío (acceso clubes)' },
      { key: 'catalogNoResultsTitle', label: 'Título sin resultados de búsqueda' },
      { key: 'catalogNoResultsSubtitle', label: 'Mensaje sin resultados', multiline: true },
      { key: 'catalogNoResultsButtonLabel', label: 'Botón limpiar búsqueda' },
    ],
  },
  {
    title: 'Directorio y Ficha de Complejos',
    description: 'Textos de la guía de establecimientos y vista individual de cada complejo.',
    fields: [
      { key: 'estEyebrow', label: 'Sobretítulo directorio de complejos' },
      { key: 'estTitle', label: 'Título directorio de complejos' },
      { key: 'estSubtitle', label: 'Subtítulo directorio de complejos', multiline: true },
      { key: 'estSearchPlaceholder', label: 'Placeholder buscador de complejos' },
      { key: 'estAllSportsLabel', label: 'Botón "Todos" en directorio' },
      { key: 'estEmptyTitle', label: 'Título sin establecimientos' },
      { key: 'estEmptySubtitle', label: 'Mensaje sin establecimientos', multiline: true },
      { key: 'estMinPriceLabel', label: 'Etiqueta precio mínimo ("Turnos desde")' },
      { key: 'estEnterButtonLabel', label: 'Botón "Ingresar" en tarjeta' },
      { key: 'estBackToDirectoryLabel', label: 'Botón volver al directorio' },
      { key: 'estDetailBadgeLabel', label: 'Insignia en ficha de complejo' },
      { key: 'estWhatsappButtonLabel', label: 'Botón WhatsApp del complejo' },
      { key: 'estCourtsTabLabel', label: 'Subpestaña "Canchas y turnos"' },
      { key: 'estReviewsTabLabel', label: 'Subpestaña "Opiniones"' },
    ],
  },
  {
    title: 'Sección de Opiniones de Jugadores',
    description: 'Textos de valoraciones, rubros calificados y estado vacío.',
    fields: [
      { key: 'reviewsEyebrow', label: 'Sobretítulo sección opiniones' },
      { key: 'reviewsDescription', label: 'Descripción general de opiniones', multiline: true },
      { key: 'reviewsWriteButtonLabel', label: 'Botón "Dejar mi valoración"' },
      { key: 'reviewsSurfaceLabel', label: 'Rubro 1 (Superficie y césped)' },
      { key: 'reviewsLightingLabel', label: 'Rubro 2 (Iluminación nocturna)' },
      { key: 'reviewsFacilitiesLabel', label: 'Rubro 3 (Vestuarios y duchas)' },
      { key: 'reviewsServiceLabel', label: 'Rubro 4 (Atención y puntualidad)' },
      { key: 'reviewsModalTitle', label: 'Título del formulario de nueva opinión' },
      { key: 'reviewsEmptyTitle', label: 'Título cuando no hay opiniones' },
      { key: 'reviewsEmptySubtitle', label: 'Mensaje cuando no hay opiniones', multiline: true },
    ],
  },
];

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
    toggleAdminPaymentPause,
    siteContent,
    updateSiteContent,
    resetSiteContent,
    reviews,
    deleteReview,
  } = useApp();

  const [subSection, setSubSection] = useState<'admins' | 'texts' | 'reviews' | 'footer'>('admins');

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

  // Editable Player Texts state
  const [draftTexts, setDraftTexts] = useState<SiteContent>(siteContent);
  const [textsSearch, setTextsSearch] = useState('');
  const [textsSavedSuccess, setTextsSavedSuccess] = useState(false);

  // Review Moderation state
  const [reviewSearch, setReviewSearch] = useState('');
  const [deleteReviewConfirmId, setDeleteReviewConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setDraftTexts(siteContent);
  }, [siteContent]);

  useEffect(() => {
    setDevName(developerContact.developerName);
    setDevRole(developerContact.roleTitle);
    setDevWhatsapp(developerContact.whatsappNumber);
    setDevEmail(developerContact.email);
    setDevWeb(developerContact.websiteUrl);
  }, [developerContact]);

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
      isActive: true,
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
      websiteUrl: devWeb.trim(),
    });
    setDevSavedSuccess(true);
    setTimeout(() => setDevSavedSuccess(false), 3000);
  };

  const handleSaveTexts = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSiteContent(draftTexts);
    setTextsSavedSuccess(true);
    setTimeout(() => setTextsSavedSuccess(false), 3000);
  };

  const handleResetTexts = async () => {
    await resetSiteContent();
    setTextsSavedSuccess(true);
    setTimeout(() => setTextsSavedSuccess(false), 3000);
  };

  const filteredReviews = reviews.filter((r) => {
    if (!reviewSearch.trim()) return true;
    const q = reviewSearch.toLowerCase().trim();
    return (
      r.userName.toLowerCase().includes(q) ||
      r.courtName.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q)
    );
  });

  if (!isSuperAdmin) {
    return (
      <div className="bg-[var(--bg-surface)] p-8 rounded-xl border border-[var(--border-hairline)] text-center max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Sección Exclusiva para SuperAdministradores
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Iniciá sesión con la cuenta de SuperAdmin para crear, modificar, suspender o borrar administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SuperAdmin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={() => setSubSection('admins')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'admins'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Administradores ({admins.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('texts')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'texts'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Textos Vista Jugador</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('reviews')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'reviews'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Moderación de Opiniones ({reviews.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('footer')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'footer'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Contacto Pie de Página</span>
        </button>
      </div>

      {/* SECTION 1: ADMINS MANAGEMENT */}
      {subSection === 'admins' && (
        <div className="space-y-6">
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
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-semibold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Cuenta de Admin</span>
            </button>
          </div>

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
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                        admin.role === 'superadmin'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border border-[var(--accent)]/30'
                      }`}
                    >
                      {admin.role === 'superadmin' ? (
                        <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                      ) : (
                        admin.username.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">
                          {admin.fullName || admin.username}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            admin.role === 'superadmin'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                          }`}
                        >
                          {admin.role}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            admin.isActive
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {admin.isActive ? 'Activo' : 'Suspendido'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span className="font-mono">
                          Usuario: <strong className="text-[var(--text-primary)]">{admin.username}</strong>
                        </span>
                        <span className="font-mono">
                          Clave: <strong className="text-[var(--text-primary)]">{admin.password}</strong>
                        </span>
                        {admin.assignedComplex && (
                          <span className="text-[var(--accent-soft-text)] font-semibold">
                            • Complejo: {admin.assignedComplex}
                          </span>
                        )}
                        {admin.phone && <span>• Tel: {admin.phone}</span>}
                        {admin.email && <span>• {admin.email}</span>}
                      </div>
                    </div>
                  </div>

                  {admin.role !== 'superadmin' &&
                    (() => {
                      const adminKey = admin.username
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9_-]/g, '');
                      const prof = profilesByAdmin[adminKey];
                      const mpPaused = Boolean(prof?.mpPaused);
                      const transferPaused = Boolean(prof?.transferPaused);

                      return (
                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => toggleAdminPaymentPause(admin.username, 'mp')}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                              mpPaused
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                                : 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35 hover:bg-sky-500/25'
                            }`}
                            title="Pausar o reactivar Mercado Pago de este complejo"
                          >
                            {mpPaused ? (
                              <PlayCircle className="w-3.5 h-3.5" />
                            ) : (
                              <PauseCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{mpPaused ? 'MP Pausado' : 'Pausar MP'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleAdminPaymentPause(admin.username, 'transfer')}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                              transferPaused
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/35 hover:bg-rose-500/25'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                            }`}
                            title="Pausar o reactivar Transferencia CBU de este complejo"
                          >
                            {transferPaused ? (
                              <PlayCircle className="w-3.5 h-3.5" />
                            ) : (
                              <PauseCircle className="w-3.5 h-3.5" />
                            )}
                            <span>{transferPaused ? 'CBU Pausado' : 'Pausar CBU'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingAdmin(admin)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/35 hover:bg-sky-500/25 transition-colors cursor-pointer flex items-center gap-1"
                            title="Modificar datos o clave del administrador"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modificar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleAdminUserStatus(admin.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                              admin.isActive
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25'
                            }`}
                          >
                            {admin.isActive ? 'Suspender' : 'Reactivar'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(admin.id)}
                            className="p-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/35 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* SECTION 2: EDITABLE PLAYER VIEW TEXTS */}
      {subSection === 'texts' && (
        <form onSubmit={handleSaveTexts} className="space-y-6">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 sm:p-7 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-0.5">
                  Personalización integral
                </p>
                <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
                  Editor de Textos de la Vista de Jugador
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
                  Editá cada título, subtítulo, botón, etiqueta o mensaje que ven los jugadores. Los cambios se sincronizan en tiempo real con Firestore.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {textsSavedSuccess && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>¡Textos guardados!</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleResetTexts}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-[var(--border-hairline)]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar originales</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar todos los textos</span>
                </button>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={textsSearch}
                onChange={(e) => setTextsSearch(e.target.value)}
                placeholder="Filtrar campo de texto (ej: portada, reserva, botón)..."
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl pl-9 pr-8 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              {textsSearch && (
                <button
                  type="button"
                  onClick={() => setTextsSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {SITE_CONTENT_GROUPS.map((group) => {
            const q = textsSearch.toLowerCase().trim();
            const matchingFields = group.fields.filter((f) => {
              if (!q) return true;
              const currentVal = String(draftTexts[f.key] || '').toLowerCase();
              return (
                f.label.toLowerCase().includes(q) ||
                group.title.toLowerCase().includes(q) ||
                currentVal.includes(q)
              );
            });

            if (matchingFields.length === 0) return null;

            return (
              <div
                key={group.title}
                className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 space-y-4"
              >
                <div className="pb-3 border-b border-[var(--border-hairline)]">
                  <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
                    {group.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">{group.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {matchingFields.map((field) => (
                    <div
                      key={field.key}
                      className={field.multiline ? 'md:col-span-2' : ''}
                    >
                      <label className="font-semibold text-[var(--text-secondary)] block mb-1">
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea
                          rows={2}
                          value={draftTexts[field.key] || ''}
                          onChange={(e) =>
                            setDraftTexts((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={draftTexts[field.key] || ''}
                          onChange={(e) =>
                            setDraftTexts((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Guardar todos los textos</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 3: REVIEWS MODERATION */}
      {subSection === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 sm:p-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-0.5">
                  Moderación de comunidad
                </p>
                <h2 className="font-heading text-2xl font-bold text-[var(--text-primary)]">
                  Opiniones y Reseñas Publicadas ({reviews.length})
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Supervisá las opiniones dejadas por jugadores y eliminá individualmente cualquier comentario inapropiado.
                </p>
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder="Buscar por jugador, cancha o comentario..."
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl pl-9 pr-8 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
              {reviewSearch && (
                <button
                  type="button"
                  onClick={() => setReviewSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-10 text-center space-y-2">
              <MessageSquare className="w-7 h-7 text-[var(--text-muted)] mx-auto" />
              <h3 className="font-heading text-lg font-bold text-[var(--text-primary)]">
                No hay opiniones para mostrar
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {reviewSearch
                  ? 'Probá limpiando el filtro de búsqueda.'
                  : 'Cuando los jugadores publiquen reseñas, aparecerán listadas aquí.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((rev) => {
                const isConfirming = deleteReviewConfirmId === rev.id;
                return (
                  <div
                    key={rev.id}
                    className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 text-xs">
                        <strong className="text-sm text-[var(--text-primary)]">{rev.userName}</strong>
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold">
                          {rev.courtName}
                        </span>
                        <span className="font-mono text-[var(--text-muted)] tabular-nums">
                          {rev.date}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold tabular-nums">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {Number(rev.rating).toFixed(1)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-muted)] tabular-nums">
                        Piso {rev.scores?.surface ?? rev.rating}/5 · Iluminación {rev.scores?.lighting ?? rev.rating}/5 · Vestuarios {rev.scores?.facilities ?? rev.rating}/5 · Atención {rev.scores?.service ?? rev.rating}/5
                      </p>

                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteReview(rev.id);
                              setDeleteReviewConfirmId(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Confirmar borrado
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteReviewConfirmId(null)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-xs font-semibold cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteReviewConfirmId(rev.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Borrar opinión</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: DEVELOPER FOOTER CONTACT */}
      {subSection === 'footer' && (
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
                Modificá los datos que se muestran en el pie de página de la plataforma.
              </p>
            </div>

            {devSavedSuccess && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>¡Guardado con éxito!</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveDeveloperContact} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-[var(--text-secondary)] block mb-1">
                Nombre o Empresa Desarrolladora
              </label>
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
              <label className="font-bold text-[var(--text-secondary)] block mb-1">
                Rol / Especialidad
              </label>
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
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
                <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
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
      )}

      {/* CONFIRM DELETE ADMIN MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              ¿Eliminar este administrador?
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Esta cuenta ya no podrá acceder al panel de administración.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
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
                <p className="text-xs text-[var(--text-muted)]">
                  Definí los accesos para el nuevo administrador
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Nombre de Usuario (Login)
                </label>
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
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Nombre y Apellido del Titular
                </label>
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
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Establecimiento / Complejo Asignado
                </label>
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
                <p className="text-xs text-[var(--text-muted)]">
                  Editá los accesos o datos del usuario
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  required
                  value={editingAdmin.username}
                  onChange={(e) =>
                    setEditingAdmin({
                      ...editingAdmin,
                      username: e.target.value.toLowerCase().trim(),
                    })
                  }
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Contraseña</label>
                <input
                  type="text"
                  required
                  value={editingAdmin.password}
                  onChange={(e) =>
                    setEditingAdmin({ ...editingAdmin, password: e.target.value })
                  }
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Nombre y Apellido del Titular
                </label>
                <input
                  type="text"
                  required
                  value={editingAdmin.fullName}
                  onChange={(e) =>
                    setEditingAdmin({ ...editingAdmin, fullName: e.target.value })
                  }
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Complejo Asignado
                </label>
                <input
                  type="text"
                  value={editingAdmin.assignedComplex || ''}
                  onChange={(e) =>
                    setEditingAdmin({ ...editingAdmin, assignedComplex: e.target.value })
                  }
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingAdmin.email || ''}
                    onChange={(e) =>
                      setEditingAdmin({ ...editingAdmin, email: e.target.value })
                    }
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingAdmin.phone || ''}
                    onChange={(e) =>
                      setEditingAdmin({ ...editingAdmin, phone: e.target.value })
                    }
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Estado de la Cuenta
                </label>
                <select
                  value={editingAdmin.isActive ? 'active' : 'suspended'}
                  onChange={(e) =>
                    setEditingAdmin({
                      ...editingAdmin,
                      isActive: e.target.value === 'active',
                    })
                  }
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
