# SwipeCity Development Setup - v2.0

## Project Structure
- **Main App**: `/Users/jaredf/Desktop/swipecity-mobile/apps/web/src/App.js`
- **iOS Build**: `/Users/jaredf/Desktop/swipecity-mobile/ios/App/`
- **Android Build**: `/Users/jaredf/Desktop/swipecity-mobile/android/`
- **Working Directory**: `/Users/jaredf/Desktop/swipecity-mobile`

## Quick Development Commands
```bash
# Build web app and sync to mobile
cd /Users/jaredf/Desktop/swipecity-mobile
npm run build:web && npx cap sync

# Open platforms
npx cap open ios      # iOS in Xcode
npx cap open android  # Android in Android Studio

# Start dev server (for web testing)
npm run dev:web
```

## Recent Major Updates (Session Complete)
- **Real Images**: Successfully implemented real Unsplash images for performance testing
- **Data Seeding**: 200+ realistic marketplace listings with real seller data
- **Performance**: Tested and optimized for mobile - good performance on iPhone
- **Animations**: Always-on swipe animations (removed toggle option per user request)
- **Admin Dashboard**: Full data management with clear/reseed functionality
- **Cross-platform**: iOS working perfectly, Android ready for testing

## Firebase Configuration
- **Project**: `swipecity-marketplace` (existing Firebase project)
- **Environment**: Development/Pre-production
- **Data**: Seeded with realistic marketplace data and real images

## Current Status - Ready for Next Session
✅ Real images working (Unsplash URLs by category)
✅ Performance tested on iPhone - good results
✅ Animations permanently enabled and working well
✅ Admin dashboard fully functional
✅ Data seeding system complete
✅ iOS deployment successful

## Next Session Tasks (Prioritized)
1. **Android Testing**: `npx cap open android` - test performance, UI, and features
2. **Production Firebase**: Set up separate production environment
3. **App Store Prep**: Screenshots, metadata, submission requirements

## Session Restart Commands
```bash
cd /Users/jaredf/Desktop/swipecity-mobile
# Continue with Android testing or production setup
```

## Key Files Modified This Session
- `/apps/web/src/utils/dataSeeding.js` - Real image generation
- `/apps/web/src/App.js` - Removed animation toggle, enhanced debugging
- `/apps/web/src/utils/dataIntegration.js` - Enhanced data clearing and loading