import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminUser, SiteContent, FilterTag } from '../../types';
import { DEFAULT_FILTER_TAGS } from '../../data/mockData';
import { useBackHandler } from '../../hooks/useBackHandler';
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
  Filter,
  Tag,
  Plus,
  Sparkles,
  BellRing,
  Send,
  Loader2,
} from 'lucide-react';

interface TextFieldConfig {
  key: keyof Omit<SiteContent, 'filterTags'>;
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

const SUGGESTED_SPORTS = [
  { id: 'pickleball', label: 'Pickleball', defaultSurface: 'Copa acrílica pro' },
  { id: 'hockey', label: 'Hockey', defaultSurface: 'Césped sintético de agua' },
  { id: 'squash', label: 'Squash', defaultSurface: 'Parquet flotante pulido' },
  { id: 'voley', label: 'Vóley', defaultSurface: 'Piso vinílico amortiguado' },
  { id: 'natacion', label: 'Natación', defaultSurface: 'Pileta climatizada 25m' },
  { id: 'crossfit', label: 'Crossfit / Box', defaultSurface: 'Piso de caucho alta densidad' },
  { id: 'rugby', label: 'Rugby', defaultSurface: 'Césped natural nivelado' },
  { id: 'beach_tennis', label: 'Beach Tennis', defaultSurface: 'Arena fina de playa' },
  { id: 'boxeo', label: 'Boxeo / Marcial', defaultSurface: 'Ring y tatami olímpico' },
  { id: 'basquet', label: 'Básquet', defaultSurface: 'Parquet de madera flotante' },
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
    filterTags,
    updateFilterTags,
    courts,
    sendSuperAdminPushBroadcast,
    availablePlayers,
    deleteAvailablePlayer,
    clearAllAvailablePlayers,
    exportGeneralDatabaseJson,
    importGeneralDatabaseJson,
    exportEstablishmentDatabaseJson,
    importEstablishmentDatabaseJson,
    resetGeneralDatabase,
    resetEstablishmentDatabase,
    updateSuperAdminCredentials,
    currentAdminUser,
  } = useApp();

  const [subSection, setSubSection] = useState<'admins' | 'push' | 'filters' | 'texts' | 'reviews' | 'footer' | 'players' | 'backups' | 'credentials'>('admins');

  // Additional SuperAdmin state
  const [arcaUrl, setArcaUrl] = useState(siteContent.arcaQrCodeUrl || '');
  const [clearPlayersConfirmOpen, setClearPlayersConfirmOpen] = useState(false);
  const [deletePlayerIdTarget, setDeletePlayerIdTarget] = useState<string | null>(null);

  const [selectedEstBackup, setSelectedEstBackup] = useState('');
  const [generalResetConfirmOpen, setGeneralResetConfirmOpen] = useState(false);
  const [estResetConfirmOpen, setEstResetConfirmOpen] = useState(false);
  const [exportGeneralConfirmOpen, setExportGeneralConfirmOpen] = useState(false);
  const [exportEstConfirmOpen, setExportEstConfirmOpen] = useState(false);
  const [pendingGeneralImport, setPendingGeneralImport] = useState<string | null>(null);
  const [pendingEstImport, setPendingEstImport] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [credUser, setCredUser] = useState(currentAdminUser?.username || '');
  const [credName, setCredName] = useState(currentAdminUser?.fullName || '');
  const [credEmail, setCredEmail] = useState(currentAdminUser?.email || '');
  const [credPhone, setCredPhone] = useState(currentAdminUser?.phone || '');
  const [credPass, setCredPass] = useState('');
  const [credFeedback, setCredFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Push broadcast state (SuperAdmin textbox)
  const [pushTitle, setPushTitle] = useState('Novedad en DeportesPMY');
  const [pushMessage, setPushMessage] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter Tags Management state
  const [tagSearch, setTagSearch] = useState('');
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagId, setNewTagId] = useState('');
  const [newTagSurface, setNewTagSurface] = useState('');
  const [editingTag, setEditingTag] = useState<FilterTag | null>(null);
  const [deleteTagConfirmId, setDeleteTagConfirmId] = useState<string | null>(null);
  const [restoreTagsConfirm, setRestoreTagsConfirm] = useState(false);
  const [tagMessage, setTagMessage] = useState<string | null>(null);

