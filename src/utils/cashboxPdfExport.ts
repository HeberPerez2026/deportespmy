import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, Court, PaymentMethod, Tournament } from '../types';

export type CashboxPeriodType = 'semanal' | 'mensual' | 'anual';

export interface CashboxReportFilters {
  periodType: CashboxPeriodType;
  anchorDate: string; // YYYY-MM-DD (used for semanal)
  month: string; // YYYY-MM (used for mensual)
  year: string; // YYYY (used for anual)
  complexLabel: string;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  efectivo_mostrador: 'Efectivo',
  tarjeta: 'Tarjeta',
};

const STATUS_LABELS: Record<Booking['status'], string> = {
  confirmed: 'Confirmado',
  completed: 'Completado',
  pending_payment: 'Pend. pago',
  awaiting_approval: 'En revisión',
  cancelled: 'Cancelado',
};

function getWeekRange(anchorDate: string): { start: string; end: string; label: string } {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(anchorDate) ? anchorDate : new Date().toISOString().split('T')[0];
  const [y, m, d] = safe.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(dt);
  mon.setUTCDate(dt.getUTCDate() + diffToMon);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const fmt = (x: Date) => x.toISOString().split('T')[0];
  const start = fmt(mon);
  const end = fmt(sun);
  const formatAr = (iso: string) => iso.split('-').reverse().join('/');
  return {
    start,
    end,
    label: `Semana del ${formatAr(start)} al ${formatAr(end)}`,
  };
}

