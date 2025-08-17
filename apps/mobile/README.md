# SwipeCity Mobile App

This is the React Native mobile application for SwipeCity, built as part of a monorepo structure.

## 🏗️ Architecture

- **Shared Logic**: Uses `@swipecity/shared` for business logic, types, and utilities
- **Firebase Integration**: Uses `@swipecity/firebase` for backend services
- **UI Components**: Uses `@swipecity/ui` for cross-platform components

## 🚀 Development Setup

### Prerequisites

1. **Node.js 18+**
2. **React Native CLI**: `npm install -g @react-native-community/cli`
3. **iOS Development** (for iOS testing):
   - Xcode 12+
   - iOS Simulator
   - CocoaPods: `sudo gem install cocoapods`

### Getting Started

1. **Install Dependencies**:
   ```bash
   # From the root of the monorepo
   npm install
   ```

2. **Start Metro Bundler**:
   ```bash
   npm run dev:mobile
   # or directly:
   npx react-native start
   ```

3. **Run on iOS Simulator**:
   ```bash
   # Install iOS dependencies first
   cd ios && pod install && cd ..
   
   # Run on iOS
   npx react-native run-ios
   ```

4. **Run on Android**:
   ```bash
   npx react-native run-android
   ```

## 📱 Testing iOS Without Full Setup

If you don't have Xcode installed, you can still test the app:

### Option 1: Expo Development Build
```bash
npx create-expo-app --template blank-typescript SwipeCityExpo
# Then copy our components and shared logic
```

### Option 2: React Native Web Preview
The shared components work with React Native Web, so you can preview on the web app.

### Option 3: Android Emulator
Use Android Studio's emulator which is easier to set up than iOS.

## 📦 Shared Package Integration

The mobile app uses these shared packages:

- **Types**: `import { User, Item, Chat } from '@swipecity/shared'`
- **Utilities**: `import { SecurityUtils, formatPrice } from '@swipecity/shared'`
- **Firebase**: `import { AuthService } from '@swipecity/firebase'`
- **UI Components**: `import { Button } from '@swipecity/ui'`

## 🧪 Testing the Setup

To verify the monorepo integration is working:

1. **Build the packages**:
   ```bash
   npm run build:packages
   ```

2. **Start the Metro bundler**:
   ```bash
   npm run dev:mobile
   ```

3. **Check the app loads**: The Metro bundler should start without errors and show the React Native welcome screen.

## 📁 Project Structure

```
apps/mobile/
├── App.tsx              # Main mobile app component
├── index.js             # React Native entry point
├── metro.config.js      # Metro bundler configuration
├── babel.config.js      # Babel configuration
├── package.json         # Mobile app dependencies
├── ios/                 # iOS-specific files
├── android/             # Android-specific files
└── Podfile              # iOS dependencies (CocoaPods)
```

## 🔥 Firebase Integration

The mobile app is configured to use the same Firebase project as the web app:
- Authentication with email links
- Firestore for data storage
- Firebase Storage for images

## 🎨 UI Components

Shared UI components are responsive and work across platforms:
- `Button`: Cross-platform button with consistent styling
- `Card`: Item display component with swipe functionality
- More components can be added to `packages/ui/`

## 🐛 Troubleshooting

### Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache
```

### iOS Build Issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..
pod install
```

### Dependency Issues
```bash
# Clean and reinstall
npm run clean
npm install
```

## 📝 Next Steps

1. **Full iOS Setup**: Install Xcode and set up iOS simulator
2. **Android Setup**: Install Android Studio and create emulator
3. **Physical Device Testing**: Set up for device testing
4. **App Store Deployment**: Configure for production builds