  useBackHandler(isAddModalOpen, () => setIsAddModalOpen(false), 'superadmin-add-admin');
  useBackHandler(Boolean(editingAdmin), () => setEditingAdmin(null), 'superadmin-edit-admin');
  useBackHandler(Boolean(deleteConfirmId), () => setDeleteConfirmId(null), 'superadmin-delete-admin');
  useBackHandler(isAddTagModalOpen, () => setIsAddTagModalOpen(false), 'superadmin-add-tag');
  useBackHandler(Boolean(editingTag), () => setEditingTag(null), 'superadmin-edit-tag');
  useBackHandler(Boolean(deleteTagConfirmId), () => setDeleteTagConfirmId(null), 'superadmin-delete-tag');
  useBackHandler(restoreTagsConfirm, () => setRestoreTagsConfirm(false), 'superadmin-restore-tags');
  useBackHandler(pushConfirmOpen, () => { if (!pushSending) setPushConfirmOpen(false); }, 'superadmin-push-confirm');
  useBackHandler(clearPlayersConfirmOpen, () => setClearPlayersConfirmOpen(false), 'superadmin-clear-players');
  useBackHandler(Boolean(deletePlayerIdTarget), () => setDeletePlayerIdTarget(null), 'superadmin-delete-player');
  useBackHandler(exportGeneralConfirmOpen, () => setExportGeneralConfirmOpen(false), 'superadmin-export-general');
  useBackHandler(exportEstConfirmOpen, () => setExportEstConfirmOpen(false), 'superadmin-export-est');
  useBackHandler(Boolean(pendingGeneralImport), () => setPendingGeneralImport(null), 'superadmin-import-general');
  useBackHandler(Boolean(pendingEstImport), () => setPendingEstImport(null), 'superadmin-import-est');
  useBackHandler(generalResetConfirmOpen, () => setGeneralResetConfirmOpen(false), 'superadmin-reset-general');
  useBackHandler(estResetConfirmOpen, () => setEstResetConfirmOpen(false), 'superadmin-reset-est');

  const showTagNotification = (msg: string) => {
    setTagMessage(msg);
    setTimeout(() => setTagMessage(null), 3500);
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagLabel.trim()) return;

    const rawId = (newTagId.trim() || newTagLabel.trim())
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || `sport_${Date.now()}`;

    if (filterTags.some((t) => t.id === rawId)) {
      alert(`Ya existe una etiqueta con el identificador "${rawId}". Por favor elegí otro identificador.`);
      return;
    }

    const newTag: FilterTag = {
      id: rawId,
      label: newTagLabel.trim(),
      defaultSurface: newTagSurface.trim() || 'Superficie deportiva estándar',
    };

