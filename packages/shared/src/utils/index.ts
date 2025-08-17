// Security utilities
export const SecurityUtils = {
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  sanitizeInput: (input: string): string => {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  },

  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// Date utilities
export const DateUtils = {
  formatTimestamp: (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  formatDate: (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  },

  isToday: (timestamp: number): boolean => {
    const today = new Date();
    const date = new Date(timestamp);
    return date.toDateString() === today.toDateString();
  }
};

// Item utilities
export const ItemUtils = {
  formatPrice: (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  },

  getCategoryEmoji: (categoryIndex: number): string => {
    const emojis = ['👟', '👕', '📱', '🏠', '📚', '💪'];
    return emojis[categoryIndex] || '🏷️';
  },

  generateId: (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Validation utilities
export const ValidationUtils = {
  isValidPrice: (price: number): boolean => {
    return typeof price === 'number' && price > 0 && price < 1000000;
  },

  isValidCategory: (categoryIndex: number): boolean => {
    return Number.isInteger(categoryIndex) && categoryIndex >= 0 && categoryIndex < 6;
  },

  isValidPreferences: (preferences: any): boolean => {
    return (
      preferences &&
      Array.isArray(preferences.categories) &&
      typeof preferences.priceRange === 'number' &&
      typeof preferences.locationRadius === 'number' &&
      typeof preferences.shoppingStyle === 'number'
    );
  }
};

// Platform detection utilities
export const PlatformUtils = {
  isMobile: (): boolean => {
    return /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || '');
  },

  isIOS: (): boolean => {
    return /iPad|iPhone|iPod/.test(navigator?.userAgent || '');
  },

  isAndroid: (): boolean => {
    return /Android/.test(navigator?.userAgent || '');
  },

  isWeb: (): boolean => {
    return typeof window !== 'undefined' && !(window as any).ReactNativeWebView;
  }
};