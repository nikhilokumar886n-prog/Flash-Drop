import archiver from 'archiver';
import fs from 'fs';
import { storageService } from './storageService.js';

/**
 * Stream a zip archive of all share files to response
 */
export async function streamZipArchive(share, files, res) {
  const archive = archiver('zip', {
    zlib: { level: 6 }
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

  // Append each file (Cloudinary stream or local file)
  for (const file of files) {
    try {
      if (file.storage_path && (file.storage_path.startsWith('http://') || file.storage_path.startsWith('https://'))) {
        const stream = await storageService.createReadStream(file.storage_path, file.stored_name);
        archive.append(stream, { name: file.original_name });
      } else {
        const filePath = file.storage_path || storageService.getFilePath(share.id, file.stored_name);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file.original_name });
        }
      }
    } catch (err) {
      console.warn(`Could not add file ${file.original_name} to zip:`, err.message);
    }
  }

  archive.finalize();
}

export default streamZipArchive;
