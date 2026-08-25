import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0 }} />,
    error: <AlertCircle size={18} color="#f43f5e" style={{ flexShrink: 0 }} />,
    info: <Info size={18} color="#818cf8" style={{ flexShrink: 0 }} />
  };

  const borders = {
    success: 'rgba(16, 185, 129, 0.4)',
    error: 'rgba(244, 63, 94, 0.4)',
    info: 'rgba(99, 102, 241, 0.4)'
  };

  const type = toast.type || 'info';

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      zIndex: 200,
      maxWidth: '400px'
    }} className="animate-fade-in">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1.15rem',
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(10, 15, 33, 0.95)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${borders[type]}`,
        boxShadow: '0 15px 40px -10px rgba(0,0,0,0.8)',
        color: '#f8fafc'
      }}>
        {icons[type]}
        <div style={{ fontSize: '0.85rem', fontWeight: 500, flex: 1, paddingRight: '0.5rem' }}>
          {toast.message}
        </div>
        <button
          onClick={onClose}
          className="btn-icon"
          style={{ padding: '0.25rem' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
