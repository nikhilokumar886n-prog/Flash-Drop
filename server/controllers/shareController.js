import path from 'path';
import fs from 'fs';
import os from 'os';
import QRCode from 'qrcode';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import query from '../db/database.js';
import { config } from '../config/config.js';
import { storageService } from '../services/storageService.js';
import { streamZipArchive } from '../services/zipService.js';
import {
  generateUniqueAccessCode,
  generateShareId,
  generateManageKey
} from '../services/codeService.js';
import { sanitizeFilename, verifyManageKey } from '../utils/security.js';

/**
 * Get machine's local network IPv4 address (e.g. 192.168.x.x)
 */
function getNetworkIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Dynamically extract base URL from incoming request
 */
function getBaseUrl(req) {
  const origin = req.get('origin');
  if (origin) return origin;

  const referer = req.get('referer');
  if (referer) {
    try {
      const u = new URL(referer);
      return u.origin;
    } catch {}
  }

  const host = req.get('host');
  if (host) {
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
  }

  return config.clientUrl || `http://localhost:${config.port}`;
}

/**
 * Get base URL with local network IP for mobile QR scanning
 */
function getNetworkBaseUrl(req) {
  const lanIp = getNetworkIp();
  if (lanIp) {
    const host = req.get('host') || '';
    const portMatch = host.match(/:(\d+)$/);
    const port = portMatch ? portMatch[1] : (config.port || '5001');
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${protocol}://${lanIp}:${port}`;
  }
  return getBaseUrl(req);
}

