import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { apiFetch, safeParseJsonResponse } from '../utils/api';
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
  EMPTY_BUSINESS_PROFILE,
  DEFAULT_DEVELOPER_CONTACT,
  INITIAL_ADMINS,
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
  subscribeToAllProfiles,
  saveBusinessProfileToFirestore,
  subscribeToDeveloperContact,
  saveDeveloperContactToFirestore,
  subscribeToAdmins,
  saveAdminUserToFirestore,
  deleteAdminUserFromFirestore,
  fetchAllCollectionDocs
} from '../services/centralSync';
import { testFirestoreConnection } from '../firebase';
import {
  formatSlotHour,
  getCourtHoursRange,
  getNormalizedCourtSchedule,
  normalizeCourtSchedule,
  parseSlotHourOrder,
} from '../utils/scheduleHours';

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
  status?: 'confirmed' | 'pending_payment';
}

interface AppContextType {
  courts: Court[];
  bookings: Booking[];
  adminCourts: Court[];
  adminBookings: Booking[];
  adminWhatsappLogs: WhatsAppNotificationLog[];
  reviews: Review[];
  whatsappLogs: WhatsAppNotificationLog[];
  businessProfile: BusinessProfile;
  profilesByAdmin: Record<string, BusinessProfile>;
  getAdminIdForCourt: (court?: Court | null) => string;
  getBusinessProfileForCourt: (court?: Court | null) => BusinessProfile;
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
  selectedEstablishmentKey: string | null;
  setSelectedEstablishmentKey: (key: string | null) => void;

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
  toggleAdminPaymentPause: (adminUsername: string, method: 'mp' | 'transfer') => Promise<void>;

  // Developer Contact Management (SuperAdmin only)
  updateDeveloperContact: (newContact: Partial<DeveloperContact>) => Promise<void>;

  // SuperAdmin User Management
  addAdminUser: (admin: Omit<AdminUser, 'id' | 'createdAt'>) => Promise<void>;
  updateAdminUser: (admin: AdminUser) => Promise<void>;
  deleteAdminUser: (adminId: string) => Promise<void>;
  toggleAdminUserStatus: (adminId: string) => Promise<void>;

  // Bookings & Reviews Actions
  createBooking: (input: BookingInput) => Booking;
  submitPaymentReceipt: (bookingCodeOrId: string, receiptUrl: string, paymentReference?: string) => Booking | undefined;
  confirmBookingPayment: (bookingCodeOrId: string, paymentReference: string, paidAmount?: number) => Booking | undefined;
  cancelBooking: (
    bookingId: string,
    options?: { forceManual?: boolean; notifyWhatsApp?: boolean }
  ) => Promise<{
    success: boolean;
    mpRefunded: boolean;
    manualRefundRequired?: boolean;
    refundAmount: number;
    refundId?: string;
    message?: string;
  }>;
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

const normalizeAdminKey = (val?: string | null): string =>
  (val || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Courts State (starts clean from 0 as requested)
  const [courts, setCourts] = useState<Court[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURTS);
      const parsed: Court[] = saved ? JSON.parse(saved) : INITIAL_COURTS;
      return parsed.map((c) => normalizeCourtSchedule(c));
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

  // Business Profile State (scoped per admin user so new admins always start with 100% empty fields)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    try {
      const currentAdminRaw = localStorage.getItem(STORAGE_KEYS.CURRENT_ADMIN);
      if (currentAdminRaw) {
        const parsedAdmin: AdminUser = JSON.parse(currentAdminRaw);
        if (parsedAdmin.username && parsedAdmin.username !== 'heberperez1984') {
          const userSaved = localStorage.getItem(`deportespmy_profile_${parsedAdmin.username}`);
          return userSaved ? JSON.parse(userSaved) : EMPTY_BUSINESS_PROFILE;
        }
      }
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
  const [selectedEstablishmentKey, setSelectedEstablishmentKey] = useState<string | null>(null);

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

      // Load this specific admin's profile or default to empty
      const cleanKey = normalizeAdminKey(foundAdmin.username);
      const userSaved = localStorage.getItem(`deportespmy_profile_${cleanKey}`) || localStorage.getItem(`deportespmy_profile_${foundAdmin.username}`);
      if (userSaved) {
        setBusinessProfile(JSON.parse(userSaved));
      } else if (profilesByAdmin[cleanKey]) {
        setBusinessProfile(profilesByAdmin[cleanKey]);
      } else {
        setBusinessProfile(EMPTY_BUSINESS_PROFILE);
      }

      return { success: true, isSuperAdmin: foundAdmin.role === 'superadmin' };
    }

