import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeFirebaseServices } from '../services/firebase';

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
  const [firebaseServices, setFirebaseServices] = useState(null);

  // Demo authentication for testing (bypasses Firebase issues)
  useEffect(() => {
    console.log('🚀 Demo auth initialization...');
    
    // Check for existing demo user
    const demoUser = localStorage.getItem('swipecity_demo_user');
    if (demoUser) {
      try {
        const user = JSON.parse(demoUser);
        console.log('📱 Found demo user:', user.email);
        setUser(user);
        setUserProfile(user);
      } catch (e) {
        console.error('Error parsing demo user:', e);
      }
    }
    
    // Set Firebase services as unavailable for now
    setFirebaseServices(null);
    setLoading(false);
    console.log('✅ Demo auth ready');
  }, []);

  // Firebase auth methods
  const signUp = async (email, password, displayName) => {
    if (!firebaseServices) {
      console.log('⚠️ Firebase services not available, using fallback');
      // Fallback to localStorage for demo purposes
      const mockUser = {
        uid: 'demo_' + Date.now(),
        email,
        displayName: displayName || email.split('@')[0],
        emailVerified: false
      };
      
      localStorage.setItem('swipecity_demo_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setUserProfile(mockUser);
      
      return { success: true, user: mockUser };
    }
    
    console.log('📝 Creating Firebase account:', email);
    try {
      const result = await firebaseServices.auth.registerWithEmailPassword(email, password, displayName);
      return result;
    } catch (error) {
      console.error('Signup error:', error);
      // Fallback on error
      const mockUser = {
        uid: 'demo_' + Date.now(),
        email,
        displayName: displayName || email.split('@')[0],
        emailVerified: false
      };
      
      localStorage.setItem('swipecity_demo_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setUserProfile(mockUser);
      
      return { success: true, user: mockUser };
    }
  };

  const signIn = async (email, password) => {
    console.log('🔐 Demo sign in attempt:', email);
    
    // Demo credentials for testing
    const validCredentials = [
      { email: 'jaredfeeny@gmail.com', password: '123Monkey!' },
      { email: 'jaredfeeny+test@gmail.com', password: 'testpassword' },
      { email: 'jaredfeeny+demo@gmail.com', password: 'demo123' }
    ];
    
    // Check if credentials match
    const validUser = validCredentials.find(cred => 
      cred.email.toLowerCase() === email.toLowerCase() && cred.password === password
    );
    
    if (validUser) {
      // Check if this user already has saved profile data
      const userKey = `swipecity_user_${email.replace(/[@+.]/g, '_')}`;
      const existingUserData = localStorage.getItem(userKey);
      let user;
      
      if (existingUserData) {
        try {
          console.log('📱 Loading existing user profile for:', email);
          user = JSON.parse(existingUserData);
        } catch (e) {
          console.error('Error parsing existing user data:', e);
          // Create new user if parsing fails
          user = {
            uid: 'demo_' + email.replace(/[@+.]/g, '_'),
            email: email,
            displayName: email.split('@')[0].replace('+', ' '),
            emailVerified: true,
            onboardingComplete: false,
            preferences: { categories: [], priceRange: null, shoppingStyle: null },
            savedItems: [],
            likedItems: []
          };
        }
      } else {
        // No existing user profile, create new
        console.log('📱 Creating new user profile for:', email);
        user = {
          uid: 'demo_' + email.replace(/[@+.]/g, '_'),
          email: email,
          displayName: email.split('@')[0].replace('+', ' '),
          emailVerified: true,
          onboardingComplete: false,
          preferences: { categories: [], priceRange: null, shoppingStyle: null },
          savedItems: [],
          likedItems: []
        };
      }
      
      // Save to both user-specific key and current user
      localStorage.setItem(userKey, JSON.stringify(user));
      localStorage.setItem('swipecity_demo_user', JSON.stringify(user));
      setUser(user);
      setUserProfile(user);
      
      console.log('✅ Demo sign in successful');
      return { success: true, user };
    }
    
    // Also check previously created demo user
    const demoUser = localStorage.getItem('swipecity_demo_user');
    if (demoUser) {
      const user = JSON.parse(demoUser);
      if (user.email.toLowerCase() === email.toLowerCase()) {
        setUser(user);
        setUserProfile(user);
        return { success: true, user };
      }
    }
    
    console.log('❌ Invalid credentials');
    return { success: false, error: 'Invalid email or password' };
  };

  const signInWithGoogle = async () => {
    if (!firebaseServices) {
      return { success: false, error: 'Authentication service not available' };
    }
    
    console.log('🔍 Firebase Google sign-in');
    return await firebaseServices.auth.signInWithGoogle();
  };

  const signOut = async () => {
    console.log('👋 Demo sign out');
    
    // Clear all localStorage data
    localStorage.removeItem('swipecity_demo_user');
    localStorage.removeItem('swipecity_mock_user');
    localStorage.removeItem('swipecity_user');
    
    // Clear auth state
    setUser(null);
    setUserProfile(null);
    
    // If Firebase is available, also sign out there
    if (firebaseServices) {
      try {
        await firebaseServices.auth.signOut();
      } catch (error) {
        console.log('Firebase sign out failed, but demo sign out succeeded');
      }
    }
    
    console.log('✅ Sign out completed');
    return { success: true };
  };

  const resetPassword = async (email) => {
    if (!firebaseServices) {
      return { success: false, error: 'Authentication service not available' };
    }
    
    console.log('🔄 Firebase password reset for:', email);
    return await firebaseServices.auth.sendPasswordResetEmail(email);
  };

  const savePreferences = async (preferences) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    console.log('💾 Saving preferences (demo mode):', preferences);
    
    const updatedProfile = {
      ...userProfile,
      preferences,
      onboardingComplete: true
    };
    
    // Save to localStorage
    localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedProfile));
    setUser(updatedProfile);
    setUserProfile(updatedProfile);
    
    console.log('✅ Preferences saved successfully (demo mode)');
    return { success: true };
  };

  const saveItem = async (item) => {
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }
    
    const updatedSavedItems = [...(userProfile?.savedItems || [])];
    if (!updatedSavedItems.find(i => i.id === item.id)) {
      updatedSavedItems.push({ ...item, savedAt: Date.now() });
      
      const updatedProfile = { ...userProfile, savedItems: updatedSavedItems };
      localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedProfile));
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
      localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
    
    return { success: true };
  };

  // Debug the onboarding check
  const needsOnboardingValue = userProfile && !userProfile.onboardingComplete;
  console.log('🔍 Auth Context Debug:', {
    hasUser: !!user,
    hasUserProfile: !!userProfile,
    onboardingComplete: userProfile?.onboardingComplete,
    needsOnboarding: needsOnboardingValue
  });

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
    savePreferences,
    saveItem,
    likeItem,
    setUser,
    setUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};