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
import { 
  subscribeToBookings, 
  subscribeToReviews, 
  saveBookingToFirestore, 
  deleteBookingFromFirestore, 
  saveReviewToFirestore, 
  saveReviewReplyToFirestore, 
  fetchAllBookingsOnce, 
  fetchAllReviewsOnce 
} from '../services/centralSync';
import { testFirestoreConnection } from '../firebase';

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
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Admin Authentication State
  isAdminAuthenticated: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  
  // User profile storage
  userPhone: string;
  setUserPhone: (phone: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;

  // Cloud synchronization status
  isSyncing: boolean;
  lastSyncTime: Date;
  cloudConnected: boolean;
  refreshFromCloud: () => Promise<void>;

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
  COURTS: 'deportespmy_courts_v4',
  BOOKINGS: 'deportespmy_bookings_v4',
  REVIEWS: 'deportespmy_reviews_v4',
  WHATSAPP: 'deportespmy_whatsapp_v4',
  USER_PHONE: 'deportespmy_user_phone',
  USER_NAME: 'deportespmy_user_name',
  USER_EMAIL: 'deportespmy_user_email',
  ADMIN_AUTH: 'deportespmy_admin_authenticated',
};

const DEFAULT_ADMIN_PASSWORDS = ['pmy2026', 'admin123', 'admin', 'madryn2026'];

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
  const [activeTab, setActiveTab] = useState<string>('turnos');

  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
  });

  const loginAdmin = (password: string): boolean => {
    if (DEFAULT_ADMIN_PASSWORDS.includes(password.trim().toLowerCase())) {
      setIsAdminAuthenticated(true);
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    setActiveTab('turnos');
  };

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

  // Cloud Sync Indicators
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudConnected, setCloudConnected] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Recalculate court rating helper
  const recalculateCourtsRatings = useCallback((updatedReviews: Review[]) => {
    setCourts(prevCourts => prevCourts.map(c => {
      const courtReviews = updatedReviews.filter(r => r.courtId === c.id);
      if (courtReviews.length === 0) return c;
      const avg = courtReviews.reduce((sum, r) => sum + r.rating, 0) / courtReviews.length;
      return {
        ...c,
        rating: Number(avg.toFixed(1)),
        reviewCount: courtReviews.length
      };
    }));
  }, []);

  // Connect Firestore real-time onSnapshot listeners
  useEffect(() => {
    testFirestoreConnection().then(ok => setCloudConnected(ok));

    // 1. Subscribe to Bookings in Firestore
    const unsubBookings = subscribeToBookings((remoteBookings) => {
      if (remoteBookings.length > 0) {
        setBookings(prev => {
          const map = new Map<string, Booking>();
          prev.forEach(b => map.set(b.id, b));
          remoteBookings.forEach(b => map.set(b.id, b));
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(merged));
          return merged;
        });
        setLastSyncTime(new Date());
        setCloudConnected(true);
      } else {
        // If Firestore bookings collection is empty, seed it with initial bookings
        INITIAL_BOOKINGS.forEach(b => saveBookingToFirestore(b));
      }
    });

    // 2. Subscribe to Reviews in Firestore
    const unsubReviews = subscribeToReviews((remoteReviews) => {
      if (remoteReviews.length > 0) {
        setReviews(prev => {
          const map = new Map<string, Review>();
          prev.forEach(r => map.set(r.id, r));
          remoteReviews.forEach(r => map.set(r.id, r));
          const merged = Array.from(map.values());
          localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(merged));
          recalculateCourtsRatings(merged);
          return merged;
        });
        setLastSyncTime(new Date());
        setCloudConnected(true);
      } else {
        // If Firestore reviews collection is empty, seed it with initial reviews
        INITIAL_REVIEWS.forEach(r => saveReviewToFirestore(r));
      }
    });

    return () => {
      unsubBookings();
      unsubReviews();
    };
  }, [recalculateCourtsRatings]);

  // Fetch full cloud data on demand
  const refreshFromCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [remoteBookings, remoteReviews] = await Promise.all([
        fetchAllBookingsOnce(),
        fetchAllReviewsOnce()
      ]);

      if (remoteBookings && remoteBookings.length > 0) {
        setBookings(remoteBookings);
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(remoteBookings));
      }

      if (remoteReviews && remoteReviews.length > 0) {
        setReviews(remoteReviews);
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(remoteReviews));
        recalculateCourtsRatings(remoteReviews);
      }

      setCloudConnected(true);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[Firestore] Refresh error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [recalculateCourtsRatings]);

  // Save changes to localStorage as local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
    } catch (e) {
      console.error(e);
    }
  }, [courts]);

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
      `📍 *Ubicación:* Boulevard Brown 1420 (Costanera frente al mar), Puerto Madryn, Chubut.\n` +
      `📱 *Tu Pase de Acceso:* https://deportespmy.com.ar/#/pase/${booking.bookingCode}\n\n` +
      `_Por favor presentate 10 minutos antes del inicio. ¡Que disfrutes el partido!_ 🔥`;
  }, []);

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
    const updated = bookings.map(b => b.id === booking.id ? { ...b, whatsappSent: true, whatsappSentAt: new Date().toISOString() } : b);
    setBookings(updated);
    saveBookingToFirestore({ ...booking, whatsappSent: true, whatsappSentAt: new Date().toISOString() });

    // Open WhatsApp
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(preview)}`;
    window.open(url, '_blank');
  }, [bookings, generateWhatsAppMessage]);

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
      id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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

    const nextBookings = [newBooking, ...bookings];
    setBookings(nextBookings);
    
    // Save to Google Cloud Firestore database
    saveBookingToFirestore(newBooking);

    // Save client info locally
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

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignore
    }

    return newBooking;
  }, [courts, bookings]);

  // Admin Manual Booking
  const createManualAdminBooking = useCallback((input: BookingInput): Booking => {
    return createBooking(input);
  }, [createBooking]);

  // Cancel booking
  const cancelBooking = useCallback((bookingId: string) => {
    let targetBooking: Booking | undefined;
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        targetBooking = {
          ...b,
          status: 'cancelled' as const,
          paymentStatus: 'reembolsado' as const
        };
        return targetBooking;
      }
      return b;
    });
    setBookings(updated);
    if (targetBooking) {
      saveBookingToFirestore(targetBooking);
    }
  }, [bookings]);

  // Collect balance at court
  const collectBalanceAtCourt = useCallback((bookingId: string) => {
    let targetBooking: Booking | undefined;
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        targetBooking = {
          ...b,
          amountPaid: b.totalAmount,
          balanceDue: 0,
          paymentStatus: 'total_pagado' as const
        };
        return targetBooking;
      }
      return b;
    });
    setBookings(updated);
    if (targetBooking) {
      saveBookingToFirestore(targetBooking);
    }
  }, [bookings]);

  // Block a slot
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

    const nextBookings = [blockedBooking, ...bookings];
    setBookings(nextBookings);
    saveBookingToFirestore(blockedBooking);
  }, [courts, bookings]);

  // Unblock slot
  const unblockTimeSlot = useCallback((bookingId: string) => {
    const nextBookings = bookings.filter(b => b.id !== bookingId);
    setBookings(nextBookings);
    deleteBookingFromFirestore(bookingId);
  }, [bookings]);

  // Add review
  const addReview = useCallback((newReviewData: Omit<Review, 'id' | 'date'>) => {
    const reviewId = `rev-${Date.now()}`;
    const newRev: Review = {
      ...newReviewData,
      id: reviewId,
      date: getIsoDate(0),
    };
    const nextReviews = [newRev, ...reviews];
    setReviews(nextReviews);
    recalculateCourtsRatings(nextReviews);

    // Save to Firestore real-time collection
    saveReviewToFirestore(newRev);
  }, [reviews, recalculateCourtsRatings]);

  // Admin replies to review
  const replyToReview = useCallback((reviewId: string, replyText: string) => {
    const adminReply = {
      text: replyText,
      date: getIsoDate(0)
    };
    const nextReviews = reviews.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          adminReply
        };
      }
      return r;
    });
    setReviews(nextReviews);

    // Update in Firestore
    saveReviewReplyToFirestore(reviewId, adminReply);
  }, [reviews]);

  // Update court settings
  const updateCourt = useCallback((updatedCourt: Court) => {
    setCourts(prev => prev.map(c => c.id === updatedCourt.id ? updatedCourt : c));
  }, []);

  // Generate Slots for a Court on a specific Date
  const getSlotsForCourtAndDate = useCallback((courtId: string, date: string): TimeSlot[] => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return [];

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
      version: '4.0',
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
      if (Array.isArray(data.bookings)) {
        setBookings(data.bookings);
        data.bookings.forEach((b: Booking) => saveBookingToFirestore(b));
      }
      if (Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        data.reviews.forEach((r: Review) => saveReviewToFirestore(r));
      }
      if (Array.isArray(data.whatsappLogs)) setWhatsappLogs(data.whatsappLogs);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }, []);

  const resetDatabase = useCallback(() => {
    setCourts(INITIAL_COURTS);
    setBookings(INITIAL_BOOKINGS);
    setReviews(INITIAL_REVIEWS);
    setWhatsappLogs(INITIAL_WHATSAPP_LOGS);
    INITIAL_BOOKINGS.forEach(b => saveBookingToFirestore(b));
    INITIAL_REVIEWS.forEach(r => saveReviewToFirestore(r));
  }, []);

  const value = useMemo(() => ({
    courts,
    bookings,
    reviews,
    whatsappLogs,
    selectedDate,
    setSelectedDate,
    selectedSport,
    setSelectedSport,
    activeTab,
    setActiveTab,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    userPhone,
    setUserPhone,
    userName,
    setUserName,
    userEmail,
    setUserEmail,
    isSyncing,
    lastSyncTime,
    cloudConnected,
    refreshFromCloud,
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
    activeTab,
    isAdminAuthenticated,
    userPhone,
    userName,
    userEmail,
    isSyncing,
    lastSyncTime,
    cloudConnected,
    refreshFromCloud,
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
