import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createApiApp, runPreMatchReminderSweep } from './server/createApp.ts';

function getCliArg(name: string): string | undefined {
  const exactIdx = process.argv.indexOf(name);
  if (exactIdx !== -1 && process.argv[exactIdx + 1] && !process.argv[exactIdx + 1].startsWith('--')) {
    return process.argv[exactIdx + 1];
  }
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : undefined;
}

function resolveServerPort(): number {
  const cliPort = Number(getCliArg('--port'));
  if (Number.isFinite(cliPort) && cliPort > 0) {
    return cliPort;
  }

  const envPort = Number(process.env.PORT);
  if (process.env.NODE_ENV === 'production') {
    return Number.isFinite(envPort) && envPort > 0 ? envPort : 3000;
  }

  // In development inside preview containers, nginx often occupies PORT=8080 and proxies to 3000.
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== 8080) {
    return envPort;
  }
  return 3000;
}

async function startServer() {
  const app = createApiApp();
  const port = resolveServerPort();
  const host = getCliArg('--host') || '0.0.0.0';
  const httpServer = http.createServer(app);

  const distDir = path.resolve(process.cwd(), 'dist');
  const isApiOnly = process.env.API_ONLY === 'true';
  const useProdStatic = !isApiOnly && process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distDir, 'index.html'));

  if (useProdStatic) {
    app.use((req, res, next) => {
      if (
        req.path === '/' ||
        req.path === '/index.html' ||
        req.path === '/sw.js' ||
        req.path === '/sw-push.js'
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      next();
    });
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else if (isApiOnly || process.env.NODE_ENV === 'production') {
    app.get('/', (_req, res) => {
      res.json({ ok: true, service: 'DeportesPMY Backend API' });
    });
  } else {
    // Initialize Vite middleware in parallel so port 3000 binds immediately without startup timeouts
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const viteReadyPromise = import('vite').then(({ createServer: createViteServer }) =>
      createViteServer({
        server: {
          middlewareMode: true,
          hmr: disableHmr ? false : { server: httpServer },
        },
        appType: 'spa',
      })
    );
    viteReadyPromise.catch((err) => {
      console.error('Error al inicializar Vite middleware:', err);
    });
    app.use((req, res, next) => {
      if (
        req.path === '/' ||
        req.path === '/index.html' ||
        req.path === '/sw.js' ||
        req.path === '/sw-push.js'
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      viteReadyPromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  }

  httpServer.on('error', (err) => {
    console.error('Error al iniciar el servidor HTTP:', err);
    process.exit(1);
  });

  httpServer.listen(port, host, () => {
    console.log(`🚀 Servidor DeportesPMY iniciado en http://${host}:${port}`);
    // Barrido automático de recordatorios Push previos al partido (cada 5 min)
    setTimeout(() => {
      runPreMatchReminderSweep().catch(() => {});
    }, 20000);
    setInterval(() => {
      runPreMatchReminderSweep().catch(() => {});
    }, 5 * 60 * 1000);
  });
}

startServer().catch((err) => {
  console.error('Error fatal en startServer:', err);
  process.exit(1);
});
