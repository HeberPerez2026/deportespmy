import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Court } from '../types';
import { BookingModal } from './BookingModal';
import { 
  Star, 
  MapPin, 
  Sparkles, 
  Clock, 
  Sun, 
  Moon, 
  Layers,
  ChevronRight,
  PlusCircle,
  Search,
  Lock,
  Building2
} from 'lucide-react';

interface CourtCatalogProps {
  onOpenAdminLogin?: () => void;
}

export const CourtCatalog: React.FC<CourtCatalogProps> = ({ onOpenAdminLogin }) => {
  const { 
    courts, 
    selectedSport, 
    selectedDate, 
    searchQuery,
    setSearchQuery,
    getSlotsForCourtAndDate,
    isAdminAuthenticated,
    setActiveTab,
    businessProfile
  } = useApp();

  const [activeBookingCourt, setActiveBookingCourt] = useState<Court | null>(null);
  const [selectedInitialSlot, setSelectedInitialSlot] = useState<string | undefined>(undefined);

  // Filter courts by sport AND search query
  const filteredCourts = courts.filter(court => {
    // 1. Sport filter
    if (selectedSport !== 'all' && court.sport !== selectedSport) {
      return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = court.name.toLowerCase().includes(q);
      const estMatch = court.establishment ? court.establishment.toLowerCase().includes(q) : false;
      const surfaceMatch = court.surface ? court.surface.toLowerCase().includes(q) : false;
      if (!nameMatch && !estMatch && !surfaceMatch) {
        return false;
      }
    }

    return true;
  });

  const handleOpenBooking = (court: Court, slotTime?: string) => {
    setActiveBookingCourt(court);
    setSelectedInitialSlot(slotTime);
  };

  const getSportBadge = (sport: string) => {
    switch (sport) {
      case 'futbol5': return { label: 'Fútbol 5', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'futbol7': return { label: 'Fútbol 7', color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' };
      case 'padel': return { label: 'Pádel Panorámico', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'tenis': return { label: 'Tenis Polvo', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'basquet': return { label: 'Básquetbol / Parquet', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      default: return { label: sport, color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            <Layers className="w-4 h-4" />
            <span>{businessProfile.complexName || 'Instalaciones Deportivas'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Canchas y Horarios para el {selectedDate}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Hacé click en cualquier horario verde para iniciar tu reserva inmediata con confirmación automática.
          </p>
        </div>

        {/* Legend */}
        {courts.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-600 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm self-start md:self-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Disponible
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-300" /> Ocupado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Tarifa Noche c/Luz
            </span>
          </div>
        )}
      </div>

      {/* Case 1: Database has 0 courts registered yet */}
      {courts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-heading">
              Aún no hay canchas publicadas
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              La plataforma está lista para que el administrador agregue sus canchas, superficies, fotos y tarifas personalizadas desde el panel de control.
            </p>
          </div>

          <div className="pt-2">
            {isAdminAuthenticated ? (
              <button
                onClick={() => setActiveTab('admin')}
                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Agregar mi Primera Cancha en el Panel</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onOpenAdminLogin) onOpenAdminLogin();
                  else setActiveTab('admin');
                }}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all cursor-pointer"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Ingresar como Administrador para Crear Canchas</span>
              </button>
            )}
          </div>
        </div>
      ) : filteredCourts.length === 0 ? (
        /* Case 2: Courts exist, but filter or search yielded 0 results */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            No se encontraron canchas
          </h3>
          <p className="text-xs text-slate-600">
            No hay espacios deportivos que coincidan con "{searchQuery}" o con el deporte seleccionado.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer hover:bg-slate-800"
          >
            Ver Todas las Canchas
          </button>
        </div>
      ) : (
        /* Case 3: Display filtered courts */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {filteredCourts.map((court) => {
            const slots = getSlotsForCourtAndDate(court.id, selectedDate);
            const availableSlotsCount = slots.filter(s => s.status === 'available').length;
            const badge = getSportBadge(court.sport);

            return (
              <div 
                key={court.id} 
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Court Image Banner */}
                  <div className="relative h-56 sm:h-64 overflow-hidden group bg-slate-900">
                    <img
                      src={court.imageUrl || 'https://images.unsplash.com/photo-1529900245534-47fbf8204e61?auto=format&fit=crop&w=1200&q=80'}
                      alt={court.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />

                    {/* Top Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-md border border-slate-700">
                        {court.isIndoor ? 'Techada' : 'Al Aire Libre'}
                      </span>
                    </div>

                    {/* Rating Pill */}
                    {court.reviewCount && court.reviewCount > 0 ? (
                      <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 text-amber-400 text-xs font-bold border border-slate-700 backdrop-blur-md">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{court.rating?.toFixed(1)}</span>
                        <span className="text-slate-400 text-[10px]">({court.reviewCount})</span>
                      </div>
                    ) : (
                      <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 text-emerald-400 text-[11px] font-bold border border-slate-700 backdrop-blur-md">
                        <span>Nueva Cancha</span>
                      </div>
                    )}

                    {/* Bottom Image Info */}
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      {court.establishment && (
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">
                          {court.establishment}
                        </span>
                      )}
                      <h3 className="text-xl font-bold font-heading drop-shadow-md">
                        {court.name}
                      </h3>
                      <p className="text-xs text-slate-200 flex items-center gap-2 mt-1 drop-shadow">
                        <span>{court.surface}</span>
                        <span>•</span>
                        <span>{court.hasLighting ? 'Iluminación LED' : 'Luz natural'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Court Details Body */}
                  <div className="p-5 sm:p-6 space-y-4">
                    
                    {/* Rates */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-sm">
                      <div className="space-y-0.5">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Diurno:</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-900">
                          ${court.hourlyRateDay.toLocaleString('es-AR')}<span className="text-xs text-slate-500 font-normal">/h</span>
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Moon className="w-3.5 h-3.5 text-blue-500" />
                          <span>Nocturno c/Luz:</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-900">
                          ${court.hourlyRateNight.toLocaleString('es-AR')}<span className="text-xs text-slate-500 font-normal">/h</span>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 block">
                          Seña: {court.depositRequired || 50}% online
                        </span>
                      </div>
                    </div>

                    {/* Amenities Tag Cloud */}
                    {court.amenities && court.amenities.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Comodidades Incluidas
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {court.amenities.map((amenity, i) => (
                            <span 
                              key={i} 
                              className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Slots Selector Strip */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          Turnos de Hoy ({availableSlotsCount} disponibles)
                        </span>
                        <button 
                          onClick={() => handleOpenBooking(court)}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                        >
                          Ver todos
                        </button>
                      </div>

                      {/* Mini slots preview */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {slots.slice(0, 12).map((slot) => {
                          const isAvailable = slot.status === 'available';
                          const slotHour = parseInt(slot.startTime.split(':')[0], 10);
                          const isNight = slotHour >= 18;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => handleOpenBooking(court, slot.startTime)}
                              className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all text-center border relative cursor-pointer ${
                                !isAvailable
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed opacity-60'
                                  : 'bg-emerald-50 hover:bg-emerald-500 hover:text-slate-950 text-emerald-800 border-emerald-200 hover:border-emerald-500 shadow-sm'
                              }`}
                            >
                              <span>{slot.startTime}</span>
                              {isNight && isAvailable && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Confirmación directa:</span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      WhatsApp Inmediato
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBooking(court)}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shadow-md hover:shadow-emerald-600/20"
                  >
                    <span>Reservar Cancha</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Booking Modal Popup */}
      {activeBookingCourt && (
        <BookingModal
          court={activeBookingCourt}
          initialSlotTime={selectedInitialSlot}
          onClose={() => setActiveBookingCourt(null)}
        />
      )}

    </section>
  );
};
