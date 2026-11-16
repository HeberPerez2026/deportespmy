import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Booking, Review, Court, BusinessProfile, AdminUser, DeveloperContact } from '../types';
import { normalizeCourtSchedule } from '../utils/scheduleHours';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Real-time listener for Courts
export const subscribeToCourts = (
  onUpdate: (courts: Court[]) => void
): (() => void) => {
  const path = 'courts';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: Court[] = [];
        snapshot.forEach((d) => list.push(normalizeCourtSchedule({ ...(d.data() as Court), id: d.id })));
        onUpdate(list);
      },
      (error) => {
        console.warn('[Firestore] Courts subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching courts listener:', err);
    return () => {};
  }
};

// Save Court to Firestore
export const saveCourtToFirestore = async (court: Court): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'courts', court.id), court);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save court error:', err);
    return false;
  }
};

// Delete Court from Firestore
export const deleteCourtFromFirestore = async (courtId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'courts', courtId));
    return true;
  } catch (err) {
    console.warn('[Firestore] Delete court error:', err);
    return false;
  }
};

// Real-time listener for Bookings
export const subscribeToBookings = (
  onUpdate: (bookings: Booking[]) => void
): (() => void) => {
  const path = 'bookings';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const bookingsList: Booking[] = [];
        snapshot.forEach((docSnap) => {
          bookingsList.push({ ...(docSnap.data() as Booking), id: docSnap.id });
        });
        onUpdate(bookingsList);
      },
      (error) => {
        console.warn('[Firestore] Bookings subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching bookings listener:', err);
    return () => {};
  }
};

// Save Booking
export const saveBookingToFirestore = async (booking: Booking): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'bookings', booking.id), booking);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save booking error:', err);
    return false;
  }
};

// Delete Booking
export const deleteBookingFromFirestore = async (bookingId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
    return true;
  } catch (err) {
    console.warn('[Firestore] Delete booking error:', err);
    return false;
  }
};

// Real-time listener for Reviews
export const subscribeToReviews = (
  onUpdate: (reviews: Review[]) => void
): (() => void) => {
  const path = 'reviews';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const reviewsList: Review[] = [];
        snapshot.forEach((docSnap) => {
          reviewsList.push({ ...(docSnap.data() as Review), id: docSnap.id });
        });
        onUpdate(reviewsList);
      },
      (error) => {
        console.warn('[Firestore] Reviews subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching reviews listener:', err);
    return () => {};
  }
};

// Save Review
export const saveReviewToFirestore = async (review: Review): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'reviews', review.id), review);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save review error:', err);
    return false;
  }
};

// Save Review Reply
export const saveReviewReplyToFirestore = async (
  reviewId: string, 
  adminReply: { text: string; date: string }
): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'reviews', reviewId), { adminReply }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Save review reply error:', err);
    return false;
  }
};

