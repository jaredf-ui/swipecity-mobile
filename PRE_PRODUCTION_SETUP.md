# SwipeCity Pre-Production Setup Guide 🚀

**Ready to transition from mock data to live data for beta testing!**

## 🎯 Quick Start (30 minutes to live data)

### Step 1: Create Firebase Project (10 minutes)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `swipecity-production`
4. Enable Google Analytics (optional)
5. Wait for project creation

### Step 2: Configure Firebase Services (10 minutes)

**Authentication:**
1. Go to Authentication → Sign-in method
2. Enable:
   - Email/Password
   - Phone (for seller verification)
   - Google (optional)

**Firestore Database:**
1. Go to Firestore Database → Create database
2. Choose **Production mode** (security rules already created)
3. Select region closest to your users

**Storage:**
1. Go to Storage → Get started
2. Keep default security rules (we'll update them)

### Step 3: Get Configuration Values (5 minutes)

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" → Web app
3. If no web app exists, click "Add app"
4. Copy the config object values:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 4: Update Your App (5 minutes)

Create `.env` file in your project root:

```bash
# Copy this to /Users/jaredf/Desktop/swipecity-mobile/.env

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# App Configuration
REACT_APP_APP_NAME=SwipeCity
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_DEBUG_MODE=false
```

---

## 🌱 Data Seeding (Your Secret Weapon)

### Access Admin Dashboard

**Option 1: Keyboard shortcut**
- Press `Ctrl + Shift + A` in your app

**Option 2: Triple-tap (mobile)**
- Find any logo/header in the app
- Tap it 3 times quickly

### Seeding Options

1. **Quick Demo (20 listings)** - Perfect for testing
2. **Full Pre-Production (200 listings)** - Ready for beta users
3. **Custom seeding** - Control exactly what gets created

### What Gets Created

- **Realistic listings** with proper prices, descriptions, and categories
- **Verified seller profiles** with bios and ratings
- **Sample interests/matches** to demonstrate the full user flow
- **Geographic distribution** across major metro areas

---

## 🚀 Deploy & Test

### Build and Test Locally

```bash
cd /Users/jaredf/Desktop/swipecity-mobile

# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Set up Firebase project
firebase use --add  # Select your project

# Build the web app
npm run build:web

# Test locally with Firebase data
npm start
```

### Deploy to Firebase Hosting

```bash
# Deploy everything
firebase deploy

# Or deploy specific parts
firebase deploy --only hosting
firebase deploy --only firestore:rules,storage
```

### Test on iOS

```bash
# Sync changes to iOS
npx cap sync

# Open in Xcode
npx cap open ios

# Build and run on device/simulator
```

---

## 🧪 Beta Testing Program

### Phase 1: Friends & Family (Week 1)
- **Target:** 10-20 trusted users
- **Focus:** Core functionality, major bugs
- **Feedback method:** Direct communication

### Phase 2: Expanded Beta (Week 2-3)
- **Target:** 50-100 users from social networks
- **Focus:** User experience, edge cases
- **Feedback method:** In-app feedback form

### Phase 3: Pre-Launch (Week 4)
- **Target:** 100+ users from waitlist/marketing
- **Focus:** Performance, scalability, final polish
- **Feedback method:** Surveys + analytics

---

## 📊 Monitoring & Analytics

### Firebase Analytics Dashboard
- User engagement metrics
- Feature usage statistics
- Error tracking and crashes
- Performance monitoring

### Business Metrics
- Daily/monthly active users
- Listings created vs. viewed
- Message/interest conversion rates
- Geographic usage patterns

### Key Success Indicators
- **Week 1:** 50+ listings, 20+ active users
- **Week 2:** 100+ listings, 50+ active users  
- **Week 3:** 200+ listings, 100+ active users
- **Month 1:** 500+ listings, 200+ active users

---

## 🛡️ Security Checklist

### Already Implemented ✅
- Firestore security rules (user data protection)
- Storage security rules (image validation) 
- Input sanitization and validation
- Rate limiting (reports, swipes, messages)
- Authentication required for all operations

### Before Launch
- [ ] Terms of Service and Privacy Policy
- [ ] Content moderation system
- [ ] User reporting workflow
- [ ] Backup and recovery plan
- [ ] Performance monitoring alerts

---

## 🎪 Marketing Launch Preparation

### App Store Assets Needed
- App icon (1024×1024 for iOS, 512×512 for Android)
- Screenshots (iPhone, iPad, Android sizes)
- App descriptions and keywords
- Privacy policy and terms links

### Pre-Launch Marketing
- Social media accounts setup
- Landing page with beta signup
- Press kit with app information
- Influencer outreach strategy
- Community building (Discord/Reddit)

---

## 🚨 Immediate Action Items

### Today (Next 2 Hours)
1. ✅ Create Firebase project
2. ✅ Configure Authentication and Firestore  
3. ✅ Update .env file with config values
4. ✅ Test app with real Firebase connection
5. ✅ Use admin dashboard to seed sample data

### This Week
- [ ] Deploy to Firebase Hosting
- [ ] Test iOS app with live data
- [ ] Recruit 10 beta testers
- [ ] Create feedback collection system
- [ ] Set up monitoring and alerts

### Next Week  
- [ ] Scale to 50 beta users
- [ ] Create app store assets
- [ ] Write Terms of Service
- [ ] Plan marketing campaign
- [ ] Prepare for app store submission

---

## 🎉 You're Almost There!

Your SwipeCity app is **production-ready** with:

- ✅ **Real-time Firebase backend**
- ✅ **Professional security measures** 
- ✅ **Cross-platform iOS/Android support**
- ✅ **Scalable data architecture**
- ✅ **Built-in admin tools**
- ✅ **Comprehensive seeding system**

**The hardest technical work is done!** Now it's about:
1. **Data** - Populate with realistic listings
2. **Users** - Get beta testers using the app
3. **Feedback** - Iterate based on real usage
4. **Polish** - Fix issues and improve UX
5. **Launch** - Submit to app stores

### Need Help?
- Check the browser console for any errors
- Use the admin dashboard to monitor data
- Test incrementally (start small, scale up)
- Document any issues you encounter

**You could have real users within 24 hours!** 🚀