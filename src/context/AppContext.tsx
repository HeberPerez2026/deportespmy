import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  DeveloperContact,
  SiteContent,
  PushSubscriptionRecord,
  FilterTag,
  AvailablePlayer,
  JoinedPlayer,
  Tournament,
  TournamentTeam
} from '../types';
import { 
  INITIAL_COURTS, 
  INITIAL_BOOKINGS, 
  INITIAL_REVIEWS, 
  INITIAL_WHATSAPP_LOGS, 
  DEFAULT_BUSINESS_PROFILE,
  EMPTY_BUSINESS_PROFILE,
  DEFAULT_DEVELOPER_CONTACT,
  DEFAULT_SITE_CONTENT,
  INITIAL_ADMINS,
  getIsoDate,
  DEFAULT_FILTER_TAGS
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
  deleteReviewFromFirestore,
  subscribeToBusinessProfile,
  subscribeToAllProfiles,
  saveBusinessProfileToFirestore,
  subscribeToDeveloperContact,
  saveDeveloperContactToFirestore,
  subscribeToSiteContent,
  saveSiteContentToFirestore,
  subscribeToAdmins,
  saveAdminUserToFirestore,
  deleteAdminUserFromFirestore,
  fetchAllCollectionDocs,
  subscribeToPushSubscriptions,
  subscribeToAvailablePlayers,
  saveAvailablePlayerToFirestore,
  deleteAvailablePlayerFromFirestore,
  subscribeToTournaments,
  saveTournamentToFirestore,
  deleteTournamentFromFirestore
} from '../services/centralSync';
import {
  isPushSupported,
  getNotificationPermissionState,
  getOrCreatePushDeviceId,
  getTrackedBookingCodes,
  addTrackedBookingCode,
  getStoredPushEnabled,
  registerPushServiceWorker,
  enableDevicePushNotifications,
  disableDevicePushNotifications,
  syncTrackedBookingWithPush,
  sendBookingPushNotification,
  sendMatchLookingForPlayersPush,
  sendPlayerJoinedMatchPush,
  sendPlayerInviteMatchPush,
  showLocalServiceWorkerNotification,
} from '../services/pushNotifications';
import { testFirestoreConnection } from '../firebase';
import {
  formatSlotHour,
  getCourtHoursRange,
  getNormalizedCourtSchedule,
  normalizeCourtSchedule,
  parseSlotHourOrder,
} from '../utils/scheduleHours';
import { getSafeReceiptUrl } from '../utils/imageUpload';

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
  totalPlayers?: number;
  perPlayerAmount?: number;
  recurringGroupId?: string;
  recurringIndex?: number;
  recurringTotal?: number;
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
  siteContent: SiteContent;
  filterTags: FilterTag[];
  updateFilterTags: (tags: FilterTag[]) => Promise<void>;
  getSportLabel: (sportId: string) => string;
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

  // Developer Contact & Player Site Content Management (SuperAdmin only)
  updateDeveloperContact: (newContact: Partial<DeveloperContact>) => Promise<void>;
  updateSiteContent: (newContent: Partial<SiteContent>) => Promise<void>;
  resetSiteContent: () => Promise<void>;

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
  deleteReview: (reviewId: string) => Promise<void>;
  
  // Slots & Stats helpers
  getSlotsForCourtAndDate: (courtId: string, date: string) => TimeSlot[];
  getMonthlyStats: (monthKey: string) => MonthlyStats;
  
  // WhatsApp notification tools
  generateWhatsAppMessage: (booking: Booking) => string;
  getWhatsAppShareUrl: (booking: Booking) => string;
  triggerWhatsAppSend: (booking: Booking) => void;

  // Web Push (Service Worker) notifications
  pushSupported: boolean;
  pushPermission: NotificationPermission | 'unsupported';
  isPushEnabled: boolean;
  trackedBookingCodes: string[];
  enablePushNotifications: (opts?: {
    bookingCode?: string;
    clientPhone?: string;
    clientName?: string;
    silentWelcome?: boolean;
  }) => Promise<{
    ok: boolean;
    permission: NotificationPermission | 'unsupported';
    hasWebPushEndpoint: boolean;
    message: string;
  }>;
  disablePushNotifications: () => Promise<void>;
  sendManualBookingPush: (
    booking: Booking,
    customTitle?: string,
    customBody?: string
  ) => Promise<{ ok: boolean; sentCount: number; matchedCount: number }>;
  hasBookingPushSubscription: (booking: Booking) => boolean;

  // Matchmaking: Missing players & daily available players list
  availablePlayers: AvailablePlayer[];
  myAvailablePlayerId: string | null;
  requestPlayersForBooking: (
    bookingId: string,
    missingCount: number,
    message?: string
  ) => Promise<{
    ok: boolean;
    booking?: Booking;
    pushResult: { ok: boolean; sentCount: number; matchedCount: number };
  }>;
  stopLookingForPlayers: (bookingId: string) => Promise<void>;
  joinMatchBooking: (
    bookingId: string,
    player: { name: string; phone: string; email?: string; notes?: string }
  ) => Promise<{
    ok: boolean;
    booking?: Booking;
    remainingPlayers: number;
    pushSent: boolean;
    error?: string;
  }>;
  removeJoinedPlayerFromBooking: (bookingId: string, joinedPlayerId: string) => Promise<void>;
  registerAvailablePlayer: (input: {
    name: string;
    phone: string;
    preferredSports: SportType[];
    timePreference?: string;
    notes?: string;
  }) => Promise<AvailablePlayer>;
  unregisterAvailablePlayer: (playerId: string) => Promise<void>;
  inviteAvailablePlayerToBooking: (
    player: AvailablePlayer,
    booking: Booking
  ) => Promise<{ ok: boolean; sentCount: number }>;

  // Recurring weekly bookings (Turnos fijos / abonos)
  createRecurringAdminBookings: (
    input: BookingInput & { weeksCount: number }
  ) => Promise<{ createdBookings: Booking[]; skippedDates: string[] }>;
  cancelRecurringSeries: (recurringGroupId: string) => Promise<{ cancelledCount: number }>;

  // Self-service cancellation & rescheduling + Split costs
  getHoursUntilBookingStart: (booking: Booking) => number;
  rescheduleBooking: (
    bookingId: string,
    newDate: string,
    newStartTime: string
  ) => Promise<{ ok: boolean; booking?: Booking; message: string }>;
  cancelBookingByPlayer: (bookingId: string) => Promise<{
    success: boolean;
    mpRefunded: boolean;
    manualRefundRequired?: boolean;
    refundAmount: number;
    refundId?: string;
    message?: string;
  }>;
  toggleJoinedPlayerPayment: (bookingId: string, joinedPlayerId: string, amount?: number) => Promise<void>;
  updateBookingSplitConfig: (bookingId: string, totalPlayers: number) => Promise<void>;

  // Tournaments & Events
  tournaments: Tournament[];
  createTournament: (
    input: Omit<Tournament, 'id' | 'teams' | 'createdAt' | 'status'> & { status?: Tournament['status'] }
  ) => Promise<Tournament>;
  updateTournament: (tournament: Tournament) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  registerTeamInTournament: (
    tournamentId: string,
    team: Omit<TournamentTeam, 'id' | 'registeredAt'>
  ) => Promise<{ ok: boolean; message: string }>;
  toggleTournamentTeamPaid: (tournamentId: string, teamId: string) => Promise<void>;
  
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
  SITE_CONTENT: 'deportespmy_site_content_v1',
  ADMINS: 'deportespmy_admins_v6',
  USER_PHONE: 'deportespmy_user_phone',
  USER_NAME: 'deportespmy_user_name',
  USER_EMAIL: 'deportespmy_user_email',
  CURRENT_ADMIN: 'deportespmy_current_admin_v6',
  TOURNAMENTS: 'deportespmy_tournaments_v1',
};

