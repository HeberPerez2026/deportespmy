import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Court, 
  Booking, 
  Review, 
  TimeSlot, 
  SlotStatus,
  SportType, 
  MonthlyStats, 
  WhatsAppNotificationLog,
  PaymentMethod,
  PaymentStatus 
} from '../types';
import { 
  INITIAL_COURTS, 
  INITIAL_BOOKINGS, 
  INITIAL_REVIEWS, 
  INITIAL_WHATSAPP_LOGS, 
  MONTHLY_STATS_DATA, 
  getIsoDate 
} from '../data/mockData';

interface BookingInput {
  courtId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes?: string;
  totalAmount: number;
  isDepositOnly: boolean;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
}

interface AppContextType {
  courts: Court[];
  bookings: Booking[];
  reviews: Review[];
  whatsappLogs: WhatsAppNotificationLog[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedSport: SportType | 'all';
  setSelectedSport: (sport: SportType | 'all') => void;
  currentRole: 'client' | 'admin';
  setCurrentRole: (role: 'client' | 'admin') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  androidViewMode: 'none' | 'player_app' | 'admin_app';
  setAndroidViewMode: (mode: 'none' | 'player_app' | 'admin_app') => void;
  
  // User profile storage
  userPhone: string;
  setUserPhone: (phone: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;

  // Real-time synchronization indicator
  isSyncing: boolean;
  lastSyncTime: Date;

  // Actions
  createBooking: (input: BookingInput) => Booking;
  cancelBooking: (bookingId: string) => void;
  collectBalanceAtCourt: (bookingId: string) => void;
  blockTimeSlot: (courtId: string, date: string, startTime: string, durationMinutes: number, reason: string) => void;
  unblockTimeSlot: (bookingId: string) => void;
  createManualAdminBooking: (input: BookingInput) => Booking;
  addReview: (review: Omit<Review, 'id' | 'date'>) => void;
  replyToReview: (reviewId: string, replyText: string) => void;
  updateCourt: (updatedCourt: Court) => void;
  
  // Slots & Stats helpers
  getSlotsForCourtAndDate: (courtId: string, date: string) => TimeSlot[];
  getMonthlyStats: (monthKey: string) => MonthlyStats;
  
  // WhatsApp notification tools
  generateWhatsAppMessage: (booking: Booking) => string;
  getWhatsAppShareUrl: (booking: Booking) => string;
  triggerWhatsAppSend: (booking: Booking) => void;
  
  // DB tools
  exportDatabaseJson: () => string;
  importDatabaseJson: (json: string) => boolean;
  resetDatabase: () => void;
}

const STORAGE_KEYS = {
  COURTS: 'deportespmy_courts_v1',
  BOOKINGS: 'deportespmy_bookings_v1',
  REVIEWS: 'deportespmy_reviews_v1',
  WHATSAPP: 'deportespmy_whatsapp_v1',
  USER_PHONE: 'deportespmy_user_phone',
  USER_NAME: 'deportespmy_user_name',
  USER_EMAIL: 'deportespmy_user_email',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Courts State
  const [courts, setCourts] = useState<Court[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURTS);
      return saved ? JSON.parse(saved) : INITIAL_COURTS;
    } catch {
      return INITIAL_COURTS;
    }
  });

  // Bookings State
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  // Reviews State
  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
      return saved ? JSON.parse(saved) : INITIAL_REVIEWS;
    } catch {
      return INITIAL_REVIEWS;
    }
  });

  // WhatsApp Logs State
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppNotificationLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WHATSAPP);
      return saved ? JSON.parse(saved) : INITIAL_WHATSAPP_LOGS;
    } catch {
      return INITIAL_WHATSAPP_LOGS;
    }
  });

  // Navigation and Filter States
  const [selectedDate, setSelectedDate] = useState<string>(getIsoDate(0));
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [currentRole, setCurrentRole] = useState<'client' | 'admin'>('client');
  const [activeTab, setActiveTab] = useState<string>('turnos');
  const [androidViewMode, setAndroidViewMode] = useState<'none' | 'player_app' | 'admin_app'>('none');

  // Customer stored credentials
  const [userPhone, setUserPhoneState] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.USER_PHONE) || '+5492804567890');
  const [userName, setUserNameState] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Gonzalo Morales');
  const [userEmail, setUserEmailState] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || 'gonza.morales@gmail.com');

  const setUserPhone = (phone: string) => {
    setUserPhoneState(phone);
    localStorage.setItem(STORAGE_KEYS.USER_PHONE, phone);
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem(STORAGE_KEYS.USER_NAME, name);
  };

  const setUserEmail = (email: string) => {
    setUserEmailState(email);
    localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
  };

  // Sync indicator
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  const triggerSyncFlash = useCallback(() => {
    setIsSyncing(true);
    setLastSyncTime(new Date());
    setTimeout(() => setIsSyncing(false), 800);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
      triggerSyncFlash();
    } catch (e) {
      console.error(e);
    }
  }, [courts, triggerSyncFlash]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      triggerSyncFlash();
    } catch (e) {
      console.error(e);
    }
  }, [bookings, triggerSyncFlash]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
      triggerSyncFlash();
    } catch (e) {
      console.error(e);
    }
  }, [reviews, triggerSyncFlash]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(whatsappLogs));
    } catch (e) {
      console.error(e);
    }
  }, [whatsappLogs]);

  // Helper to calculate end time string
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // Generate WhatsApp Message template
  const generateWhatsAppMessage = useCallback((booking: Booking): string => {
    const isSeña = booking.paymentStatus === 'seña_pagada';
    const court = courts.find(c => c.id === booking.courtId);
    const sportEmoji = {
      futbol5: '⚽',
      futbol7: '⚽',
      padel: '🎾',
      tenis: '🎾',
      basquet: '🏀'
    }[booking.sport] || '🏆';

    return `*¡Hola ${booking.clientName}!* 👋\n\n` +
      `Tu turno en *DeportesPMY* está *CONFIRMADO* con éxito. Aquí tenés los detalles:\n\n` +
      `${sportEmoji} *Cancha:* ${booking.courtName}\n` +
      `📅 *Fecha:* ${booking.date}\n` +
      `⏰ *Horario:* ${booking.startTime} a ${booking.endTime} hs (${booking.durationMinutes} min)\n` +
      `🎟️ *Código de Turno:* #${booking.bookingCode}\n\n` +
      `💰 *Total de Cancha:* $${booking.totalAmount.toLocaleString('es-AR')}\n` +
      `💳 *Abonado Online:* $${booking.amountPaid.toLocaleString('es-AR')} (${booking.paymentMethod.toUpperCase()})\n` +
      (isSeña 
        ? `⚠️ *Saldo restante a abonar en mostrador:* $${booking.balanceDue.toLocaleString('es-AR')}\n\n` 
        : `✅ *Estado del pago:* 100% CANCELADO\n\n`) +
      `📍 *Ubicación:* Boulevard Brown 1420 (Frente al mar), Puerto Madryn, Chubut.\n` +
      `📱 *Tu QR de Acceso:* https://deportespmy.com.ar/ticket/${booking.bookingCode}\n\n` +
      `_Por favor presentate 10 minutos antes del turno. ¡Que disfrutes el partido!_ 🔥`;
  }, [courts]);

  const getWhatsAppShareUrl = useCallback((booking: Booking): string => {
    const cleanPhone = booking.clientPhone.replace(/\D/g, '');
    const message = generateWhatsAppMessage(booking);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }, [generateWhatsAppMessage]);

  const triggerWhatsAppSend = useCallback((booking: Booking) => {
    const cleanPhone = booking.clientPhone.replace(/\D/g, '');
    const preview = generateWhatsAppMessage(booking);
    
    // Add to WhatsApp notifications log
    const newLog: WhatsAppNotificationLog = {
      id: `wa-${Date.now()}`,
      bookingCode: booking.bookingCode,
      recipientName: booking.clientName,
      recipientPhone: booking.clientPhone,
      messagePreview: preview.slice(0, 160) + '...',
      sentAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'delivered'
    };
    setWhatsappLogs(prev => [newLog, ...prev]);

    // Update booking whatsappSent
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, whatsappSent: true, whatsappSentAt: new Date().toISOString() } : b));

    // Open WhatsApp Web/App in new tab or popup
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(preview)}`;
    window.open(url, '_blank');
  }, [generateWhatsAppMessage]);

  // Create booking
  const createBooking = useCallback((input: BookingInput): Booking => {
    const court = courts.find(c => c.id === input.courtId);
    if (!court) throw new Error('Cancha no encontrada');

    const amountPaid = input.isDepositOnly ? Math.round(input.totalAmount * 0.5) : input.totalAmount;
    const balanceDue = input.totalAmount - amountPaid;
    const paymentStatus: PaymentStatus = input.isDepositOnly ? 'seña_pagada' : 'total_pagado';
    const bookingCode = `PMY-${Math.floor(1000 + Math.random() * 9000)}`;
    const endTime = calculateEndTime(input.startTime, input.durationMinutes);

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingCode,
      courtId: input.courtId,
      courtName: court.name,
      sport: court.sport,
      date: input.date,
      startTime: input.startTime,
      endTime,
      durationMinutes: input.durationMinutes,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      notes: input.notes,
      totalAmount: input.totalAmount,
      amountPaid,
      balanceDue,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      paymentReference: input.paymentReference || `MP-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      whatsappSent: true,
      whatsappSentAt: new Date().toISOString(),
    };

    setBookings(prev => [newBooking, ...prev]);

    // Save client info to state for future convenience
    setUserPhone(input.clientPhone);
    setUserName(input.clientName);
    setUserEmail(input.clientEmail);

    // Auto record WhatsApp log
    const log: WhatsAppNotificationLog = {
      id: `wa-${Date.now()}`,
      bookingCode,
      recipientName: input.clientName,
      recipientPhone: input.clientPhone,
      messagePreview: `¡Hola ${input.clientName}! Tu turno en ${court.name} está CONFIRMADO para el ${input.date} a las ${input.startTime} hs. Total: $${input.totalAmount.toLocaleString('es-AR')}.`,
      sentAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'delivered',
    };
    setWhatsappLogs(prev => [log, ...prev]);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore if in test env
    }

    return newBooking;
  }, [courts]);

  // Admin Manual Booking
  const createManualAdminBooking = useCallback((input: BookingInput): Booking => {
    return createBooking(input);
  }, [createBooking]);

  // Cancel booking
  const cancelBooking = useCallback((bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'cancelled',
          paymentStatus: 'reembolsado'
        };
      }
      return b;
    }));
  }, []);

  // Collect balance at court
  const collectBalanceAtCourt = useCallback((bookingId: string) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          amountPaid: b.totalAmount,
          balanceDue: 0,
          paymentStatus: 'total_pagado'
        };
      }
      return b;
    }));
  }, []);

  // Block a slot (maintenance, private tournament, school)
  const blockTimeSlot = useCallback((courtId: string, date: string, startTime: string, durationMinutes: number, reason: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const endTime = calculateEndTime(startTime, durationMinutes);
    const blockedBooking: Booking = {
      id: `block-${Date.now()}`,
      bookingCode: `BLOQ-${Math.floor(100 + Math.random() * 900)}`,
      courtId,
      courtName: court.name,
      sport: court.sport,
      date,
      startTime,
      endTime,
      durationMinutes,
      clientName: `[BLOQUEADO: ${reason}]`,
      clientPhone: '+5492800000000',
      clientEmail: 'admin@deportespmy.com.ar',
      notes: reason,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      paymentMethod: 'efectivo_mostrador',
      paymentStatus: 'total_pagado',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      whatsappSent: false,
    };

    setBookings(prev => [blockedBooking, ...prev]);
  }, [courts]);

  // Unblock slot
  const unblockTimeSlot = useCallback((bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  }, []);

  // Add review
  const addReview = useCallback((newReviewData: Omit<Review, 'id' | 'date'>) => {
    const reviewId = `rev-${Date.now()}`;
    const newRev: Review = {
      ...newReviewData,
      id: reviewId,
      date: getIsoDate(0),
    };
    setReviews(prev => [newRev, ...prev]);

    // Recalculate court rating
    setCourts(prev => prev.map(c => {
      if (c.id === newReviewData.courtId) {
        const courtReviews = [...reviews.filter(r => r.courtId === c.id), newRev];
        const avg = courtReviews.reduce((sum, r) => sum + r.rating, 0) / courtReviews.length;
        return {
          ...c,
          rating: Number(avg.toFixed(1)),
          reviewCount: courtReviews.length
        };
      }
      return c;
    }));
  }, [reviews]);

  // Admin replies to review
  const replyToReview = useCallback((reviewId: string, replyText: string) => {
    setReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          adminReply: {
            text: replyText,
            date: getIsoDate(0)
          }
        };
      }
      return r;
    }));
  }, []);

  // Update court settings
  const updateCourt = useCallback((updatedCourt: Court) => {
    setCourts(prev => prev.map(c => c.id === updatedCourt.id ? updatedCourt : c));
  }, []);

  // Generate Slots for a Court on a specific Date
  const getSlotsForCourtAndDate = useCallback((courtId: string, date: string): TimeSlot[] => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return [];

    // Standard hours from 09:00 to 23:00
    // Step is 60 or 90 minutes. For padel/tenis standard is 90 mins or 60 mins. Let's provide hourly slots:
    const hours = [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
    ];

    const activeBookings = bookings.filter(b => b.courtId === courtId && b.date === date && b.status === 'confirmed');

    return hours.map((hour) => {
      const hourNum = parseInt(hour.split(':')[0], 10);
      const isNight = hourNum >= 18;
      const price = isNight ? court.hourlyRateNight : court.hourlyRateDay;
      const endTime = `${(hourNum + 1).toString().padStart(2, '0')}:00`;

      // Check if slot overlaps with any active booking
      const matchingBooking = activeBookings.find(b => {
        const bStartHour = parseInt(b.startTime.split(':')[0], 10);
        const bEndHour = parseInt(b.endTime.split(':')[0], 10);
        return hourNum >= bStartHour && hourNum < bEndHour;
      });

      let status: SlotStatus = 'available';
      let blockedReason: string | undefined = undefined;

      if (matchingBooking) {
        if (matchingBooking.clientName.startsWith('[BLOQUEADO')) {
          status = 'blocked';
          blockedReason = matchingBooking.notes;
        } else {
          status = 'booked';
        }
      }

      return {
        id: `${courtId}-${date}-${hour}`,
        courtId,
        date,
        startTime: hour,
        endTime,
        price,
        status,
        bookingId: matchingBooking?.id,
        blockedReason,
      };
    });
  }, [courts, bookings]);

  // Compute Dynamic Monthly Stats
  const getMonthlyStats = useCallback((monthKey: string): MonthlyStats => {
    const base = MONTHLY_STATS_DATA[monthKey] || MONTHLY_STATS_DATA['2026-11'];
    
    // Filter bookings for this month
    const monthBookings = bookings.filter(b => b.date.startsWith(monthKey) && b.status === 'confirmed' && !b.clientName.startsWith('[BLOQUEADO'));
    
    const extraRevenue = monthBookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalBookingsCount = Math.max(monthBookings.length, base.totalBookings);
    const totalRev = Math.max(extraRevenue, base.totalRevenue);

    return {
      ...base,
      totalRevenue: totalRev,
      totalBookings: totalBookingsCount,
    };
  }, [bookings]);

  // Export / Import / Reset Database
  const exportDatabaseJson = useCallback((): string => {
    const payload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      courts,
      bookings,
      reviews,
      whatsappLogs,
    };
    return JSON.stringify(payload, null, 2);
  }, [courts, bookings, reviews, whatsappLogs]);

  const importDatabaseJson = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.courts)) setCourts(data.courts);
      if (Array.isArray(data.bookings)) setBookings(data.bookings);
      if (Array.isArray(data.reviews)) setReviews(data.reviews);
      if (Array.isArray(data.whatsappLogs)) setWhatsappLogs(data.whatsappLogs);
      triggerSyncFlash();
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }, [triggerSyncFlash]);

  const resetDatabase = useCallback(() => {
    setCourts(INITIAL_COURTS);
    setBookings(INITIAL_BOOKINGS);
    setReviews(INITIAL_REVIEWS);
    setWhatsappLogs(INITIAL_WHATSAPP_LOGS);
    localStorage.removeItem(STORAGE_KEYS.COURTS);
    localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.WHATSAPP);
    triggerSyncFlash();
  }, [triggerSyncFlash]);

  const value = useMemo(() => ({
    courts,
    bookings,
    reviews,
    whatsappLogs,
    selectedDate,
    setSelectedDate,
    selectedSport,
    setSelectedSport,
    currentRole,
    setCurrentRole,
    activeTab,
    setActiveTab,
    androidViewMode,
    setAndroidViewMode,
    userPhone,
    setUserPhone,
    userName,
    setUserName,
    userEmail,
    setUserEmail,
    isSyncing,
    lastSyncTime,
    createBooking,
    cancelBooking,
    collectBalanceAtCourt,
    blockTimeSlot,
    unblockTimeSlot,
    createManualAdminBooking,
    addReview,
    replyToReview,
    updateCourt,
    getSlotsForCourtAndDate,
    getMonthlyStats,
    generateWhatsAppMessage,
    getWhatsAppShareUrl,
    triggerWhatsAppSend,
    exportDatabaseJson,
    importDatabaseJson,
    resetDatabase,
  }), [
    courts,
    bookings,
    reviews,
    whatsappLogs,
    selectedDate,
    selectedSport,
    currentRole,
    activeTab,
    androidViewMode,
    userPhone,
    userName,
    userEmail,
    isSyncing,
    lastSyncTime,
    createBooking,
    cancelBooking,
    collectBalanceAtCourt,
    blockTimeSlot,
    unblockTimeSlot,
    createManualAdminBooking,
    addReview,
    replyToReview,
    updateCourt,
    getSlotsForCourtAndDate,
    getMonthlyStats,
    generateWhatsAppMessage,
    getWhatsAppShareUrl,
    triggerWhatsAppSend,
    exportDatabaseJson,
    importDatabaseJson,
    resetDatabase,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
