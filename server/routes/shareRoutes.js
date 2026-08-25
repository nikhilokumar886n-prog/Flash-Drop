import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { shareController } from '../controllers/shareController.js';
import { codeLookupLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/config.js';

const router = express.Router();

// Configure multer temp storage
const tempUploadDir = path.join(os.tmpdir(), 'drop6-uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
    files: config.maxFilesPerShare
  }
});

// Routes
router.post('/', uploadLimiter, upload.array('files', config.maxFilesPerShare), shareController.createShare);
router.get('/code/:code', codeLookupLimiter, shareController.getShareByCode);
router.get('/:id', shareController.getShareById);
router.get('/:id/manage', shareController.getManageInfo);
router.patch('/:id/extend', shareController.extendExpiry);
router.delete('/:id', shareController.deleteShare);
router.get('/:id/files/:fileId/download', shareController.downloadFile);
router.get('/:id/files/:fileId/preview', shareController.previewFile);
router.get('/:id/download-zip', shareController.downloadZip);
router.get('/:id/qr', shareController.getQRCode);

export default router;
