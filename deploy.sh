#!/bin/bash

# SwipeCity Deployment Script
# This script automates the build and deployment process

set -e  # Exit on any error

echo "🚀 SwipeCity Deployment Script"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI is not installed"
    echo "📦 Install it with: npm install -g firebase-tools"
    exit 1
fi

# Parse command line arguments
DEPLOY_TARGET=${1:-"all"}
ENVIRONMENT=${2:-"development"}

echo "🎯 Deploy Target: $DEPLOY_TARGET"
echo "🌍 Environment: $ENVIRONMENT"

# Set environment variables
export REACT_APP_ENVIRONMENT=$ENVIRONMENT

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf apps/web/build
rm -rf functions/lib
rm -rf packages/*/dist

# Build packages
echo "📦 Building shared packages..."
npm run build:packages

# Build web application
echo "🌐 Building web application..."
npm run build:web

# Build Cloud Functions
echo "☁️ Building Cloud Functions..."
cd functions
npm run build
cd ..

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync ios

# Deploy based on target
case $DEPLOY_TARGET in
    "web"|"hosting")
        echo "🌐 Deploying to Firebase Hosting..."
        firebase deploy --only hosting
        ;;
    "functions")
        echo "☁️ Deploying Cloud Functions..."
        firebase deploy --only functions
        ;;
    "rules")
        echo "🔒 Deploying security rules..."
        firebase deploy --only firestore:rules,storage:rules
        ;;
    "firebase")
        echo "🔥 Deploying to Firebase (hosting + functions + rules)..."
        firebase deploy
        ;;
    "ios")
        echo "📱 Opening iOS project in Xcode..."
        npx cap open ios
        ;;
    "all")
        echo "🚀 Full deployment (Firebase + iOS preparation)..."
        firebase deploy
        echo "📱 Opening iOS project in Xcode..."
        npx cap open ios
        ;;
    *)
        echo "❌ Unknown deploy target: $DEPLOY_TARGET"
        echo "Valid targets: web, functions, rules, firebase, ios, all"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment completed successfully!"

if [ "$DEPLOY_TARGET" = "all" ] || [ "$DEPLOY_TARGET" = "firebase" ]; then
    echo ""
    echo "🌐 Web app URL: https://$(firebase projects:list --filter='PROJECT_ID' --json | jq -r '.[0].projectId').web.app"
fi

if [ "$DEPLOY_TARGET" = "ios" ] || [ "$DEPLOY_TARGET" = "all" ]; then
    echo ""
    echo "📱 iOS app opened in Xcode. Next steps:"
    echo "   1. Select your development team"
    echo "   2. Update app version and build number"
    echo "   3. Test on device or simulator"
    echo "   4. Archive for App Store submission"
fi

echo ""
echo "📚 Deployment resources:"
echo "   - Firebase Console: https://console.firebase.google.com"
echo "   - App Store Connect: https://appstoreconnect.apple.com"
echo "   - Deployment Guide: ./DEPLOYMENT.md"