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
  PaymentStatus,
  BusinessProfile,
  AdminUser,
  DeveloperContact
} from '../types';
import { 
  INITIAL_COURTS, 
  INITIAL_BOOKINGS, 
  INITIAL_REVIEWS, 
  INITIAL_WHATSAPP_LOGS, 
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_DEVELOPER_CONTACT,
  INITIAL_ADMINS,
  MONTHLY_STATS_DATA, 
  getIsoDate 
} from '../data/mockData';
import { 
  subscribeToCourts,
  saveCourtToFirestore,
  deleteCourtFromFirestore,
  subscribeToBookings, 
  saveBookingToFirestore, 
  deleteBookingFromFirestore, 
  subscribeToReviews, 
  saveReviewToFirestore, 
  saveReviewReplyToFirestore, 
  subscribeToBusinessProfile,
  saveBusinessProfileToFirestore,
  subscribeToDeveloperContact,
  saveDeveloperContactToFirestore,
  subscribeToAdmins,
  saveAdminUserToFirestore,
  deleteAdminUserFromFirestore,
  fetchAllCollectionDocs
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
  businessProfile: BusinessProfile;
  developerContact: DeveloperContact;
  admins: AdminUser[];
  
  // Navigation & Filters
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedSport: SportType | 'all';
  setSelectedSport: (sport: SportType | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Admin & SuperAdmin Authentication State
  isAdminAuthenticated: boolean;
  isSuperAdmin: boolean;
  currentAdminUser: AdminUser | null;
  loginAdmin: (password: string, username?: string) => { success: boolean; isSuperAdmin?: boolean; message?: string };
  logoutAdmin: () => void;
  
  // User profile storage for players
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

  // Courts Management
  addCourt: (courtData: Omit<Court, 'id' | 'rating' | 'reviewCount'>) => Promise<Court>;
  deleteCourt: (courtId: string) => Promise<void>;
  updateCourt: (updatedCourt: Court) => Promise<void>;

  // Business Profile Management
  updateBusinessProfile: (newProfile: Partial<BusinessProfile>) => Promise<void>;

  // Developer Contact Management (SuperAdmin only)
  updateDeveloperContact: (newContact: Partial<DeveloperContact>) => Promise<void>;

  // SuperAdmin User Management
  addAdminUser: (admin: Omit<AdminUser, 'id' | 'createdAt'>) => Promise<void>;
  updateAdminUser: (admin: AdminUser) => Promise<void>;
  deleteAdminUser: (adminId: string) => Promise<void>;
  toggleAdminUserStatus: (adminId: string) => Promise<void>;

  // Bookings & Reviews Actions
  createBooking: (input: BookingInput) => Booking;
  cancelBooking: (bookingId: string) => void;
  collectBalanceAtCourt: (bookingId: string) => void;
  blockTimeSlot: (courtId: string, date: string, startTime: string, durationMinutes: number, reason: string) => void;
  unblockTimeSlot: (bookingId: string) => void;
  createManualAdminBooking: (input: BookingInput) => Booking;
  addReview: (review: Omit<Review, 'id' | 'date'>) => void;
  replyToReview: (reviewId: string, replyText: string) => void;
  
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
  COURTS: 'deportespmy_courts_v6',
  BOOKINGS: 'deportespmy_bookings_v6',
  REVIEWS: 'deportespmy_reviews_v6',
  WHATSAPP: 'deportespmy_whatsapp_v6',
  PROFILE: 'deportespmy_profile_v6',
  DEVELOPER_CONTACT: 'deportespmy_dev_contact_v6',
  ADMINS: 'deportespmy_admins_v6',
  USER_PHONE: 'deportespmy_user_phone',
  USER_NAME: 'deportespmy_user_name',
  USER_EMAIL: 'deportespmy_user_email',
  CURRENT_ADMIN: 'deportespmy_current_admin_v6',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Courts State (starts clean from 0 as requested)
  const [courts, setCourts] = useState<Court[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURTS);
      return saved ? JSON.parse(saved) : INITIAL_COURTS;
    } catch {
      return INITIAL_COURTS;
    }
  });

  // Bookings State (starts clean from 0)
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

  // Business Profile State
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : DEFAULT_BUSINESS_PROFILE;
    } catch {
      return DEFAULT_BUSINESS_PROFILE;
    }
  });

  // Developer Contact State (SuperAdmin editable, for footer)
  const [developerContact, setDeveloperContact] = useState<DeveloperContact>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEVELOPER_CONTACT);
      return saved ? JSON.parse(saved) : DEFAULT_DEVELOPER_CONTACT;
    } catch {
      return DEFAULT_DEVELOPER_CONTACT;
    }
  });

  // Admins List State
  const [admins, setAdmins] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMINS);
      return saved ? JSON.parse(saved) : INITIAL_ADMINS;
    } catch {
      return INITIAL_ADMINS;
    }
  });

  // Navigation and Filter States
  const [selectedDate, setSelectedDate] = useState<string>(getIsoDate(0));
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('turnos');

  // Admin Authentication State
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isAdminAuthenticated = !!currentAdminUser;
  const isSuperAdmin = currentAdminUser?.role === 'superadmin';

  const loginAdmin = (passwordInput: string, usernameInput?: string): { success: boolean; isSuperAdmin?: boolean; message?: string } => {
    const cleanPass = passwordInput.trim();
    const cleanUser = usernameInput ? usernameInput.trim().toLowerCase() : '';

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Ingresá usuario y contraseña' };
    }

    // SuperAdmin official master credentials requested by user
    if (cleanUser === 'heberperez1984' && cleanPass === 'matinconoahperez2026') {
      const masterSuper: AdminUser = {
        id: 'superadmin-heber',
        username: 'heberperez1984',
        fullName: 'Heber Perez (SuperAdmin)',
        email: 'heberperez1984@gmail.com',
        phone: '+5492804315171',
        password: cleanPass,
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        isActive: true
      };
      setCurrentAdminUser(masterSuper);
      localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(masterSuper));
      return { success: true, isSuperAdmin: true };
    }

    // Check against admins list in database
    const foundAdmin = admins.find(a => {
      if (!a.isActive) return false;
      return a.username.toLowerCase() === cleanUser && a.password === cleanPass;
    });

    if (foundAdmin) {
      setCurrentAdminUser(foundAdmin);
      localStorage.setItem(STORAGE_KEYS.CURRENT_ADMIN, JSON.stringify(foundAdmin));
      return { success: true, isSuperAdmin: foundAdmin.role === 'superadmin' };
    }

    return { success: false, message: 'Usuario o contraseña incorrectos' };
  };

  const logoutAdmin = () => {
    setCurrentAdminUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN);
    setActiveTab('turnos');
  };

  // Player stored credentials
  const [userPhone, setUserPhoneState] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.USER_PHONE) || '+5492804567890');
  const [userName, setUserNameState] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Jugador PMY');
  const [userEmail, setUserEmailState] = useState<string>(() => localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || 'jugador@deportespmy.com.ar');

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

  // Connect Firestore real-time listeners for all collections
  useEffect(() => {
    testFirestoreConnection().then(ok => setCloudConnected(ok));

    // 1. Subscribe to Courts
    const unsubCourts = subscribeToCourts((remoteCourts) => {
      setCourts(remoteCourts);
      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(remoteCourts));
      setLastSyncTime(new Date());
    });

    // 2. Subscribe to Bookings
    const unsubBookings = subscribeToBookings((remoteBookings) => {
      setBookings(remoteBookings);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(remoteBookings));
      setLastSyncTime(new Date());
    });

    // 3. Subscribe to Reviews
    const unsubReviews = subscribeToReviews((remoteReviews) => {
      setReviews(remoteReviews);
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(remoteReviews));
      setLastSyncTime(new Date());
    });

    // 4. Subscribe to Business Profile
    const unsubProfile = subscribeToBusinessProfile((remoteProfile) => {
      setBusinessProfile(remoteProfile);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(remoteProfile));
      setLastSyncTime(new Date());
    });

    // 5. Subscribe to Developer Contact (for footer)
    const unsubDevContact = subscribeToDeveloperContact((remoteDev) => {
      setDeveloperContact(remoteDev);
      localStorage.setItem(STORAGE_KEYS.DEVELOPER_CONTACT, JSON.stringify(remoteDev));
      setLastSyncTime(new Date());
    });

    // 6. Subscribe to Admins
    const unsubAdmins = subscribeToAdmins((remoteAdmins) => {
      if (remoteAdmins.length > 0) {
        setAdmins(remoteAdmins);
        localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(remoteAdmins));
      } else {
        // Seed default superadmin if collection is empty
        INITIAL_ADMINS.forEach(a => saveAdminUserToFirestore(a));
      }
      setLastSyncTime(new Date());
    });

    return () => {
      unsubCourts();
      unsubBookings();
      unsubReviews();
      unsubProfile();
      unsubDevContact();
      unsubAdmins();
    };
  }, []);

  // Fetch full cloud data on demand
  const refreshFromCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [remoteCourts, remoteBookings, remoteReviews, remoteAdmins] = await Promise.all([
        fetchAllCollectionDocs<Court>('courts'),
        fetchAllCollectionDocs<Booking>('bookings'),
        fetchAllCollectionDocs<Review>('reviews'),
        fetchAllCollectionDocs<AdminUser>('admins')
      ]);

      setCourts(remoteCourts);
      setBookings(remoteBookings);
      setReviews(remoteReviews);
      if (remoteAdmins.length > 0) setAdmins(remoteAdmins);

      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(remoteCourts));
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(remoteBookings));
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(remoteReviews));

      setCloudConnected(true);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('[Firestore] Refresh error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Add Court Action (starts with 0 rating until players leave reviews)
  const addCourt = useCallback(async (courtData: Omit<Court, 'id' | 'rating' | 'reviewCount'>): Promise<Court> => {
    const newCourt: Court = {
      ...courtData,
      id: `cancha-${Date.now()}`,
      rating: 0,
      reviewCount: 0,
      establishment: courtData.establishment || businessProfile.complexName || 'DeportesPMY'
    };

    const nextCourts = [...courts, newCourt];
    setCourts(nextCourts);
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(nextCourts));
    await saveCourtToFirestore(newCourt);
    return newCourt;
  }, [courts, businessProfile.complexName]);

  // Delete Court Action (deletes in Firestore and propagates across all devices)
  const deleteCourt = useCallback(async (courtId: string) => {
    // 1. Remove from Firestore immediately
    await deleteCourtFromFirestore(courtId);

    // 2. Also remove any bookings tied to this court
    const courtBookings = bookings.filter(b => b.courtId === courtId);
    for (const b of courtBookings) {
      await deleteBookingFromFirestore(b.id);
    }

    // 3. Update local memory and storage
    const nextCourts = courts.filter(c => c.id !== courtId);
    const nextBookings = bookings.filter(b => b.courtId !== courtId);
    setCourts(nextCourts);
    setBookings(nextBookings);
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(nextCourts));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
  }, [courts, bookings]);

  // Update Court Action
  const updateCourt = useCallback(async (updatedCourt: Court) => {
    const nextCourts = courts.map(c => c.id === updatedCourt.id ? updatedCourt : c);
    setCourts(nextCourts);
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(nextCourts));
    await saveCourtToFirestore(updatedCourt);
  }, [courts]);

  // Update Business Profile Action
  const updateBusinessProfile = useCallback(async (partialProfile: Partial<BusinessProfile>) => {
    const nextProfile: BusinessProfile = {
      ...businessProfile,
      ...partialProfile
    };
    setBusinessProfile(nextProfile);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(nextProfile));
    await saveBusinessProfileToFirestore(nextProfile);
  }, [businessProfile]);

  // Update Developer Contact (SuperAdmin editable, for footer)
  const updateDeveloperContact = useCallback(async (partialContact: Partial<DeveloperContact>) => {
    const nextContact: DeveloperContact = {
      ...developerContact,
      ...partialContact
    };
    setDeveloperContact(nextContact);
    localStorage.setItem(STORAGE_KEYS.DEVELOPER_CONTACT, JSON.stringify(nextContact));
    await saveDeveloperContactToFirestore(nextContact);
  }, [developerContact]);

  // Add Admin User Action (SuperAdmin only)
  const addAdminUser = useCallback(async (adminData: Omit<AdminUser, 'id' | 'createdAt'>) => {
    const newAdmin: AdminUser = {
      ...adminData,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const nextAdmins = [...admins, newAdmin];
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    await saveAdminUserToFirestore(newAdmin);
  }, [admins]);

  // Update/Modify Admin User Action (SuperAdmin only)
  const updateAdminUser = useCallback(async (updatedAdmin: AdminUser) => {
    const nextAdmins = admins.map(a => a.id === updatedAdmin.id ? updatedAdmin : a);
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    await saveAdminUserToFirestore(updatedAdmin);
  }, [admins]);

  // Delete Admin User Action
  const deleteAdminUser = useCallback(async (adminId: string) => {
    const nextAdmins = admins.filter(a => a.id !== adminId);
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    await deleteAdminUserFromFirestore(adminId);
  }, [admins]);

  // Toggle Admin User Status
  const toggleAdminUserStatus = useCallback(async (adminId: string) => {
    let target: AdminUser | undefined;
    const nextAdmins = admins.map(a => {
      if (a.id === adminId) {
        target = { ...a, isActive: !a.isActive };
        return target;
      }
      return a;
    });
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    if (target) {
      await saveAdminUserToFirestore(target);
    }
  }, [admins]);

  // Helper to calculate end time string
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // Generate WhatsApp Message template with real Admin Business Profile details
  const generateWhatsAppMessage = useCallback((booking: Booking): string => {
    const isSeña = booking.paymentStatus === 'seña_pagada';
    const sportEmoji = {
      futbol5: '⚽',
      futbol7: '⚽',
      padel: '🎾',
      tenis: '🎾',
      basquet: '🏀'
    }[booking.sport] || '🏆';

    const establishmentName = booking.establishment || businessProfile.complexName || 'DeportesPMY';

    return `*¡Hola ${booking.clientName}!* 👋\n\n` +
      `Tu turno en *${establishmentName}* está *CONFIRMADO* con éxito. Aquí tenés los detalles:\n\n` +
      `${sportEmoji} *Cancha:* ${booking.courtName}\n` +
      `📅 *Fecha:* ${booking.date}\n` +
      `⏰ *Horario:* ${booking.startTime} a ${booking.endTime} hs (${booking.durationMinutes} min)\n` +
      `🎟️ *Código de Reserva:* #${booking.bookingCode}\n\n` +
      `💰 *Total de Cancha:* $${booking.totalAmount.toLocaleString('es-AR')}\n` +
      `💳 *Abonado:* $${booking.amountPaid.toLocaleString('es-AR')} (${booking.paymentMethod.toUpperCase()})\n` +
      (isSeña 
        ? `⚠️ *Saldo restante a abonar en mostrador:* $${booking.balanceDue.toLocaleString('es-AR')}\n\n` 
        : `✅ *Estado del pago:* 100% CANCELADO\n\n`) +
      `📍 *Dirección:* ${businessProfile.address}\n` +
      (businessProfile.alias ? `💳 *Alias para transferir:* ${businessProfile.alias} (${businessProfile.accountHolder})\n` : '') +
      `📱 *Contacto:* ${businessProfile.whatsappNumber}\n\n` +
      `_${businessProfile.welcomeNotes || 'Presentate 10 minutos antes del inicio. ¡Que disfrutes el partido!'} 🔥_`;
  }, [businessProfile]);

  const getWhatsAppShareUrl = useCallback((booking: Booking): string => {
    const cleanPhone = (booking.clientPhone || businessProfile.whatsappNumber).replace(/\D/g, '');
    const message = generateWhatsAppMessage(booking);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }, [businessProfile.whatsappNumber, generateWhatsAppMessage]);

  const triggerWhatsAppSend = useCallback((booking: Booking) => {
    const cleanPhone = (booking.clientPhone || businessProfile.whatsappNumber).replace(/\D/g, '');
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
  }, [bookings, businessProfile.whatsappNumber, generateWhatsAppMessage]);

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
      establishment: court.establishment || businessProfile.complexName,
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
      paymentReference: input.paymentReference || `TR-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      whatsappSent: true,
      whatsappSentAt: new Date().toISOString(),
    };

    const nextBookings = [newBooking, ...bookings];
    setBookings(nextBookings);
    
    // Save to Firestore
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
  }, [courts, businessProfile.complexName, bookings]);

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
      establishment: court.establishment || businessProfile.complexName,
      sport: court.sport,
      date,
      startTime,
      endTime,
      durationMinutes,
      clientName: `[BLOQUEADO: ${reason}]`,
      clientPhone: businessProfile.whatsappNumber,
      clientEmail: businessProfile.email,
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
  }, [courts, businessProfile, bookings]);

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
    saveReviewToFirestore(newRev);
  }, [reviews]);

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
    saveReviewReplyToFirestore(reviewId, adminReply);
  }, [reviews]);

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
    const totalBookingsCount = monthBookings.length;
    const totalRev = extraRevenue;

    return {
      ...base,
      totalRevenue: totalRev,
      totalBookings: totalBookingsCount,
    };
  }, [bookings]);

  // Export / Import / Reset Database
  const exportDatabaseJson = useCallback((): string => {
    const payload = {
      version: '5.0',
      exportedAt: new Date().toISOString(),
      businessProfile,
      courts,
      bookings,
      reviews,
      whatsappLogs,
    };
    return JSON.stringify(payload, null, 2);
  }, [businessProfile, courts, bookings, reviews, whatsappLogs]);

  const importDatabaseJson = useCallback((jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.businessProfile) {
        setBusinessProfile(data.businessProfile);
        saveBusinessProfileToFirestore(data.businessProfile);
      }
      if (Array.isArray(data.courts)) {
        setCourts(data.courts);
        data.courts.forEach((c: Court) => saveCourtToFirestore(c));
      }
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
    setCourts([]);
    setBookings([]);
    setReviews([]);
    setWhatsappLogs([]);
    localStorage.removeItem(STORAGE_KEYS.COURTS);
    localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
  }, []);

  const value = useMemo(() => ({
    courts,
    bookings,
    reviews,
    whatsappLogs,
    businessProfile,
    developerContact,
    admins,
    selectedDate,
    setSelectedDate,
    selectedSport,
    setSelectedSport,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    isAdminAuthenticated,
    isSuperAdmin,
    currentAdminUser,
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
    addCourt,
    deleteCourt,
    updateCourt,
    updateBusinessProfile,
    updateDeveloperContact,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    toggleAdminUserStatus,
    createBooking,
    cancelBooking,
    collectBalanceAtCourt,
    blockTimeSlot,
    unblockTimeSlot,
    createManualAdminBooking,
    addReview,
    replyToReview,
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
    businessProfile,
    developerContact,
    admins,
    selectedDate,
    selectedSport,
    searchQuery,
    activeTab,
    isAdminAuthenticated,
    isSuperAdmin,
    currentAdminUser,
    userPhone,
    userName,
    userEmail,
    isSyncing,
    lastSyncTime,
    cloudConnected,
    refreshFromCloud,
    addCourt,
    deleteCourt,
    updateCourt,
    updateBusinessProfile,
    updateDeveloperContact,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    toggleAdminUserStatus,
    createBooking,
    cancelBooking,
    collectBalanceAtCourt,
    blockTimeSlot,
    unblockTimeSlot,
    createManualAdminBooking,
    addReview,
    replyToReview,
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
