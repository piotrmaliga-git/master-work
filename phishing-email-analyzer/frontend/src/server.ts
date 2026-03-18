import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import type { Request } from 'express';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();
const DEFAULT_LOCALE = 'en';
const LOCALE_COOKIE_NAME = 'preferred_locale';
const SUPPORTED_LOCALES = new Set(['en', 'pl']);

function getLocaleFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((item) => item.trim());
  const localePair = cookies.find((item) => item.startsWith(`${LOCALE_COOKIE_NAME}=`));
  if (!localePair) {
    return null;
  }

  const value = decodeURIComponent(localePair.split('=')[1] ?? '').toLowerCase();
  return SUPPORTED_LOCALES.has(value) ? value : null;
}

function getLocaleFromAcceptLanguage(req: Request): string {
  const header = req.headers['accept-language'];
  if (!header) {
    return DEFAULT_LOCALE;
  }

  const value = Array.isArray(header) ? header.join(',') : header;
  const normalized = value.toLowerCase();
  if (normalized.includes('pl')) {
    return 'pl';
  }

  return DEFAULT_LOCALE;
}

function resolvePreferredLocale(req: Request): string {
  return getLocaleFromCookie(req) ?? getLocaleFromAcceptLanguage(req);
}

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
app.use(express.json());

app.get('/api/locale', (req, res) => {
  res.json({ locale: resolvePreferredLocale(req) });
});

app.post('/api/locale', (req, res) => {
  const requestedLocale = typeof req.body?.locale === 'string' ? req.body.locale.toLowerCase() : '';

  if (!SUPPORTED_LOCALES.has(requestedLocale)) {
    res.status(400).json({ error: 'Unsupported locale' });
    return;
  }

  res.cookie(LOCALE_COOKIE_NAME, requestedLocale, {
    maxAge: 365 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  res.status(204).send();
});

// Redirect only root path to locale-specific base path.
app.get('/', (req, res, next) => {
  if (req.path !== '/') {
    next();
    return;
  }

  const preferredLocale = resolvePreferredLocale(req);
  const targetPath = preferredLocale === 'pl' ? '/pl' : '/en';
  res.redirect(302, targetPath);
});

 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
