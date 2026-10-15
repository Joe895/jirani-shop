import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rateLimit } from 'express-rate-limit';
import { config } from './lib/config.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { ordersRouter } from './routes/orders.js';
import { paymentsRouter } from './routes/payments.js';
import { adminRouter } from './routes/admin.js';
import { releaseAbandonedUnpaidOrders } from './lib/cleanup.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'https:', 'data:'], connectSrc: ["'self'"],
  } },
}));
app.use(cors({ origin: config.webOrigin.split(',').map(o => o.trim()), credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  // Browser requests that mutate state must come from the configured storefront.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      !req.path.startsWith('/api/payments/mpesa/callback/') &&
      req.get('origin') && !config.webOrigin.split(',').map(x => x.trim()).includes(req.get('origin')!)) {
    res.status(403).json({ error: 'Invalid request origin.' }); return;
  }
  next();
});
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Jirani Shop API' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50 }), authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);
// In production the Express service also hosts the compiled React storefront.
const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
app.use(express.static(webDist));
app.use((req, res) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) { res.sendFile(path.join(webDist, 'index.html')); return; }
  res.status(404).json({ error: 'Endpoint not found.' });
});
// Global error handler: do not leak secrets, SQL errors, or stack traces to browsers.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
app.listen(config.port, () => console.log(`Jirani Shop API: http://localhost:${config.port} (${config.mode} payments)`));
// Run once on start and periodically; avoids indefinitely reserving stock for abandoned orders.
void releaseAbandonedUnpaidOrders().catch(error => console.error('Order cleanup failed:', error));
setInterval(() => {
  void releaseAbandonedUnpaidOrders().catch(error => console.error('Order cleanup failed:', error));
}, 10 * 60_000).unref();
