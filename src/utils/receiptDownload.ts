import { Booking } from '../types';

export function downloadBookingReceiptPng(
  booking: Booking,
  complexName?: string
): void {
  const canvas = document.createElement('canvas');
  const width = 920;
  const height = 1080;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fondo oscuro limpio tipo ticket deportivo
  ctx.fillStyle = '#0D1117';
  ctx.fillRect(0, 0, width, height);

  // Tarjeta interior
  const pad = 44;
  ctx.fillStyle = '#161B22';
  ctx.strokeStyle = 'rgba(200, 255, 50, 0.35)';
  ctx.lineWidth = 3;
  roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, 28, true, true);

  // Franja superior de marca
  ctx.fillStyle = '#C8FF32';
  roundRect(ctx, pad, pad, width - pad * 2, 12, 6, true, false);

  // Cabecera
  ctx.fillStyle = '#C8FF32';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('DEPORTESPMY · COMPROBANTE DE RESERVA', pad + 44, pad + 72);

  const statusLabel =
    booking.status === 'confirmed'
      ? 'TURNO CONFIRMADO'
      : booking.status === 'awaiting_approval'
      ? 'EN VERIFICACIÓN POR EL CLUB'
      : booking.status === 'cancelled'
      ? 'TURNO CANCELADO'
      : 'PENDIENTE DE PAGO';

  ctx.fillStyle =
    booking.status === 'confirmed'
      ? '#10B981'
      : booking.status === 'cancelled'
      ? '#F43F5E'
      : '#F59E0B';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(statusLabel, pad + 44, pad + 114);

  // Código grande
  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 52px monospace';
  ctx.fillText(`#${booking.bookingCode}`, pad + 44, pad + 186);

  // Separador
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad + 44, pad + 220);
  ctx.lineTo(width - pad - 44, pad + 220);
  ctx.stroke();

  const rows: Array<{ label: string; value: string; highlight?: string }> = [
    { label: 'Complejo', value: complexName || booking.establishment || 'Complejo Deportivo PMY' },
    { label: 'Cancha', value: booking.courtName },
    { label: 'Fecha y horario', value: `${booking.date} · ${booking.startTime} a ${booking.endTime} hs` },
    { label: 'Duración', value: '60 minutos (1 hora)' },
    { label: 'Titular', value: booking.clientName },
    { label: 'WhatsApp', value: booking.clientPhone || '-' },
    { label: 'Medio de pago', value: booking.paymentMethod.toUpperCase() },
    { label: 'Referencia / Op.', value: booking.paymentReference || `#${booking.bookingCode}` },
    { label: 'Valor total', value: `$${booking.totalAmount.toLocaleString('es-AR')}` },
    {
      label: 'Importe abonado',
      value: `$${booking.amountPaid.toLocaleString('es-AR')}`,
      highlight: '#C8FF32',
    },
    {
      label: 'Saldo en cancha',
      value:
        booking.balanceDue > 0
          ? `$${booking.balanceDue.toLocaleString('es-AR')}`
          : 'Saldado 100%',
      highlight: booking.balanceDue > 0 ? '#FBBF24' : '#34D399',
    },
  ];

  let y = pad + 278;
  rows.forEach((row) => {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 22px sans-serif';
    ctx.fillText(row.label, pad + 44, y);

    ctx.fillStyle = row.highlight || '#F8FAFC';
    ctx.font = 'bold 23px sans-serif';
    const textWidth = ctx.measureText(row.value).width;
    ctx.fillText(row.value, width - pad - 44 - textWidth, y);

    y += 58;
  });

  // Pie informativo
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.beginPath();
  ctx.moveTo(pad + 44, height - pad - 110);
  ctx.lineTo(width - pad - 44, height - pad - 110);
  ctx.stroke();

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 18px sans-serif';
  ctx.fillText(
    'Presentá este comprobante o tu código en recepción 10 minutos antes del partido.',
    pad + 44,
    height - pad - 66
  );

  ctx.fillStyle = '#64748B';
  ctx.font = '16px monospace';
  ctx.fillText(
    `Emitido: ${new Date().toLocaleString('es-AR')} · deportespmy.com.ar`,
    pad + 44,
    height - pad - 34
  );

  const link = document.createElement('a');
  link.download = `comprobante-${booking.bookingCode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: boolean,
  stroke: boolean
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
