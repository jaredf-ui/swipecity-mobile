# Firebase Setup for SwipeCity Production

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `swipecity-prod` (or your preferred name)
4. Enable Google Analytics (recommended)
5. Choose your analytics account and create project

## 2. Enable Required Services

### Authentication
1. Go to **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable the following providers:
   - **Email/Password** ✅
   - **Phone** ✅ (for verification)
   - **Google** ✅ (optional, for easier onboarding)

### Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Start in production mode** (we have security rules ready)
3. Select your preferred location (closest to your users)

### Storage
1. Go to **Storage** → **Get started**
2. Choose **Start in production mode**
3. Select same location as Firestore

### Hosting (Optional)
1. Go to **Hosting** → **Get started**
2. Follow the setup instructions

## 3. Web App Configuration

1. In Firebase Console, click the **Web** icon (</>) to add a web app
2. Enter app nickname: "SwipeCity Web App"
3. ✅ Check "Also set up Firebase Hosting"
4. Click **Register app**
5. Copy the configuration object (you'll need this)

## 4. Environment Variables Setup

1. Create `.env` file in your project root (copy from `.env.example`)
2. Replace the placeholder values with your Firebase config:

\`\`\`bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

NODE_ENV=production
\`\`\`

## 5. Deploy Security Rules

Run these commands in your project directory:

\`\`\`bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules  
firebase deploy --only storage

# Deploy all (optional)
firebase deploy
\`\`\`

## 6. Test Data Structure

Your Firestore database will automatically create these collections when users start using the app:

### Collections:
- **users** - User profiles and settings
- **items** - Item listings from sellers
- **chats** - Conversations between users
- **reports** - User reports for inappropriate content
- **interests** - Buyer interest expressions
- **interactions** - User swipe data for analytics

## 7. Security Notes

✅ **Authentication Required**: All read/write operations require authentication
✅ **User Ownership**: Users can only modify their own data
✅ **Image Validation**: 5MB limit, image files only
✅ **Rate Limiting**: Built into security rules
✅ **Content Moderation**: Reporting system in place

## 8. Testing Setup

### Local Development:
\`\`\`bash
# Use Firebase emulators for development
firebase emulators:start --only auth,firestore,storage

# In your .env file, add:
REACT_APP_USE_EMULATORS=true
\`\`\`

### Production Testing:
1. Deploy rules: \`firebase deploy --only firestore:rules,storage\`
2. Build app: \`npm run build:web\`
3. Test with a few accounts
4. Monitor Firebase Console for errors

## 9. App Configuration Changes Needed

Once Firebase is set up, the app will automatically:
- ✅ Use real authentication instead of mock auth
- ✅ Store listings in Firestore instead of local state
- ✅ Upload images to Firebase Storage
- ✅ Enable real-time chat functionality
- ✅ Implement proper user data persistence

## 10. Next Steps After Setup

1. **Invite Beta Users**: Start with 10-20 trusted users
2. **Monitor Usage**: Check Firebase Console → Analytics
3. **Watch for Errors**: Firebase Console → Crashlytics
4. **Scale Gradually**: Increase user invites as you fix issues
5. **Add Push Notifications**: Firebase Cloud Messaging setup

## ⚠️ Important Security Reminders

- Never commit your `.env` file to version control
- Use different Firebase projects for dev/staging/production
- Regularly review Firebase security rules
- Monitor Firebase usage quotas
- Set up billing alerts in Firebase Console

## 🚀 Launch Checklist

- [ ] Firebase project created and configured
- [ ] Environment variables set correctly
- [ ] Security rules deployed and tested
- [ ] Authentication methods enabled
- [ ] Storage bucket configured
- [ ] App builds successfully with Firebase config
- [ ] Test user can sign up, create listing, and chat
- [ ] Image upload works correctly
- [ ] Reporting system functional
- [ ] Ready for beta testing!