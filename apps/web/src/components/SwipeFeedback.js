import React from 'react';
import './SwipeAnimation.css';

export const SwipeFeedback = ({ type, show }) => {
  if (!show) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      pointerEvents: 'none',
      // Account for iOS safe areas
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
      {type === 'like' && (
        <div style={{
          fontSize: '100px',
          animation: 'heartBurst 0.8s ease-out',
          textAlign: 'center'
        }}>
          💚
        </div>
      )}
      {type === 'pass' && (
        <div style={{
          fontSize: '100px',
          animation: 'crossFade 0.8s ease-out',
          textAlign: 'center'
        }}>
          ❌
        </div>
      )}
      {type === 'save' && (
        <div style={{
          fontSize: '80px',
          animation: 'heartBurst 0.8s ease-out',
          textAlign: 'center'
        }}>
          📌
        </div>
      )}
    </div>
  );
};

export const LoadingSpinner = () => (
  <div className="loading-spinner" />
);

export const MatchSuccessAnimation = ({ show, onComplete }) => {
  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);
  
  if (!show) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div className="match-animation" style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '300px'
      }}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ color: '#4CAF50', marginBottom: '10px' }}>It's a Match!</h2>
        <p style={{ color: '#666' }}>You both liked each other</p>
      </div>
    </div>
  );
};