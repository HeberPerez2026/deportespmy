import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Court, SportType } from '../../types';
import { processImageUpload } from '../../utils/imageUpload';
import { 
  Layers, 
  Edit3, 
  Trash2,
  Check, 
  X, 
  Sun, 
  Moon, 
  Plus,
  Building2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Loader2,
  Camera
} from 'lucide-react';

const SPORT_OPTIONS: { id: SportType; label: string; defaultSurface: string; defaultImg: string }[] = [
  { 
    id: 'futbol5', 
    label: 'Fútbol 5', 
    defaultSurface: 'Césped Sintético Forbex 50mm',
    defaultImg: 'https://images.unsplash.com/photo-1529900245534-47fbf8204e61?auto=format&fit=crop&w=1200&q=80'
  },
  { 
    id: 'futbol7', 
    label: 'Fútbol 7', 
    defaultSurface: 'Césped Sintético Monofilamento FIFA',
    defaultImg: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80'
  },
  { 
    id: 'padel', 
    label: 'Pádel Panorámico', 
    defaultSurface: 'Césped Texturado Azul WPT + Vidrio 12mm',
    defaultImg: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'
  },
  { 
    id: 'tenis', 
    label: 'Tenis Polvo de Ladrillo', 
    defaultSurface: 'Polvo de Ladrillo Batido Tradicional',
    defaultImg: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80'
  },
  { 
    id: 'basquet', 
    label: 'Básquetbol / Parquet', 
    defaultSurface: 'Piso Flotante de Madera Guatambú',
    defaultImg: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80'
  },
];

