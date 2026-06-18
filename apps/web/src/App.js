import React, { useState, useEffect, createContext, useContext, useCallback, useMemo, Component } from 'react';
import { MessageCircle, User, LogOut, Camera } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import firebaseNative from './services/firebaseNative';
import AdminDashboard from './components/AdminDashboard';
import SkeletonCard from './components/SkeletonCard';
import { SwipeFeedback, LoadingSpinner, MatchSuccessAnimation } from './components/SwipeFeedback';
import { DataService } from './utils/dataIntegration';
import { testImageGeneration } from './utils/dataSeeding';
import { SUPPORTED_CITIES } from './data/cities';
// Firebase Auth Integration - Safe version with fallbacks
import { useAuth } from './contexts/AuthContextNative';
import AuthModal from './components/AuthModal';
// Complete data persistence system
import { getDataManager } from './utils/dataPersistence';
// Extracted UI components and utilities (no behavior change)
import SecurityUtils from './utils/securityUtils';
import OnboardingButtonBar from './components/OnboardingButtonBar';
import BottomNavigation from './components/BottomNavigation';
import CloseButton from './components/CloseButton';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';

// Safely parse a JSON value from localStorage. `|| '{}'` only covers a MISSING
// key, not a corrupt/truncated value — an unguarded JSON.parse in a render or
// event handler would throw and crash the app via the ErrorBoundary.
const safeParseLocal = (key, fallback = {}) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('[storage] failed to parse', key, '-', e?.message);
    return fallback;
  }
};

// Downscale a (potentially huge, full-resolution) image data URL to a bounded
// JPEG via canvas. Library photos come in at full size, which bloats listings
// past Firestore's ~1MB doc limit (so saved/listed items silently fail to
// persist). The camera plugin already downscales; this brings library photos in
// line. Falls back to the original on any error.
const downscaleDataUrl = (dataUrl, maxDim = 1200, quality = 0.7) => new Promise((resolve) => {
  try {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) { height = Math.round((height * maxDim) / width); width = maxDim; }
          else { width = Math.round((width * maxDim) / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  } catch {
    resolve(dataUrl);
  }
});

// Inline shared data for Capacitor compatibility
const mockItems = [
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
    city: "Raleigh, NC",
    seller_id: "seller1",
    verified: true,
    seller_interested: true,
    algorithmScore: 0.95
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
    city: "Durham, NC",
    seller_id: "seller2",
    verified: true,
    seller_interested: false,
    algorithmScore: 0.88
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
    city: "Cary, NC",
    seller_id: "seller3",
    verified: false,
    seller_interested: true,
    algorithmScore: 0.92
  }
];

const mockChats = [
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
      {
        id: 'm1',
        sender_id: 'demo_seller',
        sender_name: 'Demo Seller',
        text: 'Hi! Thanks for your interest!',
        timestamp: '2:30 PM'
      },
      {
        id: 'm2',
        sender_id: 'user123',
        sender_name: 'You',
        text: 'Is this still available?',
        timestamp: '2:32 PM'
      }
    ]
  }
];

const categories = [
  '👟 Sneakers',
  '👕 Vintage',
  '📱 Electronics',
  '🏠 Home',
  '📚 Books',
  '💪 Fitness'
];

// Enhanced Firebase Auth Integration
if (typeof window !== 'undefined') {
  // SECURITY: Move to environment variables in production
  const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCgmWYvEGhC9F2mzJ-azIEWusxRvRS9V2I",
  authDomain: "swipecity-marketplace.firebaseapp.com",
  projectId: "swipecity-marketplace",
  storageBucket: "swipecity-marketplace.firebasestorage.app",
  messagingSenderId: "360980103663",
  appId: "1:360980103663:web:6c03696d617a6186fe361a"
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
  
  if (user) {
    // Store in localStorage for persistence. Guarded: a large value (e.g. a
    // profile-photo data URL) can exceed the WebView's ~5MB quota, and an
    // uncaught QuotaExceededError here crashes the whole app via the
    // ErrorBoundary on relaunch. Persistence is best-effort.
    try {
      localStorage.setItem('swipecity_user', JSON.stringify(user));
    } catch (e) {
      console.warn('[storage] could not persist swipecity_user:', e?.message);
    }

    // Also save to Firebase if the user has an ID
    if (user.id) {
      // Save to Firebase in background (non-blocking)
      try {
        if (window.firebaseService && window.firebaseService.updateUser) {
          window.firebaseService.updateUser(user.id, {
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            onboardingComplete: user.onboardingComplete,
            preferences: user.preferences,
            updatedAt: new Date().toISOString()
          }).catch(error => {
            console.warn('Failed to save user to Firebase:', error);
            // Continue anyway - localStorage backup is available
          });
        }
      } catch (error) {
        console.warn('Firebase service not available for user save:', error);
      }
    }
  } else {
    localStorage.removeItem('swipecity_user');
  }
  
  authListeners.forEach(listener => listener(user));
};

// Expose setGlobalUser to window for AuthContextNative
if (typeof window !== 'undefined') {
  window.setGlobalUser = setGlobalUser;
}

const useAuthState = () => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Load user from localStorage on app start
    try {
      const savedUser = localStorage.getItem('swipecity_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setGlobalUser(parsedUser);
        setUser(parsedUser); // Set local state immediately
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
      localStorage.removeItem('swipecity_user');
    }
    
    // Set up listener for future changes
    const listener = (newUser) => {
      setUser(newUser);
    };
    authListeners.add(listener);
    
    // If globalUser was already set, use it
    if (globalUser) {
      setUser(globalUser);
    }
    
    return () => authListeners.delete(listener);
  }, []);
  
  return user;
};

// Local auth context commented out - using Firebase auth from './contexts/AuthContext'
// const AuthContext = createContext({});

/* const AuthProvider = ({ children }) => {
  const user = useAuthState();
  
  const signOut = useCallback(() => {
    setGlobalUser(null);
    localStorage.removeItem('swipecity_user');
  }, []);

  const updateUserPreferences = useCallback(async (preferences) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }
    
    try {
      // For now, store locally. In production, save to Firebase
      const updatedUser = {
        ...user,
        ...preferences
      };
      setGlobalUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }, [user]);

  const needsOnboarding = user && !user.onboardingComplete;
  

  const value = {
    user,
    signOut,
    updateUserPreferences,
    isAuthenticated: Boolean(user),
    needsOnboarding
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}; */

// useAuth is now imported from './contexts/AuthContext'

const SwipeMarketplace = () => {
  
  // Environment detection for development features - STRICT production mode
  const isDevelopment = process.env.NODE_ENV === 'development' && (
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1' ||
                       window.location.protocol === 'http:' ||
                       window.location.search.includes('dev=true')
                     );
                     

    const { 
      user, 
      userProfile,
      loading: authLoading,
      error: authError,
      isAuthenticated, 
      needsOnboarding, 
      signOut,
      deleteAccount,
      reauthenticate,
      saveItem: saveItemToProfile,
      removeSavedItem: removeSavedItemFromProfile,
      likeItem: likeItemToProfile,
      savePreferences,
      setUser,
      setUserProfile,
      saveChats,
      loadChats
    } = useAuth();
    
    console.log('🚀 useAuth hook completed, user:', !!user, 'loading:', authLoading);
  
  // Debug: Log user object from AuthContext every render
  // Initialize data manager for current user
  
  // Auth state sync fix
  useEffect(() => {
    if (user && !isAuthenticated) {
      // Force trigger auth listeners
      authListeners.forEach(listener => listener(user));
    }
  }, [user, isAuthenticated]);

  // Sync auth states from modal
  useEffect(() => {
    const interval = setInterval(() => {
      const authModalUser = window.authModalUser; // Will be set by AuthModal
      if (authModalUser && !user) {
        setGlobalUser(authModalUser);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [user]);
  
  const dataManager = user?.email ? getDataManager(user.email) : null;
  
  // Helper function to save chats to localStorage (defined early to avoid temporal dead zone)
  // Mode must be passed explicitly to avoid dependency issues
  const saveChatsToStorage = useCallback((chats, mode) => {
    if (user && mode) {
      try {
        const userKey = `swipecity_user_${user.email.replace(/[@+.]/g, '_')}`;
        const storageKey = `${userKey}_${mode}_chats`;
        localStorage.setItem(storageKey, JSON.stringify(chats));
        console.log(`💾 Saved ${mode} chats to localStorage:`, chats.length, 'chats');
      } catch (error) {
        console.error('Failed to save chats to localStorage:', error);
      }
    }
  }, [user]);

  // openChat function moved to after updateState definition to avoid temporal dead zone
  
  // State for seeded items from admin dashboard
  const [seededItems, setSeededItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [performanceStats, setPerformanceStats] = useState({
    swipeCount: 0,
    lastSwipeTime: 0,
    avgSwipeTime: 0,
    showStats: false
  });
  
  // Animations always enabled
  const [showSwipeFeedback, setShowSwipeFeedback] = useState(null);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  
  // Debug logging with platform detection
  const platform = window.Capacitor?.getPlatform?.() || 'web';
  console.log(`[${platform.toUpperCase()}] SwipeMarketplace render:`, { 
    user: user ? { id: user.id, uid: user.uid, email: user.email, onboardingComplete: user.onboardingComplete } : null, 
    isAuthenticated, 
    needsOnboarding,
    userExists: !!user,
    loading: authLoading,
    error: authError,
    platform
  });
  
  // iOS-specific debugging
  if (platform === 'ios') {
    console.log('[iOS] Loading state:', authLoading, 'Error:', authError);
    console.log('[iOS] Firebase services available:', !!window.firebaseServices);
    console.log('[iOS] User auth state:', { isAuthenticated, needsOnboarding });
  }
  
  const [appState, setAppState] = useState({
    currentMode: 'buyer',
    currentView: 'swipe', // swipe, chats, profile
    currentItemIndex: 0,
    showAuthModal: false, // Only show when user tries protected actions
    showChats: false,
    showProfile: false,
    showMyListings: false,
    showSavedItems: false,
    savedItemsSearchQuery: '',
    email: '',
    loading: false,
    selectedCategories: [],
    priceRange: '',
    shoppingStyle: '',
    onboardingStep: 1,
    // New onboarding fields
    searchKeywords: '',
    selectedShoppingCategories: [], // For category selection
    minPrice: 10,
    maxPrice: 500,
    searchRadius: 15,
    // Cities the buyer wants to shop in (canonical strings from SUPPORTED_CITIES).
    // Empty array means "all cities" — the feed shows everything so it's never empty.
    selectedCities: [],
    conditionPreference: 'any',
    wantDealAlerts: false,
    showSwipeTutorial: false,
    hasSeenTutorial: false,
    hasSeenBuyModeTutorial: false,
    dragOffset: { x: 0, y: 0 },
    isDragging: false,
    showMatchAnimation: false,
    matchedItem: null,
    dailySwipeCount: 0,
    dailyLikeCount: 0,
    dailySaveCount: 0,
    maxDailySwipes: 50,
    maxDailyLikes: 50,
    maxDailySaves: 20,
    savedItems: [],
    likedItems: [],
    showLimitModal: false,
    limitModalType: null,
    lastActionTime: 0,
    actionCooldown: 300,
    startPos: null,
    // Admin dashboard
    showAdminDashboard: false,
    // Legal documents
    showPrivacyPolicy: false,
    showTermsOfService: false,
    activeChat: null,
    newMessage: '',
    chats: [], // Will be loaded using DataManager
    showAddItem: false,
    selectedImages: [],
    newItemTitle: '',
    newItemPrice: '',
    newItemDescription: '',
    newItemCondition: '',
    newItemCity: '',
    lastPassedItem: null,
    canUndo: false,
    showEditModal: false,
    editingListing: null,
    editTitle: '',
    editPrice: '',
    editDescription: '',
    editCondition: '',
    editImages: [],
    // Bot prevention & reporting
    showCameraCapture: false,
    verificationQuestion: null,
    verificationAnswer: '',
    verificationPassed: false,
    reportedItems: new Set(),
    userReportCount: 0,
    showReportModal: false,
    reportingItem: null,
    selectedReportReason: '',
    editingBio: false,
    tempBio: '',
    savedBio: '',
    userListings: [
      // User's real listings will be added here when they create them
    ],
    buyerInterests: [
      // Real buyer interests will be added here when users express interest
    ], // { itemId, buyerId, buyerName, buyerAvatar, timestamp }
    showInterestConfirmation: false,
    interestedItem: null,
    showSettings: false,
    settingsCategories: [],
    settingsPriceRange: 0,
    settingsLocationRadius: 10,
    settingsShoppingStyle: 0,
    // User database with reviews and safety info
    users: {
      'seller1': {
        id: 'seller1',
        name: 'Mike Chen',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-08-15',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        facebookVerified: true,
        linkedinVerified: false,
        backgroundCheck: true,
        trustScore: 98,
        totalSales: 28,
        totalPurchases: 15,
        rating: 4.8,
        reviewCount: 23,
        responseTime: '2.3h',
        location: 'San Francisco, CA',
        badges: ['verified', 'top-seller', 'fast-responder', 'trust-verified'],
        reviews: [
          {
            id: 'rev_1',
            reviewerId: 'buyer_1',
            reviewerName: 'Alex Chen',
            reviewerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            rating: 5,
            comment: 'Great seller! Item exactly as described and shipped super fast. Would definitely buy from again.',
            date: '2024-01-15',
            transactionType: 'seller'
          },
          {
            id: 'rev_2', 
            reviewerId: 'buyer_3',
            reviewerName: 'David Kim',
            reviewerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
            rating: 5,
            comment: 'Excellent communication and fast shipping. Item was in perfect condition!',
            date: '2024-01-10',
            transactionType: 'seller'
          },
          {
            id: 'rev_3',
            reviewerId: 'seller2',
            reviewerName: 'Emma Johnson', 
            reviewerAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
            rating: 4,
            comment: 'Quick and smooth transaction. Very reliable buyer!',
            date: '2024-01-08',
            transactionType: 'buyer'
          }
        ]
      },
      'buyer_1': {
        id: 'buyer_1', 
        name: 'Alex Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-11-20',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        facebookVerified: true,
        linkedinVerified: true,
        backgroundCheck: false,
        trustScore: 87,
        totalSales: 5,
        totalPurchases: 12,
        rating: 4.6,
        reviewCount: 8,
        responseTime: '1.8h',
        location: 'Berkeley, CA',
        badges: ['verified', 'reliable-buyer', 'social-verified'],
        reviews: [
          {
            id: 'rev_4',
            reviewerId: 'seller1',
            reviewerName: 'Mike Chen',
            reviewerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            rating: 5,
            comment: 'Alex was great to work with! Payment was instant and pickup was smooth.',
            date: '2024-01-12',
            transactionType: 'buyer'
          },
          {
            id: 'rev_5',
            reviewerId: 'seller3',
            reviewerName: 'Lisa Park',
            reviewerAvatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face',
            rating: 4,
            comment: 'Professional and punctual. Would sell to again!',
            date: '2024-01-05',
            transactionType: 'buyer'
          }
        ]
      },
      'buyer_2': {
        id: 'buyer_2',
        name: 'Sarah Wilson', 
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-12-10',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        facebookVerified: true,
        linkedinVerified: true,
        backgroundCheck: true,
        trustScore: 95,
        totalSales: 8,
        totalPurchases: 22,
        rating: 4.9,
        reviewCount: 15,
        responseTime: '45m',
        location: 'San Jose, CA',
        badges: ['verified', 'super-buyer', 'fast-responder', 'trust-verified', 'premium'],
        reviews: [
          {
            id: 'rev_6',
            reviewerId: 'seller1',
            reviewerName: 'Mike Chen', 
            reviewerAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
            rating: 5,
            comment: 'Sarah is an amazing buyer! Always pays promptly and very easy to communicate with.',
            date: '2024-01-14',
            transactionType: 'buyer'
          },
          {
            id: 'rev_7',
            reviewerId: 'seller4',
            reviewerName: 'John Martinez',
            reviewerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
            rating: 5,
            comment: 'Perfect transaction! Sarah was very understanding and flexible with scheduling.',
            date: '2024-01-11',
            transactionType: 'buyer'
          }
        ]
      },
      'buyer_3': {
        id: 'buyer_3',
        name: 'David Kim',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-10-15',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        facebookVerified: false,
        linkedinVerified: true,
        backgroundCheck: false,
        trustScore: 78,
        totalSales: 3,
        totalPurchases: 7,
        rating: 4.2,
        reviewCount: 5,
        responseTime: '2.5h',
        location: 'Oakland, CA',
        badges: ['verified', 'new-buyer']
      },
      'buyer_4': {
        id: 'buyer_4',
        name: 'Emily Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-09-28',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        facebookVerified: true,
        linkedinVerified: false,
        backgroundCheck: true,
        trustScore: 92,
        totalSales: 6,
        totalPurchases: 18,
        rating: 4.7,
        reviewCount: 12,
        responseTime: '1.2h',
        location: 'Fremont, CA',
        badges: ['verified', 'reliable-buyer', 'trust-verified']
      },
      'buyer_5': {
        id: 'buyer_5',
        name: 'Marcus Johnson',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-11-05',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: false,
        facebookVerified: true,
        linkedinVerified: true,
        backgroundCheck: false,
        trustScore: 85,
        totalSales: 4,
        totalPurchases: 14,
        rating: 4.5,
        reviewCount: 9,
        responseTime: '1.5h',
        location: 'San Mateo, CA',
        badges: ['verified', 'social-verified']
      },
      'buyer_6': {
        id: 'buyer_6',
        name: 'Jessica Taylor',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        joinDate: '2023-12-20',
        verified: true,
        phoneVerified: true,
        emailVerified: true,
        idVerified: true,
        facebookVerified: false,
        linkedinVerified: false,
        backgroundCheck: true,
        trustScore: 90,
        totalSales: 7,
        totalPurchases: 20,
        rating: 4.8,
        reviewCount: 13,
        responseTime: '1h',
        location: 'Mountain View, CA',
        badges: ['verified', 'fast-responder', 'trust-verified']
      }
    }
  });

  const items = useMemo(() => {
    // Use seeded items if available, otherwise fall back to mockItems
    let sourceItems = seededItems.length > 0 ? seededItems : mockItems;

    // Don't show the user their OWN listings in the buy feed.
    if (user?.uid) {
      sourceItems = sourceItems.filter(item => item.seller_id !== user.uid);
    }

    // City filter: only show listings in the cities the buyer chose. An empty
    // selection means "all cities" so the feed is never accidentally empty.
    // Listings carry their city as either `city` (seller-posted) or `location`
    // (seeded data) — check both.
    const cityFilter = appState.selectedCities;
    if (cityFilter && cityFilter.length > 0) {
      sourceItems = sourceItems.filter(item =>
        cityFilter.includes(item.city || item.location)
      );
    }

    // Load learned swipe preferences
    let swipeData = {};
    if (user?.uid) {
      try {
        const swipeDataKey = `swipecity_swipe_learning_${user.uid}`;
        const existing = localStorage.getItem(swipeDataKey);
        swipeData = existing ? JSON.parse(existing) : {};
      } catch (e) {
        console.log('Error loading swipe data:', e);
      }
    }
    
    return sourceItems
      .map(item => {
        // Get the category index for this item
        const itemCategoryIndex = categories.indexOf(item.category);
        
        // Check if user has this category in their initial preferences
        const isPreferredCategory = user?.preferences?.categories?.includes(itemCategoryIndex);
        
        // Calculate learned preference score from swipe behavior
        let learnedScore = 0.5; // Neutral starting point
        const categorySwipeData = swipeData[itemCategoryIndex];
        if (categorySwipeData && categorySwipeData.total >= 5) {
          // Only use learned data after at least 5 swipes in this category
          const likeRatio = categorySwipeData.likes / categorySwipeData.total;
          learnedScore = likeRatio; // 0.0 to 1.0 based on actual swipe behavior
          console.log(`🤖 Using learned preference for ${item.category}: ${Math.round(likeRatio * 100)}% like rate`);
        }
        
        // Combine initial preferences with learned behavior
        let finalScore = item.algorithmScore || 0.8;
        
        if (isPreferredCategory) {
          // User selected this category initially - boost score
          finalScore *= 1.0;
        } else {
          // User didn't select this category initially - reduce score
          finalScore *= 0.3;
        }
        
        // Apply learned behavior (weighted more heavily as user swipes more)
        const learnedWeight = categorySwipeData ? Math.min(categorySwipeData.total / 20, 0.7) : 0;
        const initialWeight = 1 - learnedWeight;
        
        finalScore = (finalScore * initialWeight) + (learnedScore * 0.8 * learnedWeight);
        
        return {
          ...item,
          algorithmScore: finalScore
        };
      })
      .sort((a, b) => (b.algorithmScore || 0) - (a.algorithmScore || 0));
  }, [user?.preferences?.categories, user?.uid, seededItems, appState.selectedCities]);
  const currentItem = items[appState.currentItemIndex] || null;

  const updateState = useCallback((updates) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  // Hydrate saved items from the user's persisted profile on load, so a buyer's
  // saved items survive relaunch (they are now persisted via saveItemToProfile).
  // Loop-safe: once appState.savedItems is populated the condition is false.
  // NOTE: must be declared AFTER appState/updateState — referencing them in the
  // deps array before their declaration throws a temporal-dead-zone error.
  // Run ONCE (ref-guarded). The earlier version re-hydrated whenever savedItems
  // hit empty, which made removing your last saved item re-appear ("remove does
  // nothing"). Removal is now persisted via removeSavedItem, so hydrate only the
  // first time the profile reports saved items.
  const savedItemsHydrated = React.useRef(false);
  useEffect(() => {
    if (savedItemsHydrated.current) return;
    const profileSaved = userProfile?.savedItems;
    if (Array.isArray(profileSaved) && profileSaved.length > 0) {
      savedItemsHydrated.current = true;
      updateState({ savedItems: profileSaved });
    }
  }, [userProfile?.savedItems, updateState]);

  // Hydrate the seller's own listings from localStorage so they survive relaunch
  // and reappear in both "My Listings" and the buyer feed. Runs once, after auth
  // (uid known) and the feed has finished loading (so it merges on top of the
  // loaded feed rather than being overwritten by it).
  const myListingsHydrated = React.useRef(false);
  useEffect(() => {
    if (myListingsHydrated.current) return;
    if (!user?.uid || loadingItems) return;
    myListingsHydrated.current = true;
    (async () => {
      // Local copy first (fast / offline fallback).
      let mine = [];
      try {
        const raw = localStorage.getItem('swipecity_my_listings_' + user.uid);
        mine = raw ? JSON.parse(raw) : [];
      } catch { mine = []; }
      // Authoritative: the seller's own listings from Firestore, so "My Listings"
      // works cross-device / after a fresh sign-in (not just from this device's
      // localStorage). Merge, deduped by id.
      try {
        const remote = await firebaseNative.getMyItems(user.uid);
        if (Array.isArray(remote) && remote.length > 0) {
          const ids = new Set(mine.map(m => m.id));
          mine = [...mine, ...remote.filter(r => r && r.id && !ids.has(r.id))];
        }
      } catch (e) {
        console.warn('getMyItems skipped:', e?.message);
      }
      if (!Array.isArray(mine) || mine.length === 0) return;
      updateState({ userListings: mine });
      // Also persist the merged set locally for fast offline reload.
      try { localStorage.setItem('swipecity_my_listings_' + user.uid, JSON.stringify(mine)); } catch (e) {}
    })();
  }, [user?.uid, loadingItems, updateState]);

  // Reset per-account state when the signed-in account changes (switch or
  // sign-out), so a NEW account never inherits the previous user's listings,
  // saved items, chats, or interests (those are React state that otherwise
  // persists across a sign-out/sign-in). Re-arm the hydration guards so the new
  // account loads ITS own data.
  const prevUidRef = React.useRef(undefined);
  useEffect(() => {
    const uid = user?.uid || null;
    if (prevUidRef.current !== undefined && prevUidRef.current !== uid) {
      updateState({ userListings: [], savedItems: [], chats: [], buyerInterests: [] });
      savedItemsHydrated.current = false;
      myListingsHydrated.current = false;
    }
    prevUidRef.current = uid;
  }, [user?.uid, updateState]);

  // Helper function to open a chat with fresh data from Firebase/localStorage
  const openChat = useCallback(async (chat) => {
    if (!user?.email) {
      console.log('🔐 Authentication required for messaging');
      updateState({ showAuthModal: true });
      return;
    }

    try {
      const mode = appState.currentMode;
      let savedChats = [];
      
      // Try to load from Firebase first for cross-device sync
      if (user.uid && window.firebaseServices?.firestore) {
        try {
          savedChats = await window.firebaseServices.firestore.loadUserChats(user.uid, mode);
          console.log(`🔥 Loaded ${mode} chats from Firebase:`, savedChats.length);
        } catch (firebaseError) {
          console.error(`Failed to load ${mode} chats from Firebase:`, firebaseError);
          savedChats = []; // Will fallback to localStorage
        }
      }
      
      // Fallback to localStorage if Firebase failed or no data
      if (savedChats.length === 0) {
        const userKey = `swipecity_user_${user.email.replace(/[@+.]/g, '_')}`;
        const storageKey = `${userKey}_${mode}_chats`;
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
          savedChats = JSON.parse(savedData);
          console.log(`💾 Loaded ${mode} chats from localStorage:`, savedChats.length);
        }
      }
      
      if (savedChats.length > 0) {
        const freshChat = savedChats.find(savedChat => savedChat.id === chat.id);
        
        if (freshChat) {
          console.log(`🔄 Opening ${mode} chat with fresh data:`, freshChat.id, 'Messages:', freshChat.messages?.length || 0);
          updateState({ activeChat: freshChat, chats: savedChats });
        } else {
          console.log(`⚠️ Chat not found in saved ${mode} data, using original`);
          updateState({ activeChat: chat });
        }
      } else {
        console.log(`⚠️ No saved ${mode} data found, using original chat`);
        updateState({ activeChat: chat });
      }
    } catch (error) {
      console.error('Failed to load fresh chat data:', error);
      updateState({ activeChat: chat });
    }
  }, [user, updateState, appState.currentMode]);

  // Sample chat data
  const sampleChats = [
    {
      id: 'chat1',
      seller_name: 'Sarah Chen',
      item_title: 'Vintage MacBook Pro 2019',
      messages: [
        {
          id: 'msg1',
          sender_id: 'seller456',
          sender_name: 'Sarah Chen',
          text: 'Hi! Thanks for your interest in the MacBook. It\'s in excellent condition!',
          timestamp: '2:30 PM'
        },
        {
          id: 'msg2',
          sender_id: user?.id || 'user123',
          sender_name: 'You',
          text: 'Great! Is it still available? When can I see it?',
          timestamp: '2:35 PM'
        }
      ]
    },
    {
      id: 'chat2',
      seller_name: 'Mike Johnson',
      item_title: 'Gaming Setup - RTX 4080',
      messages: [
        {
          id: 'msg3',
          sender_id: 'seller789',
          sender_name: 'Mike Johnson',
          text: 'Hey! The gaming PC is ready for pickup. Includes monitor and RGB keyboard.',
          timestamp: '1:15 PM'
        }
      ]
    }
  ];

const handlePhoneAuth = useCallback(async () => {
  updateState({ loading: true });
  
  try {
    if (!window.firebase) {
      throw new Error('Authentication service not available. Please refresh the page.');
    }
    
    // Validate phone number
    let phoneNumber = appState.phone.trim();
    if (!phoneNumber) {
      throw new Error('Please enter a phone number');
    }
    
    // Remove any non-digit characters except +
    phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    console.log('Original phone:', appState.phone);
    console.log('Cleaned phone:', phoneNumber);
    
    // Format phone number (add +1 if US number without country code)
    let formattedPhone = phoneNumber;
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.length === 10) {
        formattedPhone = '+1' + formattedPhone;
      } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
        formattedPhone = '+' + formattedPhone;
      } else {
        throw new Error('Please enter a valid phone number (10 digits for US, or include country code)');
      }
    }
    
    console.log('Formatted phone:', formattedPhone);
    
    console.log('📱 Sending verification code to:', formattedPhone);
    
    // Set up reCAPTCHA
    if (!window.recaptchaVerifier) {
      console.log('Setting up reCAPTCHA...');
      
      // Ensure container exists
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error('reCAPTCHA container not found. Please refresh the page.');
      }
      
      // Clear any existing content
      container.innerHTML = '';
      
      try {
        window.recaptchaVerifier = new window.firebase.auth.RecaptchaVerifier('recaptcha-container', {
          'size': 'normal',
          'theme': 'light',
          'callback': (response) => {
            console.log('✅ reCAPTCHA solved:', response);
          },
          'expired-callback': () => {
            console.log('⚠️ reCAPTCHA expired');
            // Reset verifier on expiry
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          },
          'error-callback': (error) => {
            console.error('❌ reCAPTCHA error:', error);
            // Reset verifier on error
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          }
        });
        
        console.log('✅ reCAPTCHA verifier created');
        
        // Render the reCAPTCHA
        await window.recaptchaVerifier.render();
        console.log('✅ reCAPTCHA rendered');
        
      } catch (recaptchaError) {
        console.error('❌ Failed to create reCAPTCHA:', recaptchaError);
        throw new Error('Failed to initialize security verification. Please refresh the page.');
      }
    }
    
    console.log('🚀 Attempting to send SMS...');
    const confirmationResult = await window.firebase.auth().signInWithPhoneNumber(formattedPhone, window.recaptchaVerifier);
    
    console.log('✅ SMS sent successfully:', confirmationResult);
    
    updateState({
      verificationId: confirmationResult.verificationId,
      showVerificationStep: true,
      loading: false,
      phone: formattedPhone // Update with formatted version
    });
    
    console.log('✅ Verification code sent to', formattedPhone);
    
  } catch (error) {
    console.error('❌ Phone Auth Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    let errorMessage = 'Failed to send verification code. Please try again.';
    
    switch (error.code) {
      case 'auth/invalid-phone-number':
        errorMessage = 'Invalid phone number. Please enter a valid number with country code (e.g., +1234567890 for US)';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
        break;
      case 'auth/quota-exceeded':
        errorMessage = 'SMS quota exceeded. Please try again later.';
        break;
      case 'auth/captcha-check-failed':
        errorMessage = 'Security verification failed. Please refresh the page and try again.';
        break;
      case 'auth/missing-phone-number':
        errorMessage = 'Please enter a phone number.';
        break;
      default:
        if (error.message.includes('reCAPTCHA')) {
          errorMessage = 'Security verification failed. Please refresh the page and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        break;
    }
    
    alert(errorMessage);
    updateState({ loading: false });
    
    // Reset reCAPTCHA on error
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (clearError) {
        console.error('Error clearing reCAPTCHA:', clearError);
      }
      window.recaptchaVerifier = null;
    }
  }
}, [appState.phone, updateState]);

const handleVerifyCode = useCallback(async () => {
  updateState({ loading: true });
  
  try {
    if (!appState.verificationId || !appState.verificationCode) {
      throw new Error('Verification code is required');
    }
    
    const credential = window.firebase.auth.PhoneAuthProvider.credential(
      appState.verificationId,
      appState.verificationCode.trim()
    );
    
    const result = await window.firebase.auth().signInWithCredential(credential);
    const firebaseUser = result.user;
    
    console.log('✅ Phone verification successful:', firebaseUser);
    
    const userData = {
      id: firebaseUser.uid,
      phone: firebaseUser.phoneNumber,
      email: firebaseUser.email || '', // Phone auth doesn't provide email
      username: `User${firebaseUser.uid.slice(-6)}`, // Generate username from UID
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      bio: '',
      onboardingComplete: false,
      verified: true, // Phone is verified
      created_at: Date.now()
    };
    
    setGlobalUser(userData);
    updateState({ 
      loading: false, 
      // Removed showAuthModal reference
      showVerificationStep: false,
      verificationCode: '',
      verificationId: null
    });
    
  } catch (error) {
    console.error('❌ Verification Error:', error);
    
    let errorMessage = 'Invalid verification code. Please try again.';
    if (error.code === 'auth/invalid-verification-code') {
      errorMessage = 'The verification code is incorrect. Please check and try again.';
    } else if (error.code === 'auth/code-expired') {
      errorMessage = 'The verification code has expired. Please request a new one.';
    }
    
    alert(errorMessage);
    updateState({ loading: false });
  }
}, [appState.verificationId, appState.verificationCode, setGlobalUser, updateState]);

const handleGoogleAuth = useCallback(async () => {
  updateState({ loading: true });
  
  try {
    if (!window.firebase) {
      throw new Error('Authentication service not available. Please refresh the page.');
    }
    
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    
    // Enhanced mobile detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0) ||
                     window.DeviceMotionEvent !== undefined;

    // iPhone-specific checks
    const isIPhone = /iPhone/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    const isInApp = window !== window.top;

    if (isMobile) {
      console.log('📱 Mobile detected, using redirect authentication...');
      console.log('Device details:', { isIPhone, isStandalone, isInApp, userAgent: navigator.userAgent });
      
      // Special handling for iPhone Safari issues
      if (isIPhone) {
        // Ensure we're not in a nested iframe or app webview
        if (isInApp && !isStandalone) {
          alert('Please open this page in Safari browser for Google sign-in to work properly.');
          updateState({ loading: false });
          return;
        }
        
        // Set custom parameters for iPhone
        provider.setCustomParameters({
          'prompt': 'select_account',
          'hd': '', // Remove domain restriction that might cause issues
        });
      }
      
      // Enhanced mobile redirect with persistence
      localStorage.setItem('authRedirectInitiated', Date.now().toString());
      localStorage.setItem('authRedirectUrl', window.location.href);
      localStorage.setItem('authProvider', 'google');
      
      try {
        // Force a small delay to ensure localStorage is written
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('🚀 Initiating redirect to Google...');
        await window.firebase.auth().signInWithRedirect(provider);
      } catch (redirectError) {
        console.error('❌ Redirect failed:', redirectError);
        alert(`Sign-in redirect failed: ${redirectError.message}`);
        updateState({ loading: false });
        localStorage.removeItem('authRedirectInitiated');
        localStorage.removeItem('authProvider');
      }
      return; // Don't set loading to false here, redirect will handle it
    } else {
      // Desktop: try popup
      try {
        console.log('💻 Desktop detected, attempting popup authentication...');
        const result = await window.firebase.auth().signInWithPopup(provider);
        
        const firebaseUser = result.user;
        
        if (!firebaseUser.email || !SecurityUtils.validateEmail(firebaseUser.email)) {
          throw new Error('Invalid email address received from Google');
        }
        
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          username: SecurityUtils.sanitizeInput(firebaseUser.displayName || firebaseUser.email.split('@')[0]),
          avatar_url: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          bio: '',
          onboardingComplete: false,
          verified: firebaseUser.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false });
        
      } catch (popupError) {
        console.log('Popup failed, trying redirect...', popupError);
        localStorage.setItem('authRedirectInitiated', Date.now().toString());
        await window.firebase.auth().signInWithRedirect(provider);
        return;
      }
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
        bio: '',
        onboardingComplete: false,
        verified: false,
        created_at: Date.now()
      };
      setGlobalUser(userData);
      updateState({ loading: false });
    }, 1000);
  }, [appState.email, updateState]);

