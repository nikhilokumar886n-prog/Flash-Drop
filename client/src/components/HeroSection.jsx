import React from 'react';
import { Upload, KeyRound, QrCode, Zap, Shield, Clock } from 'lucide-react';

export function HeroSection({ onStartUpload, onOpenCodeModal }) {
  return (
    <section className="hero-section">
      {/* Top Pill */}
      <div className="hero-pill-badge">
        <Zap size={14} color="#818cf8" />
        <span>Instant Temporary File Sharing</span>
      </div>

      {/* Main Title */}
      <h1 className="hero-title">
        Share files without <br />
        <span className="text-gradient">sharing your number.</span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle">
        Upload files <span className="hero-arrow">→</span> Get a 6-digit code or QR <span className="hero-arrow">→</span> Share with anyone <span className="hero-arrow">→</span> Automatically expires.
      </p>

      {/* CTA Buttons */}
      <div className="hero-cta-group">
        <button onClick={onStartUpload} className="btn btn-primary btn-lg">
          <Upload size={18} />
          <span>Upload Files</span>
        </button>

        <button onClick={onOpenCodeModal} className="btn btn-secondary btn-lg">
          <KeyRound size={18} color="#818cf8" />
          <span>Enter 6-digit Code</span>
        </button>
      </div>

      {/* 4 Feature Highlights Grid */}
      <div className="hero-features-grid">
        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <KeyRound size={18} />
          </div>
          <div className="feature-title">6-Digit Code</div>
          <div className="feature-desc">Type a code to download files instantly on any device.</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <QrCode size={18} />
          </div>
          <div className="feature-title">Instant QR Code</div>
          <div className="feature-desc">Scan straight from phone cameras to fetch files.</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
            <Shield size={18} />
          </div>
          <div className="feature-title">Zero Signup</div>
          <div className="feature-desc">No passwords, phone numbers, or user profiles.</div>
        </div>

        <div className="feature-card">
          <div className="feature-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <Clock size={18} />
          </div>
          <div className="feature-title">Auto Expiry</div>
          <div className="feature-desc">Files permanently deleted from servers upon expiry.</div>
        </div>
      </div>
    </section>
  );
}
