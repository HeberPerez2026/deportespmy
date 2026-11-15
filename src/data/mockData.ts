import { Court, Booking, Review, MonthlyStats, WhatsAppNotificationLog, BusinessProfile, AdminUser, DeveloperContact } from '../types';

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
  transferPaused: false
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
  transferPaused: false
};

// Default Developer Contact for footer, editable by SuperAdmin
export const DEFAULT_DEVELOPER_CONTACT: DeveloperContact = {
  developerName: 'Estudio de Desarrollo Web',
  roleTitle: 'Desarrollo de Software & Soporte Técnico',
  whatsappNumber: '+54 9 280 412-3456',
  email: 'soporte@deportespmy.com.ar',
  websiteUrl: 'https://deportespmy.com.ar'
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
