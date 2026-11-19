export const PUBLISHED_BACKEND_URL =
  'https://ais-pre-5fcr45b4sanrgate6zomlc-909668557081.us-east1.run.app';

/**
 * Resolves the API base URL.
 * - Direct `import.meta.env.VITE_API_BASE_URL` and `__IS_VERCEL_BUILD__` are used
 *   so Vite statically inlines them during `vite build`.
 * - On Vercel builds (`__IS_VERCEL_BUILD__ === true`), Cloud Run (`*.run.app`),
 *   Vercel (`*.vercel.app`), Render (`*.onrender.com`), Netlify, Koyeb, and localhost,
 *   requests go same-origin ('').
 * - On static custom domains without same-origin API (e.g. GitHub Pages without
 *   VITE_API_BASE_URL), requests fall back to PUBLISHED_BACKEND_URL.
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') return true;
  return false;
}

export function getApiBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (typeof envBase === 'string' && envBase.trim().startsWith('http')) {
    return envBase.trim().replace(/\/$/, '');
  }

  if (isNativeAndroidApp()) {
    return PUBLISHED_BACKEND_URL;
  }

  if (typeof __IS_VERCEL_BUILD__ !== 'undefined' && __IS_VERCEL_BUILD__) {
    return '';
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (
      host === 'deportespmy.com.ar' ||
      host === 'www.deportespmy.com.ar' ||
      host.endsWith('.deportespmy.com.ar') ||
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

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const targetUrl = apiUrl(path);
  try {
    return await fetch(targetUrl, init);
  } catch (err: any) {
    const rawMsg = String(err?.message || err || '');
    const isNetworkErr =
      err?.name === 'TypeError' ||
      /failed to fetch|networkerror|load failed/i.test(rawMsg);

    if (isNetworkErr && isStaticCustomDomain()) {
      const base = getApiBaseUrl();
      throw new Error(
        `No se pudo conectar con el servidor backend (${base}) desde ${window.location.hostname}. ` +
        `Si tu dominio sigue en GitHub Pages, configurá VITE_API_BASE_URL con la URL de tu backend en Vercel, o apuntá ${window.location.hostname} directamente a Vercel.`
      );
    }
    throw err;
  }
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
