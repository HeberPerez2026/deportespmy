export interface MetaWhatsAppTemplateSpec {
  id: 'booking_confirmed' | 'booking_approved' | 'booking_cancelled' | 'missing_players' | 'tournament_created';
  title: string;
  metaName: string;
  envVar: string;
  category: 'UTILITY' | 'MARKETING';
  language: string;
  description: string;
  body: string;
  variables: Array<{
    index: number;
    label: string;
    example: string;
  }>;
}

export const META_WHATSAPP_TEMPLATES: MetaWhatsAppTemplateSpec[] = [
  {
    id: 'booking_confirmed',
    title: 'Confirmación de Reserva',
    metaName: 'reserva_confirmada_pmy',
    envVar: 'WHATSAPP_TEMPLATE_BOOKING_CONFIRMED',
    category: 'UTILITY',
    language: 'es_AR',
    description: 'Se envía automáticamente al confirmar una reserva directa o con pago acreditado por Mercado Pago.',
    body: [
      '¡Hola {{1}}! Tu reserva en *{{2}}* está confirmada.',
      '',
      'Cancha: {{3}}',
      'Fecha y hora: {{4}}',
      'Código: {{5}}',
      'Pago: {{6}}',
      '',
      'Te esperamos 10 minutos antes.',
    ].join('\n'),
    variables: [
      { index: 1, label: 'Nombre del jugador', example: 'Lucas Fernández' },
      { index: 2, label: 'Nombre del complejo', example: 'Complejo Sur Pádel' },
      { index: 3, label: 'Cancha', example: 'Cancha 1' },
      { index: 4, label: 'Fecha y horario', example: '2026-11-20 20:00 hs' },
      { index: 5, label: 'Código de reserva', example: '#PMY-4821' },
      { index: 6, label: 'Resumen de pago', example: 'Abonado $15.000 · Saldo en cancha $15.000' },
    ],
  },
  {
    id: 'booking_approved',
    title: 'Aprobación de Turno',
    metaName: 'turno_aprobado_pmy',
    envVar: 'WHATSAPP_TEMPLATE_BOOKING_APPROVED',
    category: 'UTILITY',
    language: 'es_AR',
    description: 'Se envía automáticamente cuando el administrador valida el comprobante de transferencia/CBU o pago pendiente.',
    body: [
      '¡Hola {{1}}! Validamos tu comprobante y tu turno en *{{2}}* quedó aprobado.',
      '',
      'Cancha: {{3}}',
      'Fecha y hora: {{4}}',
      'Código de reserva: {{5}}',
      'Estado del pago: {{6}}',
      '',
      'Presentate 10 minutos antes en recepción.',
    ].join('\n'),
    variables: [
      { index: 1, label: 'Nombre del jugador', example: 'María Gómez' },
      { index: 2, label: 'Nombre del complejo', example: 'Costa Fútbol PMY' },
      { index: 3, label: 'Cancha', example: 'Cancha F5 Norte' },
      { index: 4, label: 'Fecha y horario', example: '2026-11-21 21:00 hs' },
      { index: 5, label: 'Código de reserva', example: '#PMY-7390' },
      { index: 6, label: 'Estado del pago aprobado', example: 'Aprobado $12.000 · Saldo $12.000' },
    ],
  },
  {
    id: 'booking_cancelled',
    title: 'Cancelación de Turno',
    metaName: 'turno_cancelado_pmy',
    envVar: 'WHATSAPP_TEMPLATE_BOOKING_CANCELLED',
    category: 'UTILITY',
    language: 'es_AR',
    description: 'Se envía al cancelar un turno desde el panel o autogestión, informando el horario liberado y detalle de devolución.',
    body: [
      'Hola {{1}}, te informamos que tu turno {{2}} en *{{3}}* fue cancelado.',
      '',
      'Cancha y horario: {{4}}',
      'Detalle de devolución: {{5}}',
      '',
      'Podés volver a reservar cuando quieras en DeportesPMY.',
    ].join('\n'),
    variables: [
      { index: 1, label: 'Nombre del jugador', example: 'Martín Sosa' },
      { index: 2, label: 'Código de reserva', example: '#PMY-4821' },
      { index: 3, label: 'Nombre del complejo', example: 'Complejo Sur Pádel' },
      { index: 4, label: 'Cancha y horario', example: 'Cancha 1 · 2026-11-20 20:00 hs' },
      { index: 5, label: 'Detalle de reembolso', example: 'Devolución automática de $15.000 por Mercado Pago' },
    ],
  },
  {
    id: 'missing_players',
    title: 'Búsqueda de Jugadores Faltantes',
    metaName: 'jugadores_faltantes_pmy',
    envVar: 'WHATSAPP_TEMPLATE_MISSING_PLAYERS',
    category: 'MARKETING',
    language: 'es_AR',
    description: 'Se envía a jugadores disponibles o invitados para completar un partido cuando faltan lugares.',
    body: [
      '¡Hola {{1}}! Faltan {{2}} jugador(es) para completar un partido hoy en *{{3}}*.',
      '',
      'Fecha y hora: {{4}}',
      'Sumate directo desde este enlace: {{5}}',
    ].join('\n'),
    variables: [
      { index: 1, label: 'Nombre del jugador destinatario', example: 'Julián Pérez' },
      { index: 2, label: 'Cantidad que faltan', example: '2' },
      { index: 3, label: 'Complejo y cancha', example: 'Complejo Sur · Cancha 2' },
      { index: 4, label: 'Fecha y horario', example: '2026-11-20 20:00 hs' },
      { index: 5, label: 'Enlace directo para sumarse', example: 'https://deportespmy.com.ar/?join_booking=PMY-4821' },
    ],
  },
  {
    id: 'tournament_created',
    title: 'Nuevo Torneo Generado',
    metaName: 'nuevo_torneo_pmy',
    envVar: 'WHATSAPP_TEMPLATE_TOURNAMENT_CREATED',
    category: 'MARKETING',
    language: 'es_AR',
    description: 'Se envía cuando el administrador crea un nuevo torneo abierto para difundir inscripciones.',
    body: [
      '¡Hola {{1}}! Se abrió un nuevo torneo en *{{2}}*: *{{3}}*.',
      '',
      'Deporte: {{4}}',
      'Fecha y horario: {{5}}',
      'Inscripción: {{6}}',
      'Inscribí a tu equipo acá: {{7}}',
    ].join('\n'),
    variables: [
      { index: 1, label: 'Nombre del jugador', example: 'Diego Álvarez' },
      { index: 2, label: 'Nombre del complejo', example: 'Complejo Sur Pádel' },
      { index: 3, label: 'Título del torneo', example: 'Torneo Relámpago 6ta Categoría' },
      { index: 4, label: 'Deporte', example: 'Pádel' },
      { index: 5, label: 'Fecha y horario', example: '2026-11-28 · 16:00 hs' },
      { index: 6, label: 'Valor de inscripción', example: '$40.000 por equipo' },
      { index: 7, label: 'Enlace a Torneos', example: 'https://deportespmy.com.ar/?tab=torneos' },
    ],
  },
];
