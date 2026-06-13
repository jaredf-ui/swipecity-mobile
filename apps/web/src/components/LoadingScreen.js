import React from 'react';

// Full-screen loading state. Extracted from App.js (no behavior change).
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    flexDirection: 'column'
  }}>
    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
      SwipeCity
    </div>
    <div style={{ color: '#64748b' }}>
      Loading your marketplace...
    </div>
  </div>
);

export default LoadingScreen;
