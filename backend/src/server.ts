import './utils/env.js';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { getEnv } from './utils/env.js';

import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendars.js';
import eventRoutes from './routes/events.js';
import configRoutes from './routes/config.js';

const app = express();
const PORT = Number(getEnv('PORT', '3000'));

// Middleware
app.use(
  cors({
    origin: getEnv('FRONTEND_URL', 'http://localhost:5173'),
    credentials: true,
  })
);
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
  })
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📅 Frontend URL: ${getEnv('FRONTEND_URL', 'http://localhost:5173')}`);
});
