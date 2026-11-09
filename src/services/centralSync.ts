import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Booking, Review } from '../types';

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

// Real-time listener for Bookings collection
export const subscribeToBookings = (
  onUpdate: (bookings: Booking[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const path = 'bookings';
  try {
    const unsub = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const bookingsList: Booking[] = [];
        snapshot.forEach((docSnap) => {
          bookingsList.push({ ...(docSnap.data() as Booking), id: docSnap.id });
        });
        onUpdate(bookingsList);
      },
      (error) => {
        console.warn('[Firestore] Bookings subscription warning:', error);
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Keep resilient
        }
      }
    );
    return unsub;
  } catch (err) {
    console.warn('[Firestore] Error attaching bookings listener:', err);
    return () => {};
  }
};

// Real-time listener for Reviews collection
export const subscribeToReviews = (
  onUpdate: (reviews: Review[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const path = 'reviews';
  try {
    const unsub = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const reviewsList: Review[] = [];
        snapshot.forEach((docSnap) => {
          reviewsList.push({ ...(docSnap.data() as Review), id: docSnap.id });
        });
        onUpdate(reviewsList);
      },
      (error) => {
        console.warn('[Firestore] Reviews subscription warning:', error);
        if (onError) onError(error);
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch {
          // Keep resilient
        }
      }
    );
    return unsub;
  } catch (err) {
    console.warn('[Firestore] Error attaching reviews listener:', err);
    return () => {};
  }
};

// Save single booking to Firestore
export const saveBookingToFirestore = async (booking: Booking): Promise<boolean> => {
  const path = `bookings/${booking.id}`;
  try {
    await setDoc(doc(db, 'bookings', booking.id), booking);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save booking error:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Handled
    }
    return false;
  }
};

// Delete single booking from Firestore
export const deleteBookingFromFirestore = async (bookingId: string): Promise<boolean> => {
  const path = `bookings/${bookingId}`;
  try {
    await deleteDoc(doc(db, 'bookings', bookingId));
    return true;
  } catch (err) {
    console.warn('[Firestore] Delete booking error:', err);
    try {
      handleFirestoreError(err, OperationType.DELETE, path);
    } catch {
      // Handled
    }
    return false;
  }
};

// Save single review to Firestore
export const saveReviewToFirestore = async (review: Review): Promise<boolean> => {
  const path = `reviews/${review.id}`;
  try {
    await setDoc(doc(db, 'reviews', review.id), review);
    return true;
  } catch (err) {
    console.warn('[Firestore] Save review error:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Handled
    }
    return false;
  }
};

// Reply to review in Firestore
export const saveReviewReplyToFirestore = async (
  reviewId: string, 
  adminReply: { text: string; date: string }
): Promise<boolean> => {
  const path = `reviews/${reviewId}`;
  try {
    await setDoc(doc(db, 'reviews', reviewId), { adminReply }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firestore] Save review reply error:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Handled
    }
    return false;
  }
};

// Fetch initial bookings snapshot
export const fetchAllBookingsOnce = async (): Promise<Booking[]> => {
  const path = 'bookings';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Booking[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as Booking), id: d.id }));
    return list;
  } catch (err) {
    console.warn('[Firestore] Fetch all bookings error:', err);
    return [];
  }
};

// Fetch initial reviews snapshot
export const fetchAllReviewsOnce = async (): Promise<Review[]> => {
  const path = 'reviews';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Review[] = [];
    snap.forEach((d) => list.push({ ...(d.data() as Review), id: d.id }));
    return list;
  } catch (err) {
    console.warn('[Firestore] Fetch all reviews error:', err);
    return [];
  }
};
