import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import query from '../db/database.js';

/**
 * Generate a cryptographically secure 6-digit numerical code (100000 - 999999)
 */
export function generateRandomCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generate a collision-resistant active 6-digit code
 */
export async function generateUniqueAccessCode(maxRetries = 10) {
  const now = Date.now();
  for (let i = 0; i < maxRetries; i++) {
    const code = generateRandomCode();
    // Check if code is currently taken by an active unexpired share
    const existing = await query.get(
      `SELECT id FROM shares WHERE access_code = ? AND is_deleted = 0 AND expires_at > ?`,
      [code, now]
    );
    if (!existing) {
      return code;
    }
  }
  // Fallback if collision rate is high: 7-digit secure code
  return crypto.randomInt(100000, 9999999).toString();
}

/**
 * Generate unique shareId
 */
export function generateShareId() {
  return uuidv4();
}

/**
 * Generate a cryptographically random manage key
 */
export function generateManageKey() {
  return crypto.randomBytes(24).toString('hex');
}
