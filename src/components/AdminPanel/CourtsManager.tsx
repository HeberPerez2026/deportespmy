import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Court, SportType } from '../../types';
import { processImageUpload } from '../../utils/imageUpload';
import { SPORT_DEFAULT_IMAGES, resolveCourtCoverImage, FALLBACK_COURT_SVG } from '../../data/courtMedia';
import { useBackHandler } from '../../hooks/useBackHandler';
import {
  DEFAULT_HORA_INICIO,
  DEFAULT_HORA_FIN,
  DEFAULT_NIGHT_START_HOUR,
  OPEN_HOUR_OPTIONS,
  CLOSE_HOUR_OPTIONS,
  NIGHT_START_HOUR_OPTIONS,
  formatSlotHour,
  parseSlotHourOrder,
  getNormalizedCourtSchedule,
} from '../../utils/scheduleHours';
import { 
  Layers, 
  Edit3, 
  Trash2,
  X, 
  Sun, 
  Moon, 
  Clock,
  Plus,
  AlertTriangle,
  Upload,
  Loader2,
  Camera,
  Percent
} from 'lucide-react';

export const CourtsManager: React.FC = () => {
  const { adminCourts: courts, addCourt, deleteCourt, updateCourt, businessProfile, filterTags, getSportLabel } = useApp();

  const sportOptions = filterTags.map(tag => ({
    id: tag.id as SportType,
    label: tag.label,
    defaultSurface: tag.defaultSurface,
    defaultImg: SPORT_DEFAULT_IMAGES[tag.id as SportType] || SPORT_DEFAULT_IMAGES.futbol5
  }));
  
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isCreatingCourt, setIsCreatingCourt] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingCourt, setIsDeletingCourt] = useState(false);
  const createLockRef = useRef(false);
  const editLockRef = useRef(false);
  const deleteLockRef = useRef(false);

  useBackHandler(isAddModalOpen, () => { if (!isCreatingCourt) setIsAddModalOpen(false); }, 'admin-add-court');
  useBackHandler(Boolean(editingCourt), () => { if (!isSavingEdit) setEditingCourt(null); }, 'admin-edit-court');
  useBackHandler(Boolean(deleteConfirmId), () => { if (!isDeletingCourt) setDeleteConfirmId(null); }, 'admin-delete-court');

  // New court form state
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>(sportOptions[0]?.id || 'futbol5');
  const [establishment, setEstablishment] = useState(businessProfile.complexName || 'Complejo Deportivo Puerto Madryn');
  const [surface, setSurface] = useState(sportOptions[0]?.defaultSurface || 'Césped Sintético Forbex 50mm');
  const [isIndoor, setIsIndoor] = useState(true);
  const [hasLighting, setHasLighting] = useState(true);
  const [hourlyRateDay, setHourlyRateDay] = useState(18000);
  const [hourlyRateNight, setHourlyRateNight] = useState(24000);
  const [horaInicio, setHoraInicio] = useState<string>(DEFAULT_HORA_INICIO);
  const [horaFin, setHoraFin] = useState<string>(DEFAULT_HORA_FIN);
  const [nightStartHour, setNightStartHour] = useState<number>(DEFAULT_NIGHT_START_HOUR);
  const [depositRequired, setDepositRequired] = useState(50);
  const [imageUrl, setImageUrl] = useState(sportOptions[0]?.defaultImg || SPORT_DEFAULT_IMAGES.futbol5);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [editImageUrlInput, setEditImageUrlInput] = useState('');
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const [description] = useState('Cancha acondicionada para alta competencia con excelente iluminación LED y cerramientos de seguridad.');
  const [amenitiesInput, setAmenitiesInput] = useState('Pelotas oficiales, Chalecos limpios, Vestuarios con agua caliente, Marcador digital');

  const handleSportChange = (newSport: SportType) => {
    setSport(newSport);
    const opt = sportOptions.find(s => s.id === newSport);
    if (opt) {
      setSurface(opt.defaultSurface);
      setImageUrl(opt.defaultImg);
    }
  };

  const handleAttachImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setImageUploadError(null);
    const remaining = Math.max(0, 4 - attachedImages.length);
    if (remaining === 0) {
      setImageUploadError('Podés adjuntar hasta 4 fotos por cancha.');
      e.target.value = '';
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setUploadingImage(true);
    try {
      const processed: string[] = [];
      for (const file of files) {
        const dataUrl = await processImageUpload(file, {
          maxDimension: 1000,
          quality: 0.75,
          maxDataUrlLength: 210000,
        });
        processed.push(dataUrl);
      }
      setAttachedImages(prev => [...prev, ...processed].slice(0, 4));
    } catch (err: any) {
      setImageUploadError(err?.message || 'No se pudo procesar la imagen.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = newImageUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setImageUploadError('La URL debe comenzar con http:// o https://');
      return;
    }
    if (attachedImages.length >= 4) {
      setImageUploadError('Podés adjuntar hasta 4 fotos por cancha.');
      return;
    }
    setImageUploadError(null);
    setAttachedImages(prev => [...prev, url].slice(0, 4));
    setNewImageUrlInput('');
  };

  const handleRemoveAttachedImage = (idx: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
    setImageUploadError(null);
  };

  const getEditingGallery = (court: Court): string[] => {
    if (court.images && court.images.length > 0) return court.images;
    return court.imageUrl ? [court.imageUrl] : [];
  };

  const handleEditAttachImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCourt) return;
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setEditImageError(null);
    const currentGallery = getEditingGallery(editingCourt);
    const remaining = Math.max(0, 4 - currentGallery.length);
    if (remaining === 0) {
      setEditImageError('Podés adjuntar hasta 4 fotos por cancha.');
      e.target.value = '';
      return;
    }

    const files = Array.from(fileList).slice(0, remaining);
    setEditUploadingImage(true);
    try {
      const processed: string[] = [];
      for (const file of files) {
        const dataUrl = await processImageUpload(file, {
          maxDimension: 1000,
          quality: 0.75,
          maxDataUrlLength: 210000,
        });
        processed.push(dataUrl);
      }
      const nextGallery = [...currentGallery, ...processed].slice(0, 4);
      setEditingCourt({
        ...editingCourt,
        images: nextGallery,
        imageUrl: nextGallery[0] || editingCourt.imageUrl,
      });
    } catch (err: any) {
      setEditImageError(err?.message || 'No se pudo procesar la imagen.');
    } finally {
      setEditUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleEditAddImageUrl = () => {
    if (!editingCourt) return;
    const url = editImageUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setEditImageError('La URL debe comenzar con http:// o https://');
      return;
    }
    const currentGallery = getEditingGallery(editingCourt);
    if (currentGallery.length >= 4) {
      setEditImageError('Podés adjuntar hasta 4 fotos por cancha.');
      return;
    }
    const nextGallery = [...currentGallery, url].slice(0, 4);
    setEditImageError(null);
    setEditingCourt({
      ...editingCourt,
      images: nextGallery,
      imageUrl: nextGallery[0],
    });
    setEditImageUrlInput('');
  };

  const handleEditRemoveImage = (idx: number) => {
    if (!editingCourt) return;
    const currentGallery = getEditingGallery(editingCourt);
    const nextGallery = currentGallery.filter((_, i) => i !== idx);
    const sportOpt = sportOptions.find(s => s.id === editingCourt.sport);
    setEditingCourt({
      ...editingCourt,
      images: nextGallery,
      imageUrl: nextGallery[0] || sportOpt?.defaultImg || '',
    });
    setEditImageError(null);
  };

  const handleCreateCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createLockRef.current || isCreatingCourt) return;

    createLockRef.current = true;
    setIsCreatingCourt(true);
    try {
      const amenities = amenitiesInput.split(',').map(s => s.trim()).filter(Boolean);
      const finalGallery = attachedImages.length > 0 ? attachedImages : [imageUrl.trim()].filter(Boolean);
      const primaryImage = finalGallery[0] || sportOptions[0]?.defaultImg || SPORT_DEFAULT_IMAGES.futbol5;

      const openNum = parseSlotHourOrder(horaInicio);
      const closeNum = Math.max(openNum, parseSlotHourOrder(horaFin));

      await addCourt({
        name: name.trim(),
        establishment: establishment.trim(),
        sport,
        surface: surface.trim(),
        isIndoor,
        hasLighting,
        hourlyRateDay: Number(hourlyRateDay),
        hourlyRateNight: Number(hourlyRateNight),
        hora_inicio: formatSlotHour(openNum),
        hora_fin: formatSlotHour(closeNum),
        openHour: openNum,
        closeHour: closeNum,
        nightStartHour,
        depositRequired: Number(depositRequired),
        imageUrl: primaryImage,
        ...(attachedImages.length > 0 ? { images: attachedImages } : {}),
        amenities,
        description: description.trim(),
        status: 'active'
      });

      setIsAddModalOpen(false);
      setName('');
      setHoraInicio(DEFAULT_HORA_INICIO);
      setHoraFin(DEFAULT_HORA_FIN);
      setNightStartHour(DEFAULT_NIGHT_START_HOUR);
      setAttachedImages([]);
      setNewImageUrlInput('');
      setImageUploadError(null);
    } finally {
      createLockRef.current = false;
      setIsCreatingCourt(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt || editLockRef.current || isSavingEdit) return;
    editLockRef.current = true;
    setIsSavingEdit(true);
    try {
      await updateCourt(editingCourt);
      setEditingCourt(null);
      setEditImageUrlInput('');
      setEditImageError(null);
    } finally {
      editLockRef.current = false;
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (deleteLockRef.current || isDeletingCourt) return;
    deleteLockRef.current = true;
    setIsDeletingCourt(true);
    try {
      await deleteCourt(courtId);
      setDeleteConfirmId(null);
    } finally {
      deleteLockRef.current = false;
      setIsDeletingCourt(false);
    }
  };

  const newOpenNum = parseSlotHourOrder(horaInicio);
  const newCloseNum = Math.max(newOpenNum, parseSlotHourOrder(horaFin));
  const newSlotsPerDay = Math.max(1, newCloseNum - newOpenNum + 1);

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-hairline)]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-soft-text)] block mb-0.5">
            Configuración de Canchas
          </span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Gestión de Instalaciones, Rango Horario & Tarifas
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Definí la hora de inicio y cierre de cada cancha (turnos de 1 hora). La grilla y el catálogo mostrarán solo ese rango operativo.
          </p>
        </div>

        <button
          onClick={() => {
            setEstablishment(businessProfile.complexName || 'Complejo Puerto Madryn');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Nueva Cancha</span>
        </button>
      </div>

      {/* Courts Cards Grid */}
      {courts.length === 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] p-8 sm:p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-soft-text)] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
            No hay canchas registradas en este momento
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            Hacé clic en el botón superior <strong>"Agregar Nueva Cancha"</strong> para cargar tu primera cancha, definir el rango horario operativo y las tarifas por hora.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((court) => (
            <div 
              key={court.id}
              className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-hairline)] overflow-hidden flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="relative h-44 bg-[#090D12]">
                  <img
                    src={resolveCourtCoverImage(court.sport, court.images, court.imageUrl)}
                    alt={court.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_COURT_SVG;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  
                  <span className="absolute top-3 left-3 bg-black/75 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    {getSportLabel(court.sport)}
                  </span>

                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-md ${court.status === 'active' ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'bg-rose-600 text-white'}`}>
                    {court.status === 'active' ? 'En Servicio' : 'Mantenimiento'}
                  </span>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    {court.establishment && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/85 block">
                        {court.establishment}
                      </span>
                    )}
                    <h3 className="font-bold text-base font-heading">{court.name}</h3>
                    <p className="text-[11px] text-[#CBD5E1]">{court.surface}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-[var(--bg-subtle)] p-2.5 rounded-lg border border-[var(--border-hairline)]">
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-400" /> Tarifa Diurna
                      </span>
                      <strong className="text-[var(--text-primary)] font-mono text-sm font-bold tabular-nums">
                        ${court.hourlyRateDay.toLocaleString('es-AR')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)] block text-[10px] flex items-center gap-1">
                        <Moon className="w-3 h-3 text-sky-400" /> Nocturna c/Luz
                      </span>
                      <strong className="text-[var(--text-primary)] font-mono text-sm font-bold tabular-nums">
                        ${court.hourlyRateNight.toLocaleString('es-AR')}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] border border-[var(--border-hairline)]">
                    <span className="flex items-center gap-1 text-[var(--text-muted)]">
                      <Percent className="w-3 h-3 text-[var(--accent)]" /> Seña de reserva:
                    </span>
                    <strong className="font-mono font-bold text-[var(--accent-soft-text)]">
                      {(court.depositRequired ?? 50) === 0 ? 'Sin seña (0%)' : `${court.depositRequired ?? 50}%`}
                    </strong>
                  </div>

                  {(() => {
                    const sched = getNormalizedCourtSchedule(court);
                    return (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-medium text-[11px] tabular-nums">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          {sched.hora_inicio} a {sched.hora_fin} hs
                        </span>
                        <span className="font-mono text-[10px]">
                          Noche {formatSlotHour(sched.nightStartHour)}+
                        </span>
                      </div>
                    );
                  })()}

                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                    {court.description}
                  </p>

                  {court.amenities && court.amenities.length > 0 && (
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                      {court.amenities.slice(0, 4).join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit and Delete */}
              <div className="p-3.5 bg-[var(--bg-elevated)] border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
                <button
                  onClick={() => setDeleteConfirmId(court.id)}
                  className="px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Eliminar esta cancha"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <button
                  onClick={() => setEditingCourt(court)}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">¿Eliminar esta cancha?</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Esta acción eliminará la cancha del catálogo de jugadores y de la base de datos central.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingCourt}
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingCourt}
                onClick={() => handleDeleteCourt(deleteConfirmId)}
                className="px-5 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isDeletingCourt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingCourt ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD COURT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 text-[var(--text-primary)] my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <div>
                <h3 className="text-xl font-bold font-heading text-[var(--text-primary)]">
                  Agregar Nueva Cancha Deportiva
                </h3>
                <p className="text-xs text-[var(--text-muted)]">Configurá las características y rango horario operativo</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourt} className="space-y-3.5 text-xs">
              
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1.5">Tipo de Deporte</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {sportOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSportChange(opt.id)}
                      className={`p-2 rounded-xl text-center border font-bold text-[11px] transition-all cursor-pointer ${
                        sport === opt.id
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Nombre de la Cancha</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cancha 1 - Fútbol 5 'La Palmera'"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Nombre del Establecimiento / Complejo</label>
                <input
                  type="text"
                  placeholder="Ej: Complejo Costanera Norte"
                  value={establishment}
                  onChange={(e) => setEstablishment(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-secondary)] block mb-1">Tarifa Día ($ / hora)</label>
                  <input
                    type="number"
                    required
                    value={hourlyRateDay}
                    onChange={(e) => setHourlyRateDay(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[var(--text-secondary)] block mb-1">Tarifa Noche c/Luz ($ / hora)</label>
                  <input
                    type="number"
                    required
                    value={hourlyRateNight}
                    onChange={(e) => setHourlyRateNight(Number(e.target.value))}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Configuración de Seña de Reserva */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Porcentaje de Seña a Cobrar
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md tabular-nums">
                    {depositRequired}% de seña
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Monto requerido al jugador para confirmar el turno por MercadoPago o transferencia (0% = sin seña previa, 100% = pago total).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 20, 30, 40, 50, 70, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDepositRequired(pct)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        depositRequired === pct
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {pct === 0 ? 'Sin Seña (0%)' : pct === 100 ? 'Total (100%)' : `${pct}%`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={depositRequired}
                    onChange={(e) => setDepositRequired(Number(e.target.value))}
                    className="flex-1 h-2 rounded-lg bg-[var(--bg-elevated)] accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold w-12 text-right tabular-nums text-[var(--text-primary)]">
                    {depositRequired}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                  <span>Ejemplo seña diurna (${hourlyRateDay.toLocaleString('es-AR')}):</span>
                  <span className="font-mono font-bold text-[var(--accent-soft-text)]">
                    ${Math.round(hourlyRateDay * (depositRequired / 100)).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Rango Operativo: hora_inicio & hora_fin */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Rango Horario Operativo (Turnos de 1h)
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-[var(--accent-soft-text)] tabular-nums">
                    {newSlotsPerDay} {newSlotsPerDay === 1 ? 'turno/día' : 'turnos/día'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Hora inicio</label>
                    <select
                      value={horaInicio}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setHoraInicio(nextVal);
                        const nextOrder = parseSlotHourOrder(nextVal);
                        if (parseSlotHourOrder(horaFin) < nextOrder) {
                          setHoraFin(nextVal);
                        }
                      }}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      {OPEN_HOUR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Hora fin (último turno)</label>
                    <select
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      {CLOSE_HOUR_OPTIONS.filter((opt) => opt.hour >= newOpenNum).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Tarifa Nocturna</label>
                    <select
                      value={nightStartHour}
                      onChange={(e) => setNightStartHour(Number(e.target.value))}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      {NIGHT_START_HOUR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Superficie / Piso</label>
                <input
                  type="text"
                  required
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIndoor}
                    onChange={(e) => setIsIndoor(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--accent)]"
                  />
                  <span className="font-semibold text-[var(--text-primary)]">Cancha Techada</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasLighting}
                    onChange={(e) => setHasLighting(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--accent)]"
                  />
                  <span className="font-semibold text-[var(--text-primary)]">Tiene Iluminación LED</span>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--text-secondary)]">Imágenes de la Cancha (máx. 4)</label>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {attachedImages.length > 0 ? `${attachedImages.length}/4 adjuntas` : 'Opcional'}
                  </span>
                </div>

                {attachedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {attachedImages.map((src, idx) => (
                      <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
                        <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-ink)] text-[9px] font-bold">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachedImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600"
                          title="Quitar imagen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {attachedImages.length < 4 && (
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold cursor-pointer transition-colors">
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Comprimiendo imagen...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-[var(--accent)]" />
                        <span>Adjuntar Imágenes desde Dispositivo (JPG, PNG, WEBP)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingImage}
                      onChange={handleAttachImages}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    placeholder="O pegá una URL externa (https://...)"
                    className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    + URL
                  </button>
                </div>

                {imageUploadError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{imageUploadError}</p>
                )}
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Comodidades (Separadas por comas)</label>
                <input
                  type="text"
                  value={amenitiesInput}
                  onChange={(e) => setAmenitiesInput(e.target.value)}
                  placeholder="Ej: Pelotas, Chalecos, Vestuarios con agua caliente"
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  disabled={isCreatingCourt}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCourt || uploadingImage}
                  className="px-6 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {isCreatingCourt && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingCourt ? 'Publicando...' : 'Publicar Cancha'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCourt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[var(--border-hairline)]">
              <h3 className="text-lg font-bold font-heading">
                Editar Cancha: {editingCourt.name}
              </h3>
              <button onClick={() => setEditingCourt(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1.5">Tipo de Deporte</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {sportOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setEditingCourt({
                          ...editingCourt,
                          sport: opt.id,
                          surface: opt.defaultSurface || editingCourt.surface,
                        });
                      }}
                      className={`p-2 rounded-xl text-center border font-bold text-[11px] transition-all cursor-pointer ${
                        editingCourt.sport === opt.id
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)] shadow-sm'
                          : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingCourt.name}
                  onChange={(e) => setEditingCourt({ ...editingCourt, name: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Establecimiento / Complejo</label>
                <input
                  type="text"
                  value={editingCourt.establishment || ''}
                  onChange={(e) => setEditingCourt({ ...editingCourt, establishment: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[var(--text-secondary)] block mb-1">Tarifa Día (ARS)</label>
                  <input
                    type="number"
                    value={editingCourt.hourlyRateDay}
                    onChange={(e) => setEditingCourt({ ...editingCourt, hourlyRateDay: Number(e.target.value) })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[var(--text-secondary)] block mb-1">Tarifa Noche (ARS)</label>
                  <input
                    type="number"
                    value={editingCourt.hourlyRateNight}
                    onChange={(e) => setEditingCourt({ ...editingCourt, hourlyRateNight: Number(e.target.value) })}
                    className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Porcentaje de Seña a Cobrar */}
              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-[var(--accent)]" />
                    Porcentaje de Seña a Cobrar
                  </span>
                  <span className="font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md tabular-nums">
                    {editingCourt.depositRequired ?? 50}% de seña
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Monto requerido al jugador para confirmar la reserva (0% = sin seña previa, 100% = pago total).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 20, 30, 40, 50, 70, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setEditingCourt({ ...editingCourt, depositRequired: pct })}
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                        (editingCourt.depositRequired ?? 50) === pct
                          ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--accent)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {pct === 0 ? 'Sin Seña (0%)' : pct === 100 ? 'Total (100%)' : `${pct}%`}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editingCourt.depositRequired ?? 50}
                    onChange={(e) => setEditingCourt({ ...editingCourt, depositRequired: Number(e.target.value) })}
                    className="flex-1 h-2 rounded-lg bg-[var(--bg-elevated)] accent-[var(--accent)] cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold w-12 text-right tabular-nums text-[var(--text-primary)]">
                    {editingCourt.depositRequired ?? 50}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] bg-[var(--bg-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                  <span>Ejemplo seña diurna (${(editingCourt.hourlyRateDay || 0).toLocaleString('es-AR')}):</span>
                  <span className="font-mono font-bold text-[var(--accent-soft-text)]">
                    ${Math.round((editingCourt.hourlyRateDay || 0) * ((editingCourt.depositRequired ?? 50) / 100)).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Rango Horario Operativo Editar Cancha */}
              {(() => {
                const editSched = getNormalizedCourtSchedule(editingCourt);
                return (
                  <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-hairline)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Horario Operativo
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-[var(--accent-soft-text)] tabular-nums">
                        {editSched.hora_inicio} a {editSched.hora_fin} hs
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Hora inicio</label>
                        <select
                          value={editSched.hora_inicio}
                          onChange={(e) => {
                            const nextHoraInicio = e.target.value;
                            const nextOpen = parseSlotHourOrder(nextHoraInicio);
                            const nextClose = Math.max(nextOpen, editSched.closeHour);
                            setEditingCourt({
                              ...editingCourt,
                              hora_inicio: formatSlotHour(nextOpen),
                              hora_fin: formatSlotHour(nextClose),
                              openHour: nextOpen,
                              closeHour: nextClose,
                            });
                          }}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        >
                          {OPEN_HOUR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Hora fin</label>
                        <select
                          value={editSched.hora_fin}
                          onChange={(e) => {
                            const nextHoraFin = e.target.value;
                            const nextClose = Math.max(editSched.openHour, parseSlotHourOrder(nextHoraFin));
                            setEditingCourt({
                              ...editingCourt,
                              hora_inicio: editSched.hora_inicio,
                              hora_fin: formatSlotHour(nextClose),
                              openHour: editSched.openHour,
                              closeHour: nextClose,
                            });
                          }}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        >
                          {CLOSE_HOUR_OPTIONS.filter((opt) => opt.hour >= editSched.openHour).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">Tarifa Nocturna</label>
                        <select
                          value={editSched.nightStartHour}
                          onChange={(e) => {
                            setEditingCourt({
                              ...editingCourt,
                              nightStartHour: Number(e.target.value),
                            });
                          }}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                        >
                          {NIGHT_START_HOUR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Estado Operativo</label>
                <select
                  value={editingCourt.status}
                  onChange={(e) => setEditingCourt({ ...editingCourt, status: e.target.value as any })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="active">Activa / En Servicio</option>
                  <option value="maintenance">Mantenimiento (Cerrada temporalmente)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-[var(--text-secondary)] block mb-1">Superficie</label>
                <input
                  type="text"
                  value={editingCourt.surface}
                  onChange={(e) => setEditingCourt({ ...editingCourt, surface: e.target.value })}
                  className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-[var(--text-secondary)]">Imágenes de la Cancha (máx. 4)</label>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {getEditingGallery(editingCourt).length}/4
                  </span>
                </div>

                {getEditingGallery(editingCourt).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {getEditingGallery(editingCourt).map((src, idx) => (
                      <div key={idx} className="relative h-16 rounded-xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
                        <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-ink)] text-[9px] font-bold">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditRemoveImage(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600"
                          title="Quitar imagen"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {getEditingGallery(editingCourt).length < 4 && (
                  <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold cursor-pointer transition-colors">
                    {editUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Comprimiendo imagen...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[var(--accent)]" />
                        <span>Adjuntar Foto desde Dispositivo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={editUploadingImage}
                      onChange={handleEditAttachImages}
                      className="hidden"
                    />
                  </label>
                )}

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editImageUrlInput}
                    onChange={(e) => setEditImageUrlInput(e.target.value)}
                    placeholder="O agregá URL (https://...)"
                    className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-xl p-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={handleEditAddImageUrl}
                    className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    + URL
                  </button>
                </div>

                {editImageError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{editImageError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setEditingCourt(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || editUploadingImage}
                  className="px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-ink)] font-bold text-xs cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
