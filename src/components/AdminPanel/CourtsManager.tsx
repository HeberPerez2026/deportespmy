import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Court } from '../../types';
import { 
  Layers, 
  Edit3, 
  Check, 
  X, 
  Sun, 
  Moon, 
  Star, 
  DollarSign, 
  AlertCircle,
  Plus
} from 'lucide-react';

export const CourtsManager: React.FC = () => {
  const { courts, updateCourt } = useApp();
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt) return;
    updateCourt(editingCourt);
    setEditingCourt(null);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
            Configuración de Instalaciones
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Gestión de Canchas & Tarifas Horarias
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map((court) => (
          <div 
            key={court.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44">
                <img
                  src={court.imageUrl}
                  alt={court.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                  {court.sport.toUpperCase()}
                </span>
                <span className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${court.status === 'active' ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                  {court.status === 'active' ? 'En Servicio' : 'En Mantenimiento'}
                </span>
                <div className="absolute bottom-3 left-3 right-3 text-white">
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
                      <Moon className="w-3 h-3 text-blue-500" /> Tarifa Nocturna:
                    </span>
                    <strong className="text-slate-900 text-sm font-bold">
                      ${court.hourlyRateNight.toLocaleString('es-AR')}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 line-clamp-2">
                  {court.description}
                </div>

                <div className="flex flex-wrap gap-1">
                  {court.amenities.map((a, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setEditingCourt(court)}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Tarifas & Estado</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editingCourt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold font-heading">
                Editar Cancha: {editingCourt.name}
              </h3>
              <button onClick={() => setEditingCourt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingCourt.name}
                  onChange={(e) => setEditingCourt({ ...editingCourt, name: e.target.value })}
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
                  <label className="font-bold text-slate-700 block mb-1">Tarifa Noche c/Luz (ARS)</label>
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
