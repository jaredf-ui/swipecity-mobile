// SwipeCity - Clear All App Data
// Run this in browser console to reset the app completely

console.log('🧹 Clearing all SwipeCity app data...');

// Clear all localStorage
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('swipecity') || key.includes('firebase'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log('🗑️ Removed:', key);
});

// Clear sessionStorage
sessionStorage.clear();

// Clear IndexedDB (Firebase uses this)
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name.includes('firebase') || db.name.includes('swipecity')) {
        indexedDB.deleteDatabase(db.name);
        console.log('🗑️ Deleted IndexedDB:', db.name);
      }
    });
  });
}

console.log('✅ App data cleared! Refresh the page.');
console.log('📱 On mobile: Force close and reopen the app.');