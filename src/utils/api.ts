export const PUBLISHED_BACKEND_URL =
  'https://ais-pre-5fcr45b4sanrgate6zomlc-909668557081.us-east1.run.app';

/**
 * Resolves the API base URL.
 * - On Cloud Run (*.run.app) and localhost, requests go same-origin ('').
 * - On static custom domains (e.g. GitHub Pages https://deportespmy.com.ar),
 *   requests are routed to VITE_API_BASE_URL or the published Cloud Run backend.
 */
export function getApiBaseUrl(): string {
  const envBase = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
    ?.VITE_API_BASE_URL;
  if (typeof envBase === 'string' && envBase.trim().startsWith('http')) {
    return envBase.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith('.run.app') || host === 'localhost' || host === '127.0.0.1') {
      return '';
    }
    return PUBLISHED_BACKEND_URL;
  }

  return '';
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function isStaticCustomDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return !host.endsWith('.run.app') && host !== 'localhost' && host !== '127.0.0.1';
}

export async function safeParseJsonResponse(res: Response): Promise<any> {
  const rawText = await res.text();
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error(`El servidor respondió vacío (HTTP ${res.status}).`);
  }
  if (trimmed.startsWith('<')) {
    if (isStaticCustomDomain()) {
      throw new Error(
        `No se pudo contactar al backend de Mercado Pago desde ${window.location.hostname} (HTTP ${res.status}). Asegurate de tener publicada la app en AI Studio (${PUBLISHED_BACKEND_URL}) o realizá la vinculación directamente desde el enlace de AI Studio.`
      );
    }
    throw new Error(
      `El servidor devolvió una página HTML en lugar de JSON (HTTP ${res.status}). Recargá la página o verificá que el servidor backend esté activo.`
    );
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Respuesta inválida del servidor (HTTP ${res.status}).`);
  }
}
