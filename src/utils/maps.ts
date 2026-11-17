import { BusinessProfile } from '../types';

export function buildGoogleMapsDirectionsUrl(
  profile?: Partial<BusinessProfile> | null,
  fallbackPlace?: string
): string {
  const customUrl = (profile?.mapsUrl || '').trim();
  if (customUrl && /^https?:\/\//i.test(customUrl)) {
    return customUrl;
  }

  const lat = typeof profile?.latitude === 'number' && !Number.isNaN(profile.latitude) ? profile.latitude : null;
  const lng = typeof profile?.longitude === 'number' && !Number.isNaN(profile.longitude) ? profile.longitude : null;
  if (lat !== null && lng !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  const rawAddress = (profile?.address || '').trim();
  const rawName = (profile?.complexName || fallbackPlace || '').trim();
  const queryParts = [rawName, rawAddress, 'Puerto Madryn, Chubut, Argentina'].filter(Boolean);
  const query = encodeURIComponent(queryParts.join(', '));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildGoogleMapsEmbedUrl(
  profile?: Partial<BusinessProfile> | null,
  fallbackPlace?: string
): string | null {
  const lat = typeof profile?.latitude === 'number' && !Number.isNaN(profile.latitude) ? profile.latitude : null;
  const lng = typeof profile?.longitude === 'number' && !Number.isNaN(profile.longitude) ? profile.longitude : null;

  if (lat !== null && lng !== null) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  }

  const rawAddress = (profile?.address || '').trim();
  const rawName = (profile?.complexName || fallbackPlace || '').trim();
  if (!rawAddress && !rawName && !(profile?.mapsUrl || '').trim()) {
    return null;
  }

  const queryParts = [rawName, rawAddress, 'Puerto Madryn, Chubut'].filter(Boolean);
  return `https://maps.google.com/maps?q=${encodeURIComponent(queryParts.join(', '))}&z=15&output=embed`;
}

export function hasMapLocation(profile?: Partial<BusinessProfile> | null, fallbackName?: string): boolean {
  return Boolean(
    (profile?.mapsUrl || '').trim() ||
    (profile?.address || '').trim() ||
    (typeof profile?.latitude === 'number' && typeof profile?.longitude === 'number') ||
    (fallbackName || '').trim()
  );
}