export function getPeriodBounds(filters: CashboxReportFilters): {
  startDate: string;
  endDate: string;
  periodLabel: string;
  fileSlug: string;
} {
  if (filters.periodType === 'semanal') {
    const w = getWeekRange(filters.anchorDate);
    return {
      startDate: w.start,
      endDate: w.end,
      periodLabel: w.label,
      fileSlug: `semanal_${w.start}_al_${w.end}`,
    };
  }

  if (filters.periodType === 'mensual') {
    const ym = /^\d{4}-\d{2}$/.test(filters.month) ? filters.month : new Date().toISOString().slice(0, 7);
    const [y, m] = ym.split('-').map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    return {
      startDate: `${ym}-01`,
      endDate: `${ym}-${String(lastDay).padStart(2, '0')}`,
      periodLabel: `Mes de ${monthNames[(m - 1) % 12]} ${y}`,
      fileSlug: `mensual_${ym}`,
    };
  }

  const yr = /^\d{4}$/.test(filters.year) ? filters.year : String(new Date().getFullYear());
  return {
    startDate: `${yr}-01-01`,
    endDate: `${yr}-12-31`,
    periodLabel: `Año completo ${yr}`,
    fileSlug: `anual_${yr}`,
  };
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount || 0).toLocaleString('es-AR')}`;
}

export function exportCashboxReportPdf(params: {
  bookings: Booking[];
  courts: Court[];
  tournaments?: Tournament[];
  filters: CashboxReportFilters;
}): { count: number; netCollected: number } {
  const { bookings, courts, tournaments = [], filters } = params;
  const { startDate, endDate, periodLabel, fileSlug } = getPeriodBounds(filters);

  const periodBookings = bookings
    .filter((b) => !b.clientPhone?.startsWith('BLOQUEO') && !b.notes?.startsWith('[BLOQUEO'))
    .filter((b) => b.date >= startDate && b.date <= endDate)
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  const activeBookings = periodBookings.filter((b) => b.status !== 'cancelled');
  const cancelledWithRefund = periodBookings.filter((b) => b.status === 'cancelled' && Number(b.refundAmount || 0) > 0);

  const tournamentEntries = tournaments
    .filter((t) => t.status !== 'cancelled')
    .flatMap((t) =>
      (t.teams || []).map((tm) => {
        const opDate = (tm.registeredAt ? tm.registeredAt.slice(0, 10) : t.date) || t.date;
        const paidAmt = Number(tm.amountPaid ?? (tm.paid ? t.entryFee : 0));
        const refundAmt = Number(tm.refundAmount ?? (tm.refunded ? paidAmt || t.entryFee : 0));
        return {
          tournamentTitle: t.title,
          teamName: tm.teamName,
          captainName: tm.captainName,
          bookingCode: tm.bookingCode || `TRN-${tm.id.slice(-4).toUpperCase()}`,
          opDate,
          startTime: t.startTime,
          method: (tm.paymentMethod || 'efectivo_mostrador') as PaymentMethod,
          isPaid: !tm.refunded && (Boolean(tm.paid) || tm.paymentStatus === 'paid'),
          isAwaiting: !tm.refunded && tm.paymentStatus === 'awaiting_approval',
          isRefunded: Boolean(tm.refunded || tm.paymentStatus === 'refunded'),
          paidAmount: paidAmt,
          refundAmount: refundAmt,
          pendingAmount: !tm.refunded && !tm.paid && tm.paymentStatus !== 'paid' ? Number(t.entryFee || 0) : 0,
        };
      })
    )
    .filter((item) => item.opDate >= startDate && item.opDate <= endDate);

  const activeTournamentEntries = tournamentEntries.filter((e) => e.isPaid);
  const refundedTournamentEntries = tournamentEntries.filter((e) => e.isRefunded && e.refundAmount > 0);

  const bookingsGross = activeBookings.reduce((sum, b) => sum + Number(b.amountPaid || 0), 0);
  const tournamentsGross = activeTournamentEntries.reduce((sum, e) => sum + e.paidAmount, 0);
  const grossCollected = bookingsGross + tournamentsGross;

  const pendingBookings = activeBookings.reduce((sum, b) => sum + Number(b.balanceDue || 0), 0);
  const pendingTournaments = tournamentEntries.filter((e) => !e.isPaid && !e.isRefunded).reduce((sum, e) => sum + e.pendingAmount, 0);
  const pendingAtCourt = pendingBookings + pendingTournaments;

  const totalRefundedBookings = cancelledWithRefund.reduce((sum, b) => sum + Number(b.refundAmount || 0), 0);
  const totalRefundedTournaments = refundedTournamentEntries.reduce((sum, e) => sum + e.refundAmount, 0);
  const totalRefunded = totalRefundedBookings + totalRefundedTournaments;
  const netCollected = Math.max(0, grossCollected - totalRefunded);

  const byMethod: Record<PaymentMethod, { count: number; amount: number }> = {
    mercadopago: { count: 0, amount: 0 },
    transferencia: { count: 0, amount: 0 },
    efectivo_mostrador: { count: 0, amount: 0 },
    tarjeta: { count: 0, amount: 0 },
  };
  activeBookings.forEach((b) => {
    const m = b.paymentMethod || 'efectivo_mostrador';
    if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
    byMethod[m].count += 1;
    byMethod[m].amount += Number(b.amountPaid || 0);
  });
  activeTournamentEntries.forEach((e) => {
    const m = e.method || 'efectivo_mostrador';
    if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
    byMethod[m].count += 1;
    byMethod[m].amount += e.paidAmount;
  });

  const courtMap = new Map<string, { name: string; count: number; collected: number; pending: number }>();
  activeBookings.forEach((b) => {
    const cName = b.courtName || courts.find((c) => c.id === b.courtId)?.name || 'Cancha';
    const prev = courtMap.get(b.courtId) || { name: cName, count: 0, collected: 0, pending: 0 };
    prev.count += 1;
    prev.collected += Number(b.amountPaid || 0);
    prev.pending += Number(b.balanceDue || 0);
    courtMap.set(b.courtId, prev);
  });

  if (activeTournamentEntries.length > 0 || pendingTournaments > 0) {
    courtMap.set('__tournaments__', {
      name: 'Inscripciones de Torneos',
      count: activeTournamentEntries.length,
      collected: tournamentsGross,
      pending: pendingTournaments,
    });
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(13, 17, 23);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(163, 230, 53);
  doc.rect(0, 32.5, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Balance de Caja · DeportesPMY', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 224);
  doc.text(`Complejo: ${filters.complexLabel || 'Todos los complejos'}`, 14, 21);
  doc.text(`Período (${filters.periodType.toUpperCase()}): ${periodLabel}`, 14, 27);

  doc.setFontSize(8.5);
  doc.setTextColor(163, 230, 53);
  doc.text(`Emitido: ${new Date().toLocaleString('es-AR')}`, pageWidth - 14, 27, { align: 'right' });

  // KPI Summary table
  const activeOpsCount = activeBookings.length + activeTournamentEntries.length;
  autoTable(doc, {
    startY: 40,
    head: [['Ingresos Brutos', 'Devoluciones', 'Balance Neto', 'Saldo Pendiente', 'Operaciones Activas']],
    body: [[
      formatMoney(grossCollected),
      formatMoney(totalRefunded),
      formatMoney(netCollected),
      formatMoney(pendingAtCourt),
      String(activeOpsCount),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [22, 27, 34], textColor: [200, 255, 50], fontSize: 8.5, halign: 'center' },
    bodyStyles: { fontStyle: 'bold', fontSize: 10, halign: 'center', textColor: [17, 24, 39] },
    margin: { left: 14, right: 14 },
  });

  // Payment Methods & Court Breakdown
  const afterKpiY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 64;

  autoTable(doc, {
    startY: afterKpiY + 6,
    head: [['Medio de Pago', 'Operaciones', 'Total Cobrado', '% del Total']],
    body: (Object.keys(byMethod) as PaymentMethod[]).map((method) => {
      const entry = byMethod[method];
      const pct = grossCollected > 0 ? `${Math.round((entry.amount / grossCollected) * 100)}%` : '0%';
      return [METHOD_LABELS[method], String(entry.count), formatMoney(entry.amount), pct];
    }),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterMethodY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 110;

  if (courtMap.size > 0) {
    autoTable(doc, {
      startY: afterMethodY + 6,
      head: [['Concepto / Cancha', 'Cantidad', 'Cobrado', 'Saldo Pendiente']],
      body: Array.from(courtMap.values())
        .sort((a, b) => b.collected - a.collected)
        .map((c) => [c.name, String(c.count), formatMoney(c.collected), formatMoney(c.pending)]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
  }

  const afterCourtY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || afterMethodY + 10;

  // Itemized transactions table (bookings + tournaments)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Detalle de Movimientos del Período', 14, afterCourtY + 8);

  const combinedRows = [
    ...periodBookings.map((b) => ({
      sortKey: `${b.date} ${b.startTime}`,
      row: [
        b.date.split('-').reverse().join('/'),
        `${b.startTime}`,
        b.bookingCode,
        b.courtName,
        b.clientName,
        METHOD_LABELS[b.paymentMethod] || b.paymentMethod,
        STATUS_LABELS[b.status] || b.status,
        b.status === 'cancelled' && Number(b.refundAmount || 0) > 0
          ? `-${formatMoney(Number(b.refundAmount || 0))}`
          : formatMoney(Number(b.amountPaid || 0)),
        b.status === 'cancelled' ? '$0' : formatMoney(Number(b.balanceDue || 0)),
      ],
    })),
    ...tournamentEntries.map((e) => ({
      sortKey: `${e.opDate} ${e.startTime}`,
      row: [
        e.opDate.split('-').reverse().join('/'),
        `${e.startTime}`,
        e.bookingCode,
        `TORNEO · ${e.tournamentTitle}`,
        `${e.teamName} (${e.captainName})`,
        METHOD_LABELS[e.method] || e.method,
        e.isRefunded ? 'Reembolsado' : e.isPaid ? 'Inscripción Paga' : e.isAwaiting ? 'En revisión' : 'Pend. pago',
        e.isRefunded
          ? `-${formatMoney(e.refundAmount)}`
          : formatMoney(e.isPaid ? e.paidAmount : 0),
        e.isPaid || e.isRefunded ? '$0' : formatMoney(e.pendingAmount),
      ],
    })),
  ]
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((x) => x.row);

  autoTable(doc, {
    startY: afterCourtY + 11,
    head: [['Fecha', 'Hora', 'Código', 'Cancha / Torneo', 'Cliente / Equipo', 'Medio', 'Estado', 'Cobrado/Dev.', 'Saldo']],
    body: combinedRows.length > 0 ? combinedRows : [['—', '—', '—', 'Sin movimientos en este período', '—', '—', '—', '$0', '$0']],
    theme: 'grid',
    headStyles: { fillColor: [13, 17, 23], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7.3 },
    columnStyles: {
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `DeportesPMY · Balance de Caja (${periodLabel}) · Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(`balance_caja_${fileSlug}.pdf`);

  return { count: activeOpsCount, netCollected };
}

