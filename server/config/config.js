import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

export const config = {
  isVercel,
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
  
  // Storage Engine (Options: cloudinary | local | s3)
  storageType: process.env.STORAGE_TYPE || (process.env.CLOUDINARY_CLOUD_NAME || isVercel ? 'cloudinary' : 'local'),
  uploadDir: isVercel ? '/tmp/uploads' : path.resolve(__dirname, '../../uploads'),
  
  // Cloudinary configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'irwsuoub',
    apiKey: process.env.CLOUDINARY_API_KEY || '584624662632278',
    apiSecret: process.env.CLOUDINARY_API_SECRET || 'B1Hc-sHAOhbhJCcVkN4e1c-0lKI',
  },

  // Optional S3 configuration
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucketName: process.env.S3_BUCKET_NAME,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
};
