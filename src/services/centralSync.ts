import { Booking, Review } from '../types';

// Central Cloud Sync Service for DeportesPMY (deportespmy.com.ar)
// Multi-layer real-time synchronization:
// Layer 1: Instant Server-Sent Events (SSE) & PubSub via ntfy.sh (<100ms cross-device delivery)
// Layer 2: Cloud persistence via partitioned REST storage (deportespmy_bookings & deportespmy_reviews)
// Layer 3: Cross-tab BroadcastChannel for zero-latency local tab coordination

const BOOKINGS_CLOUD_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1be3c6c4b6a06';
const REVIEWS_CLOUD_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1be3c6d9f6a07';
const NTFY_TOPIC = 'deportespmy_sync_prod_2026';
const NTFY_BASE_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

export type SyncEvent =
  | { type: 'BOOKING_CREATED'; booking: Booking }
  | { type: 'BOOKING_CANCELLED'; bookingId: string }
  | { type: 'BALANCE_COLLECTED'; bookingId: string }
  | { type: 'SLOT_BLOCKED'; booking: Booking }
  | { type: 'SLOT_UNBLOCKED'; bookingId: string }
  | { type: 'REVIEW_CREATED'; review: Review }
  | { type: 'REVIEW_REPLIED'; reviewId: string; adminReply: { text: string; date: string } };

// Fetch bookings from cloud storage
export const fetchCloudBookings = async (): Promise<Booking[] | null> => {
  try {
    const res = await fetch(`${BOOKINGS_CLOUD_URL}?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.data && Array.isArray(json.data.bookings)) {
      return json.data.bookings;
    }
    return null;
  } catch (err) {
    console.warn('[Sync] Could not fetch cloud bookings:', err);
    return null;
  }
};

// Fetch reviews from cloud storage
export const fetchCloudReviews = async (): Promise<Review[] | null> => {
  try {
    const res = await fetch(`${REVIEWS_CLOUD_URL}?_t=${Date.now()}`, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      cache: 'no-store'
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.data && Array.isArray(json.data.reviews)) {
      return json.data.reviews;
    }
    return null;
  } catch (err) {
    console.warn('[Sync] Could not fetch cloud reviews:', err);
    return null;
  }
};

// Push bookings to cloud storage (compacted if necessary to prevent HTTP 500 payload limits)
export const pushCloudBookings = async (bookings: Booking[]): Promise<boolean> => {
  try {
    // Keep most relevant bookings in the cloud object to maintain high speed and prevent payload limits
    const safeBookings = bookings.slice(0, 15);
    const res = await fetch(BOOKINGS_CLOUD_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'deportespmy_bookings_v3',
        data: {
          updatedAt: new Date().toISOString(),
          bookings: safeBookings
        }
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync] Could not push cloud bookings:', err);
    return false;
  }
};

// Push reviews to cloud storage
export const pushCloudReviews = async (reviews: Review[]): Promise<boolean> => {
  try {
    const safeReviews = reviews.slice(0, 20);
    const res = await fetch(REVIEWS_CLOUD_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'deportespmy_reviews_v3',
        data: {
          updatedAt: new Date().toISOString(),
          reviews: safeReviews
        }
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Sync] Could not push cloud reviews:', err);
    return false;
  }
};

// Publish real-time event to ntfy.sh broker
export const publishLiveEvent = async (event: SyncEvent): Promise<void> => {
  try {
    await fetch(NTFY_BASE_URL, {
      method: 'POST',
      headers: {
        'Title': event.type,
        'Tags': 'deportespmy,sync',
        'Priority': 'default'
      },
      body: JSON.stringify(event)
    });
  } catch (err) {
    console.warn('[Sync] Live event broadcast failed:', err);
  }
};

// Catchup missed events from the last 12 hours via ntfy.sh poll
export const fetchRecentEvents = async (): Promise<SyncEvent[]> => {
  try {
    const res = await fetch(`${NTFY_BASE_URL}/json?poll=1&since=12h`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text.trim()) return [];

    const lines = text.trim().split('\n').filter(Boolean);
    const events: SyncEvent[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message) {
          const evt = JSON.parse(parsed.message) as SyncEvent;
          if (evt && evt.type) {
            events.push(evt);
          }
        }
      } catch {
        // Skip unparseable line
      }
    }
    return events;
  } catch (err) {
    console.warn('[Sync] Could not fetch recent ntfy events:', err);
    return [];
  }
};

// Subscribe to real-time events via Server-Sent Events (SSE)
export const subscribeToLiveEvents = (onEvent: (event: SyncEvent) => void): (() => void) => {
  if (typeof window === 'undefined' || !('EventSource' in window)) {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let isClosed = false;

  const connect = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`${NTFY_BASE_URL}/sse`);

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.message) {
            const event = JSON.parse(payload.message) as SyncEvent;
            if (event && event.type) {
              onEvent(event);
            }
          }
        } catch {
          // Ignore keep-alive or ping events
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (!isClosed) {
          // Reconnect after 4 seconds
          setTimeout(connect, 4000);
        }
      };
    } catch (err) {
      console.warn('[Sync] SSE connection error:', err);
    }
  };

  connect();

  return () => {
    isClosed = true;
    eventSource?.close();
  };
};
