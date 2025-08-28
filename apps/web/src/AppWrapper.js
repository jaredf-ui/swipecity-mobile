import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

function AppWrapper() {
  try {
    return (
      <AuthProvider>
        <App />
      </AuthProvider>
    );
  } catch (error) {
    console.error('AppWrapper error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Error</h2>
        <p>Error: {error.message}</p>
        <p>Check the console for more details</p>
      </div>
    );
  }
}

export default AppWrapper;