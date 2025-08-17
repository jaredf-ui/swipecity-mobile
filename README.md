# SwipeCity - Marketplace App

A modern, Tinder-style marketplace app built with React, Capacitor, and Firebase. Users can swipe through local items, chat with sellers, and manage their own listings.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <your-repo>
cd swipecity-mobile
npm install

# Development
npm run dev:web          # Web development
npm run build:all        # Full production build
./deploy.sh ios          # Deploy to iOS
```

## ✨ Features

### Core Functionality
- **Swipe Interface**: Tinder-style browsing of marketplace items
- **Real-time Chat**: Firebase-powered messaging between buyers/sellers
- **Image Upload**: Compressed image storage with Firebase Storage
- **Push Notifications**: FCM notifications for messages and matches
- **User Authentication**: Email-based passwordless authentication
- **Offline Support**: Works offline with cached data and service worker

### Technical Features
- **Error Handling**: Comprehensive error boundaries and retry logic
- **Security**: Firestore security rules and input validation
- **Performance**: Optimized builds with code splitting and caching
- **Mobile-First**: Responsive design optimized for mobile devices
- **Real-time Updates**: Live data synchronization across devices

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Xcode (for iOS development)
- Firebase CLI
- Apple Developer Account (for App Store)

### Setup
1. **Clone repository**
   ```bash
   git clone <your-repo>
   cd swipecity-mobile
   npm install
   ```

2. **Firebase Configuration**
   ```bash
   # Copy and configure environment
   cp apps/web/.env.example apps/web/.env
   # Edit with your Firebase config
   ```

3. **Build and Test**
   ```bash
   npm run build:all
   npx cap run ios
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Start web development server |
| `npm run build:web` | Build web app for production |
| `npm run build:packages` | Build shared packages |
| `npm run build:all` | Build everything |
| `./deploy.sh ios` | Deploy to iOS |
| `./deploy.sh firebase` | Deploy to Firebase |
| `node test-setup.js` | Validate configuration |

## 🚀 Deployment

### Quick Deploy
```bash
# iOS App Store
./deploy.sh ios production

# Firebase Web App
./deploy.sh firebase production

# Everything
./deploy.sh all production
```

### Detailed Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

## 🎯 What's Completed

### ✅ Core Functionality (Production Ready)
- Real Firebase backend integration (Auth, Firestore, Storage, FCM)
- Actual image upload/storage with compression and validation
- Comprehensive error handling with retry mechanisms
- Offline functionality with graceful degradation
- Push notifications for messages and matches
- Security rules and input validation
- Optimized builds and deployment scripts

### 🚀 Ready for App Store
- Complete Firebase infrastructure
- iOS Capacitor app configured
- Production deployment scripts
- Security and performance optimized
- Comprehensive testing setup

---

Built with ❤️ using React, Capacitor, and Firebase
