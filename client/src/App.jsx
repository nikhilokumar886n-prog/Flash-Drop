import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FileUploader } from './components/FileUploader';
import { SenderDashboard } from './components/SenderDashboard';
import { RecipientView } from './components/RecipientView';
import { CodeInputModal } from './components/CodeInputModal';
import { Toast } from './components/Toast';
import { api } from './services/api';

export function App() {
  const [view, setView] = useState('upload'); // 'upload' | 'sender' | 'recipient'
  const [shareData, setShareData] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [initialCode, setInitialCode] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleLocationChange = async () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const codeParam = searchParams.get('code');
      const keyParam = searchParams.get('key');

      const shareMatch = path.match(/^\/(?:s|share)\/([a-zA-Z0-9_-]+)/);
      if (shareMatch) {
        const id = shareMatch[1];
        setActiveShareId(id);

        const storedKey = keyParam || localStorage.getItem(`flashdrop_manage_${id}`) || localStorage.getItem(`drop6_manage_${id}`);
        if (storedKey) {
          try {
            const manageInfo = await api.getManageInfo(id, storedKey);
            setShareData(manageInfo);
            setView('sender');
            return;
          } catch (err) {
            // Fallback to recipient
          }
        }

        setView('recipient');
        return;
      }

      if (codeParam && codeParam.length === 6) {
        setInitialCode(codeParam);
        setIsCodeModalOpen(true);
      } else {
        setView('upload');
      }
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const handleUploadSuccess = (data) => {
    if (data.shareId && data.manageKey) {
      localStorage.setItem(`flashdrop_manage_${data.shareId}`, data.manageKey);
      localStorage.setItem(`drop6_manage_${data.shareId}`, data.manageKey);
    }
    setShareData(data);
    setActiveShareId(data.shareId);
    setView('sender');
    window.history.pushState({}, '', `/s/${data.shareId}?key=${data.manageKey}`);
  };

  const handleCodeSuccess = (data) => {
    setShareData(data);
    setActiveShareId(data.shareId);
    setView('recipient');
    window.history.pushState({}, '', `/s/${data.shareId}`);
  };

  const handleNewShare = () => {
    setShareData(null);
    setActiveShareId(null);
    setView('upload');
    window.history.pushState({}, '', '/');
  };

  const scrollToUpload = () => {
    if (view !== 'upload') {
      handleNewShare();
    }
    const dropzone = document.querySelector('.uploader-card');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSwitchToRecipient = () => {
    setView('recipient');
    window.history.pushState({}, '', `/s/${activeShareId}`);
  };

  const handleSwitchToSender = () => {
    const storedKey = localStorage.getItem(`drop6_manage_${activeShareId}`);
    if (storedKey) {
      setView('sender');
      window.history.pushState({}, '', `/s/${activeShareId}?key=${storedKey}`);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        currentView={view}
        onOpenCodeModal={() => {
          setInitialCode('');
          setIsCodeModalOpen(true);
        }}
        onNewShare={handleNewShare}
      />

      {/* Main Content Area */}
      <main className="content-wrapper">
        {view === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }} className="animate-fade-in">
            <HeroSection
              onStartUpload={scrollToUpload}
              onOpenCodeModal={() => setIsCodeModalOpen(true)}
            />
            <FileUploader
              onUploadSuccess={handleUploadSuccess}
              onToast={(t) => setToast(t)}
            />
          </div>
        )}

        {view === 'sender' && shareData && (
          <SenderDashboard
            shareData={shareData}
            onNewShare={handleNewShare}
            onSwitchToRecipient={handleSwitchToRecipient}
            onToast={(t) => setToast(t)}
          />
        )}

        {view === 'recipient' && activeShareId && (
          <div>
            {(localStorage.getItem(`flashdrop_manage_${activeShareId}`) || localStorage.getItem(`drop6_manage_${activeShareId}`)) && (
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSwitchToSender}
                  className="btn btn-secondary btn-sm"
                  style={{ borderColor: 'var(--border-accent)', color: '#c7d2fe' }}
                >
                  <span>← Back to Sender Controls</span>
                </button>
              </div>
            )}
            <RecipientView
              shareId={activeShareId}
              initialData={shareData?.shareId === activeShareId ? shareData : null}
              onNewShare={handleNewShare}
              onToast={(t) => setToast(t)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', fontFamily: 'var(--font-heading)' }}>
              FLASH<span style={{ color: '#818cf8' }}>DROP</span>
            </span>
            <span>— Share files without sharing your number.</span>
          </div>

          <div className="footer-links">
            <span>No Accounts</span>
            <span>•</span>
            <span>Auto Server Cleanup</span>
            <span>•</span>
            <span>Streaming ZIPs</span>
          </div>
        </div>
      </footer>

      {/* 6-Digit PIN Modal */}
      <CodeInputModal
        isOpen={isCodeModalOpen}
        initialCode={initialCode}
        onClose={() => setIsCodeModalOpen(false)}
        onSuccess={handleCodeSuccess}
      />

      {/* Global Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
