export type SportType = string;

export interface FilterTag {
  id: string;
  label: string;
  defaultSurface: string;
}

export interface Court {
  id: string;
  name: string;
  establishment?: string; // Nombre del complejo / club / establecimiento deportivo
  sport: SportType;
  surface: string; // e.g., 'Sintético Forbex 50mm', 'Cristal Panorámico WPT', 'Polvo de ladrillo'
  isIndoor: boolean;
  hasLighting: boolean;
  hourlyRateDay: number; // Precio día (ARS)
  hourlyRateNight: number; // Precio noche con luz (ARS)
  hora_inicio?: string; // Hora apertura operativa 'HH:00' (ej: '09:00', default '09:00')
  hora_fin?: string; // Hora último turno 'HH:00' (ej: '23:00', '00:00', default '23:00')
  openHour?: number; // Hora primer turno entero (6..22, derivado/sincronizado con hora_inicio)
  closeHour?: number; // Hora último turno entero (7..25 donde 24=00:00 y 25=01:00, derivado/sincronizado con hora_fin)
  nightStartHour?: number; // Inicio tarifa nocturna (15..23, default 18)
  depositRequired: number; // % de seña, ej: 50%
  imageUrl: string;
  images?: string[];
  amenities: string[];
  description: string;
  status: 'active' | 'maintenance';
  rating: number;
  reviewCount: number;
  adminId?: string;
}

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'pending';

export interface TimeSlot {
  id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // '18:00'
  endTime: string; // '19:00'
  price: number;
  status: SlotStatus;
  bookingId?: string;
  blockedReason?: string;
  missingPlayersCount?: number;
}

export type PaymentMethod = 'mercadopago' | 'tarjeta' | 'transferencia' | 'efectivo_mostrador';
export type PaymentStatus = 'seña_pagada' | 'total_pagado' | 'pendiente_mostrador' | 'reembolsado';

export interface JoinedPlayer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  pushDeviceId?: string;
  joinedAt: string;
  paid?: boolean;
  paidAmount?: number;
  paidAt?: string;
}

export interface AvailablePlayer {
  id: string;
  name: string;
  phone: string;
  preferredSports: SportType[];
  timePreference?: string;
  notes?: string;
  date: string; // YYYY-MM-DD (local date)
  expiresAt: string; // ISO string at 23:59:59.999 of that local day
  createdAt: string;
  pushDeviceId?: string;
}

export interface Booking {
  id: string;
  bookingCode: string; // e.g. PMY-7482
  courtId: string;
  courtName: string;
  establishment?: string;
  sport: SportType;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  durationMinutes: number;
  
  // Client details
  clientName: string;
  clientPhone: string; // WhatsApp number
  clientEmail: string;
  notes?: string;

  // Financial details
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  isDepositOnly: boolean;
  paymentReference?: string;
  
  // Status
  status: 'confirmed' | 'cancelled' | 'completed' | 'pending_payment' | 'awaiting_approval';
  createdAt: string;
  
  // WhatsApp notification
  whatsappSent: boolean;
  whatsappSentAt?: string;
  adminId?: string;
  receiptUrl?: string; // Base64 or Image URL of the payment receipt
  refundAmount?: number;
  refundedAt?: string;
  refundReference?: string;
  pushDeviceId?: string;

  // Matchmaking / Missing players fields
  lookingForPlayers?: boolean;
  neededPlayers?: number;
  lookingForPlayersMessage?: string;
  lookingForPlayersUpdatedAt?: string;
  joinedPlayers?: JoinedPlayer[];

  // Split payment across players
  totalPlayers?: number;
  perPlayerAmount?: number;

  // Weekly recurring bookings (Turnos fijos / abonos)
  recurringGroupId?: string;
  recurringIndex?: number;
  recurringTotal?: number;

  // Self-service rescheduling metadata
  rescheduledFrom?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  rescheduledAt?: string;

  // Pre-match automated Web Push reminder marker
  reminderSentAt?: string;
}

export interface Review {
  id: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  userName: string;
  userPhone: string;
  rating: number; // 1 to 5
  scores: {
    surface: number; // 1-5
    lighting: number; // 1-5
    facilities: number; // 1-5
    service: number; // 1-5
  };
  comment: string;
  date: string;
  photos?: string[];
  verifiedBookingCode?: string;
  adminId?: string;
  adminReply?: {
    text: string;
    date: string;
  };
}

export interface BusinessProfile {
  ownerName: string;
  complexName: string;
  cbu: string;
  alias: string;
  accountHolder: string;
  whatsappNumber: string;
  address: string;
  email: string;
  welcomeNotes?: string;
  mpLink?: string;
  mpAccessToken?: string;
  mpRefreshToken?: string;
  mpPublicKey?: string;
  mpOAuthConnected?: boolean;
  mpUserId?: string;
  mpAccountEmail?: string;
  mpAccountNickname?: string;
  mpTokenExpiresAt?: string;
  mpConnectedAt?: string;
  whatsappTemplate?: string;
  mpPaused?: boolean;
  transferPaused?: boolean;
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  socialFeedUrl?: string;
  mapsUrl?: string;
  latitude?: number;
  longitude?: number;
  cancellationWindowHours?: number;
  reminderHoursBefore?: number;
}

export interface DeveloperContact {
  developerName: string;
  roleTitle: string;
  whatsappNumber: string;
  email: string;
  websiteUrl: string;
}

