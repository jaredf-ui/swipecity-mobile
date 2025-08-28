// This is a wrapper that adds Firebase Auth to your existing app
// without changing any of the UI/UX
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import ExistingApp from './App-old-backup'; // Your original app

// Wrapper component that injects auth into your existing app
function AppWithFirebaseAuth() {
  const { 
    user, 
    userProfile, 
    loading: authLoading,
    isAuthenticated,
    signOut 
  } = useAuth();

  // Pass auth data to your existing app via props
  return (
    <>
      {/* Auth Modal - only shows when not authenticated */}
      <AuthModal 
        isOpen={!authLoading && !isAuthenticated} 
        onClose={() => {}} 
      />
      
      {/* Your existing app with auth data passed as props */}
      <ExistingApp 
        user={user}
        userProfile={userProfile}
        isAuthenticated={isAuthenticated}
        onSignOut={signOut}
      />
    </>
  );
}

// Main App with Auth Provider
function App() {
  return (
    <AuthProvider>
      <AppWithFirebaseAuth />
    </AuthProvider>
  );
}

export default App;