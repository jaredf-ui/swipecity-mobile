import React from 'react';

// Full-screen auth/connection error state. Extracted from App.js (no behavior change).
const ErrorScreen = ({ authError }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    flexDirection: 'column',
    padding: '20px'
  }}>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
      SwipeCity
    </div>
    <div style={{ color: '#64748b', marginBottom: '20px', textAlign: 'center' }}>
      {authError === 'Firebase unavailable - using offline mode' ?
        'Running in offline mode - some features may be limited' :
        'Connection issue - retrying...'
      }
    </div>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '12px 24px',
        backgroundColor: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px'
      }}
    >
      Retry Connection
    </button>
  </div>
);

export default ErrorScreen;
