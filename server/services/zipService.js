import archiver from 'archiver';
import fs from 'fs';
import { storageService } from './storageService.js';

/**
 * Stream a zip archive of all share files to response
 */
export function streamZipArchive(share, files, res) {
  const archive = archiver('zip', {
    zlib: { level: 6 } // Balanced compression
  });

  const zipName = `FlashDrop_${share.title ? share.title.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Files'}_${share.access_code}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create zip archive' });
    }
  });

  archive.pipe(res);

  // Append each file to the archive
  for (const file of files) {
    try {
      const filePath = storageService.getFilePath(share.id, file.stored_name);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.original_name });
      }
    } catch (err) {
      console.warn(`Could not add file ${file.original_name} to zip:`, err.message);
    }
  }

  archive.finalize();
}
