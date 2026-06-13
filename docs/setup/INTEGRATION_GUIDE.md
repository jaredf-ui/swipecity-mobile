# Firebase Integration Guide for SwipeCity

## Overview
This guide shows you how to gradually replace mock data with real Firebase data in your App.js file.

## Step 1: Basic Setup (5 minutes)

### 1.1 Add Firebase initialization to your App.js

Add this import at the top of your App.js:
\`\`\`javascript
import { initializeDataServices, DataService } from './utils/dataIntegration';
\`\`\`

### 1.2 Initialize Firebase when app starts

Add this useEffect after your existing useEffects:
\`\`\`javascript
// Initialize Firebase data services
useEffect(() => {
  const initServices = async () => {
    const result = await initializeDataServices();
    if (result.success) {
      console.log('🔥 Firebase ready - real data enabled');
    } else {
      console.log('📱 Using mock data mode');
    }
  };
  
  initServices();
}, []);
\`\`\`

## Step 2: Replace Mock Data Operations (10 minutes)

### 2.1 Update item creation (new listings)

Find your current item creation code and replace it with:
\`\`\`javascript
// In your handleAddItem or similar function
const createNewListing = async (itemData) => {
  try {
    const newListing = await DataService.createItem({
      title: appState.newItemTitle,
      price: parseFloat(appState.newItemPrice),
      condition: appState.newItemCondition,
      description: appState.newItemDescription,
      images: appState.selectedImages,
      seller_id: user?.id || 'user123',
      seller_name: user?.username || 'You',
      category: 'General', // or selected category
    });
    
    // Update local state
    const updatedListings = [newListing, ...(appState.userListings || [])];
    updateState({ 
      userListings: updatedListings,
      showAddItem: false, 
      selectedImages: [], 
      newItemTitle: '', 
      newItemPrice: '', 
      newItemDescription: '' 
    });
    
    console.log('✅ Listing created:', newListing.title);
  } catch (error) {
    console.error('Failed to create listing:', error);
    alert('Failed to create listing. Please try again.');
  }
};
\`\`\`

### 2.2 Update reporting functionality

Find your report handling code and replace it with:
\`\`\`javascript
// In your report modal submission
const submitReport = async () => {
  if (!appState.selectedReportReason) {
    alert('Please select a reason for reporting.');
    return;
  }
  
  try {
    const success = await DataService.reportItem(
      appState.reportingItem.id, 
      user?.id || 'user123', 
      appState.selectedReportReason
    );
    
    if (success) {
      // Update local state
      const newReportedItems = new Set(appState.reportedItems);
      newReportedItems.add(appState.reportingItem.id);
      
      updateState({
        reportedItems: newReportedItems,
        userReportCount: appState.userReportCount + 1,
        showReportModal: false,
        reportingItem: null,
        selectedReportReason: ''
      });
      
      alert('Thank you for your report. We will review this item.');
    }
  } catch (error) {
    console.error('Failed to report item:', error);
    alert('Failed to submit report. Please try again.');
  }
};
\`\`\`

## Step 3: Load Real Data (15 minutes)

### 3.1 Replace mock items with Firebase items

Add this function to load real items:
\`\`\`javascript
const loadItemsFromFirebase = async () => {
  try {
    const items = await DataService.getItems({
      categories: appState.selectedShoppingCategories,
      limit: 50
    });
    
    // Update your items state
    // Replace this with your actual items state update
    console.log(\`📦 Loaded \${items.length} items from database\`);
    
    // If you want to merge with existing mock data temporarily:
    // setItems(prevItems => [...items, ...prevItems]);
    
  } catch (error) {
    console.error('Failed to load items:', error);
  }
};

// Call this function when you want to load items
useEffect(() => {
  if (user && appState.onboardingStep === undefined) {
    loadItemsFromFirebase();
  }
}, [user, appState.onboardingStep]);
\`\`\`

## Step 4: Test Integration (5 minutes)

### 4.1 Test without Firebase (mock mode)
\`\`\`bash
npm start
# Should work exactly as before - using mock data
\`\`\`

### 4.2 Test with Firebase (after setup)
1. Set up your Firebase project (see FIREBASE_SETUP.md)
2. Create your .env file with Firebase config
3. \`npm start\`
4. Create a test listing - should save to Firestore
5. Report a test item - should save to Firestore

## Step 5: Full Integration (Optional - 30 minutes)

If you want to fully integrate Firebase, you can replace the entire mock data system:

### 5.1 Replace the useFirebaseData hook
\`\`\`javascript
import useFirebaseData from './hooks/useFirebaseData';

// In your main component
const SwipeMarketplace = () => {
  const { user, isAuthenticated } = useAuth();
  
  // Replace your existing data management with:
  const {
    items,
    chats,
    userListings,
    loading,
    createListing,
    updateListing,
    deleteListing,
    uploadImages,
    createChat,
    sendMessage,
    reportItem
  } = useFirebaseData(user);
  
  // Use these instead of your current state management
};
\`\`\`

## Fallback Strategy

The integration is designed to be safe:

✅ **If Firebase is not configured**: Uses mock data, app works normally
✅ **If Firebase is configured**: Uses real data, with fallback to mock if errors
✅ **Gradual transition**: You can implement piece by piece
✅ **No breaking changes**: Existing functionality preserved

## Testing Checklist

- [ ] App starts without errors (mock mode)
- [ ] Can create test listing (saves locally in mock mode)
- [ ] Can report item (logs in mock mode)
- [ ] Firebase project configured
- [ ] Environment variables set
- [ ] App starts with Firebase (real mode)
- [ ] Can create listing (saves to Firestore)
- [ ] Can report item (saves to Firestore)
- [ ] Data persists after app reload

## Next Steps After Integration

1. **Test with friends**: Invite a few people to test
2. **Monitor Firebase**: Check console for errors
3. **Add features**: Image upload, real-time chat, etc.
4. **Scale gradually**: Expand user base slowly
5. **Add analytics**: Track usage and issues

## Need Help?

If you run into issues:
1. Check browser console for errors
2. Check Firebase console for data
3. Verify environment variables
4. Test with Firebase emulators first
5. Start with mock mode and gradually enable Firebase

The integration is designed to be forgiving - your app will keep working even if Firebase has issues!