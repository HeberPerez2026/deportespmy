import { SportType } from '../types';
import heroClubPatagonia from '../assets/images/hero_club_patagonia_1794821625005.jpg';
import courtFutbolTurf from '../assets/images/court_futbol_turf_1794821625058.jpg';
import courtPadelGlass from '../assets/images/court_padel_glass_1794821625722.jpg';
import courtTenisClay from '../assets/images/court_tenis_clay_1794821625456.jpg';
import courtBasquetParquet from '../assets/images/court_basquet_parquet_1794821625849.jpg';

export const HERO_CLUB_IMAGE = heroClubPatagonia;

export const SPORT_DEFAULT_IMAGES: Record<SportType, string> = {
  futbol5: courtFutbolTurf,
  futbol7: courtFutbolTurf,
  padel: courtPadelGlass,
  tenis: courtTenisClay,
  basquet: courtBasquetParquet,
};

export const SPORT_DISPLAY_LABELS: Record<SportType, string> = {
  futbol5: 'Fútbol 5',
  futbol7: 'Fútbol 7',
  padel: 'Pádel',
  tenis: 'Tenis',
  basquet: 'Básquet',
};

export const SPORT_LONG_LABELS: Record<SportType, string> = {
  futbol5: 'Fútbol 5',
  futbol7: 'Fútbol 7',
  padel: 'Pádel Panorámico',
  tenis: 'Tenis Polvo de Ladrillo',
  basquet: 'Básquetbol / Parquet',
};

export const FALLBACK_COURT_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" fill="none"><rect width="800" height="500" fill="#1B2A21"/><rect x="48" y="48" width="704" height="404" stroke="#E8ECE9" stroke-opacity="0.28" stroke-width="2"/><line x1="400" y1="48" x2="400" y2="452" stroke="#E8ECE9" stroke-opacity="0.28" stroke-width="2"/><circle cx="400" cy="250" r="68" stroke="#E8ECE9" stroke-opacity="0.28" stroke-width="2"/></svg>'
  );

export function resolveCourtCoverImage(
  sport: SportType,
  images?: string[],
  legacyImageUrl?: string
): string {
  const firstAttached = images && images.length > 0 ? images[0] : '';
  const candidate = firstAttached || legacyImageUrl || '';
  if (candidate && !candidate.includes('images.unsplash.com')) {
    return candidate;
  }
  return SPORT_DEFAULT_IMAGES[sport] || courtFutbolTurf;
}

export function resolveCourtGallery(
  sport: SportType,
  images?: string[],
  legacyImageUrl?: string
): string[] {
  const validAttached = (images || []).filter(
    (img) => Boolean(img) && !img.includes('images.unsplash.com')
  );
  if (validAttached.length > 0) return validAttached;
  if (legacyImageUrl && !legacyImageUrl.includes('images.unsplash.com')) {
    return [legacyImageUrl];
  }
  return [SPORT_DEFAULT_IMAGES[sport] || courtFutbolTurf];
}
