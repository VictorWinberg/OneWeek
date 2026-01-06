import './utils/env.js';

import express from 'express';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from './utils/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendars.js';
import eventRoutes from './routes/events.js';
import configRoutes from './routes/config.js';
import tasksRoutes from './routes/tasks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(getEnv('PORT', '3000'));
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  cookieSession({
    name: 'session',
    keys: [getEnv('SESSION_SECRET')],
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // Only set secure=true in production (HTTPS required)
    // In development, cookies won't work over HTTP if secure=true
    secure: IS_PRODUCTION,
    httpOnly: true,
    signed: true,
    sameSite: 'lax',
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/config', configRoutes);
app.use('/api/tasks', tasksRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

app.get('/*path', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Global error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
