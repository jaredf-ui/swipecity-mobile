import { User, AppState, Item } from '../types';
export declare const useAppState: (initialState: Partial<AppState>) => {
    appState: AppState;
    updateState: (updates: Partial<AppState>) => void;
    setAppState: import("react").Dispatch<import("react").SetStateAction<AppState>>;
};
export declare const useEmailAuth: () => {
    signInWithEmail: (email: string) => Promise<User | null>;
    loading: boolean;
    error: string | null;
};
export declare const useSwipeActions: (items: Item[], onSwipeComplete?: (item: Item, action: "pass" | "interest") => void) => {
    currentItem: Item;
    hasMoreItems: boolean;
    swipeItem: (action: "pass" | "interest") => void;
    undoSwipe: () => void;
    canUndo: boolean;
    swipeHistory: {
        item: Item;
        action: "pass" | "interest";
    }[];
    currentIndex: number;
};
export declare const useFormValidation: <T extends Record<string, any>>(initialValues: T, validators: Partial<Record<keyof T, (value: any) => string | null>>) => {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    setValue: (field: keyof T, value: any) => void;
    setTouched: (field: keyof T) => void;
    validateAll: () => true;
    isValid: boolean;
};
