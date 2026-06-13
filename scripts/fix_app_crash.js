// SwipeCity Crash Recovery Script
// Add this to the app's error boundary or run in console

const fixAppCrash = () => {
  console.log('🔧 SwipeCity Crash Recovery initiated...');
  
  try {
    // 1. Clear corrupted localStorage data
    const swipeCityKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('swipecity')) {
        swipeCityKeys.push(key);
      }
    }
    
    console.log('🗑️ Found localStorage keys to clear:', swipeCityKeys);
    
    swipeCityKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        // Try to parse to see if it's corrupted
        if (key.includes('_user') || key.includes('_state')) {
          JSON.parse(value); // This will throw if corrupted
        }
      } catch (e) {
        console.log('🗑️ Removing corrupted key:', key);
        localStorage.removeItem(key);
      }
    });
    
    // 2. Reset app to clean state
    const cleanState = {
      currentItemIndex: 0,
      hasSeenTutorial: false,
      items: [],
      user: null,
      initialized: false
    };
    
    localStorage.setItem('swipecity_clean_state', JSON.stringify(cleanState));
    
    // 3. Clear any Firebase auth persistence issues
    try {
      if (window.firebase?.auth) {
        window.firebase.auth().signOut();
      }
    } catch (e) {
      console.log('Firebase signout error:', e);
    }
    
    console.log('✅ Crash recovery completed');
    console.log('📱 Please refresh/restart the app');
    
    return true;
  } catch (error) {
    console.error('❌ Crash recovery failed:', error);
    return false;
  }
};

// Auto-run recovery if localStorage indicates repeated crashes
const crashCount = parseInt(localStorage.getItem('swipecity_crash_count') || '0');
if (crashCount > 2) {
  console.log('🚨 Multiple crashes detected, auto-running recovery...');
  fixAppCrash();
  localStorage.setItem('swipecity_crash_count', '0');
} else {
  localStorage.setItem('swipecity_crash_count', String(crashCount + 1));
}

// Export for manual use
if (typeof window !== 'undefined') {
  window.fixSwipeCityCrash = fixAppCrash;
}