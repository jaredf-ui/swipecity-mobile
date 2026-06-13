# 🚀 Submit SwipeCity to App Store - Quick Guide

## Step 1: Open Xcode and Archive

```bash
# Xcode should already be open, if not:
open ~/Desktop/swipecity-mobile/ios/App/App.xcworkspace
```

**In Xcode:**
1. Select **"Any iOS Device (arm64)"** from the device selector (top bar)
2. Menu: **Product → Clean Build Folder** (⇧⌘K)
3. Menu: **Product → Archive** (wait 2-3 minutes)

## Step 2: Upload to App Store Connect

**When Archive completes:**
1. Organizer window opens automatically
2. Select your archive → Click **"Distribute App"**
3. Choose **"App Store Connect"** → Next
4. Choose **"Upload"** → Next
5. Options:
   - ✅ Include bitcode
   - ✅ Upload symbols
   - ✅ Manage Version and Build Number automatically
6. Click **"Next"** → **"Upload"**
7. Wait for upload (2-5 minutes)

## Step 3: Create App in App Store Connect

**While upload processes, in your browser:**

1. Go to: https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platforms**: ✅ iOS
   - **Name**: SwipeCity
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select `com.jaredfeeny.swipecity`
   - **SKU**: SWIPECITY001
   - **User Access**: Full Access

## Step 4: Configure App Information

**In App Store Connect → Your App:**

### General Information
- **Category**: Shopping
- **Secondary**: Lifestyle
- **Content Rights**: ✅ No third-party content

### Age Rating
Click **"Set Age Rating"** and answer:
- Violence: None
- Sexual Content: None
- Profanity: None
- Medical: No
- Gambling: No
- **Result**: 12+ (due to user-generated content)

## Step 5: Add App Version Information

### Version Information Tab

**Screenshots** (Required - 5 minimum):
For now, you can use simulator screenshots:
1. Run app in iPhone 15 Pro Max simulator
2. Take screenshots with ⌘S
3. Upload at least 5 for 6.7" display

**Description** (copy/paste):
```
SwipeCity revolutionizes local marketplace shopping with an intuitive swipe interface inspired by dating apps. Discover items from your community, connect with sellers, and make deals - all with a simple swipe!

Key Features:
• Swipe to Shop - Browse with an engaging swipe interface
• Instant Messaging - Chat directly with sellers
• Seller Mode - List items in minutes
• Location-Based Discovery - Find items near you
• Smart Categories - Browse organized categories
• Price Filtering - Set your budget
• Save Favorites - Build your wishlist

Join thousands discovering the joy of swipe shopping!
```

**Keywords**:
```
marketplace,local,buy,sell,swipe,shop,deals,secondhand,thrift,community
```

**Support URL**: https://swipecity.app/support
**Marketing URL**: https://swipecity.app

**Version**: 1.0
**Copyright**: © 2024 Jared Feeny

**What's New**:
```
Initial release of SwipeCity
- Swipe-based marketplace browsing
- Real-time chat with sellers
- Location-based discovery
- Seller mode for listings
```

## Step 6: Add Build

1. Go to **"Build"** section
2. Click **"Select a build before you submit"**
3. Choose the build you just uploaded (may take 5-10 min to appear)
4. Click **"Done"**

## Step 7: App Privacy

Click **"Manage" under App Privacy**:

**Data Collection**:
- ✅ Location (Approximate)
- ✅ Contact Info (Email)
- ✅ User Content (Photos, Messages)
- ✅ Identifiers (User ID)

**Data Use**:
- App Functionality
- Not linked to identity
- Not used for tracking

## Step 8: Pricing and Availability

1. Click **"Pricing and Availability"**
2. **Price Schedule**: Free
3. **Availability**: All countries/regions

## Step 9: Submit for Review

1. Return to **"Version 1.0"** page
2. Click **"Add for Review"**
3. Export Compliance:
   - Uses encryption? **No**
4. Advertising Identifier:
   - Uses IDFA? **No**
5. Click **"Submit for Review"**

## ✅ Submission Complete!

**What happens next:**
- **Processing**: 10-30 minutes
- **In Review**: 24-48 hours typically
- **Email updates**: Check your email

## 🆘 Troubleshooting

**Build not showing?**
- Wait 10-15 minutes after upload
- Refresh the page

**Screenshot errors?**
- Must be exact sizes: 1290x2796 for 6.7"
- No transparency
- PNG or JPG format

**Validation errors in Xcode?**
- Ensure automatic signing is enabled
- Check team is selected correctly

---

**Need help?** The detailed guide is in `APP_STORE_SUBMISSION_STEPS.md`