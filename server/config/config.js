import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5001',
  
  // File upload constraints
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
  maxFilesPerShare: parseInt(process.env.MAX_FILES_PER_SHARE || '20', 10),
  maxShareExpiryHours: parseInt(process.env.MAX_SHARE_EXPIRY_HOURS || '24', 10),
  cleanupIntervalSeconds: parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '60', 10),
  
  // Rate Limiting
  codeRateLimitWindowMinutes: parseInt(process.env.CODE_RATE_LIMIT_WINDOW_MINUTES || '15', 10),
  codeRateLimitMaxAttempts: parseInt(process.env.CODE_RATE_LIMIT_MAX_ATTEMPTS || '15', 10),
  uploadRateLimitWindowMinutes: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MINUTES || '15', 10),
  uploadRateLimitMax: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '30', 10),
  
  // Storage
  storageType: process.env.STORAGE_TYPE || 'local',
  uploadDir: path.resolve(__dirname, '../../uploads'),
  
  // Optional S3 configuration
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucketName: process.env.S3_BUCKET_NAME,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
};
