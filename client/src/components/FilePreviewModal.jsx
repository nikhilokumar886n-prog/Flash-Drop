import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Music, Video, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { api } from '../services/api';

export function FilePreviewModal({ file, shareId, onClose }) {
  const [textContent, setTextContent] = useState(null);
  const [loadingText, setLoadingText] = useState(false);
  const [errorText, setErrorText] = useState(null);

  if (!file) return null;

  const mime = file.mimeType || '';
  const isImage = mime.startsWith('image/');
  const isPDF = mime === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  const isAudio = mime.startsWith('audio/');
  const isVideo = mime.startsWith('video/');
  const isText = mime.startsWith('text/') || 
    ['json', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'c', 'cpp', 'rs', 'go', 'yaml', 'yml', 'xml', 'csv', 'env', 'sql', 'log'].some(ext => file.name?.toLowerCase().endsWith(`.${ext}`));

  const previewUrl = api.getPreviewFileUrl(shareId, file.id);
  const downloadUrl = api.getDownloadFileUrl(shareId, file.id);

  useEffect(() => {
    if (isText) {
      setLoadingText(true);
      fetch(previewUrl)
        .then(res => {
          if (!res.ok) throw new Error('Failed to load text preview');
          return res.text();
        })
        .then(text => {
          setTextContent(text.slice(0, 100000));
          setLoadingText(false);
        })
        .catch(err => {
          setErrorText(err.message);
          setLoadingText(false);
        });
    }
  }, [isText, previewUrl]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(5, 7, 17, 0.7)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', paddingRight: '1rem' }}>
            {isImage && <ImageIcon size={20} color="#818cf8" />}
            {isPDF && <FileText size={20} color="#f43f5e" />}
            {isAudio && <Music size={20} color="#34d399" />}
            {isVideo && <Video size={20} color="#a855f7" />}
            {isText && <FileText size={20} color="#22d3ee" />}
            {!isImage && !isPDF && !isAudio && !isVideo && !isText && <File size={20} color="#94a3b8" />}
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {file.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <a href={downloadUrl} download={file.name} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Download</span>
            </a>
            <button onClick={onClose} className="modal-close-btn" style={{ position: 'static' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '320px',
          background: 'rgba(0, 0, 0, 0.4)'
        }}>
          {isImage && (
            <div style={{ maxWidth: '100%', maxHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={previewUrl}
                alt={file.name}
                style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
              />
            </div>
          )}

          {isPDF && (
            <div style={{ width: '100%', height: '70vh' }}>
              <iframe
                src={previewUrl}
                title={file.name}
                style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: '#ffffff' }}
              />
            </div>
          )}

          {isAudio && (
            <div className="glass-card" style={{ padding: '2rem', width: '100%', maxWidth: '420px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div className="modal-icon-badge" style={{ margin: '0 auto' }}>
                <Music size={28} />
              </div>
              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{file.name}</div>
              <audio controls style={{ width: '100%', marginTop: '0.5rem' }} src={previewUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {isVideo && (
            <div style={{ width: '100%', maxWidth: '750px' }}>
              <video controls style={{ width: '100%', maxHeight: '70vh', borderRadius: 'var(--radius-md)', background: '#000000' }} src={previewUrl}>
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {isText && (
            <div style={{ width: '100%', height: '65vh', display: 'flex', flexDirection: 'column' }}>
              {loadingText ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.5rem', color: '#818cf8' }}>
                  <Loader2 size={24} className="animate-spin" />
                  <span>Loading preview...</span>
                </div>
              ) : errorText ? (
                <div style={{ color: '#fda4af', textAlign: 'center', margin: 'auto' }}>{errorText}</div>
              ) : (
                <pre style={{
                  width: '100%',
                  height: '100%',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.78rem',
                  color: '#e2e8f0',
                  background: 'rgba(5, 7, 17, 0.9)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'auto',
                  lineHeight: 1.6
                }}>
                  <code>{textContent}</code>
                </pre>
              )}
            </div>
          )}

          {!isImage && !isPDF && !isAudio && !isVideo && !isText && (
            <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '400px' }}>
              <div className="modal-icon-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'var(--border-medium)', color: 'var(--text-muted)' }}>
                <File size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{file.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Preview not available for this file format ({file.mimeType || 'unknown'})
                </p>
              </div>
              <a href={downloadUrl} download={file.name} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                <Download size={16} />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
