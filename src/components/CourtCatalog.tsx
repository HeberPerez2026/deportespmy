import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Court, TimeSlot } from '../types';
import { BookingModal } from './BookingModal';
import { 
  Star, 
  MapPin, 
  Sparkles, 
  Check, 
  Clock, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Calendar, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

export const CourtCatalog: React.FC = () => {
  const { 
    courts, 
    selectedSport, 
    selectedDate, 
    getSlotsForCourtAndDate,
    setActiveTab
  } = useApp();

  const [activeBookingCourt, setActiveBookingCourt] = useState<Court | null>(null);
  const [selectedInitialSlot, setSelectedInitialSlot] = useState<string | undefined>(undefined);

  // Filter courts by sport
  const filteredCourts = courts.filter(court => {
    if (selectedSport === 'all') return true;
    return court.sport === selectedSport;
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
      case 'basquet': return { label: 'Básquetbol / Multideporte', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      default: return { label: sport, color: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            <Layers className="w-4 h-4" />
            Espacios Deportivos Disponibles
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Canchas y Turnos para el {selectedDate}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Hacé click en cualquier horario verde para iniciar tu reserva inmediata con pago online.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500" /> Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-300" /> Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Tarifa Nocturna (Con luz)
          </span>
        </div>
      </div>

      {/* Courts Grid */}
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
                <div className="relative h-56 sm:h-64 overflow-hidden group">
                  <img
                    src={court.imageUrl}
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
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/85 text-amber-400 text-xs font-bold border border-slate-700 backdrop-blur-md">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{court.rating.toFixed(1)}</span>
                    <span className="text-slate-400 text-[10px]">({court.reviewCount})</span>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h3 className="text-xl font-bold font-heading drop-shadow-md">
                      {court.name}
                    </h3>
                    <p className="text-xs text-slate-200 flex items-center gap-2 mt-1 drop-shadow">
                      <span>{court.surface}</span>
                      <span>•</span>
                      <span>{court.hasLighting ? 'Iluminación LED 400W' : 'Luz natural'}</span>
                    </p>
                  </div>
                </div>

                {/* Court Details Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  
                  {/* Rates and Features */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 text-sm">
                    <div className="space-y-0.5">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Diurno (09:00 - 18:00):</span>
                      </div>
                      <span className="text-base font-extrabold text-slate-900">
                        ${court.hourlyRateDay.toLocaleString('es-AR')}<span className="text-xs text-slate-500 font-normal">/h</span>
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-blue-500" />
                        <span>Nocturno c/Luz (18:00 - 00:00):</span>
                      </div>
                      <span className="text-base font-extrabold text-slate-900">
                        ${court.hourlyRateNight.toLocaleString('es-AR')}<span className="text-xs text-slate-500 font-normal">/h</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 block">
                        Seña: {court.depositRequired}% online
                      </span>
                    </div>
                  </div>

                  {/* Amenities Tag Cloud */}
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

                    {/* Scrollable mini slots preview */}
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
                    WhatsApp + QR Inmediato
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
