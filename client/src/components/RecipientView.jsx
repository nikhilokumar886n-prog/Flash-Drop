import React, { useState, useEffect } from 'react';
import {
  Download,
  Eye,
  FileArchive,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  File,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plus,
  Check
} from 'lucide-react';
import { ExpiryCountdown } from './ExpiryCountdown';
import { FilePreviewModal } from './FilePreviewModal';
import { api } from '../services/api';

export function RecipientView({ shareId, initialData, onNewShare, onToast }) {
  const [share, setShare] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState({});

  useEffect(() => {
    if (!initialData && shareId) {
      loadShareData();
    }
  }, [shareId, initialData]);

  const loadShareData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getShareById(shareId);
      setShare(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to load files.');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mime = '', name = '') => {
    if (mime.startsWith('image/')) return <ImageIcon size={20} color="#818cf8" />;
    if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return <FileText size={20} color="#f43f5e" />;
    if (mime.startsWith('audio/')) return <Music size={20} color="#34d399" />;
    if (mime.startsWith('video/')) return <Video size={20} color="#a855f7" />;
    if (mime.startsWith('text/') || name.endsWith('.json') || name.endsWith('.csv') || name.endsWith('.md')) return <FileText size={20} color="#22d3ee" />;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed')) return <FileArchive size={20} color="#fbbf24" />;
    return <File size={20} color="#94a3b8" />;
  };

  const handleDownloadAllZip = () => {
    setDownloadingZip(true);
    const zipUrl = api.getDownloadZipUrl(share.shareId);
    
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `Drop6_${share.accessCode}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onToast) {
      onToast({ type: 'info', message: 'Preparing and streaming ZIP archive...' });
    }

    setTimeout(() => {
      setDownloadingZip(false);
    }, 2000);
  };

  const markFileDownloaded = (fileId) => {
    setDownloadedFiles(prev => ({ ...prev, [fileId]: true }));
    if (onToast) {
      onToast({ type: 'success', message: 'Download started!' });
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '600px', margin: '5rem auto', textAlign: 'center' }} className="animate-fade-in">
        <Loader2 size={40} className="animate-spin" color="#818cf8" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>Fetching shared files...</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Checking secure 6-digit access code and storage verification.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '480px', margin: '4rem auto' }} className="animate-fade-in">
        <div className="glass-card modal-dialog">
          <div className="modal-icon-badge" style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fda4af' }}>
            <AlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
            Share Unavailable
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {error}
          </p>
          <button onClick={onNewShare} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            <Plus size={16} />
            <span>Create a New Share</span>
          </button>
        </div>
      </div>
    );
  }

  if (!share) return null;

  const files = share.files || [];

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Share Overview Banner */}
      <div className="glass-card dashboard-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-indigo">
              <ShieldCheck size={14} color="#10b981" />
              <span>Verified Share</span>
            </span>
            <span className="badge badge-indigo font-mono">
              Code: {share.accessCode}
            </span>
            <ExpiryCountdown expiresAt={share.expiresAt} onExpire={loadShareData} />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>
            {share.title || 'Shared Files Ready for Download'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            You can download unlimited times while this share remains active. No login required.
          </p>
        </div>

        {files.length > 1 && (
          <button
            onClick={handleDownloadAllZip}
            disabled={downloadingZip}
            className="btn btn-primary btn-lg"
            style={{ alignSelf: 'flex-start' }}
          >
            {downloadingZip ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Packaging ZIP...</span>
              </>
            ) : (
              <>
                <FileArchive size={18} />
                <span>Download All as ZIP</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Files List Card */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <File size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
              Files in this Share ({files.length})
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Total Size: {formatFileSize(share.totalSizeBytes)}
          </span>
        </div>

        {/* Files rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {files.map((file) => {
            const isDownloaded = downloadedFiles[file.id];
            const downloadUrl = api.getDownloadFileUrl(share.shareId, file.id);

            return (
              <div key={file.id} className="file-item-row">
                <div className="file-info-group">
                  <div className="file-icon-badge" style={{ padding: '0.6rem' }}>
                    {getFileIcon(file.mimeType, file.name)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="file-name-text" style={{ fontSize: '0.9rem' }}>
                      {file.name}
                    </div>
                    <div className="file-size-text">
                      {formatFileSize(file.size)} • {file.mimeType || 'file'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="btn btn-secondary btn-sm"
                    title="Preview file"
                  >
                    <Eye size={14} />
                    <span>Preview</span>
                  </button>

                  <a
                    href={downloadUrl}
                    download={file.name}
                    onClick={() => markFileDownloaded(file.id)}
                    className={`btn btn-sm ${isDownloaded ? 'btn-secondary' : 'btn-primary'}`}
                    style={isDownloaded ? { borderColor: '#10b981', color: '#6ee7b7' } : {}}
                    title="Download file"
                  >
                    {isDownloaded ? <Check size={14} /> : <Download size={14} />}
                    <span>{isDownloaded ? 'Downloaded' : 'Download'}</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Single File fallback action */}
        {files.length === 1 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <a
              href={api.getDownloadFileUrl(share.shareId, files[0].id)}
              download={files[0].name}
              onClick={() => markFileDownloaded(files[0].id)}
              className="btn btn-primary btn-lg"
            >
              <Download size={18} />
              <span>Download File ({formatFileSize(files[0].size)})</span>
            </a>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          shareId={share.shareId}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
