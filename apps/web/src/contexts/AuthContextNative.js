import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseNative from '../services/firebaseNative';

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

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      const platform = window.Capacitor?.getPlatform?.() || 'web';
      
      // Restore Firebase authentication tokens
      const tokensRestored = firebaseNative.restoreAuthFromStorage();
      
      // Check for existing user in localStorage
      const savedUser = localStorage.getItem('swipecity_native_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          
          if (tokensRestored) {
            // Tokens and user data both exist - refresh profile to get latest data
            
            // Set initial user data first
            setUser(userData);
            setUserProfile(userData);
            
            // Then refresh from Firebase to get complete data (bio, chats, etc.)
            try {
              const freshProfile = await firebaseNative.getUserProfile(userData.uid);
              if (freshProfile && Object.keys(freshProfile).length > 0) {
                const completeUserData = {
                  ...userData,
                  ...freshProfile,
                  uid: userData.uid, // Ensure uid is preserved
                  email: userData.email, // Ensure email is preserved
                };
                
                
                // Update with complete data
                localStorage.setItem('swipecity_native_user', JSON.stringify(completeUserData));
                setUser(completeUserData);
                setUserProfile(completeUserData);
              }
            } catch (refreshError) {
              // Continue with cached data if refresh fails
            }
          } else {
            // User data exists but no tokens - need to re-authenticate
            localStorage.removeItem('swipecity_native_user');
            // Don't set user state - this will show the auth modal
          }
        } catch (e) {
          console.error('Error parsing saved user:', e);
          localStorage.removeItem('swipecity_native_user');
        }
      }
      
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  // Sign up with email and password
  const signUp = async (email, password, displayName) => {
    setLoading(true);
    
    try {
      
      let result;
      try {
        result = await firebaseNative.signUp(email, password, displayName);
      } catch (serviceError) {
        console.error('❌ [AuthContext] firebaseNative.signUp threw error:', serviceError);
        console.error('❌ [AuthContext] Service error name:', serviceError.name);
        console.error('❌ [AuthContext] Service error message:', serviceError.message);
        console.error('❌ [AuthContext] Service error stack:', serviceError.stack);
        throw new Error(`Firebase service error: ${serviceError.message}`);
      }
      
      if (result.success) {
        const userData = result.user;
        
        localStorage.setItem('swipecity_native_user', JSON.stringify(userData));
        setUser(userData);
        setUserProfile(userData);
        return { success: true, user: userData };
      } else {
        return { 
          success: false, 
          error: result.error || 'Sign up failed - no error message provided',
          errorType: result.errorType,
          errorName: result.errorName
        };
      }
    } catch (error) {
      console.error('❌ [AuthContext] Outer catch - Native signup error:', error);
      console.error('❌ [AuthContext] Error type:', typeof error);
      console.error('❌ [AuthContext] Error constructor:', error.constructor?.name);
      console.error('❌ [AuthContext] Error name:', error.name);
      console.error('❌ [AuthContext] Error message:', error.message);
      console.error('❌ [AuthContext] Error stack:', error.stack);
      console.error('❌ [AuthContext] Error as object:', error);
      
      return { 
        success: false, 
        error: error.message || 'Unknown signup error occurred',
        errorType: error.constructor?.name,
        errorName: error.name,
        originalError: error
      };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    setLoading(true);
    
    try {
      const result = await firebaseNative.signIn(email, password);
      
      if (result.success) {
        const userData = result.user;
        
        // Refresh profile to ensure we have all fields including photoURL
        try {
          const freshProfile = await firebaseNative.getUserProfile(userData.uid);
          if (freshProfile && Object.keys(freshProfile).length > 0) {
            // Merge fresh profile data with auth data
            const completeUserData = {
              ...userData,
              ...freshProfile,
              uid: userData.uid, // Ensure uid is preserved
              email: userData.email, // Ensure email is preserved
              // CRITICAL: Always set onboarding complete for App Store testing
              onboardingComplete: true,
              verified: true
            };
            
            // Save complete data to localStorage and state
            localStorage.setItem('swipecity_native_user', JSON.stringify(completeUserData));
            setUser(completeUserData);
            setUserProfile(completeUserData);
            
            // Sync with main app auth context
            localStorage.setItem('swipecity_user', JSON.stringify(completeUserData));
            if (window.setGlobalUser) {
              window.setGlobalUser(completeUserData);
            }
            
            // Refresh app to sync auth state
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            return { success: true, user: completeUserData };
          }
        } catch (refreshError) {
        }
        
        // Fallback to original data if refresh fails
        const fallbackUserData = {
          ...userData,
          onboardingComplete: true, // Always set onboarding complete
          verified: true
        };
        localStorage.setItem('swipecity_native_user', JSON.stringify(fallbackUserData));
        setUser(fallbackUserData);
        setUserProfile(fallbackUserData);
        
        // CRITICAL FIX: Sync with main app auth context
        localStorage.setItem('swipecity_user', JSON.stringify(fallbackUserData));
        if (window.setGlobalUser) {
          window.setGlobalUser(fallbackUserData);
        }
        
        // AGGRESSIVE FIX: Force reload the entire app to pick up auth state
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return { success: true, user: fallbackUserData };
      } else {
        
        // Don't reload on failed login - just show error
        setLoading(false);
        
        // Provide more user-friendly error messages
        let userMessage = result.error;
        if (result.error?.includes('INVALID_PASSWORD') || result.error?.includes('INVALID_LOGIN_CREDENTIALS')) {
          userMessage = 'Invalid email or password';
        } else if (result.error?.includes('USER_NOT_FOUND') || result.error?.includes('EMAIL_NOT_FOUND')) {
          userMessage = 'Account not found. Please check your email or sign up first.';
        } else if (result.error?.includes('TOO_MANY_ATTEMPTS')) {
          userMessage = 'Too many failed attempts. Please try again later.';
        }
        
        return { success: false, error: userMessage };
      }
    } catch (error) {
      console.error('Native signin error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    console.log('🔓 Starting signOut process...');
    
    try {
      console.log('🔓 Calling firebaseNative.signOut()...');
      await firebaseNative.signOut();
      console.log('🔓 Firebase signOut completed successfully');
      
      // Clear localStorage and state
      console.log('🔓 Clearing localStorage entries...');
      localStorage.removeItem('swipecity_native_user');
      localStorage.removeItem('swipecity_demo_user');
      localStorage.removeItem('swipecity_mock_user');
      localStorage.removeItem('swipecity_user');
      console.log('🔓 localStorage cleared');
      
      console.log('🔓 Clearing user state...');
      setUser(null);
      setUserProfile(null);
      console.log('🔓 User state cleared');
      
      console.log('✅ SignOut completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Native signout error:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      return { success: false, error: error.message };
    }
  };

  // Google sign in (placeholder - would need additional setup)
  const signInWithGoogle = async () => {
    return { success: false, error: 'Google sign-in not implemented for native version yet' };
  };

  // Reset password
  const resetPassword = async (email) => {
    
    try {
      const result = await firebaseNative.sendPasswordResetEmail(email);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Delete account
  const deleteAccount = async () => {
    console.log('🗑️ Starting account deletion...');
    
    try {
      if (!user?.uid) {
        return { success: false, error: 'No user logged in' };
      }

      // Delete the Firestore profile document AND the Firebase Auth credential.
      // The native layer talks to Firebase over REST, so there is no
      // auth.currentUser.delete() — firebaseNative.deleteAccount() calls the
      // REST accounts:delete endpoint. This is what actually frees the email so
      // the same credentials can be used to create a new account afterwards.
      const authDeleteResult = await firebaseNative.deleteAccount();
      if (!authDeleteResult.success) {
        console.error('❌ Failed to delete account:', authDeleteResult.error);
        return { success: false, error: authDeleteResult.error || 'Failed to delete account' };
      }
      console.log('✅ Firebase auth account deleted');

      // Clear all local storage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('swipecity')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear state
      setUser(null);
      setUserProfile(null);
      
      console.log('✅ Account deletion completed');
      return { success: true };
    } catch (error) {
      console.error('❌ Account deletion error:', error);
      
      // Check if re-authentication is needed
      if (error.code === 'auth/requires-recent-login') {
        return { 
          success: false, 
          error: 'For security reasons, please sign out and sign back in before deleting your account.' 
        };
      }
      
      return { success: false, error: error.message };
    }
  };

  // Save preferences
  const savePreferences = async (preferences) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    
    const updatedProfile = {
      ...userProfile,
      preferences,
      onboardingComplete: true
    };
    
    try {
      // Update Firebase
      const success = await firebaseNative.updateUserProfile(user.uid, updatedProfile);
      
      if (success) {
        // Update local state and storage
        localStorage.setItem('swipecity_native_user', JSON.stringify(updatedProfile));
        setUser(updatedProfile);
        setUserProfile(updatedProfile);
        
        return { success: true };
      } else {
        throw new Error('Firebase update failed');
      }
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
      
      // Fallback to localStorage
      localStorage.setItem('swipecity_native_user', JSON.stringify(updatedProfile));
      setUser(updatedProfile);
      setUserProfile(updatedProfile);
      
      return { success: true };
    }
  };

  // Save and load chats (Firebase + localStorage fallback)
  const saveChats = async (chats, mode = 'buyer') => {
    if (!user?.email) return;
    
    const userKey = `swipecity_native_chats_${user.email.replace(/[@+.]/g, '_')}_${mode}`;
    
    // Always save to localStorage for quick access
    localStorage.setItem(userKey, JSON.stringify(chats));
    
    // Also save to Firebase for cross-device sync
    if (user?.uid) {
      try {
        const chatsData = {
          [`${mode}Chats`]: chats,
          [`${mode}ChatsUpdatedAt`]: Date.now()
        };
        const success = await firebaseNative.updateUserProfile(user.uid, chatsData);
        
        if (!success) {
          console.error(`Failed to sync ${mode} chats to Firebase`);
        }
      } catch (error) {
        console.error(`Failed to sync ${mode} chats to Firebase:`, error.message);
      }
    }
  };

  const loadChats = (mode = 'buyer') => {
    if (!user?.email) return [];
    const userKey = `swipecity_native_chats_${user.email.replace(/[@+.]/g, '_')}_${mode}`;
    const saved = localStorage.getItem(userKey);
    
    // If we have Firebase data in the user profile, use that
    if (userProfile?.[`${mode}Chats`]) {
      const firebaseChats = userProfile[`${mode}Chats`];
      
      return firebaseChats;
    }
    
    // Otherwise fall back to localStorage
    return saved ? JSON.parse(saved) : [];
  };

  // Save and like items
  const saveItem = async (item) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    const updatedSavedItems = [...(userProfile?.savedItems || [])];
    if (!updatedSavedItems.find(i => i.id === item.id)) {
      updatedSavedItems.push({ ...item, savedAt: Date.now() });
      
      const updatedProfile = { ...userProfile, savedItems: updatedSavedItems };
      
      // Update Firebase and localStorage
      try {
        await firebaseNative.updateUserProfile(user.uid, { savedItems: updatedSavedItems });
      } catch (error) {
      }
      
      localStorage.setItem('swipecity_native_user', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
    
    return { success: true };
  };

  const likeItem = async (item) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    const updatedLikedItems = [...(userProfile?.likedItems || [])];
    if (!updatedLikedItems.find(i => i.id === item.id)) {
      updatedLikedItems.push({ ...item, likedAt: Date.now() });
      
      const updatedProfile = { ...userProfile, likedItems: updatedLikedItems };
      
      // Update Firebase and localStorage
      try {
        await firebaseNative.updateUserProfile(user.uid, { likedItems: updatedLikedItems });
      } catch (error) {
      }
      
      localStorage.setItem('swipecity_native_user', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
    
    return { success: true };
  };

  // Save and load swipe/like statistics
  const saveSwipeStats = async (stats) => {
    if (!user?.uid) return { success: false, error: 'No user logged in' };
    
    try {
      
      // Update Firebase with swipe statistics
      const success = await firebaseNative.updateUserProfile(user.uid, {
        swipeStats: stats,
        swipeStatsUpdatedAt: Date.now()
      });
      
      if (success) {
        
        // Update local profile only if Firebase update succeeded
        const updatedProfile = { ...userProfile, swipeStats: stats };
        localStorage.setItem('swipecity_native_user', JSON.stringify(updatedProfile));
        setUserProfile(updatedProfile);
        
        return { success: true };
      } else {
        console.error('❌ Firebase swipe stats update returned false');
        return { success: false, error: 'Firebase update failed' };
      }
    } catch (error) {
      console.error('❌ Failed to save swipe stats:', error);
      console.error('❌ Error details:', error.message);
      return { success: false, error: error.message };
    }
  };
  
  const getSwipeStats = () => {
    // Return swipe stats from user profile, or default values
    return userProfile?.swipeStats || {
      dailySwipeCount: 0,
      dailyLikeCount: 0,
      dailySaveCount: 0,
      totalSwipes: 0,
      totalLikes: 0,
      totalSaves: 0,
      lastResetDate: new Date().toDateString()
    };
  };

  // Upload profile photo
  const uploadProfilePhoto = async (file) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      
      const uploadPath = `profile-photos/${user.uid}/${Date.now()}_${file.name}`;
      const result = await firebaseNative.uploadFile(uploadPath, file);
      
      if (result.success) {
        // Update user profile with photo URL
        const updatedProfile = { ...userProfile, photoURL: result.url };
        
        await firebaseNative.updateUserProfile(user.uid, { photoURL: result.url });
        localStorage.setItem('swipecity_native_user', JSON.stringify(updatedProfile));
        setUser(updatedProfile);
        setUserProfile(updatedProfile);
        
        return { success: true, url: result.url };
      }
      
      return result;
    } catch (error) {
      console.error('❌ Photo upload error:', error);
      return { success: false, error: error.message };
    }
  };

  const needsOnboardingValue = userProfile && !userProfile.onboardingComplete;
  
  const value = {
    user,
    userProfile,
    loading,
    error,
    isAuthenticated: !!user,
    needsOnboarding: needsOnboardingValue,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    deleteAccount,
    savePreferences,
    saveItem,
    likeItem,
    setUser,
    setUserProfile,
    saveChats,
    loadChats,
    saveSwipeStats,
    getSwipeStats,
    uploadProfilePhoto
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};