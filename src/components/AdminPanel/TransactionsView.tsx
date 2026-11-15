import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Booking } from '../../types';
import { CheckCircle, AlertTriangle, X, Loader2, RotateCcw } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { adminBookings: bookings, collectBalanceAtCourt, cancelBooking } = useApp();
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);

  const confirmedBookings = bookings.filter(b => (b.status === 'confirmed' || b.status === 'awaiting_approval') && !b.clientName.startsWith('[BLOQUEADO'));
  const refundedBookings = bookings.filter(b => b.status === 'cancelled' && b.paymentStatus === 'reembolsado' && !b.clientName.startsWith('[BLOQUEADO'));

  // Aggregations
  const totalCollected = confirmedBookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalPending = confirmedBookings.reduce((sum, b) => sum + b.balanceDue, 0);
  const mpCollected = confirmedBookings.filter(b => b.paymentMethod === 'mercadopago').reduce((sum, b) => sum + b.amountPaid, 0);
  const cashCollected = confirmedBookings.filter(b => b.paymentMethod === 'efectivo_mostrador').reduce((sum, b) => sum + b.amountPaid, 0);
  const bankCollected = confirmedBookings.filter(b => b.paymentMethod === 'transferencia' || b.paymentMethod === 'tarjeta').reduce((sum, b) => sum + b.amountPaid, 0);

  const filteredBookings = (filterMethod === 'reembolsado' ? refundedBookings : confirmedBookings).filter(b => {
    if (filterMethod === 'all' || filterMethod === 'reembolsado') return true;
    return b.paymentMethod === filterMethod;
  });

  const handleConfirmRefund = async (forceManual = false) => {
    if (!cancelTarget) return;
    setIsRefunding(true);
    setRefundError(null);
    const res = await cancelBooking(cancelTarget.id, { forceManual, notifyWhatsApp });
    setIsRefunding(false);
    if (!res.success) {
      setRefundError(res.message || 'No se pudo procesar la devolución.');
      return;
    }
    setCancelTarget(null);
    setRefundNotice(res.message || 'Devolución registrada.');
    setTimeout(() => setRefundNotice(null), 6000);
  };

  return (
    <div className="space-y-6">
      {refundNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{refundNotice}</span>
          </div>
          <button onClick={() => setRefundNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
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
          <option value="reembolsado">Cancelados / Reembolsados ({refundedBookings.length})</option>
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
                      {b.status === 'cancelled' && b.paymentStatus === 'reembolsado' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          ↩ Reembolsado ${(b.refundAmount ?? b.amountPaid).toLocaleString('es-AR')}
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          {b.balanceDue > 0 ? (
                            <button
                              onClick={() => collectBalanceAtCourt(b.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer shadow-xs"
                            >
                              Cobrar Saldo
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-[11px] font-bold">✓ Saldado</span>
                          )}
                          <button
                            onClick={() => {
                              setRefundError(null);
                              setNotifyWhatsApp(true);
                              setCancelTarget(b);
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] cursor-pointer"
                            title="Cancelar turno y devolver importe abonado"
                          >
                            Devolver
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Confirmation Modal for Refund from Cashbox */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-900 space-y-4 border border-rose-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">
                    Confirmación de Devolución
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 font-heading">
                    ¿Cancelar Turno #{cancelTarget.bookingCode} y Reembolsar?
                  </h3>
                </div>
              </div>
              <button
                onClick={() => !isRefunding && setCancelTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <strong className="text-slate-900">{cancelTarget.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turno:</span>
                <strong className="font-mono text-slate-800">{cancelTarget.date} {cancelTarget.startTime} hs</strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-rose-700">Importe a devolver al jugador:</span>
                <span className="text-lg font-black text-rose-600 font-mono">
                  ${cancelTarget.amountPaid.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span>Notificar cancelación y devolución por WhatsApp al jugador</span>
            </label>

            {refundError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                <p className="font-bold">{refundError}</p>
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => handleConfirmRefund(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                >
                  Cancelar Turno Igualmente (Devolución Manual)
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={() => handleConfirmRefund(false)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {isRefunding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar y Devolver ${cancelTarget.amountPaid.toLocaleString('es-AR')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
