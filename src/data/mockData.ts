import { Court, Booking, Review, MonthlyStats, WhatsAppNotificationLog, BusinessProfile, AdminUser, DeveloperContact, SiteContent, FilterTag } from '../types';

// Helper to get formatted date string: YYYY-MM-DD
export function getIsoDate(daysFromToday = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

// Clean starting state requested by user: empty database so administrators configure their own courts & bookings from 0
export const INITIAL_COURTS: Court[] = [];

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_REVIEWS: Review[] = [];

export const INITIAL_WHATSAPP_LOGS: WhatsAppNotificationLog[] = [];

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  ownerName: '',
  complexName: '',
  cbu: '',
  alias: '',
  accountHolder: '',
  whatsappNumber: '',
  address: '',
  email: '',
  welcomeNotes: '',
  mpLink: '',
  mpAccessToken: '',
  mpRefreshToken: '',
  mpPublicKey: '',
  mpOAuthConnected: false,
  mpUserId: '',
  mpAccountEmail: '',
  mpAccountNickname: '',
  mpTokenExpiresAt: '',
  mpConnectedAt: '',
  whatsappTemplate: '',
  mpPaused: false,
  transferPaused: false,
  instagramUrl: '',
  facebookUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  socialFeedUrl: '',
  mapsUrl: '',
  cancellationWindowHours: 24,
  reminderHoursBefore: 2,
};

export const EMPTY_BUSINESS_PROFILE: BusinessProfile = {
  ownerName: '',
  complexName: '',
  cbu: '',
  alias: '',
  accountHolder: '',
  whatsappNumber: '',
  address: '',
  email: '',
  welcomeNotes: '',
  mpLink: '',
  mpAccessToken: '',
  mpRefreshToken: '',
  mpPublicKey: '',
  mpOAuthConnected: false,
  mpUserId: '',
  mpAccountEmail: '',
  mpAccountNickname: '',
  mpTokenExpiresAt: '',
  mpConnectedAt: '',
  whatsappTemplate: '',
  mpPaused: false,
  transferPaused: false,
  instagramUrl: '',
  facebookUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  socialFeedUrl: '',
  mapsUrl: '',
  cancellationWindowHours: 24,
  reminderHoursBefore: 2,
};

export const DEFAULT_FILTER_TAGS: FilterTag[] = [
  { id: 'futbol5', label: 'Fútbol 5', defaultSurface: 'Césped Sintético Forbex 50mm' },
  { id: 'futbol7', label: 'Fútbol 7', defaultSurface: 'Césped Sintético Monofilamento FIFA' },
  { id: 'padel', label: 'Pádel', defaultSurface: 'Césped Texturado Azul WPT + Vidrio 12mm' },
  { id: 'tenis', label: 'Tenis', defaultSurface: 'Polvo de Ladrillo Batido Tradicional' },
  { id: 'basquet', label: 'Básquet', defaultSurface: 'Piso Flotante de Madera Guatambú' },
  { id: 'pickleball', label: 'Pickleball', defaultSurface: 'Pintura Acrílica Cushion Coated' },
  { id: 'hockey', label: 'Hockey', defaultSurface: 'Césped Sintético de Arena' },
  { id: 'voley', label: 'Vóley', defaultSurface: 'Piso Deportivo Sintético Indoor' },
];

