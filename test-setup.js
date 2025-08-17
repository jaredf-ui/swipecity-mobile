#!/usr/bin/env node

/**
 * SwipeCity App Setup Test Script
 * This script validates that all core functionality is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 SwipeCity App Setup Validation\n');

// Check if required files exist
const requiredFiles = [
  'firebase.json',
  'firestore.rules',
  'storage.rules',
  'apps/web/.env',
  'apps/web/build/index.html',
  'functions/lib/index.js',
  'ios/App/App/public/index.html'
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check environment variables
console.log('\n🔐 Checking environment configuration...');
const envPath = path.join(__dirname, 'apps/web/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredEnvVars = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_STORAGE_BUCKET',
    'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];
  
  requiredEnvVars.forEach(varName => {
    const hasVar = envContent.includes(varName);
    const hasValue = envContent.includes(`${varName}=`) && 
                     !envContent.includes(`${varName}=your-`);
    console.log(`  ${hasVar ? '✅' : '❌'} ${varName} ${hasValue ? '(configured)' : '(needs value)'}`);
  });
} else {
  console.log('  ❌ .env file not found');
}

// Check package.json scripts
console.log('\n📦 Checking build scripts...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredScripts = ['build:web', 'build:packages', 'build:all'];
  
  requiredScripts.forEach(script => {
    const hasScript = packageJson.scripts && packageJson.scripts[script];
    console.log(`  ${hasScript ? '✅' : '❌'} ${script}`);
  });
}

// Check Capacitor configuration
console.log('\n📱 Checking Capacitor configuration...');
const capacitorConfigPath = path.join(__dirname, 'capacitor.config.ts');
if (fs.existsSync(capacitorConfigPath)) {
  const configContent = fs.readFileSync(capacitorConfigPath, 'utf8');
  const hasWebDir = configContent.includes('webDir:');
  const hasAppId = configContent.includes('appId:');
  const hasAppName = configContent.includes('appName:');
  
  console.log(`  ${hasWebDir ? '✅' : '❌'} webDir configured`);
  console.log(`  ${hasAppId ? '✅' : '❌'} appId configured`);
  console.log(`  ${hasAppName ? '✅' : '❌'} appName configured`);
}

// Summary
console.log('\n📋 Setup Summary:');
if (allFilesExist) {
  console.log('✅ All required files are present');
} else {
  console.log('❌ Some required files are missing');
}

console.log('\n🔧 Next Steps:');
console.log('1. Update Firebase configuration in apps/web/.env with your actual project values');
console.log('2. Create a Firebase project at https://console.firebase.google.com');
console.log('3. Enable Authentication, Firestore, Storage, and Cloud Messaging');
console.log('4. Deploy security rules: firebase deploy --only firestore:rules,storage');
console.log('5. Deploy functions: firebase deploy --only functions');
console.log('6. Test the app: npm run build:all && npx cap run ios');

console.log('\n📚 Resources:');
console.log('- Firebase Console: https://console.firebase.google.com');
console.log('- Capacitor Docs: https://capacitorjs.com/docs');
console.log('- React Native Guide: https://reactnative.dev/docs/getting-started');

console.log('\n🎉 Setup validation complete!');

// Exit with appropriate code
process.exit(allFilesExist ? 0 : 1);