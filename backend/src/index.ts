import app from './app';
import connectDB from './config/db';
import { verifyAndInitializeVectorPipeline } from './services/vectorBackfillService';

const port = process.env.PORT || 5000;

async function startServer() {
  // Connect to Database
  await connectDB();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  // Verify vector pipeline and initiate backfill if needed
  verifyAndInitializeVectorPipeline().catch((err) => {
    console.error('[VectorPipeline] Startup initialization error:', err);
  });
}

startServer();

