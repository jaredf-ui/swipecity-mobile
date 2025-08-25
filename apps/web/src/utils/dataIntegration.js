/**
 * Data Integration Utility
 * Handles the transition from mock data to Firebase data
 * 
 * This file provides wrapper functions that:
 * 1. Try to use Firebase services when available
 * 2. Fall back to mock data for development
 * 3. Provide consistent interfaces for both
 */

import { initializeFirebaseServices, getFirestoreService } from '../services/firebase';

// Track Firebase initialization status
let firebaseInitialized = false;
let firebaseError = null;

// Initialize Firebase (safe initialization)
export const initializeDataServices = async () => {
  try {
    if (!firebaseInitialized) {
      await initializeFirebaseServices();
      firebaseInitialized = true;
      console.log('✅ Firebase data services initialized');
    }
    return { success: true };
  } catch (error) {
    firebaseError = error;
    console.warn('⚠️ Firebase initialization failed, using mock data:', error.message);
    return { success: false, error: error.message };
  }
};

// Check if Firebase is available and ready
export const isFirebaseReady = () => {
  return firebaseInitialized && !firebaseError;
};

// Get Firebase service or null
export const getFirebaseService = () => {
  if (!isFirebaseReady()) return null;
  
  try {
    return getFirestoreService();
  } catch (error) {
    console.warn('Firebase service not available:', error.message);
    return null;
  }
};

// Data operations that work with both Firebase and mock data
export const DataService = {
  
  // Get items/listings
  async getItems(filters = {}) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.getItems(filters.categories, filters.limit || 50);
        if (response.success) {
          return response.data;
        }
      } catch (error) {
        console.warn('Firebase getItems failed, using fallback:', error);
      }
    }
    
    // Fallback to mock data (your existing mock items)
    return getMockItems(filters);
  },

  // Create new item
  async createItem(itemData) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.addItem(itemData);
        if (response.success) {
          return { id: response.data, ...itemData };
        }
      } catch (error) {
        console.warn('Firebase createItem failed:', error);
      }
    }
    
    // Fallback to local mock creation
    return createMockItem(itemData);
  },

  // Update item
  async updateItem(itemId, updates) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.updateItem(itemId, updates);
        return response.success;
      } catch (error) {
        console.warn('Firebase updateItem failed:', error);
      }
    }
    
    // Fallback to local update (return true for mock success)
    return true;
  },

  // Delete item
  async deleteItem(itemId) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.deleteItem(itemId);
        return response.success;
      } catch (error) {
        console.warn('Firebase deleteItem failed:', error);
      }
    }
    
    // Fallback to local delete (return true for mock success)
    return true;
  },

  // Report item
  async reportItem(itemId, userId, reason) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.reportItem(itemId, userId, reason);
        return response.success;
      } catch (error) {
        console.warn('Firebase reportItem failed:', error);
      }
    }
    
    // Fallback to local reporting (just log it)
    console.log(`📝 Mock report: Item ${itemId} reported by ${userId} for: ${reason}`);
    return true;
  },

  // Create user
  async createUser(userData) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.createUser(userData);
        if (response && response.success) {
          return { id: response.data, ...userData };
        }
      } catch (error) {
        console.warn('Firebase createUser failed:', error);
      }
    }
    
    // Fallback to local mock creation
    return createMockUser(userData);
  },

  // Create interest
  async createInterest(interestData) {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.createInterest(interestData);
        if (response && response.success) {
          return { id: response.data, ...interestData };
        }
      } catch (error) {
        console.warn('Firebase createInterest failed:', error);
      }
    }
    
    // Fallback to local mock creation
    return createMockInterest(interestData);
  },

  // Get user count (for admin dashboard)
  async getUserCount() {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.getUserCount();
        if (response && response.success) {
          return response.count;
        }
      } catch (error) {
        console.warn('Firebase getUserCount failed:', error);
      }
    }
    
    // Return seeded users count
    return seededUsersStore.length;
  },

  // Get listing count (for admin dashboard)
  async getListingCount() {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.getListingCount();
        if (response && response.success) {
          return response.count;
        }
      } catch (error) {
        console.warn('Firebase getListingCount failed:', error);
      }
    }
    
    // Return seeded items count
    return seededItemsStore.length;
  },

  // Get interest count (for admin dashboard)
  async getInterestCount() {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.getInterestCount();
        if (response && response.success) {
          return response.count;
        }
      } catch (error) {
        console.warn('Firebase getInterestCount failed:', error);
      }
    }
    
    // Return seeded interests count
    return seededInterestsStore.length;
  },

  // Get report count (for admin dashboard)
  async getReportCount() {
    const firebaseService = getFirebaseService();
    
    if (firebaseService) {
      try {
        const response = await firebaseService.getReportCount();
        if (response && response.success) {
          return response.count;
        }
      } catch (error) {
        console.warn('Firebase getReportCount failed:', error);
      }
    }
    
    return 0; // No reports tracked locally yet
  }
};

// Local storage for seeded items
let seededItemsStore = [];
let seededUsersStore = [];
let seededInterestsStore = [];

// Helper functions to manage local seeded data
function addToSeededItems(item) {
  seededItemsStore.push(item);
  // Also save to localStorage for persistence
  localStorage.setItem('swipecity_seeded_items', JSON.stringify(seededItemsStore));
}

