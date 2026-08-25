# Drop6 🚀
### *“Share files without sharing your number.”*

Drop6 is a temporary, privacy-first file sharing platform. Users can upload single or multiple files and instantly generate:
- **A Shareable Link**
- **A 6-Digit Access Code** (e.g. `489201`)
- **A Scannable QR Code** (Downloadable as PNG or SVG)

Recipients can immediately access, preview, and download files (individually or as a **streaming ZIP**) **without creating an account, without passwords, and without sharing a phone number**.

---

## ✨ Key Features

1. **Anonymous & Temporary**:
   - Zero signup, no phone numbers, no user profiles, no personal data collection.
2. **Multi-File Uploads**:
   - Drag & drop or browse multiple files (up to 100MB per share).
   - Real-time animated per-file and total upload progress.
3. **6-Digit Access Code**:
   - Cryptographically random 6-digit access code for quick retrieval on any device.
   - Interactive 6-box PIN input with auto-advance and clipboard paste support.
4. **Instant QR Code Sharing**:
   - Scannable QR code generated automatically on upload.
   - Download as high-resolution PNG or vector SVG.
5. **Multi-Format In-Browser Previews**:
   - **Images**: Lightbox preview with zoom.
   - **PDFs**: Embedded viewer.
   - **Audio**: Built-in player.
   - **Video**: Built-in video player.
   - **Code & Text**: Formatted viewer for code, JSON, Markdown, CSV, etc.
6. **Streaming ZIP Download**:
   - One-click "Download All as ZIP" that streams files directly from the backend with zero high memory buffering.
7. **Sender Management Controls**:
   - Senders receive a cryptographic `manageKey` stored securely in their session/browser.
   - **Extend Expiry**: Add +15m, +30m, +1h, or +6h.
   - **Delete Share**: Permanently and immediately delete files from storage and database.
   - **Download Activity**: Live count of downloads and last downloaded timestamp.
8. **Server-Side Automated Expiry & Cleanup**:
   - Scheduled background runner scans and permanently purges expired/deleted files from disk and database every minute.
9. **Built-in Security & Protection**:
   - Strict rate limiting on 6-digit code lookups to prevent brute force.
   - Path traversal prevention & safe filename sanitization.
   - Sanitized JSON errors without leaking stack traces.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Lucide Icons, Canvas Confetti, QRCode.react, Vanilla CSS Design Tokens (Glassmorphism, Obsidian Dark Theme, Fluid Animations).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (`sqlite3`) with WAL mode for speed and zero external database setup required.
- **Storage**: Pluggable storage adapter supporting Local Disk Storage and S3/Supabase/R2 Object Storage.
- **Archiving**: `archiver` for streaming ZIP compression.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm run install:all
```
*Or manually:*
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 3. Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```
Default `.env` configuration:
```env
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

MAX_FILE_SIZE_MB=100
MAX_FILES_PER_SHARE=20
MAX_SHARE_EXPIRY_HOURS=24
CLEANUP_INTERVAL_SECONDS=60

CODE_RATE_LIMIT_WINDOW_MINUTES=15
CODE_RATE_LIMIT_MAX_ATTEMPTS=15
UPLOAD_RATE_LIMIT_WINDOW_MINUTES=15
UPLOAD_RATE_LIMIT_MAX=30

STORAGE_TYPE=local
UPLOAD_DIR=./uploads
```

### 4. Running Locally
Start both backend and frontend concurrently:
```bash
npm run dev
```

- **Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5001](http://localhost:5001)
- **Health Check**: [http://localhost:5001/api/health](http://localhost:5001/api/health)

---

## 🌐 Production Build & Deployment

### 1. Build the Frontend
```bash
npm run build
```
This bundles the optimized React frontend into `client/dist/`.

### 2. Start the Production Server
```bash
npm start
```
The Express server will automatically serve the API endpoints and the static frontend build from `client/dist/` on port `5001`.

---

## 🔒 Security Highlights

1. **Brute Force Protection**: 6-digit code verification is rate-limited per IP.
2. **Path Traversal Protection**: Files are assigned internal UUID keys; directory resolution validates paths stay within the share sandbox.
3. **Sender Authorization**: Share modification and deletion endpoints require matching cryptographic `manageKey` tokens.
4. **No Plaintext Leaks**: Recipient downloads use safe stream headers with sanitized original filenames.

---

## 📄 License
MIT License. Built for fast, temporary, private file transfers.
