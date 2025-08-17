import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { MessageCircle, User, LogOut, Camera } from 'lucide-react';
// Inline shared data for Capacitor compatibility
const SecurityUtils = {
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
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
  },
  validateImageUrl: (url) => {
    try {
      const urlObj = new URL(url);
      return ['https:', 'http:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
};

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

// Bottom Navigation Component
const BottomNavigation = ({ currentView, currentMode, onViewChange, onModeChange }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      paddingTop: '4px',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
    }}>
      {/* Mode Toggle (Buy/Sell) */}
      <div style={{
        flex: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 5px'
      }}>
        <div style={{
          display: 'flex',
          background: '#f0f0f0',
          borderRadius: '20px',
          padding: '4px'
        }}>
          <button
            onClick={() => onModeChange('buyer')}
            style={{
              background: currentMode === 'buyer' ? '#667eea' : 'transparent',
              color: currentMode === 'buyer' ? 'white' : '#666',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🛒 Buy
          </button>
          <button
            onClick={() => onModeChange('seller')}
            style={{
              background: currentMode === 'seller' ? '#667eea' : 'transparent',
              color: currentMode === 'seller' ? 'white' : '#666',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💰 Sell
          </button>
        </div>
      </div>

      {/* View Navigation - Only Chats and Profile */}
      <div style={{
        flex: 2,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        <button
          onClick={() => onViewChange('chats')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px',
            color: currentView === 'chats' ? '#667eea' : '#999',
            minWidth: '80px'
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px' }}>💬</div>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Chats</span>
        </button>

        <button
          onClick={() => onViewChange('profile')}
          style={{
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px',
            color: currentView === 'profile' ? '#667eea' : '#999',
            minWidth: '80px'
          }}
        >
          <div style={{ fontSize: '20px', marginBottom: '2px' }}>👤</div>
          <span style={{ fontSize: '9px', fontWeight: 'bold' }}>Profile</span>
        </button>
      </div>
    </div>
  );
};

// Standardized Close Button Component for iOS compatibility
const CloseButton = ({ onClick, color = 'white', backgroundColor = 'rgba(255,255,255,0.2)', size = '44px' }) => {
  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      onClick={handleClose}
      onTouchStart={handleClose}
      onTouchEnd={handleClose}
      style={{
        background: backgroundColor,
        border: 'none',
        borderRadius: '50%',
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        color: color,
        cursor: 'pointer',
        fontSize: '18px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 99999,
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        pointerEvents: 'auto',
        outline: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      ×
    </button>
  );
};



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
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Load user from localStorage on app start
    try {
      const savedUser = localStorage.getItem('swipecity_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setGlobalUser(parsedUser);
        setUser(parsedUser); // Set local state immediately
        console.log('✅ Loaded user from localStorage:', parsedUser);
        console.log('✅ User onboarding status:', parsedUser.onboardingComplete);
      } else {
        console.log('🔍 No saved user found in localStorage');
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
      localStorage.removeItem('swipecity_user');
    }
    
    // Set up listener for future changes
    const listener = (newUser) => {
      console.log('🔄 Auth state listener triggered:', newUser);
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

const AuthContext = createContext({});

const AuthProvider = ({ children }) => {
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
      
      // Store in localStorage for persistence
      localStorage.setItem('swipecity_user', JSON.stringify(updatedUser));
      
      console.log('✅ User preferences updated:', updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Failed to update user preferences:', error);
      throw error;
    }
  }, [user]);

  const needsOnboarding = user && !user.onboardingComplete;
  
  // Debug logging for onboarding state
  console.log('🔍 AuthProvider value calculation:', {
    user: user ? { id: user.id, email: user.email, onboardingComplete: user.onboardingComplete } : null,
    isAuthenticated: Boolean(user),
    needsOnboarding: needsOnboarding
  });

  const value = {
    user,
    signOut,
    updateUserPreferences,
    isAuthenticated: Boolean(user),
    needsOnboarding
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

const useAuth = () => useContext(AuthContext);

const SwipeMarketplace = () => {
  const { user, isAuthenticated, needsOnboarding, signOut, updateUserPreferences } = useAuth();
  
  // Debug logging
  console.log('SwipeMarketplace render:', { 
    user: user ? { id: user.id, email: user.email, onboardingComplete: user.onboardingComplete } : null, 
    isAuthenticated, 
    needsOnboarding 
  });
  
  const [appState, setAppState] = useState({
    currentMode: 'buyer',
    currentView: 'swipe', // swipe, chats, profile
    currentItemIndex: 0,
    showAuthModal: false, // Start with false, will be set by useEffect
    showChats: false,
    showProfile: false,
    showMyListings: false,
    email: '',
    loading: false,
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
    chats: mockChats,
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
    userListings: [
      // Example listing to show interests
      {
        id: '1',
        title: 'Nike Air Jordans',
        price: 250,
        description: 'Barely worn, size 10.5. Original box included.',
        condition: 'like-new',
        images: [{url: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop'}],
        created_at: Date.now() - 86400000, // 1 day ago
        updated_at: Date.now() - 86400000,
        status: 'active',
        seller_id: 'seller1'
      }
    ],
    buyerInterests: [
      // Example interests for demo
      {
        id: 'interest_demo_1',
        itemId: '1', // Nike Air Jordans
        buyerId: 'buyer_1',
        buyerName: 'Alex Chen',
        buyerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        itemTitle: 'Nike Air Jordans',
        itemImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop',
        sellerName: 'Mike Chen',
        sellerId: 'seller1',
        timestamp: Date.now() - 3600000, // 1 hour ago
        status: 'pending'
      },
      {
        id: 'interest_demo_2',
        itemId: '1', // Nike Air Jordans
        buyerId: 'buyer_2', 
        buyerName: 'Sarah Wilson',
        buyerAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        itemTitle: 'Nike Air Jordans',
        itemImage: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop',
        sellerName: 'Mike Chen',
        sellerId: 'seller1',
        timestamp: Date.now() - 7200000, // 2 hours ago
        status: 'pending'
      }
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
      }
    }
  });

  const items = useMemo(() => 
    mockItems
      .map(item => ({
        ...item,
        algorithmScore: user?.preferences?.categories?.includes(categories.indexOf(item.category)) 
          ? item.algorithmScore 
          : item.algorithmScore * 0.3
      }))
      .sort((a, b) => b.algorithmScore - a.algorithmScore), 
    [user?.preferences?.categories]
  );
  const currentItem = items[appState.currentItemIndex] || null;

  const updateState = useCallback((updates) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

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
      onboardingComplete: false,
      verified: true, // Phone is verified
      created_at: Date.now()
    };
    
    setGlobalUser(userData);
    updateState({ 
      loading: false, 
      showAuthModal: false,
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
          onboardingComplete: false,
          verified: firebaseUser.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false, showAuthModal: false });
        
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
      console.log('🎯 Processing RIGHT swipe - Creating buyer interest');
      
      // Create buyer interest for this item
      const newInterest = {
        id: `interest_${Date.now()}_${user?.id}`,
        itemId: currentItem.id,
        buyerId: user?.id,
        buyerName: user?.username || user?.email?.split('@')[0] || 'Anonymous',
        buyerAvatar: user?.avatar_url,
        itemTitle: currentItem.title,
        itemImage: currentItem.image_url,
        sellerName: currentItem.seller_name,
        sellerId: currentItem.seller_id,
        timestamp: now,
        status: 'pending' // pending, approved, rejected
      };
      
      // Add to buyer interests
      updateState({ 
        buyerInterests: [...(appState.buyerInterests || []), newInterest],
        currentItemIndex: nextIndex,
        dailySwipeCount: newSwipeCount,
        lastActionTime: now,
        canUndo: false
      });
      
      console.log(`💝 Interest created for ${currentItem.title} by ${newInterest.buyerName}`);
      
      // Show feedback to buyer
      updateState({ 
        showInterestConfirmation: true,
        interestedItem: currentItem
      });
      
      // Auto-hide confirmation after 2 seconds
      setTimeout(() => {
        updateState({ showInterestConfirmation: false, interestedItem: null });
      }, 2000);
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

// Handle seller approving buyer interest
const handleApproveInterest = useCallback((interest) => {
  // Update interest status to approved
  const updatedInterests = appState.buyerInterests.map(item => 
    item.id === interest.id ? { ...item, status: 'approved' } : item
  );
  
  // Create a new chat between seller and buyer
  const newChat = {
    id: `chat_${interest.id}`,
    buyer_name: interest.buyerName,
    seller_name: interest.sellerName,
    item_title: interest.itemTitle,
    item_image: interest.itemImage,
    buyer_id: interest.buyerId,
    seller_id: interest.sellerId,
    item_id: interest.itemId,
    last_message: `${interest.sellerName} approved your interest in ${interest.itemTitle}!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unread: false,
    messages: [
      {
        id: `approval_${interest.id}`,
        sender_id: interest.sellerId,
        sender_name: interest.sellerName,
        text: `Hi ${interest.buyerName}! I'd love to sell my ${interest.itemTitle} to you. Let's chat about the details! 😊`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  };
  
  updateState({ 
    buyerInterests: updatedInterests,
    chats: [newChat, ...appState.chats.filter(chat => chat.id !== newChat.id)]
  });
  
  console.log(`✅ Approved interest from ${interest.buyerName} for ${interest.itemTitle}`);
}, [appState.buyerInterests, appState.chats, updateState]);

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
        await updateUserPreferences(preferences);
        
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
  }, [user, appState.selectedCategories, appState.priceRange, appState.shoppingStyle, updateUserPreferences]);

  // Handle auth modal state based on authentication status
  useEffect(() => {
    console.log('Auth state effect:', { isAuthenticated, showAuthModal: appState.showAuthModal });
    
    if (!isAuthenticated && !appState.showAuthModal) {
      console.log('User not authenticated, showing auth modal');
      updateState({ showAuthModal: true });
    } else if (isAuthenticated && appState.showAuthModal) {
      console.log('User is authenticated, closing auth modal');
      updateState({ showAuthModal: false });
    }
  }, [isAuthenticated, appState.showAuthModal, updateState]);

// Enhanced redirect handling for mobile
useEffect(() => {
  const handleRedirectResult = async () => {
    if (!window.firebase) {
      console.log('Firebase not available for redirect result');
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
          onboardingComplete: false,
          verified: firebaseUser.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false, showAuthModal: false });
        
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
  // Check for auth state changes (more reliable on mobile)
  if (window.firebase) {
    const unsubscribe = window.firebase.auth().onAuthStateChanged((user) => {
      if (user && !globalUser) {
        console.log('✅ Auth state change detected:', user);
        
        const userData = {
          id: user.uid,
          email: user.email,
          username: SecurityUtils.sanitizeInput(user.displayName || user.email.split('@')[0]),
          avatar_url: user.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
          onboardingComplete: false,
          verified: user.emailVerified,
          created_at: Date.now()
        };
        
        setGlobalUser(userData);
        updateState({ loading: false, showAuthModal: false });
        localStorage.removeItem('authRedirectInitiated');
      }
    });
    
    return () => unsubscribe();
  }
}, [updateState]);

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

  console.log('Render decision:', { 
    showAuthModal: appState.showAuthModal, 
    isAuthenticated, 
    needsOnboarding,
    userExists: !!user 
  });

  if (appState.showAuthModal) {
    console.log('Showing auth modal');
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
            The marketplace that makes buying and selling easy
          </p>
          
          
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '30px'
          }}>
            <input
              type="email"
              placeholder="Enter your email address"
              value={appState.email}
              onChange={(e) => updateState({ email: e.target.value })}
              style={{
                width: '100%',
                padding: '18px',
                fontSize: '16px',
                border: 'none',
                borderRadius: '15px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                marginBottom: '20px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              onClick={handleEmailAuth}
              disabled={appState.loading}
              style={{
                width: '100%',
                background: appState.loading ? '#ccc' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '15px',
                padding: '18px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: appState.loading ? 'not-allowed' : 'pointer'
              }}
            >
              {appState.loading ? 'Signing In...' : '✨ Continue with Email'}
            </button>
            
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '15px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.8)',
              marginTop: '15px',
              lineHeight: '1.4',
              textAlign: 'center'
            }}>
              📧 We'll send you a secure sign-in link via email. No password required!
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    console.log('Showing onboarding, step:', appState.onboardingStep);
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
          paddingTop: 'max(50px, env(safe-area-inset-top) + 30px)',
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
            onClick={async () => {
              console.log('🎯 Start Swiping button clicked!');
              console.log('Current shopping style:', appState.shoppingStyle);
              await completeOnboarding();
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
  return (
    <>
      {appState.currentMode === 'buyer' ? (
      <div style={{
        minHeight: '100vh',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: '75px' // Reduced space for smaller bottom nav
      }}>

        {/* Swipe Cards */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '20px 20px 0 20px',
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
                    transform: `scale(${Math.abs(appState.dragOffset.x) > 30 && appState.dragOffset.x < 0 ? 1 : 0}) rotate(-15deg)`,
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
                    transform: `scale(${Math.abs(appState.dragOffset.x) > 30 && appState.dragOffset.x > 0 ? 1 : 0}) rotate(15deg)`,
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
                      const responseHours = parseFloat(seller.responseTime.replace(/[^0-9.]/g, ''));
                      const responseUnit = seller.responseTime.includes('m') ? 'minutes' : 'hours';
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
  position: 'fixed',
  bottom: '75px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: appState.canUndo ? '25px' : '45px',
  zIndex: 1000,
  width: '100%',
  maxWidth: '350px'
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

              <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>
                The seller will review your interest and decide if they want to sell to you!
              </p>
            </div>
          </div>
        )}

        

        {/* Individual Chat Modal */}
        {appState.activeChat && (
          <>
            {/* Close backdrop */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 9998
              }}
              onClick={() => {
                console.log('Individual chat backdrop clicked');
                updateState({ showChats: false, activeChat: null });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                console.log('Individual chat backdrop touched');
                updateState({ showChats: false, activeChat: null });
              }}
            />
            {/* Modal content */}
            <div style={{
              position: 'fixed',
              top: 'max(0px, env(safe-area-inset-top))',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column'
            }}>
            <div style={{
              padding: '15px 20px',
              paddingTop: 'max(15px, env(safe-area-inset-top))',
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
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{appState.activeChat.seller_name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>{appState.activeChat.item_title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  console.log('Close chat button clicked');
                  updateState({ showChats: false, activeChat: null });
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Close chat button touched');
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
                  fontSize: '16px',
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
          </>
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
              borderRadius: '15px',
              padding: '30px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h2 style={{ marginBottom: '25px', fontSize: '20px', color: '#333' }}>⚙️ Customize Your Experience</h2>
              
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
      paddingBottom: '100px' // Space for bottom navigation
    }}>

      {/* Seller Content */}
      {!appState.showAddItem ? (
        appState.showMyListings ? (
          /* My Listings View */
          <div style={{
            flex: 1,
            padding: '20px',
            background: '#f8f9fa',
            margin: '5px 15px',
            borderRadius: '20px',
            maxWidth: '600px',
            alignSelf: 'center',
            width: '100%',
            boxSizing: 'border-box',
            border: '1px solid #e9ecef'
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
                  marginTop: '10px',
                  padding: '8px',
                  background: '#f8f9ff',
                  borderRadius: '6px',
                  border: '1px solid #e1e8ff'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#667eea',
                    fontWeight: 'bold',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>💫</span>
                    {listingInterests.length} interested buyer{listingInterests.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    gap: '6px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {listingInterests.map((interest, index) => {
                    const buyer = appState.users[interest.buyerId];
                    return (
                      <div key={interest.id} style={{
                        background: '#ffffff',
                        border: '1px solid #e0e7ff',
                        borderRadius: '6px',
                        padding: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <img
                            src={buyer?.avatar || interest.buyerAvatar}
                            alt={interest.buyerName}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              objectFit: 'cover'
                            }}
                          />
                          <span style={{ fontSize: '11px', fontWeight: '500', color: '#333' }}>
                            {interest.buyerName}
                          </span>
                          {buyer?.verified && (
                            <span style={{ color: '#4CAF50', fontSize: '8px' }}>✓</span>
                          )}
                        </div>
                        
                        {buyer && (
                          <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                              <span>⭐ {buyer.rating}/5 ({buyer.reviewCount})</span>
                              <span>📦 {buyer.totalPurchases} purchases</span>
                              <span>⚡ {buyer.responseTime}</span>
                            </div>
                            
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
                              const responseHours = parseFloat(buyer.responseTime.replace(/[^0-9.]/g, ''));
                              const responseUnit = buyer.responseTime.includes('m') ? 'minutes' : 'hours';
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
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveInterest(interest);
                            }}
                            style={{
                              flex: 1,
                              background: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 6px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectInterest(interest);
                            }}
                            style={{
                              flex: 1,
                              background: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '4px 6px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '15px 15px 25px 15px',
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
                  {/* Photo number indicator */}
                  <div style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    background: index === 0 ? 'rgba(76, 175, 80, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {index === 0 ? '★' : index + 1}
                  </div>
                  
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
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label htmlFor="photo-upload" style={{
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
                      id="photo-upload"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        const currentImages = appState.selectedImages || [];
                        
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
                            selectedImages: [...(appState.selectedImages || []), newImage] 
                          });
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
                
                <label htmlFor="camera-capture" style={{
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
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    id="camera-capture"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const currentImages = appState.selectedImages || [];
                      
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
                            selectedImages: [...(appState.selectedImages || []), newImage] 
                          });
                        };
                        reader.readAsDataURL(file);
                      });
                    }}
                  />
                </label>
                </div>
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
                      {/* Photo number indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '5px',
                        background: index === 0 ? 'rgba(76, 175, 80, 0.9)' : 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {index === 0 ? '★' : index + 1}
                      </div>
                      
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
                      
                      <label htmlFor="edit-camera-capture" style={{
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
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          id="edit-camera-capture"
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
          <>
            {/* Close backdrop */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.3)',
                zIndex: 9998
              }}
              onClick={() => {
                console.log('Chat backdrop clicked');
                updateState({ showChats: false });
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                console.log('Chat backdrop touched');
                updateState({ showChats: false });
              }}
            />
            {/* Modal content */}
            <div style={{
              position: 'fixed',
              top: 'max(0px, env(safe-area-inset-top))',
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column'
            }}>
            <div style={{
              padding: '15px 20px',
              paddingTop: 'max(15px, env(safe-area-inset-top))',
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
          </>
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
                      messages: [...(prev.activeChat.messages || []), newMsg]
                    }
                  }));
                }
              }}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #ddd',
                borderRadius: '25px',
                outline: 'none',
                fontSize: '14px'
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
                      messages: [...(prev.activeChat.messages || []), newMsg]
                    }
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>💬 Messages</h2>
            <CloseButton 
              onClick={() => updateState({ showChats: false })}
            />
          </div>
          
          <div style={{ flex: 1, overflow: 'auto' }}>
            {sampleChats.length === 0 ? (
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
              sampleChats.map((chat, i) => (
                <div
                  key={i}
                  onClick={() => updateState({ activeChat: chat })}
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
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{chat.seller_name}</h4>
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
          transition: 'transform 0.3s ease'
        }}>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Profile</h3>
              <CloseButton 
                onClick={() => updateState({ showProfile: false })}
                color="#333"
                backgroundColor="rgba(0,0,0,0.1)"
              />
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
                  
                  <button
                    onClick={() => updateState({ showMyListings: true, showProfile: false })}
                    style={{
                      width: '100%',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginTop: '15px'
                    }}
                  >
                    📝 Manage Listings
                </button>
                </div>
              </>
            )}

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
      
      {/* Bottom Navigation - Always visible when authenticated */}
      <BottomNavigation 
        currentView={appState.currentView}
        currentMode={appState.currentMode}
        onViewChange={(view) => {
          console.log('Changing view to:', view);
          updateState({ 
            currentView: view,
            showChats: view === 'chats',
            showProfile: view === 'profile'
          });
        }}
        onModeChange={(mode) => {
          console.log('Changing mode to:', mode);
          updateState({ currentMode: mode });
        }}
      />
    </>
  );
};

const App = () => (
  <AuthProvider>
    <SwipeMarketplace />
  </AuthProvider>
);

export default App;