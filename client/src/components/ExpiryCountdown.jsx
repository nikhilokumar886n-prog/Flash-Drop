import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export function ExpiryCountdown({ expiresAt, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)));

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && onExpire) {
        onExpire();
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const isUrgent = timeLeft > 0 && timeLeft <= 300; // Under 5 mins
  const isExpired = timeLeft <= 0;

  const formatTime = () => {
    if (isExpired) return 'Expired';
    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(minutes)}m ${pad(seconds)}s`;
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono font-semibold transition-all ${
        isExpired
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          : isUrgent
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse'
          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
      }`}
    >
      {isExpired || isUrgent ? (
        <AlertTriangle className="w-3.5 h-3.5" />
      ) : (
        <Clock className="w-3.5 h-3.5" />
      )}
      <span>{isExpired ? 'Share Expired' : `Expires in ${formatTime()}`}</span>
    </div>
  );
}
