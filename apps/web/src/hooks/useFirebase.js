import { useState, useEffect, useCallback } from 'react';
import { initializeFirebaseServices, getAuthService } from '../services/firebase';
import { apiService } from '../services/api';

export const useFirebase = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Firebase on mount
  useEffect(() => {
    try {
      initializeFirebaseServices();
      
      // Set up auth state listener
      const authService = getAuthService();
      const unsubscribe = authService.onAuthStateChanged((userData) => {
        setUser(userData);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      setError(error.message);
      setLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.signInWithEmail(email);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.signOut();
      if (!result.success) {
        throw new Error(result.error);
      }
      setUser(null);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUserPreferences = useCallback(async (preferences) => {
    if (!user) throw new Error('User not authenticated');
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.updateUserPreferences(user.id, preferences);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    user,
    loading,
    error,
    signInWithEmail,
    signOut,
    updateUserPreferences,
    isAuthenticated: !!user,
    needsOnboarding: user && !user.onboardingComplete
  };
};

export const useItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async (categoryFilter, maxItems = 50, useCache = true) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getItems(categoryFilter, maxItems, useCache);
      if (!result.success) {
        throw new Error(result.error);
      }
      setItems(result.data || []);
      return result;
    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch items:', error);
      // Return mock data as fallback
      const { mockItems } = await import('../data/mockData');
      setItems(mockItems || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(async (itemData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.addItem(itemData);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Refresh items list
      await fetchItems();
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  const uploadItemImages = useCallback(async (files, itemId, onProgress) => {
    try {
      const result = await apiService.uploadItemImages(files, itemId, onProgress);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error('Failed to upload images:', error);
      throw error;
    }
  }, []);

  return {
    items,
    loading,
    error,
    fetchItems,
    addItem,
    uploadItemImages
  };
};

export const useChats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchChats = useCallback(async (userId, useCache = true) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.getUserChats(userId, useCache);
      if (!result.success) {
        throw new Error(result.error);
      }
      setChats(result.data || []);
      return result;
    } catch (error) {
      setError(error.message);
      console.error('Failed to fetch chats:', error);
      // Return mock data as fallback
      const { mockChats } = await import('../data/mockData');
      setChats(mockChats || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = useCallback(async (chatData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiService.createChat(chatData);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (chatId, message) => {
    try {
      const result = await apiService.sendMessage(chatId, message);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  return {
    chats,
    loading,
    error,
    fetchChats,
    createChat,
    sendMessage
  };
};