const addListingPhotos = useCallback(async (fileList, source = 'camera') => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const currentImages = appState.selectedImages || [];
    if (currentImages.length + files.length > 4) {
      alert('Maximum 4 photos allowed');
      return;
    }

    // Quick anti-bot verification, kept for both camera and library photos
    const questions = [
      "What's the main color of your item?",
      "How many items are shown in this photo?",
      "Is this item indoors or outdoors?",
      "Is there text visible on your item?",
      "What category best describes this item?"
    ];

    const newImages = [];
    for (const file of files) {
      const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
      const answer = prompt(`🤖 Quick verification: ${randomQuestion}\n\n(This helps prevent bots from posting fake items)`);
      if (!answer || answer.trim().length < 2) {
        alert('Please provide an answer to continue posting.');
        return;
      }
      const rawDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Downscale library photos (camera photos already arrive downscaled) so
      // listings/saved items stay small enough to persist.
      const dataUrl = await downscaleDataUrl(rawDataUrl, 1200, 0.7);
      newImages.push({
        file,
        url: dataUrl,
        name: file.name,
        timestamp: Date.now(),
        verified: true,
        source,
        verificationQuestion: randomQuestion,
        verificationAnswer: answer.trim()
      });
    }

    if (newImages.length > 0) {
      updateState({ selectedImages: [...currentImages, ...newImages] });
    }
  }, [appState.selectedImages, updateState]);

  // Take a photo with the native camera via the Capacitor Camera plugin.
  // We do NOT use an <input type="file" capture> here: on iOS the live camera
  // puts the WKWebView under memory pressure and the view is reloaded when the
  // camera closes, wiping the in-progress listing (and previously trapping the
  // user in onboarding). The plugin opens the camera natively without evicting
  // the web view, so the photo returns cleanly into the form.
  // `target` is 'add' (new listing) or 'edit' (edit-listing modal).
  const captureListingPhotoWithCamera = useCallback(async (target = 'add') => {
    const stateKey = target === 'edit' ? 'editImages' : 'selectedImages';
    const currentImages = appState[stateKey] || [];
    if (currentImages.length >= 4) {
      alert('Maximum 4 photos allowed');
      return;
    }

    let dataUrl;
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 70,
        // Downscale listing photos too — kept larger than avatars since they
        // fill a card, but bounded so the data URL doesn't bloat memory.
        width: 1200,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false
      });
      dataUrl = photo?.dataUrl;
    } catch (err) {
      // getPhoto rejects when the user cancels or denies permission — both are
      // benign here; just abort without attaching a photo.
      const msg = err?.message || '';
      if (msg && !/cancel/i.test(msg)) {
        console.error('Camera capture failed:', err);
      }
      return;
    }
    if (!dataUrl) return;

    // Same anti-bot verification as the library path.
    const questions = [
      "What's the main color of your item?",
      "How many items are shown in this photo?",
      "Is this item indoors or outdoors?",
      "Is there text visible on your item?",
      "What category best describes this item?"
    ];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    const answer = prompt(`🤖 Quick verification: ${randomQuestion}\n\n(This helps prevent bots from posting fake items)`);
    if (!answer || answer.trim().length < 2) {
      alert('Please provide an answer to continue posting.');
      return;
    }

    const newImage = {
      file: null,
      url: dataUrl,
      name: `camera_${Date.now()}.jpg`,
      timestamp: Date.now(),
      verified: true,
      source: 'camera',
      verificationQuestion: randomQuestion,
      verificationAnswer: answer.trim()
    };
    updateState({ [stateKey]: [...currentImages, newImage] });
  }, [appState.selectedImages, appState.editImages, updateState]);

  // Set the profile photo via the native Camera plugin. Same reasoning as the
  // listing camera: the old <input type="file" capture="user"> reloaded the
  // WKWebView on iOS when the camera closed, which bounced the user into the
  // onboarding survey. CameraSource.Prompt lets the user pick Camera or Photo
  // Library natively without evicting the web view.
  const chooseProfilePhoto = useCallback(async () => {
    if (!user) return;

    let dataUrl;
    try {
      const photo = await CapacitorCamera.getPhoto({
        quality: 60,
        // Downscale: a profile avatar renders at 120px, so a big image just
        // bloats memory and (as a data URL) overflows the ~5MB localStorage
        // quota. 600px keeps it sharp while staying small.
        width: 600,
        height: 600,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        direction: CameraDirection.Front,
        saveToGallery: false
      });
      dataUrl = photo?.dataUrl;
    } catch (err) {
      const msg = err?.message || '';
      if (msg && !/cancel/i.test(msg)) {
        console.error('Profile photo capture failed:', err);
      }
      return;
    }
    if (!dataUrl) return;

    // Upload to Firebase Storage and keep only the (tiny) URL. Storing the
    // base64 photo in the user object overflowed localStorage and crashed the
    // app on relaunch. Falls back to the data URL if the upload fails.
    let finalUrl = dataUrl;
    try {
      const res = await firebaseNative.uploadDataUrl(`profile-photos/${user.uid}/${Date.now()}.jpg`, dataUrl);
      if (res && res.success && res.url) finalUrl = res.url;
    } catch (e) {
      console.warn('Profile photo upload failed; keeping local image:', e?.message);
    }

    const currentUser = safeParseLocal('swipecity_demo_user');
    const updatedUser = {
      ...currentUser,
      ...user,
      photoURL: finalUrl,
      avatar_url: finalUrl,
      onboardingComplete: true,
      photoUpdatedAt: Date.now()
    };

    // Update the UI FIRST so the avatar shows immediately — this must not be
    // blocked by a localStorage write (which can throw QuotaExceededError on a
    // large photo and would otherwise abort before the photo ever displayed).
    setUser(() => ({ ...updatedUser }));
    setUserProfile(() => ({ ...updatedUser }));
    setGlobalUser(() => ({ ...updatedUser }));
    updateState({
      uploadingPhoto: false,
      photoUploadMessage: 'Photo saved!',
      lastPhotoUpdate: Date.now(),
      forcePhotoRefresh: Math.random()
    });
    setTimeout(() => updateState({ photoUploadMessage: null }), 2000);

    // Then persist locally, best-effort. Only the two keys the app actually
    // restores from (native_user for session restore, user for useAuthState) —
    // writing the photo data URL into more keys than that just multiplies
    // storage pressure and risks blowing the ~5MB quota. Quota errors here
    // don't affect display (state was already set above).
    const serialized = JSON.stringify(updatedUser);
    try { localStorage.setItem('swipecity_native_user', serialized); } catch (e) { /* over quota; in-session only */ }
    try { localStorage.setItem('swipecity_user', serialized); } catch (e) { /* over quota; in-session only */ }
    // Sync the (tiny) photo URL to the Firestore profile so it survives reinstall
    // and shows on other devices. Best-effort; only safe now that it's a URL.
    if (finalUrl && finalUrl.startsWith('http')) {
      try { firebaseNative.updateUserProfile(user.uid, { photoURL: finalUrl, avatar_url: finalUrl }); } catch (e) { /* best-effort */ }
    }
  }, [user, updateState, setUser, setUserProfile]);

const handleSaveForLater = useCallback(() => {
    console.log('💾 Save for Later clicked');
    console.log('💾 currentItem:', currentItem?.title);
    
    const now = Date.now();
    
    // SECURITY: Enhanced rate limiting
    if (!SecurityUtils.checkRateLimit(appState.lastActionTime, appState.actionCooldown)) {
      console.log('🚫 Rate limit exceeded for save action');
      return;
    }
    
    if (!currentItem) {
      console.log('🚫 No current item');
      return;
    }
    
    // Check if item is already saved
    const isAlreadySaved = appState.savedItems.some(item => item.id === currentItem.id);
    if (isAlreadySaved) {
      console.log('⚠️ Item already saved');
      alert('This item is already in your saved items!');
      return;
    }
    
    // SECURITY: Validate daily save limit
    if (appState.dailySaveCount >= appState.maxDailySaves) {
      console.log('🚫 Daily save limit reached');
      updateState({ showLimitModal: true, limitModalType: 'saves' });
      return;
    }
    
    // Add to saved items
    const newSavedItems = [...appState.savedItems, { ...currentItem, savedAt: Date.now() }];
    const nextIndex = appState.currentItemIndex < items.length - 1 ? appState.currentItemIndex + 1 : 0;
    
    updateState({
      savedItems: newSavedItems,
      dailySaveCount: appState.dailySaveCount + 1,
      currentItemIndex: nextIndex,
      lastActionTime: now,
      canUndo: false
    });

    // Persist to the user's Firebase profile (and localStorage) so saved items
    // survive relaunch and sync — previously this was React-state-only and lost
    // on every restart. saveItemToProfile is the AuthContext.saveItem helper.
    if (user && saveItemToProfile) {
      saveItemToProfile({ ...currentItem, savedAt: now });
    }

    console.log(`✅ Saved ${currentItem.title} for later (${appState.dailySaveCount + 1}/${appState.maxDailySaves} today)`);
}, [currentItem, appState.savedItems, appState.dailySaveCount, appState.maxDailySaves, appState.lastActionTime, appState.actionCooldown, appState.currentItemIndex, items.length, updateState, user, saveItemToProfile]);