    const nextTags = [...filterTags, newTag];
    await updateFilterTags(nextTags);
    setIsAddTagModalOpen(false);
    setNewTagLabel('');
    setNewTagId('');
    setNewTagSurface('');
    showTagNotification(`¡Etiqueta "${newTag.label}" creada correctamente!`);
  };

  const handleQuickAddSuggested = async (suggested: { id: string; label: string; defaultSurface: string }) => {
    if (filterTags.some((t) => t.id === suggested.id)) {
      showTagNotification(`La etiqueta "${suggested.label}" ya está agregada.`);
      return;
    }
    const nextTags = [...filterTags, suggested];
    await updateFilterTags(nextTags);
    showTagNotification(`Etiqueta "${suggested.label}" agregada.`);
  };

  const handleSaveEditTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !editingTag.label.trim()) return;

    const nextTags = filterTags.map((t) =>
      t.id === editingTag.id
        ? { ...t, label: editingTag.label.trim(), defaultSurface: editingTag.defaultSurface.trim() }
        : t
    );
    await updateFilterTags(nextTags);
    showTagNotification(`Etiqueta "${editingTag.label}" actualizada.`);
    setEditingTag(null);
  };

  const handleDeleteTag = async (tagId: string) => {
    const nextTags = filterTags.filter((t) => t.id !== tagId);
    await updateFilterTags(nextTags);
    setDeleteTagConfirmId(null);
    showTagNotification('Etiqueta eliminada.');
  };

  const handleRestoreDefaultTags = async () => {
    await updateFilterTags(DEFAULT_FILTER_TAGS);
    setRestoreTagsConfirm(false);
    showTagNotification('Se restablecieron las etiquetas a los valores iniciales.');
  };

  const filteredTags = filterTags.filter((tag) => {
    if (!tagSearch.trim()) return true;
    const q = tagSearch.toLowerCase().trim();
    return (
      tag.label.toLowerCase().includes(q) ||
      tag.id.toLowerCase().includes(q) ||
      tag.defaultSurface.toLowerCase().includes(q)
    );
  });

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

  useBackHandler(Boolean(deleteReviewConfirmId), () => setDeleteReviewConfirmId(null), 'superadmin-delete-review');

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
    await updateSiteContent({ arcaQrCodeUrl: arcaUrl.trim() });
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
          onClick={() => setSubSection('push')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'push'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Notificaciones Push</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('filters')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'filters'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Etiquetas de Filtro ({filterTags.length})</span>
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

        <button
          type="button"
          onClick={() => setSubSection('players')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'players'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Jugadores Disponibles ({availablePlayers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('backups')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'backups'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Copias de Seguridad</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('credentials')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap cursor-pointer border transition-colors ${
            subSection === 'credentials'
              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>Cuenta SuperAdmin</span>
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

      {/* SECTION: GLOBAL PUSH BROADCAST (TEXTBOX) */}
      {subSection === 'push' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 sm:p-7 rounded-xl border border-[var(--border-hairline)] space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-soft-text)] mb-1">
                <BellRing className="w-4 h-4" />
                <span>Difusión Masiva Web Push · SuperAdmin</span>
              </div>
              <h2 className="font-heading text-2xl font-bold">
                Enviar Notificación Push a Todos los Dispositivos
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
                Escribí el aviso en el cuadro de texto para notificar en tiempo real a todos los jugadores que activaron las notificaciones push en su celular o navegador.
              </p>
            </div>

            {pushFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                  pushFeedback.ok
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  {pushFeedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{pushFeedback.text}</span>
                </div>
                <button type="button" onClick={() => setPushFeedback(null)} className="cursor-pointer opacity-80 hover:opacity-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[var(--text-secondary)] block mb-1">
                    Título de la Notificación
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={pushTitle}
                    onChange={(e) => setPushTitle(e.target.value)}
                    placeholder="Ej: ¡Nuevo Torneo Relámpago este fin de semana!"
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[var(--text-secondary)]">
                      Mensaje Push (Textbox) *
                    </label>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {pushMessage.length}/320
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={320}
                    value={pushMessage}
                    onChange={(e) => setPushMessage(e.target.value)}
                    placeholder="Escribí aquí el mensaje que recibirán los jugadores en sus dispositivos..."
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-y"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPushTitle('¡Inscripciones Abiertas al Nuevo Torneo!');
                      setPushMessage('Ya podés inscribir a tu equipo en el próximo Torneo Relámpago desde la pestaña Torneos. ¡Cupos limitados!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] font-semibold text-[var(--text-secondary)] cursor-pointer"
                  >
                    Plantilla: Torneo Nuevo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPushTitle('Turnos Libres Hoy en Puerto Madryn');
                      setPushMessage('Quedaron horarios disponibles para jugar hoy por la noche. ¡Reservá tu cancha en 1 minuto!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] font-semibold text-[var(--text-secondary)] cursor-pointer"
                  >
                    Plantilla: Turnos Libres
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={pushSending || !pushMessage.trim()}
                    onClick={() => setPushConfirmOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-[var(--accent-ink)] font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Notificación Push Masiva</span>
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="lg:col-span-5 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                  Vista previa en dispositivo
                </span>
                <div className="p-4 rounded-2xl bg-[var(--bg-canvas)] border border-[var(--border-strong)] shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="font-bold text-[var(--accent)]">DeportesPMY · Web Push</span>
                    <span>ahora</span>
                  </div>
                  <p className="font-bold text-xs text-[var(--text-primary)]">
                    {pushTitle.trim() || 'DeportesPMY'}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">
                    {pushMessage.trim() || 'Tu mensaje aparecerá aquí tal como lo verán los jugadores en su pantalla.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: SPORT FILTER TAGS MANAGEMENT */}
      {subSection === 'filters' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 sm:p-7 rounded-xl border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent-soft-text)] mb-1">
                <Crown className="w-4 h-4" />
                <span>Gestión de Deportes & Filtros · SuperAdmin</span>
              </div>
              <h2 className="font-heading text-2xl font-bold">
                Administración de Etiquetas y Filtros Deportivos
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
                Personalizá las disciplinas deportivas y etiquetas de filtro del portal. Los cambios se sincronizan en vivo en la portada, el directorio de complejos, el catálogo de turnos y las opciones de creación de canchas para administradores.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
              <button
                type="button"
                onClick={() => setRestoreTagsConfirm(true)}
                className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Restablecer a etiquetas predeterminadas"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Valores Iniciales</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewTagLabel('');
                  setNewTagId('');
                  setNewTagSurface('');
                  setIsAddTagModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Etiqueta Deportiva</span>
              </button>
            </div>
          </div>

          {/* Tag Notification Message */}
          {tagMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{tagMessage}</span>
            </div>
          )}

          {/* Quick Suggestions for Sports Not Yet Added */}
          {(() => {
            const availableSuggestions = SUGGESTED_SPORTS.filter(
              (sug) => !filterTags.some((t) => t.id === sug.id || t.label.toLowerCase() === sug.label.toLowerCase())
            );
            if (availableSuggestions.length === 0) return null;
            return (
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Sugerencias rápidas para agregar en 1 clic:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSuggestions.map((sug) => (
                    <button
                      key={sug.id}
                      type="button"
                      onClick={() => handleQuickAddSuggested(sug)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-soft-text)] hover:border-[var(--accent)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3 text-[var(--accent)]" />
                      <span>{sug.label}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">({sug.defaultSurface})</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Filter Tags List / Table */}
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--accent)]" />
                  <span>Etiquetas Activas en la Plataforma ({filteredTags.length})</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Estas etiquetas definen las categorías visibles en el menú de búsqueda, filtros de fecha y catálogo.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Buscar etiquetas o superficies..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {filteredTags.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                No se encontraron etiquetas que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {filteredTags.map((tag) => {
                  const linkedCourtsCount = courts.filter((c) => c.sport === tag.id).length;
                  return (
                    <div
                      key={tag.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent-soft-text)] text-xs font-bold font-heading">
                            {tag.label}
                          </span>
                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[var(--text-muted)]">
                            id: {tag.id}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              linkedCourtsCount > 0
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-hairline)]'
                            }`}
                          >
                            {linkedCourtsCount} {linkedCourtsCount === 1 ? 'cancha activa' : 'canchas activas'}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-muted)]">Superficie predeterminada:</span>{' '}
                          {tag.defaultSurface}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingTag({ ...tag })}
                          className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTagConfirmId(tag.id)}
                          className="px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Eliminar esta etiqueta"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                          value={(draftTexts[field.key] as string) || ''}
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
                          value={(draftTexts[field.key] as string) || ''}
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

            <div className="md:col-span-2 pt-3 border-t border-[var(--border-hairline)]">
              <label className="font-bold text-[var(--text-secondary)] block mb-1">
                Código QR Formulario 960 - ARCA (URL de imagen o DataURL)
              </label>
              <input
                type="text"
                value={arcaUrl}
                onChange={(e) => setArcaUrl(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                placeholder="https://... o pega aquí la URL de la imagen del QR de ARCA"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Aparecerá en el pie de página de la aplicación cumpliendo con la normativa de AFIP / ARCA.
              </p>
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

      {/* ADD FILTER TAG MODAL */}
      {isAddTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <h3 className="text-base font-bold font-heading text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[var(--accent)]" />
                  <span>Nueva Etiqueta Deportiva</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Configurá el nombre visible y la superficie sugerida para el filtro
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTagModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Prefill Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Plantillas rápidas:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SPORTS.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => {
                      setNewTagLabel(sug.label);
                      setNewTagId(sug.id);
                      setNewTagSurface(sug.defaultSurface);
                    }}
                    className="px-2 py-1 rounded bg-[var(--bg-canvas)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-soft-text)] text-[10px] font-medium border border-[var(--border-hairline)] transition-colors cursor-pointer"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTag} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Nombre Visible del Deporte *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pickleball, Hockey sobre Césped, Squash"
                  value={newTagLabel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTagLabel(val);
                    if (!newTagId || newTagId.startsWith('sport_') || SUGGESTED_SPORTS.some((s) => s.id === newTagId)) {
                      setNewTagId(
                        val
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]/g, '_')
                          .replace(/_+/g, '_')
                          .replace(/^_|_$/g, '')
                      );
                    }
                  }}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Identificador Único (Slug interno)
                </label>
                <input
                  type="text"
                  placeholder="Ej: pickleball, hockey, squash"
                  value={newTagId}
                  onChange={(e) =>
                    setNewTagId(
                      e.target.value
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^a-z0-9]/g, '_')
                    )
                  }
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Se utiliza internamente para vincular las canchas y filtros de búsqueda.
                </p>
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Superficie Sugerida por Defecto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Césped Sintético Forbex 50mm, Parquet flotante, Resina acrílica"
                  value={newTagSurface}
                  onChange={(e) => setNewTagSurface(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setIsAddTagModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs shadow-md cursor-pointer"
                >
                  Crear Etiqueta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FILTER TAG MODAL */}
      {editingTag && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] my-8">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <h3 className="text-base font-bold font-heading text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                  <span>Editar Etiqueta Deportiva</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Modificá el nombre visible o la superficie sugerida
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTag(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTag} className="space-y-3.5 text-xs">
              <div>
                <span className="font-bold text-[var(--text-secondary)] block mb-1">
                  Identificador Interno (Código fijo)
                </span>
                <div className="px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl font-mono text-xs text-[var(--text-muted)]">
                  {editingTag.id}
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  El identificador no se modifica para preservar el historial de canchas y turnos existentes.
                </p>
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Nombre Visible del Deporte *
                </label>
                <input
                  type="text"
                  required
                  value={editingTag.label}
                  onChange={(e) => setEditingTag({ ...editingTag, label: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">
                  Superficie Sugerida por Defecto
                </label>
                <input
                  type="text"
                  value={editingTag.defaultSurface}
                  onChange={(e) => setEditingTag({ ...editingTag, defaultSurface: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  onClick={() => setEditingTag(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE FILTER TAG MODAL */}
      {deleteTagConfirmId && (() => {
        const targetTag = filterTags.find((t) => t.id === deleteTagConfirmId);
        const linkedCount = courts.filter((c) => c.sport === deleteTagConfirmId).length;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                ¿Eliminar la etiqueta "{targetTag?.label || deleteTagConfirmId}"?
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {linkedCount > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold block">
                    Atención: Hay {linkedCount} {linkedCount === 1 ? 'cancha registrada' : 'canchas registradas'} con este deporte. La etiqueta dejará de aparecer en los filtros principales.
                  </span>
                ) : (
                  'Esta etiqueta se eliminará de las opciones de filtrado y catálogo para jugadores y administradores.'
                )}
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTagConfirmId(null)}
                  className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTag(deleteTagConfirmId)}
                  className="px-5 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer"
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM RESTORE DEFAULT FILTER TAGS MODAL */}
      {restoreTagsConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
              ¿Restablecer Etiquetas de Fábrica?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Esta acción restaurará el listado original de 8 deportes predeterminados (Fútbol 5, Fútbol 7, Pádel, Tenis, Básquet, Pickleball, Hockey y Vóley).
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTagsConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaultTags}
                className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
              >
                Sí, Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SUPERADMIN PUSH BROADCAST MODAL */}
      {pushConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border border-[var(--accent)]/30 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    ¿Enviar Notificación Push a Todos?
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Se enviará inmediatamente a todos los dispositivos suscriptos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={pushSending}
                onClick={() => setPushConfirmOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs space-y-1">
              <p className="font-bold text-[var(--text-primary)]">{pushTitle.trim() || 'DeportesPMY'}</p>
              <p className="text-[var(--text-secondary)]">{pushMessage.trim()}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                disabled={pushSending}
                onClick={() => setPushConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pushSending}
                onClick={async () => {
                  setPushSending(true);
                  const res = await sendSuperAdminPushBroadcast(pushTitle, pushMessage);
                  setPushSending(false);
                  setPushConfirmOpen(false);
                  if (res.ok) {
                    setPushFeedback({
                      ok: true,
                      text: `Notificación enviada a ${res.sentCount} de ${res.matchedCount} dispositivos suscriptos.`,
                    });
                    setPushMessage('');
                  } else {
                    setPushFeedback({
                      ok: false,
                      text: res.error || 'No se pudo enviar la notificación Push.',
                    });
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-extrabold text-xs cursor-pointer flex items-center gap-1.5"
              >
                {pushSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{pushSending ? 'Enviando...' : 'Sí, Enviar Ahora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: AVAILABLE PLAYERS MANAGEMENT */}
      {subSection === 'players' && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
            <div>
              <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-0.5">
                Matchmaking & Suplentes
              </p>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                Gestión de Jugadores Disponibles en la Bolsa del Día
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Los jugadores que se anotan para completar turnos figuran aquí. Podés eliminar individualmente o vaciar la lista.
              </p>
            </div>

            {availablePlayers.length > 0 && (
              <button
                type="button"
                onClick={() => setClearPlayersConfirmOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2 cursor-pointer border border-rose-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Vaciar Todos los Jugadores ({availablePlayers.length})</span>
              </button>
            )}
          </div>

          {availablePlayers.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)] space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-sm font-medium">No hay jugadores anotados en la bolsa disponible actual.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Jugador</th>
                    <th className="py-3 px-4">Teléfono (WhatsApp)</th>
                    <th className="py-3 px-4">Deportes</th>
                    <th className="py-3 px-4">Fecha Registrada</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {availablePlayers.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-[var(--text-secondary)]">{p.phone}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(p.preferredSports || []).map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-semibold text-[10px]">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[var(--text-muted)]">{p.date}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletePlayerIdTarget(p.id)}
                          title="Eliminar jugador disponible"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SECTION: BACKUPS & RESTORE / RESET */}
      {subSection === 'backups' && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 sm:p-7 space-y-6">
            <div>
              <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-0.5">
                Seguridad y Mantenimiento de Datos
              </p>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                Copias de Seguridad (Backups) y Restablecimiento
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Generá copias de seguridad generales de toda la plataforma o específicas por establecimiento, restaurá respaldos o reiniciá los datos con confirmación estricta.
              </p>
            </div>

            {backupMessage && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${backupMessage.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{backupMessage.text}</span>
              </div>
            )}

            {/* General Backup Card */}
            <div className="p-5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-4">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--accent)]" />
                <span>Copia de Seguridad General Completa (Toda la Plataforma)</span>
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Incluye canchas, reservas, reseñas, configuraciones de complejos, administradores, etiquetas y bolsa de jugadores.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setExportGeneralConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Descargar Copia General (JSON)</span>
                </button>

                <label className="px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-2 cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Copia General</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result as string;
                        if (content) {
                          setPendingGeneralImport(content);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setGeneralResetConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2 cursor-pointer ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Restablecer Todo a Cero</span>
                </button>
              </div>
            </div>

            {/* Establishment Backup Card */}
            <div className="p-5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-4">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500" />
                <span>Copia de Seguridad por Establecimiento Específico</span>
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Seleccioná un complejo para respaldar o restaurar exclusivamente sus canchas, reservas y opiniones asociadas.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <select
                  value={selectedEstBackup}
                  onChange={(e) => setSelectedEstBackup(e.target.value)}
                  className="w-full sm:w-72 bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="">-- Seleccionar Establecimiento --</option>
                  {Array.from(new Set(courts.map(c => (c.establishment || '').trim()).filter(Boolean))).map(est => (
                    <option key={est} value={est}>{est}</option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!selectedEstBackup}
                  onClick={() => setExportEstConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Exportar Establecimiento</span>
                </button>

                <label className={`px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-bold text-xs flex items-center gap-2 cursor-pointer ${!selectedEstBackup ? 'opacity-50 pointer-events-none' : ''}`}>
                  <RotateCcw className="w-4 h-4" />
                  <span>Restaurar Establecimiento</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const content = ev.target?.result as string;
                        if (content) {
                          setPendingEstImport(content);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled={!selectedEstBackup}
                  onClick={() => setEstResetConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2 cursor-pointer ml-auto disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Borrar Datos del Establecimiento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: SUPERADMIN CREDENTIALS UPDATE */}
      {subSection === 'credentials' && (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-6 sm:p-7 space-y-6 max-w-2xl mx-auto">
          <div>
            <p className="text-xs font-semibold text-[var(--accent-soft-text)] mb-0.5">
              Seguridad del Sistema
            </p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
              Cambiar Nombre y Contraseña de SuperAdmin
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Actualizá tus credenciales de acceso maestro para la cuenta SuperAdmin.
            </p>
          </div>

          {credFeedback && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${credFeedback.ok ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{credFeedback.text}</span>
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await updateSuperAdminCredentials(credUser, credName, credEmail, credPhone, credPass);
              setCredFeedback({ ok: res.success, text: res.message });
              if (res.success) setCredPass('');
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre de Usuario (Login)</label>
              <input
                type="text"
                required
                value={credUser}
                onChange={(e) => setCredUser(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-[var(--text-secondary)] block mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={credName}
                onChange={(e) => setCredName(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={credEmail}
                  onChange={(e) => setCredEmail(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div>
                <label className="font-bold text-[var(--text-secondary)] block mb-1">Teléfono</label>
                <input
                  type="text"
                  required
                  value={credPhone}
                  onChange={(e) => setCredPhone(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-[var(--text-secondary)] block mb-1">Nueva Contraseña (Dejar en blanco para mantener la actual)</label>
              <input
                type="password"
                value={credPass}
                onChange={(e) => setCredPass(e.target.value)}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="••••••••••••"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Actualizar Credenciales de SuperAdmin</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION MODALS FOR PLAYERS & BACKUPS */}
      {deletePlayerIdTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">¿Eliminar jugador de la bolsa?</h3>
            <p className="text-xs text-[var(--text-secondary)]">Esta acción eliminará al jugador de la lista disponible para turnos.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletePlayerIdTarget(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteAvailablePlayer(deletePlayerIdTarget);
                  setDeletePlayerIdTarget(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {clearPlayersConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">¿Vaciar toda la bolsa de jugadores?</h3>
            <p className="text-xs text-[var(--text-secondary)]">Se eliminarán todos los jugadores disponibles registrados para el día actual.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearPlayersConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearAllAvailablePlayers();
                  setClearPlayersConfirmOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700"
              >
                Sí, Vaciar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {generalResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>¡ADVERTENCIA CRÍTICA! Restablecer Todo a Cero</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Esto eliminará permanentemente todas las canchas, reservas y registros de la base de datos general. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGeneralResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetGeneralDatabase();
                  setGeneralResetConfirmOpen(false);
                  setBackupMessage({ ok: true, text: 'Base de datos general restablecida a cero con éxito.' });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700"
              >
                Sí, Borrar Todo Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {estResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Restablecer Establecimiento: {selectedEstBackup}</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Se eliminarán todas las canchas y turnos pertenecientes al complejo "{selectedEstBackup}".
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEstResetConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (selectedEstBackup) {
                    await resetEstablishmentDatabase(selectedEstBackup);
                    setEstResetConfirmOpen(false);
                    setBackupMessage({ ok: true, text: `Establecimiento "${selectedEstBackup}" restablecido con éxito.` });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs cursor-pointer hover:bg-rose-700"
              >
                Sí, Borrar Establecimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM EXPORT GENERAL MODAL */}
      {exportGeneralConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Save className="w-5 h-5 text-[var(--accent)]" />
              <span>¿Descargar Copia de Seguridad General?</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Se generará y descargará un archivo JSON con todos los datos del sistema (canchas, reservas, administradores, reseñas y perfiles).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExportGeneralConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const jsonStr = exportGeneralDatabaseJson();
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `deportespmy_general_backup_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setExportGeneralConfirmOpen(false);
                  setBackupMessage({ ok: true, text: 'Copia general descargada con éxito.' });
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs cursor-pointer hover:bg-[var(--accent-hover)]"
              >
                Sí, Descargar Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM EXPORT ESTABLISHMENT MODAL */}
      {exportEstConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <Save className="w-5 h-5 text-sky-500" />
              <span>¿Descargar Copia de: {selectedEstBackup}?</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Se descargará un archivo JSON con las canchas, reservas y perfil correspondientes a "{selectedEstBackup}".
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExportEstConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedEstBackup) {
                    const jsonStr = exportEstablishmentDatabaseJson(selectedEstBackup);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `deportespmy_establecimiento_${selectedEstBackup.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setExportEstConfirmOpen(false);
                    setBackupMessage({ ok: true, text: `Copia del establecimiento "${selectedEstBackup}" descargada.` });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] font-bold text-xs cursor-pointer hover:bg-[var(--accent-hover)]"
              >
                Sí, Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESTORE GENERAL MODAL */}
      {pendingGeneralImport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-amber-500 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>¿Restaurar Copia General Completa?</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Esta acción sobrescribirá las canchas, reservas, configuraciones y usuarios con los datos del archivo seleccionado.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingGeneralImport(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pendingGeneralImport) {
                    const res = await importGeneralDatabaseJson(pendingGeneralImport);
                    setPendingGeneralImport(null);
                    setBackupMessage({ ok: res.success, text: res.message });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer hover:bg-amber-700"
              >
                Sí, Restaurar Datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESTORE ESTABLISHMENT MODAL */}
      {pendingEstImport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-amber-500 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              <span>¿Restaurar Copia de Establecimiento?</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Se incorporarán y actualizarán las canchas y turnos pertenecientes a este establecimiento.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingEstImport(null)}
                className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (pendingEstImport) {
                    const res = await importEstablishmentDatabaseJson(pendingEstImport);
                    setPendingEstImport(null);
                    setBackupMessage({ ok: res.success, text: res.message });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs cursor-pointer hover:bg-amber-700"
              >
                Sí, Restaurar Establecimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
