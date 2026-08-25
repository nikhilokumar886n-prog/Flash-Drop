import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  QrCode as QrIcon,
  Clock,
  Trash2,
  Download,
  Eye,
  Activity,
  AlertTriangle,
  Plus,
  Loader2,
  ShieldCheck,
  File
} from 'lucide-react';
import { ExpiryCountdown } from './ExpiryCountdown';
import { QRCodeModal } from './QRCodeModal';
import { FilePreviewModal } from './FilePreviewModal';
import { api } from '../services/api';

export function SenderDashboard({ shareData, onNewShare, onSwitchToRecipient, onToast }) {
  const [share, setShare] = useState(shareData);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [extendingMinutes, setExtendingMinutes] = useState(30);
  const [isExtending, setIsExtending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamically calculate the active share URL based on the current origin & port
  const shareId = share?.shareId || share?.id || '';
  const effectiveShareUrl = typeof window !== 'undefined' ? `${window.location.origin}/s/${shareId}` : (share?.shareUrl || '');

  useEffect(() => {
    if (!share?.shareId || !share?.manageKey) return;

    const interval = setInterval(async () => {
      try {
        const latest = await api.getManageInfo(share.shareId, share.manageKey);
        setShare(prev => ({
          ...prev,
          downloadCount: latest.downloadCount,
          lastDownloadedAt: latest.lastDownloadedAt,
          expiresAt: latest.expiresAt
        }));
      } catch (err) {
        // Silent catch in polling
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [share?.shareId, share?.manageKey]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(share.accessCode);
    setCopiedCode(true);
    if (onToast) onToast({ type: 'success', message: '6-digit code copied!' });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(effectiveShareUrl);
    setCopiedLink(true);
    if (onToast) onToast({ type: 'success', message: 'Share link copied!' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExtendExpiry = async () => {
    setIsExtending(true);
    try {
      const res = await api.extendExpiry(share.shareId, share.manageKey, extendingMinutes);
      setShare(prev => ({ ...prev, expiresAt: res.expiresAt }));
      setShowExtendModal(false);
      setIsExtending(false);
      if (onToast) onToast({ type: 'success', message: `Expiry extended by ${extendingMinutes} minutes!` });
    } catch (err) {
      setIsExtending(false);
      if (onToast) onToast({ type: 'error', message: err.message || 'Failed to extend expiry.' });
    }
  };

  const handleDeleteShare = async () => {
    setIsDeleting(true);
    try {
      await api.deleteShare(share.shareId, share.manageKey);
      setIsDeleting(false);
      setShowDeleteModal(false);
      if (onToast) onToast({ type: 'info', message: 'Share permanently deleted.' });
      onNewShare();
    } catch (err) {
      setIsDeleting(false);
      if (onToast) onToast({ type: 'error', message: err.message || 'Failed to delete share.' });
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'No downloads yet';
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} mins ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hrs ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Header Banner */}
      <div className="glass-card dashboard-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-emerald">
              <ShieldCheck size={14} />
              <span>Active Share Ready</span>
            </span>
            <ExpiryCountdown expiresAt={share.expiresAt} onExpire={() => {}} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {share.title || 'Your Files Are Ready to Share'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Give the recipient the 6-digit code, share the link, or let them scan the QR code.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
          {onSwitchToRecipient && (
            <button onClick={onSwitchToRecipient} className="btn btn-secondary btn-sm" title="See what the recipient sees">
              <Eye size={15} color="#818cf8" />
              <span>Preview Recipient View</span>
            </button>
          )}
          <button onClick={onNewShare} className="btn btn-primary btn-sm">
            <Plus size={15} />
            <span>Upload More Files</span>
          </button>
        </div>
      </div>

      {/* Triplet Sharing Cards: 6-Digit Code, Direct Link, QR Code */}
      <div className="share-triplet-grid">
        {/* Code Card */}
        <div className="glass-card share-triplet-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Access Code
            </div>
            <div className="pin-code-display">
              {share.accessCode}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Recipient enters this 6-digit code on the Drop6 homepage.
            </p>
          </div>

          <button onClick={handleCopyCode} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {copiedCode ? <Check size={16} color="#6ee7b7" /> : <Copy size={16} />}
            <span>{copiedCode ? 'Code Copied!' : 'Copy 6-Digit Code'}</span>
          </button>
        </div>

        {/* Link Card */}
        <div className="glass-card share-triplet-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Direct Link
            </div>
            <div className="url-preview-box">
              {effectiveShareUrl}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Instant download portal link. No login required.
            </p>
          </div>

          <button onClick={handleCopyLink} className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
            {copiedLink ? <Check size={16} color="#6ee7b7" /> : <Copy size={16} color="#818cf8" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>
        </div>

        {/* QR Card */}
        <div className="glass-card share-triplet-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              QR Code
            </div>
            <div className="qr-mini-preview">
              <div className="qr-mini-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QRCodeSVG value={effectiveShareUrl} size={54} level="M" />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Recipient can scan this QR code with any mobile camera.
              </p>
            </div>
          </div>

          <button onClick={() => setShowQRModal(true)} className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
            <QrIcon size={16} color="#818cf8" />
            <span>View & Download QR</span>
          </button>
        </div>
      </div>

      {/* Two-Column Grid: Download Stats & Sender Controls */}
      <div className="two-col-grid">
        {/* Activity Stats */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} color="#818cf8" />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>Download Activity</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dark)', fontFamily: 'var(--font-mono)' }}>Real-time</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '0.5rem 0' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(5, 7, 17, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Downloads</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                {share.downloadCount || 0}
              </div>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(5, 7, 17, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last Download</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', marginTop: '0.35rem' }}>
                {formatRelativeTime(share.lastDownloadedAt)}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dark)', marginTop: '0.75rem' }}>
            Recipients can download unlimited times while active.
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={16} color="#818cf8" />
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f1f5f9' }}>Sender Controls</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '0.5rem 0' }}>
            <button onClick={() => setShowExtendModal(true)} className="btn btn-secondary btn-sm">
              <Clock size={14} color="#818cf8" />
              <span>Extend Expiry</span>
            </button>

            <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger btn-sm">
              <Trash2 size={14} />
              <span>Delete Share</span>
            </button>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-dark)', marginTop: '0.75rem' }}>
            Secure session authorized. Deleting permanently purges files immediately.
          </div>
        </div>
      </div>

      {/* Files List Card */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <File size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              Shared Files ({share.files?.length || share.fileCount || 0})
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Total: {formatFileSize(share.totalSizeBytes)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {(share.files || []).map((f) => (
            <div key={f.id} className="file-item-row">
              <div className="file-info-group">
                <div className="file-icon-badge">
                  <File size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div className="file-name-text">{f.name || f.originalName}</div>
                  <div className="file-size-text">
                    {formatFileSize(f.size || f.sizeBytes)} • {f.mimeType || 'file'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={() => setPreviewFile(f)}
                  className="btn btn-secondary btn-sm"
                  title="Preview file"
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
                <a
                  href={api.getDownloadFileUrl(share.shareId, f.id)}
                  download={f.name || f.originalName}
                  className="btn btn-primary btn-sm"
                  title="Download file"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          shareUrl={effectiveShareUrl}
          shareId={share.shareId}
          accessCode={share.accessCode}
          onClose={() => setShowQRModal(false)}
          onToast={onToast}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          shareId={share.shareId}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Extend Expiry Modal */}
      {showExtendModal && (
        <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
          <div className="glass-card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
              Extend Share Expiry
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Add additional time before this share and its files automatically expire.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%', marginBottom: '1.5rem' }}>
              {[
                { label: '+15 Minutes', mins: 15 },
                { label: '+30 Minutes', mins: 30 },
                { label: '+1 Hour', mins: 60 },
                { label: '+6 Hours', mins: 360 }
              ].map(opt => (
                <button
                  key={opt.mins}
                  onClick={() => setExtendingMinutes(opt.mins)}
                  className={`btn btn-sm ${extendingMinutes === opt.mins ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button onClick={() => setShowExtendModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleExtendExpiry} disabled={isExtending} className="btn btn-primary" style={{ flex: 1 }}>
                {isExtending ? <Loader2 size={16} className="animate-spin" /> : <span>Confirm Extend</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="glass-card modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-badge" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fda4af' }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.25rem' }}>
              Delete Share Now?
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              This action cannot be undone. All files associated with this 6-digit code will be immediately and permanently deleted from storage.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Keep Active
              </button>
              <button onClick={handleDeleteShare} disabled={isDeleting} className="btn btn-danger" style={{ flex: 1 }}>
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <span>Delete Permanently</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
