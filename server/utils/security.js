import path from 'path';

/**
 * Sanitize filename to avoid path traversal and illegal filesystem characters
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'file_upload';
  }
  // Strip null bytes and control chars
  let clean = filename.replace(/[\x00-\x1f\x80-\x9f]/g, '');
  // Extract base name to avoid path traversal (e.g., ../../etc/passwd)
  clean = path.basename(clean);
  // Replace illegal windows/unix characters with underscore
  clean = clean.replace(/[<>:"/\\|?*]/g, '_');
  // Avoid leading dots / empty names
  clean = clean.replace(/^\.+/, '');
  return clean.trim() || 'file_upload';
}

/**
 * Safely verify manage key match in constant time
 */
export function verifyManageKey(expectedKey, providedKey) {
  if (!expectedKey || !providedKey) return false;
  if (expectedKey.length !== providedKey.length) return false;
  
  let result = 0;
  for (let i = 0; i < expectedKey.length; i++) {
    result |= expectedKey.charCodeAt(i) ^ providedKey.charCodeAt(i);
  }
  return result === 0;
}
