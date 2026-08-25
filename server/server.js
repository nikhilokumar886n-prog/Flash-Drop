import express from 'express';
import cors from 'cors';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';
import { initDatabase } from './db/database.js';
import { startCleanupScheduler, stopCleanupScheduler } from './services/cleanupService.js';
import shareRoutes from './routes/shareRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Trust proxy for accurate rate limiting
app.set('trust proxy', 1);

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-manage-key']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to ensure DB connection on serverless requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await initDatabase();
    } catch (err) {
      return res.status(500).json({ error: 'Database connection failed: ' + err.message });
    }
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FlashDrop API',
    database: 'PostgreSQL',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/shares', shareRoutes);

// Production client static assets serving
const clientDistPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('FlashDrop Backend API running. Start the client dev server or run `npm run build` for full frontend.');
    }
  });
});

// Centralized error handler
app.use(errorHandler);

/**
 * Find first available free port starting from desired port
 */
function getAvailablePort(desiredPort) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getAvailablePort(desiredPort + 1));
      } else {
        resolve(desiredPort);
      }
    });
    tester.once('listening', () => {
      tester.close(() => resolve(desiredPort));
    });
    tester.listen(desiredPort);
  });
}

// Server startup for local & container environments
export async function startServer() {
  try {
    // 1. Initialize PostgreSQL database & tables
    await initDatabase();

    // 2. Start automated expiry background scheduler
    startCleanupScheduler();

    // 3. Find available port
    const requestedPort = config.port || 5001;
    const finalPort = await getAvailablePort(requestedPort);
    config.port = finalPort;

    // 4. Start Express server
    const server = app.listen(finalPort, () => {
      console.log(`\n======================================================`);
      console.log(`⚡ FlashDrop Server is LIVE at http://localhost:${finalPort}`);
      console.log(`🐘 Database: PostgreSQL (FlashDrop on port 5432)`);
      console.log(`📡 Environment: ${config.nodeEnv}`);
      console.log(`📁 Upload Storage: ${config.uploadDir}`);
      console.log(`⚡ Max Upload Size: ${config.maxFileSizeMB} MB | Max Files: ${config.maxFilesPerShare}`);
      console.log(`======================================================\n`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('\n🛑 Gracefully shutting down FlashDrop server...');
      stopCleanupScheduler();
      server.close(() => {
        console.log('💤 FlashDrop server stopped.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    return server;
  } catch (err) {
    console.error('💥 Failed to start FlashDrop server:', err);
    process.exit(1);
  }
}

// Only start standalone server when executed directly (not when imported as a serverless module)
if (!process.env.VERCEL) {
  startServer();
}

export default app;