function addToSeededUsers(user) {
  seededUsersStore.push(user);
  localStorage.setItem('swipecity_seeded_users', JSON.stringify(seededUsersStore));
}

function addToSeededInterests(interest) {
  seededInterestsStore.push(interest);
  localStorage.setItem('swipecity_seeded_interests', JSON.stringify(seededInterestsStore));
}

// Load seeded data from localStorage on startup
function loadSeededData() {
  try {
    const storedItems = localStorage.getItem('swipecity_seeded_items');
    const storedUsers = localStorage.getItem('swipecity_seeded_users');
    const storedInterests = localStorage.getItem('swipecity_seeded_interests');
    
    console.log('🔍 Loading seeded data from localStorage...');
    console.log('📦 Stored items:', storedItems ? JSON.parse(storedItems).length : 0, 'items');
    console.log('👥 Stored users:', storedUsers ? JSON.parse(storedUsers).length : 0, 'users');
    console.log('💝 Stored interests:', storedInterests ? JSON.parse(storedInterests).length : 0, 'interests');
    
    if (storedItems) seededItemsStore = JSON.parse(storedItems);
    if (storedUsers) seededUsersStore = JSON.parse(storedUsers);
    if (storedInterests) seededInterestsStore = JSON.parse(storedInterests);
    
    console.log('✅ Seeded data loaded. Items store:', seededItemsStore.length, 'items');
  } catch (error) {
    console.warn('Failed to load seeded data from localStorage:', error);
  }
}

// Initialize seeded data on module load
loadSeededData();

// Function to clear all seeded data
export function clearSeededData() {
  seededItemsStore = [];
  seededUsersStore = [];
  seededInterestsStore = [];
  localStorage.removeItem('swipecity_seeded_items');
  localStorage.removeItem('swipecity_seeded_users');
  localStorage.removeItem('swipecity_seeded_interests');
  
  // Also clear any other potential cache keys
  localStorage.removeItem('swipecity_data_version');
  localStorage.removeItem('swipecity_cache');
  
  console.log('🗑️ All seeded data cleared');
  console.log('📊 Store sizes after clear - Items:', seededItemsStore.length, 'Users:', seededUsersStore.length, 'Interests:', seededInterestsStore.length);
}

// Mock data functions for fallback
function getMockItems(filters = {}) {
  console.log('📦 getMockItems called with filters:', filters);
  console.log('📊 Seeded items store length:', seededItemsStore.length);
  console.log('📋 First few seeded items:', seededItemsStore.slice(0, 3));
  
  // Return seeded items first, then fallback to mock items
  const allItems = [...seededItemsStore];
  
  // Add original mock items if no seeded items exist
  if (allItems.length === 0) {
    console.log('⚠️ No seeded items found, adding fallback mock item');
    allItems.push({
      id: 'mock1',
      title: 'Sample iPhone 14',
      price: 800,
      condition: 'Like New',
      description: 'Great condition iPhone 14',
      image_url: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=300&h=300&fit=crop',
      seller_id: 'mock_seller',
      seller_name: 'Sample Seller',
      created_at: Date.now() - 86400000, // 1 day ago
      category: 'Electronics',
      status: 'active'
    });
  }
  
  // Apply filters if any
  let filteredItems = allItems;
  if (filters.categories && filters.categories.length > 0) {
    // Filter by categories
    filteredItems = allItems.filter(item => 
      filters.categories.includes(item.category)
    );
  }
  
  // Apply limit
  if (filters.limit) {
    filteredItems = filteredItems.slice(0, filters.limit);
  }
  
  return filteredItems;
}

function createMockItem(itemData) {
  const newItem = {
    id: `mock_${Date.now()}`,
    ...itemData,
    created_at: Date.now(),
    status: 'active'
  };
  
  // Add to seeded items store for persistence
  addToSeededItems(newItem);
  
  return newItem;
}

function createMockUser(userData) {
  const newUser = {
    id: `mock_user_${Date.now()}`,
    ...userData,
    created_at: Date.now(),
    status: 'active'
  };
  
  // Add to seeded users store for persistence
  addToSeededUsers(newUser);
  
  return newUser;
}

function createMockInterest(interestData) {
  const newInterest = {
    id: `mock_interest_${Date.now()}`,
    ...interestData,
    created_at: Date.now(),
    status: 'pending'
  };
  
  // Add to seeded interests store for persistence
  addToSeededInterests(newInterest);
  
  return newInterest;
}

// Migration utility - helps transition existing app state to Firebase
export const migrateToFirebase = async (existingData) => {
  if (!isFirebaseReady()) {
    console.log('Firebase not ready, migration skipped');
    return false;
  }

  try {
    const firebaseService = getFirebaseService();
    
    // Migrate user listings to Firestore
    if (existingData.userListings && existingData.userListings.length > 0) {
      console.log(`🔄 Migrating ${existingData.userListings.length} listings to Firebase...`);
      
      for (const listing of existingData.userListings) {
        if (!listing.id.startsWith('mock_')) continue; // Skip already migrated items
        
        const { id, ...listingData } = listing; // Remove mock ID
        await DataService.createItem(listingData);
      }
      
      console.log('✅ Listing migration completed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
};

export default DataService;