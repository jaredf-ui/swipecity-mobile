import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageCircle, User, LogOut, Camera } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import SkeletonCard from './components/SkeletonCard';
import { SwipeFeedback, LoadingSpinner, MatchSuccessAnimation } from './components/SwipeFeedback';
import { DataService } from './utils/dataIntegration';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import { initializeFirebaseServices, getFirestoreService } from './services/firebase';

// Keep all your existing SecurityUtils
const SecurityUtils = {
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
  sanitizeInputFinal: (input) => {
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

const SwipeMarketplace = () => {
  // Use real auth from context
  const { 
    user, 
    userProfile, 
    loading: authLoading,
    isAuthenticated, 
    needsOnboarding,
    signOut: authSignOut,
    saveItem: saveItemToProfile,
    likeItem: likeItemInProfile,
    savePreferences
  } = useAuth();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [items, setItems] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Keep ALL your existing state
  const [appState, setAppState] = useState({
    currentMode: 'buyer',
    currentItemIndex: 0,
    showChats: false,
    showProfile: false,
    showSavedItems: false,
    savedItemsSearchQuery: '',
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
    dailyLikeCount: 0,
    dailySaveCount: 0,
    maxDailySwipes: 100,
    maxDailyLikes: 50,
    maxDailySaves: 20,
    savedItems: [],
    likedItems: [],
    showLimitModal: false,
    limitModalType: null,
    reportedItems: new Set(),
    lastActionTime: 0,
    actionCooldown: 300,
    startPos: null,
    activeChat: null,
    newMessage: '',
    chats: [],
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
    settingsShoppingStyle: 0,
    showAdminDashboard: false
  });

  const categories = ['👟 Sneakers', '👕 Vintage', '📱 Electronics', '🏠 Home', '📚 Books', '💪 Fitness'];
  
  const updateState = useCallback((updates) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize Firebase
  useEffect(() => {
    initializeFirebaseServices();
  }, []);

  // Show auth modal if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowAuthModal(true);
    } else if (isAuthenticated) {
      setShowAuthModal(false);
    }
  }, [authLoading, isAuthenticated]);

  // Load items when authenticated
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated && !needsOnboarding) {
        setDataLoading(true);
        try {
          // First try to load from DataService (your existing data)
          const localItems = await DataService.loadItems();
          if (localItems && localItems.length > 0) {
            setItems(localItems);
          } else {
            // If no local items, try Firebase
            const firestoreService = getFirestoreService();
            const result = await firestoreService.getItems(
              userProfile?.preferences?.categories || [], 
              50
            );
            if (result.success && result.data.length > 0) {
              setItems(result.data);
            }
          }
        } catch (error) {
          console.error('Error loading items:', error);
          // Fall back to your mock data if needed
          const mockItems = await DataService.loadItems();
          setItems(mockItems || []);
        } finally {
          setDataLoading(false);
        }
      }
    };
    loadData();
  }, [isAuthenticated, needsOnboarding, userProfile?.preferences?.categories]);

  // Sync saved items from user profile
  useEffect(() => {
    if (userProfile?.savedItems) {
      updateState({ savedItems: userProfile.savedItems });
    }
    if (userProfile?.likedItems) {
      updateState({ likedItems: userProfile.likedItems });
    }
  }, [userProfile, updateState]);

  const currentItem = items[appState.currentItemIndex] || null;

  // Keep ALL your existing handlers but integrate with Firebase
  const handleSaveForLater = useCallback(async () => {
    console.log('💾 Save for Later clicked');
    
    const now = Date.now();
    
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
    
    if (appState.dailySaveCount >= appState.maxDailySaves) {
      console.log('🚫 Daily save limit reached');
      updateState({ showLimitModal: true, limitModalType: 'saves' });
      return;
    }
    
    // Save to Firebase if authenticated
    if (isAuthenticated) {
      await saveItemToProfile(currentItem);
    }
    
    // Update local state
    const newSavedItems = [...appState.savedItems, { ...currentItem, savedAt: Date.now() }];
    const nextIndex = appState.currentItemIndex < items.length - 1 ? appState.currentItemIndex + 1 : 0;
    
    updateState({ 
      savedItems: newSavedItems,
      dailySaveCount: appState.dailySaveCount + 1,
      currentItemIndex: nextIndex,
      lastActionTime: now,
      canUndo: false
    });
    
    console.log(`✅ Saved ${currentItem.title} for later`);
  }, [currentItem, appState, items.length, updateState, isAuthenticated, saveItemToProfile]);

  const handleSwipe = useCallback(async (direction) => {
    console.log('➡️ Swiping:', direction);
    const nextIndex = appState.currentItemIndex < items.length - 1 ? appState.currentItemIndex + 1 : 0;
    
    if (!currentItem) return;
    
    const now = Date.now();
    
    if (!SecurityUtils.checkRateLimit(appState.lastActionTime, appState.actionCooldown)) {
      console.log('🚫 Rate limit exceeded');
      return;
    }
    
    if (appState.dailySwipeCount >= appState.maxDailySwipes) {
      updateState({ showLimitModal: true, limitModalType: 'swipes' });
      return;
    }

    if (direction === 'right') {
      // Like item
      if (appState.dailyLikeCount >= appState.maxDailyLikes) {
        updateState({ showLimitModal: true, limitModalType: 'likes' });
        return;
      }
      
      // Save to Firebase if authenticated
      if (isAuthenticated) {
        await likeItemInProfile(currentItem);
      }
      
      const newLikedItems = [...appState.likedItems, { ...currentItem, likedAt: Date.now() }];
      updateState({
        likedItems: newLikedItems,
        dailyLikeCount: appState.dailyLikeCount + 1,
        showMatchAnimation: true,
        matchedItem: currentItem
      });
      
      setTimeout(() => {
        updateState({ showMatchAnimation: false, matchedItem: null });
      }, 3000);
    } else if (direction === 'left') {
      updateState({
        lastPassedItem: currentItem,
        canUndo: true
      });
    }
    
    updateState({
      currentItemIndex: nextIndex,
      dailySwipeCount: appState.dailySwipeCount + 1,
      dragOffset: { x: 0, y: 0 },
      lastActionTime: now
    });
  }, [appState, currentItem, items.length, updateState, isAuthenticated, likeItemInProfile]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    updateState({ 
      savedItems: [],
      likedItems: [],
      currentItemIndex: 0,
      onboardingStep: 1
    });
  }, [authSignOut, updateState]);

  const handleOnboardingComplete = useCallback(async (preferences) => {
    if (isAuthenticated) {
      await savePreferences({
        categories: preferences.categories,
        priceRange: preferences.priceRange,
        shoppingStyle: preferences.shoppingStyle,
        locationRadius: 10
      });
    }
    updateState({ onboardingStep: 1 });
  }, [isAuthenticated, savePreferences, updateState]);

  // Keep ALL your existing touch handlers, drag handlers, etc.
  // (I'm not copying them all here for brevity, but they should all remain)

  // Loading state
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Onboarding flow (keep your existing beautiful onboarding)
  if (isAuthenticated && needsOnboarding) {
    // Keep your existing onboarding UI exactly as it was
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* Your existing onboarding UI */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h2>Welcome to SwipeCity!</h2>
          <p>Let's personalize your experience...</p>
          <button onClick={() => handleOnboardingComplete({
            categories: [0, 1, 2],
            priceRange: '50-200',
            shoppingStyle: 'casual'
          })}>
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (appState.showAdminDashboard) {
    return <AdminDashboard onClose={() => updateState({ showAdminDashboard: false })} />;
  }

  // Return your FULL existing UI with all features
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#f0f2f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Keep ALL your existing UI components exactly as they were */}
      {/* Header, Navigation, Swipe Cards, Chat, Profile, Settings, etc. */}
      
      {/* I'm showing just the structure here, but you should keep your entire existing UI */}
      
      {/* Your existing header */}
      <div style={{ /* your existing header styles */ }}>
        <h1>SwipeCity</h1>
        {isAuthenticated && (
          <div>
            <span>{userProfile?.displayName || user?.email}</span>
            <button onClick={handleSignOut}><LogOut /></button>
          </div>
        )}
      </div>

      {/* Your existing main content with swipe cards */}
      {dataLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <LoadingSpinner />
        </div>
      ) : (
        /* Your existing swipe interface, chats, profile, etc. */
        <div>
          {/* All your existing UI components */}
        </div>
      )}

      {/* Keep all your existing modals, animations, etc. */}
    </div>
  );
};

export default SwipeMarketplace;