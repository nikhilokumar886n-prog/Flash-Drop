import React, { useState, useRef, useEffect } from 'react';
import { X, KeyRound, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export function CodeInputModal({ isOpen, onClose, onSuccess, initialCode = '' }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialCode && initialCode.length === 6) {
        setDigits(initialCode.split(''));
      } else {
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    }
  }, [isOpen, initialCode]);

  if (!isOpen) return null;

  const handleChange = (index, val) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(null);

    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleSubmitCode(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pasteData.length > 0) {
      const pasteDigits = pasteData.slice(0, 6).split('');
      const newDigits = [...digits];
      pasteDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setDigits(newDigits);
      setError(null);

      const focusIdx = Math.min(pasteDigits.length, 5);
      inputRefs.current[focusIdx]?.focus();

      if (newDigits.join('').length === 6 && !newDigits.includes('')) {
        handleSubmitCode(newDigits.join(''));
      }
    }
  };

  const handleSubmitCode = async (codeToSubmit) => {
    const code = codeToSubmit || digits.join('');
    if (code.length !== 6 || digits.includes('')) {
      setError('Please enter a complete 6-digit access code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shareData = await api.getShareByCode(code);
      setLoading(false);
      onSuccess(shareData);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Invalid or expired access code.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card modal-dialog animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close-btn" title="Close">
          <X size={18} />
        </button>

        <div className="modal-icon-badge">
          <KeyRound size={26} />
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem' }}>
          Enter 6-Digit Code
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Enter the access code shared with you to access and download the files.
        </p>

        {/* 6 PIN Input Boxes */}
        <div className="pin-inputs-row">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={loading}
              className="pin-box"
              autoComplete="off"
            />
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            width: '100%',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            fontSize: '0.78rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Action Button */}
        <button
          onClick={() => handleSubmitCode()}
          disabled={loading || digits.join('').length !== 6}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Fetching Files...</span>
            </>
          ) : (
            <>
              <span>Access Files</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
