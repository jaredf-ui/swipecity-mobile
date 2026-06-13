// Complete Data Persistence Manager for SwipeCity
// Handles ALL user data: chats, swipes, listings, preferences, likes, etc.

export class DataPersistenceManager {
  constructor(userEmail) {
    if (!userEmail) {
      console.error('❌ DataPersistenceManager requires user email');
      return;
    }
    this.userKey = `swipecity_user_${userEmail.replace(/[@+.]/g, '_')}`;
    console.log('🗄️ DataPersistenceManager initialized for:', userEmail, 'Key:', this.userKey);
  }

  // Save user's complete app state
  saveUserData(data) {
    try {
      const userData = {
        // Core user data
        profile: data.profile || {},
        
        // Chat data
        chats: data.chats || [],
        
        // User activity data
        userListings: data.userListings || [],
        savedItems: data.savedItems || [],
        likedItems: data.likedItems || [],
        
        // Usage tracking
        dailySwipeCount: data.dailySwipeCount || 0,
        dailyLikeCount: data.dailyLikeCount || 0,
        dailySaveCount: data.dailySaveCount || 0,
        
        // Preferences
        preferences: data.preferences || {},
        selectedCategories: data.selectedCategories || [],
        priceRange: data.priceRange || null,
        shoppingStyle: data.shoppingStyle || '',
        
        // Settings
        searchKeywords: data.searchKeywords || '',
        minPrice: data.minPrice || 10,
        maxPrice: data.maxPrice || 500,
        searchRadius: data.searchRadius || 15,
        conditionPreference: data.conditionPreference || 'any',
        wantDealAlerts: data.wantDealAlerts || false,
        
        // Tutorial state
        hasSeenTutorial: data.hasSeenTutorial || false,
        hasSeenBuyModeTutorial: data.hasSeenBuyModeTutorial || false,
        
        // Timestamps
        lastUpdated: Date.now(),
        lastLogin: Date.now()
      };

      // Save main user data
      localStorage.setItem(this.userKey, JSON.stringify(userData));
      
      // Also save chats separately for easy access
      localStorage.setItem(`${this.userKey}_chats`, JSON.stringify(userData.chats));
      
      console.log('💾 Complete user data saved:', Object.keys(userData));
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save user data:', error);
      return { success: false, error };
    }
  }

  // Load user's complete app state
  loadUserData() {
    try {
      const savedData = localStorage.getItem(this.userKey);
      if (savedData) {
        const userData = JSON.parse(savedData);
        console.log('✅ Complete user data loaded:', Object.keys(userData));
        return userData;
      } else {
        console.log('🔍 No saved user data found, returning empty data');
        return this.getEmptyUserData();
      }
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
      return this.getEmptyUserData();
    }
  }

  // Get empty user data structure
  getEmptyUserData() {
    return {
      profile: {},
      chats: [],
      userListings: [],
      savedItems: [],
      likedItems: [],
      dailySwipeCount: 0,
      dailyLikeCount: 0,
      dailySaveCount: 0,
      preferences: {},
      selectedCategories: [],
      priceRange: null,
      shoppingStyle: '',
      searchKeywords: '',
      minPrice: 10,
      maxPrice: 500,
      searchRadius: 15,
      conditionPreference: 'any',
      wantDealAlerts: false,
      hasSeenTutorial: false,
      hasSeenBuyModeTutorial: false,
      lastUpdated: Date.now(),
      lastLogin: Date.now()
    };
  }

  // Save specific data types
  saveChats(chats) {
    try {
      localStorage.setItem(`${this.userKey}_chats`, JSON.stringify(chats));
      console.log('💾 Chats saved:', chats.length, 'chats');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save chats:', error);
      return { success: false, error };
    }
  }

  loadChats() {
    try {
      const savedChats = localStorage.getItem(`${this.userKey}_chats`);
      if (savedChats) {
        const chats = JSON.parse(savedChats);
        console.log('✅ Chats loaded:', chats.length, 'chats');
        return chats;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
      return [];
    }
  }

  // Update specific fields
  updateUserData(updates) {
    const currentData = this.loadUserData();
    const updatedData = { ...currentData, ...updates, lastUpdated: Date.now() };
    return this.saveUserData(updatedData);
  }

  // Clear all user data (for logout)
  clearUserData() {
    try {
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(`${this.userKey}_chats`);
      console.log('🗑️ User data cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear user data:', error);
      return { success: false, error };
    }
  }
}

// Utility function to get data manager for current user
export function getDataManager(userEmail) {
  if (!userEmail) {
    console.error('❌ No user email provided for DataPersistenceManager');
    return null;
  }
  return new DataPersistenceManager(userEmail);
}