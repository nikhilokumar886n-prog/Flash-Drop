import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { config } from '../config/config.js';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rm);
const stat = promisify(fs.stat);

try {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Storage dir warning:', err.message);
}

export const storageService = {
  /**
   * Get the directory for a specific share
   */
  getShareDir(shareId) {
    return path.join(config.uploadDir, shareId);
  },

  /**
   * Ensure directory exists for a share
   */
  async ensureShareDir(shareId) {
    const shareDir = this.getShareDir(shareId);
    if (!fs.existsSync(shareDir)) {
      await mkdir(shareDir, { recursive: true });
    }
    return shareDir;
  },

  /**
   * Get safe absolute file path
   */
  getFilePath(shareId, storedName) {
    const shareDir = this.getShareDir(shareId);
    const resolvedPath = path.resolve(shareDir, storedName);

    // Prevent directory traversal attacks
    if (!resolvedPath.startsWith(path.resolve(shareDir))) {
      throw new Error('Access denied: Invalid file path traversal.');
    }
    return resolvedPath;
  },

  /**
   * Check if file exists on disk
   */
  async fileExists(shareId, storedName) {
    try {
      const filePath = this.getFilePath(shareId, storedName);
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get readable stream of a file
   */
  createReadStream(shareId, storedName) {
    const filePath = this.getFilePath(shareId, storedName);
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist on storage.');
    }
    return fs.createReadStream(filePath);
  },

  /**
   * Delete single file
   */
  async deleteFile(shareId, storedName) {
    try {
      const filePath = this.getFilePath(shareId, storedName);
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete file ${storedName} from share ${shareId}:`, err.message);
    }
  },

  /**
   * Delete entire share folder and all contained files
   */
  async deleteShareFiles(shareId) {
    try {
      const shareDir = this.getShareDir(shareId);
      if (fs.existsSync(shareDir)) {
        await rmdir(shareDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Failed to delete storage directory for share ${shareId}:`, err.message);
    }
  }
};