export const CourtsManager: React.FC = () => {
  const { adminCourts: courts, addCourt, deleteCourt, updateCourt, businessProfile } = useApp();
  
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New court form state
  const [name, setName] = useState('');
  const [sport, setSport] = useState<SportType>('futbol5');
  const [establishment, setEstablishment] = useState(businessProfile.complexName || 'Complejo Deportivo Puerto Madryn');
  const [surface, setSurface] = useState(SPORT_OPTIONS[0].defaultSurface);
  const [isIndoor, setIsIndoor] = useState(true);
  const [hasLighting, setHasLighting] = useState(true);
  const [hourlyRateDay, setHourlyRateDay] = useState(18000);
  const [hourlyRateNight, setHourlyRateNight] = useState(24000);
  const [depositRequired, setDepositRequired] = useState(50);
  const [imageUrl, setImageUrl] = useState(SPORT_OPTIONS[0].defaultImg);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [editImageUrlInput, setEditImageUrlInput] = useState('');
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const [description, setDescription] = useState('Cancha acondicionada para alta competencia con excelente iluminación LED y cerramientos de seguridad.');
  const [amenitiesInput, setAmenitiesInput] = useState('Pelotas oficiales, Chalecos limpios, Vestuarios con agua caliente, Marcador digital');

  const handleSportChange = (newSport: SportType) => {
    setSport(newSport);
    const opt = SPORT_OPTIONS.find(s => s.id === newSport);
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
    const sportOpt = SPORT_OPTIONS.find(s => s.id === editingCourt.sport);
    setEditingCourt({
      ...editingCourt,
      images: nextGallery,
      imageUrl: nextGallery[0] || sportOpt?.defaultImg || '',
    });
    setEditImageError(null);
  };

  const handleCreateCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const amenities = amenitiesInput.split(',').map(s => s.trim()).filter(Boolean);
    const finalGallery = attachedImages.length > 0 ? attachedImages : [imageUrl.trim()].filter(Boolean);
    const primaryImage = finalGallery[0] || SPORT_OPTIONS[0].defaultImg;

    await addCourt({
      name: name.trim(),
      establishment: establishment.trim(),
      sport,
      surface: surface.trim(),
      isIndoor,
      hasLighting,
      hourlyRateDay: Number(hourlyRateDay),
      hourlyRateNight: Number(hourlyRateNight),
      depositRequired: Number(depositRequired),
      imageUrl: primaryImage,
      ...(attachedImages.length > 0 ? { images: attachedImages } : {}),
      amenities,
      description: description.trim(),
      status: 'active'
    });

    setIsAddModalOpen(false);
    setName('');
    setAttachedImages([]);
    setNewImageUrlInput('');
    setImageUploadError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt) return;
    await updateCourt(editingCourt);
    setEditingCourt(null);
    setEditImageUrlInput('');
    setEditImageError(null);
  };

  const handleDeleteCourt = async (courtId: string) => {
    await deleteCourt(courtId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Configuración de Canchas
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Gestión de Instalaciones & Tarifas Horarias
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agregá, editá o eliminá canchas fácilmente. Los cambios se sincronizan en vivo en la web de jugadores.
          </p>
        </div>

        <button
          onClick={() => {
            setEstablishment(businessProfile.complexName || 'Complejo Puerto Madryn');
            setIsAddModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Nueva Cancha</span>
        </button>
      </div>

      {/* Courts Cards Grid */}
      {courts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-heading">
            No hay canchas registradas en este momento
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Hacé clic en el botón superior <strong>"Agregar Nueva Cancha"</strong> para cargar tu primera cancha, definir el deporte, las tarifas por hora y los servicios disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courts.map((court) => (
            <div 
              key={court.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="relative h-44 bg-slate-900">
                  <img
                    src={court.imageUrl || 'https://images.unsplash.com/photo-1529900245534-47fbf8204e61?auto=format&fit=crop&w=1200&q=80'}
                    alt={court.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  
                  <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-slate-700">
                    {court.sport}
                  </span>

                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full ${court.status === 'active' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                    {court.status === 'active' ? 'En Servicio' : 'Mantenimiento'}
                  </span>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    {court.establishment && (
                      <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                        {court.establishment}
                      </span>
                    )}
                    <h3 className="font-bold text-sm font-heading">{court.name}</h3>
                    <p className="text-[11px] text-slate-300">{court.surface}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-500" /> Tarifa Diurna:
                      </span>
                      <strong className="text-slate-900 text-sm font-bold">
                        ${court.hourlyRateDay.toLocaleString('es-AR')}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                        <Moon className="w-3 h-3 text-blue-500" /> Nocturna c/Luz:
                      </span>
                      <strong className="text-slate-900 text-sm font-bold">
                        ${court.hourlyRateNight.toLocaleString('es-AR')}
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {court.description}
                  </p>

                  {court.amenities && court.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {court.amenities.slice(0, 4).map((a, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Edit and Delete */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setDeleteConfirmId(court.id)}
                  className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Eliminar esta cancha"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>

                <button
                  onClick={() => setEditingCourt(court)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">¿Eliminar esta cancha?</h3>
            <p className="text-xs text-slate-600">
              Esta acción eliminará la cancha del catálogo de jugadores y de la base de datos central.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteCourt(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD COURT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 text-slate-900 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  Agregar Nueva Cancha Deportiva
                </h3>
                <p className="text-xs text-slate-500">Configurá las características del nuevo espacio</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourt} className="space-y-3.5 text-xs">
              
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tipo de Deporte</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {SPORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSportChange(opt.id)}
                      className={`p-2 rounded-xl text-center border font-semibold text-[11px] transition-all cursor-pointer ${
                        sport === opt.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre de la Cancha</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cancha 1 - Fútbol 5 'La Palmera'"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Establecimiento / Complejo</label>
                <input
                  type="text"
                  placeholder="Ej: Complejo Costanera Norte"
                  value={establishment}
                  onChange={(e) => setEstablishment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarifa Día ($ / hora)</label>
                  <input
                    type="number"
                    required
                    value={hourlyRateDay}
                    onChange={(e) => setHourlyRateDay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarifa Noche c/Luz ($ / hora)</label>
                  <input
                    type="number"
                    required
                    value={hourlyRateNight}
                    onChange={(e) => setHourlyRateNight(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Superficie / Piso</label>
                <input
                  type="text"
                  required
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isIndoor}
                    onChange={(e) => setIsIndoor(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-700">Cancha Techada</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasLighting}
                    onChange={(e) => setHasLighting(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-slate-700">Tiene Iluminación LED</span>
                </label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Imágenes de la Cancha (máx. 4)</label>
                  <span className="text-[11px] text-slate-400">
                    {attachedImages.length > 0 ? `${attachedImages.length}/4 adjuntas` : 'Opcional (usa foto por defecto si no subís)'}
                  </span>
                </div>

                {attachedImages.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {attachedImages.map((src, idx) => (
                      <div key={idx} className="relative h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachedImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-950/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600"
                          title="Quitar imagen"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {attachedImages.length < 4 && (
                  <label className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 text-slate-700 hover:text-emerald-700 font-semibold cursor-pointer transition-colors">
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Comprimiendo imagen...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 text-emerald-600" />
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
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    + URL
                  </button>
                </div>

                {imageUploadError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{imageUploadError}</p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Comodidades (Separadas por comas)</label>
                <input
                  type="text"
                  value={amenitiesInput}
                  onChange={(e) => setAmenitiesInput(e.target.value)}
                  placeholder="Ej: Pelotas, Chalecos, Vestuarios con agua caliente"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
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
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  Publicar Cancha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingCourt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading">
                Editar Cancha: {editingCourt.name}
              </h3>
              <button onClick={() => setEditingCourt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingCourt.name}
                  onChange={(e) => setEditingCourt({ ...editingCourt, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Establecimiento / Complejo</label>
                <input
                  type="text"
                  value={editingCourt.establishment || ''}
                  onChange={(e) => setEditingCourt({ ...editingCourt, establishment: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarifa Día (ARS)</label>
                  <input
                    type="number"
                    value={editingCourt.hourlyRateDay}
                    onChange={(e) => setEditingCourt({ ...editingCourt, hourlyRateDay: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tarifa Noche (ARS)</label>
                  <input
                    type="number"
                    value={editingCourt.hourlyRateNight}
                    onChange={(e) => setEditingCourt({ ...editingCourt, hourlyRateNight: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Estado Operativo</label>
                <select
                  value={editingCourt.status}
                  onChange={(e) => setEditingCourt({ ...editingCourt, status: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                >
                  <option value="active">Activa / En Servicio</option>
                  <option value="maintenance">Mantenimiento (Cerrada temporalmente)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Superficie</label>
                <input
                  type="text"
                  value={editingCourt.surface}
                  onChange={(e) => setEditingCourt({ ...editingCourt, surface: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Imágenes de la Cancha (máx. 4)</label>
                  <span className="text-[11px] text-slate-400">
                    {getEditingGallery(editingCourt).length}/4
                  </span>
                </div>

                {getEditingGallery(editingCourt).length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {getEditingGallery(editingCourt).map((src, idx) => (
                      <div key={idx} className="relative h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={src} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEditRemoveImage(idx)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-950/80 text-white flex items-center justify-center cursor-pointer hover:bg-rose-600"
                          title="Quitar imagen"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {getEditingGallery(editingCourt).length < 4 && (
                  <label className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 text-slate-700 font-semibold cursor-pointer transition-colors">
                    {editUploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Comprimiendo imagen...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-blue-600" />
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
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleEditAddImageUrl}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] cursor-pointer shrink-0"
                  >
                    + URL
                  </button>
                </div>

                {editImageError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{editImageError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCourt(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