// Default Developer Contact for footer, editable by SuperAdmin
export const DEFAULT_DEVELOPER_CONTACT: DeveloperContact = {
  developerName: 'Estudio de Desarrollo Web',
  roleTitle: 'Desarrollo de Software & Soporte Técnico',
  whatsappNumber: '+54 9 280 412-3456',
  email: 'soporte@deportespmy.com.ar',
  websiteUrl: 'https://deportespmy.com.ar'
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  navTurnosLabel: 'Turnos',
  navComplejosLabel: 'Complejos',
  navOpinionesLabel: 'Opiniones',
  navTorneosLabel: 'Torneos',

  heroLocationEyebrow: 'Puerto Madryn, Chubut · Reservas Online · Turnos de 1 hora',
  heroTitle: 'Reservá tu cancha en Puerto Madryn',
  heroSubtitle: 'Consultá horarios disponibles en tiempo real, elegí seña 50% o pago total y recibí tu comprobante al instante por WhatsApp.',
  heroKpiCourtsLabel: 'Canchas activas',
  heroKpiComplexesLabel: 'Complejos',
  heroBadgeMpLabel: 'Mercado Pago & Transferencia',
  heroBadgeWaLabel: 'Confirmación WhatsApp',
  heroSearchPlaceholder: 'Buscar por cancha, establecimiento o superficie...',
  heroTodayLabel: 'Hoy',
  heroTomorrowLabel: 'Mañana',
  heroAllSportsLabel: 'Todos los deportes',

  catalogEyebrow: 'Complejos Habilitados',
  catalogTitlePrefix: 'Disponibilidad para el',
  catalogSubtitle: 'Seleccioná un horario libre para ver tarifas completas y confirmar tu reserva.',
  catalogLegendAvailable: 'Disponible',
  catalogLegendOccupied: 'Ocupado',
  catalogLegendNight: 'Tarifa nocturna c/luz',
  catalogEmptyTitle: 'Aún no hay canchas publicadas',
  catalogEmptySubtitle: 'Cuando los administradores carguen sus espacios deportivos, superficies y tarifas desde el panel, aparecerán listados aquí para reservar en tiempo real.',
  catalogEmptyButtonLabel: 'Acceso Clubes para publicar canchas',
  catalogNoResultsTitle: 'Sin resultados para tu búsqueda',
  catalogNoResultsSubtitle: 'Probá con otro término o seleccioná otra disciplina deportiva.',
  catalogNoResultsButtonLabel: 'Mostrar todas las canchas',
  catalogRateDayLabel: 'Tarifa diurna',
  catalogRateNightLabel: 'Nocturno c/luz',
  catalogDepositLabel: 'Seña reserva',
  catalogIncludesLabel: 'Incluye:',
  catalogSchedulesPrefix: 'Horarios',
  catalogFullScheduleLabel: 'Ver agenda completa',
  catalogCardFooterHint: 'Confirmación y comprobante vía WhatsApp',
  catalogReserveButtonLabel: 'Reservar',

  homeReviewsEyebrow: 'Comunidad deportiva · Puerto Madryn',
  homeReviewsEmptyHeading: 'Compartí tu opinión después del partido',
  homeReviewsSubtitle: 'Leé evaluaciones reales de jugadores sobre superficie, iluminación LED, vestuarios y puntualidad en cada complejo.',
  homeReviewsButtonLabel: 'Explorar opiniones',

  estEyebrow: 'Guía de clubes en Puerto Madryn',
  estTitle: 'Establecimientos y Centros Deportivos',
  estSubtitle: 'Ingresá a cada complejo para consultar exclusivamente sus canchas, fotos, ubicación y reseñas verificadas de jugadores.',
  estSearchPlaceholder: 'Buscar complejo por nombre o dirección...',
  estAllSportsLabel: 'Todos',
  estEmptyTitle: 'Aún no hay establecimientos registrados',
  estEmptySubtitle: 'Cuando los administradores configuren su complejo y publiquen canchas, aparecerán listados aquí para ingresar a cada sede.',
  estEnterButtonLabel: 'Ingresar',
  estBackToDirectoryLabel: 'Volver al directorio de complejos',
  estDetailBadgeLabel: 'Complejo deportivo habilitado',
  estCourtsTabLabel: 'Canchas y turnos',
  estReviewsTabLabel: 'Opiniones',
  estWhatsappButtonLabel: 'WhatsApp del complejo',
  estMinPriceLabel: 'Turnos desde',

  reviewsEyebrow: 'Comunidad DeportesPMY',
  reviewsDescription: 'Evaluaciones de jugadores sobre el estado de la cancha, iluminación, vestuarios y atención del complejo.',
  reviewsWriteButtonLabel: 'Dejar mi valoración',
  reviewsSurfaceLabel: 'Superficie y césped',
  reviewsLightingLabel: 'Iluminación nocturna',
  reviewsFacilitiesLabel: 'Vestuarios y duchas',
  reviewsServiceLabel: 'Atención y puntualidad',
  reviewsEmptyTitle: 'Aún no hay opiniones registradas',
  reviewsEmptySubtitle: 'Las valoraciones aparecerán aquí a medida que los jugadores compartan su experiencia.',
  reviewsModalTitle: 'Dejar opinión sobre la cancha',
  arcaQrCodeUrl: '',
  filterTags: DEFAULT_FILTER_TAGS,
};

// Initial system accounts: superadmin requested by user
export const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 'superadmin-heber',
    username: 'heberperez1984',
    fullName: 'Heber Perez (SuperAdmin)',
    email: 'heberperez1984@gmail.com',
    phone: '+5492804315171',
    password: 'matinconoahperez2026',
    role: 'superadmin',
    createdAt: new Date().toISOString(),
    isActive: true
  }
];

export const MONTHLY_STATS_DATA: Record<string, MonthlyStats> = {
  '2026-11': {
    month: '2026-11',
    monthLabel: 'Mes Actual',
    totalRevenue: 0,
    totalBookings: 0,
    totalHoursPlayed: 0,
    averageOccupancyRate: 0,
    sportBreakdown: [
      { sport: 'futbol5', sportName: 'Fútbol 5', bookingsCount: 0, revenue: 0, percentage: 0 },
      { sport: 'padel', sportName: 'Pádel', bookingsCount: 0, revenue: 0, percentage: 0 },
      { sport: 'futbol7', sportName: 'Fútbol 7', bookingsCount: 0, revenue: 0, percentage: 0 },
      { sport: 'tenis', sportName: 'Tenis', bookingsCount: 0, revenue: 0, percentage: 0 },
      { sport: 'basquet', sportName: 'Básquetbol', bookingsCount: 0, revenue: 0, percentage: 0 },
    ],
    peakHours: [],
    dailyRevenue: [],
    topClients: [],
  }
};
