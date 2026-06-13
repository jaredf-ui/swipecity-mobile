# SwipeCity Deployment Guide

This guide will help you deploy your SwipeCity app to production and the App Store.

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed
- [Xcode](https://developer.apple.com/xcode/) for iOS development
- Apple Developer Account for App Store deployment
- Google account for Firebase

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Name your project (e.g., "swipecity-app")
4. Enable Google Analytics (recommended)
5. Wait for project creation to complete

### 1.2 Enable Firebase Services
1. **Authentication:**
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" and "Email link (passwordless sign-in)"
   
2. **Firestore Database:**
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode
   - Choose your location (closest to your users)
   
3. **Storage:**
   - Go to Storage
   - Click "Get started"
   - Start in production mode
   
4. **Cloud Messaging:**
   - Go to Cloud Messaging
   - Generate VAPID key pairs for web push certificates

### 1.3 Get Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web
4. Register your app (name: "SwipeCity")
5. Copy the Firebase configuration object

## Step 2: Environment Configuration

### 2.1 Update Environment Variables
Edit `apps/web/.env` with your Firebase configuration:

\`\`\`bash
REACT_APP_FIREBASE_API_KEY=your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_VAPID_KEY=your-vapid-key
\`\`\`

### 2.2 Update Service Worker
Edit `apps/web/public/firebase-messaging-sw.js` with the same Firebase config values.

## Step 3: Deploy to Firebase

### 3.1 Initialize Firebase
\`\`\`bash
cd /Users/jaredf/Desktop/swipecity-mobile
firebase login
firebase init
\`\`\`

Select:
- Firestore (with existing rules)
- Functions (TypeScript)
- Hosting
- Storage

### 3.2 Deploy Security Rules
\`\`\`bash
firebase deploy --only firestore:rules,storage:rules
\`\`\`

### 3.3 Deploy Cloud Functions
\`\`\`bash
firebase deploy --only functions
\`\`\`

### 3.4 Deploy Web App (Optional)
\`\`\`bash
npm run build:web
firebase deploy --only hosting
\`\`\`

## Step 4: iOS App Store Preparation

### 4.1 Build for iOS
\`\`\`bash
npm run build:all
npx cap sync ios
npx cap open ios
\`\`\`

### 4.2 iOS Configuration
1. Open the project in Xcode
2. Update app identifier: `com.yourcompany.swipecity`
3. Set development team
4. Configure app icons and launch screen
5. Update app version and build number

### 4.3 App Store Connect Setup
1. Create app record in [App Store Connect](https://appstoreconnect.apple.com)
2. Fill in app metadata:
   - App name: "SwipeCity"
   - Category: "Shopping"
   - Keywords: "marketplace, buying, selling, local"
   - Description: Write compelling app description
3. Add screenshots for all device sizes
4. Set pricing (free with optional in-app purchases)

### 4.4 Push Notifications Setup
1. Generate APNs certificates in Apple Developer Portal
2. Upload certificates to Firebase Console > Cloud Messaging
3. Test push notifications in development

## Step 5: Testing

### 5.1 Local Testing
\`\`\`bash
# Test web version
npm run dev:web

# Test iOS version
npx cap run ios
\`\`\`

### 5.2 Firebase Emulator Testing
\`\`\`bash
firebase emulators:start
\`\`\`

### 5.3 TestFlight Beta Testing
1. Archive app in Xcode
2. Upload to App Store Connect
3. Add internal/external testers
4. Collect feedback and iterate

## Step 6: Production Deployment

### 6.1 Final Builds
\`\`\`bash
# Production build
REACT_APP_ENVIRONMENT=production npm run build:all
npx cap sync ios
\`\`\`

### 6.2 App Store Submission
1. Create production archive in Xcode
2. Upload to App Store Connect
3. Submit for review
4. Monitor review status

## Step 7: Post-Launch

### 7.1 Monitoring
- Set up Firebase Analytics
- Monitor crash reports
- Track user engagement
- Monitor Cloud Functions logs

### 7.2 Updates
- Use CodePush for quick updates (optional)
- Regular app updates through App Store
- Monitor and respond to user reviews

## Security Checklist

- [ ] Firebase security rules deployed and tested
- [ ] Environment variables secured
- [ ] API keys restricted to specific domains
- [ ] User input validation implemented
- [ ] Image upload validation in place
- [ ] Rate limiting configured
- [ ] Content moderation functions active

## Performance Optimization

- [ ] Image compression enabled
- [ ] Bundle size optimized
- [ ] Offline caching configured
- [ ] Push notifications working
- [ ] Database indexes created
- [ ] Cloud Functions optimized

## Troubleshooting

### Common Issues
1. **White screen on iOS:** Check Capacitor configuration and rebuild
2. **Push notifications not working:** Verify VAPID keys and certificates
3. **Firebase rules errors:** Test rules in Firebase Console
4. **Build failures:** Clear caches and reinstall dependencies

### Support Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Success Metrics

Track these KPIs after launch:
- Daily/Monthly Active Users
- User Retention Rate
- Match Rate
- Message Response Rate
- Item Listing Rate
- App Store Rating

---

**Need Help?** Check the troubleshooting section or create an issue in the project repository.