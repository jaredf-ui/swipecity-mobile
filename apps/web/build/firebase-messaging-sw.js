// Firebase Cloud Messaging Service Worker

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values should match your .env file
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "swipecity-app.firebaseapp.com", 
  projectId: "swipecity-app",
  storageBucket: "swipecity-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'SwipeCity';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/logo192.png',
    tag: 'swipecity-notification',
    data: payload.data,
    requireInteraction: true,
    actions: []
  };

  // Add action buttons based on notification type
  if (payload.data?.type === 'new_message') {
    notificationOptions.actions = [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/icons/reply.png'
      },
      {
        action: 'view',
        title: 'View Chat',
        icon: '/icons/chat.png'
      }
    ];
  } else if (payload.data?.type === 'new_match') {
    notificationOptions.actions = [
      {
        action: 'message',
        title: 'Send Message',
        icon: '/icons/message.png'
      },
      {
        action: 'view',
        title: 'View Item',
        icon: '/icons/view.png'
      }
    ];
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let url = '/';

  // Determine URL based on notification type and action
  if (data?.type === 'new_message') {
    if (action === 'reply' || action === 'view') {
      url = `/chat/${data.chatId}`;
    }
  } else if (data?.type === 'new_match') {
    if (action === 'message') {
      url = `/chat/new?itemId=${data.itemId}`;
    } else if (action === 'view') {
      url = `/item/${data.itemId}`;
    }
  } else if (data?.url) {
    url = data.url;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Focus existing window and navigate to URL
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: action,
            data: data,
            url: url
          });
          return;
        }
      }

      // Open new window if app is not open
      return clients.openWindow(self.location.origin + url);
    })
  );
});

// Handle push events (for additional processing)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  // You can add custom logic here if needed
  // The messaging.onBackgroundMessage will handle the actual notification display
});

// Cache management for offline functionality
const CACHE_NAME = 'swipecity-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/logo192.png',
  '/manifest.json'
];

// Install service worker and cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch events - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});