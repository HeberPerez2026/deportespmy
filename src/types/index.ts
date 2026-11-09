export type SportType = 'futbol5' | 'futbol7' | 'padel' | 'tenis' | 'basquet';

export interface Court {
  id: string;
  name: string;
  sport: SportType;
  surface: string; // e.g., 'Sintético Forbex 50mm', 'Cristal Panorámico WPT', 'Polvo de ladrillo'
  isIndoor: boolean;
  hasLighting: boolean;
  hourlyRateDay: number; // Precio día (ARS)
  hourlyRateNight: number; // Precio noche con luz (ARS)
  depositRequired: number; // % de seña, ej: 50%
  imageUrl: string;
  amenities: string[];
  description: string;
  status: 'active' | 'maintenance';
  rating: number;
  reviewCount: number;
}

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'pending';

export interface TimeSlot {
  id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // '18:00'
  endTime: string; // '19:00' or '19:30'
  price: number;
  status: SlotStatus;
  bookingId?: string;
  blockedReason?: string;
}

export type PaymentMethod = 'mercadopago' | 'tarjeta' | 'transferencia' | 'efectivo_mostrador';
export type PaymentStatus = 'seña_pagada' | 'total_pagado' | 'pendiente_mostrador' | 'reembolsado';

export interface Booking {
  id: string;
  bookingCode: string; // e.g. PMY-7482
  courtId: string;
  courtName: string;
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
  paymentReference?: string;
  
  // Status
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  
  // WhatsApp notification
  whatsappSent: boolean;
  whatsappSentAt?: string;
}

export interface Review {
  id: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  userName: string;
  userPhone: string; // Obfuscated or verified
  rating: number; // 1 to 5
  scores: {
    surface: number; // 1-5
    lighting: number; // 1-5
    facilities: number; // 1-5
    service: number; // 1-5
  };
  comment: string;
  date: string;
  verifiedBookingCode?: string;
  adminReply?: {
    text: string;
    date: string;
  };
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
}

export interface WhatsAppNotificationLog {
  id: string;
  bookingCode: string;
  recipientName: string;
  recipientPhone: string;
  messagePreview: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read';
}
