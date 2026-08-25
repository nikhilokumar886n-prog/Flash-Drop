import React from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { X, Download, Copy, Check, QrCode as QrIcon } from 'lucide-react';

export function QRCodeModal({ shareUrl, shareId, accessCode, onClose, onToast }) {
  const [copied, setCopied] = React.useState(false);

  if (!shareUrl) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    if (onToast) onToast({ type: 'success', message: 'Share link copied to clipboard!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    const canvas = document.getElementById('qr-canvas-download');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `FlashDrop-QR-${accessCode || shareId.slice(0, 6)}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      if (onToast) onToast({ type: 'success', message: 'QR Code PNG downloaded!' });
    }
  };

  const handleDownloadSVG = () => {
    const svgElement = document.getElementById('qr-svg-download');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `FlashDrop-QR-${accessCode || shareId.slice(0, 6)}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      if (onToast) onToast({ type: 'success', message: 'QR Code SVG downloaded!' });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-dialog animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn" title="Close">
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <QrIcon size={22} color="#818cf8" />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>Scan or Share QR</h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Anyone can scan this QR code with their mobile camera to access the files.
        </p>

        {/* QR Container */}
        <div style={{ padding: '1rem', background: '#ffffff', borderRadius: 'var(--radius-xl)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', marginBottom: '1.5rem' }}>
          <QRCodeSVG
            id="qr-svg-download"
            value={shareUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
          <div style={{ display: 'none' }}>
            <QRCodeCanvas
              id="qr-canvas-download"
              value={shareUrl}
              size={512}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Share Link Row */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(5, 7, 17, 0.9)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.25rem'
        }}>
          <div style={{ textAlign: 'left', overflow: 'hidden', paddingRight: '0.5rem' }}>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Share Link</div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shareUrl}
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.4rem 0.6rem' }}
            title="Copy Link"
          >
            {copied ? <Check size={14} color="#6ee7b7" /> : <Copy size={14} color="#818cf8" />}
          </button>
        </div>

        {/* Download Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', width: '100%' }}>
          <button onClick={handleDownloadPNG} className="btn btn-primary btn-sm">
            <Download size={14} />
            <span>Download PNG</span>
          </button>
          <button onClick={handleDownloadSVG} className="btn btn-secondary btn-sm">
            <Download size={14} />
            <span>Download SVG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
