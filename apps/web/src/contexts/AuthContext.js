import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeFirebaseServices, getAuthService, getFirestoreService } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

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

  // Initialize Firebase services
  useEffect(() => {
    try {
      console.log('Initializing Firebase services...');
      initializeFirebaseServices();
      console.log('Firebase services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      setError('Failed to initialize authentication service');
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const authService = getAuthService();
    
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.uid);
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Set up real-time listener for user profile
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const profile = doc.data();
            setUserProfile(profile);
            console.log('User profile updated:', profile);
          } else {
            // Profile doesn't exist, create basic one
            const basicProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              photoURL: firebaseUser.photoURL,
              emailVerified: firebaseUser.emailVerified,
              onboardingComplete: false,
              preferences: {
                categories: [],
                priceRange: null,
                shoppingStyle: null,
                locationRadius: 10
              },
              savedItems: [],
              likedItems: [],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            setUserProfile(basicProfile);
          }
        });

        // Store unsubscribe function for cleanup
        return () => unsubscribeProfile();
      } else {
        setUser(null);
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auth methods
  const signUp = async (email, password, displayName) => {
    try {
      setError(null);
      const authService = getAuthService();
      const result = await authService.registerWithEmailPassword(email, password, displayName);
      
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      const authService = getAuthService();
      const result = await authService.signInWithEmailPassword(email, password);
      
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const authService = getAuthService();
      const result = await authService.signInWithGoogle();
      
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const authService = getAuthService();
      const result = await authService.signOut();
      
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      setUser(null);
      setUserProfile(null);
      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      const authService = getAuthService();
      const result = await authService.sendPasswordResetEmail(email);
      
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const updateProfile = async (updates) => {
    try {
      setError(null);
      const authService = getAuthService();
      const result = await authService.updateUserProfile(updates);
      
      if (!result.success) {
        setError(result.error);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  // Save user preferences to Firestore
  const savePreferences = async (preferences) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const firestoreService = getFirestoreService();
      const result = await firestoreService.updateUser(user.uid, {
        preferences,
        onboardingComplete: true
      });
      
      if (result.success) {
        setUserProfile(prev => ({
          ...prev,
          preferences,
          onboardingComplete: true
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Save preferences error:', error);
      return { success: false, error: error.message };
    }
  };

  // Save item to user's saved list
  const saveItem = async (item) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const updatedSavedItems = [...(userProfile?.savedItems || [])];
      
      // Check if item already saved
      if (!updatedSavedItems.find(i => i.id === item.id)) {
        updatedSavedItems.push({
          ...item,
          savedAt: Date.now()
        });
        
        const firestoreService = getFirestoreService();
        const result = await firestoreService.updateUser(user.uid, {
          savedItems: updatedSavedItems
        });
        
        if (result.success) {
          setUserProfile(prev => ({
            ...prev,
            savedItems: updatedSavedItems
          }));
        }
        
        return result;
      }
      
      return { success: true, message: 'Item already saved' };
    } catch (error) {
      console.error('Save item error:', error);
      return { success: false, error: error.message };
    }
  };

  // Remove item from saved list
  const unsaveItem = async (itemId) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const updatedSavedItems = (userProfile?.savedItems || []).filter(i => i.id !== itemId);
      
      const firestoreService = getFirestoreService();
      const result = await firestoreService.updateUser(user.uid, {
        savedItems: updatedSavedItems
      });
      
      if (result.success) {
        setUserProfile(prev => ({
          ...prev,
          savedItems: updatedSavedItems
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Unsave item error:', error);
      return { success: false, error: error.message };
    }
  };

  // Like an item
  const likeItem = async (item) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const updatedLikedItems = [...(userProfile?.likedItems || [])];
      
      // Check if item already liked
      if (!updatedLikedItems.find(i => i.id === item.id)) {
        updatedLikedItems.push({
          ...item,
          likedAt: Date.now()
        });
        
        const firestoreService = getFirestoreService();
        const result = await firestoreService.updateUser(user.uid, {
          likedItems: updatedLikedItems
        });
        
        // Also create an interest record for matching
        await firestoreService.createInterest({
          buyerId: user.uid,
          sellerId: item.seller_id,
          itemId: item.id,
          type: 'like'
        });
        
        if (result.success) {
          setUserProfile(prev => ({
            ...prev,
            likedItems: updatedLikedItems
          }));
        }
        
        return result;
      }
      
      return { success: true, message: 'Item already liked' };
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
    updateProfile,
    savePreferences,
    saveItem,
    unsaveItem,
    likeItem
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};