import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File,
  X,
  Clock,
  AlertCircle,
  Loader2,
  ArrowRight,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

const EXPIRY_PRESETS = [
  { label: '10 Mins', value: 10 },
  { label: '30 Mins', value: 30 },
  { label: '1 Hour', value: 60 },
  { label: '6 Hours', value: 360 },
  { label: '24 Hours', value: 1440 },
  { label: 'Custom', value: 'custom' },
];

export function FileUploader({ onUploadSuccess, onToast }) {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState(60);
  const [customMinutes, setCustomMinutes] = useState(120);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFilesAdded = (newFiles) => {
    setError(null);
    const addedArray = Array.from(newFiles);
    
    if (files.length + addedArray.length > 20) {
      setError('You can upload a maximum of 20 files per share.');
      return;
    }

    const existingKeys = new Set(files.map(f => `${f.name}-${f.size}`));
    const uniqueFiles = addedArray.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
    setFiles(prev => [...prev, ...uniqueFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const maxSizeBytes = 100 * 1024 * 1024; // 100MB

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to share.');
      return;
    }

    if (totalSize > maxSizeBytes) {
      setError('Total upload size exceeds the 100MB limit.');
      return;
    }

    const finalExpiry = selectedExpiry === 'custom' ? parseInt(customMinutes, 10) : selectedExpiry;
    if (isNaN(finalExpiry) || finalExpiry <= 0) {
      setError('Please select a valid expiry duration.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('expiryMinutes', finalExpiry);
    if (title.trim()) {
      formData.append('title', title.trim());
    }

    try {
      const shareData = await api.createShare(formData, (percent) => {
        setProgress(percent);
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setUploading(false);
      if (onToast) {
        onToast({ type: 'success', message: 'Share created successfully!' });
      }
      onUploadSuccess(shareData);
    } catch (err) {
      setUploading(false);
      setError(err.message || 'Upload failed. Please try again.');
    }
  };

  return (
    <div className="glass-card uploader-card animate-fade-in">
      {/* Dropzone Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`dropzone-area ${isDragging ? 'dragging' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFilesAdded(e.target.files);
              e.target.value = '';
            }
          }}
          disabled={uploading}
        />

        <div className="dropzone-icon-box">
          <UploadCloud size={36} />
        </div>

        <div>
          <h3 className="dropzone-heading">
            {isDragging ? 'Drop files here' : 'Choose files or drag & drop'}
          </h3>
          <p className="dropzone-subtext">
            Any file format up to 100MB total • Up to 20 files per share
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <Plus size={14} />
          <span>Browse Files</span>
        </button>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="file-list-section animate-fade-in">
          <div className="file-list-header">
            <span>Selected Files ({files.length})</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Total: {formatFileSize(totalSize)}
            </span>
          </div>

          <div className="file-list-container">
            {files.map((file, idx) => (
              <div key={idx} className="file-item-row">
                <div className="file-info-group">
                  <div className="file-icon-badge">
                    <File size={16} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="file-name-text">{file.name}</div>
                    <div className="file-size-text">{formatFileSize(file.size)}</div>
                  </div>
                </div>

                {!uploading && (
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="btn-icon"
                    title="Remove file"
                    style={{ color: '#f43f5e' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Title Input */}
      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
          Share Title <span style={{ color: 'var(--text-dark)', fontWeight: 400 }}>(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Project Assets, Photos, Contract"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          disabled={uploading}
          className="text-input"
        />
      </div>

      {/* Expiry Selection */}
      <div className="expiry-section">
        <div className="expiry-label">
          <Clock size={15} color="#818cf8" />
          <span>Files Expire After</span>
        </div>

        <div className="expiry-pills-grid">
          {EXPIRY_PRESETS.map((preset) => {
            const isSelected = selectedExpiry === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelectedExpiry(preset.value)}
                disabled={uploading}
                className={`expiry-pill ${isSelected ? 'active' : ''}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {selectedExpiry === 'custom' && (
          <div className="custom-duration-row animate-fade-in">
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Custom Duration (Minutes):</span>
            <input
              type="number"
              min="5"
              max="1440"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={uploading}
              className="custom-number-input"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              ≈ {(customMinutes / 60).toFixed(1)} hrs (Max 24h)
            </span>
          </div>
        )}
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="progress-container animate-fade-in">
          <div className="progress-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Loader2 size={16} className="animate-spin" color="#818cf8" />
              <span>Uploading & Creating 6-Digit Code...</span>
            </div>
            <span style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{
          marginTop: '1.25rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          color: '#fda4af',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: '1.5rem' }}
      >
        {uploading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Processing Share ({progress}%)...</span>
          </>
        ) : (
          <>
            <span>Generate 6-Digit Code & Share</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}