export const shareController = {
  /**
   * Upload files and create a new share
   */
  async createShare(req, res, next) {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Please select at least one file to upload.' });
      }

      if (files.length > config.maxFilesPerShare) {
        return res.status(400).json({
          error: `Maximum ${config.maxFilesPerShare} files allowed per share.`
        });
      }

      // Expiry calculation
      let expiryMinutes = parseInt(req.body.expiryMinutes, 10);
      if (isNaN(expiryMinutes) || expiryMinutes <= 0) {
        expiryMinutes = 60; // Default 1 hour
      }
      const maxMinutes = config.maxShareExpiryHours * 60;
      if (expiryMinutes > maxMinutes) {
        expiryMinutes = maxMinutes;
      }

      const now = Date.now();
      const expiresAt = now + expiryMinutes * 60 * 1000;
      const shareId = generateShareId();
      const accessCode = await generateUniqueAccessCode();
      const manageKey = generateManageKey();
      const title = (req.body.title || '').trim().slice(0, 100) || null;

      // Ensure storage directory exists
      await storageService.ensureShareDir(shareId);

      // Save files to disk and prepare DB file records
      const fileRecords = [];
      for (const file of files) {
        const fileId = uuidv4();
        const originalName = sanitizeFilename(file.originalname);
        const ext = path.extname(originalName);
        const storedName = `${fileId}${ext}`;
        const targetPath = storageService.getFilePath(shareId, storedName);

        if (file.path) {
          await fs.promises.rename(file.path, targetPath);
        } else if (file.buffer) {
          await fs.promises.writeFile(targetPath, file.buffer);
        }

        const mimeType = file.mimetype || mime.lookup(originalName) || 'application/octet-stream';
        const sizeBytes = file.size;

        fileRecords.push({
          id: fileId,
          shareId,
          originalName,
          storedName,
          mimeType,
          sizeBytes,
          storagePath: targetPath,
          createdAt: now
        });
      }

      // Insert share into DB
      await query.run(
        `INSERT INTO shares (id, access_code, manage_key, title, created_at, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [shareId, accessCode, manageKey, title, now, expiresAt]
      );

      // Insert file metadata into DB
      for (const f of fileRecords) {
        await query.run(
          `INSERT INTO files (id, share_id, original_name, stored_name, mime_type, size_bytes, storage_path, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [f.id, f.shareId, f.originalName, f.storedName, f.mimeType, f.sizeBytes, f.storagePath, f.createdAt]
        );
      }

      // Generate dynamic share link and QR code Data URL
      const baseUrl = getBaseUrl(req);
      const networkBaseUrl = getNetworkBaseUrl(req);
      const shareUrl = `${baseUrl}/s/${shareId}`;
      const networkShareUrl = `${networkBaseUrl}/s/${shareId}`;

      // Use the network share URL for QR codes so mobile phones can connect over LAN/Wi-Fi
      const qrTargetUrl = networkShareUrl;
      const qrCodeDataUrl = await QRCode.toDataURL(qrTargetUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      res.status(201).json({
        shareId,
        accessCode,
        manageKey,
        title,
        shareUrl,
        networkShareUrl,
        localIp: getNetworkIp(),
        qrCodeDataUrl,
        createdAt: now,
        expiresAt,
        expiryMinutes,
        fileCount: fileRecords.length,
        totalSizeBytes: fileRecords.reduce((acc, f) => acc + f.sizeBytes, 0),
        files: fileRecords.map(f => ({
          id: f.id,
          originalName: f.originalName,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes
        }))
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lookup share by 6-digit access code
   */
  async getShareByCode(req, res, next) {
    try {
      const code = (req.params.code || '').trim();
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Please enter a valid 6-digit access code.' });
      }

      const now = Date.now();
      const share = await query.get(
        `SELECT id, access_code, title, created_at, expires_at, download_count, last_downloaded_at, is_deleted, status 
         FROM shares WHERE access_code = ?`,
        [code]
      );

      if (!share || share.is_deleted || share.status !== 'active') {
        return res.status(404).json({
          error: 'No active share found with this 6-digit code. It may have expired or been deleted.'
        });
      }

      if (share.expires_at <= now) {
        return res.status(410).json({
          error: 'This share has expired and the files are no longer available.'
        });
      }

      const files = await query.all(
        `SELECT id, original_name, mime_type, size_bytes, created_at 
         FROM files WHERE share_id = ? ORDER BY created_at ASC`,
        [share.id]
      );

      res.json({
        shareId: share.id,
        accessCode: share.access_code,
        title: share.title,
        createdAt: share.created_at,
        expiresAt: share.expires_at,
        remainingSeconds: Math.max(0, Math.floor((share.expires_at - now) / 1000)),
        downloadCount: share.download_count,
        fileCount: files.length,
        totalSizeBytes: files.reduce((sum, f) => sum + f.size_bytes, 0),
        files: files.map(f => ({
          id: f.id,
          name: f.original_name,
          mimeType: f.mime_type,
          size: f.size_bytes,
          downloadUrl: `/api/shares/${share.id}/files/${f.id}/download`,
          previewUrl: `/api/shares/${share.id}/files/${f.id}/preview`
        }))
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Lookup share by shareId (for direct links and QR scans)
   */
  async getShareById(req, res, next) {
    try {
      const { id } = req.params;
      const now = Date.now();

      const share = await query.get(
        `SELECT id, access_code, title, created_at, expires_at, download_count, last_downloaded_at, is_deleted, status 
         FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted || share.status !== 'active') {
        return res.status(404).json({
          error: 'Share not found or has been deleted.'
        });
      }

      if (share.expires_at <= now) {
        return res.status(410).json({
          error: 'This share has expired and the files are no longer available.'
        });
      }

      const files = await query.all(
        `SELECT id, original_name, mime_type, size_bytes, created_at 
         FROM files WHERE share_id = ? ORDER BY created_at ASC`,
        [share.id]
      );

      res.json({
        shareId: share.id,
        accessCode: share.access_code,
        title: share.title,
        createdAt: share.created_at,
        expiresAt: share.expires_at,
        remainingSeconds: Math.max(0, Math.floor((share.expires_at - now) / 1000)),
        downloadCount: share.download_count,
        fileCount: files.length,
        totalSizeBytes: files.reduce((sum, f) => sum + f.size_bytes, 0),
        files: files.map(f => ({
          id: f.id,
          name: f.original_name,
          mimeType: f.mime_type,
          size: f.size_bytes,
          downloadUrl: `/api/shares/${share.id}/files/${f.id}/download`,
          previewUrl: `/api/shares/${share.id}/files/${f.id}/preview`
        }))
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Sender management overview (requires valid manageKey)
   */
  async getManageInfo(req, res, next) {
    try {
      const { id } = req.params;
      const manageKey = req.headers['x-manage-key'] || req.query.key;
      const now = Date.now();

      const share = await query.get(
        `SELECT id, access_code, manage_key, title, created_at, expires_at, download_count, last_downloaded_at, is_deleted, status 
         FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted) {
        return res.status(404).json({ error: 'Share not found or has been deleted.' });
      }

      if (!verifyManageKey(share.manage_key, manageKey)) {
        return res.status(403).json({ error: 'Unauthorized: Invalid management key.' });
      }

      const files = await query.all(
        `SELECT id, original_name, mime_type, size_bytes, created_at 
         FROM files WHERE share_id = ? ORDER BY created_at ASC`,
        [share.id]
      );

      const baseUrl = getBaseUrl(req);
      const networkBaseUrl = getNetworkBaseUrl(req);
      const shareUrl = `${baseUrl}/s/${share.id}`;
      const networkShareUrl = `${networkBaseUrl}/s/${share.id}`;

      const qrCodeDataUrl = await QRCode.toDataURL(networkShareUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });

      res.json({
        shareId: share.id,
        accessCode: share.access_code,
        title: share.title,
        createdAt: share.created_at,
        expiresAt: share.expires_at,
        remainingSeconds: Math.max(0, Math.floor((share.expires_at - now) / 1000)),
        downloadCount: share.download_count,
        lastDownloadedAt: share.last_downloaded_at,
        shareUrl,
        networkShareUrl,
        localIp: getNetworkIp(),
        qrCodeDataUrl,
        fileCount: files.length,
        totalSizeBytes: files.reduce((sum, f) => sum + f.size_bytes, 0),
        files: files.map(f => ({
          id: f.id,
          name: f.original_name,
          mimeType: f.mime_type,
          size: f.size_bytes,
          downloadUrl: `/api/shares/${share.id}/files/${f.id}/download`,
          previewUrl: `/api/shares/${share.id}/files/${f.id}/preview`
        }))
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Extend share expiry time (requires valid manageKey)
   */
  async extendExpiry(req, res, next) {
    try {
      const { id } = req.params;
      const manageKey = req.headers['x-manage-key'] || req.body.manageKey;
      const additionalMinutes = parseInt(req.body.additionalMinutes, 10);

      if (isNaN(additionalMinutes) || additionalMinutes <= 0) {
        return res.status(400).json({ error: 'Please provide valid additional minutes.' });
      }

      const share = await query.get(
        `SELECT id, manage_key, created_at, expires_at, is_deleted, status FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted || share.status !== 'active') {
        return res.status(404).json({ error: 'Share not found or has expired/been deleted.' });
      }

      if (!verifyManageKey(share.manage_key, manageKey)) {
        return res.status(403).json({ error: 'Unauthorized: Invalid management key.' });
      }

      const now = Date.now();
      const currentExpiry = Math.max(now, share.expires_at);
      const newExpiresAt = currentExpiry + additionalMinutes * 60 * 1000;

      const maxCeiling = share.created_at + config.maxShareExpiryHours * 60 * 60 * 1000;
      const finalExpiresAt = Math.min(newExpiresAt, maxCeiling);

      await query.run(`UPDATE shares SET expires_at = ? WHERE id = ?`, [finalExpiresAt, id]);

      res.json({
        message: 'Expiry successfully extended.',
        expiresAt: finalExpiresAt,
        remainingSeconds: Math.max(0, Math.floor((finalExpiresAt - now) / 1000))
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete share manually (requires valid manageKey)
   */
  async deleteShare(req, res, next) {
    try {
      const { id } = req.params;
      const manageKey = req.headers['x-manage-key'] || req.body.manageKey || req.query.key;

      const share = await query.get(
        `SELECT id, manage_key, is_deleted FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted) {
        return res.status(404).json({ error: 'Share not found or already deleted.' });
      }

      if (!verifyManageKey(share.manage_key, manageKey)) {
        return res.status(403).json({ error: 'Unauthorized: Invalid management key.' });
      }

      await storageService.deleteShareFiles(id);
      await query.run(`DELETE FROM files WHERE share_id = ?`, [id]);
      await query.run(
        `UPDATE shares SET is_deleted = 1, status = 'deleted' WHERE id = ?`,
        [id]
      );

      res.json({ message: 'Share and all files deleted successfully.' });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Download single file
   */
  async downloadFile(req, res, next) {
    try {
      const { id, fileId } = req.params;
      const now = Date.now();

      const share = await query.get(
        `SELECT id, expires_at, is_deleted, status FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted || share.status !== 'active') {
        return res.status(404).json({ error: 'Share not found or is no longer active.' });
      }

      if (share.expires_at <= now) {
        return res.status(410).json({ error: 'This share has expired and files are no longer available.' });
      }

      const file = await query.get(
        `SELECT id, original_name, stored_name, mime_type, size_bytes FROM files WHERE id = ? AND share_id = ?`,
        [fileId, id]
      );

      if (!file) {
        return res.status(404).json({ error: 'File not found.' });
      }

      const filePath = storageService.getFilePath(id, file.stored_name);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File no longer exists in storage.' });
      }

      await query.run(
        `UPDATE shares SET download_count = download_count + 1, last_downloaded_at = ? WHERE id = ?`,
        [now, id]
      );

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Length', file.size_bytes);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Preview file inline (images, pdf, audio, video, text)
   */
  async previewFile(req, res, next) {
    try {
      const { id, fileId } = req.params;
      const now = Date.now();

      const share = await query.get(
        `SELECT id, expires_at, is_deleted, status FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted || share.status !== 'active' || share.expires_at <= now) {
        return res.status(404).json({ error: 'Share expired or not available.' });
      }

      const file = await query.get(
        `SELECT id, original_name, stored_name, mime_type, size_bytes FROM files WHERE id = ? AND share_id = ?`,
        [fileId, id]
      );

      if (!file) {
        return res.status(404).json({ error: 'File not found.' });
      }

      const filePath = storageService.getFilePath(id, file.stored_name);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found.' });
      }

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Length', file.size_bytes);

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Download all files as a streamed ZIP
   */
  async downloadZip(req, res, next) {
    try {
      const { id } = req.params;
      const now = Date.now();

      const share = await query.get(
        `SELECT id, access_code, title, expires_at, is_deleted, status FROM shares WHERE id = ?`,
        [id]
      );

      if (!share || share.is_deleted || share.status !== 'active') {
        return res.status(404).json({ error: 'Share not found or is no longer active.' });
      }

      if (share.expires_at <= now) {
        return res.status(410).json({ error: 'This share has expired and files are no longer available.' });
      }

      const files = await query.all(
        `SELECT id, original_name, stored_name, mime_type, size_bytes FROM files WHERE share_id = ?`,
        [id]
      );

      if (!files || files.length === 0) {
        return res.status(404).json({ error: 'No files found in this share.' });
      }

      await query.run(
        `UPDATE shares SET download_count = download_count + 1, last_downloaded_at = ? WHERE id = ?`,
        [now, id]
      );

      streamZipArchive(share, files, res);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Direct QR code image generator endpoint (SVG or PNG)
   */
  async getQRCode(req, res, next) {
    try {
      const { id } = req.params;
      const format = req.query.format === 'svg' ? 'svg' : 'png';
      const baseUrl = getNetworkBaseUrl(req);
      const shareUrl = `${baseUrl}/s/${id}`;

      if (format === 'svg') {
        const svg = await QRCode.toString(shareUrl, {
          type: 'svg',
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `inline; filename="Drop6-QR-${id}.svg"`);
        return res.send(svg);
      }

      const buffer = await QRCode.toBuffer(shareUrl, {
        type: 'png',
        margin: 2,
        width: 512,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="Drop6-QR-${id}.png"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
};
