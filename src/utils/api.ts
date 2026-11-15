export const PUBLISHED_BACKEND_URL =
  'https://ais-pre-5fcr45b4sanrgate6zomlc-909668557081.us-east1.run.app';

/**
 * Resolves the API base URL.
 * - On Cloud Run (*.run.app) and localhost, requests go same-origin ('').
 * - On static custom domains (e.g. GitHub Pages https://deportespmy.com.ar),
 *   requests are routed to VITE_API_BASE_URL or the published Cloud Run backend.
 */
export function getApiBaseUrl(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | boolean | undefined> })?.env;
  const envBase = env?.VITE_API_BASE_URL;
  if (typeof envBase === 'string' && envBase.trim().startsWith('http')) {
    return envBase.trim().replace(/\/$/, '');
  }

  if (env?.VITE_HAS_SAME_ORIGIN_API === true || env?.VITE_HAS_SAME_ORIGIN_API === 'true') {
    return '';
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host.endsWith('.run.app') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.netlify.app') ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.koyeb.app') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
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
  return getApiBaseUrl() !== '';
}

export async function safeParseJsonResponse(res: Response): Promise<any> {
  const rawText = await res.text();
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error(`El servidor respondió vacío (HTTP ${res.status}).`);
  }
  if (trimmed.startsWith('<')) {
    if (isStaticCustomDomain()) {
      const targetBackend = getApiBaseUrl() || PUBLISHED_BACKEND_URL;
      throw new Error(
        `No se pudo contactar al backend de Mercado Pago (${targetBackend}) desde ${window.location.hostname} (HTTP ${res.status}). Verificá que el servidor backend esté activo.`
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
