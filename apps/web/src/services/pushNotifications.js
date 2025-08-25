import { useState } from 'react';

// Push notifications - will be enabled when Firebase is configured
// For now, using mock implementation to allow build to succeed

// Mock Firebase messaging functions
const getMessaging = () => null;
const getToken = () => Promise.resolve('mock_token');
const onMessage = () => () => {};

// Mock Firebase instances
const getFirebaseInstances = () => ({ app: null });

class PushNotificationService {
  constructor() {
    this.messaging = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const { app } = getFirebaseInstances();
      this.messaging = getMessaging(app);
      this.initialized = true;
      
      console.log('Push notifications initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      throw error;
    }
  }

  async requestPermission() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        const token = await this.getToken();
        return { success: true, token };
      } else {
        console.log('Notification permission denied');
        return { success: false, error: 'Permission denied' };
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { success: false, error: error.message };
    }
  }

  async getToken() {
    if (!this.initialized || !this.messaging) {
      throw new Error('Push notifications not initialized');
    }

    try {
      const token = await getToken(this.messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  }

  setupForegroundMessageListener(callback) {
    if (!this.initialized || !this.messaging) {
      console.warn('Push notifications not initialized');
      return () => {};
    }

    return onMessage(this.messaging, (payload) => {
      console.log('Received foreground message:', payload);
      
      // Show custom notification
      this.showNotification({
        title: payload.notification?.title || 'SwipeCity',
        body: payload.notification?.body || 'You have a new notification',
        icon: payload.notification?.icon || '/logo192.png',
        data: payload.data
      });

      if (callback) {
        callback(payload);
      }
    });
  }

  showNotification({ title, body, icon, data }) {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon,
        badge: '/logo192.png',
        tag: 'swipecity-notification',
        data,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle notification click based on data
        if (data?.type === 'new_message' && data?.chatId) {
          // Navigate to chat
          window.postMessage({ 
            type: 'NOTIFICATION_CLICK', 
            action: 'OPEN_CHAT', 
            chatId: data.chatId 
          }, '*');
        } else if (data?.type === 'new_match' && data?.itemId) {
          // Navigate to match
          window.postMessage({ 
            type: 'NOTIFICATION_CLICK', 
            action: 'OPEN_MATCH', 
            itemId: data.itemId 
          }, '*');
        }
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Send token to server
  async registerToken(userId, token) {
    try {
      // In a real app, you'd send this to your backend
      const response = await fetch('/api/register-push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          token,
          platform: 'web'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register push token');
      }

      console.log('Push token registered successfully');
      return { success: true };
    } catch (error) {
      console.error('Error registering push token:', error);
      // For now, just store locally as fallback
      localStorage.setItem('fcm_token', token);
      localStorage.setItem('fcm_user_id', userId);
      return { success: false, error: error.message };
    }
  }

  // Unregister token
  async unregisterToken(userId) {
    try {
      const response = await fetch('/api/unregister-push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to unregister push token');
      }

      console.log('Push token unregistered successfully');
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_user_id');
      return { success: true };
    } catch (error) {
      console.error('Error unregistering push token:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if notifications are supported and enabled
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  getPermissionStatus() {
    if (!this.isSupported()) {
      return 'not-supported';
    }
    return Notification.permission;
  }
}

// Create singleton instance
export const pushNotificationService = new PushNotificationService();

// Hook for easy React integration
export const usePushNotifications = () => {
  const [permission, setPermission] = useState(
    pushNotificationService.getPermissionStatus()
  );
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestPermission = async () => {
    setLoading(true);
    try {
      const result = await pushNotificationService.requestPermission();
      if (result.success) {
        setPermission('granted');
        setToken(result.token);
      } else {
        setPermission('denied');
      }
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setPermission('denied');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setupMessageListener = (callback) => {
    return pushNotificationService.setupForegroundMessageListener(callback);
  };

  return {
    permission,
    token,
    loading,
    isSupported: pushNotificationService.isSupported(),
    requestPermission,
    setupMessageListener
  };
};