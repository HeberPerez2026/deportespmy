import React from 'react';
import { useApp } from '../context/AppContext';
import { SportType } from '../types';
import { getIsoDate } from '../data/mockData';
import { 
  Calendar as CalendarIcon, 
  CreditCard, 
  Clock, 
  MapPin,
  Sparkles
} from 'lucide-react';

interface SportOption {
  id: SportType | 'all';
  label: string;
  emoji: string;
}

const SPORTS: SportOption[] = [
  { id: 'all', label: 'Todos los Deportes', emoji: '🏆' },
  { id: 'futbol5', label: 'Fútbol 5', emoji: '⚽' },
  { id: 'futbol7', label: 'Fútbol 7', emoji: '⚽' },
  { id: 'padel', label: 'Pádel Panorámico', emoji: '🎾' },
  { id: 'tenis', label: 'Tenis Polvo', emoji: '🎾' },
  { id: 'basquet', label: 'Básquet / Parquet', emoji: '🏀' },
];

export const HeroBanner: React.FC = () => {
  const { 
    selectedSport, 
    setSelectedSport, 
    selectedDate, 
    setSelectedDate,
    courts
  } = useApp();

  const todayStr = getIsoDate(0);
  const tomorrowStr = getIsoDate(1);

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white overflow-hidden border-b border-emerald-900/30">
      
      {/* Decorative ambient lights */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        
        {/* Top Mini Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Turnos Disponibles en Puerto Madryn (Chubut)</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              Mercado Pago & Transferencia
            </span>
            <span className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Horarios Diurnos & Nocturnos
            </span>
          </div>
        </div>

        {/* Filter and Date Selector Box */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* Date Quick Selector */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                Fecha del Turno
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border ${
                    selectedDate === todayStr
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <div>Hoy</div>
                  <div className="text-[10px] opacity-80">{getDayName(todayStr).split(',')[0]}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrowStr)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border ${
                    selectedDate === tomorrowStr
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  <div>Mañana</div>
                  <div className="text-[10px] opacity-80">{getDayName(tomorrowStr).split(',')[0]}</div>
                </button>

                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    min={todayStr}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-full py-2 px-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-750 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center"
                    title="Elegir otra fecha en calendario"
                  />
                </div>
              </div>
            </div>

            {/* Sport Quick Selector Pills */}
            <div className="md:col-span-7">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Filtrar por Deporte
              </label>

              <div className="flex flex-wrap gap-1.5">
                {SPORTS.map((sport) => {
                  const isSelected = selectedSport === sport.id;
                  const count = sport.id === 'all' 
                    ? courts.length 
                    : courts.filter(c => c.sport === sport.id).length;

                  return (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setSelectedSport(sport.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      <span>{sport.emoji}</span>
                      <span>{sport.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-700 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
