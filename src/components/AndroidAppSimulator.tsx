import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  Signal, 
  Calendar, 
  User, 
  ShieldCheck, 
  QrCode, 
  MessageCircle, 
  Clock, 
  Layers, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Search,
  Plus
} from 'lucide-react';

export const AndroidAppSimulator: React.FC = () => {
  const { 
    androidViewMode, 
    setAndroidViewMode, 
    courts, 
    bookings, 
    userPhone,
    selectedDate,
    setSelectedDate,
    getSlotsForCourtAndDate,
    collectBalanceAtCourt,
    triggerWhatsAppSend,
    isSyncing
  } = useApp();

  const [activeScreen, setActiveScreen] = useState<'home' | 'schedule' | 'tickets' | 'admin_desk'>('home');
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [quickSearch, setQuickSearch] = useState('');

  if (androidViewMode === 'none') return null;

  const isAdminApp = androidViewMode === 'admin_app';

  // Player bookings
  const myBookings = bookings.filter(b => b.clientPhone === userPhone && b.status === 'confirmed');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      
      {/* Container with mode controls on top */}
      <div className="w-full max-w-4xl flex flex-col items-center">
        
        {/* Simulator Top Controls */}
        <div className="bg-slate-900 border border-slate-800 text-white px-5 py-2.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 w-full max-w-md mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold font-heading">Simulador de App Android</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-bold">
              <button
                onClick={() => setAndroidViewMode('player_app')}
                className={`px-2 py-1 rounded-md transition-all ${
                  androidViewMode === 'player_app' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                App Jugador
              </button>
              <button
                onClick={() => setAndroidViewMode('admin_app')}
                className={`px-2 py-1 rounded-md transition-all ${
                  androidViewMode === 'admin_app' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                App Admin
              </button>
            </div>

            <button
              onClick={() => setAndroidViewMode('none')}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real Phone Frame Mockup */}
        <div className="relative w-full max-w-[370px] h-[720px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700 flex flex-col justify-between overflow-hidden">
          
          {/* Top Speaker & Camera Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-950 rounded-b-2xl z-40 flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-900 border border-slate-800 rounded-full ml-2" />
          </div>

          {/* Android Status Bar */}
          <div className="pt-2 px-5 pb-1 flex justify-between items-center text-[10px] text-slate-400 select-none z-30 font-medium">
            <span>19:35</span>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-slate-300" />
              <Signal className="w-3 h-3 text-slate-300" />
              <Battery className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </div>

          {/* Phone Screen Inner Body */}
          <div className="flex-1 bg-slate-900 rounded-[36px] overflow-y-auto text-slate-100 flex flex-col justify-between relative border border-slate-800">
            
            {/* Screen Top Header */}
            <div className={`p-4 ${isAdminApp ? 'bg-blue-950/80 border-b border-blue-900/60' : 'bg-emerald-950/80 border-b border-emerald-900/60'} backdrop-blur-md`}>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                    {isAdminApp ? 'DeportesPMY • Admin Desk' : 'DeportesPMY • Móvil'}
                  </span>
                  <h3 className="text-base font-extrabold font-heading text-white">
                    {isAdminApp ? 'Recepción & Canchas' : 'Reservá tu Turno'}
                  </h3>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 text-[10px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="text-slate-400">Live Sync</span>
                </div>
              </div>
            </div>

            {/* SCREEN CONTENT BASED ON APP TYPE */}
            <div className="p-3.5 space-y-3.5 flex-1 overflow-y-auto text-xs">
              
              {/* ADMIN APP SCREENS */}
              {isAdminApp ? (
                <div className="space-y-3">
                  
                  {/* Today Quick Status Bar */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Estado Canchas Hoy</span>
                    <div className="flex justify-between text-xs">
                      <span>Reservas activas:</span>
                      <strong className="text-emerald-400">
                        {bookings.filter(b => b.date === selectedDate && b.status === 'confirmed').length} partidos
                      </strong>
                    </div>
                  </div>

                  {/* Mostrador list of upcoming games */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-300 block text-xs">Próximos Ingresos a Cancha</span>
                    {bookings.slice(0, 4).map((b) => (
                      <div key={b.id} className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-xs">{b.clientName}</span>
                          <span className="font-mono text-[10px] text-blue-400 font-bold">#{b.bookingCode}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex justify-between">
                          <span>{b.courtName.split('-')[0]}</span>
                          <span className="font-mono text-white font-bold">{b.startTime} hs</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                          <span className={`text-[10px] font-bold ${b.balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {b.balanceDue > 0 ? `Saldo pendiente: $${b.balanceDue.toLocaleString('es-AR')}` : '✓ 100% Pagado'}
                          </span>

                          {b.balanceDue > 0 && (
                            <button
                              onClick={() => collectBalanceAtCourt(b.id)}
                              className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]"
                            >
                              Cobrar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ) : (
                /* PLAYER APP SCREENS */
                <div className="space-y-3">
                  
                  {/* Sports pill filters */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {['all', 'futbol5', 'padel', 'tenis'].map((sp) => (
                      <button
                        key={sp}
                        onClick={() => setSelectedSport(sp)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap ${
                          selectedSport === sp ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {sp === 'all' ? 'Todos' : sp.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Court cards */}
                  <div className="space-y-2.5">
                    {courts.filter(c => selectedSport === 'all' || c.sport === selectedSport).slice(0, 3).map((court) => (
                      <div key={court.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex gap-2.5">
                          <img
                            src={court.imageUrl}
                            alt={court.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-white truncate">{court.name}</h4>
                            <p className="text-[10px] text-slate-400">{court.surface}</p>
                            <span className="font-mono text-emerald-400 font-bold text-xs mt-1 block">
                              ${court.hourlyRateDay.toLocaleString('es-AR')}/h
                            </span>
                          </div>
                        </div>

                        {/* Fast slots preview */}
                        <div className="flex gap-1 overflow-x-auto pt-1 border-t border-slate-850">
                          {['19:00', '20:00', '21:00', '22:00'].map((time) => (
                            <button
                              key={time}
                              onClick={() => alert(`Horario ${time} seleccionado para ${court.name}. Se abrirá el checkout de Mercado Pago.`)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold hover:bg-emerald-500 hover:text-slate-950 transition-all shrink-0"
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* My active pass preview */}
                  {myBookings.length > 0 && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-1">
                      <div className="flex justify-between items-center text-[11px] font-bold text-emerald-300">
                        <span className="flex items-center gap-1">
                          <QrCode className="w-3.5 h-3.5" /> Mi Próximo Turno
                        </span>
                        <span className="font-mono">#{myBookings[0].bookingCode}</span>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        {myBookings[0].courtName} • {myBookings[0].startTime} hs
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* Android In-App Bottom Navigation Bar */}
            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 flex justify-around items-center text-slate-400 text-[10px]">
              <button 
                onClick={() => setActiveScreen('home')}
                className="flex flex-col items-center gap-0.5 text-emerald-400 font-bold"
              >
                <Calendar className="w-4 h-4" />
                <span>Turnos</span>
              </button>
              <button 
                onClick={() => setActiveScreen('tickets')}
                className="flex flex-col items-center gap-0.5 hover:text-white"
              >
                <QrCode className="w-4 h-4" />
                <span>Pases QR</span>
              </button>
              <button 
                onClick={() => setAndroidViewMode(isAdminApp ? 'player_app' : 'admin_app')}
                className="flex flex-col items-center gap-0.5 hover:text-white"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAdminApp ? 'Modo Jugador' : 'Modo Admin'}</span>
              </button>
            </div>

          </div>

          {/* Android Bottom Home Navigation Bar Pill */}
          <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-2 mb-0.5" />

        </div>

      </div>

    </div>
  );
};
