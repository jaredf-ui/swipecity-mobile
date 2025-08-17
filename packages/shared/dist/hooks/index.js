import { useCallback, useState } from 'react';
import { APP_CONFIG } from '../constants';
import { SecurityUtils } from '../utils';
// Custom hook for managing app state
export const useAppState = (initialState) => {
    const [appState, setAppState] = useState({
        currentMode: 'buyer',
        currentItemIndex: 0,
        showAuthModal: false,
        showChats: false,
        showProfile: false,
        email: '',
        loading: false,
        selectedCategories: [],
        priceRange: '',
        shoppingStyle: '',
        onboardingStep: 1,
        dragOffset: { x: 0, y: 0 },
        isDragging: false,
        showMatchAnimation: false,
        matchedItem: null,
        dailySwipeCount: 0,
        maxDailySwipes: APP_CONFIG.MAX_DAILY_SWIPES,
        showLimitModal: false,
        reportedItems: new Set(),
        lastActionTime: 0,
        actionCooldown: APP_CONFIG.ACTION_COOLDOWN,
        startPos: null,
        activeChat: null,
        newMessage: '',
        canUndo: false,
        lastPassedItem: null,
        showSettings: false,
        settingsCategories: [],
        settingsPriceRange: 0,
        settingsLocationRadius: APP_CONFIG.DEFAULT_LOCATION_RADIUS,
        settingsShoppingStyle: '',
        showAddItem: false,
        ...initialState
    });
    const updateState = useCallback((updates) => {
        setAppState(prev => ({ ...prev, ...updates }));
    }, []);
    return { appState, updateState, setAppState };
};
// Custom hook for email authentication
export const useEmailAuth = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const signInWithEmail = useCallback(async (email) => {
        setLoading(true);
        setError(null);
        try {
            const sanitizedEmail = SecurityUtils.sanitizeInput(email);
            if (!SecurityUtils.validateEmail(sanitizedEmail)) {
                throw new Error('Invalid email address');
            }
            // Firebase email link authentication would go here
            // For now, return a mock user
            const userData = {
                id: `user_${Date.now()}`,
                email: sanitizedEmail,
                username: sanitizedEmail.split('@')[0],
                avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
                onboardingComplete: false,
                verified: false,
                created_at: Date.now()
            };
            return userData;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            setError(errorMessage);
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);
    return { signInWithEmail, loading, error };
};
// Custom hook for item swiping logic
export const useSwipeActions = (items, onSwipeComplete) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [swipeHistory, setSwipeHistory] = useState([]);
    const swipeItem = useCallback((action) => {
        const currentItem = items[currentIndex];
        if (!currentItem)
            return;
        setSwipeHistory(prev => [...prev, { item: currentItem, action }]);
        setCurrentIndex(prev => prev + 1);
        onSwipeComplete?.(currentItem, action);
    }, [currentIndex, items, onSwipeComplete]);
    const undoSwipe = useCallback(() => {
        if (swipeHistory.length === 0)
            return;
        setSwipeHistory(prev => prev.slice(0, -1));
        setCurrentIndex(prev => Math.max(0, prev - 1));
    }, [swipeHistory]);
    const canUndo = swipeHistory.length > 0;
    const currentItem = items[currentIndex] || null;
    const hasMoreItems = currentIndex < items.length;
    return {
        currentItem,
        hasMoreItems,
        swipeItem,
        undoSwipe,
        canUndo,
        swipeHistory,
        currentIndex
    };
};
// Custom hook for form validation
export const useFormValidation = (initialValues, validators) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const setValue = useCallback((field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
        // Validate on change if field has been touched
        if (touched[field] && validators[field]) {
            const error = validators[field](value);
            setErrors(prev => ({ ...prev, [field]: error }));
        }
    }, [touched, validators]);
    const setFieldTouched = useCallback((field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        // Validate on blur
        if (validators[field]) {
            const error = validators[field](values[field]);
            setErrors(prev => ({ ...prev, [field]: error }));
        }
    }, [validators, values]);
    const validateAll = useCallback(() => {
        const newErrors = {};
        let isValid = true;
        Object.keys(validators).forEach(field => {
            const validator = validators[field];
            if (validator) {
                const error = validator(values[field]);
                if (error) {
                    newErrors[field] = error;
                    isValid = false;
                }
            }
        });
        setErrors(newErrors);
        return isValid;
    }, [validators, values]);
    return {
        values,
        errors,
        touched,
        setValue,
        setTouched: setFieldTouched,
        validateAll,
        isValid: Object.keys(errors).length === 0
    };
};