// Real-time listener for Business Profile (supports per-admin profile or general profile)
export const subscribeToBusinessProfile = (
  onUpdate: (profile: BusinessProfile) => void,
  profileKey?: string
): (() => void) => {
  const docId = profileKey ? `profile_${profileKey.toLowerCase().replace(/[^a-z0-9_-]/g, '')}` : 'businessProfile';
  try {
    return onSnapshot(
      doc(db, 'settings', docId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as BusinessProfile;
          onUpdate({
            ownerName: data.ownerName || '',
            complexName: data.complexName || '',
            cbu: data.cbu || '',
            alias: data.alias || '',
            accountHolder: data.accountHolder || '',
            whatsappNumber: data.whatsappNumber || '',
            address: data.address || '',
            email: data.email || '',
            welcomeNotes: data.welcomeNotes || '',
            mpLink: data.mpLink || '',
            mpAccessToken: data.mpAccessToken || '',
            mpRefreshToken: data.mpRefreshToken || '',
            mpPublicKey: data.mpPublicKey || '',
            mpOAuthConnected: Boolean(data.mpOAuthConnected),
            mpUserId: data.mpUserId || '',
            mpAccountEmail: data.mpAccountEmail || '',
            mpAccountNickname: data.mpAccountNickname || '',
            mpTokenExpiresAt: data.mpTokenExpiresAt || '',
            mpConnectedAt: data.mpConnectedAt || '',
            whatsappTemplate: data.whatsappTemplate || '',
            mpPaused: Boolean(data.mpPaused),
            transferPaused: Boolean(data.transferPaused),
            instagramUrl: data.instagramUrl || '',
            facebookUrl: data.facebookUrl || '',
            tiktokUrl: data.tiktokUrl || '',
            youtubeUrl: data.youtubeUrl || '',
            socialFeedUrl: data.socialFeedUrl || ''
          });
        } else if (profileKey) {
          // If a new admin does not have a profile saved yet, return 100% empty fields
          onUpdate({
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
            socialFeedUrl: ''
          });
        }
      },
      (error) => {
        console.warn('[Firestore] BusinessProfile subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching business profile listener:', err);
    return () => {};
  }
};

// Real-time listener for all admin business profiles
export const subscribeToAllProfiles = (
  onUpdate: (profiles: Record<string, BusinessProfile>) => void
): (() => void) => {
  try {
    return onSnapshot(
      collection(db, 'settings'),
      (snapshot) => {
        const map: Record<string, BusinessProfile> = {};
        snapshot.forEach((docSnap) => {
          const id = docSnap.id;
          if (id.startsWith('profile_')) {
            const key = id.replace('profile_', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
            map[key] = docSnap.data() as BusinessProfile;
          } else if (id === 'businessProfile') {
            map['default'] = docSnap.data() as BusinessProfile;
          }
        });
        onUpdate(map);
      },
      (error) => {
        console.warn('[Firestore] All profiles subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching all profiles listener:', err);
    return () => {};
  }
};

// Save Business Profile (per-admin profile strictly isolated)
export const saveBusinessProfileToFirestore = async (
  profile: BusinessProfile,
  profileKey?: string
): Promise<boolean> => {
  const docId = profileKey ? `profile_${profileKey.toLowerCase().replace(/[^a-z0-9_-]/g, '')}` : 'businessProfile';
  try {
    await setDoc(doc(db, 'settings', docId), profile);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save business profile error:', err);
    return false;
  }
};

// Real-time listener for Developer Contact
export const subscribeToDeveloperContact = (
  onUpdate: (contact: DeveloperContact) => void
): (() => void) => {
  try {
    return onSnapshot(
      doc(db, 'settings', 'developerContact'),
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as DeveloperContact);
        }
      },
      (error) => {
        console.warn('[Firestore] DeveloperContact subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching developer contact listener:', err);
    return () => {};
  }
};

// Save Developer Contact
export const saveDeveloperContactToFirestore = async (contact: DeveloperContact): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'settings', 'developerContact'), contact);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save developer contact error:', err);
    return false;
  }
};

// Real-time listener for Admins
export const subscribeToAdmins = (
  onUpdate: (admins: AdminUser[]) => void
): (() => void) => {
  const path = 'admins';
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const list: AdminUser[] = [];
        snapshot.forEach((d) => list.push({ ...(d.data() as AdminUser), id: d.id }));
        onUpdate(list);
      },
      (error) => {
        console.warn('[Firestore] Admins subscription error:', error);
      }
    );
  } catch (err) {
    console.warn('[Firestore] Error attaching admins listener:', err);
    return () => {};
  }
};

// Save Admin User
export const saveAdminUserToFirestore = async (admin: AdminUser): Promise<boolean> => {
  try {
    await setDoc(doc(db, 'admins', admin.id), admin);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save admin error:', err);
    return false;
  }
};

// Delete Admin User
export const deleteAdminUserFromFirestore = async (adminId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, 'admins', adminId));
    return true;
  } catch (err) {
    console.warn('[Firestore] Delete admin error:', err);
    return false;
  }
};

// Manual fetch all data for backup / refresh
export const fetchAllCollectionDocs = async <T>(collName: string): Promise<T[]> => {
  try {
    const snap = await getDocs(collection(db, collName));
    const list: T[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as T), id: d.id }));
    return list;
  } catch (err) {
    console.warn(`[Firestore] Fetch ${collName} error:`, err);
    return [];
  }
};
