import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { Heart, X, MessageCircle, User, LogOut, Camera } from 'lucide-react';


// Security utilities
const SecurityUtils = {
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
  },
  
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
  
  checkRateLimit: (lastAction, cooldown = 300) => {
    return Date.now() - lastAction >= cooldown;
  },
  
  validateMessage: (message) => {
    if (!message || typeof message !== 'string') return false;
    return message.trim().length > 0 && message.length <= 1000;
  }
};


// Enhanced Firebase Auth Integration
if (typeof window !== 'undefined') {
  // SECURITY: Move to environment variables in production
  const FIREBASE_CONFIG = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCgmWYvEGhC9F2mzJ-azIEWusxRvRS9V2I",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "swipecity-marketplace.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "swipecity-marketplace",
  };

  window.initFirebaseAuth = async () => {
    try {
      if (!window.firebase) {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          // SECURITY: Add timeout to prevent hanging
          setTimeout(() => reject(new Error('Firebase script load timeout')), 10000);
        });
        
        const authScript = document.createElement('script');
        authScript.src = 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js';
        document.head.appendChild(authScript);
        await new Promise((resolve, reject) => {
          authScript.onload = resolve;
          authScript.onerror = reject;
          setTimeout(() => reject(new Error('Firebase auth script load timeout')), 10000);
        });
      }
      
      if (window.firebase && !window.firebase.apps.length) {
        window.firebase.initializeApp(FIREBASE_CONFIG);
        console.log('🔥 Firebase Auth Ready!');
      }
    } catch (error) {
      console.error('❌ Firebase Error:', error);
      // SECURITY: Don't expose internal errors to users
      throw new Error('Authentication service temporarily unavailable');
    }
  };
  
  window.initFirebaseAuth();
}

// Global auth state management
let globalUser = null;
const authListeners = new Set();

const setGlobalUser = (user) => {
  globalUser = user;
  authListeners.forEach(listener => listener(user));
};

const useAuthState = () => {
  const [user, setUser] = useState(globalUser);
  
  useEffect(() => {
    const listener = (newUser) => setUser(newUser);
    authListeners.add(listener);
    return () => authListeners.delete(listener);
  }, []);
  
  return user;
};

const AuthContext = createContext({});

