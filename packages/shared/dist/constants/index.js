// Categories for marketplace items
export const CATEGORIES = [
    '👟 Sneakers',
    '👕 Vintage',
    '📱 Electronics',
    '🏠 Home',
    '📚 Books',
    '💪 Fitness'
];
// Price range options
export const PRICE_RANGES = [
    'Under $25',
    '$25-$100',
    '$100-$500',
    '$500+'
];
// Shopping style options  
export const SHOPPING_STYLES = [
    'Trendy & New',
    'Vintage & Unique',
    'Budget Finds',
    'Premium Quality'
];
// App configuration
export const APP_CONFIG = {
    MAX_DAILY_SWIPES: 50,
    ACTION_COOLDOWN: 300, // ms
    SWIPE_THRESHOLD: 100,
    DEFAULT_LOCATION_RADIUS: 10, // miles
};
// Firebase collections
export const FIREBASE_COLLECTIONS = {
    USERS: 'users',
    ITEMS: 'items',
    CHATS: 'chats',
    REPORTS: 'reports'
};
// Error messages
export const ERROR_MESSAGES = {
    AUTH_FAILED: 'Authentication failed. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    USER_NOT_FOUND: 'User not found.',
    ITEM_NOT_FOUND: 'Item not found.',
    GENERIC_ERROR: 'Something went wrong. Please try again.'
};
