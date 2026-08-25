import query from '../db/database.js';
import { storageService } from './storageService.js';
import { config } from '../config/config.js';

let intervalTimer = null;

/**
 * Scan and permanently clean up expired and deleted shares
 */
export async function cleanupExpiredShares() {
  const now = Date.now();
  try {
    // Find expired or deleted shares that still have files or active status
    const expiredShares = await query.all(
      `SELECT id, access_code, status FROM shares 
       WHERE (expires_at <= ? OR is_deleted = 1) 
       AND status != 'cleaned'`,
      [now]
    );

    if (expiredShares.length === 0) {
      return;
    }

    console.log(`🧹 Running Drop6 expiry cleanup: found ${expiredShares.length} expired/deleted share(s)...`);

    for (const share of expiredShares) {
      try {
        // 1. Delete physical files from disk/storage
        await storageService.deleteShareFiles(share.id);

        // 2. Mark files removed in DB
        await query.run(`DELETE FROM files WHERE share_id = ?`, [share.id]);

        // 3. Mark share status as cleaned
        await query.run(
          `UPDATE shares SET status = 'cleaned', is_deleted = 1 WHERE id = ?`,
          [share.id]
        );

        console.log(`✅ Cleaned up share ${share.id} (Code: ${share.access_code})`);
      } catch (err) {
        console.error(`❌ Error cleaning up share ${share.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error during cleanup task:', err.message);
  }
}

/**
 * Start the background cleanup scheduler
 */
export function startCleanupScheduler() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  // Run initial cleanup on startup
  cleanupExpiredShares();

  const intervalMs = config.cleanupIntervalSeconds * 1000;
  intervalTimer = setInterval(() => {
    cleanupExpiredShares();
  }, intervalMs);

  console.log(`⏱️ Expiry cleanup scheduler started (running every ${config.cleanupIntervalSeconds}s).`);
}

/**
 * Stop scheduler on server shutdown
 */
export function stopCleanupScheduler() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
