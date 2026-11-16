import { Court } from '../types';

export const DEFAULT_OPEN_HOUR = 9;
export const DEFAULT_CLOSE_HOUR = 23;
export const DEFAULT_NIGHT_START_HOUR = 18;
export const DEFAULT_HORA_INICIO = '09:00';
export const DEFAULT_HORA_FIN = '23:00';

/**
 * Convierte una hora entera (6..25) a formato HH:00 (24 -> 00:00, 25 -> 01:00).
 */
export function formatSlotHour(hour: number): string {
  const normalized = ((Math.round(hour) % 24) + 24) % 24;
  return `${normalized.toString().padStart(2, '0')}:00`;
}

/**
 * Convierte 'HH:00' a entero ordenable dentro de una jornada deportiva (00:00 -> 24, 01:00 -> 25).
 */
export function parseSlotHourOrder(hhmm: string): number {
  const raw = parseInt((hhmm || '').split(':')[0] || '', 10);
  if (Number.isNaN(raw)) return DEFAULT_OPEN_HOUR;
  if (raw <= 3) return raw + 24;
  return raw;
}

/**
 * Parsea un campo horario string ('HH:00') o numérico a entero ordenable de jornada.
 */
function parseFlexibleHour(val: unknown, fallback: number): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.round(val);
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return parseSlotHourOrder(val.trim());
  }
  return fallback;
}

/**
 * Normaliza hora_inicio, hora_fin, openHour, closeHour y nightStartHour de una cancha.
 * Prioriza los campos explícitos 'hora_inicio' y 'hora_fin' cuando están presentes.
 */
export function getNormalizedCourtSchedule(court?: Partial<Court> | null): {
  hora_inicio: string;
  hora_fin: string;
  openHour: number;
  closeHour: number;
  nightStartHour: number;
} {
  const rawOpen = court?.hora_inicio
    ? parseFlexibleHour(court.hora_inicio, DEFAULT_OPEN_HOUR)
    : parseFlexibleHour(court?.openHour, DEFAULT_OPEN_HOUR);

  const rawClose = court?.hora_fin
    ? parseFlexibleHour(court.hora_fin, DEFAULT_CLOSE_HOUR)
    : parseFlexibleHour(court?.closeHour, DEFAULT_CLOSE_HOUR);

  const rawNight = parseFlexibleHour(court?.nightStartHour, DEFAULT_NIGHT_START_HOUR);

  const openHour = Math.max(6, Math.min(22, rawOpen));
  const closeHour = Math.max(openHour, Math.min(25, rawClose));
  const nightStartHour = Math.max(15, Math.min(23, rawNight));

  return {
    hora_inicio: formatSlotHour(openHour),
    hora_fin: formatSlotHour(closeHour),
    openHour,
    closeHour,
    nightStartHour,
  };
}

/**
 * Devuelve una copia de la cancha con hora_inicio, hora_fin, openHour, closeHour y nightStartHour sincronizados.
 */
export function normalizeCourtSchedule<T extends Partial<Court>>(court: T): T {
  const sched = getNormalizedCourtSchedule(court);
  return {
    ...court,
    hora_inicio: sched.hora_inicio,
    hora_fin: sched.hora_fin,
    openHour: sched.openHour,
    closeHour: sched.closeHour,
    nightStartHour: sched.nightStartHour,
  };
}

/**
 * Devuelve la lista ordenada de horarios ['09:00', ...] exclusivamente dentro de [hora_inicio .. hora_fin] de una cancha.
 */
export function getCourtHoursRange(court?: Partial<Court> | null): string[] {
  const { openHour, closeHour } = getNormalizedCourtSchedule(court);
  const hours: string[] = [];
  for (let h = openHour; h <= closeHour; h++) {
    hours.push(formatSlotHour(h));
  }
  return hours;
}

/**
 * Devuelve la unión ordenada de horarios definida exclusivamente por los establecimientos/canchas proporcionados.
 * Si no hay canchas configuradas, retorna [] para evitar renderizar horas fuera del rango operativo real.
 */
export function getUnionHoursRange(courts: Court[]): string[] {
  if (!courts || courts.length === 0) {
    return [];
  }
  let minOpen = 25;
  let maxClose = 0;
  for (const c of courts) {
    const { openHour, closeHour } = getNormalizedCourtSchedule(c);
    if (openHour < minOpen) minOpen = openHour;
    if (closeHour > maxClose) maxClose = closeHour;
  }
  const hours: string[] = [];
  for (let h = minOpen; h <= maxClose; h++) {
    hours.push(formatSlotHour(h));
  }
  return hours;
}

export const OPEN_HOUR_OPTIONS = Array.from({ length: 17 }, (_, idx) => {
  const h = 6 + idx; // 06:00 a 22:00
  const horaStr = formatSlotHour(h);
  return { value: horaStr, hour: h, label: `${horaStr} hs` };
});

export const CLOSE_HOUR_OPTIONS = Array.from({ length: 18 }, (_, idx) => {
  const h = 8 + idx; // 08:00 a 01:00 (25)
  const horaStr = formatSlotHour(h);
  const suffix = h === 24 ? ' (Medianoche)' : h === 25 ? ' (Madrugada)' : '';
  return { value: horaStr, hour: h, label: `${horaStr} hs${suffix}` };
});

export const NIGHT_START_HOUR_OPTIONS = [17, 18, 19, 20, 21].map((h) => ({
  value: h,
  label: `Desde ${formatSlotHour(h)} hs`,
}));
