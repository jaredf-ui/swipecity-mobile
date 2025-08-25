import { useState, useEffect, useCallback } from 'react';
import { initializeFirebaseServices, getFirestoreService, getStorageService } from '../services/firebase';

/**
 * Custom hook for managing Firebase data operations
 * Replaces mock data with real Firestore operations
 */
export const useFirebaseData = (user) => {
  const [items, setItems] = useState([]);
  const [chats, setChats] = useState([]);
  const [userListings, setUserListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Firebase services
  useEffect(() => {
    try {
      initializeFirebaseServices();
      console.log('✅ Firebase services initialized for data operations');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase services:', error);
      setError(error.message);
    }
  }, []);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);

    try {
      const firestoreService = getFirestoreService();
      
      // Load items (listings from all users)
      const itemsResponse = await firestoreService.getItems([], 50);
      if (itemsResponse.success) {
        setItems(itemsResponse.data || []);
      } else {
        console.error('Failed to load items:', itemsResponse.error);
      }

      // Load user's own listings
      if (user?.id) {
        const userListingsResponse = await firestoreService.query('items', [
          { field: 'seller_id', operator: '==', value: user.id }
        ], 'created_at', 20);
        
        if (userListingsResponse.success) {
          setUserListings(userListingsResponse.data || []);
        }

        // Load user's chats
        const chatsResponse = await firestoreService.getUserChats(user.id);
        if (chatsResponse.success) {
          setChats(chatsResponse.data || []);
        }
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new listing
  const createListing = useCallback(async (listingData) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const firestoreService = getFirestoreService();
      
      const newListing = {
        ...listingData,
        seller_id: user.id,
        seller_name: user.username || 'Unknown User',
        seller_avatar: user.avatar_url || '',
        created_at: Date.now(),
        status: 'active',
        views: 0,
        interests: []
      };

      const response = await firestoreService.addItem(newListing);
      
      if (response.success) {
        const createdListing = { id: response.data, ...newListing };
        
        // Update local state
        setItems(prevItems => [createdListing, ...prevItems]);
        setUserListings(prevListings => [createdListing, ...prevListings]);
        
        return createdListing;
      } else {
        throw new Error(response.error || 'Failed to create listing');
      }
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }, [user]);

  // Update existing listing
  const updateListing = useCallback(async (listingId, updates) => {
    try {
      const firestoreService = getFirestoreService();
      const response = await firestoreService.updateItem(listingId, updates);
      
      if (response.success) {
        // Update local state
        const updateLocalListing = (prevListings) => 
          prevListings.map(listing => 
            listing.id === listingId ? { ...listing, ...updates } : listing
          );
        
        setItems(updateLocalListing);
        setUserListings(updateLocalListing);
        
        return true;
      } else {
        throw new Error(response.error || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      throw error;
    }
  }, []);

  // Delete listing
  const deleteListing = useCallback(async (listingId) => {
    try {
      const firestoreService = getFirestoreService();
      const response = await firestoreService.deleteItem(listingId);
      
      if (response.success) {
        // Update local state
        const removeFromLocal = (prevListings) => 
          prevListings.filter(listing => listing.id !== listingId);
        
        setItems(removeFromLocal);
        setUserListings(removeFromLocal);
        
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      throw error;
    }
  }, []);

  // Upload images to Firebase Storage
  const uploadImages = useCallback(async (files) => {
    if (!files || files.length === 0) return [];

    try {
      const storageService = getStorageService();
      const uploadPromises = files.map(async (file) => {
        const fileName = \`item_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}.\${file.name.split('.').pop()}\`;
        const path = \`images/items/\${fileName}\`;
        
        return await storageService.uploadFile(file, path);
      });

      const results = await Promise.all(uploadPromises);
      
      // Filter successful uploads and return URLs
      return results
        .filter(result => result.success)
        .map(result => ({ url: result.data }));
        
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  }, []);

  // Create or get chat between users
  const createChat = useCallback(async (participantId, itemInfo) => {
    if (!user?.id || !participantId) {
      throw new Error('Missing user information for chat creation');
    }

    try {
      const firestoreService = getFirestoreService();
      
      const newChat = {
        participants: [user.id, participantId].sort(), // Sort for consistency
        participantNames: [user.username, itemInfo.sellerName || 'Unknown'],
        messages: [],
        lastMessage: null,
        lastMessageTime: Date.now(),
        itemTitle: itemInfo.title,
        itemImage: itemInfo.image,
        itemPrice: itemInfo.price,
        itemId: itemInfo.id
      };

      const response = await firestoreService.createChat(newChat);
      
      if (response.success) {
        const createdChat = { id: response.data, ...newChat };
        setChats(prevChats => [createdChat, ...prevChats]);
        return createdChat;
      } else {
        throw new Error(response.error || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }, [user]);

  // Send message in chat
  const sendMessage = useCallback(async (chatId, messageText) => {
    if (!user?.id || !messageText.trim()) {
      throw new Error('Invalid message data');
    }

    try {
      const firestoreService = getFirestoreService();
      
      const message = {
        id: \`msg_\${Date.now()}\`,
        sender_id: user.id,
        sender_name: user.username || 'Unknown',
        text: messageText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        created_at: Date.now()
      };

      const response = await firestoreService.addMessageToChat(chatId, message);
      
      if (response.success) {
        // Update local chat state
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId 
              ? {
                  ...chat,
                  messages: [...(chat.messages || []), message],
                  lastMessage: message.text,
                  lastMessageTime: Date.now()
                }
              : chat
          )
        );
        
        return message;
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [user]);

  // Report item
  const reportItem = useCallback(async (itemId, reason) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const firestoreService = getFirestoreService();
      const response = await firestoreService.reportItem(itemId, user.id, reason);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to report item');
      }
      
      return true;
    } catch (error) {
      console.error('Error reporting item:', error);
      throw error;
    }
  }, [user]);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (user) {
      await loadInitialData();
    }
  }, [user]);

  return {
    // Data
    items,
    chats,
    userListings,
    loading,
    error,
    
    // Actions
    createListing,
    updateListing,
    deleteListing,
    uploadImages,
    createChat,
    sendMessage,
    reportItem,
    refreshData,
    
    // Setters (for backward compatibility)
    setItems,
    setChats,
    setUserListings
  };
};

export default useFirebaseData;