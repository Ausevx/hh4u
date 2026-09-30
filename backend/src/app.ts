import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import adminRoutes from './routes/adminRoutes';
import syncRoutes from './routes/syncRoutes';

const app = express();
// Set only to the number of trusted reverse proxies in the deployment.
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// JSON syntax error handler middleware immediately after express.json()
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({ success: false, message: 'Invalid JSON payload' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Payload too large' });
    return;
  }
  next(err);
});

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Healing Hands4U API is running',
    version: '2.0.0',
    buildDate: '2026-10-01',
    revision: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || process.env.APP_REVISION || 'local',
    changelog: [
      'v2.0.0 (2026-10-01): Fixed confident match logic — removed matchScoreMargin that was blocking 95%+ of correct answers',
      'v1.9.0 (2026-09-25): Rewired consultation flow to use real backend queries (no more hardcoded burning sensation bug)',
      'v1.8.0 (2026-09-25): Added pipeline LRU cache, local offline fast-path, merged intent+translate into 1 LLM call',
      'v1.7.0 (2026-09-25): Stripped all markdown from AI responses, added dual-layer markdown stripping in UI',
    ],
    searchFlow: 'multilingual-cloud-v2',
    translationConfigured: !!process.env.GOOGLE_CLOUD_PROJECT,
  });
});

app.use('/api/auth', authRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sync', syncRoutes);

// Global fallback error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = typeof err.status === 'number' ? err.status : 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
export { app };

