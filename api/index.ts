import { createApiApp } from '../server/createApp.ts';

const app = createApiApp();

export default function handler(req: any, res: any) {
  const rawUrl = String(req.url || '/');
  const parsed = new URL(rawUrl, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__vercel_api_path');

  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__vercel_api_path');
    const qs = parsed.searchParams.toString();
    const cleanSubpath = rewrittenPath.replace(/^\/+/, '');
    req.url = `/api/${cleanSubpath}${qs ? `?${qs}` : ''}`;
  }

  return app(req, res);
}
