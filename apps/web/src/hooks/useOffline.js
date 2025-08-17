import { useState, useEffect } from 'react';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show reconnection message
        console.log('Connection restored');
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      console.log('Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
};

export const OfflineIndicator = ({ isOnline, wasOffline }) => {
  if (isOnline && !wasOffline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 'max(10px, env(safe-area-inset-top) + 10px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: isOnline ? '#4CAF50' : '#f44336',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 10000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      transition: 'all 0.3s ease',
      animation: isOnline && wasOffline ? 'slideInOut 3s ease-in-out' : 'none'
    }}>
      {isOnline ? '✅ Back online' : '⚠️ No internet connection'}
      <style>
        {`
          @keyframes slideInOut {
            0%, 100% { transform: translateX(-50%) translateY(-100%); opacity: 0; }
            20%, 80% { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};