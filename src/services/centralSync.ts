import { Booking, Review, Court } from '../types';

// Central Cloud Sync Service for DeportesPMY
// Enables real-time cross-device synchronization for static hosting (GitHub Pages)
const CLOUD_SYNC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1be119e8e69c2';

export interface CloudPayload {
  updatedAt: string;
  bookings: Booking[];
  reviews?: Review[];
  courts?: Court[];
}

export const fetchCloudData = async (): Promise<CloudPayload | null> => {
  try {
    const res = await fetch(CLOUD_SYNC_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.data && Array.isArray(json.data.bookings)) {
      return json.data as CloudPayload;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch cloud data, using local storage cache:', err);
    return null;
  }
};

export const pushCloudData = async (payload: CloudPayload): Promise<boolean> => {
  try {
    const res = await fetch(CLOUD_SYNC_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'deportespmy_production_db',
        data: payload
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not push to cloud sync:', err);
    return false;
  }
};
