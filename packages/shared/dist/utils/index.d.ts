export declare const SecurityUtils: {
    validateEmail: (email: string) => boolean;
    sanitizeInput: (input: string) => string;
    isValidUrl: (url: string) => boolean;
};
export declare const DateUtils: {
    formatTimestamp: (timestamp: number) => string;
    formatDate: (timestamp: number) => string;
    isToday: (timestamp: number) => boolean;
};
export declare const ItemUtils: {
    formatPrice: (price: number) => string;
    getCategoryEmoji: (categoryIndex: number) => string;
    generateId: () => string;
};
export declare const ValidationUtils: {
    isValidPrice: (price: number) => boolean;
    isValidCategory: (categoryIndex: number) => boolean;
    isValidPreferences: (preferences: any) => boolean;
};
export declare const PlatformUtils: {
    isMobile: () => boolean;
    isIOS: () => boolean;
    isAndroid: () => boolean;
    isWeb: () => boolean;
};