export interface SiteContent {
  // Navegación principal (vista de jugador)
  navTurnosLabel: string;
  navComplejosLabel: string;
  navOpinionesLabel: string;
  navTorneosLabel?: string;
  arcaQrCodeUrl?: string;

  // Portada / Hero
  heroLocationEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroKpiCourtsLabel: string;
  heroKpiComplexesLabel: string;
  heroBadgeMpLabel: string;
  heroBadgeWaLabel: string;
  heroSearchPlaceholder: string;
  heroTodayLabel: string;
  heroTomorrowLabel: string;
  heroAllSportsLabel: string;

  // Catálogo de canchas y turnos
  catalogEyebrow: string;
  catalogTitlePrefix: string;
  catalogSubtitle: string;
  catalogLegendAvailable: string;
  catalogLegendOccupied: string;
  catalogLegendNight: string;
  catalogEmptyTitle: string;
  catalogEmptySubtitle: string;
  catalogEmptyButtonLabel: string;
  catalogNoResultsTitle: string;
  catalogNoResultsSubtitle: string;
  catalogNoResultsButtonLabel: string;
  catalogRateDayLabel: string;
  catalogRateNightLabel: string;
  catalogDepositLabel: string;
  catalogIncludesLabel: string;
  catalogSchedulesPrefix: string;
  catalogFullScheduleLabel: string;
  catalogCardFooterHint: string;
  catalogReserveButtonLabel: string;

  // Banda de opiniones en inicio
  homeReviewsEyebrow: string;
  homeReviewsEmptyHeading: string;
  homeReviewsSubtitle: string;
  homeReviewsButtonLabel: string;

  // Directorio y ficha de complejos
  estEyebrow: string;
  estTitle: string;
  estSubtitle: string;
  estSearchPlaceholder: string;
  estAllSportsLabel: string;
  estEmptyTitle: string;
  estEmptySubtitle: string;
  estEnterButtonLabel: string;
  estBackToDirectoryLabel: string;
  estDetailBadgeLabel: string;
  estCourtsTabLabel: string;
  estReviewsTabLabel: string;
  estWhatsappButtonLabel: string;
  estMinPriceLabel: string;

  // Sección de opiniones
  reviewsEyebrow: string;
  reviewsDescription: string;
  reviewsWriteButtonLabel: string;
  reviewsSurfaceLabel: string;
  reviewsLightingLabel: string;
  reviewsFacilitiesLabel: string;
  reviewsServiceLabel: string;
  reviewsEmptyTitle: string;
  reviewsEmptySubtitle: string;
  reviewsModalTitle: string;
  filterTags: FilterTag[];
}

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'superadmin' | 'admin';
  assignedComplex?: string;
  createdAt: string;
  isActive: boolean;
}

export interface MonthlyStats {
  month: string; // '2026-11'
  monthLabel: string; // 'Noviembre 2026'
  totalRevenue: number;
  totalBookings: number;
  totalHoursPlayed: number;
  averageOccupancyRate: number; // %
  sportBreakdown: {
    sport: SportType;
    sportName: string;
    bookingsCount: number;
    revenue: number;
    percentage: number;
  }[];
  peakHours: {
    hour: string;
    bookingsCount: number;
  }[];
  dailyRevenue: {
    day: number;
    revenue: number;
    bookings: number;
  }[];
  topClients: {
    name: string;
    phone: string;
    bookingsCount: number;
    totalSpent: number;
  }[];
  tournamentRevenue?: number;
  tournamentTeamsPaid?: number;
}

export interface WhatsAppNotificationLog {
  id: string;
  bookingCode: string;
  recipientName: string;
  recipientPhone: string;
  messagePreview: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  adminId?: string;
  courtId?: string;
  channel?: 'cloud_api';
  eventType?: 'booking_confirmed' | 'booking_approved' | 'booking_cancelled' | 'missing_players' | 'player_joined' | 'tournament_created' | 'manual_resend';
  messageId?: string;
  errorMessage?: string;
}

export type BookingPushEventType =
  | 'booking_created'
  | 'receipt_submitted'
  | 'payment_confirmed'
  | 'balance_paid'
  | 'booking_cancelled'
  | 'admin_reminder'
  | 'admin_broadcast'
  | 'pre_match_reminder'
  | 'looking_for_players'
  | 'player_joined_match'
  | 'player_invite_match';

export interface TournamentTeam {
  id: string;
  teamName: string;
  captainName: string;
  captainPhone: string;
  playersCount?: number;
  notes?: string;
  registeredAt: string;
  paid?: boolean;
  bookingCode?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: 'pending' | 'awaiting_approval' | 'paid' | 'refunded';
  paymentReference?: string;
  amountPaid?: number;
  receiptUrl?: string;
  refunded?: boolean;
  refundAmount?: number;
  refundedAt?: string;
  refundId?: string;
  adminId?: string;
}

export interface Tournament {
  id: string;
  title: string;
  sport: SportType;
  establishment?: string;
  adminId?: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD opcional
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  courtIds: string[];
  blockCourts: boolean;
  maxTeams: number;
  entryFee: number;
  prizeDescription?: string;
  description?: string;
  format?: string;
  status: 'open' | 'full' | 'ongoing' | 'finished' | 'cancelled';
  teams: TournamentTeam[];
  createdAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  bookingCodes: string[];
  clientPhone?: string;
  clientName?: string;
  enabled: boolean;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}
