import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import chatbotRoutes from './routes/chatbotRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();

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
  res.status(200).json({ status: 'ok', message: 'Healing Hands4U API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/admin', adminRoutes);

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