const AuthProvider = ({ children }) => {
  const user = useAuthState();
  
  const signOut = useCallback(() => {
    setGlobalUser(null);
  }, []);

  const value = {
    user,
    signOut,
    isAuthenticated: Boolean(user),
    needsOnboarding: user && !user.onboardingComplete
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

const useAuth = () => useContext(AuthContext);

const SwipeMarketplace = () => {
  const { user, isAuthenticated, needsOnboarding, signOut } = useAuth();
  const [redirectChecked, setRedirectChecked] = useState(false);
  const [appState, setAppState] = useState({
    currentMode: 'buyer',
    currentItemIndex: 0,
    showAuthModal: !isAuthenticated,
    showChats: false,
    showProfile: false,
    email: '',
    loading: false,
    authMode: 'social',
    selectedCategories: [],
    priceRange: '',
    shoppingStyle: '',
    onboardingStep: 1,
    dragOffset: { x: 0, y: 0 },
    isDragging: false,
    showMatchAnimation: false,
    matchedItem: null,
    dailySwipeCount: 0,
    maxDailySwipes: 50,
    showLimitModal: false,
    reportedItems: new Set(),
    lastActionTime: 0,
    actionCooldown: 300,
    startPos: null,
    activeChat: null,
    newMessage: '',
    chats: [
      {
        id: 'demo_chat',
        seller_name: 'Demo Seller',
        item_title: 'Demo Item',
        item_image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop',
        seller_id: 'demo_seller',
        item_id: 'demo_item',
        last_message: 'Hi! Interested in this item?',
        timestamp: '2:30 PM',
        unread: false,
        messages: [
          { id: 'm1', sender_id: 'demo_seller', sender_name: 'Demo Seller', text: 'Hi! Thanks for your interest!', timestamp: '2:30 PM' },
          { id: 'm2', sender_id: user?.id || 'user123', sender_name: user?.username || 'You', text: 'Is this still available?', timestamp: '2:32 PM' }
        ]
      }
    ],
    showAddItem: false,
    selectedImages: [],
    newItemTitle: '',
    newItemPrice: '',
    newItemDescription: '',
    newItemCondition: '',
    lastPassedItem: null,
    canUndo: false,
    showEditModal: false,
    editingListing: null,
    editTitle: '',
    editPrice: '',
    editDescription: '',
    editCondition: '',
    editImages: [],
    userListings: [],
    showMyListings: false,
    showSettings: false,
    settingsCategories: [],
    settingsPriceRange: 0,
    settingsLocationRadius: 10,
    settingsShoppingStyle: 0
  });

  const items = useMemo(() => [
    {
      id: '1',
      title: "Nike Air Jordans",
      price: 250,
      image_url: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop",
      seller_name: "Mike Chen",
      seller_rating: 4.8,
      seller_reviews: 127,
      distance: "2.3 miles",
      description: "Barely worn, size 10.5. Original box included.",
      condition: "Like New",
      likes_count: 47,
      category: "sneakers",
      seller_id: "seller1",
      verified: true,
      seller_interested: true,
      algorithmScore: user?.preferences?.categories?.includes(0) ? 0.95 : 0.3
    },
    {
      id: '2',
      title: "Vintage Denim Jacket", 
      price: 85,
      image_url: "https://images.unsplash.com/photo-1544966503-7cc5ac882d5d?w=400&h=400&fit=crop",
      seller_name: "Sarah Johnson",
      seller_rating: 4.6,
      seller_reviews: 89,
      distance: "1.8 miles",
      description: "Classic 90s style, perfect condition.",
      condition: "Good",
      likes_count: 12,
      category: "vintage",
      seller_id: "seller2",
      verified: true,
      seller_interested: false,
      algorithmScore: user?.preferences?.categories?.includes(1) ? 0.88 : 0.25
    },
    {
      id: '3',
      title: "MacBook Pro 13-inch",
      price: 1200,
      image_url: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop",
      seller_name: "Tech Guru",
      seller_rating: 4.9,
      seller_reviews: 203,
      distance: "0.8 miles",
      description: "2020 model, excellent condition, includes charger.",
      condition: "Excellent",
      likes_count: 89,
      category: "electronics",
      seller_id: "seller3",
      verified: false,
      seller_interested: true,
      algorithmScore: user?.preferences?.categories?.includes(2) ? 0.92 : 0.4
    }
  ].sort((a, b) => b.algorithmScore - a.algorithmScore), [user?.preferences?.categories]);

  const categories = ['👟 Sneakers', '👕 Vintage', '📱 Electronics', '🏠 Home', '📚 Books', '💪 Fitness'];
  const currentItem = items[appState.currentItemIndex] || null;

  const updateState = useCallback((updates) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

const handleGoogleAuth = useCallback(async () => {
  updateState({ loading: true });
  
  try {
    if (!window.firebase) {
      throw new Error('Authentication service not available. Please refresh the page.');
    }
    
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // Try popup first, fallback to redirect if it fails
    try {
      console.log('Attempting popup authentication...');
      const result = await window.firebase.auth().signInWithPopup(provider);
      
      // Process successful popup result
      const firebaseUser = result.user;
      
      if (!firebaseUser.email || !SecurityUtils.validateEmail(firebaseUser.email)) {
        throw new Error('Invalid email address received from Google');
      }
      
      const userData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        username: SecurityUtils.sanitizeInput(firebaseUser.displayName || firebaseUser.email.split('@')[0]),
        avatar_url: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        onboardingComplete: false,
        verified: firebaseUser.emailVerified,
        created_at: Date.now()
      };
      
      setGlobalUser(userData);
      updateState({ loading: false, showAuthModal: false });
      console.log('✅ Popup Auth Success!');
      
    } catch (popupError) {
      console.log('Popup failed, trying redirect...', popupError);
      
      // If popup fails, try redirect
      localStorage.setItem('authRedirectInitiated', 'true');
      await window.firebase.auth().signInWithRedirect(provider);
      return;
    }
    
  } catch (error) {
    console.error('❌ Auth Error:', error);
    
    let errorMessage = 'Authentication failed. Please try again.';
    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Please allow popups and try again.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Sign-in was cancelled.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many attempts. Please wait a moment and try again.';
    }
    
    alert(errorMessage);
    updateState({ loading: false });
  }
}, [updateState]);

const handleEmailAuth = useCallback(async () => {
    // SECURITY: Validate and sanitize email input
    const sanitizedEmail = SecurityUtils.sanitizeInput(appState.email);
    
    if (!SecurityUtils.validateEmail(sanitizedEmail)) {
      alert('Please enter a valid email address.');
      return;
    }
    
    updateState({ loading: true });
    setTimeout(() => {
      const userData = {
        id: 'user_' + Date.now(),
        email: sanitizedEmail,
        username: SecurityUtils.sanitizeInput(sanitizedEmail.split('@')[0]),
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        onboardingComplete: false,
        verified: false,
        created_at: Date.now()
      };
      setGlobalUser(userData);
      updateState({ loading: false, showAuthModal: false });
    }, 1000);
  }, [appState.email, updateState]);

const handleSwipe = useCallback((direction) => {
    console.log('🎯 handleSwipe called with direction:', direction);
    console.log('🎯 currentItem:', currentItem?.title);
    console.log('🎯 currentItemIndex:', appState.currentItemIndex);
    
    const now = Date.now();
    
    // SECURITY: Enhanced rate limiting
    if (!SecurityUtils.checkRateLimit(appState.lastActionTime, appState.actionCooldown)) {
      console.log('🚫 Rate limit exceeded for swipe action');
      return;
    }
    
    if (!currentItem) {
      console.log('🚫 No current item or still dragging');
      return;
    }
    
    // SECURITY: Validate daily limit
    if (direction === 'right' && appState.dailySwipeCount >= appState.maxDailySwipes) {
      console.log('🚫 Daily limit reached');
      updateState({ showLimitModal: true });
      return;
    }
    
    const nextIndex = appState.currentItemIndex < items.length - 1 ? appState.currentItemIndex + 1 : 0;
    console.log('🎯 Next index will be:', nextIndex);

    const newSwipeCount = appState.dailySwipeCount + 1;
    
    if (direction === 'right') {
      console.log('🎯 Processing RIGHT swipe');
      // ... rest of the function
      
      if (currentItem.seller_interested) {
        updateState({ 
          showMatchAnimation: true,
          matchedItem: currentItem,
          currentItemIndex: nextIndex,
          dailySwipeCount: newSwipeCount,
          lastActionTime: now,
          canUndo: false
        });
      } else {
        updateState({ currentItemIndex: nextIndex, dailySwipeCount: newSwipeCount, lastActionTime: now, canUndo: false });
        console.log(`🔔 Seller notification: Interest in ${currentItem.title}`);
      }
    } else {
      updateState({ 
        currentItemIndex: nextIndex, 
        lastActionTime: now,
        lastPassedItem: currentItem,
        canUndo: true
      });
      console.log(`👍 Passed on ${currentItem.title} - doesn't count against daily limit`);
    }
}, [currentItem, appState.currentItemIndex, appState.dailySwipeCount, appState.maxDailySwipes, appState.lastActionTime, appState.actionCooldown, appState.isDragging, items.length, updateState, appState.canUndo, appState.lastPassedItem]);  const handleUndo = useCallback(() => {
    if (appState.canUndo && appState.lastPassedItem) {
      // Go back to the passed item
      const lastItemIndex = items.findIndex(item => item.id === appState.lastPassedItem.id);
      if (lastItemIndex !== -1) {
        updateState({
          currentItemIndex: lastItemIndex,
          canUndo: false,
          lastPassedItem: null
        });
        console.log('↶ Undoing pass on:', appState.lastPassedItem.title);
      }
    }
}, [appState.canUndo, appState.lastPassedItem, items, updateState]);

const handleEditListing = useCallback((listing) => {
  updateState({
    showEditModal: true,
    editingListing: listing,
    editTitle: listing.title,
    editPrice: listing.price.toString(),
    editDescription: listing.description || '',
    editCondition: listing.condition,
    editImages: listing.images || []
  });
}, [updateState]);

const handleUpdateListing = useCallback(() => {
  if (!appState.editTitle || !appState.editPrice || !appState.editCondition) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (!appState.editImages || appState.editImages.length === 0) {
    alert('Please add at least one photo');
    return;
  }
  
  const updatedListing = {
    ...appState.editingListing,
    title: SecurityUtils.sanitizeInput(appState.editTitle),
    price: parseFloat(appState.editPrice),
    description: SecurityUtils.sanitizeInput(appState.editDescription),
    condition: appState.editCondition,
    images: appState.editImages,
    updated_at: Date.now()
  };
  
  const updatedListings = appState.userListings.map(listing => 
    listing.id === appState.editingListing.id ? updatedListing : listing
  );
  
  updateState({
    userListings: updatedListings,
    showEditModal: false,
    editingListing: null,
    editTitle: '',
    editPrice: '',
    editDescription: '',
    editCondition: '',
    editImages: []
  });
  
  alert('Listing updated successfully! 🎉');
}, [appState.editingListing, appState.editTitle, appState.editPrice, appState.editDescription, appState.editCondition, appState.editImages, appState.userListings, updateState]);

const handleDeleteListing = useCallback(() => {
  if (window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
    const updatedListings = appState.userListings.filter(listing => 
      listing.id !== appState.editingListing.id
    );
    
    updateState({
      userListings: updatedListings,
      showEditModal: false,
      editingListing: null,
      editTitle: '',
      editPrice: '',
      editDescription: '',
      editCondition: '',
      editImages: []
    });
    
    alert('Listing deleted successfully');
  }
}, [appState.editingListing, appState.userListings, updateState]);

const openSettings = useCallback(() => {
  // Use a timeout to ensure the latest user state is available
  setTimeout(() => {
    const currentUser = globalUser || user;
    console.log('Loading settings for user:', currentUser);
    
    updateState({
      showSettings: true,
      settingsCategories: currentUser?.preferences?.categories || [],
      settingsPriceRange: currentUser?.preferences?.priceRange !== undefined ? currentUser?.preferences?.priceRange : 0,
      settingsLocationRadius: currentUser?.preferences?.locationRadius || 10,
      settingsShoppingStyle: currentUser?.preferences?.shoppingStyle !== undefined ? currentUser?.preferences?.shoppingStyle : 0
    });
  }, 100);
}, [user?.preferences, updateState]);

const saveSettings = useCallback(() => {
  console.log('Saving settings:', {
    categories: appState.settingsCategories,
    priceRange: appState.settingsPriceRange,
    locationRadius: appState.settingsLocationRadius,
    shoppingStyle: appState.settingsShoppingStyle
  });
  
  // Update user preferences
  const updatedUser = {
    ...user,
    preferences: {
      ...user.preferences,
      categories: appState.settingsCategories,
      priceRange: appState.settingsPriceRange,
      locationRadius: appState.settingsLocationRadius,
      shoppingStyle: appState.settingsShoppingStyle
    }
  };
  
  console.log('Updated user object:', updatedUser);
  setGlobalUser(updatedUser);
  console.log('After setGlobalUser, checking user state:', user);
  updateState({ showSettings: false });
  alert('Settings saved! Your recommendations will update accordingly. 🎯');
}, [user, appState.settingsCategories, appState.settingsPriceRange, appState.settingsLocationRadius, appState.settingsShoppingStyle, updateState]);

// ✅ FIXED VERSION (what it should be)
const handleDragStart = useCallback((clientX, clientY) => {
  updateState({ isDragging: true, startPos: { x: clientX, y: clientY } });
}, [updateState]);

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!appState.isDragging || !appState.startPos) return;
    const deltaX = clientX - appState.startPos.x;
    const deltaY = clientY - appState.startPos.y;
    updateState({ dragOffset: { x: deltaX, y: deltaY } });
  }, [appState.isDragging, appState.startPos, updateState]);

