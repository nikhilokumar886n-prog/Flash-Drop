import React from 'react';
import { Zap, KeyRound, Plus, ShieldCheck } from 'lucide-react';

export function Navbar({ onOpenCodeModal, onNewShare, currentView }) {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <div onClick={onNewShare} className="navbar-brand">
          <div className="brand-icon-box">
            <div className="brand-icon-inner">
              <Zap size={20} />
            </div>
          </div>
          <div className="brand-text-container">
            <div className="brand-title-row">
              <span className="brand-logo-text">
                FLASH<span className="brand-logo-accent">DROP</span>
              </span>
              <span className="brand-version-badge">v1.0</span>
            </div>
            <span className="brand-tagline">Anonymous & Temporary</span>
          </div>
        </div>

        {/* Center Tagline Badge (Desktop) */}
        <div className="navbar-center-badge">
          <ShieldCheck size={16} color="#10b981" />
          <span>No accounts • No phone numbers • Auto-expiring</span>
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <button
            onClick={onOpenCodeModal}
            className="btn btn-secondary btn-sm"
            title="Enter 6-digit access code"
          >
            <KeyRound size={15} color="#818cf8" />
            <span>Enter Code</span>
          </button>

          {currentView !== 'upload' && (
            <button onClick={onNewShare} className="btn btn-primary btn-sm">
              <Plus size={15} />
              <span>New Share</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
