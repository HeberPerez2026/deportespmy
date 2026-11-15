import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DollarSign, CreditCard, CheckCircle, Clock, AlertCircle, ArrowUpRight, Search } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { adminBookings: bookings, collectBalanceAtCourt } = useApp();
  const [filterMethod, setFilterMethod] = useState<string>('all');

  const confirmedBookings = bookings.filter(b => (b.status === 'confirmed' || b.status === 'awaiting_approval') && !b.clientName.startsWith('[BLOQUEADO'));

  // Aggregations
  const totalCollected = confirmedBookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPending = confirmedBookings.reduce((sum, b) => sum + b.balanceDue, 0);
  const mpCollected = confirmedBookings.filter(b => b.paymentMethod === 'mercadopago').reduce((sum, b) => sum + b.amountPaid, 0);
  const cashCollected = confirmedBookings.filter(b => b.paymentMethod === 'efectivo_mostrador').reduce((sum, b) => sum + b.amountPaid, 0);
  const bankCollected = confirmedBookings.filter(b => b.paymentMethod === 'transferencia' || b.paymentMethod === 'tarjeta').reduce((sum, b) => sum + b.amountPaid, 0);

  const filteredBookings = confirmedBookings.filter(b => {
    if (filterMethod === 'all') return true;
    return b.paymentMethod === filterMethod;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
            Caja & Liquidaciones
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 font-heading">
            Control de Cobranzas y Arqueo de Caja
          </h2>
        </div>

        {/* Filter */}
        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          <option value="all">Todos los Medios de Pago</option>
          <option value="mercadopago">Mercado Pago</option>
          <option value="efectivo_mostrador">Efectivo Mostrador</option>
          <option value="transferencia">Transferencia Bancaria</option>
          <option value="tarjeta">Tarjeta Débito/Crédito</option>
        </select>
      </div>

      {/* Cashbox KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Recaudado (Ingresado)
          </span>
          <div className="text-2xl font-black text-emerald-600 font-heading mt-1">
            ${totalCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Acreditado en cuentas y caja</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Saldo a Cobrar en Cancha
          </span>
          <div className="text-2xl font-black text-amber-600 font-heading mt-1">
            ${totalPending.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Señas pendientes de cancelación</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Mercado Pago Online
          </span>
          <div className="text-2xl font-black text-sky-600 font-heading mt-1">
            ${mpCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Acreditado en tu cuenta Mercado Pago</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Efectivo en Recepción
          </span>
          <div className="text-2xl font-black text-slate-800 font-heading mt-1">
            ${cashCollected.toLocaleString('es-AR')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Caja física mostrador</span>
        </div>

      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-3 px-4 font-bold">Comprobante</th>
                <th className="py-3 px-4 font-bold">Cliente</th>
                <th className="py-3 px-4 font-bold">Cancha</th>
                <th className="py-3 px-4 font-bold">Fecha / Turno</th>
                <th className="py-3 px-4 font-bold">Medio de Pago</th>
                <th className="py-3 px-4 font-bold text-right">Abonado</th>
                <th className="py-3 px-4 font-bold text-right">Saldo Restante</th>
                <th className="py-3 px-4 font-bold text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    No hay movimientos ni cobros registrados en la caja actualmente.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">#{b.bookingCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{b.clientName}</td>
                    <td className="py-3 px-4 text-slate-600">{b.courtName.split('-')[0]}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{b.date} {b.startTime}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase font-semibold text-[10px]">
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <div className="flex flex-col items-end">
                        <span className={b.status === 'awaiting_approval' ? 'text-rose-500' : 'text-emerald-600'}>
                          ${b.amountPaid.toLocaleString('es-AR')}
                        </span>
                        {b.status === 'awaiting_approval' && (
                          <span className="text-[9px] bg-rose-500 text-white px-1 rounded font-black uppercase mt-0.5 animate-pulse">
                            Por Aprobar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {b.balanceDue > 0 ? (
                        <span className="text-amber-600">${b.balanceDue.toLocaleString('es-AR')}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">Saldado</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.balanceDue > 0 ? (
                        <button
                          onClick={() => collectBalanceAtCourt(b.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer shadow-xs"
                        >
                          Cobrar Saldo
                        </button>
                      ) : (
                        <span className="text-emerald-600 text-[11px] font-bold">✓ Cancelado</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
