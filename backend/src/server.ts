import './utils/env.js';

import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEnv } from './utils/env.js';

import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendars.js';
import eventRoutes from './routes/events.js';
import configRoutes from './routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(getEnv('PORT', '3000'));

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: getEnv('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: getEnv('NODE_ENV', 'development') === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    proxy: true,
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

app.get('/*path', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
