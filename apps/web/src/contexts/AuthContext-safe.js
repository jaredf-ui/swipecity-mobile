import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Firebase safely
  useEffect(() => {
    let mounted = true;
    let initTimeout;
    
    const initFirebase = async () => {
      try {
        console.log('🔥 Starting Firebase initialization...');
        
        // Set a maximum wait time for Firebase
        initTimeout = setTimeout(() => {
          if (mounted) {
            console.log('⏰ Firebase initialization timeout, falling back to offline mode');
            // Force fallback to offline mode
            setLoading(false);
            setError('Firebase unavailable - using offline mode');
          }
        }, 5000); // 5 second timeout
        
        // Try to initialize Firebase
        const { initializeFirebaseServices, getAuthService } = await import('../services/firebase');
        await initializeFirebaseServices();
        
        if (mounted) {
          clearTimeout(initTimeout);
          console.log('✅ Firebase initialized successfully');
        
        // Set up auth listener
        const authService = getAuthService();
        const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
          if (!mounted) return;
          
          console.log('🔐 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
          
          if (firebaseUser) {
            // User is signed in
            setUser(firebaseUser);
            
            // Try to get user profile
            try {
              const profileResult = await authService.getCurrentUserProfile();
              if (profileResult.success) {
                setUserProfile(profileResult.profile);
              }
            } catch (profileError) {
              console.log('Profile fetch failed, will create on first use:', profileError);
            }
          } else {
            // User is signed out
            setUser(null);
            setUserProfile(null);
          }
          
          setLoading(false);
        });

        return unsubscribe;
      } catch (initError) {
        console.error('❌ Firebase initialization failed:', initError);
        
        // Fallback to mock auth for development
        console.log('🔄 Falling back to mock authentication...');
        
        // Check for existing mock user
        const mockUser = localStorage.getItem('swipecity_mock_user');
        if (mockUser) {
          try {
            const parsedUser = JSON.parse(mockUser);
            setUser(parsedUser);
            setUserProfile(parsedUser);
          } catch (e) {
            console.error('Failed to parse mock user:', e);
          }
        }
        
        setLoading(false);
        setError('Firebase unavailable - using offline mode');
      }
    };

    initFirebase();

    return () => {
      mounted = false;
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
    };
  }, []);

  // Auth methods with fallbacks
  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);
      
      const { getAuthService } = await import('../services/firebase');
      const authService = getAuthService();
      const result = await authService.registerWithEmailPassword(email, password, displayName);
      
      setLoading(false);
      return result;
    } catch (error) {
      console.log('Firebase signup failed, using mock:', error);
      
      // Mock signup
      const mockUser = {
        uid: 'mock_' + Date.now(),
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: null,
        emailVerified: true,
        onboardingComplete: false,
        preferences: {
          categories: [],
          priceRange: null,
          shoppingStyle: null
        },
        savedItems: [],
        likedItems: [],
        createdAt: Date.now()
      };
      
      localStorage.setItem('swipecity_mock_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setUserProfile(mockUser);
      setLoading(false);
      
      return { success: true, user: mockUser };
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const { getAuthService } = await import('../services/firebase');
      const authService = getAuthService();
      const result = await authService.signInWithEmailPassword(email, password);
      
      setLoading(false);
      return result;
    } catch (error) {
      console.log('Firebase signin failed, using mock:', error);
      
      // Mock signin
      const mockUser = {
        uid: 'mock_user',
        email,
        displayName: email.split('@')[0],
        photoURL: null,
        emailVerified: true,
        onboardingComplete: false,
        preferences: {
          categories: [],
          priceRange: null,
          shoppingStyle: null
        },
        savedItems: [],
        likedItems: [],
        createdAt: Date.now()
      };
      
      localStorage.setItem('swipecity_mock_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setUserProfile(mockUser);
      setLoading(false);
      
      return { success: true, user: mockUser };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const { getAuthService } = await import('../services/firebase');
      const authService = getAuthService();
      return await authService.signInWithGoogle();
    } catch (error) {
      console.log('Google signin failed:', error);
      return { success: false, error: 'Google sign-in unavailable' };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      
      // Try Firebase signout
      const { getAuthService } = await import('../services/firebase');
      const authService = getAuthService();
      await authService.signOut();
    } catch (error) {
      console.log('Firebase signout failed, clearing local data:', error);
    }
    
    // Always clear local data
    localStorage.removeItem('swipecity_mock_user');
    setUser(null);
    setUserProfile(null);
    
    return { success: true };
  };

  const resetPassword = async (email) => {
    try {
      const { getAuthService } = await import('../services/firebase');
      const authService = getAuthService();
      return await authService.sendPasswordResetEmail(email);
    } catch (error) {
      console.log('Password reset failed:', error);
      return { success: false, error: 'Password reset unavailable' };
    }
  };

  const savePreferences = async (preferences) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };
      
      const updatedProfile = {
        ...userProfile,
        preferences,
        onboardingComplete: true,
        updatedAt: Date.now()
      };
      
      // Try to save to Firebase
      try {
        const { getFirestoreService } = await import('../services/firebase');
        const firestoreService = getFirestoreService();
        await firestoreService.updateUser(user.uid, {
          preferences,
          onboardingComplete: true
        });
      } catch (firebaseError) {
        console.log('Firebase save failed, saving locally:', firebaseError);
        localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedProfile));
      }
      
      setUserProfile(updatedProfile);
      return { success: true };
    } catch (error) {
      console.error('Save preferences error:', error);
      return { success: false, error: error.message };
    }
  };

  const saveItem = async (item) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };
      
      const updatedSavedItems = [...(userProfile?.savedItems || [])];
      if (!updatedSavedItems.find(i => i.id === item.id)) {
        updatedSavedItems.push({ ...item, savedAt: Date.now() });
        
        const updatedProfile = { ...userProfile, savedItems: updatedSavedItems };
        setUserProfile(updatedProfile);
        
        // Try to save to Firebase/localStorage
        try {
          const { getFirestoreService } = await import('../services/firebase');
          const firestoreService = getFirestoreService();
          await firestoreService.updateUser(user.uid, { savedItems: updatedSavedItems });
        } catch (error) {
          localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedProfile));
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Save item error:', error);
      return { success: false, error: error.message };
    }
  };

  const likeItem = async (item) => {
    try {
      if (!user) return { success: false, error: 'No user logged in' };
      
      const updatedLikedItems = [...(userProfile?.likedItems || [])];
      if (!updatedLikedItems.find(i => i.id === item.id)) {
        updatedLikedItems.push({ ...item, likedAt: Date.now() });
        
        const updatedProfile = { ...userProfile, likedItems: updatedLikedItems };
        setUserProfile(updatedProfile);
        
        // Try to save to Firebase/localStorage
        try {
          const { getFirestoreService } = await import('../services/firebase');
          const firestoreService = getFirestoreService();
          await firestoreService.updateUser(user.uid, { likedItems: updatedLikedItems });
        } catch (error) {
          localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedProfile));
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Like item error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    needsOnboarding: userProfile && !userProfile.onboardingComplete,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    savePreferences,
    saveItem,
    likeItem
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};