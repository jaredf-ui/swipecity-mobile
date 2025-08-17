export interface User {
    id: string;
    email: string;
    username: string;
    avatar_url: string;
    onboardingComplete: boolean;
    verified: boolean;
    created_at: number;
    preferences?: UserPreferences;
}
export interface UserPreferences {
    categories: number[];
    priceRange: number;
    locationRadius: number;
    shoppingStyle: number;
}
export interface Item {
    id: string;
    title: string;
    price: number;
    image_url: string;
    seller_name: string;
    seller_rating: number;
    seller_reviews: number;
    distance: string;
    description: string;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Excellent';
    likes_count: number;
    category: string;
    seller_id: string;
    verified: boolean;
    seller_interested: boolean;
    algorithmScore: number;
}
export interface ChatMessage {
    id: string;
    sender_id: string;
    sender_name: string;
    text: string;
    timestamp: string;
}
export interface Chat {
    id: string;
    seller_name: string;
    item_title: string;
    item_image?: string;
    seller_id: string;
    item_id: string;
    last_message: string;
    timestamp: string;
    unread: boolean;
    messages: ChatMessage[];
}
export interface AppState {
    currentMode: 'buyer' | 'seller';
    currentItemIndex: number;
    showAuthModal: boolean;
    showChats: boolean;
    showProfile: boolean;
    email: string;
    loading: boolean;
    selectedCategories: number[];
    priceRange: string;
    shoppingStyle: string;
    onboardingStep: number;
    dragOffset: {
        x: number;
        y: number;
    };
    isDragging: boolean;
    showMatchAnimation: boolean;
    matchedItem: Item | null;
    dailySwipeCount: number;
    maxDailySwipes: number;
    showLimitModal: boolean;
    reportedItems: Set<string>;
    lastActionTime: number;
    actionCooldown: number;
    startPos: {
        x: number;
        y: number;
    } | null;
    activeChat: Chat | null;
    newMessage: string;
    canUndo: boolean;
    lastPassedItem: Item | null;
    showSettings: boolean;
    settingsCategories: number[];
    settingsPriceRange: number;
    settingsLocationRadius: number;
    settingsShoppingStyle: string;
    showAddItem: boolean;
}
export interface AuthContextType {
    user: User | null;
    signOut: () => void;
    isAuthenticated: boolean;
    needsOnboarding: boolean;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
