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

  // Simple initialization that always works
  useEffect(() => {
    console.log('🚀 Simple auth initialization...');
    
    // Check for existing mock user
    setTimeout(() => {
      try {
        const mockUser = localStorage.getItem('swipecity_mock_user');
        if (mockUser) {
          const parsedUser = JSON.parse(mockUser);
          setUser(parsedUser);
          setUserProfile(parsedUser);
          console.log('✅ Found existing user:', parsedUser.email);
        }
      } catch (e) {
        console.log('No existing user found');
      }
      
      setLoading(false);
      console.log('✅ Auth initialization complete');
    }, 1000); // Short delay to show loading
  }, []);

  // Simple auth methods
  const signUp = async (email, password, displayName) => {
    console.log('📝 Creating account:', email);
    
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
    
    console.log('✅ Account created successfully');
    return { success: true, user: mockUser };
  };

  const signIn = async (email, password) => {
    console.log('🔐 Signing in:', email);
    
    // For testing, just create a user
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
    
    console.log('✅ Signed in successfully');
    return { success: true, user: mockUser };
  };

  const signInWithGoogle = async () => {
    console.log('🔍 Google sign-in (mock)');
    return { success: false, error: 'Google sign-in not available in demo mode' };
  };

  const signOut = async () => {
    console.log('👋 Signing out');
    localStorage.removeItem('swipecity_mock_user');
    localStorage.removeItem('swipecity_user'); // Also clear legacy user data
    setUser(null);
    setUserProfile(null);
    return { success: true };
  };

  const resetPassword = async (email) => {
    console.log('🔄 Password reset requested for:', email);
    return { success: true };
  };

  const savePreferences = async (preferences) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    const updatedProfile = {
      ...userProfile,
      preferences,
      onboardingComplete: true,
      updatedAt: Date.now()
    };
    
    localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
    
    console.log('💾 Preferences saved:', preferences);
    return { success: true };
  };

  const saveItem = async (item) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    const updatedSavedItems = [...(userProfile?.savedItems || [])];
    if (!updatedSavedItems.find(i => i.id === item.id)) {
      updatedSavedItems.push({ ...item, savedAt: Date.now() });
      
      const updatedProfile = { ...userProfile, savedItems: updatedSavedItems };
      localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
    
    return { success: true };
  };

  const likeItem = async (item) => {
    if (!user) return { success: false, error: 'No user logged in' };
    
    const updatedLikedItems = [...(userProfile?.likedItems || [])];
    if (!updatedLikedItems.find(i => i.id === item.id)) {
      updatedLikedItems.push({ ...item, likedAt: Date.now() });
      
      const updatedProfile = { ...userProfile, likedItems: updatedLikedItems };
      localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
    }
    
    return { success: true };
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