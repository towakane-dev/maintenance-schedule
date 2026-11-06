import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { authRouter } from './modules/auth/presentation/routes';
import { assetsRouter } from './modules/assets/presentation/routes';
import { schedulesRouter } from './modules/schedules/presentation/routes';
import { syncRouter } from './sync';
import { activityLogsRouter } from './modules/activity-logs/presentation/routes';
import { notificationsRouter } from './modules/notifications/presentation/routes';
import { checkNotifications } from './modules/notifications/service';
import { scheduleDailyDigest } from './modules/notifications/email-digest';
import { apiLimiter } from './shared/rate-limit';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

// Trust one reverse-proxy hop (nginx/cloudflare) so req.ip and rate
// limiting reflect the real client IP. Safe value for local dev too.
app.set('trust proxy', 1);

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  throw new Error('DATABASE_URL and JWT_SECRET must be configured in .env');
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/schedules', schedulesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/activity-logs', activityLogsRouter);
app.use('/api/notifications', notificationsRouter);
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// SPA fallback: serve the built frontend for client-side routes like /users,
// but never swallow API requests or non-GET requests.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`HRGA server running at http://localhost:${port}`);
  void checkNotifications();
  setInterval(() => void checkNotifications(), 60 * 1000);
  scheduleDailyDigest();
});