const handleDragEnd = useCallback(() => {
    console.log('🐛 handleDragEnd called');
    console.log('🐛 isDragging:', appState.isDragging);
    console.log('🐛 dragOffset:', appState.dragOffset);
    
    if (!appState.isDragging) {
      console.log('🐛 Not dragging, returning early');
      return;
    }
    
    const threshold = 50;
    console.log('🐛 Threshold check:', Math.abs(appState.dragOffset.x), 'vs', threshold);
    
    if (Math.abs(appState.dragOffset.x) > threshold) {
      const direction = appState.dragOffset.x > 0 ? 'right' : 'left';
      console.log('🐛 Triggering swipe:', direction);
      
      // IMPORTANT: Set isDragging to false FIRST to prevent multiple calls
      updateState({ isDragging: false, dragOffset: { x: 0, y: 0 }, startPos: null });
      
      // THEN trigger the swipe
      handleSwipe(direction);
    } else {
      console.log('🐛 Drag not far enough');
      updateState({ isDragging: false, dragOffset: { x: 0, y: 0 }, startPos: null });
    }
  }, [appState.isDragging, appState.dragOffset, handleSwipe, updateState]);
    
  const toggleCategory = useCallback((index) => {
    // SECURITY: Validate category index
    if (index < 0 || index >= categories.length) {
      console.warn('Invalid category index:', index);
      return;
    }
    
    const newCategories = appState.selectedCategories.includes(index)
      ? appState.selectedCategories.filter(c => c !== index)
      : [...appState.selectedCategories, index];
    updateState({ selectedCategories: newCategories });
  }, [appState.selectedCategories, updateState, categories.length]);

  const completeOnboarding = useCallback(() => {
    if (user) {
      const updatedUser = {
        ...user,
        onboardingComplete: true,
        preferences: {
          categories: appState.selectedCategories,
          priceRange: appState.priceRange,
          shoppingStyle: appState.shoppingStyle
        }
      };
      setGlobalUser(updatedUser);
      console.log('✅ Onboarding completed!', updatedUser);
    }
  }, [user, appState.selectedCategories, appState.priceRange, appState.shoppingStyle]);

  useEffect(() => {
    if (!isAuthenticated && !appState.showAuthModal) {
      updateState({ showAuthModal: true });
    }
  }, [isAuthenticated, appState.showAuthModal, updateState]);

