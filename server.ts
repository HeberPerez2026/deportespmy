import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createApiApp } from './server/createApp.ts';

async function startServer() {
  const app = createApiApp();
  const port = Number(process.env.PORT) || 3000;

  const distDir = path.resolve(process.cwd(), 'dist');
  const isApiOnly = process.env.API_ONLY === 'true';
  const useProdStatic = !isApiOnly && process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

  if (useProdStatic) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else if (isApiOnly || process.env.NODE_ENV === 'production') {
    app.get('/', (_req, res) => {
      res.json({ ok: true, service: 'DeportesPMY Backend API' });
    });
  } else {
    // Vite middleware for SPA in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor DeportesPMY iniciado en http://localhost:${port}`);
  });
}

startServer();