const STORAGE_MY_AVAILABLE_ID = 'deportespmy_my_available_player_id_v1';

const normalizeAdminKey = (val?: string | null): string =>
  (val || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

export const getLocalDayDateString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getEndOfLocalDayIso = (): string => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
};

const isAvailablePlayerActiveToday = (player: AvailablePlayer, nowMs: number, todayStr: string): boolean => {
  if (!player || player.date !== todayStr) return false;
  const expMs = Date.parse(player.expiresAt);
  if (Number.isNaN(expMs)) return false;
  return expMs > nowMs;
};

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

  // Site Content State (SuperAdmin editable, all player-view texts)
  const [siteContent, setSiteContent] = useState<SiteContent>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SITE_CONTENT);
      return saved ? { ...DEFAULT_SITE_CONTENT, ...JSON.parse(saved) } : DEFAULT_SITE_CONTENT;
    } catch {
      return DEFAULT_SITE_CONTENT;
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

  // Web Push Notifications State
  const pushSupported = isPushSupported();
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermissionState()
  );
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(() => {
    const perm = getNotificationPermissionState();
    return perm === 'granted' && getStoredPushEnabled();
  });
  const [trackedBookingCodes, setTrackedBookingCodes] = useState<string[]>(() => getTrackedBookingCodes());
  const [pushSubscriptions, setPushSubscriptions] = useState<PushSubscriptionRecord[]>([]);
  const [rawAvailablePlayers, setRawAvailablePlayers] = useState<AvailablePlayer[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TOURNAMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dayTick, setDayTick] = useState<number>(() => Date.now());
  const [myAvailablePlayerIdState, setMyAvailablePlayerIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_MY_AVAILABLE_ID);
    } catch {
      return null;
    }
  });
  const prevBookingStatusRef = useRef<
    Map<
      string,
      {
        status: string;
        paymentStatus: string;
        joinedCount: number;
        lookingForPlayers: boolean;
        lookingUpdatedAt?: string;
      }
    >
  >(new Map());

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

    // 6b. Subscribe to editable Site Content (for player views)
    const unsubSiteContent = subscribeToSiteContent((remoteContent) => {
      const merged: SiteContent = { ...DEFAULT_SITE_CONTENT, ...remoteContent };
      setSiteContent(merged);
      try {
        localStorage.setItem(STORAGE_KEYS.SITE_CONTENT, JSON.stringify(merged));
      } catch {}
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

    // 8. Subscribe to Push Subscriptions (para que el panel sepa si el jugador activó Push)
    const unsubPushSubs = subscribeToPushSubscriptions((remoteSubs) => {
      setPushSubscriptions(remoteSubs);
    });

    // 9. Subscribe to Available Players (lista diaria hasta fin del día)
    const unsubAvailablePlayers = subscribeToAvailablePlayers((remotePlayers) => {
      const nowMs = Date.now();
      const todayStr = getLocalDayDateString();
      const active: AvailablePlayer[] = [];
      remotePlayers.forEach((p) => {
        if (isAvailablePlayerActiveToday(p, nowMs, todayStr)) {
          active.push(p);
        } else if (p.id) {
          deleteAvailablePlayerFromFirestore(p.id).catch(() => {});
        }
      });
      setRawAvailablePlayers(active);
    });

    // 10. Subscribe to Tournaments & Events
    const unsubTournaments = subscribeToTournaments((remoteTournaments) => {
      setTournaments(remoteTournaments);
      try {
        localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(remoteTournaments));
      } catch {}
    });

    return () => {
      unsubCourts();
      unsubBookings();
      unsubReviews();
      unsubProfile();
      unsubAllProfiles();
      unsubDevContact();
      unsubSiteContent();
      unsubAdmins();
      unsubPushSubs();
      unsubAvailablePlayers();
      unsubTournaments();
    };
  }, [currentAdminUser?.username]);

  // Refrescar expiración diaria de jugadores disponibles cada 60 segundos (limpia al cambiar de día 00:00)
  useEffect(() => {
    const timer = setInterval(() => {
      const nowMs = Date.now();
      const todayStr = getLocalDayDateString();
      setDayTick(nowMs);
      setRawAvailablePlayers((prev) => {
        const expired = prev.filter((p) => !isAvailablePlayerActiveToday(p, nowMs, todayStr));
        if (expired.length === 0) return prev;
        expired.forEach((p) => {
          deleteAvailablePlayerFromFirestore(p.id).catch(() => {});
        });
        return prev.filter((p) => isAvailablePlayerActiveToday(p, nowMs, todayStr));
      });
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Registrar Service Worker al iniciar y sincronizar permisos Push
  useEffect(() => {
    if (!pushSupported) return;
    registerPushServiceWorker().then(async (reg) => {
      const currentPerm = getNotificationPermissionState();
      setPushPermission(currentPerm);
      if (currentPerm === 'granted' && getStoredPushEnabled()) {
        setIsPushEnabled(true);
        if (reg && 'pushManager' in reg) {
          const existing = await reg.pushManager.getSubscription().catch(() => null);
          if (!existing) {
            enableDevicePushNotifications({ silentWelcome: true }).catch(() => {});
          }
        }
      }
    });
  }, [pushSupported]);

  // Detectar cambios en reservas seguidas y novedades de matchmaking (aviso local por SW y banner en vivo)
  useEffect(() => {
    const myDeviceId = getOrCreatePushDeviceId();
    const prevMap = prevBookingStatusRef.current;

    if (prevMap.size === 0) {
      bookings.forEach((b) => {
        prevMap.set(b.id, {
          status: b.status,
          paymentStatus: b.paymentStatus,
          joinedCount: b.joinedPlayers?.length || 0,
          lookingForPlayers: Boolean(b.lookingForPlayers),
          lookingUpdatedAt: b.lookingForPlayersUpdatedAt,
        });
      });
      return;
    }

    const canNotifyLocally =
      !isAdminAuthenticated &&
      pushSupported &&
      Notification.permission === 'granted' &&
      isPushEnabled;

    bookings.forEach((b) => {
      const prev = prevMap.get(b.id);
      const currentJoinedCount = b.joinedPlayers?.length || 0;
      const isLookingNow = Boolean(b.lookingForPlayers) && b.status !== 'cancelled';
      const isMine =
        b.pushDeviceId === myDeviceId ||
        trackedBookingCodes.includes((b.bookingCode || '').toUpperCase());

      if (prev) {
        if (prev.status !== b.status || prev.paymentStatus !== b.paymentStatus) {
          if (canNotifyLocally && isMine) {
            if (b.status === 'confirmed' && prev.status !== 'confirmed') {
              showLocalServiceWorkerNotification({
                title: `Turno confirmado #${b.bookingCode}`,
                body: `${b.courtName} · ${b.date} ${b.startTime} hs. ${b.balanceDue > 0 ? `Saldo en cancha: $${b.balanceDue.toLocaleString('es-AR')}.` : 'Pago acreditado 100%.'}`,
                tag: `booking-${b.bookingCode}-payment_confirmed`,
                bookingCode: b.bookingCode,
                status: 'payment_confirmed',
              });
            } else if (b.status === 'cancelled' && prev.status !== 'cancelled') {
              showLocalServiceWorkerNotification({
                title: `Turno cancelado #${b.bookingCode}`,
                body: `${b.courtName} (${b.date} ${b.startTime} hs) fue cancelado.`,
                tag: `booking-${b.bookingCode}-booking_cancelled`,
                bookingCode: b.bookingCode,
                status: 'booking_cancelled',
              });
            } else if (b.paymentStatus === 'total_pagado' && prev.paymentStatus !== 'total_pagado') {
              showLocalServiceWorkerNotification({
                title: `Saldo completado #${b.bookingCode}`,
                body: `Tu turno en ${b.courtName} (${b.date} ${b.startTime} hs) quedó 100% pagado.`,
                tag: `booking-${b.bookingCode}-balance_paid`,
                bookingCode: b.bookingCode,
                status: 'balance_paid',
              });
            }
          }
        }

        // Notificación de retorno cuando alguien se suma a una reserva propia
        if (currentJoinedCount > prev.joinedCount && isMine && !isAdminAuthenticated) {
          const lastJoiner = b.joinedPlayers?.[currentJoinedCount - 1];
          const remaining = Math.max(0, (b.neededPlayers || 0) - currentJoinedCount);
          const title = `¡Se sumó ${lastJoiner?.name || 'un jugador'}! #${b.bookingCode}`;
          const body = `${b.courtName} (${b.date} ${b.startTime} hs). ${
            remaining > 0 ? `Ahora faltan ${remaining}.` : '¡Equipo completo!'
          }`;

          window.dispatchEvent(
            new CustomEvent('deportespmy:push_banner', {
              detail: { title, body, bookingCode: b.bookingCode },
            })
          );

          if (canNotifyLocally) {
            showLocalServiceWorkerNotification({
              title,
              body,
              tag: `match-joined-${b.bookingCode}-${currentJoinedCount}`,
              bookingCode: b.bookingCode,
              status: 'player_joined_match',
            });
          }
        }

        // Aviso a otros jugadores cuando un organizador publica que le faltan jugadores
        const lookingUpdated =
          isLookingNow &&
          (!prev.lookingForPlayers ||
            (b.lookingForPlayersUpdatedAt && b.lookingForPlayersUpdatedAt !== prev.lookingUpdatedAt));

        if (lookingUpdated && !isMine && !isAdminAuthenticated) {
          const remaining = Math.max(0, (b.neededPlayers || 0) - currentJoinedCount);
          if (remaining > 0 && canNotifyLocally) {
            const countLabel = remaining === 1 ? 'Falta 1 jugador' : `Faltan ${remaining} jugadores`;
            showLocalServiceWorkerNotification({
              title: `${countLabel} · ${b.courtName}`,
              body: `${b.date} ${b.startTime} hs · ${b.clientName} busca jugadores. Tocá para sumarte.`,
              tag: `match-lfp-${b.bookingCode}-${b.lookingForPlayersUpdatedAt || currentJoinedCount}`,
              bookingCode: b.bookingCode,
              joinBookingCode: b.bookingCode,
              status: 'looking_for_players',
            });
          }
        }
      }

      prevMap.set(b.id, {
        status: b.status,
        paymentStatus: b.paymentStatus,
        joinedCount: currentJoinedCount,
        lookingForPlayers: isLookingNow,
        lookingUpdatedAt: b.lookingForPlayersUpdatedAt,
      });
    });
  }, [bookings, isAdminAuthenticated, pushSupported, isPushEnabled, trackedBookingCodes]);

  const enablePushNotifications = useCallback(async (opts?: {
    bookingCode?: string;
    clientPhone?: string;
    clientName?: string;
    silentWelcome?: boolean;
  }) => {
    const res = await enableDevicePushNotifications({
      bookingCode: opts?.bookingCode,
      clientPhone: opts?.clientPhone || userPhone,
      clientName: opts?.clientName || userName,
      silentWelcome: opts?.silentWelcome,
    });
    setPushPermission(res.permission);
    setIsPushEnabled(res.ok);
    setTrackedBookingCodes(getTrackedBookingCodes());
    return res;
  }, [userPhone, userName]);

  const disablePushNotifications = useCallback(async () => {
    await disableDevicePushNotifications();
    setIsPushEnabled(false);
    setPushPermission(getNotificationPermissionState());
  }, []);

  const sendManualBookingPush = useCallback(async (
    booking: Booking,
    customTitle?: string,
    customBody?: string
  ) => {
    return sendBookingPushNotification({
      booking,
      eventType: 'admin_reminder',
      customTitle,
      customBody,
    });
  }, []);

  const hasBookingPushSubscription = useCallback((booking: Booking): boolean => {
    const codeUpper = (booking.bookingCode || '').trim().toUpperCase();
    const digits = (booking.clientPhone || '').replace(/\D/g, '').slice(-10);
    return pushSubscriptions.some((sub) => {
      if (!sub.enabled) return false;
      if (booking.pushDeviceId && sub.deviceId === booking.pushDeviceId) return true;
      if (codeUpper && sub.bookingCodes?.some((c) => c.trim().toUpperCase() === codeUpper)) return true;
      const subDigits = (sub.clientPhone || '').replace(/\D/g, '').slice(-10);
      if (digits && subDigits && digits === subDigits) return true;
      return false;
    });
  }, [pushSubscriptions]);

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

  // Update Site Content (SuperAdmin editable, player-view texts)
  const updateSiteContent = useCallback(async (partialContent: Partial<SiteContent>) => {
    const nextContent: SiteContent = {
      ...siteContent,
      ...partialContent
    };
    setSiteContent(nextContent);
    try {
      localStorage.setItem(STORAGE_KEYS.SITE_CONTENT, JSON.stringify(nextContent));
    } catch {}
    await saveSiteContentToFirestore(nextContent);
  }, [siteContent]);

  const filterTags = siteContent.filterTags || DEFAULT_FILTER_TAGS;

  const updateFilterTags = useCallback(async (tags: FilterTag[]) => {
    await updateSiteContent({ filterTags: tags });
  }, [updateSiteContent]);

  const getSportLabel = useCallback((sportId: string): string => {
    const tags = siteContent.filterTags || DEFAULT_FILTER_TAGS;
    const match = tags.find(t => t.id === sportId);
    return match ? match.label : sportId;
  }, [siteContent.filterTags]);

  const resetSiteContent = useCallback(async () => {
    setSiteContent(DEFAULT_SITE_CONTENT);
    try {
      localStorage.setItem(STORAGE_KEYS.SITE_CONTENT, JSON.stringify(DEFAULT_SITE_CONTENT));
    } catch {}
    await saveSiteContentToFirestore(DEFAULT_SITE_CONTENT);
  }, []);

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

    // Prevent double booking on overlapping active slots or tournament blocks
    const startH = parseSlotHourOrder(input.startTime);
    const endH = startH + 1;
    const hasBookingCollision = bookings.some(b => {
      if (b.courtId !== input.courtId || b.date !== input.date) return false;
      if (b.status !== 'confirmed' && b.status !== 'pending_payment' && b.status !== 'awaiting_approval') return false;
      const bStart = parseSlotHourOrder(b.startTime);
      const rawEnd = parseSlotHourOrder(b.endTime);
      const bEnd = rawEnd > bStart ? rawEnd : bStart + Math.max(1, Math.ceil((b.durationMinutes || 60) / 60));
      return startH < bEnd && endH > bStart;
    });
    const blockingTournament = tournaments.find(t => {
      if (!t.blockCourts || t.status === 'cancelled' || t.status === 'finished') return false;
      if (!t.courtIds.includes(input.courtId)) return false;
      const tEndDate = t.endDate || t.date;
      if (input.date < t.date || input.date > tEndDate) return false;
      const tStart = parseSlotHourOrder(t.startTime);
      const tEnd = parseSlotHourOrder(t.endTime);
      return startH < tEnd && endH > tStart;
    });
    if (hasBookingCollision || blockingTournament) {
      throw new Error(
        blockingTournament
          ? `Esta cancha está reservada para el torneo/evento "${blockingTournament.title}".`
          : 'Este horario acaba de ser reservado. Por favor elegí otro turno disponible.'
      );
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

    const depositPercent = Math.min(100, Math.max(10, Number(court.depositRequired) || 50));
    const amountPaid = bookingStatus === 'pending_payment'
      ? 0
      : (input.isDepositOnly ? Math.round(input.totalAmount * (depositPercent / 100)) : input.totalAmount);
    const balanceDue = input.totalAmount - amountPaid;
    const paymentStatus: PaymentStatus = bookingStatus === 'pending_payment'
      ? 'pendiente_mostrador'
      : (input.isDepositOnly ? 'seña_pagada' : 'total_pagado');
    const bookingCode = `PMY-${Math.floor(1000 + Math.random() * 9000)}`;
    const deviceId = !isAdminAuthenticated ? getOrCreatePushDeviceId() : undefined;
    const totalPlayers = input.totalPlayers && input.totalPlayers >= 2 ? Math.round(input.totalPlayers) : undefined;
    const perPlayerAmount = totalPlayers ? Math.round(input.totalAmount / totalPlayers) : undefined;

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
      ...(deviceId ? { pushDeviceId: deviceId } : {}),
      ...(totalPlayers ? { totalPlayers, perPlayerAmount } : {}),
      ...(input.recurringGroupId ? { recurringGroupId: input.recurringGroupId } : {}),
      ...(input.recurringIndex ? { recurringIndex: input.recurringIndex } : {}),
      ...(input.recurringTotal ? { recurringTotal: input.recurringTotal } : {}),
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

    if (!isAdminAuthenticated) {
      const updatedCodes = addTrackedBookingCode(bookingCode);
      setTrackedBookingCodes(updatedCodes);
      syncTrackedBookingWithPush({
        bookingCode,
        clientPhone: input.clientPhone,
        clientName: input.clientName,
      });
    }

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

      sendBookingPushNotification({ booking: newBooking, eventType: 'payment_confirmed' });
    } else if (!newBooking.clientName.startsWith('[BLOQUEADO')) {
      sendBookingPushNotification({ booking: newBooking, eventType: 'booking_created' });
    }

    return newBooking;
  }, [courts, getBusinessProfileForCourt, getAdminIdForCourt, bookings, tournaments, currentAdminUser, isAdminAuthenticated]);

  // Submit payment receipt (for manual Mercado Pago Alias/Link or CBU)
  const submitPaymentReceipt = useCallback((bookingCodeOrId: string, receiptUrl: string, paymentReference?: string): Booking | undefined => {
    let targetBooking = bookings.find(b => b.bookingCode === bookingCodeOrId || b.id === bookingCodeOrId);
    if (!targetBooking) return undefined;

    const updated: Booking = {
      ...targetBooking,
      status: 'awaiting_approval',
      receiptUrl: getSafeReceiptUrl(receiptUrl),
      paymentReference: paymentReference || targetBooking.paymentReference,
    };

    const nextBookings = bookings.map(b => (b.id === targetBooking!.id || b.bookingCode === targetBooking!.bookingCode) ? updated : b);
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    saveBookingToFirestore(updated);

    sendBookingPushNotification({ booking: updated, eventType: 'receipt_submitted' });
    
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

    sendBookingPushNotification({ booking: confirmed, eventType: 'payment_confirmed' });

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
      refundReference: refundId || undefined,
      lookingForPlayers: false,
      neededPlayers: 0,
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

    sendBookingPushNotification({
      booking: targetBooking,
      eventType: 'booking_cancelled',
      mpRefunded,
    });

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
      sendBookingPushNotification({ booking: targetBooking, eventType: 'balance_paid' });
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
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(nextReviews));
    } catch {}
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
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(nextReviews));
    } catch {}
    saveReviewReplyToFirestore(reviewId, adminReply);
  }, [reviews]);

  // Delete review (SuperAdmin moderation)
  const deleteReview = useCallback(async (reviewId: string) => {
    const nextReviews = reviews.filter(r => r.id !== reviewId);
    setReviews(nextReviews);
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(nextReviews));
    } catch {}
    await deleteReviewFromFirestore(reviewId);
  }, [reviews]);

  // Matchmaking: lista diaria de jugadores disponibles (expira al terminar el día local)
  const availablePlayers = useMemo(() => {
    const todayStr = getLocalDayDateString();
    return rawAvailablePlayers
      .filter((p) => isAvailablePlayerActiveToday(p, dayTick, todayStr))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [rawAvailablePlayers, dayTick]);

  const myAvailablePlayerId = useMemo(() => {
    const myDevId = getOrCreatePushDeviceId();
    const match = availablePlayers.find(
      (p) => (myAvailablePlayerIdState && p.id === myAvailablePlayerIdState) || (p.pushDeviceId && p.pushDeviceId === myDevId)
    );
    return match ? match.id : null;
  }, [availablePlayers, myAvailablePlayerIdState]);

  const requestPlayersForBooking = useCallback(async (
    bookingId: string,
    missingCount: number,
    message?: string
  ) => {
    const cleanMissing = Math.max(1, Math.min(22, Math.floor(Number(missingCount) || 1)));
    const target = bookings.find((b) => b.id === bookingId || b.bookingCode.toUpperCase() === bookingId.toUpperCase());
    if (!target || target.status === 'cancelled') {
      return { ok: false, pushResult: { ok: false, sentCount: 0, matchedCount: 0 } };
    }

    const myDevId = !isAdminAuthenticated ? getOrCreatePushDeviceId() : target.pushDeviceId;
    const currentJoined = target.joinedPlayers || [];
    const totalNeeded = currentJoined.length + cleanMissing;

    const updated: Booking = {
      ...target,
      lookingForPlayers: true,
      neededPlayers: totalNeeded,
      lookingForPlayersMessage: message?.trim() || '',
      lookingForPlayersUpdatedAt: new Date().toISOString(),
      ...(myDevId && !target.pushDeviceId ? { pushDeviceId: myDevId } : {}),
    };

    const nextBookings = bookings.map((b) => (b.id === target.id ? updated : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updated);

    if (!isAdminAuthenticated) {
      const updatedCodes = addTrackedBookingCode(updated.bookingCode);
      setTrackedBookingCodes(updatedCodes);
      syncTrackedBookingWithPush({
        bookingCode: updated.bookingCode,
        clientPhone: updated.clientPhone,
        clientName: updated.clientName,
      });
    }

    const pushResult = await sendMatchLookingForPlayersPush({
      booking: updated,
      missingPlayers: cleanMissing,
      message: updated.lookingForPlayersMessage,
    });

    return { ok: true, booking: updated, pushResult };
  }, [bookings, isAdminAuthenticated]);

  const stopLookingForPlayers = useCallback(async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId || b.bookingCode.toUpperCase() === bookingId.toUpperCase());
    if (!target) return;
    const updated: Booking = {
      ...target,
      lookingForPlayers: false,
      neededPlayers: target.joinedPlayers?.length || 0,
      lookingForPlayersUpdatedAt: new Date().toISOString(),
    };
    const nextBookings = bookings.map((b) => (b.id === target.id ? updated : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updated);
  }, [bookings]);

  const joinMatchBooking = useCallback(async (
    bookingId: string,
    player: { name: string; phone: string; email?: string; notes?: string }
  ) => {
    const target = bookings.find((b) => b.id === bookingId || b.bookingCode.toUpperCase() === bookingId.toUpperCase());
    if (!target || target.status === 'cancelled') {
      return { ok: false, remainingPlayers: 0, pushSent: false, error: 'Este turno ya no está disponible.' };
    }

    const currentJoined = target.joinedPlayers || [];
    const currentRemaining = target.lookingForPlayers
      ? Math.max(0, (target.neededPlayers || 0) - currentJoined.length)
      : 0;

    if (currentRemaining <= 0) {
      return { ok: false, remainingPlayers: 0, pushSent: false, error: 'Ya se completaron todos los lugares para este partido.' };
    }

    const cleanName = player.name.trim();
    const cleanPhone = player.phone.trim();
    if (!cleanName || !cleanPhone) {
      return { ok: false, remainingPlayers: currentRemaining, pushSent: false, error: 'Ingresá tu nombre y WhatsApp.' };
    }

    const newJoiner: JoinedPlayer = {
      id: `jp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: cleanName,
      phone: cleanPhone,
      email: player.email?.trim() || '',
      notes: player.notes?.trim() || '',
      pushDeviceId: getOrCreatePushDeviceId(),
      joinedAt: new Date().toISOString(),
    };

    const nextJoined = [...currentJoined, newJoiner];
    const remainingPlayers = Math.max(0, (target.neededPlayers || 0) - nextJoined.length);

    const updated: Booking = {
      ...target,
      joinedPlayers: nextJoined,
      lookingForPlayers: remainingPlayers > 0,
      lookingForPlayersUpdatedAt: new Date().toISOString(),
    };

    const nextBookings = bookings.map((b) => (b.id === target.id ? updated : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updated);

    setUserName(cleanName);
    setUserPhone(cleanPhone);
    if (player.email?.trim()) {
      setUserEmail(player.email.trim());
    }

    const pushRes = await sendPlayerJoinedMatchPush({
      booking: updated,
      playerName: cleanName,
      playerPhone: cleanPhone,
      remainingPlayers,
    });

    return {
      ok: true,
      booking: updated,
      remainingPlayers,
      pushSent: pushRes.sentCount > 0,
    };
  }, [bookings]);

  const removeJoinedPlayerFromBooking = useCallback(async (bookingId: string, joinedPlayerId: string) => {
    const target = bookings.find((b) => b.id === bookingId || b.bookingCode.toUpperCase() === bookingId.toUpperCase());
    if (!target) return;
    const nextJoined = (target.joinedPlayers || []).filter((p) => p.id !== joinedPlayerId);
    const remaining = Math.max(0, (target.neededPlayers || 0) - nextJoined.length);
    const updated: Booking = {
      ...target,
      joinedPlayers: nextJoined,
      lookingForPlayers: remaining > 0 ? Boolean(target.lookingForPlayers || (target.neededPlayers || 0) > nextJoined.length) : false,
      lookingForPlayersUpdatedAt: new Date().toISOString(),
    };
    const nextBookings = bookings.map((b) => (b.id === target.id ? updated : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updated);
  }, [bookings]);

  const registerAvailablePlayer = useCallback(async (input: {
    name: string;
    phone: string;
    preferredSports: SportType[];
    timePreference?: string;
    notes?: string;
  }): Promise<AvailablePlayer> => {
    const myDevId = getOrCreatePushDeviceId();
    const todayStr = getLocalDayDateString();
    const expiresAt = getEndOfLocalDayIso();
    const cleanId = `ap-${myDevId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}-${todayStr.replace(/-/g, '')}`;

    const entry: AvailablePlayer = {
      id: cleanId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      preferredSports: input.preferredSports.length > 0 ? input.preferredSports : ['futbol5'],
      timePreference: input.timePreference?.trim() || '',
      notes: input.notes?.trim() || '',
      date: todayStr,
      expiresAt,
      createdAt: new Date().toISOString(),
      pushDeviceId: myDevId,
    };

    setRawAvailablePlayers((prev) => [entry, ...prev.filter((p) => p.id !== entry.id)]);
    setMyAvailablePlayerIdState(entry.id);
    try {
      localStorage.setItem(STORAGE_MY_AVAILABLE_ID, entry.id);
    } catch {}
    setUserName(entry.name);
    setUserPhone(entry.phone);

    await saveAvailablePlayerToFirestore(entry);
    return entry;
  }, []);

  const unregisterAvailablePlayer = useCallback(async (playerId: string) => {
    setRawAvailablePlayers((prev) => prev.filter((p) => p.id !== playerId));
    if (myAvailablePlayerIdState === playerId) {
      setMyAvailablePlayerIdState(null);
      try {
        localStorage.removeItem(STORAGE_MY_AVAILABLE_ID);
      } catch {}
    }
    await deleteAvailablePlayerFromFirestore(playerId);
  }, [myAvailablePlayerIdState]);

  const inviteAvailablePlayerToBooking = useCallback(async (player: AvailablePlayer, booking: Booking) => {
    const missing = Math.max(1, (booking.neededPlayers || 1) - (booking.joinedPlayers?.length || 0));
    const res = await sendPlayerInviteMatchPush({
      booking,
      targetDeviceId: player.pushDeviceId,
      targetPhone: player.phone,
      missingPlayers: missing,
    });
    return { ok: res.ok, sentCount: res.sentCount };
  }, []);

  // Recurring weekly admin bookings (Turnos fijos / abonos)
  const createRecurringAdminBookings = useCallback(async (
    input: BookingInput & { weeksCount: number }
  ): Promise<{ createdBookings: Booking[]; skippedDates: string[] }> => {
    const court = courts.find(c => c.id === input.courtId);
    if (!court) throw new Error('Cancha no encontrada.');

    const weeksCount = Math.min(24, Math.max(2, Math.round(Number(input.weeksCount) || 4)));
    const courtProfile = getBusinessProfileForCourt(court);
    const ownerAdminId = getAdminIdForCourt(court) || normalizeAdminKey(currentAdminUser?.username) || 'admin';
    const fixedDurationMinutes = 60;
    const endTime = calculateEndTime(input.startTime, fixedDurationMinutes);
    const startH = parseSlotHourOrder(input.startTime);
    const endH = startH + 1;
    const recurringGroupId = `rec-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

    const [baseY, baseM, baseD] = input.date.split('-').map(Number);
    const baseUtc = Date.UTC(baseY, baseM - 1, baseD);

    const createdBookings: Booking[] = [];
    const skippedDates: string[] = [];

    for (let w = 0; w < weeksCount; w++) {
      const dt = new Date(baseUtc + w * 7 * 86400000);
      const dateStr = dt.toISOString().split('T')[0];

      const hasBookingCollision = [...bookings, ...createdBookings].some(b => {
        if (b.courtId !== input.courtId || b.date !== dateStr) return false;
        if (b.status !== 'confirmed' && b.status !== 'pending_payment' && b.status !== 'awaiting_approval') return false;
        const bStart = parseSlotHourOrder(b.startTime);
        const rawEnd = parseSlotHourOrder(b.endTime);
        const bEnd = rawEnd > bStart ? rawEnd : bStart + Math.max(1, Math.ceil((b.durationMinutes || 60) / 60));
        return startH < bEnd && endH > bStart;
      });

      const hasTournamentBlock = tournaments.some(t => {
        if (!t.blockCourts || t.status === 'cancelled' || t.status === 'finished') return false;
        if (!t.courtIds.includes(input.courtId)) return false;
        const tEndDate = t.endDate || t.date;
        if (dateStr < t.date || dateStr > tEndDate) return false;
        const tStart = parseSlotHourOrder(t.startTime);
        const tEnd = parseSlotHourOrder(t.endTime);
        return startH < tEnd && endH > tStart;
      });

      if (hasBookingCollision || hasTournamentBlock) {
        skippedDates.push(dateStr);
        continue;
      }

      const bookingStatus = input.status || 'confirmed';
      const depositPercent = Math.min(100, Math.max(10, Number(court.depositRequired) || 50));
      const amountPaid = bookingStatus === 'pending_payment'
        ? 0
        : (input.isDepositOnly ? Math.round(input.totalAmount * (depositPercent / 100)) : input.totalAmount);
      const balanceDue = input.totalAmount - amountPaid;
      const paymentStatus: PaymentStatus = bookingStatus === 'pending_payment'
        ? 'pendiente_mostrador'
        : (input.isDepositOnly ? 'seña_pagada' : 'total_pagado');
      const bookingCode = `PMY-${Math.floor(1000 + Math.random() * 9000)}`;
      const seriesLabel = `[Turno fijo ${w + 1}/${weeksCount}]`;
      const combinedNotes = input.notes?.trim() ? `${seriesLabel} ${input.notes.trim()}` : seriesLabel;

      const bk: Booking = {
        id: `bk-${Date.now()}-${w}-${Math.floor(Math.random() * 1000)}`,
        bookingCode,
        courtId: input.courtId,
        courtName: court.name,
        establishment: court.establishment || courtProfile.complexName || '',
        sport: court.sport,
        date: dateStr,
        startTime: input.startTime,
        endTime,
        durationMinutes: fixedDurationMinutes,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
        clientEmail: input.clientEmail,
        notes: combinedNotes,
        totalAmount: input.totalAmount,
        amountPaid,
        balanceDue,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        isDepositOnly: input.isDepositOnly,
        paymentReference: input.paymentReference || (bookingStatus === 'pending_payment' ? undefined : `ABONO-${w + 1}`),
        status: bookingStatus,
        createdAt: new Date().toISOString(),
        whatsappSent: bookingStatus === 'confirmed',
        whatsappSentAt: bookingStatus === 'confirmed' ? new Date().toISOString() : undefined,
        adminId: ownerAdminId,
        recurringGroupId,
        recurringIndex: w + 1,
        recurringTotal: weeksCount,
      };
      createdBookings.push(bk);
    }

    if (createdBookings.length > 0) {
      const nextBookings = [...createdBookings.slice().reverse(), ...bookings];
      setBookings(nextBookings);
      try {
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
      } catch {}
      await Promise.all(createdBookings.map((b) => saveBookingToFirestore(b)));
    }

    return { createdBookings, skippedDates };
  }, [courts, bookings, tournaments, getBusinessProfileForCourt, getAdminIdForCourt, currentAdminUser]);

  const cancelRecurringSeries = useCallback(async (recurringGroupId: string): Promise<{ cancelledCount: number }> => {
    const targets = bookings.filter(
      (b) => b.recurringGroupId === recurringGroupId && b.status !== 'cancelled' && b.status !== 'completed'
    );
    if (targets.length === 0) return { cancelledCount: 0 };

    const targetIds = new Set(targets.map((t) => t.id));
    const updatedList = bookings.map((b) =>
      targetIds.has(b.id)
        ? { ...b, status: 'cancelled' as const, lookingForPlayers: false, neededPlayers: 0 }
        : b
    );
    setBookings(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedList));
    } catch {}
    await Promise.all(
      updatedList
        .filter((b) => targetIds.has(b.id))
        .map((b) => saveBookingToFirestore(b))
    );
    return { cancelledCount: targets.length };
  }, [bookings]);

  const getHoursUntilBookingStart = useCallback((booking: Booking): number => {
    if (!booking?.date || !booking?.startTime) return 999;
    const kickoffMs = Date.parse(`${booking.date}T${booking.startTime}:00-03:00`);
    if (!Number.isFinite(kickoffMs)) return 999;
    return (kickoffMs - Date.now()) / 3600000;
  }, []);

  const rescheduleBooking = useCallback(async (
    bookingId: string,
    newDate: string,
    newStartTime: string
  ): Promise<{ ok: boolean; booking?: Booking; message: string }> => {
    const booking = bookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
    if (!booking) return { ok: false, message: 'Reserva no encontrada.' };
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return { ok: false, message: 'No es posible reprogramar un turno cancelado o finalizado.' };
    }

    const court = courts.find(c => c.id === booking.courtId);
    if (!court) return { ok: false, message: 'La cancha asociada no existe.' };
    const courtProfile = getBusinessProfileForCourt(court);
    const windowHours = Number(courtProfile.cancellationWindowHours ?? 24);
    const hoursRemaining = getHoursUntilBookingStart(booking);

    if (!isAdminAuthenticated && hoursRemaining < windowHours) {
      return {
        ok: false,
        message: `El complejo permite reprogramar con al menos ${windowHours} hs de anticipación (faltan ${Math.max(0, Math.round(hoursRemaining))} hs). Contactá por WhatsApp al complejo.`,
      };
    }

    const targetMs = Date.parse(`${newDate}T${newStartTime}:00-03:00`);
    if (Number.isFinite(targetMs) && targetMs <= Date.now()) {
      return { ok: false, message: 'Elegí una fecha y horario futuros para reprogramar.' };
    }

    const newEndTime = calculateEndTime(newStartTime, 60);
    const startH = parseSlotHourOrder(newStartTime);
    const endH = startH + 1;

    const hasCollision = bookings.some(b => {
      if (b.id === booking.id) return false;
      if (b.courtId !== booking.courtId || b.date !== newDate) return false;
      if (b.status !== 'confirmed' && b.status !== 'pending_payment' && b.status !== 'awaiting_approval') return false;
      const bStart = parseSlotHourOrder(b.startTime);
      const rawEnd = parseSlotHourOrder(b.endTime);
      const bEnd = rawEnd > bStart ? rawEnd : bStart + Math.max(1, Math.ceil((b.durationMinutes || 60) / 60));
      return startH < bEnd && endH > bStart;
    });

    const hasTournamentBlock = tournaments.some(t => {
      if (!t.blockCourts || t.status === 'cancelled' || t.status === 'finished') return false;
      if (!t.courtIds.includes(booking.courtId)) return false;
      const tEndDate = t.endDate || t.date;
      if (newDate < t.date || newDate > tEndDate) return false;
      const tStart = parseSlotHourOrder(t.startTime);
      const tEnd = parseSlotHourOrder(t.endTime);
      return startH < tEnd && endH > tStart;
    });

    if (hasCollision || hasTournamentBlock) {
      return { ok: false, message: 'Ese horario ya se encuentra ocupado o bloqueado por evento. Elegí otro disponible.' };
    }

    const { nightStartHour } = getNormalizedCourtSchedule(court);
    const newPrice = startH >= nightStartHour ? court.hourlyRateNight : court.hourlyRateDay;
    const paid = Number(booking.amountPaid || 0);
    const nextBalanceDue = Math.max(0, newPrice - paid);
    const perPlayerAmount = booking.totalPlayers && booking.totalPlayers >= 2
      ? Math.round(newPrice / booking.totalPlayers)
      : booking.perPlayerAmount;

    const updatedBooking: Booking = {
      ...booking,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      totalAmount: newPrice,
      balanceDue: nextBalanceDue,
      perPlayerAmount,
      rescheduledFrom: {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      rescheduledAt: new Date().toISOString(),
      reminderSentAt: undefined,
    };

    const nextBookings = bookings.map(b => (b.id === booking.id ? updatedBooking : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updatedBooking);

    sendBookingPushNotification({
      booking: updatedBooking,
      eventType: 'admin_reminder',
      customTitle: `Turno reprogramado #${updatedBooking.bookingCode}`,
      customBody: `Nuevo horario en ${updatedBooking.courtName}: ${newDate.split('-').reverse().join('/')} ${newStartTime} hs.`,
    });

    return {
      ok: true,
      booking: updatedBooking,
      message: `Turno reprogramado para el ${newDate.split('-').reverse().join('/')} a las ${newStartTime} hs.`,
    };
  }, [bookings, courts, tournaments, getBusinessProfileForCourt, getHoursUntilBookingStart, isAdminAuthenticated]);

  const cancelBookingByPlayer = useCallback(async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
    if (!booking) {
      return { success: false, mpRefunded: false, refundAmount: 0, message: 'Reserva no encontrada.' };
    }
    const court = courts.find(c => c.id === booking.courtId);
    const courtProfile = getBusinessProfileForCourt(court);
    const windowHours = Number(courtProfile.cancellationWindowHours ?? 24);
    const hoursRemaining = getHoursUntilBookingStart(booking);

    if (hoursRemaining < windowHours) {
      return {
        success: false,
        mpRefunded: false,
        refundAmount: 0,
        message: `La política del complejo exige al menos ${windowHours} hs de anticipación para cancelar online (faltan ${Math.max(0, Math.round(hoursRemaining))} hs). Contactá al complejo por WhatsApp.`,
      };
    }

    return await cancelBooking(booking.id, { notifyWhatsApp: false });
  }, [bookings, courts, getBusinessProfileForCourt, getHoursUntilBookingStart, cancelBooking]);

  const toggleJoinedPlayerPayment = useCallback(async (
    bookingId: string,
    joinedPlayerId: string,
    amount?: number
  ) => {
    const target = bookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
    if (!target) return;
    const share = amount ?? target.perPlayerAmount ?? (target.totalPlayers ? Math.round(target.totalAmount / target.totalPlayers) : 0);
    const nextJoined = (target.joinedPlayers || []).map(jp => {
      if (jp.id !== joinedPlayerId) return jp;
      const nextPaid = !jp.paid;
      return {
        ...jp,
        paid: nextPaid,
        paidAmount: nextPaid ? (jp.paidAmount || share) : 0,
        paidAt: nextPaid ? new Date().toISOString() : undefined,
      };
    });
    const updated: Booking = { ...target, joinedPlayers: nextJoined };
    const nextBookings = bookings.map(b => (b.id === target.id ? updated : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updated);
  }, [bookings]);

  const updateBookingSplitConfig = useCallback(async (bookingId: string, totalPlayers: number) => {
    const target = bookings.find(b => b.id === bookingId || b.bookingCode === bookingId);
    if (!target) return;
    const cleanCount = Math.min(22, Math.max(2, Math.round(totalPlayers)));
    const perPlayerAmount = Math.round(target.totalAmount / cleanCount);
    const updated: Booking = { ...target, totalPlayers: cleanCount, perPlayerAmount };
    const nextBookings = bookings.map(b => (b.id === target.id ? updated : b));
    setBookings(nextBookings);
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(nextBookings));
    } catch {}
    await saveBookingToFirestore(updated);
  }, [bookings]);

  // Tournaments & Events CRUD
  const createTournament = useCallback(async (
    input: Omit<Tournament, 'id' | 'teams' | 'createdAt' | 'status'> & { status?: Tournament['status'] }
  ): Promise<Tournament> => {
    const newTournament: Tournament = {
      ...input,
      id: `trn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminId: input.adminId || normalizeAdminKey(currentAdminUser?.username) || undefined,
      status: input.status || 'open',
      teams: [],
      createdAt: new Date().toISOString(),
    };
    const next = [newTournament, ...tournaments];
    setTournaments(next);
    try {
      localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(next));
    } catch {}
    await saveTournamentToFirestore(newTournament);
    return newTournament;
  }, [tournaments, currentAdminUser]);

  const updateTournament = useCallback(async (tournament: Tournament) => {
    const next = tournaments.map(t => (t.id === tournament.id ? tournament : t));
    setTournaments(next);
    try {
      localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(next));
    } catch {}
    await saveTournamentToFirestore(tournament);
  }, [tournaments]);

  const deleteTournament = useCallback(async (tournamentId: string) => {
    const next = tournaments.filter(t => t.id !== tournamentId);
    setTournaments(next);
    try {
      localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(next));
    } catch {}
    await deleteTournamentFromFirestore(tournamentId);
  }, [tournaments]);

  const registerTeamInTournament = useCallback(async (
    tournamentId: string,
    team: Omit<TournamentTeam, 'id' | 'registeredAt'>
  ): Promise<{ ok: boolean; message: string }> => {
    const t = tournaments.find(item => item.id === tournamentId);
    if (!t) return { ok: false, message: 'Torneo no encontrado.' };
    if (t.status !== 'open') return { ok: false, message: 'Las inscripciones para este torneo ya cerraron.' };
    if (t.teams.length >= t.maxTeams) return { ok: false, message: 'Cupos completos.' };

    const duplicatePhone = t.teams.some(
      existing => existing.captainPhone.replace(/\D/g, '') === team.captainPhone.replace(/\D/g, '')
    );
    if (duplicatePhone) {
      return { ok: false, message: 'Este teléfono ya inscribió un equipo en este torneo.' };
    }

    const newTeam: TournamentTeam = {
      ...team,
      id: `tm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      registeredAt: new Date().toISOString(),
      paid: false,
    };
    const nextTeams = [...t.teams, newTeam];
    const nextStatus: Tournament['status'] = nextTeams.length >= t.maxTeams ? 'full' : t.status;
    const updated: Tournament = { ...t, teams: nextTeams, status: nextStatus };

    const nextList = tournaments.map(item => (item.id === tournamentId ? updated : item));
    setTournaments(nextList);
    try {
      localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(nextList));
    } catch {}
    await saveTournamentToFirestore(updated);

    return {
      ok: true,
      message: `¡Equipo "${team.teamName}" inscripto en ${t.title}!`,
    };
  }, [tournaments]);

  const toggleTournamentTeamPaid = useCallback(async (tournamentId: string, teamId: string) => {
    const t = tournaments.find(item => item.id === tournamentId);
    if (!t) return;
    const updated: Tournament = {
      ...t,
      teams: t.teams.map(tm => (tm.id === teamId ? { ...tm, paid: !tm.paid } : tm)),
    };
    const nextList = tournaments.map(item => (item.id === tournamentId ? updated : item));
    setTournaments(nextList);
    try {
      localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(nextList));
    } catch {}
    await saveTournamentToFirestore(updated);
  }, [tournaments]);

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

    const activeDayTournaments = tournaments.filter(t => {
      if (!t.blockCourts || t.status === 'cancelled' || t.status === 'finished') return false;
      if (!t.courtIds.includes(courtId)) return false;
      const tEndDate = t.endDate || t.date;
      return date >= t.date && date <= tEndDate;
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

      const matchingTournament = activeDayTournaments.find(t => {
        const tStart = parseSlotHourOrder(t.startTime);
        const tEnd = parseSlotHourOrder(t.endTime);
        return hourNum >= tStart && hourNum < tEnd;
      });

      let status: SlotStatus = 'available';
      let blockedReason: string | undefined = undefined;
      let missingPlayersCount: number | undefined = undefined;

      if (matchingTournament) {
        status = 'blocked';
        blockedReason = `Torneo/Evento: ${matchingTournament.title}`;
      } else if (matchingBooking) {
        if (matchingBooking.clientName.startsWith('[BLOQUEADO')) {
          status = 'blocked';
          blockedReason = matchingBooking.notes;
        } else if (matchingBooking.status === 'pending_payment' || matchingBooking.status === 'awaiting_approval') {
          status = 'pending';
        } else {
          status = 'booked';
        }

        if (status !== 'blocked' && matchingBooking.lookingForPlayers) {
          const joinedLen = matchingBooking.joinedPlayers?.length || 0;
          const remaining = Math.max(0, (matchingBooking.neededPlayers || 0) - joinedLen);
          if (remaining > 0) {
            missingPlayersCount = remaining;
          }
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
        missingPlayersCount,
      };
    });
  }, [courts, bookings, tournaments]);

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
    siteContent,
    filterTags,
    updateFilterTags,
    getSportLabel,
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
    updateSiteContent,
    resetSiteContent,
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
    deleteReview,
    getSlotsForCourtAndDate,
    getMonthlyStats,
    generateWhatsAppMessage,
    getWhatsAppShareUrl,
    triggerWhatsAppSend,
    pushSupported,
    pushPermission,
    isPushEnabled,
    trackedBookingCodes,
    enablePushNotifications,
    disablePushNotifications,
    sendManualBookingPush,
    hasBookingPushSubscription,
    availablePlayers,
    myAvailablePlayerId,
    requestPlayersForBooking,
    stopLookingForPlayers,
    joinMatchBooking,
    removeJoinedPlayerFromBooking,
    registerAvailablePlayer,
    unregisterAvailablePlayer,
    inviteAvailablePlayerToBooking,
    createRecurringAdminBookings,
    cancelRecurringSeries,
    getHoursUntilBookingStart,
    rescheduleBooking,
    cancelBookingByPlayer,
    toggleJoinedPlayerPayment,
    updateBookingSplitConfig,
    tournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    registerTeamInTournament,
    toggleTournamentTeamPaid,
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
    siteContent,
    filterTags,
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
    updateSiteContent,
    updateFilterTags,
    getSportLabel,
    resetSiteContent,
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
    deleteReview,
    getSlotsForCourtAndDate,
    getMonthlyStats,
    generateWhatsAppMessage,
    getWhatsAppShareUrl,
    triggerWhatsAppSend,
    pushSupported,
    pushPermission,
    isPushEnabled,
    trackedBookingCodes,
    enablePushNotifications,
    disablePushNotifications,
    sendManualBookingPush,
    hasBookingPushSubscription,
    availablePlayers,
    myAvailablePlayerId,
    requestPlayersForBooking,
    stopLookingForPlayers,
    joinMatchBooking,
    removeJoinedPlayerFromBooking,
    registerAvailablePlayer,
    unregisterAvailablePlayer,
    inviteAvailablePlayerToBooking,
    createRecurringAdminBookings,
    cancelRecurringSeries,
    getHoursUntilBookingStart,
    rescheduleBooking,
    cancelBookingByPlayer,
    toggleJoinedPlayerPayment,
    updateBookingSplitConfig,
    tournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    registerTeamInTournament,
    toggleTournamentTeamPaid,
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
