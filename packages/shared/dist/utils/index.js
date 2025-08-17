// Security utilities
export const SecurityUtils = {
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    },
    sanitizeInput: (input) => {
        return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    },
    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        }
        catch {
            return false;
        }
    }
};
// Date utilities
export const DateUtils = {
    formatTimestamp: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    formatDate: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    },
    isToday: (timestamp) => {
        const today = new Date();
        const date = new Date(timestamp);
        return date.toDateString() === today.toDateString();
    }
};
// Item utilities
export const ItemUtils = {
    formatPrice: (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(price);
    },
    getCategoryEmoji: (categoryIndex) => {
        const emojis = ['👟', '👕', '📱', '🏠', '📚', '💪'];
        return emojis[categoryIndex] || '🏷️';
    },
    generateId: () => {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};
// Validation utilities
export const ValidationUtils = {
    isValidPrice: (price) => {
        return typeof price === 'number' && price > 0 && price < 1000000;
    },
    isValidCategory: (categoryIndex) => {
        return Number.isInteger(categoryIndex) && categoryIndex >= 0 && categoryIndex < 6;
    },
    isValidPreferences: (preferences) => {
        return (preferences &&
            Array.isArray(preferences.categories) &&
            typeof preferences.priceRange === 'number' &&
            typeof preferences.locationRadius === 'number' &&
            typeof preferences.shoppingStyle === 'number');
    }
};
// Platform detection utilities
export const PlatformUtils = {
    isMobile: () => {
        return /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || '');
    },
    isIOS: () => {
        return /iPad|iPhone|iPod/.test(navigator?.userAgent || '');
    },
    isAndroid: () => {
        return /Android/.test(navigator?.userAgent || '');
    },
    isWeb: () => {
        return typeof window !== 'undefined' && !window.ReactNativeWebView;
    }
};
