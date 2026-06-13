# 🚀 SwipeCity App Store Submission Guide

## Prerequisites Completed ✅
- ✅ Apple Developer Program membership confirmed
- ✅ Bundle ID: `com.jaredfeeny.swipecity`
- ✅ Team ID: `WNMU5B8N97`
- ✅ App metadata prepared
- ✅ Screenshot script created

## 📋 Step-by-Step Submission Process

### Step 1: Create App in App Store Connect
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click the "+" button and select "New App"
3. Fill in:
   - **Platform**: iOS
   - **App Name**: SwipeCity
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select `com.jaredfeeny.swipecity`
   - **SKU**: SWIPECITY001 (or any unique identifier)

### Step 2: Configure App in Xcode

1. **Open Xcode project:**
```bash
open ~/Desktop/swipecity-mobile/ios/App/App.xcworkspace
```

2. **Select the App target** and configure:
   - **General Tab:**
     - Display Name: SwipeCity
     - Bundle Identifier: com.jaredfeeny.swipecity
     - Version: 1.0
     - Build: 1

   - **Signing & Capabilities:**
     - Team: WNMU5B8N97
     - Automatically manage signing: ✅ Checked
     - Provisioning Profile: Automatic

   - **Info Tab:** (Already configured)
     - Camera Usage Description ✅
     - Photo Library Usage Description ✅

### Step 3: Build Release Version

1. **Select Generic iOS Device** (or your connected iPhone) from the device selector

2. **Clean Build Folder:**
   - Product → Clean Build Folder (⇧⌘K)

3. **Archive the App:**
   - Product → Archive (wait for build to complete)

### Step 4: Upload to App Store Connect

1. **In the Organizer window** (opens automatically after archive):
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Choose "Upload"
   - Select options:
     - ✅ Include bitcode for iOS content
     - ✅ Upload your app's symbols
   - Click "Next" and "Upload"

### Step 5: Take Screenshots

1. **Run on different simulators:**
```bash
# Start simulator for each device size
xcrun simctl boot "iPhone 16 Pro Max"  # 6.9"
xcrun simctl boot "iPhone 15 Plus"      # 6.7"
xcrun simctl boot "iPhone 11 Pro Max"   # 6.5"
```

2. **Run the screenshot script:**
```bash
~/Desktop/swipecity-mobile/take_app_store_screenshots.sh
```

### Step 6: Complete App Store Listing

In App Store Connect:

1. **App Information:**
   - Category: Shopping
   - Content Rights: Check "No third-party content"

2. **Pricing and Availability:**
   - Price: Free
   - Availability: All countries

3. **App Privacy:**
   - Complete privacy questionnaire
   - Data types collected:
     - Contact Info (for chat)
     - Photos (for listings)
     - Location (for nearby items)
     - User Content (messages, listings)

4. **Version Information:**
   - Upload screenshots for each device size
   - Add description (from APP_STORE_METADATA.md)
   - Add keywords
   - Add support URL
   - Add marketing URL

5. **App Review Information:**
   - Sign-in required: Yes
   - Demo account: Provide test credentials
   - Notes: Explain app functionality

### Step 7: Submit for Review

1. **Final checks:**
   - All metadata complete
   - Screenshots uploaded
   - Build processing complete
   - No validation errors

2. **Submit:**
   - Click "Add for Review"
   - Answer export compliance questions
   - Click "Submit for Review"

## 📱 Testing Checklist Before Submission

- [ ] App launches without crashes
- [ ] Login/signup works
- [ ] Swipe functionality smooth
- [ ] Chat messages send/receive
- [ ] Images load properly
- [ ] Location services work (if enabled)
- [ ] All buttons and navigation work
- [ ] No placeholder content visible
- [ ] Profile updates save correctly
- [ ] Search and filters work

## 🔧 Common Issues and Solutions

### Issue: Missing Dun & Bradstreet (D-U-N-S) Number
**Solution**: Not required for individual developers

### Issue: App crashes on launch
**Solution**: Test on real device, check Firebase configuration

### Issue: Screenshots wrong size
**Solution**: Use exact pixel dimensions specified in requirements

### Issue: Build not showing in App Store Connect
**Solution**: Wait 10-30 minutes for processing

## 📞 Support Resources

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## ⏱️ Timeline Expectations

- **Build Processing**: 10-30 minutes
- **Initial Review**: 24-48 hours typically
- **If Rejected**: Address feedback, resubmit (usually faster review)

## 🎯 Next Actions

1. **Now**: Archive and upload build to App Store Connect
2. **Today**: Take all screenshots using the script
3. **Today**: Complete App Store Connect listing
4. **Today**: Submit for review
5. **Monitor**: Check email for review updates

---

**Remember**: The first submission is always the most complex. Future updates will be much simpler!