// Handle Google redirect authentication results for mobile
useEffect(() => {
  const handleRedirectResult = async () => {
    if (!window.firebase) return;
    
    try {
      const result = await window.firebase.auth().getRedirectResult();
      
      if (result.user) {
        const firebaseUser = result.user;
        
        if (!firebaseUser.email || !SecurityUtils.validateEmail(firebaseUser.email)) {
          throw new Error('Invalid email address received from Google');
        }
        
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          username: SecurityUtils.sanitizeInput(firebaseUser.displayName || firebaseUser.email.split('@')[0]),
          avatar_url: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          onboardingComplete: false,
          verified: firebaseUser.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false, showAuthModal: false });
      }
    } catch (error) {
      console.error('❌ Redirect Auth Error:', error);
    }
  };
  
  // Check once when component mounts
  handleRedirectResult();
}, []); // Run only once

  useEffect(() => {
    // Aggressive scroll position reset for mobile browsers
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };
    
    // Immediate reset
    resetScroll();
    
    // Prevent scrolling entirely - EXCEPT when form is open
if (!appState.showAddItem) {
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.height = '100vh';
} else {
  // Allow scrolling when form is open
  document.body.style.overflow = 'auto';
  document.documentElement.style.overflow = 'auto';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.height = '';
}
    
    // Multiple resets for stubborn mobile browsers
    setTimeout(resetScroll, 0);
    setTimeout(resetScroll, 50);
    setTimeout(resetScroll, 100);
    setTimeout(resetScroll, 200);
    
    // Handle page visibility changes (like refreshes)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetScroll();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('load', resetScroll);
    window.addEventListener('resize', resetScroll);
    
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('load', resetScroll);
      window.removeEventListener('resize', resetScroll);
    };
  }, [appState.showAddItem]);

  if (appState.showAuthModal) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FF6B35, #FFD23F)',
        color: 'white',
        padding: '40px 20px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>
            Welcome to SwipeCity! 🎉
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '40px', opacity: 0.9 }}>
            The marketplace that makes buying and selling addictive
          </p>
          
          <div style={{
            display: 'flex',
            marginBottom: '30px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '15px',
            padding: '4px'
          }}>
            <button
              onClick={() => updateState({ authMode: 'social' })}
              style={{
                flex: 1,
                background: appState.authMode === 'social' ? 'white' : 'transparent',
                color: appState.authMode === 'social' ? '#FF6B35' : 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🚀 Google
            </button>
            <button
              onClick={() => updateState({ authMode: 'email' })}
              style={{
                flex: 1,
                background: appState.authMode === 'email' ? 'white' : 'transparent',
                color: appState.authMode === 'email' ? '#FF6B35' : 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              📧 Email
            </button>
          </div>
          
          {appState.authMode === 'social' ? (
            <div>
              <button
                onClick={handleGoogleAuth}
                disabled={appState.loading}
                style={{
                  width: '100%',
                  background: appState.loading ? '#ccc' : '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '18px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: appState.loading ? 'not-allowed' : 'pointer',
                  marginBottom: '15px'
                }}
              >
                {appState.loading ? '⏳ Signing in...' : '🔍 Continue with Google'}
              </button>
              

            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '30px'
            }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={appState.email}
                onChange={(e) => updateState({ email: SecurityUtils.sanitizeInput(e.target.value) })}
maxLength={254}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '16px',
                  marginBottom: '20px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleEmailAuth}
                disabled={appState.loading || !appState.email}
                style={{
                  width: '100%',
                  background: (appState.loading || !appState.email) ? '#ccc' : 'white',
                  color: '#FF6B35',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: (appState.loading || !appState.email) ? 'not-allowed' : 'pointer'
                }}
              >
                {appState.loading ? 'Signing In...' : '✨ Continue with Email'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    if (appState.onboardingStep === 1) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FF6B35, #FFD23F)',
          color: 'white',
          padding: '20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'max(90px, env(safe-area-inset-top) + 70px)',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
        }}>
          <div style={{ marginBottom: '30px', minHeight: '80px' }}>
            <h1 style={{fontSize: '24px', marginBottom: '10px', margin: '0 0 10px 0', fontWeight: '700'}}>What are you interested in?</h1>
            <p style={{margin: '0', fontSize: '16px', opacity: 0.9}}>Select at least 2 categories</p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            maxWidth: '320px',
            margin: '0 auto 30px',
            minHeight: '300px'
          }}>
            {categories.map((cat, i) => {
              const selected = appState.selectedCategories.includes(i);
              return (
                <div
                  key={i}
                  onClick={() => toggleCategory(i)}
                  style={{
                    background: selected ? 'white' : 'rgba(255,255,255,0.3)',
                    color: selected ? '#333' : 'white',
                    border: selected ? '3px solid #4CAF50' : '2px solid rgba(255,255,255,0.5)',
                    borderRadius: '12px',
                    padding: '15px 10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    position: 'relative',
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                  }}
                >
                  {selected && (
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: '#4CAF50',
                      color: 'white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px'
                    }}>
                      ✓
                    </div>
                  )}
                  {cat}
                </div>
              );
            })}
          </div>
          
          <div>
            <button
              onClick={() => updateState({ onboardingStep: 2 })}
              disabled={appState.selectedCategories.length < 2}
              style={{
                background: appState.selectedCategories.length >= 2 ? '#4CAF50' : 'rgba(255,255,255,0.3)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '12px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: appState.selectedCategories.length >= 2 ? 'pointer' : 'not-allowed',
                opacity: appState.selectedCategories.length >= 2 ? 1 : 0.6
              }}
            >
              Continue → ({appState.selectedCategories.length}/2+)
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #9C27B0, #FF5722)',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'max(90px, env(safe-area-inset-top) + 70px)',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
      }}>
        <h2 style={{fontSize: '22px', marginBottom: '25px', margin: '0 0 25px 0'}}>Your Shopping Style 🛍️</h2>
        
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '15px',
          padding: '20px',
          marginBottom: '20px',
          maxWidth: '320px',
          margin: '0 auto 20px'
        }}>
          <h3 style={{marginBottom: '15px', fontSize: '18px'}}>Price Range</h3>
          <div style={{display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap'}}>
            {['$10-50', '$50-100', '$100-200', '$200+'].map((priceOption, i) => (
              <button
                key={priceOption}
                onClick={() => updateState({ priceRange: i })}
                style={{
                  background: appState.priceRange === i ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                  color: appState.priceRange === i ? '#333' : 'white',
                  border: appState.priceRange === i ? '2px solid #4CAF50' : '1px solid rgba(255,255,255,0.5)',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                {priceOption}
              </button>
            ))}
          </div>
        </div>

        <div style={{marginBottom: '25px'}}>
          <h3 style={{marginBottom: '15px', fontSize: '18px'}}>Shopping Style</h3>
          {['🎯 Hunt specific items', '🔍 Browse & discover', '💰 Find deals'].map((styleOption, i) => (
            <div
              key={styleOption}
              onClick={() => updateState({ shoppingStyle: i })}
              style={{
                background: appState.shoppingStyle === i ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                color: appState.shoppingStyle === i ? '#333' : 'white',
                border: appState.shoppingStyle === i ? '3px solid #4CAF50' : '2px solid rgba(255,255,255,0.5)',
                borderRadius: '12px',
                padding: '12px',
                margin: '6px auto',
                cursor: 'pointer',
                position: 'relative',
                fontWeight: 'bold',
                maxWidth: '280px',
                fontSize: '14px'
              }}
            >
              {appState.shoppingStyle === i && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '12px',
                  background: '#4CAF50',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  textAlign: 'center',
                  lineHeight: '18px',
                  fontSize: '10px'
                }}>
                  ✓
                </div>
              )}
              {styleOption}
            </div>
          ))}
        </div>

        <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
          <button
            onClick={() => updateState({ onboardingStep: 1 })}
            style={{
              background: 'rgba(255,255,255,0.3)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: '25px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
          <button
            onClick={() => {
              console.log('🎯 Start Swiping button clicked!');
              console.log('Current shopping style:', appState.shoppingStyle);
              completeOnboarding();
            }}
            disabled={appState.shoppingStyle === ''}
            style={{
              background: appState.shoppingStyle !== '' ? '#4CAF50' : 'rgba(255,255,255,0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '12px 25px',
              fontWeight: 'bold',
              cursor: appState.shoppingStyle !== '' ? 'pointer' : 'not-allowed',
              opacity: appState.shoppingStyle !== '' ? 1 : 0.6,
              fontSize: '14px'
            }}
          >
            Start Swiping! 🎉
          </button>
        </div>
      </div>
    );
  }

  // Main Interface
  if (appState.currentMode === 'buyer') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
          paddingTop: 'max(35px, env(safe-area-inset-top) + 15px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <h1 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '700' }}>SwipeCity</h1>
            
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '18px',
              padding: '3px',
              minWidth: '100px'
            }}>
              <button
                onClick={() => updateState({ currentMode: 'buyer' })}
                style={{
                  flex: 1,
                  background: appState.currentMode === 'buyer' ? 'rgba(255,255,255,0.9)' : 'transparent',
                  color: appState.currentMode === 'buyer' ? '#667eea' : 'white',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                🛒 Buy
              </button>
              <button
                onClick={() => updateState({ currentMode: 'seller' })}
                style={{
                  flex: 1,
                  background: appState.currentMode === 'seller' ? 'rgba(255,255,255,0.9)' : 'transparent',
                  color: appState.currentMode === 'seller' ? '#667eea' : 'white',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                💰 Sell
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => updateState({ showChats: true })}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
                position: 'relative'
              }}
            >
              <MessageCircle size={18} />
            </button>
            <button
              onClick={() => updateState({ showProfile: !appState.showProfile })}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Swipe Cards */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 20px 5px',
          position: 'relative',
          minHeight: 0
        }}>
          {currentItem ? (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '350px',
              height: 'calc(100vh - 290px)',
              minHeight: '340px',
              maxHeight: '480px'
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'white',
                  borderRadius: '20px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  overflow: 'hidden',
                  cursor: 'grab',
                  transform: `translate(${appState.dragOffset.x}px, ${appState.dragOffset.y}px) rotate(${appState.dragOffset.x * 0.1}deg)`,
                  transition: appState.isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  zIndex: 10
                }}
                onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  handleDragStart(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  const touch = e.touches[0];
                  handleDragMove(touch.clientX, touch.clientY);
                }}
                onTouchEnd={handleDragEnd}
              >
                <div style={{
                  height: '50%',
                  backgroundImage: `url(${currentItem.image_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    background: 'rgba(244, 67, 54, 0.9)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    fontWeight: 'bold',
                    transform: `scale(${Math.abs(appState.dragOffset.x) > 50 && appState.dragOffset.x < 0 ? 1 : 0}) rotate(-15deg)`,
                    transition: 'transform 0.2s ease'
                  }}>
                    PASS
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(76, 175, 80, 0.9)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    fontWeight: 'bold',
                    transform: `scale(${Math.abs(appState.dragOffset.x) > 50 && appState.dragOffset.x > 0 ? 1 : 0}) rotate(15deg)`,
                    transition: 'transform 0.2s ease'
                  }}>
                    LIKE
                  </div>
                </div>

                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#333' }}>{currentItem.title}</h3>
                      <p style={{ margin: '5px 0', fontSize: '24px', fontWeight: '800', color: '#4CAF50' }}>${currentItem.price}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        background: currentItem.verified ? '#4CAF50' : '#ff9800',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '5px'
                      }}>
                        {currentItem.verified ? '✓ Verified' : 'Unverified'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>⭐ {currentItem.seller_rating} ({currentItem.seller_reviews})</div>
                    </div>
                  </div>

                  <p style={{ color: '#666', margin: '10px 0', fontSize: '14px', lineHeight: '1.4' }}>{currentItem.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <span style={{ color: '#888', fontSize: '14px' }}>📍 {currentItem.distance}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ color: '#888', fontSize: '14px' }}>❤️ {currentItem.likes_count} likes</span>
                      <div style={{
                        background: 'rgba(102, 126, 234, 0.1)',
                        color: '#667eea',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {appState.dailySwipeCount}/{appState.maxDailySwipes} today
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'white',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '40px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ marginBottom: '15px' }}>🎉 You've seen all items!</h2>
              <p style={{ marginBottom: '20px' }}>Check back later for new listings</p>
              <button
                onClick={() => updateState({ currentItemIndex: 0 })}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '15px 30px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Start Over
              </button>
            </div>
          )}
        </div>

{/* Action Buttons - Maximum clearance from browser UI */}
<div style={{
  padding: '20px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center', // Added for better vertical alignment
  gap: appState.canUndo ? '20px' : '50px', // Smaller gap when undo is present
  background: 'rgba(255,255,255,0.1)',
  backdropFilter: 'blur(10px)',
  paddingBottom: 'max(100px, env(safe-area-inset-bottom) + 85px)',
  position: 'relative',
  minHeight: '120px' // Ensure minimum height for button area
}}>
  {appState.canUndo && (
    <button
      onClick={handleUndo}
      style={{
        width: '55px',         // Slightly larger for mobile
        height: '55px',        // Slightly larger for mobile
        borderRadius: '50%',
        border: '3px solid white',
        background: '#ff9800',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(255, 152, 0, 0.5)', // Enhanced shadow
        fontSize: '24px',      // Larger font for mobile
        fontWeight: 'bold',
        WebkitTapHighlightColor: 'transparent',
        // Mobile-specific touch improvements
        touchAction: 'manipulation',
        userSelect: 'none'
      }}
    >
      ↶
    </button>
  )}

  <button
    onClick={() => {
      console.log('❌ PASS button clicked on mobile');
      handleSwipe('left');
    }}
    disabled={!currentItem || appState.isDragging}
    style={{
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      border: '4px solid white',
      background: '#ff4444',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 25px rgba(255, 68, 68, 0.6)',
      opacity: (!currentItem || appState.isDragging) ? 0.5 : 1,
      transform: 'scale(1)',
      transition: 'all 0.2s ease',
      fontSize: '28px',
      fontWeight: 'bold',
      WebkitTapHighlightColor: 'transparent',
      // Mobile-specific touch improvements
      touchAction: 'manipulation',
      userSelect: 'none'
    }}
  >
    ✕
  </button>

  <button
    onClick={() => {
      console.log('❤️ LIKE button clicked on mobile');
      handleSwipe('right');
    }}
    disabled={!currentItem || appState.isDragging}
    style={{
      width: '70px',
      height: '70px',
      borderRadius: '50%',
      border: '4px solid white',
      background: '#4CAF50',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 25px rgba(76, 175, 80, 0.6)',
      opacity: (!currentItem || appState.isDragging) ? 0.5 : 1,
      transform: 'scale(1)',
      transition: 'all 0.2s ease',
      fontSize: '28px',
      fontWeight: 'bold',
      WebkitTapHighlightColor: 'transparent',
      // Mobile-specific touch improvements
      touchAction: 'manipulation',
      userSelect: 'none'
    }}
  >
    ❤️
  </button>
</div>

        {/* Match Animation Modal */}
        {appState.showMatchAnimation && appState.matchedItem && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '350px'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
              <h2 style={{ color: '#4CAF50', marginBottom: '15px', fontSize: '24px' }}>It's a Match!</h2>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                background: '#f8f9fa',
                borderRadius: '15px',
                padding: '15px',
                marginBottom: '20px'
              }}>
                <img
                  src={appState.matchedItem.image_url}
                  alt={appState.matchedItem.title}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#333' }}>
                    {appState.matchedItem.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {appState.matchedItem.seller_name} wants to sell to you!
                  </p>
                </div>
              </div>

              <p style={{ color: '#666', marginBottom: '25px', fontSize: '16px' }}>
                🎯 You both want to make this deal happen!
              </p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => updateState({ showMatchAnimation: false, matchedItem: null })}
                  style={{
                    background: '#ddd',
                    color: '#666',
                    border: 'none',
                    borderRadius: '25px',
                    padding: '12px 20px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    const newChat = {
                      id: `chat_${appState.matchedItem.id}`,
                      seller_name: appState.matchedItem.seller_name,
                      item_title: appState.matchedItem.title,
                      item_image: appState.matchedItem.image_url,
                      seller_id: appState.matchedItem.seller_id,
                      item_id: appState.matchedItem.id,
                      last_message: `Interested in ${appState.matchedItem.title}`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      unread: false,
                      messages: [
                        {
                          id: `initial_${appState.matchedItem.id}`,
                          sender_id: appState.matchedItem.seller_id,
                          sender_name: appState.matchedItem.seller_name,
                          text: `Hi! Thanks for your interest in my ${appState.matchedItem.title}! 😊`,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      ]
                    };
                    
                    setAppState(prev => ({
                      ...prev,
                      showMatchAnimation: false,
                      matchedItem: null,
                      showChats: true,
                      activeChat: newChat,
                      chats: [newChat, ...prev.chats.filter(chat => chat.id !== newChat.id)]
                    }));
                  }}
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    padding: '12px 25px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <MessageCircle size={16} />
                  Start Messaging
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat List Modal */}
        {appState.showChats && !appState.activeChat && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'white',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '15px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Messages</h2>
              <button
                onClick={() => updateState({ showChats: false })}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {appState.chats && appState.chats.length > 0 ? (
                appState.chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => updateState({ activeChat: chat })}
                    style={{
                      padding: '15px 20px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      background: 'white'
                    }}
                  >
                    <img
                      src={chat.item_image}
                      alt={chat.item_title}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '10px',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#333' }}>{chat.seller_name}</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>{chat.item_title}</p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#888' }}>{chat.last_message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#666'
                }}>
                  <MessageCircle size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
                  <h3 style={{ marginBottom: '10px' }}>No messages yet</h3>
                  <p>Start swiping to connect with sellers!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Individual Chat Modal */}
        {appState.activeChat && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'white',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '15px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                  onClick={() => updateState({ activeChat: null })}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '35px',
                    height: '35px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ←
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{appState.activeChat.seller_name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{appState.activeChat.item_title}</p>
                </div>
              </div>
              <button
                onClick={() => updateState({ showChats: false, activeChat: null })}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '35px',
                  height: '35px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '20px',
              background: '#f8f9fa'
            }}>
              {appState.activeChat && appState.activeChat.messages && appState.activeChat.messages.map(message => (
                <div
                  key={message.id}
                  style={{
                    marginBottom: '15px',
                    display: 'flex',
                    justifyContent: message.sender_id === (user?.id || 'user123') ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: '18px',
                    background: message.sender_id === (user?.id || 'user123') ? '#4CAF50' : 'white',
                    color: message.sender_id === (user?.id || 'user123') ? 'white' : '#333',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{message.text}</p>
                    <span style={{ 
                      fontSize: '12px', 
                      opacity: 0.7,
                      display: 'block',
                      textAlign: 'right'
                    }}>
                      {message.timestamp}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '15px 20px',
              background: 'white',
              borderTop: '1px solid #eee',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={appState.newMessage}
                onChange={(e) => updateState({ newMessage: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && appState.newMessage.trim()) {
                    const newMsg = {
                      id: `msg_${Date.now()}`,
                      sender_id: user?.id || 'user123',
                      sender_name: user?.username || 'You',
                      text: appState.newMessage.trim(),
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    
                    setAppState(prev => ({
                      ...prev,
                      newMessage: '',
                      activeChat: {
                        ...prev.activeChat,
                        messages: [...prev.activeChat.messages, newMsg],
                        last_message: newMsg.text,
                        timestamp: newMsg.timestamp
                      },
                      chats: prev.chats.map(chat => 
                        chat.id === prev.activeChat.id 
                          ? { ...chat, last_message: newMsg.text, timestamp: newMsg.timestamp }
                          : chat
                      )
                    }));
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '25px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  if (appState.newMessage.trim()) {
                    const newMsg = {
                      id: `msg_${Date.now()}`,
                      sender_id: user?.id || 'user123',
                      sender_name: user?.username || 'You',
                      text: appState.newMessage.trim(),
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    
                    setAppState(prev => ({
                      ...prev,
                      newMessage: '',
                      activeChat: {
                        ...prev.activeChat,
                        messages: [...prev.activeChat.messages, newMsg],
                        last_message: newMsg.text,
                        timestamp: newMsg.timestamp
                      },
                      chats: prev.chats.map(chat => 
                        chat.id === prev.activeChat.id 
                          ? { ...chat, last_message: newMsg.text, timestamp: newMsg.timestamp }
                          : chat
                      )
                    }));
                  }
                }}
                disabled={!appState.newMessage.trim()}
                style={{
                  background: appState.newMessage.trim() ? '#4CAF50' : '#ddd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '45px',
                  height: '45px',
                  cursor: appState.newMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ➤
              </button>
            </div>
          </div>
        )}

        {/* Profile Panel */}
        {appState.showProfile && (
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '300px',
            background: 'white',
            boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
            zIndex: 1000,
            transform: 'translateX(0)',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Profile</h3>
                <button
                  onClick={() => updateState({ showProfile: false })}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <img
                  src={user?.avatar_url}
                  alt="Profile"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    marginBottom: '15px',
                    objectFit: 'cover'
                  }}
                />
                <h4 style={{ margin: '0 0 5px 0' }}>{user?.username}</h4>
                <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>{user?.email}</p>
              </div>

<div style={{ marginBottom: '20px' }}>
  <button
    onClick={openSettings}
    style={{
      width: '100%',
      background: '#667eea',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      padding: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}
  >
    ⚙️ Search Preferences
  </button>
</div>

              <div style={{ marginBottom: '20px' }}>
                <h5 style={{ marginBottom: '10px' }}>Daily Stats</h5>
                <div style={{
                  background: '#f5f5f5',
                  borderRadius: '10px',
                  padding: '15px'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>
                    Interests today: {appState.dailySwipeCount}/{appState.maxDailySwipes}
                  </p>
                  <div style={{
                    background: '#ddd',
                    borderRadius: '5px',
                    height: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: '#4CAF50',
                      height: '100%',
                      width: `${(appState.dailySwipeCount / appState.maxDailySwipes) * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>

              <button
                onClick={signOut}
                style={{
                  width: '100%',
                  background: '#ff4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {appState.showSettings && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '400px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: '22px' }}>Search Preferences</h2>
                <button
                  onClick={() => updateState({ showSettings: false })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Categories Section */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#333' }}>What are you looking for?</h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px'
                }}>
                  {categories.map((cat, i) => {
                    const selected = appState.settingsCategories.includes(i);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          const newCategories = selected
                            ? appState.settingsCategories.filter(c => c !== i)
                            : [...appState.settingsCategories, i];
                          updateState({ settingsCategories: newCategories });
                        }}
                        style={{
                          background: selected ? '#667eea' : '#f5f5f5',
                          color: selected ? 'white' : '#333',
                          border: selected ? '2px solid #4CAF50' : '2px solid #ddd',
                          borderRadius: '10px',
                          padding: '12px 8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          position: 'relative',
                          minHeight: '50px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {selected && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: '#4CAF50',
                            color: 'white',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px'
                          }}>
                            ✓
                          </div>
                        )}
                        {cat}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Section */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#333' }}>Price Range</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['$10-50', '$50-100', '$100-200', '$200+'].map((priceOption, i) => (
                    <button
                      key={priceOption}
                      onClick={() => updateState({ settingsPriceRange: i })}
                      style={{
                        background: appState.settingsPriceRange === i ? '#667eea' : '#f5f5f5',
                        color: appState.settingsPriceRange === i ? 'white' : '#333',
                        border: appState.settingsPriceRange === i ? '2px solid #4CAF50' : '2px solid #ddd',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      {priceOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Radius Section */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#333' }}>Search Radius</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={appState.settingsLocationRadius}
                    onChange={(e) => updateState({ settingsLocationRadius: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '5px',
                      background: '#ddd',
                      outline: 'none'
                    }}
                  />
                  <div style={{ 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#667eea', 
                    fontWeight: 'bold' 
                  }}>
                    📍 {appState.settingsLocationRadius} miles
                  </div>
                </div>
              </div>

              {/* Shopping Style Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#333' }}>Shopping Style</h3>
                {['🎯 Hunt specific items', '🔍 Browse & discover', '💰 Find deals'].map((styleOption, i) => (
                  <div
                    key={styleOption}
                    onClick={() => updateState({ settingsShoppingStyle: i })}
                    style={{
                      background: appState.settingsShoppingStyle === i ? '#667eea' : '#f5f5f5',
                      color: appState.settingsShoppingStyle === i ? 'white' : '#333',
                      border: appState.settingsShoppingStyle === i ? '2px solid #4CAF50' : '2px solid #ddd',
                      borderRadius: '10px',
                      padding: '12px',
                      margin: '6px 0',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      position: 'relative'
                    }}
                  >
                    {appState.settingsShoppingStyle === i && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '12px',
                        background: '#4CAF50',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        ✓
                      </div>
                    )}
                    {styleOption}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => updateState({ showSettings: false })}
                  style={{
                    flex: 1,
                    background: '#ddd',
                    color: '#666',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  style={{
                    flex: 2,
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  💾 Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Overlay for profile panel */}
        {appState.showProfile && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999
            }}
            onClick={() => updateState({ showProfile: false })}
          />
        )}

        {/* Daily Limit Modal */}
        {appState.showLimitModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '40px',
              textAlign: 'center',
              maxWidth: '300px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>⏰</div>
              <h2 style={{ color: '#ff9800', marginBottom: '15px' }}>Daily Limit Reached!</h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                You've used all {appState.maxDailySwipes} interests for today. Come back tomorrow for more!
              </p>
              <button
                onClick={() => updateState({ showLimitModal: false })}
                style={{
                  background: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 25px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

// Seller Mode
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: '700' }}>SwipeCity</h1>
          
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '25px',
            padding: '4px'
          }}>
            <button
              onClick={() => updateState({ currentMode: 'buyer' })}
              style={{
                background: appState.currentMode === 'buyer' ? 'rgba(255,255,255,0.9)' : 'transparent',
                color: appState.currentMode === 'buyer' ? '#667eea' : 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              🛒 Buy
            </button>
            <button
              onClick={() => updateState({ currentMode: 'seller' })}
              style={{
                background: appState.currentMode === 'seller' ? 'rgba(255,255,255,0.9)' : 'transparent',
                color: appState.currentMode === 'seller' ? '#667eea' : 'white',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
            >
              💰 Sell
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => updateState({ showChats: true })}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white',
              position: 'relative'
            }}
          >
            <MessageCircle size={20} />
          </button>
          <button
            onClick={() => updateState({ showProfile: !appState.showProfile })}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <User size={20} />
          </button>
        </div>
      </div>

      {/* Seller Content */}
      {!appState.showAddItem ? (
        appState.showMyListings ? (
          /* My Listings View */
          <div style={{
            flex: 1,
            padding: '20px',
            background: 'white',
            margin: '20px',
            borderRadius: '20px',
            maxWidth: '600px',
            alignSelf: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center' }}>
              <button
                onClick={() => updateState({ showMyListings: false, showAddItem: false })}
                style={{
                  background: !appState.showMyListings ? 'rgba(102, 126, 234, 0.9)' : 'rgba(255,255,255,0.3)',
                  color: !appState.showMyListings ? 'white' : '#667eea',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📋 Sell Items
              </button>
              <button
                onClick={() => updateState({ showMyListings: true, showAddItem: false })}
                style={{
                  background: appState.showMyListings ? 'rgba(102, 126, 234, 0.9)' : 'rgba(255,255,255,0.3)',
                  color: appState.showMyListings ? 'white' : '#667eea',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📋 My Listings ({appState.userListings?.length || 0})
              </button>
            </div>

            <h2 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '24px' }}>My Listings</h2>
            
{appState.userListings && appState.userListings.length > 0 ? (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  }}>
    {appState.userListings.map((listing) => (
      <div 
        key={listing.id} 
        onClick={() => handleEditListing(listing)}
        style={{
          border: '1px solid #ddd',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }}
      >
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 'bold',
          zIndex: 1
        }}>
          ✏️ EDIT
        </div>
        
        <img
          src={listing.images && listing.images[0] ? listing.images[0].url : 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop'}
          alt={listing.title}
          style={{
            width: '100%',
            height: '150px',
            objectFit: 'cover'
          }}
        />
        <div style={{ padding: '15px' }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '16px', 
            color: '#333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {listing.title}
          </h3>
          <p style={{ 
            margin: '0 0 8px 0', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#4CAF50' 
          }}>
            ${listing.price}
          </p>
          <p style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px', 
            color: '#666' 
          }}>
            {listing.condition}
          </p>
          <div style={{
            background: listing.status === 'active' ? '#4CAF50' : '#ff9800',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {listing.status === 'active' ? 'Active' : 'Sold'}
          </div>
          
          {listing.updated_at && (
            <div style={{
              fontSize: '10px',
              color: '#999',
              marginTop: '8px'
            }}>
              Updated: {new Date(listing.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
) : (
  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
    <h3>No listings yet</h3>
    <p>Click "Sell Items" to create your first listing!</p>
  </div>
)}
          </div>
        ) : (
          /* Sell Items View */
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px'
          }}>
            <div style={{
              textAlign: 'center',
              color: 'white',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '60px 40px',
              backdropFilter: 'blur(10px)',
              maxWidth: '400px'
            }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', justifyContent: 'center' }}>
                <button
                  onClick={() => updateState({ showMyListings: false, showAddItem: false })}
                  style={{
                    background: !appState.showMyListings ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                    color: !appState.showMyListings ? '#667eea' : 'white',
                    border: 'none',
                    borderRadius: '15px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  📋 Sell Items
                </button>
                <button
                  onClick={() => updateState({ showMyListings: true, showAddItem: false })}
                  style={{
                    background: appState.showMyListings ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                    color: appState.showMyListings ? 'white' : '#667eea',
                    border: 'none',
                    borderRadius: '15px',
                    padding: '10px 20px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  📋 My Listings ({appState.userListings?.length || 0})
                </button>
              </div>
              
              <Camera size={64} style={{ marginBottom: '30px', opacity: 0.8 }} />
              <h2 style={{ marginBottom: '20px', fontSize: '28px' }}>Sell Your Items</h2>
              <p style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.5', opacity: 0.9 }}>
                List your items and let buyers discover them through our addictive swipe interface.
              </p>
              <button
                onClick={() => updateState({ showAddItem: true })}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  margin: '0 auto'
                }}
              >
                <Camera size={20} />
                Add Your First Item
              </button>
            </div>
          </div>
        )
      ) : (
        /* Add Item Form */
      <div style={{
  flex: 1,
  padding: '20px',
  background: 'white',
  margin: '20px',
  borderRadius: '20px',
  maxWidth: '500px',
  alignSelf: 'center',
  width: '100%',
  boxSizing: 'border-box',
  maxHeight: 'calc(100vh - 100px)',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  position: 'relative',
  zIndex: 1000
}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>List New Item</h2>
            <button
              onClick={() => updateState({ showAddItem: false, selectedImages: [], newItemTitle: '', newItemPrice: '', newItemDescription: '', newItemCondition: '' })}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              ×
            </button>
          </div>

          {/* Photo Upload Section */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#333', marginBottom: '15px', fontSize: '16px' }}>Photos (up to 5)</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '10px',
              marginBottom: '15px'
            }}>
              {appState.selectedImages && appState.selectedImages.map((image, index) => (
                <div key={index} style={{
                  position: 'relative',
                  aspectRatio: '1/1',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#f5f5f5'
                }}>
                  <img
                    src={image.url}
                    alt={`Upload ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <button
                    onClick={() => {
                      const newImages = appState.selectedImages.filter((_, i) => i !== index);
                      updateState({ selectedImages: newImages });
                    }}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: 'rgba(244, 67, 54, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              
              {(!appState.selectedImages || appState.selectedImages.length < 5) && (
                <label style={{
                  aspectRatio: '1/1',
                  border: '2px dashed #ddd',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: '#f9f9f9',
                  transition: 'all 0.2s ease'
                }}>
                  <Camera size={24} style={{ color: '#666', marginBottom: '5px' }} />
                  <span style={{ fontSize: '12px', color: '#666' }}>Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const currentImages = appState.selectedImages || [];
                      
                      if (currentImages.length + files.length > 5) {
                        alert('Maximum 5 photos allowed');
                        return;
                      }
                      
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const newImage = {
                            file: file,
                            url: event.target.result,
                            name: file.name
                          };
                          updateState({ 
                            selectedImages: [...(appState.selectedImages || []), newImage] 
                          });
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Item Details Form */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: 'bold' }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="What are you selling?"
              value={appState.newItemTitle || ''}
              onChange={(e) => updateState({ newItemTitle: SecurityUtils.sanitizeInput(e.target.value) })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: 'bold' }}>
              Price *
            </label>
            <input
              type="number"
              placeholder="0"
              value={appState.newItemPrice || ''}
              onChange={(e) => updateState({ newItemPrice: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: 'bold' }}>
              Condition *
            </label>
            <select
              value={appState.newItemCondition || ''}
              onChange={(e) => updateState({ newItemCondition: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select condition</option>
              <option value="new">New</option>
              <option value="like-new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              placeholder="Describe your item..."
              value={appState.newItemDescription || ''}
              onChange={(e) => updateState({ newItemDescription: SecurityUtils.sanitizeInput(e.target.value) })}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={() => {
              if (!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition) {
                alert('Please fill in all required fields');
                return;
              }
              
              if (!appState.selectedImages || appState.selectedImages.length === 0) {
                alert('Please add at least one photo');
                return;
              }
              
              // Create new listing object
              const newListing = {
                id: 'listing_' + Date.now(),
                title: appState.newItemTitle,
                price: appState.newItemPrice,
                condition: appState.newItemCondition,
                description: appState.newItemDescription,
                images: appState.selectedImages,
                seller_id: user?.id || 'user123',
                seller_name: user?.username || 'You',
                created_at: Date.now(),
                status: 'active'
              };
              
              // Add to user listings
              updateState({ 
                userListings: [...(appState.userListings || []), newListing],
                showAddItem: false, 
                selectedImages: [], 
                newItemTitle: '', 
                newItemPrice: '', 
                newItemDescription: '', 
                newItemCondition: '' 
              });
              
              alert('Item listed successfully! 🎉');
            }}
            disabled={!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.selectedImages || appState.selectedImages.length === 0}
            style={{
              width: '100%',
              background: (!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.selectedImages || appState.selectedImages.length === 0) ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: (!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.selectedImages || appState.selectedImages.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            List Item
          </button>
        </div>
      )}
      {/* Edit Listing Modal */}
        {appState.showEditModal && appState.editingListing && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ margin: 0, color: '#333', fontSize: '22px' }}>Edit Listing</h2>
                <button
                  onClick={() => updateState({ 
                    showEditModal: false, 
                    editingListing: null,
                    editTitle: '',
                    editPrice: '',
                    editDescription: '',
                    editCondition: '',
                    editImages: []
                  })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={appState.editTitle || ''}
                  onChange={(e) => updateState({ editTitle: SecurityUtils.sanitizeInput(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
                  Price *
                </label>
                <input
                  type="number"
                  value={appState.editPrice || ''}
                  onChange={(e) => updateState({ editPrice: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
                  Condition *
                </label>
                <select
                  value={appState.editCondition || ''}
                  onChange={(e) => updateState({ editCondition: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">Select condition</option>
                  <option value="new">New</option>
                  <option value="like-new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', color: '#333', fontWeight: 'bold' }}>
                  Description
                </label>
                <textarea
                  value={appState.editDescription || ''}
                  onChange={(e) => updateState({ editDescription: SecurityUtils.sanitizeInput(e.target.value) })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                <button
                  onClick={handleDeleteListing}
                  style={{
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 15px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🗑️ Delete
                </button>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => updateState({ 
                      showEditModal: false, 
                      editingListing: null,
                      editTitle: '',
                      editPrice: '',
                      editDescription: '',
                      editCondition: '',
                      editImages: []
                    })}
                    style={{
                      background: '#ddd',
                      color: '#666',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 15px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateListing}
                    disabled={!appState.editTitle || !appState.editPrice || !appState.editCondition}
                    style={{
                      background: (!appState.editTitle || !appState.editPrice || !appState.editCondition) ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 15px',
                      fontWeight: 'bold',
                      cursor: (!appState.editTitle || !appState.editPrice || !appState.editCondition) ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    💾 Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <SwipeMarketplace />
  </AuthProvider>
);

export default App;