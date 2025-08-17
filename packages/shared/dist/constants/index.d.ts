export declare const CATEGORIES: string[];
export declare const PRICE_RANGES: string[];
export declare const SHOPPING_STYLES: string[];
export declare const APP_CONFIG: {
    readonly MAX_DAILY_SWIPES: 50;
    readonly ACTION_COOLDOWN: 300;
    readonly SWIPE_THRESHOLD: 100;
    readonly DEFAULT_LOCATION_RADIUS: 10;
};
export declare const FIREBASE_COLLECTIONS: {
    readonly USERS: "users";
    readonly ITEMS: "items";
    readonly CHATS: "chats";
    readonly REPORTS: "reports";
};
export declare const ERROR_MESSAGES: {
    readonly AUTH_FAILED: "Authentication failed. Please try again.";
    readonly NETWORK_ERROR: "Network error. Please check your connection.";
    readonly INVALID_EMAIL: "Please enter a valid email address.";
    readonly USER_NOT_FOUND: "User not found.";
    readonly ITEM_NOT_FOUND: "Item not found.";
    readonly GENERIC_ERROR: "Something went wrong. Please try again.";
};