    return { success: false, message: 'Usuario o contraseña incorrectos' };
  };

  const logoutAdmin = () => {
    setCurrentAdminUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ADMIN);
    try {
      const publicSaved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      setBusinessProfile(publicSaved ? JSON.parse(publicSaved) : DEFAULT_BUSINESS_PROFILE);
    } catch {
      setBusinessProfile(DEFAULT_BUSINESS_PROFILE);
    }
    setActiveTab('turnos');
  };

  // Store all complex profiles keyed by admin username for multi-tenant isolation
  const [profilesByAdmin, setProfilesByAdmin] = useState<Record<string, BusinessProfile>>({});

  // Player stored credentials (clean defaults, no mock placeholders)
  const [userPhone, setUserPhoneState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PHONE);
    return (saved && saved !== '+5492804567890') ? saved : '';
  });
  const [userName, setUserNameState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    return (saved && saved !== 'Jugador PMY') ? saved : '';
  });
  const [userEmail, setUserEmailState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    return (saved && saved !== 'jugador@deportespmy.com.ar') ? saved : '';
  });

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
      setCloudConnected(true);
      setLastSyncTime(new Date());
    });

    // 2. Subscribe to Bookings
    const unsubBookings = subscribeToBookings((remoteBookings) => {
      setBookings(remoteBookings);
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(remoteBookings));
      setCloudConnected(true);
      setLastSyncTime(new Date());
    });

    // 3. Subscribe to Reviews
    const unsubReviews = subscribeToReviews((remoteReviews) => {
      setReviews(remoteReviews);
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(remoteReviews));
      setCloudConnected(true);
      setLastSyncTime(new Date());
    });

    // 4. Subscribe to Business Profile (scoped to logged-in admin or public venue)
    const adminKey = currentAdminUser ? currentAdminUser.username : undefined;
    const unsubProfile = subscribeToBusinessProfile((remoteProfile) => {
      setBusinessProfile(remoteProfile);
      const storageKey = adminKey ? `deportespmy_profile_${adminKey}` : STORAGE_KEYS.PROFILE;
      localStorage.setItem(storageKey, JSON.stringify(remoteProfile));
      setLastSyncTime(new Date());
    }, adminKey);

    // 5. Subscribe to all admin profiles for multi-tenant isolation across courts
    const unsubAllProfiles = subscribeToAllProfiles((allProfiles) => {
      setProfilesByAdmin(allProfiles);
    });

    // 6. Subscribe to Developer Contact (for footer)
    const unsubDevContact = subscribeToDeveloperContact((remoteDev) => {
      setDeveloperContact(remoteDev);
      localStorage.setItem(STORAGE_KEYS.DEVELOPER_CONTACT, JSON.stringify(remoteDev));
      setLastSyncTime(new Date());
    });

    // 7. Subscribe to Admins
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
      unsubAllProfiles();
      unsubDevContact();
      unsubAdmins();
    };
  }, [currentAdminUser?.username]);

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

      const normalizedCourts = remoteCourts.map((c) => normalizeCourtSchedule(c));
      setCourts(normalizedCourts);
      setBookings(remoteBookings);
      setReviews(remoteReviews);
      if (remoteAdmins.length > 0) setAdmins(remoteAdmins);

      localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(normalizedCourts));
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
    const adminKey = currentAdminUser ? currentAdminUser.username : 'heberperez1984';
    const newCourt: Court = normalizeCourtSchedule({
      ...courtData,
      id: `cancha-${Date.now()}`,
      rating: 0,
      reviewCount: 0,
      adminId: adminKey,
      establishment: courtData.establishment || businessProfile.complexName || 'DeportesPMY'
    });

    const nextCourts = [...courts, newCourt];
    setCourts(nextCourts);
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(nextCourts));
    await saveCourtToFirestore(newCourt);
    return newCourt;
  }, [courts, businessProfile.complexName, currentAdminUser]);

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
    const normalized = normalizeCourtSchedule(updatedCourt);
    const nextCourts = courts.map(c => c.id === normalized.id ? normalized : c);
    setCourts(nextCourts);
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(nextCourts));
    await saveCourtToFirestore(normalized);
  }, [courts]);

  // Update Business Profile Action
  const updateBusinessProfile = useCallback(async (partialProfile: Partial<BusinessProfile>) => {
    const nextProfile: BusinessProfile = {
      ...businessProfile,
      ...partialProfile
    };
    setBusinessProfile(nextProfile);
    const adminKey = currentAdminUser ? normalizeAdminKey(currentAdminUser.username) : undefined;
    const storageKey = adminKey ? `deportespmy_profile_${adminKey}` : STORAGE_KEYS.PROFILE;
    localStorage.setItem(storageKey, JSON.stringify(nextProfile));
    if (adminKey) {
      setProfilesByAdmin(prev => ({ ...prev, [adminKey]: nextProfile }));
    }
    await saveBusinessProfileToFirestore(nextProfile, adminKey);
  }, [businessProfile, currentAdminUser]);

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
    const cleanUsername = normalizeAdminKey(adminData.username) || adminData.username.trim().toLowerCase();
    const newAdmin: AdminUser = {
      ...adminData,
      username: cleanUsername,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const nextAdmins = [...admins, newAdmin];
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    await saveAdminUserToFirestore(newAdmin);

    // Initialize the new admin's profile completely empty in Firestore and localStorage
    await saveBusinessProfileToFirestore(EMPTY_BUSINESS_PROFILE, cleanUsername);
    localStorage.setItem(`deportespmy_profile_${cleanUsername}`, JSON.stringify(EMPTY_BUSINESS_PROFILE));
    setProfilesByAdmin(prev => ({ ...prev, [cleanUsername]: EMPTY_BUSINESS_PROFILE }));
  }, [admins]);

  // Update/Modify Admin User Action (SuperAdmin only)
  const updateAdminUser = useCallback(async (updatedAdmin: AdminUser) => {
    const nextAdmins = admins.map(a => a.id === updatedAdmin.id ? updatedAdmin : a);
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    await saveAdminUserToFirestore(updatedAdmin);
  }, [admins]);

  // Delete Admin User Action
  const deleteAdminUser = useCallback(async (targetAdminId: string) => {
    const targetAdmin = admins.find(a => a.id === targetAdminId);
    const nextAdmins = admins.filter(a => a.id !== targetAdminId);
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    await deleteAdminUserFromFirestore(targetAdminId);

    if (targetAdmin) {
      // Remove all courts and bookings created by this admin
      const adminCourts = courts.filter(c => c.adminId === targetAdmin.username);
      for (const c of adminCourts) {
        await deleteCourt(c.id);
      }
      try {
        await saveBusinessProfileToFirestore(EMPTY_BUSINESS_PROFILE, targetAdmin.username);
      } catch {}
    }
  }, [admins, courts, deleteCourt]);

  // Toggle payment method pause (for SuperAdmin panel per complex)
  const toggleAdminPaymentPause = useCallback(async (adminUsername: string, method: 'mp' | 'transfer') => {
    const cleanKey = normalizeAdminKey(adminUsername);
    if (!cleanKey) return;
    const currentProf = profilesByAdmin[cleanKey] || EMPTY_BUSINESS_PROFILE;
    const updatedProf: BusinessProfile = {
      ...currentProf,
      mpPaused: method === 'mp' ? !currentProf.mpPaused : Boolean(currentProf.mpPaused),
      transferPaused: method === 'transfer' ? !currentProf.transferPaused : Boolean(currentProf.transferPaused),
    };
    setProfilesByAdmin(prev => ({ ...prev, [cleanKey]: updatedProf }));
    try {
      localStorage.setItem(`deportespmy_profile_${cleanKey}`, JSON.stringify(updatedProf));
    } catch {}
    await saveBusinessProfileToFirestore(updatedProf, cleanKey);
  }, [profilesByAdmin]);

  // Toggle Admin User Status
  const toggleAdminUserStatus = useCallback(async (targetAdminId: string) => {
    let target: AdminUser | undefined;
    const nextAdmins = admins.map(a => {
      if (a.id === targetAdminId) {
        target = { ...a, isActive: !a.isActive };
        return target;
      }
      return a;
    });
    setAdmins(nextAdmins);
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(nextAdmins));
    if (target) {
      await saveAdminUserToFirestore(target);
      // If suspended, wipe out their courts and bookings
      if (!target.isActive) {
        const adminCourts = courts.filter(c => c.adminId === target?.username);
        for (const c of adminCourts) {
          await deleteCourt(c.id);
        }
      }
    }
  }, [admins, courts, deleteCourt]);

  // Helper to calculate end time string
  const calculateEndTime = (start: string, durationMinutes: number): string => {
    const [hours, minutes] = start.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // Resolve normalized adminId owner of a court
  const getAdminIdForCourt = useCallback((court?: Court | null): string => {
    if (!court) return '';
    if (court.adminId) {
      return normalizeAdminKey(court.adminId);
    }
    if (court.establishment) {
      const estClean = court.establishment.trim().toLowerCase();
      const matched = admins.find(a => a.assignedComplex && a.assignedComplex.trim().toLowerCase() === estClean);
      if (matched) return normalizeAdminKey(matched.username);
    }
    return '';
  }, [admins]);

  // Multi-tenant isolated datasets for complex admins
  const adminCourts = useMemo(() => {
    if (!currentAdminUser || isSuperAdmin) return courts;
    const myKey = normalizeAdminKey(currentAdminUser.username);
    return courts.filter(c => getAdminIdForCourt(c) === myKey);
  }, [courts, currentAdminUser, isSuperAdmin, getAdminIdForCourt]);

  const adminBookings = useMemo(() => {
    if (!currentAdminUser || isSuperAdmin) return bookings;
    const myKey = normalizeAdminKey(currentAdminUser.username);
    const myCourtIds = new Set(adminCourts.map(c => c.id));
    return bookings.filter(b => normalizeAdminKey(b.adminId) === myKey || myCourtIds.has(b.courtId));
  }, [bookings, adminCourts, currentAdminUser, isSuperAdmin]);

  const adminWhatsappLogs = useMemo(() => {
    if (!currentAdminUser || isSuperAdmin) return whatsappLogs;
    const myKey = normalizeAdminKey(currentAdminUser.username);
    const myBookingCodes = new Set(adminBookings.map(b => b.bookingCode));
    return whatsappLogs.filter(w => normalizeAdminKey(w.adminId) === myKey || myBookingCodes.has(w.bookingCode));
  }, [whatsappLogs, adminBookings, currentAdminUser, isSuperAdmin]);

  // Multi-tenant profile resolver per court / establishment
  const getBusinessProfileForCourt = useCallback((court?: Court | null): BusinessProfile => {
    if (court) {
      if (court.adminId) {
        const cleanKey = normalizeAdminKey(court.adminId);
        if (profilesByAdmin[cleanKey]) {
          return profilesByAdmin[cleanKey];
        }
        // Check if adminId matches an admin's id
        const matched = admins.find(a => a.id === court.adminId || normalizeAdminKey(a.username) === cleanKey);
        if (matched) {
          const matchKey = normalizeAdminKey(matched.username);
          if (profilesByAdmin[matchKey]) {
            return profilesByAdmin[matchKey];
          }
        }
      }

      if (court.establishment) {
        const estClean = court.establishment.trim().toLowerCase();
        const matched = admins.find(a => a.assignedComplex && a.assignedComplex.trim().toLowerCase() === estClean);
        if (matched) {
          const matchKey = normalizeAdminKey(matched.username);
          if (profilesByAdmin[matchKey]) {
            return profilesByAdmin[matchKey];
          }
        }
      }

      // No profile found for this specific court/admin: return empty profile (NEVER leak another admin's details)
      return EMPTY_BUSINESS_PROFILE;
    }

    if (currentAdminUser?.username) {
      const cleanKey = normalizeAdminKey(currentAdminUser.username);
      if (profilesByAdmin[cleanKey]) {
        return profilesByAdmin[cleanKey];
      }
      return businessProfile;
    }

    return businessProfile.alias ? businessProfile : EMPTY_BUSINESS_PROFILE;
  }, [profilesByAdmin, admins, currentAdminUser, businessProfile]);

  // Generate WhatsApp Message template with real Admin Business Profile details & custom template support
  const generateWhatsAppMessage = useCallback((booking: Booking): string => {
    const isSeña = booking.paymentStatus === 'seña_pagada';
    const sportEmoji = {
      futbol5: '⚽',
      futbol7: '⚽',
      padel: '🎾',
      tenis: '🎾',
      basquet: '🏀'
    }[booking.sport] || '🏆';

    const court = courts.find(c => c.id === booking.courtId);
    const courtProfile = getBusinessProfileForCourt(court);
    const establishmentName = booking.establishment || courtProfile.complexName || court?.establishment || 'Complejo Deportivo';

    if (courtProfile.whatsappTemplate && courtProfile.whatsappTemplate.trim().length > 0) {
      let tpl = courtProfile.whatsappTemplate;
      tpl = tpl.replace(/\{nombre\}/g, booking.clientName);
      tpl = tpl.replace(/\{complejo\}/g, establishmentName);
      tpl = tpl.replace(/\{cancha\}/g, booking.courtName);
      tpl = tpl.replace(/\{fecha\}/g, booking.date);
      tpl = tpl.replace(/\{inicio\}/g, booking.startTime);
      tpl = tpl.replace(/\{fin\}/g, booking.endTime);
      tpl = tpl.replace(/\{codigo\}/g, booking.bookingCode);
      tpl = tpl.replace(/\{total\}/g, `$${booking.totalAmount.toLocaleString('es-AR')}`);
      tpl = tpl.replace(/\{abonado\}/g, `$${booking.amountPaid.toLocaleString('es-AR')}`);
      tpl = tpl.replace(/\{saldo\}/g, `$${booking.balanceDue.toLocaleString('es-AR')}`);
      tpl = tpl.replace(/\{metodo\}/g, booking.paymentMethod.toUpperCase());
      tpl = tpl.replace(/\{alias\}/g, courtProfile.alias || 'N/A');
      tpl = tpl.replace(/\{direccion\}/g, courtProfile.address || 'N/A');
      tpl = tpl.replace(/\{whatsapp\}/g, courtProfile.whatsappNumber || 'N/A');
      tpl = tpl.replace(/\{deporte\}/g, booking.sport);
      tpl = tpl.replace(/\{emoji\}/g, sportEmoji);
      tpl = tpl.replace(/\{notas\}/g, courtProfile.welcomeNotes || '');
      return tpl;
    }

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
      (courtProfile.address ? `📍 *Dirección:* ${courtProfile.address}\n` : '') +
      (courtProfile.alias ? `💳 *Alias para transferir:* ${courtProfile.alias}${courtProfile.accountHolder ? ` (${courtProfile.accountHolder})` : ''}\n` : '') +
      (courtProfile.whatsappNumber ? `📱 *Contacto:* ${courtProfile.whatsappNumber}\n\n` : '\n') +
      `_${courtProfile.welcomeNotes || 'Presentate 10 minutos antes del inicio. ¡Que disfrutes el partido!'} 🔥_`;
  }, [courts, getBusinessProfileForCourt]);

  const getWhatsAppShareUrl = useCallback((booking: Booking): string => {
    const court = courts.find(c => c.id === booking.courtId);
    const courtProfile = getBusinessProfileForCourt(court);
    const cleanPhone = (booking.clientPhone || courtProfile.whatsappNumber || businessProfile.whatsappNumber).replace(/\D/g, '');
    const message = generateWhatsAppMessage(booking);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }, [courts, getBusinessProfileForCourt, businessProfile.whatsappNumber, generateWhatsAppMessage]);

  const triggerWhatsAppSend = useCallback((booking: Booking) => {
    const court = courts.find(c => c.id === booking.courtId);
    const courtProfile = getBusinessProfileForCourt(court);
    const cleanPhone = (booking.clientPhone || courtProfile.whatsappNumber || businessProfile.whatsappNumber).replace(/\D/g, '');
    const preview = generateWhatsAppMessage(booking);
    const ownerAdminId = normalizeAdminKey(booking.adminId) || getAdminIdForCourt(court);
    
    // Add to WhatsApp notifications log
    const newLog: WhatsAppNotificationLog = {
      id: `wa-${Date.now()}`,
      bookingCode: booking.bookingCode,
      recipientName: booking.clientName,
      recipientPhone: booking.clientPhone,
      messagePreview: preview.slice(0, 160) + '...',
      sentAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'delivered',
      adminId: ownerAdminId,
      courtId: booking.courtId
    };
    setWhatsappLogs(prev => {
      const next = [newLog, ...prev];
      try { localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(next)); } catch {}
      return next;
    });

    // Update booking whatsappSent
    const updated = bookings.map(b => b.id === booking.id ? { ...b, whatsappSent: true, whatsappSentAt: new Date().toISOString() } : b);
    setBookings(updated);
    saveBookingToFirestore({ ...booking, whatsappSent: true, whatsappSentAt: new Date().toISOString() });

    // Open WhatsApp
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(preview)}`;
    window.open(url, '_blank');
  }, [courts, getBusinessProfileForCourt, getAdminIdForCourt, bookings, businessProfile.whatsappNumber, generateWhatsAppMessage]);

  // Create booking
  const createBooking = useCallback((input: BookingInput): Booking => {
    const court = courts.find(c => c.id === input.courtId);
    if (!court) throw new Error('Cancha no encontrada');
    if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) {
      throw new Error('El importe del turno es inválido.');
    }

    const courtProfile = getBusinessProfileForCourt(court);
    const ownerAdminId = getAdminIdForCourt(court) || normalizeAdminKey(currentAdminUser?.username) || 'admin';
    const bookingStatus = input.status || 'confirmed';
    const fixedDurationMinutes = 60;
    const endTime = calculateEndTime(input.startTime, fixedDurationMinutes);

    // Prevent double booking on overlapping active slots (midnight-safe order)
    const startH = parseSlotHourOrder(input.startTime);
    const endH = startH + 1;
    const hasCollision = bookings.some(b => {
      if (b.courtId !== input.courtId || b.date !== input.date) return false;
      if (b.status !== 'confirmed' && b.status !== 'pending_payment' && b.status !== 'awaiting_approval') return false;
      const bStart = parseSlotHourOrder(b.startTime);
      const rawEnd = parseSlotHourOrder(b.endTime);
      const bEnd = rawEnd > bStart ? rawEnd : bStart + Math.max(1, Math.ceil((b.durationMinutes || 60) / 60));
      return startH < bEnd && endH > bStart;
    });
    if (hasCollision) {
      throw new Error('Este horario acaba de ser reservado. Por favor elegí otro turno disponible.');
    }

    // Security check for player online payments: reject paused or unconfigured payment methods
    if (!isAdminAuthenticated) {
      if (input.paymentMethod === 'mercadopago') {
        if (courtProfile.mpPaused) {
          throw new Error('El complejo pausó temporalmente los pagos con Mercado Pago.');
        }
        const mpConfigured = Boolean(
          courtProfile.mpOAuthConnected ||
          courtProfile.mpAccessToken ||
          courtProfile.alias?.trim() ||
          (courtProfile.mpLink && courtProfile.mpLink.trim().startsWith('http'))
        );
        if (!mpConfigured) {
          throw new Error('El complejo no tiene Mercado Pago configurado.');
        }
      }
      if (input.paymentMethod === 'transferencia') {
        if (courtProfile.transferPaused) {
          throw new Error('El complejo pausó temporalmente las transferencias bancarias.');
        }
        if (!courtProfile.cbu?.trim() && !courtProfile.alias?.trim()) {
          throw new Error('El complejo no cargó CBU ni Alias para recibir transferencias.');
        }
      }
    }

    const amountPaid = bookingStatus === 'pending_payment'
      ? 0
      : (input.isDepositOnly ? Math.round(input.totalAmount * 0.5) : input.totalAmount);
    const balanceDue = input.totalAmount - amountPaid;
    const paymentStatus: PaymentStatus = bookingStatus === 'pending_payment'
      ? 'pendiente_mostrador'
      : (input.isDepositOnly ? 'seña_pagada' : 'total_pagado');
    const bookingCode = `PMY-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `bk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingCode,
      courtId: input.courtId,
      courtName: court.name,
      establishment: court.establishment || courtProfile.complexName || '',
      sport: court.sport,
      date: input.date,
      startTime: input.startTime,
      endTime,
      durationMinutes: fixedDurationMinutes,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      clientEmail: input.clientEmail,
      notes: input.notes,
      totalAmount: input.totalAmount,
      amountPaid,
      balanceDue,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      isDepositOnly: input.isDepositOnly,
      paymentReference: input.paymentReference || (bookingStatus === 'pending_payment' ? undefined : `TR-${Math.floor(1000000000 + Math.random() * 9000000000)}`),
      status: bookingStatus,
      createdAt: new Date().toISOString(),
      whatsappSent: bookingStatus === 'confirmed',
      whatsappSentAt: bookingStatus === 'confirmed' ? new Date().toISOString() : undefined,
      adminId: ownerAdminId,
    };

    const nextBookings = [newBooking, ...bookings];
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    
    // Save to Firestore
    saveBookingToFirestore(newBooking);

    // Save client info locally
    setUserPhone(input.clientPhone);
    setUserName(input.clientName);
    setUserEmail(input.clientEmail);

    if (bookingStatus === 'confirmed') {
      // Auto record WhatsApp log
      const log: WhatsAppNotificationLog = {
        id: `wa-${Date.now()}`,
        bookingCode,
        recipientName: input.clientName,
        recipientPhone: input.clientPhone,
        messagePreview: `¡Hola ${input.clientName}! Tu turno en ${court.name} está CONFIRMADO para el ${input.date} a las ${input.startTime} hs. Total: $${input.totalAmount.toLocaleString('es-AR')}.`,
        sentAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
        status: 'delivered',
        adminId: ownerAdminId,
        courtId: court.id
      };
      setWhatsappLogs(prev => {
        const next = [log, ...prev];
        try { localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(next)); } catch {}
        return next;
      });

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
    }

    return newBooking;
  }, [courts, getBusinessProfileForCourt, getAdminIdForCourt, bookings, currentAdminUser, isAdminAuthenticated]);

  // Submit payment receipt (for manual Mercado Pago Alias/Link or CBU)
  const submitPaymentReceipt = useCallback((bookingCodeOrId: string, receiptUrl: string, paymentReference?: string): Booking | undefined => {
    let targetBooking = bookings.find(b => b.bookingCode === bookingCodeOrId || b.id === bookingCodeOrId);
    if (!targetBooking) return undefined;

    const updated: Booking = {
      ...targetBooking,
      status: 'awaiting_approval',
      receiptUrl,
      paymentReference: paymentReference || targetBooking.paymentReference,
    };

    const nextBookings = bookings.map(b => (b.id === targetBooking!.id || b.bookingCode === targetBooking!.bookingCode) ? updated : b);
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    saveBookingToFirestore(updated);
    
    return updated;
  }, [bookings]);

  // Confirm booking payment (e.g. from Mercado Pago return, Webhook, or Admin Manual Verification)
  const confirmBookingPayment = useCallback((bookingCodeOrId: string, paymentReference: string, paidAmount?: number): Booking | undefined => {
    let targetBooking = bookings.find(b => b.bookingCode === bookingCodeOrId || b.id === bookingCodeOrId);
    if (!targetBooking) {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
        if (raw) {
          const list: Booking[] = JSON.parse(raw);
          targetBooking = list.find(b => b.bookingCode === bookingCodeOrId || b.id === bookingCodeOrId);
        }
      } catch {}
    }
    if (!targetBooking) return undefined;

    // Avoid duplicate confirmations if already confirmed with the same reference
    if (targetBooking.status === 'confirmed' && targetBooking.paymentReference === paymentReference) {
      return targetBooking;
    }

    const defaultPaid = targetBooking.isDepositOnly ? Math.round(targetBooking.totalAmount * 0.5) : targetBooking.totalAmount;
    const amountPaid = paidAmount !== undefined && paidAmount > 0 ? paidAmount : defaultPaid;
    const balanceDue = Math.max(0, targetBooking.totalAmount - amountPaid);
    const paymentStatus: PaymentStatus = balanceDue === 0 ? 'total_pagado' : 'seña_pagada';
    const court = courts.find(c => c.id === targetBooking!.courtId);
    const ownerAdminId = normalizeAdminKey(targetBooking.adminId) || getAdminIdForCourt(court);

    const confirmed: Booking = {
      ...targetBooking,
      status: 'confirmed',
      paymentStatus,
      amountPaid,
      balanceDue,
      paymentReference,
      adminId: ownerAdminId || targetBooking.adminId,
      whatsappSent: true,
      whatsappSentAt: new Date().toISOString()
    };

    const nextBookings = bookings.map(b => (b.id === targetBooking!.id || b.bookingCode === targetBooking!.bookingCode) ? confirmed : b);
    if (!bookings.some(b => b.id === targetBooking!.id || b.bookingCode === targetBooking!.bookingCode)) {
      nextBookings.unshift(confirmed);
    }
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    saveBookingToFirestore(confirmed);

    // Confetti celebration
    try {
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } catch {}

    // Auto record WhatsApp log and open message
    const preview = generateWhatsAppMessage(confirmed);
    const log: WhatsAppNotificationLog = {
      id: `wa-${Date.now()}`,
      bookingCode: confirmed.bookingCode,
      recipientName: confirmed.clientName,
      recipientPhone: confirmed.clientPhone,
      messagePreview: preview.slice(0, 160) + '...',
      sentAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'delivered',
      adminId: ownerAdminId,
      courtId: confirmed.courtId
    };
    setWhatsappLogs(prev => {
      if (prev.some(l => l.bookingCode === confirmed.bookingCode)) return prev;
      const next = [log, ...prev];
      try { localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(next)); } catch {}
      return next;
    });

    // If it's the admin confirming a pending payment, trigger the WhatsApp send
    if (isAdminAuthenticated) {
      const cleanPhone = confirmed.clientPhone.replace(/\D/g, '');
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(preview)}`;
      window.open(url, '_blank');
    }

    return confirmed;
  }, [bookings, courts, getAdminIdForCourt, isAdminAuthenticated, generateWhatsAppMessage]);

  // Admin Manual Booking
  const createManualAdminBooking = useCallback((input: BookingInput): Booking => {
    return createBooking(input);
  }, [createBooking]);

  // Cancel booking with automatic Mercado Pago refund & admin visual confirmation support
  const cancelBooking = useCallback(async (
    bookingId: string,
    options?: { forceManual?: boolean; notifyWhatsApp?: boolean }
  ) => {
    const booking = bookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
    if (!booking) {
      return { success: false, mpRefunded: false, refundAmount: 0, message: 'Turno no encontrado.' };
    }

    const paidAmount = Number(booking.amountPaid) || 0;
    const court = courts.find(c => c.id === booking.courtId);
    const ownerAdminId = normalizeAdminKey(booking.adminId) || getAdminIdForCourt(court);

    let mpRefunded = false;
    let manualRefundRequired = paidAmount > 0 && booking.paymentMethod !== 'mercadopago';
    let refundId = paidAmount > 0 ? `DEV-${Date.now().toString().slice(-6)}` : '';
    let resultMessage = '';

    // Request real Mercado Pago refund if paid online via Mercado Pago
    if (paidAmount > 0 && booking.paymentMethod === 'mercadopago' && !options?.forceManual) {
      try {
        const resp = await apiFetch('/api/mercadopago/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            bookingCode: booking.bookingCode,
            paymentReference: booking.paymentReference,
            amountPaid: paidAmount,
            adminId: ownerAdminId
          })
        });
        const data = await safeParseJsonResponse(resp);
        if (!resp.ok || !data?.ok) {
          return {
            success: false,
            mpRefunded: false,
            refundAmount: paidAmount,
            message: data?.error || 'Mercado Pago rechazó la devolución automática.'
          };
        }

        mpRefunded = Boolean(data.mpRefunded);
        manualRefundRequired = Boolean(data.manualRefundRequired);
        if (data.refundId) refundId = String(data.refundId);
        if (data.message) resultMessage = String(data.message);
      } catch (err: any) {
        return {
          success: false,
          mpRefunded: false,
          refundAmount: paidAmount,
          message: err?.message || 'Error de conexión al intentar devolver el pago en Mercado Pago.'
        };
      }
    }

    const targetBooking: Booking = {
      ...booking,
      status: 'cancelled',
      paymentStatus: paidAmount > 0 ? 'reembolsado' : booking.paymentStatus,
      refundAmount: paidAmount,
      refundedAt: new Date().toISOString(),
      refundReference: refundId || undefined
    };

    const updated = bookings.map(b => b.id === booking.id ? targetBooking : b);
    setBookings(updated);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));
    } catch {}
    await saveBookingToFirestore(targetBooking);

    // Record WhatsApp refund notification log and optionally open WhatsApp
    if (paidAmount > 0 || options?.notifyWhatsApp) {
      const courtProfile = getBusinessProfileForCourt(court);
      const complexName = booking.establishment || courtProfile.complexName || 'DeportesPMY';
      const refundText = paidAmount > 0
        ? `Hola ${booking.clientName}, te informamos que tu turno #${booking.bookingCode} en *${complexName}* (${booking.courtName}, ${booking.date} ${booking.startTime} hs) fue *CANCELADO*. ${mpRefunded ? `Ya procesamos la devolución automática de *$${paidAmount.toLocaleString('es-AR')}* a tu cuenta de Mercado Pago (Ref: ${refundId}).` : `Corresponde la devolución de *$${paidAmount.toLocaleString('es-AR')}* abonados (Ref: ${refundId}).`}`
        : `Hola ${booking.clientName}, te informamos que tu reserva #${booking.bookingCode} en *${complexName}* (${booking.courtName}, ${booking.date} ${booking.startTime} hs) fue cancelada y el horario quedó liberado.`;

      const log: WhatsAppNotificationLog = {
        id: `wa-ref-${Date.now()}`,
        bookingCode: booking.bookingCode,
        recipientName: booking.clientName,
        recipientPhone: booking.clientPhone,
        messagePreview: refundText.slice(0, 160) + (refundText.length > 160 ? '...' : ''),
        sentAt: new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }),
        status: 'delivered',
        adminId: ownerAdminId,
        courtId: booking.courtId
      };
      setWhatsappLogs(prev => {
        const next = [log, ...prev];
        try { localStorage.setItem(STORAGE_KEYS.WHATSAPP, JSON.stringify(next)); } catch {}
        return next;
      });

      if (options?.notifyWhatsApp && booking.clientPhone) {
        const cleanPhone = booking.clientPhone.replace(/\D/g, '');
        if (cleanPhone) {
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(refundText)}`, '_blank');
        }
      }
    }

    return {
      success: true,
      mpRefunded,
      manualRefundRequired,
      refundAmount: paidAmount,
      refundId: refundId || undefined,
      message: resultMessage || (mpRefunded
        ? `Turno cancelado y $${paidAmount.toLocaleString('es-AR')} devueltos automáticamente por Mercado Pago.`
        : paidAmount > 0
        ? `Turno cancelado y marcado como reembolsado ($${paidAmount.toLocaleString('es-AR')}).`
        : 'Turno cancelado y horario liberado.')
    };
  }, [bookings, courts, getAdminIdForCourt, getBusinessProfileForCourt]);

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
  const blockTimeSlot = useCallback((courtId: string, date: string, startTime: string, _durationMinutes: number, reason: string) => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    const fixedDurationMinutes = 60;
    const endTime = calculateEndTime(startTime, fixedDurationMinutes);
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
      durationMinutes: fixedDurationMinutes,
      clientName: `[BLOQUEADO: ${reason}]`,
      clientPhone: businessProfile.whatsappNumber,
      clientEmail: businessProfile.email,
      notes: reason,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      paymentMethod: 'efectivo_mostrador',
      paymentStatus: 'total_pagado',
      isDepositOnly: false,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      whatsappSent: false,
      adminId: getAdminIdForCourt(court) || normalizeAdminKey(currentAdminUser?.username) || 'admin',
    };

    const nextBookings = [blockedBooking, ...bookings];
    setBookings(nextBookings);
    saveBookingToFirestore(blockedBooking);
  }, [courts, businessProfile, bookings, getAdminIdForCourt, currentAdminUser]);

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

  // Generate Slots for a Court on a specific Date using court's custom open/close hours
  const getSlotsForCourtAndDate = useCallback((courtId: string, date: string): TimeSlot[] => {
    const court = courts.find(c => c.id === courtId);
    if (!court) return [];

    const { openHour, closeHour, nightStartHour } = getNormalizedCourtSchedule(court);
    const hourOrders: number[] = [];
    for (let h = openHour; h <= closeHour; h++) {
      hourOrders.push(h);
    }

    const activeBookings = bookings.filter(b => {
      if (b.courtId !== courtId || b.date !== date) return false;
      if (b.status === 'confirmed' || b.status === 'pending_payment' || b.status === 'awaiting_approval') return true;
      return false;
    });

    return hourOrders.map((hourNum) => {
      const hourStr = formatSlotHour(hourNum);
      const isNight = hourNum >= nightStartHour;
      const price = isNight ? court.hourlyRateNight : court.hourlyRateDay;
      const endTime = formatSlotHour(hourNum + 1);

      // Check if slot overlaps with any active booking
      const matchingBooking = activeBookings.find(b => {
        const bStartHour = parseSlotHourOrder(b.startTime);
        const rawEndHour = parseSlotHourOrder(b.endTime);
        const bEndHour = rawEndHour > bStartHour
          ? rawEndHour
          : bStartHour + Math.max(1, Math.ceil((b.durationMinutes || 60) / 60));
        return hourNum >= bStartHour && hourNum < bEndHour;
      });

      let status: SlotStatus = 'available';
      let blockedReason: string | undefined = undefined;

      if (matchingBooking) {
        if (matchingBooking.clientName.startsWith('[BLOQUEADO')) {
          status = 'blocked';
          blockedReason = matchingBooking.notes;
        } else if (matchingBooking.status === 'pending_payment' || matchingBooking.status === 'awaiting_approval') {
          status = 'pending';
        } else {
          status = 'booked';
        }
      }

      return {
        id: `${courtId}-${date}-${hourStr}`,
        courtId,
        date,
        startTime: hourStr,
        endTime,
        price,
        status,
        bookingId: matchingBooking?.id,
        blockedReason,
      };
    });
  }, [courts, bookings]);

  // Compute Dynamic Monthly Stats (strictly scoped by adminId for complex admins)
  const getMonthlyStats = useCallback((monthKey: string): MonthlyStats => {
    const sourceBookings = (currentAdminUser && !isSuperAdmin) ? adminBookings : bookings;
    const sourceCourts = (currentAdminUser && !isSuperAdmin) ? adminCourts : courts;

    const monthBookings = sourceBookings.filter(
      b => b.date.startsWith(monthKey) && b.status === 'confirmed' && !b.clientName.startsWith('[BLOQUEADO')
    );

    const totalRevenue = monthBookings.reduce((sum, b) => sum + b.amountPaid, 0);
    const totalBookings = monthBookings.length;
    const totalHoursPlayed = Math.round(monthBookings.reduce((sum, b) => sum + (b.durationMinutes || 60) / 60, 0) * 10) / 10;

    // Average occupancy rate across days in month & dynamic complex court hours
    const dailyTotalSlots = sourceCourts.reduce((acc, c) => acc + getCourtHoursRange(c).length, 0);
    const maxSlotsPerMonth = Math.max(1, dailyTotalSlots * 30);
    const averageOccupancyRate = totalBookings > 0
      ? Math.min(100, Math.round((totalBookings / maxSlotsPerMonth) * 100))
      : 0;

    const sportNames: Record<SportType, string> = {
      futbol5: 'Fútbol 5',
      padel: 'Pádel',
      futbol7: 'Fútbol 7',
      tenis: 'Tenis',
      basquet: 'Básquetbol',
    };

    const sportBreakdown = (['futbol5', 'padel', 'futbol7', 'tenis', 'basquet'] as SportType[]).map(sp => {
      const list = monthBookings.filter(b => b.sport === sp);
      const rev = list.reduce((s, b) => s + b.amountPaid, 0);
      return {
        sport: sp,
        sportName: sportNames[sp],
        bookingsCount: list.length,
        revenue: rev,
        percentage: totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0,
      };
    });

    const hourMap = new Map<string, number>();
    monthBookings.forEach(b => {
      const hr = `${b.startTime} hs`;
      hourMap.set(hr, (hourMap.get(hr) || 0) + 1);
    });
    const peakHours = Array.from(hourMap.entries())
      .map(([hour, bookingsCount]) => ({ hour, bookingsCount }))
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, 6);

    const clientMap = new Map<string, { name: string; phone: string; bookingsCount: number; totalSpent: number }>();
    monthBookings.forEach(b => {
      const key = (b.clientPhone || b.clientName).trim().toLowerCase();
      const prev = clientMap.get(key) || { name: b.clientName, phone: b.clientPhone, bookingsCount: 0, totalSpent: 0 };
      prev.bookingsCount += 1;
      prev.totalSpent += b.amountPaid;
      clientMap.set(key, prev);
    });
    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8);

    return {
      month: monthKey,
      monthLabel: monthKey,
      totalRevenue,
      totalBookings,
      totalHoursPlayed,
      averageOccupancyRate,
      sportBreakdown,
      peakHours,
      dailyRevenue: [],
      topClients,
    };
  }, [currentAdminUser, isSuperAdmin, adminBookings, adminCourts, bookings, courts]);

  // Export / Import / Reset Database
  const exportDatabaseJson = useCallback((): string => {
    const isScoped = Boolean(currentAdminUser && !isSuperAdmin);
    const scopedCourts = isScoped ? adminCourts : courts;
    const scopedCourtIds = new Set(scopedCourts.map(c => c.id));
    const payload = {
      version: '5.0',
      exportedAt: new Date().toISOString(),
      adminId: currentAdminUser?.username || 'global',
      businessProfile,
      courts: scopedCourts,
      bookings: isScoped ? adminBookings : bookings,
      reviews: isScoped ? reviews.filter(r => scopedCourtIds.has(r.courtId)) : reviews,
      whatsappLogs: isScoped ? adminWhatsappLogs : whatsappLogs,
    };
    return JSON.stringify(payload, null, 2);
  }, [currentAdminUser, isSuperAdmin, businessProfile, adminCourts, adminBookings, adminWhatsappLogs, courts, bookings, reviews, whatsappLogs]);

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
    adminCourts,
    adminBookings,
    adminWhatsappLogs,
    reviews,
    whatsappLogs,
    businessProfile,
    profilesByAdmin,
    getAdminIdForCourt,
    getBusinessProfileForCourt,
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
    selectedEstablishmentKey,
    setSelectedEstablishmentKey,
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
    toggleAdminPaymentPause,
    updateDeveloperContact,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    toggleAdminUserStatus,
    createBooking,
    submitPaymentReceipt,
    confirmBookingPayment,
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
    adminCourts,
    adminBookings,
    adminWhatsappLogs,
    reviews,
    whatsappLogs,
    businessProfile,
    profilesByAdmin,
    getAdminIdForCourt,
    getBusinessProfileForCourt,
    developerContact,
    admins,
    selectedDate,
    selectedSport,
    searchQuery,
    activeTab,
    selectedEstablishmentKey,
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
    toggleAdminPaymentPause,
    updateDeveloperContact,
    addAdminUser,
    updateAdminUser,
    deleteAdminUser,
    toggleAdminUserStatus,
    createBooking,
    submitPaymentReceipt,
    confirmBookingPayment,
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
