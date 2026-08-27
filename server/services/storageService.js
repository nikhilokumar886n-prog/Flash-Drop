import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/config.js';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rm);

// Configure Cloudinary if credentials exist
const isCloudinaryActive = Boolean(
  config.cloudinary.cloudName &&
  config.cloudinary.apiKey &&
  config.cloudinary.apiSecret
);

if (isCloudinaryActive) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  console.log(`☁️ Cloudinary Storage Connected: cloud "${config.cloudinary.cloudName}"`);
}

// Ensure base uploads directory exists for local temp use
try {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Storage dir note:', err.message);
}

function getResourceType(mimeType = '', ext = '') {
  const cleanExt = ext.toLowerCase().replace('.', '');
  if (mimeType.startsWith('image/') && !['svg', 'pdf'].includes(cleanExt)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) {
    return 'video';
  }
  return 'raw';
}

export const storageService = {
  isCloudinary() {
    return isCloudinaryActive && (config.storageType === 'cloudinary' || config.isVercel);
  },

  /**
   * Generate signed Cloudinary URL that bypasses 401 PDF/raw restrictions
   */
  getSignedUrl(publicId, resourceType = 'raw') {
    try {
      return cloudinary.utils.private_download_url(publicId, '', {
        resource_type: resourceType,
        type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 7200
      });
    } catch {
      return null;
    }
  },

  /**
   * Save uploaded file either to Cloudinary or local storage
   */
  async saveFile(shareId, file, fileId) {
    const originalName = file.originalname || 'file';
    const ext = path.extname(originalName);
    const mimeType = file.mimetype || 'application/octet-stream';
    const resourceType = getResourceType(mimeType, ext);
    // For raw files (PDFs, docs), keep the extension so download signatures match
    const storedPublicId = resourceType === 'raw' ? `${fileId}${ext}` : fileId;

    if (this.isCloudinary()) {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: `flashdrop/${shareId}`,
          public_id: storedPublicId,
          resource_type: resourceType,
          overwrite: true
        };

        const handleResult = (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            reject(new Error('Cloudinary upload failed: ' + error.message));
          } else {
            resolve({
              storagePath: result.secure_url,
              storedName: result.public_id,
              sizeBytes: result.bytes || file.size,
              format: result.format || ext.replace('.', ''),
              resourceType: result.resource_type || resourceType
            });
          }
        };

        if (file.path && fs.existsSync(file.path)) {
          cloudinary.uploader.upload(file.path, uploadOptions, handleResult);
        } else if (file.buffer) {
          const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, handleResult);
          uploadStream.end(file.buffer);
        } else {
          reject(new Error('No file buffer or path provided for upload.'));
        }
      });
    }

    // Local Disk Storage
    await this.ensureShareDir(shareId);
    const storedName = `${fileId}${ext}`;
    const targetPath = this.getFilePath(shareId, storedName);

    if (file.path && fs.existsSync(file.path)) {
      await fs.promises.rename(file.path, targetPath);
    } else if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    }

    return {
      storagePath: targetPath,
      storedName,
      sizeBytes: file.size,
      format: ext.replace('.', ''),
      resourceType: 'local'
    };
  },

  getShareDir(shareId) {
    return path.join(config.uploadDir, shareId);
  },

  async ensureShareDir(shareId) {
    const shareDir = this.getShareDir(shareId);
    if (!fs.existsSync(shareDir)) {
      await mkdir(shareDir, { recursive: true });
    }
    return shareDir;
  },

  getFilePath(shareId, storedName) {
    const shareDir = this.getShareDir(shareId);
    const resolvedPath = path.resolve(shareDir, storedName);

    if (!resolvedPath.startsWith(path.resolve(shareDir))) {
      throw new Error('Access denied: Invalid file path traversal.');
    }
    return resolvedPath;
  },

  /**
   * Get readable stream of a file (handles signed Cloudinary requests & local disk)
   */
  async createReadStream(storagePath, storedName, mimeType = '') {
    if (this.isCloudinary() || storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const ext = path.extname(storedName || storagePath);
      const resourceType = getResourceType(mimeType, ext);
      
      // Generate authenticated signed URL to bypass 401 delivery restrictions
      let targetUrl = storedName ? this.getSignedUrl(storedName, resourceType) : null;
      if (!targetUrl) {
        targetUrl = storagePath;
      }

      let response = await fetch(targetUrl, {
        headers: { 'Accept': '*/*' },
        redirect: 'follow'
      });

      // If raw failed, fallback to direct storage path
      if (!response.ok && targetUrl !== storagePath) {
        response = await fetch(storagePath, { redirect: 'follow' });
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch cloud file: HTTP ${response.status} ${response.statusText}`);
      }

      return Readable.fromWeb(response.body);
    }

    // Local file stream
    if (!fs.existsSync(storagePath)) {
      throw new Error('File does not exist on storage.');
    }
    return fs.createReadStream(storagePath);
  },

  /**
   * Delete single file
   */
  async deleteFile(shareId, storedName, storagePath = '') {
    if (this.isCloudinary() || storagePath.includes('cloudinary.com')) {
      try {
        const publicId = storedName.includes('/') ? storedName : `flashdrop/${shareId}/${storedName}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      } catch (err) {
        console.warn(`Cloudinary single delete warning (${storedName}):`, err.message);
      }
      return;
    }

    try {
      if (storagePath && fs.existsSync(storagePath)) {
        await unlink(storagePath);
      } else {
        const filePath = this.getFilePath(shareId, storedName);
        if (fs.existsSync(filePath)) {
          await unlink(filePath);
        }
      }
    } catch (err) {
      console.warn(`Local file delete error (${storedName}):`, err.message);
    }
  },

  /**
   * Delete entire share folder and all contained files
   */
  async deleteShareFiles(shareId) {
    if (this.isCloudinary()) {
      try {
        const folderPrefix = `flashdrop/${shareId}`;
        await cloudinary.api.delete_resources_by_prefix(folderPrefix, { resource_type: 'raw' }).catch(() => {});
        await cloudinary.api.delete_resources_by_prefix(folderPrefix, { resource_type: 'image' }).catch(() => {});
        await cloudinary.api.delete_resources_by_prefix(folderPrefix, { resource_type: 'video' }).catch(() => {});
        await cloudinary.api.delete_folder(folderPrefix).catch(() => {});
        console.log(`☁️ Cloudinary folder purged: ${folderPrefix}`);
      } catch (err) {
        console.warn(`Cloudinary folder purge warning for share ${shareId}:`, err.message);
      }
      return;
    }

    try {
      const shareDir = this.getShareDir(shareId);
      if (fs.existsSync(shareDir)) {
        await rmdir(shareDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`Failed to delete local storage directory for share ${shareId}:`, err.message);
    }
  }
};

export default storageService;