const showSwipeTutorial = useCallback(() => {
  updateState({ showSwipeTutorial: true });
}, [updateState]);

const hideSwipeTutorial = useCallback(() => {
  updateState({ showSwipeTutorial: false, hasSeenTutorial: true, hasSeenBuyModeTutorial: true });
  localStorage.setItem('swipecity_tutorial_completed', 'true');
  localStorage.setItem('swipecity_buy_tutorial_completed', 'true');
}, [updateState]);

const resetTutorial = useCallback(() => {
  localStorage.removeItem('swipecity_tutorial_completed');
  localStorage.removeItem('swipecity_buy_tutorial_completed');
  updateState({ hasSeenTutorial: false, showSwipeTutorial: false, hasSeenBuyModeTutorial: false });
  console.log('Tutorial reset - will show on next app load');
}, [updateState]);

const handleExpressInterest = useCallback((item) => {
  console.log('🎯 Expressing interest in:', item.title);

  // Create a new interest entry
  const newInterest = {
    id: `interest_${Date.now()}`,
    itemId: item.id,
    buyerId: user?.uid || user?.id || 'user123',
    buyerName: user?.displayName || user?.username || 'You',
    buyerAvatar: user?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    sellerId: item.seller_id,
    sellerName: item.seller_name,
    itemTitle: item.title,
    itemImage: item.image_url,
    timestamp: Date.now(),
    status: 'pending'
  };

  // Add interest to buyerInterests array (drives same-session UI)
  updateState({
    buyerInterests: [...appState.buyerInterests, newInterest],
    showInterestConfirmation: true,
    interestedItem: item
  });

  // Persist the interest so it is recorded beyond this session. Writes to
  // Firebase when available on this platform, else localStorage. NOTE: a seller
  // signed into a *different* account/device still won't receive this until the
  // Firestore read layer (an incoming-interests inbox) is built — see the
  // pre-submission audit; the data is captured now so that work can light up.
  try {
    DataService.createInterest(newInterest);
  } catch (err) {
    console.warn('createInterest failed:', err?.message);
  }

  console.log(`✅ Interest submitted for ${item.title} - awaiting seller approval`);
}, [user, appState.buyerInterests, updateState]);

const closeInterestConfirmation = useCallback(() => {
  updateState({ showInterestConfirmation: false, interestedItem: null });
}, [updateState]);

