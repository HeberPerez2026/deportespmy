import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyStats, Tournament } from '../types';

function formatMoney(amount: number): string {
  return `$${Math.round(amount || 0).toLocaleString('es-AR')}`;
}

export function exportMonthlyStatsPdf(params: {
  stats: MonthlyStats;
  complexLabel: string;
  monthKey: string;
  tournaments?: Tournament[];
}): { filename: string } {
  const { stats, complexLabel, monthKey, tournaments = [] } = params;
  const ticketAverage = stats.totalBookings > 0 ? Math.round(stats.totalRevenue / stats.totalBookings) : 0;

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
  doc.text('Estadísticas Mensuales · DeportesPMY', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 210, 224);
  doc.text(`Complejo: ${complexLabel || 'Todos los complejos'}`, 14, 21);
  doc.text(`Período analizado: ${stats.monthLabel || monthKey}`, 14, 27);

  doc.setFontSize(8.5);
  doc.setTextColor(163, 230, 53);
  doc.text(`Emitido: ${new Date().toLocaleString('es-AR')}`, pageWidth - 14, 27, { align: 'right' });

  // KPI Summary
  autoTable(doc, {
    startY: 40,
    head: [['Ingresos Totales', 'Turnos Confirmados', 'Horas Jugadas', 'Ocupación Prom.', 'Ticket Promedio']],
    body: [[
      formatMoney(stats.totalRevenue),
      String(stats.totalBookings),
      `${stats.totalHoursPlayed} hs`,
      `${stats.averageOccupancyRate}%`,
      formatMoney(ticketAverage),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [22, 27, 34], textColor: [200, 255, 50], fontSize: 8.5, halign: 'center' },
    bodyStyles: { fontStyle: 'bold', fontSize: 10, halign: 'center', textColor: [17, 24, 39] },
    margin: { left: 14, right: 14 },
  });

  let cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 64;

  // Sport Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Demanda y Recaudación por Deporte', 14, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 11,
    head: [['Deporte', 'Turnos / Insc.', 'Ingresos', '% del Total']],
    body: stats.sportBreakdown.length > 0
      ? stats.sportBreakdown.map((s) => [
          s.sportName,
          String(s.bookingsCount),
          formatMoney(s.revenue),
          `${s.percentage}%`,
        ])
      : [['Sin datos registrados en el mes', '0', '$0', '0%']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY + 35;

  // Peak Hours
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Horarios Pico de Demanda', 14, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 11,
    head: [['Franja Horaria', 'Cantidad de Turnos']],
    body: stats.peakHours.length > 0
      ? stats.peakHours.map((p) => [p.hour, String(p.bookingsCount)])
      : [['Sin franjas registradas', '0']],
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 1: { halign: 'center' } },
    margin: { left: 14, right: 14 },
  });

  cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY + 35;

  // Tournament Inscriptions in Month (if any)
  const paidTeamsInMonth = tournaments
    .filter((t) => t.status !== 'cancelled' && t.date.startsWith(monthKey))
    .flatMap((t) =>
      t.teams
        .filter((tm) => !tm.refunded && (tm.paid || tm.paymentStatus === 'paid'))
        .map((tm) => ({
          tournamentTitle: t.title,
          teamName: tm.teamName,
          captainName: tm.captainName,
          method: tm.paymentMethod || 'efectivo_mostrador',
          amount: Number(tm.amountPaid ?? t.entryFee ?? 0),
        }))
    );

  if (paidTeamsInMonth.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(17, 24, 39);
    doc.text('Inscripciones de Torneos Cobradas', 14, cursorY + 8);

    autoTable(doc, {
      startY: cursorY + 11,
      head: [['Torneo', 'Equipo', 'Capitán', 'Medio', 'Monto']],
      body: paidTeamsInMonth.map((row) => [
        row.tournamentTitle,
        row.teamName,
        row.captainName,
        row.method,
        formatMoney(row.amount),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 },
    });

    cursorY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY + 35;
  }

  // Top Clients
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Clientes Más Recurrentes del Mes', 14, cursorY + 8);

  autoTable(doc, {
    startY: cursorY + 11,
    head: [['#', 'Cliente / Equipo', 'WhatsApp', 'Reservas / Insc.', 'Inversión Total']],
    body: stats.topClients.length > 0
      ? stats.topClients.map((c, idx) => [
          String(idx + 1),
          c.name,
          c.phone || '—',
          String(c.bookingsCount),
          formatMoney(c.totalSpent),
        ])
      : [['—', 'Sin clientes frecuentes en este mes', '—', '0', '$0']],
    theme: 'grid',
    headStyles: { fillColor: [13, 17, 23], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `DeportesPMY · Estadísticas (${monthKey}) · Página ${data.pageNumber} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  const filename = `deportespmy_estadisticas_${monthKey}.pdf`;
  doc.save(filename);
  return { filename };
}
