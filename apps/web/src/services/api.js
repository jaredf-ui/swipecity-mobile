import { getFirestoreService, getAuthService, getStorageService } from './firebase.js';

// API service that wraps Firebase operations with error handling and caching
export class ApiService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Cache management
  setCacheItem(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCacheItem(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  clearCache() {
    this.cache.clear();
  }

  // Authentication methods
  async signInWithEmail(email) {
    try {
      const authService = getAuthService();
      await authService.sendSignInLink(email);
      return { success: true };
    } catch (error) {
      console.error('Sign in failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send sign-in link'
      };
    }
  }

  async completeSignIn(url) {
    try {
      const authService = getAuthService();
      const user = await authService.completeSignInWithEmailLink(url);
      return { success: true, data: user };
    } catch (error) {
      console.error('Complete sign in failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to complete sign-in'
      };
    }
  }

  async signOut() {
    try {
      const authService = getAuthService();
      await authService.signOut();
      this.clearCache();
      return { success: true };
    } catch (error) {
      console.error('Sign out failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to sign out'
      };
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      const authService = getAuthService();
      await authService.updateUserPreferences(userId, preferences);
      
      // Clear user cache
      this.cache.delete('current_user');
      
      return { success: true };
    } catch (error) {
      console.error('Update preferences failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update preferences'
      };
    }
  }

  // Items methods
  async getItems(categoryFilter, maxItems = 50, useCache = true) {
    const cacheKey = `items_${JSON.stringify(categoryFilter)}_${maxItems}`;
    
    if (useCache) {
      const cached = this.getCacheItem(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.getItems(categoryFilter, maxItems);
      
      if (result.success && result.data) {
        this.setCacheItem(cacheKey, result.data);
      }
      
      return result;
    } catch (error) {
      console.error('Get items failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch items'
      };
    }
  }

  async addItem(itemData) {
    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.addItem(itemData);
      
      if (result.success) {
        // Clear items cache since we added a new item
        this.clearItemsCache();
      }
      
      return result;
    } catch (error) {
      console.error('Add item failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to add item'
      };
    }
  }

  async updateItem(itemId, updates) {
    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.updateItem(itemId, updates);
      
      if (result.success) {
        this.clearItemsCache();
      }
      
      return result;
    } catch (error) {
      console.error('Update item failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update item'
      };
    }
  }

  async deleteItem(itemId) {
    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.deleteItem(itemId);
      
      if (result.success) {
        this.clearItemsCache();
      }
      
      return result;
    } catch (error) {
      console.error('Delete item failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete item'
      };
    }
  }

  // Chat methods
  async getUserChats(userId, useCache = true) {
    const cacheKey = `chats_${userId}`;
    
    if (useCache) {
      const cached = this.getCacheItem(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.getUserChats(userId);
      
      if (result.success && result.data) {
        this.setCacheItem(cacheKey, result.data);
      }
      
      return result;
    } catch (error) {
      console.error('Get chats failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch chats'
      };
    }
  }

  async createChat(chatData) {
    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.createChat(chatData);
      
      if (result.success) {
        // Clear chats cache
        this.clearChatsCache();
      }
      
      return result;
    } catch (error) {
      console.error('Create chat failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create chat'
      };
    }
  }

  async sendMessage(chatId, message) {
    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.addMessageToChat(chatId, message);
      
      if (result.success) {
        // Clear chats cache to refresh
        this.clearChatsCache();
      }
      
      return result;
    } catch (error) {
      console.error('Send message failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send message'
      };
    }
  }

  // Image upload methods
  async uploadItemImages(files, itemId, onProgress) {
    try {
      const storageService = getStorageService();
      
      // Validate and compress images
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          const validation = storageService.constructor.validateImageFile(file);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
          
          // Compress image
          return await storageService.constructor.compressImage(file);
        })
      );

      const result = await storageService.uploadImages(
        processedFiles,
        `items/${itemId}`,
        onProgress
      );
      
      return result;
    } catch (error) {
      console.error('Upload images failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to upload images'
      };
    }
  }

  async uploadSingleImage(file, path, onProgress) {
    try {
      const storageService = getStorageService();
      
      // Validate and compress image
      const validation = storageService.constructor.validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      const compressedFile = await storageService.constructor.compressImage(file);
      const result = await storageService.uploadImage(compressedFile, path, onProgress);
      
      return result;
    } catch (error) {
      console.error('Upload image failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to upload image'
      };
    }
  }

  // Reporting
  async reportItem(itemId, userId, reason) {
    try {
      const firestoreService = getFirestoreService();
      const result = await firestoreService.reportItem(itemId, userId, reason);
      return result;
    } catch (error) {
      console.error('Report item failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to report item'
      };
    }
  }

  // Cache management helpers
  clearItemsCache() {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.startsWith('items_')) {
        this.cache.delete(key);
      }
    });
  }

  clearChatsCache() {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.startsWith('chats_')) {
        this.cache.delete(key);
      }
    });
  }

  // Offline/retry logic
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
}

// Create singleton instance
export const apiService = new ApiService();