const handleSwipe = useCallback((direction) => {
    console.log('➡️ Swiping:', direction);
    console.log('🔍 DEBUG: Current item index:', appState.currentItemIndex);
    console.log('🔍 DEBUG: Items length:', items.length);
    console.log('🔍 DEBUG: User UID:', user?.uid);
    
    // Check authentication for right swipe (like)
    if (direction === 'right' && !isAuthenticated) {
      console.log('🔐 Authentication required for liking items');
      updateState({ showAuthModal: true });
      return;
    }
    
    // Daily limit applies to interests (right swipes / likes) only — passing
    // (left swipe) is free browsing and never counts toward the daily limit.
    if (direction === 'right' && appState.dailySwipeCount >= appState.maxDailySwipes) {
      console.log('🚫 Daily interest limit reached');
      updateState({ showLimitModal: true, limitModalType: 'swipes' });
      return;
    }
    
    // LEARNING: Track swipe preferences for algorithm improvement
    const currentItem = items[appState.currentItemIndex];
    if (currentItem && user?.uid) {
      const categoryIndex = categories.indexOf(currentItem.category);
      
      // Get existing swipe data from localStorage
      const swipeDataKey = `swipecity_swipe_learning_${user.uid}`;
      let swipeData = {};
      try {
        const existing = localStorage.getItem(swipeDataKey);
        swipeData = existing ? JSON.parse(existing) : {};
      } catch (e) {
        console.log('Error parsing swipe data:', e);
        swipeData = {};
      }
      
      // Initialize category data if not exists
      if (!swipeData[categoryIndex]) {
        swipeData[categoryIndex] = { likes: 0, passes: 0, total: 0 };
      }
      
      // Update swipe counts
      swipeData[categoryIndex].total += 1;
      if (direction === 'right') {
        swipeData[categoryIndex].likes += 1;
        console.log(`🤖 Learning: User likes ${currentItem.category} (${swipeData[categoryIndex].likes}/${swipeData[categoryIndex].total})`);
      } else {
        swipeData[categoryIndex].passes += 1;
        console.log(`🤖 Learning: User passed on ${currentItem.category} (${swipeData[categoryIndex].passes}/${swipeData[categoryIndex].total})`);
      }
      
      // Save updated swipe data
      try {
        localStorage.setItem(swipeDataKey, JSON.stringify(swipeData));
      } catch (e) {
        console.error('Error saving swipe data:', e);
      }
    }
    
    // Show animation feedback
    setShowSwipeFeedback(direction === 'right' ? 'like' : 'pass');
    setTimeout(() => setShowSwipeFeedback(null), 800);
    
    // NO MATCH ANIMATION - This is a marketplace, not a dating app!
    // Buyers express interest, sellers approve later
    
    const nextIndex = appState.currentItemIndex < items.length - 1 ? appState.currentItemIndex + 1 : 0;
    
    // Only interests (right swipes / likes) count toward the daily limit.
    // Passing is unlimited, so signed-out browsing never burns the daily count.
    updateState({
      currentItemIndex: nextIndex,
      lastPassedItem: direction === 'left' ? currentItem : null,
      canUndo: direction === 'left',
      dailySwipeCount: direction === 'right' ? appState.dailySwipeCount + 1 : appState.dailySwipeCount
    });
    
    console.log(`✅ Swipe ${direction} recorded (${appState.dailySwipeCount + 1}/${appState.maxDailySwipes} today)`);
}, [appState.currentItemIndex, appState.dailySwipeCount, appState.maxDailySwipes, items, currentItem, updateState, user]);  const handleUndo = useCallback(() => {
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
    title: SecurityUtils.sanitizeInputFinal(appState.editTitle),
    price: parseFloat(appState.editPrice),
    description: SecurityUtils.sanitizeInputFinal(appState.editDescription),
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

// Handle seller approving buyer interest
const handleApproveInterest = useCallback((interest) => {
  // Update interest status to approved
  const updatedInterests = appState.buyerInterests.map(item => 
    item.id === interest.id ? { ...item, status: 'approved' } : item
  );
  
  // Create a new chat between seller and buyer (without automatic message)
  const newChat = {
    id: `chat_${interest.id}`,
    buyer_name: interest.buyerName,
    seller_name: interest.sellerName,
    item_title: interest.itemTitle,
    item_image: interest.itemImage,
    buyer_id: interest.buyerId,
    seller_id: interest.sellerId,
    item_id: interest.itemId,
    last_message: 'Chat started',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unread: false,
    messages: []
  };
  
  const updatedChats = [newChat, ...appState.chats.filter(chat => chat.id !== newChat.id)];
  
  updateState({ 
    buyerInterests: updatedInterests,
    chats: updatedChats,
    activeChat: newChat,
    showChats: true,
    currentView: 'home' // Switch to home view which shows chats
  });
  
  // Save chats to localStorage
  saveChatsToStorage(updatedChats, appState.currentMode);
  
  console.log(`✅ Approved interest from ${interest.buyerName} for ${interest.itemTitle} - opening chat`);
}, [appState.buyerInterests, appState.chats, appState.currentMode, updateState, saveChatsToStorage]);

// Handle seller rejecting buyer interest
const handleRejectInterest = useCallback((interest) => {
  if (window.confirm(`Decline ${interest.buyerName}'s interest in ${interest.itemTitle}?`)) {
    // Update interest status to rejected
    const updatedInterests = appState.buyerInterests.map(item => 
      item.id === interest.id ? { ...item, status: 'rejected' } : item
    );
    
    updateState({ buyerInterests: updatedInterests });
    console.log(`❌ Rejected interest from ${interest.buyerName} for ${interest.itemTitle}`);
  }
}, [appState.buyerInterests, updateState]);

const openSettings = useCallback(() => {
  // Use a timeout to ensure the latest user state is available
  setTimeout(() => {
    const currentUser = globalUser || user;
    console.log('Loading settings for user:', currentUser);
    
    updateState({
      showSettings: true,
      showProfile: false, // Close profile panel when opening settings
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

  const completeOnboarding = useCallback(async () => {
    if (user) {
      const preferences = {
        categories: appState.selectedCategories,
        priceRange: appState.priceRange,
        shoppingStyle: appState.shoppingStyle,
        onboardingComplete: true
      };
      
      try {
        // Save to Firebase
        await savePreferences(preferences);
        
        // Update local state
        const updatedUser = {
          ...user,
          onboardingComplete: true,
          preferences
        };
        setGlobalUser(updatedUser);
        console.log('✅ Onboarding completed and saved!', updatedUser);
      } catch (error) {
        console.error('Failed to save onboarding:', error);
        // Still update local state as fallback
        const updatedUser = {
          ...user,
          onboardingComplete: true,
          preferences
        };
        setGlobalUser(updatedUser);
      }
    }
  }, [user, appState.selectedCategories, appState.priceRange, appState.shoppingStyle, savePreferences]);

  // Removed auth modal state management - using Firebase AuthModal directly

  // Check if user has seen tutorial and show it on first launch
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('swipecity_tutorial_completed');
    const hasSeenBuyModeTutorial = localStorage.getItem('swipecity_buy_tutorial_completed');
    
    // Only show tutorial if user is authenticated and hasn't seen it before
    if (isAuthenticated && !hasSeenTutorial && !appState.hasSeenTutorial && !appState.showSwipeTutorial) {
      console.log('First time user - showing tutorial');
      updateState({ showSwipeTutorial: true });
    } else if (hasSeenTutorial && !appState.hasSeenTutorial) {
      // Mark as seen if it's stored in localStorage
      updateState({ 
        hasSeenTutorial: true,
        hasSeenBuyModeTutorial: hasSeenBuyModeTutorial ? true : false
      });
    }
  }, [isAuthenticated, appState.hasSeenTutorial, appState.showSwipeTutorial, updateState]);

  // If the user signs out while on an account-only screen (Profile or Chats),
  // close it and return to the browse feed — otherwise they're left on a
  // signed-out profile (with "Delete Account") or someone's chat threads.
  useEffect(() => {
    if (!isAuthenticated && (appState.showProfile || appState.showChats || appState.activeChat)) {
      updateState({ showProfile: false, showChats: false, activeChat: null, currentView: 'swipe' });
    }
  }, [isAuthenticated, appState.showProfile, appState.showChats, appState.activeChat, updateState]);

  // When the buyer changes which cities they shop in, restart the feed from the
  // top so they don't land mid-list on an empty "you've seen everything" state.
  useEffect(() => {
    updateState({ currentItemIndex: 0 });
  }, [appState.selectedCities, updateState]);

  // Apply the buyer's saved city selection to the feed whenever the user loads,
  // so their choice is honored on launch (not only after opening Settings).
  useEffect(() => {
    if (user?.preferences?.cities) {
      updateState({ selectedCities: user.preferences.cities });
    }
  }, [user?.preferences?.cities, updateState]);

  // Load user preferences when user changes or settings modal opens
  useEffect(() => {
    if (user && user.preferences && appState.showSettings) {
      updateState({
        searchKeywords: user.preferences.searchKeywords || appState.searchKeywords,
        minPrice: user.preferences.minPrice || appState.minPrice,
        maxPrice: user.preferences.maxPrice || appState.maxPrice,
        selectedCities: user.preferences.cities || appState.selectedCities,
        conditionPreference: user.preferences.conditionPreference || appState.conditionPreference,
        wantDealAlerts: user.preferences.wantDealAlerts !== undefined ? user.preferences.wantDealAlerts : appState.wantDealAlerts
      });
    }
  }, [user, appState.showSettings]);

// Enhanced redirect handling for mobile
useEffect(() => {
  const handleRedirectResult = async () => {
    if (!window.firebase || typeof window.firebase.auth !== 'function') {
      console.log('Firebase auth not available for redirect result');
      return;
    }
    
    try {
      console.log('🔄 Checking for redirect result...');
      
      // Add delay for mobile browsers to fully load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const redirectResult = await window.firebase.auth().getRedirectResult();
      
      if (redirectResult && redirectResult.user) {
        console.log('✅ Mobile redirect auth success:', redirectResult.user);
        
        const firebaseUser = redirectResult.user;
        
        if (!firebaseUser.email || !SecurityUtils.validateEmail(firebaseUser.email)) {
          throw new Error('Invalid email address received from Google');
        }
        
        const userData = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          username: SecurityUtils.sanitizeInput(firebaseUser.displayName || firebaseUser.email.split('@')[0]),
          avatar_url: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          bio: '',
          onboardingComplete: false,
          verified: firebaseUser.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false });
        
        // Clear any stored redirect flags
        localStorage.removeItem('authRedirectInitiated');
        localStorage.removeItem('authRedirectUrl');
        
        console.log('✅ Mobile auth completed successfully');
        console.log('User data set:', userData);
        console.log('Should trigger onboarding for user:', userData.onboardingComplete === false);
        
      } else {
        // Check if we're returning from a redirect attempt
        const redirectInitiated = localStorage.getItem('authRedirectInitiated');
        const redirectUrl = localStorage.getItem('authRedirectUrl');
        const authProvider = localStorage.getItem('authProvider');
        
        if (redirectInitiated) {
          const timeSinceInitiated = Date.now() - parseInt(redirectInitiated);
          console.log('🔄 Redirect was initiated but no result found', { 
            timeSinceInitiated, 
            redirectUrl, 
            authProvider,
            currentUrl: window.location.href 
          });
          
          // On mobile, give more time for redirect to process
          const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const timeoutThreshold = isMobileDevice ? 15000 : 5000; // 15 seconds for mobile, 5 for desktop
          
          if (timeSinceInitiated > timeoutThreshold) {
            console.log('❌ Redirect timeout - clearing flags');
            localStorage.removeItem('authRedirectInitiated');
            localStorage.removeItem('authRedirectUrl');
            localStorage.removeItem('authProvider');
            updateState({ loading: false });
            
            // Show user-friendly message for mobile users
            if (isMobileDevice) {
              alert('Sign-in was interrupted. Please try again and make sure to complete the Google sign-in process in the browser tab that opens.');
            }
          } else {
            // Still within timeout window, keep checking
            console.log(`⏳ Still waiting for redirect result... (${Math.round(timeSinceInitiated/1000)}s elapsed)`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Mobile redirect auth error:', error);
      localStorage.removeItem('authRedirectInitiated');
      updateState({ loading: false });
    }
  };
  
  // Run immediately and also on page focus (for mobile)
  handleRedirectResult();
  
  // Add multiple event listeners for mobile redirect handling
  const handleVisibilityChange = () => {
    if (!document.hidden && localStorage.getItem('authRedirectInitiated')) {
      console.log('📱 Page became visible, checking redirect result again...');
      setTimeout(handleRedirectResult, 500);
    }
  };
  
  const handlePageShow = () => {
    if (localStorage.getItem('authRedirectInitiated')) {
      console.log('📱 Page show event, checking redirect result...');
      setTimeout(handleRedirectResult, 500);
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);
  window.addEventListener('load', handlePageShow);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handlePageShow);
    window.removeEventListener('load', handlePageShow);
  };
}, [updateState]);

// Additional mobile redirect handling
useEffect(() => {
  // Check for auth state changes (more reliable on mobile).
  // Guard on window.firebase.auth being a FUNCTION, not just window.firebase:
  // the compat SDK loads in two scripts (app-compat then auth-compat), and on
  // relaunch there's a window where window.firebase exists but .auth doesn't yet.
  // Calling window.firebase.auth() then threw "is not a function" -> ErrorBoundary
  // crash on launch. Native iOS uses firebaseNative (REST) anyway, so skipping
  // this when the compat auth SDK isn't ready is harmless.
  if (window.firebase && typeof window.firebase.auth === 'function') {
    try {
    const unsubscribe = window.firebase.auth().onAuthStateChanged((user) => {
      if (user && !globalUser) {
        console.log('✅ Auth state change detected:', user);
        
        const userData = {
          id: user.uid,
          email: user.email,
          username: SecurityUtils.sanitizeInput(user.displayName || user.email?.split('@')[0] || 'user'),
          avatar_url: user.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          onboardingComplete: false,
          verified: user.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false });
        localStorage.removeItem('authRedirectInitiated');
      }
    });
    
    return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase auth listener setup skipped:', e?.message);
    }
  }
}, [updateState]);

  // Load chats from localStorage when user changes or mode changes
  useEffect(() => {
    console.log('🔄 Chat loading useEffect triggered. User:', user?.email, 'Mode:', appState.currentMode);
    if (user && user.email) {
      try {
        const mode = appState.currentMode;
        const userKey = `swipecity_user_${user.email.replace(/[@+.]/g, '_')}`;
        const storageKey = `${userKey}_${mode}_chats`;
        console.log('🗝️ Looking for chats with key:', storageKey);
        const savedChats = localStorage.getItem(storageKey);
        
        if (savedChats) {
          const parsedChats = JSON.parse(savedChats);
          console.log(`✅ Loaded ${mode} chats from localStorage:`, parsedChats.length, 'chats');
          console.log('📚 Chat details:', parsedChats.map(c => ({ id: c.id, messageCount: c.messages?.length || 0, lastMessage: c.last_message })));
          updateState({ chats: parsedChats });
        } else {
          // No saved chats for this mode, use mockChats for new user
          console.log(`🔍 No saved ${mode} chats found, using mock chats`);
          console.log('📚 Mock chat details:', mockChats.map(c => ({ id: c.id, messageCount: c.messages?.length || 0, lastMessage: c.last_message })));
          updateState({ chats: mockChats });
        }
      } catch (error) {
        console.error('Failed to load chats from localStorage:', error);
        // Fallback to mockChats
        updateState({ chats: mockChats });
      }
    } else {
      // Clear chats when no user
      console.log('🚫 No user, clearing chats');
      updateState({ chats: [] });
    }
  }, [user, appState.currentMode, updateState]);

  // Moved to earlier in the component to avoid temporal dead zone error

  // Direct localStorage message persistence
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !appState.activeChat || !user?.email) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender_id: user?.uid || user?.id || 'user123',
      sender_name: user?.displayName || user?.username || 'You',
      text: messageText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedActiveChat = {
      ...appState.activeChat,
      messages: [...(appState.activeChat.messages || []), newMsg],
      last_message: newMsg.text,
      timestamp: newMsg.timestamp
    };

    const updatedChats = appState.chats.map(chat => 
      chat.id === appState.activeChat.id 
        ? { ...chat, last_message: newMsg.text, timestamp: newMsg.timestamp, messages: updatedActiveChat.messages }
        : chat
    );

    // Update state first
    updateState({
      newMessage: '',
      activeChat: updatedActiveChat,
      chats: updatedChats
    });

    // Save chats to both Firebase and localStorage for cross-device sync
    try {
      const mode = appState.currentMode;
      
      // Save to Firebase Firestore for cross-device sync (if available)
      if (user.uid && window.firebaseServices?.firestore) {
        try {
          await window.firebaseServices.firestore.saveUserChats(user.uid, mode, updatedChats);
          console.log(`✅ ${mode} chats saved to Firebase for cross-device sync`);
        } catch (firebaseError) {
          console.error(`Failed to save ${mode} chats to Firebase:`, firebaseError);
          // Continue with localStorage fallback
        }
      }
      
      // Always save to localStorage as backup/immediate access
      const userKey = `swipecity_user_${user.email.replace(/[@+.]/g, '_')}`;
      const storageKey = `${userKey}_${mode}_chats`;
      localStorage.setItem(storageKey, JSON.stringify(updatedChats));
      console.log(`💾 ${mode} chats saved to localStorage:`, updatedChats.length);
      
    } catch (error) {
      console.error('Failed to save chats:', error);
    }
  }, [appState.activeChat, appState.chats, appState.currentMode, user, updateState]);

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

  // Admin dashboard trigger (triple-tap logo or Ctrl+Shift+A) - Development only
  useEffect(() => {
    if (!isDevelopment) return;
    
    let tapCount = 0;
    let tapTimer = null;
    
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        updateState({ showAdminDashboard: !appState.showAdminDashboard });
      }
    };
    
    const handleTripleTap = () => {
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 1000);
      } else if (tapCount === 3) {
        clearTimeout(tapTimer);
        tapCount = 0;
        updateState({ showAdminDashboard: !appState.showAdminDashboard });
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    // Add triple-tap listener to any logo element
    const logoElement = document.querySelector('[data-logo]');
    if (logoElement) {
      logoElement.addEventListener('click', handleTripleTap);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      if (logoElement) {
        logoElement.removeEventListener('click', handleTripleTap);
      }
      if (tapTimer) clearTimeout(tapTimer);
    };
  }, [isDevelopment, appState.showAdminDashboard, updateState]);

  // Load seeded items from DataService with performance monitoring
  useEffect(() => {
    const loadSeededItems = async () => {
      try {
        setLoadingItems(true);
        const startTime = performance.now();
        
        // Get items from DataService (will return mock items if no seeded data exists)
        const items = await DataService.getItems({ limit: 300 });

        // Cross-device: also pull active listings posted by ANY user from
        // Firestore (REST, works on iOS) so a seller's listing shows up in other
        // users' feeds. Merge with the local/mock items, deduped by id; newest
        // first. Best-effort — falls back silently if the backend/rules aren't
        // reachable (so single-device still works).
        let merged = items || [];
        try {
          const remote = await firebaseNative.getActiveItems(300);
          if (Array.isArray(remote) && remote.length > 0) {
            const seen = new Set(merged.map(i => i.id));
            const fresh = remote.filter(r => r && r.id && !seen.has(r.id));
            merged = [...fresh, ...merged].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
          }
        } catch (e) {
          console.warn('Remote feed load skipped:', e?.message);
        }

        const loadTime = performance.now() - startTime;
        console.log(`📦 Loaded ${merged.length} items in ${loadTime.toFixed(2)}ms`);

        setSeededItems(merged);
      } catch (error) {
        console.error('Failed to load seeded items:', error);
        setSeededItems([]); // Fallback to empty array
      } finally {
        setLoadingItems(false);
      }
    };

    loadSeededItems();
  }, []);

  // Make test function available globally for debugging
  useEffect(() => {
    window.testImageGeneration = testImageGeneration;
  }, []); // Load once when component mounts

  // Check for stored user to maintain session across reloads
  const hasStoredUser = () => {
    try {
      const savedUser = localStorage.getItem('swipecity_user');
      const nativeUser = localStorage.getItem('swipecity_native_user'); 
      const demoUser = localStorage.getItem('swipecity_demo_user');
      return !!(savedUser || nativeUser || demoUser);
    } catch {
      return false;
    }
  };
  
  const userInStorage = hasStoredUser();

  // Legacy auth modal code removed - using Firebase AuthModal instead

  // Wait for auth to finish initializing BEFORE deciding onboarding. On a
  // WebView reload (e.g. iOS evicting the view after the native camera closes)
  // auth re-initializes asynchronously; evaluating the onboarding gate during
  // that window — before the profile/onboarding flag is restored — would flash
  // an already-onboarded user into the survey and trap them.
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Onboarding gate — deterministic, independent of the tangled demo/global/auth
  // user state. Show the survey to a genuinely signed-in user (isAuthenticated is
  // false for the anonymous demo-browse user) who hasn't finished onboarding on
  // this device. Completion is recorded per-user in localStorage.
  const onboardingDoneForUser = (() => {
    try {
      return !!user?.uid && localStorage.getItem('swipecity_onboarding_complete_' + user.uid) === 'true';
    } catch {
      return false;
    }
  })();
  const shouldShowOnboarding = isAuthenticated && !!user?.uid && !onboardingDoneForUser;

  // Bypass straight to the main app for the demo-browse user and for signed-in
  // users who have already onboarded; otherwise run the onboarding survey.
  if (userInStorage && !shouldShowOnboarding) {
    // Demo browser or returning, onboarded user — go to main app
  } else if (shouldShowOnboarding) {
    console.log('Showing onboarding, step:', appState.onboardingStep);
    
    /* BACKUP: Original complex onboarding flow removed for streamlined version
       - Categories grid selection (removed)
       - Complex shopping style selection (simplified)
       - Kept structure for easy reversion if needed
    */
    
    // Step 1: What are you shopping for?
    if (appState.onboardingStep === 1) {
      // Amazon-inspired categories
      const shoppingCategories = [
        { id: 'electronics', label: 'Electronics' },
        { id: 'clothing', label: 'Clothing' },
        { id: 'shoes', label: 'Shoes' },
        { id: 'home', label: 'Home & Garden' },
        { id: 'sports', label: 'Sports & Outdoors' },
        { id: 'books', label: 'Books' },
        { id: 'toys', label: 'Toys & Games' },
        { id: 'beauty', label: 'Beauty & Health' },
        { id: 'automotive', label: 'Automotive' },
        { id: 'jewelry', label: 'Jewelry' },
        { id: 'baby', label: 'Baby & Kids' },
        { id: 'tools', label: 'Tools & DIY' },
        { id: 'music', label: 'Music' },
        { id: 'art', label: 'Art & Crafts' },
        { id: 'furniture', label: 'Furniture' },
        { id: 'vintage', label: 'Vintage' }
      ];

      const selectedCategories = appState.selectedShoppingCategories || [];

      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          color: 'white',
          padding: '20px',
          textAlign: 'center',
          paddingTop: 'max(30px, env(safe-area-inset-top) + 10px)',
          paddingBottom: '160px', // Space for OnboardingButtonBar
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Compact Header */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛍️</div>
            <h1 style={{fontSize: '22px', marginBottom: '8px', margin: '0 0 8px 0', fontWeight: '700'}}>
              What are you shopping for?
            </h1>
            <p style={{fontSize: '14px', opacity: 0.9, maxWidth: '280px', margin: '0 auto'}}>
              Select categories you're interested in
            </p>
          </div>
          
          {/* Selected categories display */}
          {selectedCategories.length > 0 && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              maxWidth: '350px',
              margin: '0 auto 20px',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', opacity: 0.9, fontWeight: 'bold' }}>
                Selected ({selectedCategories.length}):
              </div>
              <div style={{ fontSize: '11px', opacity: 0.8, lineHeight: '1.4' }}>
                {selectedCategories.map(cat => {
                  const category = shoppingCategories.find(c => c.id === cat);
                  return category ? category.label : '';
                }).join(', ')}
              </div>
            </div>
          )}

          {/* Category grid - Maximum space for easy selection */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '10px',
            maxWidth: '350px',
            margin: '0 auto 10px',
            maxHeight: '280px',
            overflowY: 'auto',
            padding: '5px'
          }}>
            {shoppingCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    const newCategories = isSelected
                      ? selectedCategories.filter(c => c !== category.id)
                      : [...selectedCategories, category.id];
                    updateState({ selectedShoppingCategories: newCategories });
                  }}
                  style={{
                    padding: '12px 6px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #4CAF50' : '2px solid rgba(255,255,255,0.3)',
                    background: isSelected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    minHeight: '44px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {category.label}
                  {isSelected && (
                    <span style={{ marginLeft: '5px', color: '#4CAF50' }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
          
          
          <OnboardingButtonBar
            showBack={false}
            showSkip={true}
            onSkip={() => updateState({ selectedShoppingCategories: [], onboardingStep: 2 })}
            onNext={() => {
              console.log('Continue clicked, selected categories:', selectedCategories);
              updateState({ onboardingStep: 2 });
            }}
          />
        </div>
      );
    }
    
    // Step 2: Budget Range
    if (appState.onboardingStep === 2) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f093fb, #f5576c)',
          color: 'white',
          padding: '20px',
          textAlign: 'center',
          paddingTop: 'max(30px, env(safe-area-inset-top) + 10px)',
          paddingBottom: '140px' // Space for lower OnboardingButtonBar
        }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>💰</div>
            <h1 style={{fontSize: '28px', marginBottom: '15px', margin: '0 0 15px 0', fontWeight: '700'}}>
              What's your budget?
            </h1>
            <p style={{margin: '0', fontSize: '16px', opacity: 0.9}}>
              Set your spending range to see items that fit your budget
            </p>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.15)', 
            borderRadius: '20px', 
            padding: '30px', 
            maxWidth: '400px', 
            margin: '0 auto 40px' 
          }}>
            <div style={{ marginBottom: '30px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                ${appState.minPrice} - ${appState.maxPrice}
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                  Minimum Price
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <button
                    onClick={() => {
                      const newValue = Math.max(5, appState.minPrice - 10);
                      updateState({ 
                        minPrice: newValue,
                        maxPrice: Math.max(newValue + 10, appState.maxPrice)
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.5)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    -
                  </button>
                  <div
                    onClick={() => {
                      const input = prompt('Enter minimum price:', appState.minPrice);
                      if (input !== null) {
                        const value = parseInt(input) || 5;
                        const validValue = Math.min(Math.max(5, value), appState.maxPrice - 10);
                        updateState({ 
                          minPrice: validValue,
                          maxPrice: Math.max(validValue + 10, appState.maxPrice)
                        });
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '8px 15px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}
                  >
                    ${appState.minPrice}
                  </div>
                  <button
                    onClick={() => {
                      const newValue = Math.min(appState.maxPrice - 10, appState.minPrice + 10);
                      updateState({ 
                        minPrice: newValue,
                        maxPrice: Math.max(newValue + 10, appState.maxPrice)
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.5)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
                <input
                  type="range"
                  min="5"
                  max="1000"
                  value={appState.minPrice}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value);
                    updateState({ 
                      minPrice: newMin,
                      maxPrice: Math.max(newMin + 10, appState.maxPrice)
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.3)',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>
                  Maximum Price
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <button
                    onClick={() => {
                      const newValue = Math.max(appState.minPrice + 10, appState.maxPrice - 10);
                      updateState({ 
                        maxPrice: newValue,
                        minPrice: Math.min(appState.minPrice, newValue - 10)
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.5)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    -
                  </button>
                  <div
                    onClick={() => {
                      const input = prompt('Enter maximum price:', appState.maxPrice);
                      if (input !== null) {
                        const value = parseInt(input) || 100;
                        const validValue = Math.max(appState.minPrice + 10, value);
                        updateState({ 
                          maxPrice: validValue,
                          minPrice: Math.min(appState.minPrice, validValue - 10)
                        });
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '8px 15px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}
                  >
                    ${appState.maxPrice}
                  </div>
                  <button
                    onClick={() => {
                      const newValue = Math.min(2000, appState.maxPrice + 10);
                      updateState({ 
                        maxPrice: newValue,
                        minPrice: Math.min(appState.minPrice, newValue - 10)
                      });
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.5)',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                </div>
                <input
                  type="range"
                  min="10"
                  max="2000"
                  value={appState.maxPrice}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value);
                    updateState({ 
                      maxPrice: newMax,
                      minPrice: Math.min(appState.minPrice, newMax - 10)
                    });
                  }}
                  style={{
                    width: '100%',
                    height: '20px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.3)',
                    outline: 'none',
                    cursor: 'pointer',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { min: 10, max: 50, label: 'Under $50' },
                { min: 25, max: 200, label: '$25-200' },
                { min: 100, max: 500, label: '$100-500' },
                { min: 200, max: 1000, label: '$200+' }
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => updateState({ minPrice: preset.min, maxPrice: preset.max })}
                  style={{
                    background: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: '15px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          <OnboardingButtonBar
            onBack={() => updateState({ onboardingStep: 1 })}
            onNext={() => updateState({ onboardingStep: 3 })}
          />
        </div>
      );
    }
    
    // Step 3: City selection
    if (appState.onboardingStep === 3) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
          color: 'white',
          padding: '15px',
          textAlign: 'center',
          paddingTop: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
            ? 'max(50px, env(safe-area-inset-top) + 25px)' // More top padding on Android for camera notch
            : 'max(20px, env(safe-area-inset-top) + 5px)', // Original iOS padding
          paddingBottom: '140px' // Space for lower OnboardingButtonBar
        }}>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📍</div>
            <h1 style={{fontSize: '24px', marginBottom: '8px', margin: '0 0 8px 0', fontWeight: '700'}}>
              Which cities do you want to shop?
            </h1>
            <p style={{margin: '0', fontSize: '14px', opacity: 0.9}}>
              Pick the cities you'll browse. You can change this anytime — leave them all off to see every city.
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '20px',
            padding: '15px',
            maxWidth: '400px',
            margin: '0 auto 15px'
          }}>
            <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '12px' }}>
              {(!appState.selectedCities || appState.selectedCities.length === 0)
                ? 'No cities selected — you\'ll see listings from everywhere.'
                : `${appState.selectedCities.length} ${appState.selectedCities.length === 1 ? 'city' : 'cities'} selected.`}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {SUPPORTED_CITIES.map((city) => {
                const selected = (appState.selectedCities || []).includes(city);
                return (
                  <button
                    key={city}
                    onClick={() => {
                      const set = appState.selectedCities || [];
                      const next = selected ? set.filter(c => c !== city) : [...set, city];
                      updateState({ selectedCities: next });
                    }}
                    style={{
                      background: selected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)',
                      color: selected ? '#333' : 'white',
                      border: '1px solid rgba(255,255,255,0.5)',
                      borderRadius: '15px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
          
          <OnboardingButtonBar
            onBack={() => updateState({ onboardingStep: 2 })}
            onNext={() => updateState({ onboardingStep: 4 })}
          />
        </div>
      );
    }
    
    // Step 4: Final preferences
    if (appState.onboardingStep === 4) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #a8edea, #fed6e3)',
          color: '#333',
          padding: '20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingTop: 'max(30px, env(safe-area-inset-top) + 10px)',
          paddingBottom: '140px' // Space for lower OnboardingButtonBar
        }}>
          <div style={{ marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>✨</div>
            <h1 style={{fontSize: '28px', marginBottom: '10px', margin: '0 0 10px 0', fontWeight: '700'}}>
              Final touches
            </h1>
            <p style={{margin: '0', fontSize: '16px', opacity: 0.8}}>
              A couple quick preferences to personalize your experience
            </p>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.8)', 
            borderRadius: '20px', 
            padding: '25px', 
            maxWidth: '400px', 
            margin: '0 auto 30px',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Item condition preference</h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { value: 'new', label: 'New only' },
                  { value: 'like-new', label: 'Like new' },
                  { value: 'good', label: 'Good condition' },
                  { value: 'any', label: 'Any condition' }
                ].map((condition) => (
                  <button
                    key={condition.value}
                    onClick={() => updateState({ conditionPreference: condition.value })}
                    style={{
                      background: appState.conditionPreference === condition.value ? '#667eea' : '#f5f5f5',
                      color: appState.conditionPreference === condition.value ? 'white' : '#333',
                      border: '1px solid #ddd',
                      borderRadius: '15px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {condition.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <OnboardingButtonBar
            onBack={() => updateState({ onboardingStep: 3 })}
            onNext={async () => {
              console.log('🎉 Completing onboarding...');

              // Save preferences using the auth context
              const preferences = {
                searchKeywords: appState.searchKeywords,
                minPrice: appState.minPrice,
                maxPrice: appState.maxPrice,
                cities: appState.selectedCities,
                conditionPreference: appState.conditionPreference
              };
              
              const result = await savePreferences(preferences);

              // Record completion per-user so onboarding doesn't re-run for them.
              // This is the source of truth the onboarding gate checks.
              try {
                if (user?.uid) {
                  localStorage.setItem('swipecity_onboarding_complete_' + user.uid, 'true');
                }
              } catch (e) { /* ignore storage errors */ }

              if (result.success) {
                console.log('✅ Onboarding completed successfully!');
              } else {
                console.error('❌ Failed to save preferences:', result.error);
              }
            }}
            nextText="Start Shopping! 🎉"
          />
        </div>
      );
    }

    // BACKUP: Old onboarding step 2 removed - can be restored if needed
    return null;
  }


  // Show loading screen while auth is initializing
  if (authLoading) {
    return <LoadingScreen />;
  }
  
  // Show error screen if auth failed
  if (authError && authError !== 'Firebase unavailable - using offline mode') {
    return <ErrorScreen authError={authError} />;
  }

  // Show admin dashboard if enabled (development only)
  if (isDevelopment && appState.showAdminDashboard) {
    return <AdminDashboard onClose={() => updateState({ showAdminDashboard: false })} />;
  }

  // Main Interface
  return (
    <>
      {/* Firebase Authentication Modal - Only show when user tries protected actions */}
      <AuthModal 
        isOpen={appState.showAuthModal} 
        onClose={() => updateState({ showAuthModal: false })} 
      />
      
      {appState.currentMode === 'buyer' ? (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android' 
          ? '120px' // More space for Android (nav bar + bottom nav)
          : '75px' // iOS space
      }}>

        {/* Swipe Cards */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
            ? '60px 20px 0 20px' // More top padding on Android to move card down
            : '20px 20px 0 20px', // Original iOS padding
          position: 'relative',
          minHeight: 0
        }}>
          {currentItem ? (
            <div style={{
              position: 'relative',
              width: '100%',
              maxWidth: '350px',
              height: 'calc(100vh - 150px)',
              minHeight: '450px',
              maxHeight: '600px'
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: 'max(0px, env(safe-area-inset-top))',
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
                  e.preventDefault(); // Prevents text selection
                  const touch = e.touches[0];
                  handleDragStart(touch.clientX, touch.clientY);
                }}
                onTouchMove={(e) => {
                  e.preventDefault(); // Prevents scrolling interference
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
                    transform: `scale(${Math.abs(appState.dragOffset.x) > 15 && appState.dragOffset.x < 0 ? 1 : 0}) rotate(-15deg)`,
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
                    transform: `scale(${Math.abs(appState.dragOffset.x) > 15 && appState.dragOffset.x > 0 ? 1 : 0}) rotate(15deg)`,
                    transition: 'transform 0.2s ease'
                  }}>
                    LIKE
                  </div>
                  
                  {/* Report Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      
                      // Anti-spam protection - 3 reports per day
                      if (appState.userReportCount >= 3) {
                        alert('You have reached the daily report limit (3 reports). Please try again tomorrow.');
                        return;
                      }
                      
                      if (appState.reportedItems.has(currentItem.id)) {
                        alert('You have already reported this item.');
                        return;
                      }
                      
                      // Open report modal
                      updateState({
                        showReportModal: true,
                        reportingItem: currentItem,
                        selectedReportReason: ''
                      });
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '15px',
                      background: 'rgba(255, 152, 0, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      zIndex: 10
                    }}
                  >
                    ⚠️
                  </button>
                </div>

                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#333' }}>{currentItem.title}</h3>
                      <p style={{ margin: '5px 0', fontSize: '24px', fontWeight: '800', color: '#4CAF50' }}>${currentItem.price}</p>
                      <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                        Sold by <span 
                          onClick={() => {
                            // Find the seller from our seeded users
                            const sellerBio = (() => {
                              // Check if we have the seller in our mock users
                              const mockSeller = appState.users[currentItem.seller_id];
                              if (mockSeller && mockSeller.bio) {
                                return mockSeller.bio;
                              }
                              
                              // Default bios based on seller username patterns
                              const sellerBios = {
                                'MikeTheCollector': 'Long-time collector of vintage items and tech gadgets. Always looking for unique finds!',
                                'SarahStylesLiving': 'Interior designer selling carefully curated home pieces. All items from smoke-free, pet-free home.',
                                'TechEnthusiast92': 'Software engineer who loves trying new tech. Always upgrading, so selling previous generation items.',
                                'OutdoorAdventurer': 'Hiking and camping gear enthusiast. Selling quality outdoor equipment that\'s been well cared for.',
                                'MinimalistMom': 'Decluttering family home. Selling kids items, household goods, and more. Everything clean and well-maintained.',
                                'VintageVinylVibe': 'Record collector for 20+ years. Selling duplicates and items that need new homes. All records tested.',
                                'CollegeGradSale': 'Recent graduate selling furniture and electronics before moving. Everything priced to sell quickly!',
                                'FashionistaFinds': 'Fashion lover with too many clothes! Selling designer and contemporary pieces in excellent condition.'
                              };
                              
                              return sellerBios[currentItem.seller_name] || `${currentItem.seller_name} is a trusted seller on SwipeCity with ${currentItem.seller_reviews} reviews and a ${currentItem.seller_rating} star rating.`;
                            })();
                            
                            alert(`📝 Seller Profile\n\n👤 ${currentItem.seller_name}\n⭐ ${currentItem.seller_rating} rating (${currentItem.seller_reviews} reviews)\n📍 ${currentItem.city || currentItem.location || 'Location not specified'}${currentItem.verified ? '\n✅ Verified Seller' : ''}\n\n${sellerBio}`);
                          }}
                          style={{ 
                            fontWeight: '600', 
                            color: '#4F46E5',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >{currentItem.seller_name}</span>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {/* Only show a badge for verified sellers; hide the
                          "Unverified" badge until a real verification flow exists. */}
                      {currentItem.verified && (
                        <div style={{
                          background: '#4CAF50',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}>
                          ✓ Verified
                        </div>
                      )}
                      <div style={{ fontSize: '14px', color: '#666' }}>⭐ {currentItem.seller_rating} ({currentItem.seller_reviews})</div>
                    </div>
                  </div>

                  {/* Simplified Seller Information */}
                  {(() => {
                    const seller = appState.users[currentItem.seller_id];
                    if (!seller) return null;
                    
                    // Algorithm-based badge calculation
                    const calculateBadges = (seller) => {
                      const badges = [];
                      
                      // VERIFIED badge: Basic verification (phone + email)
                      if (seller.phoneVerified && seller.emailVerified) {
                        badges.push('verified');
                      }
                      
                      // TOP SELLER badge: High rating (4.5+) + lots of sales (20+) + good reviews (15+)
                      if (seller.rating >= 4.5 && seller.totalSales >= 20 && seller.reviewCount >= 15) {
                        badges.push('top-seller');
                      }
                      
                      // FAST badge: Quick response time (under 2 hours)
                      const sellerRt = seller.responseTime || '';
                      const responseHours = parseFloat(sellerRt.replace(/[^0-9.]/g, ''));
                      const responseUnit = sellerRt.includes('m') ? 'minutes' : 'hours';
                      const actualHours = responseUnit === 'minutes' ? responseHours / 60 : responseHours;
                      if (actualHours <= 2) {
                        badges.push('fast-responder');
                      }
                      
                      return badges;
                    };
                    
                    const earnedBadges = calculateBadges(seller);
                    
                    return (
                      <div style={{
                        background: 'linear-gradient(135deg, #f8f9ff 0%, #e8f2ff 100%)',
                        border: '1px solid #e1e8ff',
                        borderRadius: '12px',
                        padding: '12px',
                        marginBottom: '15px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <img
                            src={seller.avatar}
                            alt={seller.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #667eea'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                                {seller.name}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              Seller since {new Date(seller.joinDate).getFullYear()}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#666' }}>
                            <span>⭐ {seller.rating}/5 ({seller.reviewCount})</span>
                            <span>📦 {seller.totalSales} sales</span>
                            <span>⚡ {seller.responseTime}</span>
                          </div>
                        </div>
                        
                        {earnedBadges.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {earnedBadges.map(badge => (
                              <span
                                key={badge}
                                style={{
                                  background: badge === 'verified' ? '#4CAF50' : 
                                            badge === 'top-seller' ? '#ff9800' :
                                            badge === 'fast-responder' ? '#2196F3' : '#666',
                                  color: 'white',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {badge === 'verified' ? '🛡️ VERIFIED' :
                                 badge === 'top-seller' ? '🏆 TOP SELLER' :
                                 badge === 'fast-responder' ? '⚡ FAST' :
                                 badge.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <p style={{ color: '#666', margin: '10px 0', fontSize: '14px', lineHeight: '1.4' }}>{currentItem.description}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <span style={{ color: '#888', fontSize: '14px' }}>📍 {currentItem.city || currentItem.location || 'Location not specified'}</span>
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
              {(appState.selectedCities && appState.selectedCities.length > 0) ? (
                <>
                  <h2 style={{ marginBottom: '15px' }}>📍 No listings in your cities yet</h2>
                  <p style={{ marginBottom: '20px' }}>
                    Nothing is listed in {appState.selectedCities.length === 1 ? appState.selectedCities[0] : 'your selected cities'} right now. Try browsing every city.
                  </p>
                  <button
                    onClick={() => updateState({ selectedCities: [], currentItemIndex: 0 })}
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
                    Show all cities
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}
        </div>

{/* Action Buttons - Bottom layout - Only show in swipe view and not when showing other modals */}
{appState.currentView === 'swipe' && !appState.showChats && !appState.activeChat && !appState.showProfile && !appState.showSavedItems && (
<div style={{
  position: 'fixed',
  bottom: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
    ? '130px' // Higher on Android to clear system nav + bottom nav
    : '85px', // Original iOS position
  left: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  zIndex: 1000
}}>
  {/* Left - Undo button (only shows after passing) */}
  <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-start' }}>
    {appState.canUndo && (
      <button
        onClick={handleUndo}
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.8)',
          background: 'rgba(255, 152, 0, 0.9)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          userSelect: 'none',
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.4)'
        }}
      >
        ↶
      </button>
    )}
  </div>
  
  {/* Center - Save for Later button */}
  <button
    onClick={handleSaveForLater}
    disabled={!currentItem || appState.isDragging}
    style={{
      width: '180px',
      height: '45px',
      borderRadius: '25px',
      border: '3px solid white',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
      opacity: (!currentItem || appState.isDragging) ? 0.5 : 1,
      fontSize: '14px',
      fontWeight: 'bold',
      WebkitTapHighlightColor: 'transparent',
      touchAction: 'manipulation',
      userSelect: 'none'
    }}
  >
    <span>💾 Save</span>
    <span style={{
      background: 'rgba(255,255,255,0.2)',
      borderRadius: '12px',
      padding: '2px 6px',
      fontSize: '11px',
      fontWeight: '600'
    }}>
      {appState.dailySaveCount}/{appState.maxDailySaves}
    </span>
  </button>
  
  {/* Right - View Saved button */}
  <div style={{ width: '60px', display: 'flex', justifyContent: 'flex-end' }}>
    <button
      onClick={() => updateState({ showSavedItems: true })}
      style={{
        width: '50px',
        height: '40px',
        borderRadius: '20px',
        border: '2px solid rgba(255,255,255,0.8)',
        background: 'rgba(102, 126, 234, 0.9)',
        color: 'white',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: '600',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        userSelect: 'none',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
      }}
    >
      <span style={{ fontSize: '12px' }}>🔍</span>
      <span style={{ fontSize: '9px' }}>({appState.savedItems.length})</span>
    </button>
  </div>
</div>
)}


        {/* Match Animation Modal */}
        {appState.showMatchAnimation && appState.matchedItem && (
          <div style={{
            position: 'fixed',
            top: 'max(0px, env(safe-area-inset-top))',
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
                    
                    setAppState(prev => {
                      const updatedChats = [newChat, ...prev.chats.filter(chat => chat.id !== newChat.id)];
                      
                      // Save chats to localStorage
                      if (user) {
                        try {
                          const userKey = `swipecity_user_${user.email.replace(/[@+.]/g, '_')}`;
                          localStorage.setItem(`${userKey}_chats`, JSON.stringify(updatedChats));
                          console.log('💾 Saved chats to localStorage after match:', updatedChats.length, 'chats');
                        } catch (error) {
                          console.error('Failed to save chats to localStorage:', error);
                        }
                      }
                      
                      return {
                        ...prev,
                        showMatchAnimation: false,
                        matchedItem: null,
                        showChats: true,
                        activeChat: newChat,
                        chats: updatedChats
                      };
                    });
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

        {/* Interest Confirmation Modal */}
        {appState.showInterestConfirmation && appState.interestedItem && (
          <div style={{
            position: 'fixed',
            top: 'max(0px, env(safe-area-inset-top))',
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
              padding: '30px',
              maxWidth: '300px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>💝</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '18px' }}>
                Interest Sent!
              </h3>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <img
                  src={appState.interestedItem.image_url}
                  alt={appState.interestedItem.title}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <h4 style={{ margin: '0 0 3px 0', fontSize: '14px', color: '#333' }}>
                    {appState.interestedItem.title}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                    by {appState.interestedItem.seller_name}
                  </p>
                </div>
              </div>

              <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: '14px' }}>
                The seller will review your interest and decide if they want to sell to you!
              </p>
              
              <button
                onClick={closeInterestConfirmation}
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        

        {/* Individual Chat Modal */}
        {appState.activeChat && (
            <div style={{
              position: 'fixed',
              top: 'max(0px, env(safe-area-inset-top))',
              left: 0,
              right: 0,
              bottom: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android' 
                ? '75px' // Leave room for bottom nav on Android
                : '60px', // Leave room for bottom nav on iOS
              background: 'white',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column'
            }}>
            <div style={{
              padding: '15px 20px',
              paddingTop: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
                ? (isDevelopment ? 'max(60px, env(safe-area-inset-top) + 45px)' : 'max(30px, env(safe-area-inset-top) + 15px)') // Extra padding only in development
                : 'max(15px, env(safe-area-inset-top))', // Original iOS padding
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button
                  onClick={() => {
                    console.log('Back button clicked');
                    updateState({ activeChat: null });
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Back button touched');
                    updateState({ activeChat: null });
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'rgba(255,255,255,0.3)',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    position: 'relative',
                    pointerEvents: 'auto'
                  }}
                >
                  ←
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>
                    {appState.currentMode === 'seller' 
                      ? appState.activeChat.buyer_name 
                      : appState.activeChat.seller_name}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{appState.activeChat.item_title}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Close chat button clicked');
                  updateState({ showChats: false, activeChat: null });
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Close chat button touched');
                  updateState({ showChats: false, activeChat: null });
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1002
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
              paddingBottom: 'max(15px, env(safe-area-inset-bottom))',
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
                  if (e.key === 'Enter') {
                    sendMessage(appState.newMessage);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '25px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <button
                onClick={() => {
                  sendMessage(appState.newMessage);
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

        {/* Settings Modal */}
        {appState.showSettings && (
          <div style={{
            position: 'fixed',
            top: 'max(0px, env(safe-area-inset-top))',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {/* Scrollable Content Area */}
              <div style={{
                padding: '30px 30px 20px 30px',
                overflow: 'auto',
                flex: 1
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', color: '#333', fontWeight: '700' }}>
                  ⚙️ Your Preferences
                </h2>
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
              
              {/* Search Keywords Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#333', fontWeight: '600' }}>
                  🛍️ What are you shopping for?
                </h3>
                <input
                  type="text"
                  placeholder="e.g., vintage furniture, gaming setup, workout gear"
                  value={appState.searchKeywords}
                  onChange={(e) => updateState({ searchKeywords: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderRadius: '12px',
                    border: '2px solid #e1e8ff',
                    fontSize: '16px',
                    outline: 'none',
                    background: '#f8f9ff',
                    boxSizing: 'border-box'
                  }}
                />
                {appState.searchKeywords && (
                  <p style={{
                    fontSize: '13px',
                    color: '#667eea',
                    marginTop: '8px',
                    fontStyle: 'italic'
                  }}>
                    We'll prioritize "{appState.searchKeywords}" in your feed
                  </p>
                )}
              </div>

              {/* Categories Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#333', fontWeight: '600' }}>
                  🏷️ Your Interested Categories
                </h3>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
                  Select categories to see items you're interested in
                </p>
                {(() => {
                  const shoppingCategories = [
                    { id: 'electronics', label: 'Electronics' },
                    { id: 'clothing', label: 'Clothing' },
                    { id: 'shoes', label: 'Shoes' },
                    { id: 'home', label: 'Home & Garden' },
                    { id: 'sports', label: 'Sports & Outdoors' },
                    { id: 'books', label: 'Books' },
                    { id: 'toys', label: 'Toys & Games' },
                    { id: 'beauty', label: 'Beauty & Health' },
                    { id: 'automotive', label: 'Automotive' },
                    { id: 'jewelry', label: 'Jewelry' },
                    { id: 'baby', label: 'Baby & Kids' },
                    { id: 'tools', label: 'Tools & DIY' },
                    { id: 'music', label: 'Music' },
                    { id: 'art', label: 'Art & Crafts' },
                    { id: 'furniture', label: 'Furniture' },
                    { id: 'vintage', label: 'Vintage' }
                  ];
                  const selectedCategories = appState.selectedShoppingCategories || [];

                  return (
                    <>
                      {selectedCategories.length > 0 && (
                        <div style={{
                          marginBottom: '12px',
                          padding: '10px',
                          background: '#f8f9ff',
                          borderRadius: '8px',
                          border: '1px solid #e1e8ff'
                        }}>
                          <div style={{ fontSize: '12px', marginBottom: '6px', color: '#667eea', fontWeight: 'bold' }}>
                            Selected ({selectedCategories.length}):
                          </div>
                          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                            {selectedCategories.map(cat => {
                              const category = shoppingCategories.find(c => c.id === cat);
                              return category ? category.label : '';
                            }).join(', ')}
                          </div>
                        </div>
                      )}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '5px'
                      }}>
                        {shoppingCategories.map((category) => {
                          const isSelected = selectedCategories.includes(category.id);
                          return (
                            <button
                              key={category.id}
                              onClick={() => {
                                const newCategories = isSelected
                                  ? selectedCategories.filter(c => c !== category.id)
                                  : [...selectedCategories, category.id];
                                updateState({ selectedShoppingCategories: newCategories });
                              }}
                              style={{
                                padding: '10px 6px',
                                borderRadius: '8px',
                                border: isSelected ? '2px solid #667eea' : '2px solid #e1e8ff',
                                background: isSelected ? 'rgba(102, 126, 234, 0.1)' : 'white',
                                color: isSelected ? '#667eea' : '#333',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                fontWeight: isSelected ? 'bold' : 'normal',
                                minHeight: '44px'
                              }}
                            >
                              {category.label}
                              {isSelected && (
                                <span style={{ marginLeft: '4px' }}>✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Budget Range Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#333', fontWeight: '600' }}>
                  💰 Your Budget Range
                </h3>
                <div style={{ 
                  background: '#f8f9ff', 
                  borderRadius: '15px', 
                  padding: '20px', 
                  border: '2px solid #e1e8ff'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center', color: '#333' }}>
                    ${appState.minPrice} - ${appState.maxPrice}
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                      Minimum: ${appState.minPrice}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="1000"
                      value={appState.minPrice}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value);
                        updateState({ 
                          minPrice: newMin,
                          maxPrice: Math.max(newMin + 10, appState.maxPrice)
                        });
                      }}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '10px',
                        background: '#e1e8ff',
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none'
                      }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#666' }}>
                      Maximum: ${appState.maxPrice}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="2000"
                      value={appState.maxPrice}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value);
                        updateState({ 
                          maxPrice: newMax,
                          minPrice: Math.min(appState.minPrice, newMax - 10)
                        });
                      }}
                      style={{
                        width: '100%',
                        height: '20px',
                        borderRadius: '10px',
                        background: '#e1e8ff',
                        outline: 'none',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none'
                      }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[
                      { min: 10, max: 50, label: 'Under $50' },
                      { min: 25, max: 200, label: '$25-200' },
                      { min: 100, max: 500, label: '$100-500' },
                      { min: 200, max: 1000, label: '$200+' }
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => updateState({ minPrice: preset.min, maxPrice: preset.max })}
                        style={{
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cities Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '5px', fontSize: '16px', color: '#333', fontWeight: '600' }}>
                  📍 Cities I Shop In
                </h3>
                <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#666' }}>
                  {(!appState.selectedCities || appState.selectedCities.length === 0)
                    ? 'Showing all cities. Tap cities to shop only those.'
                    : `Showing ${appState.selectedCities.length} ${appState.selectedCities.length === 1 ? 'city' : 'cities'}.`}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {SUPPORTED_CITIES.map((city) => {
                    const selected = (appState.selectedCities || []).includes(city);
                    return (
                      <button
                        key={city}
                        onClick={() => {
                          const set = appState.selectedCities || [];
                          const next = selected ? set.filter(c => c !== city) : [...set, city];
                          updateState({ selectedCities: next });
                        }}
                        style={{
                          background: selected ? '#667eea' : '#f5f5f5',
                          color: selected ? 'white' : '#333',
                          border: '2px solid ' + (selected ? '#667eea' : '#ddd'),
                          borderRadius: '15px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
                {appState.selectedCities && appState.selectedCities.length > 0 && (
                  <button
                    onClick={() => updateState({ selectedCities: [] })}
                    style={{
                      marginTop: '12px',
                      background: 'transparent',
                      color: '#667eea',
                      border: 'none',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      padding: 0
                    }}
                  >
                    Clear — show all cities
                  </button>
                )}
              </div>

              {/* Condition Preference Section */}
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '16px', color: '#333', fontWeight: '600' }}>
                  ✨ Item Condition Preference
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'new', label: 'New only' },
                    { value: 'like-new', label: 'Like new' },
                    { value: 'good', label: 'Good condition' },
                    { value: 'any', label: 'Any condition' }
                  ].map((condition) => (
                    <button
                      key={condition.value}
                      onClick={() => updateState({ conditionPreference: condition.value })}
                      style={{
                        background: appState.conditionPreference === condition.value ? '#667eea' : '#f5f5f5',
                        color: appState.conditionPreference === condition.value ? 'white' : '#333',
                        border: '2px solid ' + (appState.conditionPreference === condition.value ? '#667eea' : '#ddd'),
                        borderRadius: '12px',
                        padding: '10px 15px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {condition.label}
                    </button>
                  ))}
                </div>
              </div>

              </div>

              {/* Fixed Action Buttons Area */}
              <div style={{
                padding: '15px 30px 25px 30px',
                borderTop: '1px solid #f0f0f0',
                background: 'white',
                borderRadius: '0 0 20px 20px'
              }}>
                {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => updateState({ showSettings: false })}
                  style={{
                    flex: 1,
                    background: '#f5f5f5',
                    color: '#666',
                    border: '2px solid #ddd',
                    borderRadius: '15px',
                    padding: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Save the new preferences
                    const updatedUser = {
                      ...user,
                      preferences: {
                        ...user.preferences,
                        searchKeywords: appState.searchKeywords,
                        categories: appState.selectedShoppingCategories,
                        minPrice: appState.minPrice,
                        maxPrice: appState.maxPrice,
                        cities: appState.selectedCities,
                        conditionPreference: appState.conditionPreference
                      }
                    };
                    setGlobalUser(updatedUser);
                    updateState({ showSettings: false });
                    console.log('✅ Preferences updated:', updatedUser.preferences);
                  }}
                  style={{
                    flex: 2,
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '15px',
                    padding: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  💾 Save Preferences
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Swipe Tutorial Modal */}
        {appState.showSwipeTutorial && (
          <div style={{
            position: 'fixed',
            top: 'max(0px, env(safe-area-inset-top))',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '30px 25px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              position: 'relative'
            }}>
              {/* Close Button */}
              <button
                onClick={hideSwipeTutorial}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'rgba(0,0,0,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
              
              {/* Tutorial Content */}
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>👋</div>
              <h2 style={{ 
                marginBottom: '25px', 
                fontSize: '24px', 
                fontWeight: '700',
                color: '#333'
              }}>
                How to Use SwipeCity
              </h2>
              
              <div style={{ textAlign: 'left', marginBottom: '25px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '24px', marginRight: '15px' }}>👈</div>
                  <div>
                    <strong>Swipe Left (Pass)</strong><br/>
                    <span style={{ color: '#666', fontSize: '14px' }}>Not interested in this item</span>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '24px', marginRight: '15px' }}>👉</div>
                  <div>
                    <strong>Swipe Right (Like)</strong><br/>
                    <span style={{ color: '#666', fontSize: '14px' }}>Show interest in this item</span>
                  </div>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <div style={{ fontSize: '24px', marginRight: '15px' }}>🔖</div>
                  <div>
                    <strong>Save for Later</strong><br/>
                    <span style={{ color: '#666', fontSize: '14px' }}>Tap the button to save items you want to consider</span>
                  </div>
                </div>
              </div>
              
              <p style={{ 
                color: '#666', 
                fontSize: '14px', 
                marginBottom: '25px',
                fontStyle: 'italic'
              }}>
                Watch for "LIKE" and "PASS" indicators as you swipe!
              </p>
              
              <button
                onClick={hideSwipeTutorial}
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '15px 30px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Got it! Let's start swiping
              </button>
            </div>
          </div>
        )}

        {/* Overlay for profile panel */}
        {appState.showProfile && (
          <div
            style={{
              position: 'fixed',
              top: 'max(0px, env(safe-area-inset-top))',
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
            top: 'max(0px, env(safe-area-inset-top))',
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

        {/* Profile backdrop for closing */}
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
      </div>
      ) : (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
        ? '140px' // More space for Android (nav bar + bottom nav)
        : '100px' // iOS space for bottom navigation
    }}>

      {/* Seller Content */}
      {!appState.showAddItem ? (
        appState.showMyListings ? (
          /* My Listings View */
          <div style={{
            flex: 1,
            padding: '20px',
            background: '#f8f9fa',
            margin: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
              ? '40px 15px 5px 15px' // More top margin on Android to move down
              : '5px 15px', // Original iOS margin
            borderRadius: '20px',
            maxWidth: '600px',
            alignSelf: 'center',
            width: '100%',
            boxSizing: 'border-box',
            border: '1px solid #e9ecef',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 160px)' // Ensure scrolling within viewport
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
          
          {/* Show buyer interests for this listing */}
          {(() => {
            const listingInterests = appState.buyerInterests?.filter(interest => 
              interest.itemId === listing.id && interest.status === 'pending'
            ) || [];

            if (listingInterests.length > 0) {
              return (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #f8f9ff, #e8ecff)',
                  borderRadius: '10px',
                  border: '2px solid #667eea',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)'
                }}>
                  <div style={{
                    fontSize: '14px',
                    color: '#667eea',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '16px' }}>💫</span>
                    <span>{listingInterests.length} Interested Buyer{listingInterests.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{
                    maxHeight: '400px', // Increased height for better viewing
                    overflowY: 'auto',
                    gap: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    scrollbarWidth: 'thin', // Firefox
                    scrollbarColor: '#667eea transparent', // Firefox
                    paddingRight: '5px'
                  }}>
                    {listingInterests.map((interest, index) => {
                    const buyer = appState.users[interest.buyerId];
                    return (
                      <div 
                        key={interest.id} 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up to parent listing card
                          // Navigate to buyer profile
                          if (buyer) {
                            alert(`Buyer Profile:\n\nName: ${buyer.name || interest.buyerName}\nRating: ${buyer.rating || 'N/A'}/5\nTotal Purchases: ${buyer.totalPurchases || 0}\nResponse Time: ${buyer.responseTime || 'N/A'}\nLocation: ${buyer.location || 'N/A'}\n\nBio: ${buyer.bio || 'No bio available'}\n\nMember since: ${new Date(buyer.created_at || Date.now()).toLocaleDateString()}`);
                          }
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #d0d8ff',
                          borderRadius: '8px',
                          padding: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          ':hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 3px 10px rgba(102, 126, 234, 0.2)'
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 3px 10px rgba(102, 126, 234, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <img
                            src={buyer?.avatar || interest.buyerAvatar}
                            alt={interest.buyerName}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #e0e7ff'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                {interest.buyerName}
                              </span>
                              {buyer?.verified && (
                                <span style={{ color: '#4CAF50', fontSize: '12px' }} title="Verified Buyer">✓</span>
                              )}
                            </div>
                            {buyer && buyer.location && (
                              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                📍 {buyer.location}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {buyer && (
                          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                            {/* Buyer Stats */}
                            <div style={{ 
                              display: 'flex', 
                              gap: '10px', 
                              marginBottom: '8px',
                              fontSize: '12px',
                              color: '#555'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span style={{ color: '#FFA726' }}>⭐</span>
                                <span>{buyer.rating}/5</span>
                                <span style={{ color: '#999' }}>({buyer.reviewCount})</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span>📦</span>
                                <span>{buyer.totalPurchases} buys</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span>⚡</span>
                                <span>{buyer.responseTime}</span>
                              </div>
                            </div>
                            
                            {/* Brief Description */}
                            {buyer.bio && (
                              <div style={{
                                fontSize: '11px',
                                color: '#666',
                                fontStyle: 'italic',
                                marginBottom: '6px',
                                padding: '6px',
                                background: '#f5f7ff',
                                borderRadius: '4px',
                                borderLeft: '3px solid #667eea'
                              }}>
                                "{buyer.bio.substring(0, 100)}{buyer.bio.length > 100 ? '...' : ''}"
                              </div>
                            )}
                            
                            {(() => {
                              // Algorithm-based badges for buyers
                              const buyerBadges = [];
                              
                              // VERIFIED badge: Basic verification (phone + email)
                              if (buyer.phoneVerified && buyer.emailVerified) {
                                buyerBadges.push('verified');
                              }
                              
                              // RELIABLE badge: Good rating (4.0+) + decent purchases (10+)
                              if (buyer.rating >= 4.0 && buyer.totalPurchases >= 10) {
                                buyerBadges.push('reliable-buyer');
                              }
                              
                              // FAST badge: Quick response time (under 2 hours)
                              const buyerRt = buyer.responseTime || '';
                              const responseHours = parseFloat(buyerRt.replace(/[^0-9.]/g, ''));
                              const responseUnit = buyerRt.includes('m') ? 'minutes' : 'hours';
                              const actualHours = responseUnit === 'minutes' ? responseHours / 60 : responseHours;
                              if (actualHours <= 2) {
                                buyerBadges.push('fast-responder');
                              }
                              
                              return buyerBadges.length > 0 ? (
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                  {buyerBadges.map(badge => (
                                    <span
                                      key={badge}
                                      style={{
                                        background: badge === 'verified' ? '#4CAF50' : 
                                                  badge === 'reliable-buyer' ? '#2196F3' :
                                                  badge === 'fast-responder' ? '#9C27B0' : '#666',
                                        color: 'white',
                                        padding: '2px 4px',
                                        borderRadius: '3px',
                                        fontSize: '7px',
                                        fontWeight: 'bold'
                                      }}
                                    >
                                      {badge === 'verified' ? '🛡️ VERIFIED' :
                                       badge === 'reliable-buyer' ? '👤 RELIABLE' :
                                       badge === 'fast-responder' ? '⚡ FAST' :
                                       badge.toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveInterest(interest);
                            }}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '10px 15px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 2px 4px rgba(76, 175, 80, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectInterest(interest);
                            }}
                            style={{
                              flex: 1,
                              background: 'linear-gradient(135deg, #ff6b6b, #f44336)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '10px 15px',
                              fontSize: '13px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease',
                              boxShadow: '0 2px 4px rgba(244, 67, 54, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            ✗ Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
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
            alignItems: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
              ? 'center' // Center vertically on Android  
              : 'flex-start', // Keep higher on iOS
            justifyContent: 'center',
            padding: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
              ? '40px 15px 25px 15px' // More top padding on Android to move card down
              : '15px 15px 25px 15px', // Original iOS padding
            minHeight: 'calc(100vh - 170px)'
          }}>
            <div style={{
              textAlign: 'center',
              color: 'white',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '20px',
              padding: '40px 30px 80px 30px',
              width: '100%',
              maxWidth: '500px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              paddingTop: '60px',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
                <button
                  onClick={() => updateState({ showMyListings: false, showAddItem: false })}
                  style={{
                    background: !appState.showMyListings ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                    color: !appState.showMyListings ? '#667eea' : 'white',
                    border: !appState.showMyListings ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '15px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📋 Sell Items
                </button>
                <button
                  onClick={() => updateState({ showMyListings: true, showAddItem: false })}
                  style={{
                    background: appState.showMyListings ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                    color: appState.showMyListings ? '#667eea' : 'white',
                    border: appState.showMyListings ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '15px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📋 My Listings ({appState.userListings?.length || 0})
                </button>
              </div>
              
              <div style={{ fontSize: '64px', marginBottom: '15px' }}>📸</div>
              <h2 style={{ marginBottom: '15px', fontSize: '28px', fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>Sell Your Items</h2>
              <p style={{ marginBottom: '25px', fontSize: '17px', lineHeight: '1.6', opacity: '0.95', maxWidth: '320px' }}>
                List your items and let buyers discover them through our addictive swipe interface.
              </p>
              <button
                onClick={() => updateState({ showAddItem: true })}
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '18px 35px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '0 auto',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  transform: 'scale(1)'
                }}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              >
                📸 Add Your First Item
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
              onClick={() => updateState({ showAddItem: false, selectedImages: [], newItemTitle: '', newItemPrice: '', newItemDescription: '', newItemCondition: '', newItemCity: '' })}
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
            <h3 style={{ color: '#333', marginBottom: '8px', fontSize: '16px' }}>📸 Photos (up to 4)</h3>
            <p style={{ color: '#666', fontSize: '12px', marginBottom: '15px' }}>
              🛡️ <strong>Quick verification:</strong> Take a photo with your camera or choose from your library. You'll answer a quick question per photo to help prevent fake listings. First photo will be the main image.
            </p>
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
                  {/* Set as Primary button for all photos */}
                  <button
                    onClick={() => {
                      // Move this photo to the front
                      const newImages = [...appState.selectedImages];
                      const [movedImage] = newImages.splice(index, 1);
                      newImages.unshift(movedImage);
                      updateState({ selectedImages: newImages });
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '5px',
                      left: '5px',
                      background: index === 0 ? 'rgba(76, 175, 80, 0.9)' : 'rgba(102, 126, 234, 0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {index === 0 ? 'Primary' : 'Set as Primary'}
                  </button>
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Remove this photo?')) {
                        const newImages = appState.selectedImages.filter((_, i) => i !== index);
                        updateState({ selectedImages: newImages });
                      }
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
              
              {(!appState.selectedImages || appState.selectedImages.length < 4) && (
                <>
                <div onClick={() => captureListingPhotoWithCamera('add')} style={{
                  aspectRatio: '1/1',
                  border: '2px dashed #4CAF50',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #f0f9f0, #e8f5e8)',
                  transition: 'all 0.2s ease',
                  minWidth: '120px',
                  height: '120px',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.1)'
                }}>
                  <Camera size={24} style={{ color: '#4CAF50', marginBottom: '5px' }} />
                  <span style={{ fontSize: '12px', color: '#4CAF50', textAlign: 'center', fontWeight: '600' }}>Take Photo</span>
                  <span style={{ fontSize: '9px', color: '#666', textAlign: 'center', marginTop: '2px' }}>Camera 📷</span>
                </div>

                <label htmlFor="library-upload" style={{
                  aspectRatio: '1/1',
                  border: '2px dashed #667eea',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #f0f3ff, #e8ecff)',
                  transition: 'all 0.2s ease',
                  minWidth: '120px',
                  height: '120px',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.1)'
                }}>
                  <span style={{ fontSize: '24px', marginBottom: '5px' }}>🖼️</span>
                  <span style={{ fontSize: '12px', color: '#667eea', textAlign: 'center', fontWeight: '600' }}>Choose Photo</span>
                  <span style={{ fontSize: '9px', color: '#666', textAlign: 'center', marginTop: '2px' }}>From Library</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    id="library-upload"
                    onChange={(e) => { addListingPhotos(e.target.files, 'library'); e.target.value = ''; }}
                  />
                </label>
                </>
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#333', fontWeight: 'bold' }}>
              City *
            </label>
            <select
              value={appState.newItemCity || ''}
              onChange={(e) => updateState({ newItemCity: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: 'white'
              }}
            >
              <option value="">Select a city…</option>
              {SUPPORTED_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
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
            onClick={async () => {
              if (!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.newItemCity) {
                alert('Please fill in all required fields');
                return;
              }

              if (!appState.selectedImages || appState.selectedImages.length === 0) {
                alert('Please add at least one photo');
                return;
              }

              const listingId = 'listing_' + Date.now();
              const sellerId = user?.uid || user?.id || 'user123';

              // Upload each photo to Firebase Storage and keep only the (tiny)
              // download URL. Storing base64 photos in the listing bloats
              // localStorage/Firestore past their limits, so listings silently
              // failed to persist. Falls back to the data URL if an upload fails
              // (so the photo still shows this session).
              updateState({ loading: true });
              const uploadedImages = [];
              for (let i = 0; i < appState.selectedImages.length; i++) {
                const img = appState.selectedImages[i];
                let finalUrl = img.url;
                try {
                  const res = await firebaseNative.uploadDataUrl(`item-photos/${listingId}/${i}_${Date.now()}.jpg`, img.url);
                  if (res && res.success && res.url) finalUrl = res.url;
                } catch (e) {
                  console.warn('Listing photo upload failed; keeping local image:', e?.message);
                }
                uploadedImages.push({ url: finalUrl, name: img.name });
              }
              updateState({ loading: false });

              // Create new listing object
              const newListing = {
                id: listingId,
                title: SecurityUtils.sanitizeInputFinal(appState.newItemTitle),
                price: appState.newItemPrice,
                condition: appState.newItemCondition,
                city: SecurityUtils.sanitizeInputFinal(appState.newItemCity),
                // also set `location` since the feed filter checks city||location
                location: SecurityUtils.sanitizeInputFinal(appState.newItemCity),
                description: SecurityUtils.sanitizeInputFinal(appState.newItemDescription),
                images: uploadedImages,
                // The feed/saved cards render item.image_url; set it to the first
                // photo so listings actually show their image (not just `images[]`).
                image_url: (uploadedImages[0] && uploadedImages[0].url) || '',
                seller_id: sellerId,
                seller_name: user?.displayName || user?.username || 'You',
                created_at: Date.now(),
                status: 'active'
              };

              // Persist to the shared Firestore items collection (REST, works on
              // iOS) so the listing reaches EVERY user's feed cross-device, not
              // just this device. Photos are already Storage URLs (small). Falls
              // back to the local object if the write fails, so the listing still
              // shows + persists locally.
              let savedListing = newListing;
              try {
                const res = await firebaseNative.createItem(newListing);
                if (res && res.success && res.item) {
                  savedListing = { ...newListing, ...res.item };
                } else {
                  // Backend unavailable (e.g. rules not deployed) — keep a local copy.
                  await DataService.createItem(newListing).catch(() => {});
                }
              } catch (err) {
                console.warn('createItem failed; keeping listing locally:', err?.message);
              }

              // Surface it in the buyer feed immediately. Merge onto the CURRENT
              // feed (seeded items, or the mock fallback when seeded is empty) so
              // the feed never collapses to just this one item.
              setSeededItems(prev => {
                const base = (prev && prev.length > 0) ? prev : mockItems;
                return [savedListing, ...base];
              });

              // Add to user listings
              const newUserListings = [...(appState.userListings || []), savedListing];
              updateState({
                userListings: newUserListings,
                showAddItem: false,
                selectedImages: [],
                newItemTitle: '',
                newItemPrice: '',
                newItemDescription: '',
                newItemCondition: '',
                newItemCity: ''
              });

              // Persist the seller's own listings locally (keyed by uid) so they
              // survive relaunch independent of the unreliable web SDK. Guarded:
              // listing photos are data URLs, so a write can hit the storage
              // quota — best-effort, never crash.
              if (user?.uid) {
                try {
                  localStorage.setItem('swipecity_my_listings_' + user.uid, JSON.stringify(newUserListings));
                } catch (e) {
                  console.warn('[storage] could not persist my listings:', e?.message);
                }
              }

              alert('Item listed successfully! 🎉');
            }}
            disabled={!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.newItemCity || !appState.selectedImages || appState.selectedImages.length === 0}
            style={{
              width: '100%',
              background: (!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.newItemCity || !appState.selectedImages || appState.selectedImages.length === 0) ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: (!appState.newItemTitle || !appState.newItemPrice || !appState.newItemCondition || !appState.newItemCity || !appState.selectedImages || appState.selectedImages.length === 0) ? 'not-allowed' : 'pointer'
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
            top: 'max(0px, env(safe-area-inset-top))',
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
                    fontSize: '16px',
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
                    fontSize: '16px',
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
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Photo Editing Section */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#333', marginBottom: '8px', fontSize: '16px' }}>Photos (up to 4)</h3>
                <p style={{ color: '#666', fontSize: '12px', marginBottom: '15px' }}>
                  First photo will be the main image. Tap ★ to see main photo.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '10px',
                  marginBottom: '15px'
                }}>
                  {appState.editImages && appState.editImages.map((image, index) => (
                    <div key={index} style={{
                      position: 'relative',
                      aspectRatio: '1/1',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: '#f5f5f5'
                    }}>
                      <img
                        src={image.url || image}
                        alt={`Edit ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {/* Set as Primary button for all photos */}
                      <button
                        onClick={() => {
                          // Move this photo to the front
                          const newImages = [...appState.editImages];
                          const [movedImage] = newImages.splice(index, 1);
                          newImages.unshift(movedImage);
                          updateState({ editImages: newImages });
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '5px',
                          left: '5px',
                          background: index === 0 ? 'rgba(76, 175, 80, 0.9)' : 'rgba(102, 126, 234, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {index === 0 ? 'Primary' : 'Set as Primary'}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (window.confirm('Remove this photo?')) {
                            const newImages = appState.editImages.filter((_, i) => i !== index);
                            updateState({ editImages: newImages });
                          }
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
                  
                  {(!appState.editImages || appState.editImages.length < 4) && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <label htmlFor="edit-photo-upload" style={{
                        aspectRatio: '1/1',
                        border: '2px dashed #ddd',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: '#f9f9f9',
                        transition: 'all 0.2s ease',
                        minWidth: '80px',
                        height: '80px'
                      }}>
                        <Camera size={20} style={{ color: '#666', marginBottom: '3px' }} />
                        <span style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          id="edit-photo-upload"
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            const currentImages = appState.editImages || [];
                            
                            if (currentImages.length + files.length > 4) {
                              alert('Maximum 4 photos allowed');
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
                                  editImages: [...(appState.editImages || []), newImage] 
                                });
                              };
                              reader.readAsDataURL(file);
                            });
                          }}
                        />
                      </label>
                      
                      <div onClick={() => captureListingPhotoWithCamera('edit')} style={{
                        aspectRatio: '1/1',
                        border: '2px dashed #4CAF50',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: '#f0f8f0',
                        transition: 'all 0.2s ease',
                        minWidth: '80px',
                        height: '80px'
                      }}>
                        <Camera size={20} style={{ color: '#4CAF50', marginBottom: '3px' }} />
                        <span style={{ fontSize: '10px', color: '#4CAF50', textAlign: 'center' }}>Camera</span>
                      </div>
                    </div>
                  )}
                </div>
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

        {/* Chat List Modal */}
        {appState.showChats && !appState.activeChat && (
            <div style={{
              position: 'fixed',
              top: 'max(0px, env(safe-area-inset-top))',
              left: 0,
              right: 0,
              bottom: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android' 
                ? '75px' // Leave room for bottom nav on Android
                : '60px', // Leave room for bottom nav on iOS
              background: 'white',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column'
            }}>
            <div style={{
              padding: '15px 20px',
              paddingTop: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
                ? (isDevelopment ? 'max(60px, env(safe-area-inset-top) + 45px)' : 'max(30px, env(safe-area-inset-top) + 15px)') // Extra padding only in development
                : 'max(15px, env(safe-area-inset-top))', // Original iOS padding
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>💬 Messages</h2>
              <CloseButton 
                onClick={() => {
                  console.log('Chat list close button clicked');
                  updateState({ showChats: false });
                }}
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {appState.chats && appState.chats.length > 0 ? (
                appState.chats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => openChat(chat)}
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
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                        {appState.currentMode === 'seller' 
                          ? chat.buyer_name 
                          : chat.seller_name}
                      </h4>
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

        {/* Profile Panel — DISABLED: this seller-branch panel duplicated the
            shared profile panel below (which renders in both modes), causing two
            overlapping panels in seller mode. The shared panel is the full-featured
            one (real dashboard + Delete Account). This block also held a dead
            "View Analytics" button. Kept disabled rather than deleted to avoid a
            risky ~800-line removal in this render tree. */}
        {false && appState.showProfile && (
          <div style={{
            position: 'fixed',
            top: 'max(0px, env(safe-area-inset-top))',
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
                <CloseButton 
                  onClick={() => {
                    console.log('Profile close button clicked');
                    updateState({ showProfile: false });
                  }}
                  color="#333"
                  backgroundColor="rgba(0,0,0,0.1)"
                />
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  cursor: 'pointer'
                }}
                onClick={chooseProfilePhoto}
                >
                  <img
                    key={`profile-photo-${userProfile?.photoUpdatedAt || user?.photoUpdatedAt || appState.lastPhotoUpdate || appState.forcePhotoRefresh || 'default'}`}
                    src={userProfile?.photoURL || userProfile?.avatar_url || user?.photoURL || user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || user?.name || user?.displayName || user?.email || 'User')}&background=667eea&color=white&size=120`}
                    alt="Profile"
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #667eea',
                      opacity: appState.uploadingPhoto ? 0.7 : 1,
                      display: 'block'
                    }}
                    onLoad={() => console.log('📷 [ANDROID] Image loaded successfully')}
                    onError={(e) => console.log('📷 [ANDROID] Image failed to load:', e)}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '24px',
                    height: '24px',
                    background: '#667eea',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                    fontSize: '12px'
                  }}>
                    📷
                  </div>
                </div>
                <input
                  id="buyer-profile-photo-input"
                  type="file"
                  accept="image/*"
                  capture="user"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file && user) {
                      console.log('📷 Starting photo upload process...');
                      console.log('File:', file.name, file.size, 'bytes');
                      
                      // IMMEDIATE: Force refresh key FIRST to prepare for photo display
                      const refreshKey = Math.random();
                      updateState(prevState => ({ 
                        ...prevState,
                        forcePhotoRefresh: refreshKey,
                        uploadingPhoto: true
                      }));
                      
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        const imageUrl = event.target.result;
                        console.log('📷 [ANDROID] Photo loaded, size:', imageUrl.length, 'bytes');
                        
                        // Get fresh user data from localStorage
                        const currentUser = safeParseLocal('swipecity_demo_user');
                        console.log('📷 [ANDROID] Current user:', currentUser.email);
                        
                        // Create updated user with photo
                        const updatedUser = { 
                          ...currentUser,
                          ...user, // Merge with current user from context
                          photoURL: imageUrl,
                          avatar_url: imageUrl, // Store in both fields for compatibility
                          onboardingComplete: true,
                          photoUpdatedAt: Date.now()
                        };
                        
                        // Save to ALL localStorage keys to ensure persistence
                        localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedUser));
                        localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedUser));
                        localStorage.setItem('swipecity_user', JSON.stringify(updatedUser));
                        
                        // Also save to user-specific key
                        if (updatedUser.email) {
                          const userKey = `swipecity_user_${updatedUser.email.replace(/[@+.]/g, '_')}`;
                          localStorage.setItem(userKey, JSON.stringify(updatedUser));
                        }
                        
                        console.log('📷 [ANDROID] Photo saved to localStorage');
                        
                        // Update app state FIRST with photo refresh
                        updateState(prevState => ({ 
                          ...prevState,
                          uploadingPhoto: false,
                          photoUploadMessage: 'Photo saved!',
                          lastPhotoUpdate: Date.now(),
                          forcePhotoRefresh: refreshKey // Same key to trigger re-render
                        }));
                        
                        // THEN update user contexts in next tick to ensure state is ready
                        setTimeout(() => {
                          console.log('📷 [ANDROID] Updating user contexts...');
                          setUser(() => ({ ...updatedUser }));
                          setUserProfile(() => ({ ...updatedUser }));
                          setGlobalUser(() => ({ ...updatedUser }));
                          
                          console.log('📷 [ANDROID] Photo display should update now');
                        }, 50);
                        
                        setTimeout(() => updateState({ photoUploadMessage: null }), 2000);
                        
                        // Try Firebase sync in background (don't wait for it)
                        if (window.firebaseServices?.firestore && user.uid) {
                          window.firebaseServices.firestore.updateUserProfile(user.uid, { 
                            photoURL: imageUrl,
                            avatar_url: imageUrl 
                          }).catch(err => console.log('Firebase sync failed:', err));
                        }
                      };
                      reader.readAsDataURL(file);
                      
                      // BACKGROUND: Upload to Firebase Storage for persistence
                      updateState({ uploadingPhoto: true });
                      
                      setTimeout(async () => {
                        try {
                          const platform = window.Capacitor?.getPlatform?.() || 'web';
                          
                          // Skip Firebase upload on iOS
                          if (platform === 'ios') {
                            console.log('📷 [IOS] Skipping Firebase Storage upload - iOS offline mode');
                            return;
                          }
                          
                          console.log(`📷 [${platform.toUpperCase()}] Starting Firebase Storage upload...`);
                          const { initializeFirebaseServices, getStorageService } = await import('./services/firebase');
                          await initializeFirebaseServices();
                          const storageService = getStorageService();
                          
                          const userId = user.uid || user.id || `user_${Date.now()}`;
                          const uploadPath = `profile-photos/${userId}/${Date.now()}_${file.name}`;
                          
                          const result = await storageService.uploadImage(file, uploadPath);
                          
                          if (result.success && result.url) {
                            console.log('✅ [ANDROID] Firebase Storage upload successful:', result.url);
                            
                            // Get current user data
                            const currentUser = safeParseLocal('swipecity_demo_user');
                            const updatedUserWithFirebaseURL = { 
                              ...currentUser,
                              photoURL: result.url, // Update to Firebase URL
                              avatar_url: result.url,
                              photoUpdatedAt: Date.now()
                            };
                            
                            // Save Firebase URL to ALL localStorage keys
                            localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedUserWithFirebaseURL));
                            localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedUserWithFirebaseURL));
                            localStorage.setItem('swipecity_user', JSON.stringify(updatedUserWithFirebaseURL));
                            
                            if (updatedUserWithFirebaseURL.email) {
                              const userKey = `swipecity_user_${updatedUserWithFirebaseURL.email.replace(/[@+.]/g, '_')}`;
                              localStorage.setItem(userKey, JSON.stringify(updatedUserWithFirebaseURL));
                            }
                            
                            // Update ALL state contexts with Firebase URL
                            setUser(() => updatedUserWithFirebaseURL);
                            setUserProfile(() => updatedUserWithFirebaseURL);
                            setGlobalUser(() => updatedUserWithFirebaseURL);
                            
                            // Also save Firebase URL to Firestore for cross-device sync
                            if (window.firebaseServices?.firestore && user.uid) {
                              try {
                                await window.firebaseServices.firestore.updateUserProfile(user.uid, { 
                                  photoURL: result.url,
                                  avatar_url: result.url 
                                });
                                console.log('✅ [ANDROID] Photo URL saved to Firestore for cross-device sync');
                              } catch (error) {
                                console.log('⚠️ [ANDROID] Firestore save failed:', error.message);
                              }
                            }
                            
                            updateState({ photoUploadMessage: 'Photo synced to cloud!' });
                            setTimeout(() => updateState({ photoUploadMessage: null }), 2000);
                          }
                        } catch (error) {
                          console.log('📱 [ANDROID] Firebase upload failed, using local photo:', error.message);
                        } finally {
                          updateState({ uploadingPhoto: false });
                        }
                      }, 500); // Small delay to ensure local display happens first
                    }
                    // Reset input
                    e.target.value = '';
                  }}
                />
                <h4 style={{ margin: '0 0 5px 0' }}>{user?.username}</h4>
                <p style={{ color: '#666', margin: '0 0 10px 0', fontSize: '14px' }}>{user?.email}</p>
                
                {/* Bio Section */}
                <div style={{ marginBottom: '15px' }}>
                  {appState.editingBio ? (
                    <div style={{ textAlign: 'center' }}>
                      <textarea
                        value={appState.tempBio}
                        onChange={(e) => updateState({ tempBio: e.target.value })}
                        placeholder="Tell others about yourself... (e.g., 'Trusted seller with quick responses' or 'Careful buyer, always pays promptly')"
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '16px', // Prevent iOS zoom by using 16px or larger
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          touchAction: 'manipulation',
                          userSelect: 'text',
                          WebkitUserSelect: 'text'
                        }}
                        maxLength={200}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => {
                            console.log('📝 [ANDROID] Cancel button clicked');
                            // Close without saving
                            updateState({ 
                              editingBio: false, 
                              tempBio: ''
                            });
                          }}
                          style={{
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            minHeight: '36px',
                            minWidth: '80px',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            const platform = window.Capacitor?.getPlatform?.() || 'web';
                            console.log(`📝 [${platform.toUpperCase()}] Save button clicked!`);
                            console.log(`📝 [${platform.toUpperCase()}] Current tempBio:`, appState.tempBio);
                            
                            // Get ALL user data
                            const currentUser = safeParseLocal('swipecity_demo_user');
                            console.log(`📝 [${platform.toUpperCase()}] Current user from localStorage:`, currentUser.email);
                            
                            const updatedUser = { 
                              ...currentUser,
                              ...user, // Merge with context user
                              bio: appState.tempBio,
                              onboardingComplete: true,
                              bioUpdatedAt: Date.now()
                            };
                            
                            console.log(`📝 [${platform.toUpperCase()}] Updated user bio:`, updatedUser.bio);
                            
                            // Save to ALL localStorage keys
                            localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedUser));
                            localStorage.setItem('swipecity_mock_user', JSON.stringify(updatedUser));
                            localStorage.setItem('swipecity_user', JSON.stringify(updatedUser));
                            
                            if (updatedUser.email) {
                              const userKey = `swipecity_user_${updatedUser.email.replace(/[@+.]/g, '_')}`;
                              localStorage.setItem(userKey, JSON.stringify(updatedUser));
                              console.log(`📝 [${platform.toUpperCase()}] Bio saved to user-specific key:`, userKey);
                            }
                            
                            console.log(`📝 [${platform.toUpperCase()}] Bio saved to localStorage`);
                            
                            // Force update ALL state contexts with delay for iOS
                            setTimeout(() => {
                              console.log(`📝 [${platform.toUpperCase()}] Updating user contexts...`);
                              setUser(() => ({ ...updatedUser }));
                              setUserProfile(() => ({ ...updatedUser }));
                              setGlobalUser(() => ({ ...updatedUser }));
                              console.log(`📝 [${platform.toUpperCase()}] User contexts updated`);
                            }, platform === 'ios' ? 100 : 0);
                            
                            // Try Firebase sync in background (will be skipped on iOS)
                            if (window.firebaseServices?.firestore && user.uid) {
                              console.log(`📝 [${platform.toUpperCase()}] Syncing bio to Firebase...`);
                              window.firebaseServices.firestore.updateUserProfile(user.uid, { bio: appState.tempBio })
                                .then(() => console.log(`📝 [${platform.toUpperCase()}] Bio synced to Firebase`))
                                .catch(err => console.log('Firebase bio sync failed:', err));
                            } else {
                              console.log(`📝 [${platform.toUpperCase()}] Skipping Firebase sync (offline mode)`);
                            }
                            
                            // Close bio editor
                            updateState({ 
                              editingBio: false, 
                              tempBio: '', 
                              savedBio: appState.tempBio,
                              onboardingStep: 1
                            });
                            
                            console.log(`📝 [${platform.toUpperCase()}] Bio saved and modal closed`);
                          }}
                          style={{
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            minHeight: '36px',
                            minWidth: '80px',
                            touchAction: 'manipulation',
                            WebkitTapHighlightColor: 'transparent'
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={() => updateState({ editingBio: true, tempBio: user?.bio || '' })}
                      style={{ 
                        cursor: 'pointer',
                        background: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '8px',
                        minHeight: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed #ddd'
                      }}
                    >
                      <p style={{ 
                        color: (user?.bio || appState.savedBio) ? '#333' : '#999', 
                        margin: 0, 
                        fontSize: '12px', 
                        textAlign: 'center',
                        fontStyle: (user?.bio || appState.savedBio) ? 'normal' : 'italic'
                      }}>
                        {user?.bio || appState.savedBio || 'Add a bio to build trust with buyers and sellers • Click to edit'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {appState.currentMode === 'buyer' ? (
                <>
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
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ marginBottom: '15px' }}>Seller Dashboard</h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{
                        background: '#f5f5f5',
                        borderRadius: '10px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>12</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Active Listings</div>
                      </div>
                      
                      <div style={{
                        background: '#f5f5f5',
                        borderRadius: '10px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>8</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Sales Completed</div>
                      </div>
                      
                      <div style={{
                        background: '#f5f5f5',
                        borderRadius: '10px',
                        padding: '15px',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>2.3h</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>Avg Response Time</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <button
                      style={{
                        width: '100%',
                        background: '#4CAF50',
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
                      📊 View Analytics
                    </button>
                  </div>
                </>
              )}

              <button
                onClick={async () => {
                  try {
                    const result = await signOut();
                    if (result.success) {
                      // Also reset global app state
                      setGlobalUser(null);
                      // Reset app state including onboarding step
                      updateState({ 
                        onboardingStep: 1,
                        editingBio: false,
                        tempBio: '',
                        savedBio: ''
                      });
                    } else {
                      console.error('❌ Sign out failed:', result.error);
                      alert('Sign out failed: ' + (result.error || 'Unknown error'));
                    }
                  } catch (error) {
                    console.error('❌ Sign out failed:', error);
                    alert('Sign out failed. Please try again.');
                  }
                }}
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
        
    </div>
      )}
      
      {/* Shared Modals - Available in both modes */}
      {/* Individual Chat Modal */}
      {appState.activeChat && (
        <div style={{
          position: 'fixed',
          top: 'max(0px, env(safe-area-inset-top))',
          left: 0,
          right: 0,
          bottom: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android' 
            ? '75px' // Leave room for bottom nav on Android
            : '60px', // Leave room for bottom nav on iOS
          background: 'white',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '15px 20px',
            paddingTop: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
              ? (isDevelopment ? 'max(60px, env(safe-area-inset-top) + 45px)' : 'max(30px, env(safe-area-inset-top) + 15px)') // Extra padding only in development
              : 'max(15px, env(safe-area-inset-top))', // Original iOS padding
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
                  width: '44px',
                  height: '44px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '20px',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ←
              </button>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  {appState.currentMode === 'seller' 
                    ? appState.activeChat.buyer_name 
                    : appState.activeChat.seller_name}
                </h3>
                <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{appState.activeChat.item_title}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                updateState({ showChats: false, activeChat: null });
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1002
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
            paddingBottom: 'max(15px, env(safe-area-inset-bottom))',
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
                if (e.key === 'Enter') {
                  sendMessage(appState.newMessage);
                }
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '25px',
                border: '1px solid #ddd',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => {
                sendMessage(appState.newMessage);
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

      {/* Chat List Modal */}
      {appState.showChats && !appState.activeChat && (
        <div style={{
          position: 'fixed',
          top: 'max(0px, env(safe-area-inset-top))',
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
            paddingTop: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
              ? (isDevelopment ? 'max(60px, env(safe-area-inset-top) + 45px)' : 'max(30px, env(safe-area-inset-top) + 15px)') // Extra padding only in development
              : 'max(15px, env(safe-area-inset-top))', // Original iOS padding
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>💬 Messages</h2>
            <CloseButton 
              onClick={() => {
                updateState({ showChats: false });
              }}
            />
          </div>
          
          <div style={{ flex: 1, overflow: 'auto' }}>
            {appState.chats.length === 0 ? (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: '#666'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>💬</div>
                <h3 style={{ marginBottom: '10px' }}>No messages yet</h3>
                <p>Start swiping to connect with sellers!</p>
              </div>
            ) : (
              appState.chats.map((chat, i) => (
                <div
                  key={i}
                  onClick={() => openChat(chat)}
                  style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                        {appState.currentMode === 'seller' 
                          ? chat.buyer_name 
                          : chat.seller_name}
                      </h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#666' }}>{chat.item_title}</p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>
                        {chat.messages && chat.messages.length > 0 
                          ? chat.messages[chat.messages.length - 1].text
                          : 'Start a conversation...'}
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      {chat.messages && chat.messages.length > 0 
                        ? chat.messages[chat.messages.length - 1].timestamp
                        : 'now'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Profile Panel */}
      {appState.showProfile && (
        <div style={{
          position: 'fixed',
          top: 'max(0px, env(safe-area-inset-top))',
          right: 0,
          bottom: 0,
          width: '300px',
          background: 'white',
          boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
          zIndex: 1000,
          transform: 'translateX(0)',
          transition: 'transform 0.3s ease',
          // Make the panel scrollable: in seller mode the dashboard pushed the
          // Sign Out / Delete Account buttons off the bottom with no way to reach
          // them. Account deletion must be reachable (App Store 5.1.1(v)).
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <div style={{ padding: '20px', paddingBottom: 'max(90px, env(safe-area-inset-bottom) + 90px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Profile</h3>
              <CloseButton 
                onClick={() => {
                  updateState({ showProfile: false });
                }}
                color="#333"
                backgroundColor="rgba(0,0,0,0.1)"
              />
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div 
                style={{ 
                  position: 'relative', 
                  display: 'inline-block',
                  marginBottom: '15px',
                  cursor: 'pointer'
                }}
                onClick={chooseProfilePhoto}
              >
                <img
                  key={`seller-profile-photo-${userProfile?.photoUpdatedAt || user?.photoUpdatedAt || appState.lastPhotoUpdate || appState.forcePhotoRefresh || 'default'}`}
                  src={userProfile?.photoURL || userProfile?.avatar_url || user?.photoURL || user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || user?.name || user?.displayName || user?.email || 'User')}&background=667eea&color=white&size=120`}
                  alt="Profile"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #667eea',
                    opacity: appState.uploadingPhoto ? 0.7 : 1,
                    display: 'block'
                  }}
                  onLoad={() => console.log('📷 [ANDROID] Seller mode image loaded successfully')}
                  onError={(e) => console.log('📷 [ANDROID] Seller mode image failed to load:', e)}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  background: '#667eea',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid white',
                  fontSize: '12px'
                }}>
                  📷
                </div>
              </div>
              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                capture="user"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file && user) {
                    console.log('📷 Starting photo upload process...');
                    console.log('File:', file.name, file.size, 'bytes');
                    
                    // IMMEDIATE: Show photo right away using simple auth context
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      const imageUrl = event.target.result;
                      console.log('📷 Photo loaded, updating user profile...');
                      
                      // Update the current user profile with the new photo (preserve onboarding status)
                      const currentUser = safeParseLocal('swipecity_demo_user');
                      const updatedUser = { 
                        ...currentUser, 
                        photoURL: imageUrl,
                        // Force onboarding complete to prevent going back to onboarding
                        onboardingComplete: true
                      };
                      localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedUser));
                      
                      // Also save to user-specific key for persistence across logins
                      const userKey = `swipecity_user_${updatedUser.email.replace(/[@+.]/g, '_')}`;
                      localStorage.setItem(userKey, JSON.stringify(updatedUser));
                      
                      console.log('📷 Photo update - setting user with onboardingComplete:', updatedUser.onboardingComplete);
                      
                      // Update state immediately for both auth context and global - force updates
                      setUser(() => updatedUser);
                      setUserProfile(() => updatedUser);
                      setGlobalUser(() => updatedUser);
                      
                      // Force a re-render by updating app state
                      updateState(prevState => ({ 
                        ...prevState,
                        photoUploadMessage: 'Photo saved!',
                        lastPhotoUpdate: Date.now(),
                        forcePhotoRefresh: Math.random()
                      }));
                      
                      // Double-check the image is showing
                      setTimeout(() => {
                        setUser(prev => ({ ...updatedUser }));
                        setUserProfile(prev => ({ ...updatedUser }));
                        setGlobalUser(prev => ({ ...updatedUser }));
                      }, 100);
                      
                      // Also try to save to Firebase Firestore for cross-device sync
                      if (window.firebaseServices?.firestore && user.uid) {
                        try {
                          await window.firebaseServices.firestore.updateUserProfile(user.uid, { photoURL: imageUrl });
                          console.log('📷 Photo saved to Firebase for cross-device sync');
                        } catch (error) {
                          console.log('📷 Firebase profile save failed (offline mode):', error.message);
                        }
                      }
                      
                      console.log('📷 Photo updated successfully');
                    };
                    reader.readAsDataURL(file);
                    
                    // BACKGROUND: Attempt Firebase upload (non-blocking)
                    updateState({ uploadingPhoto: true });
                    
                    try {
                      const platform = window.Capacitor?.getPlatform?.() || 'web';
                      
                      // Skip Firebase upload on iOS  
                      if (platform === 'ios') {
                        console.log('📷 [IOS] Skipping Firebase Storage upload - iOS offline mode');
                        return;
                      }
                      
                      console.log(`📷 [${platform.toUpperCase()}] Attempting background upload to Firebase...`);
                      const { initializeFirebaseServices, getStorageService } = await import('./services/firebase');
                      initializeFirebaseServices();
                      const storageService = getStorageService();
                      
                      const userId = user.id || `user_${Date.now()}`;
                      const uploadPath = `profile-photos/${userId}/${Date.now()}_${file.name}`;
                      
                      // Try upload with short timeout (don't make user wait)
                      const uploadPromise = storageService.uploadImage(file, uploadPath);
                      const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Background upload timeout')), 8000);
                      });
                      
                      const result = await Promise.race([uploadPromise, timeoutPromise]);
                      
                      if (result.success) {
                        // SUCCESS: Update to use Firebase URL 
                        console.log('✅ [ANDROID DEBUG] Seller mode Firebase upload successful:', result.url);
                        
                        // Get current user data and update with Firebase URL
                        const currentUser = safeParseLocal('swipecity_demo_user');
                        const updatedUserWithFirebaseURL = { 
                          ...currentUser, 
                          photoURL: result.url, // Use Firebase URL instead of data URL
                          avatar_url: result.url,
                          photoUpdatedAt: Date.now()
                        };
                        
                        // Save updated user with Firebase URL
                        localStorage.setItem('swipecity_demo_user', JSON.stringify(updatedUserWithFirebaseURL));
                        const userKey = `swipecity_user_${updatedUserWithFirebaseURL.email.replace(/[@+.]/g, '_')}`;
                        localStorage.setItem(userKey, JSON.stringify(updatedUserWithFirebaseURL));
                        
                        console.log('✅ [ANDROID DEBUG] Seller mode updated user with Firebase URL saved to localStorage');
                        
                        // Update ALL state contexts with Firebase URL
                        setUser({...updatedUserWithFirebaseURL});
                        setUserProfile({...updatedUserWithFirebaseURL});
                        setGlobalUser({...updatedUserWithFirebaseURL});
                        
                        console.log('✅ [ANDROID DEBUG] Seller mode all state contexts updated with Firebase URL');
                        
                        // Also save Firebase URL to Firestore for cross-device sync
                        if (window.firebaseServices?.firestore && user.uid) {
                          try {
                            await window.firebaseServices.firestore.updateUserProfile(user.uid, { 
                              photoURL: result.url,
                              avatar_url: result.url 
                            });
                            console.log('✅ [ANDROID DEBUG] Seller mode Firebase URL also saved to Firestore');
                          } catch (error) {
                            console.log('⚠️ [ANDROID DEBUG] Seller mode failed to save Firebase URL to Firestore:', error.message);
                          }
                        }
                        
                        updateState({ photoUploadMessage: 'Photo synced to cloud!' });
                        setTimeout(() => updateState({ photoUploadMessage: null }), 2000);
                      } else {
                        throw new Error(result.error || 'Upload failed');
                      }
                    } catch (error) {
                      // GRACEFUL FAILURE: User already has their photo, just log the issue
                      console.log('📱 Using local photo (cloud sync failed):', error.message);
                      updateState({ photoUploadMessage: 'Photo saved locally' });
                      setTimeout(() => updateState({ photoUploadMessage: null }), 2000);
                    } finally {
                      updateState({ uploadingPhoto: false });
                    }
                  }
                  // Reset input
                  e.target.value = '';
                }}
              />
              <h4 style={{ margin: '0 0 5px 0' }}>{user?.username}</h4>
              <p style={{ color: '#666', margin: '0 0 5px 0', fontSize: '14px' }}>{user?.email}</p>
              <p style={{ color: '#999', margin: '0 0 5px 0', fontSize: '11px', fontStyle: 'italic' }}>
                {appState.uploadingPhoto ? '⏳ Uploading...' : 'Tap photo to change'}
              </p>
              
              {/* Photo Upload Status */}
              {appState.photoUploadMessage && (
                <p style={{ 
                  color: appState.photoUploadMessage.includes('failed') ? '#ef4444' : '#10b981', 
                  margin: '0 0 10px 0', 
                  fontSize: '12px', 
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  {appState.photoUploadMessage}
                </p>
              )}
              
              {/* Bio Section */}
              <div style={{ marginBottom: '15px' }}>
                {appState.editingBio ? (
                  <div style={{ textAlign: 'center' }}>
                    <textarea
                      value={appState.tempBio}
                      onChange={(e) => updateState({ tempBio: e.target.value })}
                      placeholder="Tell others about yourself... (e.g., 'Trusted seller with quick responses' or 'Careful buyer, always pays promptly')"
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '16px', // Prevent iOS zoom by using 16px or larger
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        touchAction: 'manipulation',
                        userSelect: 'text',
                        WebkitUserSelect: 'text'
                      }}
                      maxLength={200}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          // Close without saving
                          updateState({ 
                            editingBio: false, 
                            tempBio: ''
                          });
                        }}
                        style={{
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          minHeight: '36px',
                          minWidth: '80px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const platform = window.Capacitor?.getPlatform?.() || 'web';
                          console.log(`📝 [${platform.toUpperCase()}] Seller mode bio save clicked!`);
                          console.log(`📝 [${platform.toUpperCase()}] Current tempBio:`, appState.tempBio);
                          
                          // Get ALL user data
                          const currentUser = safeParseLocal('swipecity_demo_user');
                          console.log(`📝 [${platform.toUpperCase()}] Current user from localStorage:`, currentUser.email);
                          
                          const updatedUser = { 
                            ...currentUser,
                            ...user, // Merge with context user
                            bio: appState.tempBio,
                            onboardingComplete: true,
                            bioUpdatedAt: Date.now()
                          };
                          
                          console.log(`📝 [${platform.toUpperCase()}] Updated user bio:`, updatedUser.bio);
                          
                          // Update the displayed bio immediately (display reads
                          // user.bio). Do this FIRST so it can't be blocked by a
                          // storage write.
                          setUser(() => ({ ...updatedUser }));
                          setUserProfile(() => ({ ...updatedUser }));
                          setGlobalUser({ ...updatedUser });

                          // Persist locally, GUARDED — the old code did 4 unguarded
                          // setItem calls; if any threw (quota) the handler aborted
                          // before closing the editor, so "Save did nothing".
                          try {
                            localStorage.setItem('swipecity_native_user', JSON.stringify(updatedUser));
                            localStorage.setItem('swipecity_user', JSON.stringify(updatedUser));
                          } catch (e) { console.warn('[storage] bio save skipped:', e?.message); }

                          // Persist to the Firestore profile via the REST layer that
                          // works on iOS (window.firebaseServices is never assigned).
                          if (user?.uid) {
                            firebaseNative.updateUserProfile(user.uid, { bio: appState.tempBio })
                              .catch(err => console.log('Bio sync failed:', err?.message));
                          }

                          // Close bio editor
                          updateState({
                            editingBio: false,
                            tempBio: '',
                            savedBio: appState.tempBio
                          });
                          
                          console.log(`📝 [${platform.toUpperCase()}] Bio saved and modal closed`);
                        }}
                        style={{
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          minHeight: '36px',
                          minWidth: '80px',
                          touchAction: 'manipulation',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => updateState({ editingBio: true, tempBio: user?.bio || '' })}
                    style={{ 
                      cursor: 'pointer',
                      background: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '8px',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #ddd'
                    }}
                  >
                    <p style={{ 
                      color: user?.bio ? '#333' : '#999', 
                      margin: 0, 
                      fontSize: '12px', 
                      textAlign: 'center',
                      fontStyle: user?.bio ? 'normal' : 'italic'
                    }}>
                      {user?.bio || 'Add a bio to build trust with buyers and sellers • Click to edit'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Seller Action Buttons - Before Dashboard */}
            {appState.currentMode === 'seller' && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  onClick={() => updateState({ showMyListings: true, showProfile: false })}
                  style={{
                    flex: 1,
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📝 Manage
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      console.log('👋 Signing out from seller profile...');
                      const result = await signOut();
                      if (result.success) {
                        console.log('✅ Sign out successful');
                      } else {
                        console.error('❌ Sign out failed:', result.error);
                        alert('Sign out failed: ' + (result.error || 'Unknown error'));
                      }
                    } catch (error) {
                      console.error('❌ Sign out failed:', error);
                      alert('Sign out failed. Please try again.');
                    }
                  }}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  👋 Sign Out
                </button>
              </div>
            )}

            {appState.currentMode === 'buyer' ? (
              <>
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

                {/* Buy Profile Sign Out and Delete Account Buttons */}
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={async () => {
                      try {
                        console.log('👋 Signing out from buyer profile...');
                        const result = await signOut();
                        if (result.success) {
                          console.log('✅ Sign out successful');
                        } else {
                          console.error('❌ Sign out failed:', result.error);
                          alert('Sign out failed: ' + (result.error || 'Unknown error'));
                        }
                      } catch (error) {
                        console.error('❌ Sign out failed:', error);
                        alert('Sign out failed. Please try again.');
                      }
                    }}
                    style={{
                      width: '100%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    👋 Sign Out
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including messages, saved items, and listings.')) {
                        return;
                      }
                      if (!deleteAccount) return;
                      try {
                        console.log('🗑️ Deleting account...');
                        let deleteResult = await deleteAccount();

                        // Firebase blocks deletion when the login is too old. Re-confirm
                        // the password to get a fresh login, then retry once.
                        const needsRecentLogin = !deleteResult.success &&
                          /CREDENTIAL_TOO_OLD|LOGIN_AGAIN|recent login/i.test(deleteResult.error || '');
                        if (needsRecentLogin && reauthenticate) {
                          const password = window.prompt('For your security, please re-enter your password to delete your account:');
                          if (!password) {
                            return; // user cancelled
                          }
                          const reauth = await reauthenticate(password);
                          if (!reauth.success) {
                            alert('Could not verify your password: ' + (reauth.error || 'please try again.'));
                            return;
                          }
                          deleteResult = await deleteAccount();
                        }

                        if (deleteResult.success) {
                          console.log('✅ Account deleted successfully');
                          alert('Your account has been deleted successfully.');
                          window.location.reload();
                        } else {
                          alert('Failed to delete account: ' + (deleteResult.error || 'Please try signing out and back in, then try again.'));
                        }
                      } catch (error) {
                        console.error('❌ Account deletion failed:', error);
                        alert('Failed to delete account. Please try again or contact support.');
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    🗑️ Delete Account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <h5 style={{ marginBottom: '15px' }}>Seller Dashboard</h5>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{
                      background: '#f5f5f5',
                      borderRadius: '10px',
                      padding: '15px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                        {appState.userListings?.filter(listing => listing.status === 'active').length || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Active Listings</div>
                    </div>
                    
                    <div style={{
                      background: '#f5f5f5',
                      borderRadius: '10px',
                      padding: '15px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4CAF50' }}>
                        {appState.userListings?.filter(listing => listing.status === 'sold').length || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Sales Completed</div>
                    </div>
                    
                    <div style={{
                      background: '#f5f5f5',
                      borderRadius: '10px',
                      padding: '15px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                        {(() => {
                          // Calculate average response time from chat history
                          const chatsWithResponses = appState.chats?.filter(chat => 
                            chat.messages && chat.messages.length > 1
                          ) || [];
                          
                          if (chatsWithResponses.length === 0) return 'N/A';
                          
                          let totalResponseTime = 0;
                          let responseCount = 0;
                          
                          chatsWithResponses.forEach(chat => {
                            for (let i = 1; i < chat.messages.length; i++) {
                              const currentMsg = chat.messages[i];
                              const prevMsg = chat.messages[i-1];
                              
                              // Only count responses from the current user (seller)
                              if (currentMsg.senderId !== prevMsg.senderId && 
                                  currentMsg.senderId === user?.id) {
                                const responseTime = currentMsg.timestamp - prevMsg.timestamp;
                                totalResponseTime += responseTime;
                                responseCount++;
                              }
                            }
                          });
                          
                          if (responseCount === 0) return 'N/A';
                          
                          const avgResponseTimeMs = totalResponseTime / responseCount;
                          const avgResponseTimeHours = avgResponseTimeMs / (1000 * 60 * 60);
                          
                          if (avgResponseTimeHours < 1) {
                            const minutes = Math.round(avgResponseTimeHours * 60);
                            return `${minutes}m`;
                          } else {
                            return `${avgResponseTimeHours.toFixed(1)}h`;
                          }
                        })()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Avg Response Time</div>
                    </div>
                  </div>
                </div>

                {/* Seller-mode Delete Account. App Store 5.1.1(v) requires in-app
                    account deletion to be reachable; the buyer branch has its own
                    copy. Sign Out is already provided by the Seller Action Buttons
                    row above, so only Delete Account is added here. */}
                <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including messages, saved items, and listings.')) {
                        return;
                      }
                      if (!deleteAccount) return;
                      try {
                        let deleteResult = await deleteAccount();
                        const needsRecentLogin = !deleteResult.success &&
                          /CREDENTIAL_TOO_OLD|LOGIN_AGAIN|recent login/i.test(deleteResult.error || '');
                        if (needsRecentLogin && reauthenticate) {
                          const password = window.prompt('For your security, please re-enter your password to delete your account:');
                          if (!password) return;
                          const reauth = await reauthenticate(password);
                          if (!reauth.success) {
                            alert('Could not verify your password: ' + (reauth.error || 'please try again.'));
                            return;
                          }
                          deleteResult = await deleteAccount();
                        }
                        if (deleteResult.success) {
                          alert('Your account has been deleted successfully.');
                          window.location.reload();
                        } else {
                          alert('Failed to delete account: ' + (deleteResult.error || 'Please try signing out and back in, then try again.'));
                        }
                      } catch (error) {
                        alert('Failed to delete account. Please try again or contact support.');
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      color: '#ef4444',
                      border: '1px solid #ef4444',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    🗑️ Delete Account
                  </button>
                </div>
              </>
            )}

            {/* Legal Links */}
            <div style={{ 
              marginTop: '20px',
              paddingTop: '20px', 
              borderTop: '1px solid #eee',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <button
                onClick={() => updateState({ showPrivacyPolicy: true })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '4px 0'
                }}
              >
                Privacy Policy
              </button>
              <button
                onClick={() => updateState({ showTermsOfService: true })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  padding: '4px 0'
                }}
              >
                Terms of Service
              </button>
              <div style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
                SwipeCity v1.0.0
              </div>
            </div>

          </div>
        </div>
      )}
      
      {/* Overlay for profile panel */}
      {appState.showProfile && (
        <div
          style={{
            position: 'fixed',
            top: 'max(0px, env(safe-area-inset-top))',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
          onClick={() => updateState({ showProfile: false })}
        />
      )}
      
      {/* Saved Items Modal */}
      {appState.showSavedItems && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
                💾 Saved Items ({appState.savedItems.length}/{appState.maxDailySaves})
              </h2>
              <button
                onClick={() => updateState({ showSavedItems: false })}
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
            
            {/* Search Bar */}
            <div style={{ padding: '15px 20px' }}>
              <input
                type="text"
                placeholder="Search saved items..."
                value={appState.savedItemsSearchQuery}
                onChange={(e) => updateState({ savedItemsSearchQuery: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  borderRadius: '10px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
            
            {/* Saved Items List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 20px 20px'
            }}>
              {appState.savedItems.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#999'
                }}>
                  <p style={{ fontSize: '16px', marginBottom: '10px' }}>No saved items yet</p>
                  <p style={{ fontSize: '14px' }}>Items you save will appear here for easy comparison</p>
                </div>
              ) : (
                appState.savedItems
                  .filter(item => {
                    const query = (appState.savedItemsSearchQuery || '').toLowerCase();
                    if (!query) return true;
                    // Null-guard each field: a saved item from an older schema or
                    // feed data missing description/price would otherwise throw a
                    // TypeError here and crash the whole app via the ErrorBoundary.
                    const title = (item.title || '').toLowerCase();
                    const desc = (item.description || '').toLowerCase();
                    const price = (item.price ?? '').toString().toLowerCase();
                    return title.includes(query) || desc.includes(query) || price.includes(query);
                  })
                  .map((item, index) => (
                    <div key={item.id} style={{
                      display: 'flex',
                      gap: '15px',
                      padding: '15px',
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}>
                      <img
                        src={item.image_url}
                        alt={item.title}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          margin: '0 0 5px 0',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#333'
                        }}>
                          {item.title}
                        </h3>
                        <p style={{
                          margin: '0 0 5px 0',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#4CAF50'
                        }}>
                          ${item.price}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '12px',
                          color: '#999'
                        }}>
                          Saved {new Date(item.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '8px',
                        alignSelf: 'flex-start'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Use proper interest flow instead of bypassing seller approval
                            handleExpressInterest(item);
                            // Expressing interest moves the item out of Saved.
                            const remaining = appState.savedItems.filter(i => i.id !== item.id);
                            updateState({ savedItems: remaining, showSavedItems: false });
                            if (removeSavedItemFromProfile) removeSavedItemFromProfile(item.id);
                          }}
                          style={{
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          💝 Interest
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newSavedItems = appState.savedItems.filter(i => i.id !== item.id);
                            updateState({ savedItems: newSavedItems });
                            // Persist the removal so it doesn't reappear on relaunch.
                            if (removeSavedItemFromProfile) removeSavedItemFromProfile(item.id);
                          }}
                          style={{
                            background: '#ff4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
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
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#ff9800' }}>
              🚫 Daily Limit Reached
            </h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {appState.limitModalType === 'saves' 
                ? `You've reached your daily limit of ${appState.maxDailySaves} saves.`
                : appState.limitModalType === 'swipes'
                ? `You've reached your daily limit of ${appState.maxDailySwipes} swipes.`
                : `You've reached your daily limit of ${appState.maxDailyLikes} likes.`
              }
              <br />
              Come back tomorrow to continue!
            </p>
            <button
              onClick={() => updateState({ showLimitModal: false, limitModalType: null })}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '12px 30px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Report Modal */}
      {appState.showReportModal && appState.reportingItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>🚩</div>
            <h2 style={{ color: '#ff5722', marginBottom: '15px', fontSize: '22px' }}>
              Report Listing
            </h2>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '14px' }}>
              Why are you reporting "{appState.reportingItem.title}"?
            </p>
            
            <div style={{ textAlign: 'left', marginBottom: '25px' }}>
              {[
                'Fake/stolen photos',
                'Spam/duplicate listing', 
                'Inappropriate content',
                'Suspected bot/scam',
                'Wrong category/misleading',
                'Other'
              ].map((reason) => (
                <label key={reason} style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  background: appState.selectedReportReason === reason ? '#f3f4f6' : 'transparent'
                }}>
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={appState.selectedReportReason === reason}
                    onChange={(e) => updateState({ selectedReportReason: e.target.value })}
                    style={{ marginRight: '12px', transform: 'scale(1.2)' }}
                  />
                  <span style={{ fontSize: '14px' }}>{reason}</span>
                </label>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => updateState({ 
                  showReportModal: false, 
                  reportingItem: null, 
                  selectedReportReason: '' 
                })}
                style={{
                  flex: 1,
                  background: '#e0e0e0',
                  color: '#666',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!appState.selectedReportReason) {
                    alert('Please select a reason for reporting.');
                    return;
                  }
                  
                  const newReportedItems = new Set(appState.reportedItems);
                  newReportedItems.add(appState.reportingItem.id);
                  
                  updateState({
                    reportedItems: newReportedItems,
                    userReportCount: appState.userReportCount + 1,
                    showReportModal: false,
                    reportingItem: null,
                    selectedReportReason: ''
                  });
                  
                  console.log(`🚨 Reported item: ${appState.reportingItem.title} for: ${appState.selectedReportReason}`);
                  alert('Thank you for your report. We will review this item.');
                }}
                disabled={!appState.selectedReportReason}
                style={{
                  flex: 1,
                  background: appState.selectedReportReason ? '#ff5722' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: appState.selectedReportReason ? 'pointer' : 'not-allowed'
                }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation - Always visible when authenticated */}
      <BottomNavigation 
        currentView={appState.currentView}
        currentMode={appState.currentMode}
        onViewChange={(view) => {
          console.log('Changing view to:', view);

          // Profile and Chats are account features (messaging, account mgmt) —
          // require sign-in. When signed out, send the user to the auth modal
          // instead of showing an empty profile (with a "Delete Account" button
          // and no account) or other users' chat threads.
          if ((view === 'profile' || view === 'chats') && !isAuthenticated) {
            updateState({ showAuthModal: true });
            return;
          }

          // DIRECT localStorage chat loading (mode-specific)
          if (view === 'chats' && user?.email) {
            try {
              const mode = appState.currentMode;
              const userKey = `swipecity_user_${user.email.replace(/[@+.]/g, '_')}`;
              const storageKey = `${userKey}_${mode}_chats`;
              const savedData = localStorage.getItem(storageKey);
              
              if (savedData) {
                const savedChats = JSON.parse(savedData);
                console.log(`LOADED ${mode} CHATS FROM:`, storageKey, 'Count:', savedChats.length);
                updateState({ 
                  currentView: view,
                  showChats: true,
                  showProfile: view === 'profile',
                  chats: savedChats
                });
              } else {
                console.log('NO SAVED CHATS, using mock chats');
                updateState({ 
                  currentView: view,
                  showChats: true,
                  showProfile: view === 'profile',
                  chats: mockChats
                });
                // Save mock chats for next time
                localStorage.setItem(storageKey, JSON.stringify(mockChats));
              }
            } catch (error) {
              console.error('Failed to load chats:', error);
              updateState({ 
                currentView: view,
                showChats: true,
                showProfile: view === 'profile',
                chats: mockChats
              });
            }
          } else {
            updateState({ 
              currentView: view,
              showChats: view === 'chats',
              showProfile: view === 'profile'
            });
          }
        }}
        onModeChange={(mode) => {
          console.log('Changing mode to:', mode);
          
          // Guard: don't let an unfinished listing be silently abandoned when
          // switching modes. Previously this left buyer-mode view state stuck and
          // hid the swipe "Save" button. Make the user finish or cancel first.
          if (appState.showAddItem) {
            const hasContent = !!(appState.newItemTitle || appState.newItemPrice ||
              appState.newItemDescription || appState.newItemCondition || appState.newItemCity ||
              (appState.selectedImages && appState.selectedImages.length > 0));
            if (hasContent && !window.confirm('You have an unfinished listing. Discard it and switch modes? Otherwise finish posting it, or tap Cancel on the listing.')) {
              return; // stay in seller mode so the listing can be finished or cancelled
            }
            // Discarding (or empty form): fully reset the listing AND the view so
            // the buyer swipe controls reappear.
            updateState({
              currentMode: mode,
              showAddItem: false,
              showMyListings: false,
              selectedImages: [],
              newItemTitle: '',
              newItemPrice: '',
              newItemDescription: '',
              newItemCondition: '',
              newItemCity: '',
              currentView: 'swipe',
              showChats: false,
              showProfile: false,
              showSavedItems: false,
              activeChat: null,
              showSwipeTutorial: mode === 'buyer' && !appState.hasSeenBuyModeTutorial
            });
            return;
          }

          // Switching modes should always return to the main browse/feed view.
          // Clear any open overlay (profile, chats, saved items, my listings) and
          // reset the view — otherwise coming back from e.g. Profile leaves
          // showProfile=true and the buyer "Save" button stays hidden.
          updateState({
            currentMode: mode,
            currentView: 'swipe',
            showProfile: false,
            showChats: false,
            activeChat: null,
            showSavedItems: false,
            showMyListings: false,
            // Show swipe tutorial when entering buy mode for the first time
            showSwipeTutorial: mode === 'buyer' && !appState.hasSeenBuyModeTutorial
          });
        }}
        onShowTutorial={showSwipeTutorial}
      />
      
      {/* Animation Components */}
      <SwipeFeedback type={showSwipeFeedback} show={showSwipeFeedback !== null} />
      {/* No match animation - this is a marketplace, not a dating app! */}
      
      {/* Mobile Controls - Admin Access - Development only */}
      {isDevelopment && !appState.showProfile && !appState.showAddItem && (
        <div style={{
          position: 'fixed',
          top: /android/i.test(navigator.userAgent) || window.Capacitor?.getPlatform?.() === 'android'
            ? '30px' // Lower on Android to avoid status bar overlap
            : '10px', // Original iOS position
          right: '10px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Admin Dashboard Access for Mobile */}
          <div style={{
            background: '#ff9800',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            textAlign: 'center'
          }}
          onClick={() => updateState({ showAdminDashboard: !appState.showAdminDashboard })}>
            📊 Admin
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {appState.showPrivacyPolicy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Privacy Policy</h2>
              <button
                onClick={() => updateState({ showPrivacyPolicy: false })}
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
            <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
              <p><strong>Last Updated:</strong> August 2025</p>
              
              <h3>Introduction</h3>
              <p>SwipeCity respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and protect your information when you use the SwipeCity mobile application.</p>
              
              <h3>Information We Collect</h3>
              <h4>Personal Information</h4>
              <ul>
                <li><strong>Account Information:</strong> Email address, display name, and profile photo</li>
                <li><strong>Profile Data:</strong> Shopping preferences, categories of interest, and onboarding responses</li>
                <li><strong>User-Generated Content:</strong> Items you list for sale, photos you upload, and messages you send</li>
              </ul>
              
              <h4>Usage Information</h4>
              <ul>
                <li><strong>App Activity:</strong> Items you view, like, or save</li>
                <li><strong>Device Information:</strong> Device type, operating system, and app version</li>
                <li><strong>Performance Data:</strong> App crashes and usage statistics (anonymized)</li>
              </ul>
              
              <h3>How We Use Your Information</h3>
              <p>We use your information to provide and improve the SwipeCity marketplace experience, enable communication between users, personalize your experience, and ensure platform safety.</p>
              
              <h3>Contact Us</h3>
              <p>For questions about this Privacy Policy, please contact us at privacy@swipecity.app</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service Modal */}
      {appState.showTermsOfService && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Terms of Service</h2>
              <button
                onClick={() => updateState({ showTermsOfService: false })}
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
            <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#333' }}>
              <p><strong>Last Updated:</strong> August 2025</p>
              
              <h3>Agreement to Terms</h3>
              <p>By accessing or using the SwipeCity mobile application, you agree to be bound by these Terms of Service and our Privacy Policy.</p>
              
              <h3>User Conduct</h3>
              <p>You agree to use SwipeCity only for lawful purposes. You may not:</p>
              <ul>
                <li>Post false, misleading, or fraudulent listings</li>
                <li>Sell prohibited items (weapons, illegal drugs, counterfeit goods, etc.)</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Use the platform for spam or unauthorized advertising</li>
              </ul>
              
              <h3>Transactions</h3>
              <p>SwipeCity facilitates connections but is not party to transactions. All sales are final between buyers and sellers. We do not handle payments or guarantee transactions.</p>
              
              <h3>Prohibited Items</h3>
              <p>The following items are prohibited: illegal items, weapons, drugs, stolen goods, adult content, live animals (with exceptions), and items that infringe intellectual property rights.</p>
              
              <h3>Contact Us</h3>
              <p>For questions about these Terms, please contact us at legal@swipecity.app</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export SwipeMarketplace directly - it's wrapped with AuthProvider in AppWrapper.js
// Error boundary to prevent white screen crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ React Error Boundary caught error:', error, errorInfo);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Component stack:', errorInfo.componentStack);
    
    // Also log to localStorage for debugging on mobile
    try {
      const errorLog = {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      localStorage.setItem('swipecity_last_error', JSON.stringify(errorLog));
    } catch (e) {
      console.error('Failed to save error log:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea', marginBottom: '10px' }}>
            SwipeCity
          </div>
          <div style={{ color: '#64748b', marginBottom: '20px', textAlign: 'center' }}>
            Something went wrong. Please restart the app.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'center' }}>
            <button 
              onClick={() => {
                // Clear localStorage and reload
                localStorage.clear();
                window.location.reload();
              }}
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
              Clear Data & Restart
            </button>
            <button 
              onClick={() => {
                try {
                  const errorLog = localStorage.getItem('swipecity_last_error');
                  if (errorLog) {
                    const parsed = JSON.parse(errorLog);
                    alert(`Error Details:\n\n${parsed.error}\n\nTime: ${parsed.timestamp}\n\nStack: ${parsed.stack?.substring(0, 200) || 'N/A'}`);
                  } else {
                    alert('No error log found');
                  }
                } catch (e) {
                  alert('Failed to read error log: ' + e.message);
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Show Error Details
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap the main component with error boundary
// Auto-recovery from persistent crashes
const initializeWithRecovery = () => {
  try {
    const crashCount = parseInt(localStorage.getItem('swipecity_crash_count') || '0');
    if (crashCount > 2) {
      // Clear problematic data
      const keysToCheck = ['swipecity_native_user', 'swipecity_app_state', 'swipecity_items'];
      keysToCheck.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) JSON.parse(value); // Test if parseable
        } catch {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('swipecity_crash_count', '0');
    } else {
      localStorage.setItem('swipecity_crash_count', String(crashCount + 1));
    }
  } catch (e) {
    // Silent recovery
  }
};

// Initialize recovery before app starts
if (typeof window !== 'undefined') {
  initializeWithRecovery();
  
  // Auto-create demo user for first-time users
  const initializeDemoUser = () => {
    // Wrap in try/catch: this runs at module init via setTimeout, and any
    // localStorage access can throw (private mode / quota), which would surface
    // as an unhandled error rather than being safely ignored.
    try {
      const hasUser = localStorage.getItem('swipecity_user') ||
                      localStorage.getItem('swipecity_native_user') ||
                      localStorage.getItem('swipecity_demo_user');

      if (!hasUser) {
        const demoUser = {
          uid: 'demo_user_' + Date.now(),
          email: 'demo@swipecity.app',
          displayName: 'Demo User',
          emailVerified: true,
          photoURL: null,
          onboardingComplete: true,
          bio: 'Demo user',
          created_at: Date.now(),
          verified: true
        };

        localStorage.setItem('swipecity_demo_user', JSON.stringify(demoUser));

        // Trigger auth listeners
        if (window.setGlobalUser) {
          window.setGlobalUser(demoUser);
        }
      }
    } catch (e) {
      console.warn('initializeDemoUser skipped:', e?.message);
    }
  };
  
  // Initialize demo user if needed
  setTimeout(initializeDemoUser, 100);
}

const App = () => (
  <ErrorBoundary>
    <SwipeMarketplace />
  </ErrorBoundary>
);

export default App;