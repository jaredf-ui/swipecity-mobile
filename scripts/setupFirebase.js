#!/usr/bin/env node

/**
 * SwipeCity Firebase Setup Script
 * Automates Firebase project configuration for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
};

const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ${message}`, 'red');
const info = (message) => log(`ℹ️  ${message}`, 'blue');
const warning = (message) => log(`⚠️  ${message}`, 'yellow');

class FirebaseSetup {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.envExamplePath = path.join(this.projectRoot, '.env.example');
    this.firebaseConfigPath = path.join(this.projectRoot, 'firebase.json');
  }

  async run() {
    try {
      log('🚀 SwipeCity Firebase Setup', 'bright');
      log('================================', 'cyan');
      
      await this.checkPrerequisites();
      await this.checkFirebaseProject();
      await this.setupEnvironmentFile();
      await this.deploySecurityRules();
      await this.setupHosting();
      await this.verifySetup();
      
      log('', 'reset');
      success('Firebase setup completed successfully! 🎉');
      log('', 'reset');
      this.printNextSteps();
      
    } catch (err) {
      error(`Setup failed: ${err.message}`);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    info('Checking prerequisites...');
    
    // Check if Firebase CLI is installed
    try {
      execSync('firebase --version', { stdio: 'pipe' });
      success('Firebase CLI is installed');
    } catch {
      error('Firebase CLI is not installed');
      log('Install it with: npm install -g firebase-tools', 'yellow');
      throw new Error('Firebase CLI required');
    }
    
    // Check if user is logged in
    try {
      execSync('firebase projects:list', { stdio: 'pipe' });
      success('Firebase authentication verified');
    } catch {
      error('Not logged into Firebase');
      log('Login with: firebase login', 'yellow');
      throw new Error('Firebase login required');
    }
  }

  async checkFirebaseProject() {
    info('Checking Firebase project configuration...');
    
    try {
      const projectInfo = execSync('firebase use', { encoding: 'utf8' });
      
      if (projectInfo.includes('No active project')) {
        warning('No active Firebase project found');
        log('Set up a project with: firebase use --add', 'yellow');
        throw new Error('Firebase project required');
      }
      
      success('Firebase project configured');
    } catch (err) {
      if (err.message === 'Firebase project required') {
        throw err;
      }
      warning('Could not determine Firebase project status');
    }
  }

  async setupEnvironmentFile() {
    info('Setting up environment configuration...');
    
    // Check if .env already exists
    if (fs.existsSync(this.envPath)) {
      warning('.env file already exists');
      return;
    }
    
    // Check if .env.example exists
    if (!fs.existsSync(this.envExamplePath)) {
      // Create .env.example if it doesn't exist
      const envExample = `# SwipeCity Environment Configuration
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# App Configuration
REACT_APP_APP_NAME=SwipeCity
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production

# Features
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_CRASHLYTICS=true
REACT_APP_DEBUG_MODE=false
`;
      
      fs.writeFileSync(this.envExamplePath, envExample);
      success('Created .env.example file');
    }
    
    // Copy .env.example to .env
    fs.copyFileSync(this.envExamplePath, this.envPath);
    success('Created .env file from template');
    
    warning('Please update .env file with your Firebase configuration values');
    log('You can find these in your Firebase Console > Project Settings > General', 'blue');
  }

  async deploySecurityRules() {
    info('Deploying Firestore and Storage security rules...');
    
    try {
      // Deploy Firestore rules
      if (fs.existsSync(path.join(this.projectRoot, 'firestore.rules'))) {
        execSync('firebase deploy --only firestore:rules', { 
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
        success('Firestore security rules deployed');
      } else {
        warning('firestore.rules file not found');
      }
      
      // Deploy Storage rules
      if (fs.existsSync(path.join(this.projectRoot, 'storage.rules'))) {
        execSync('firebase deploy --only storage', {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });
        success('Storage security rules deployed');
      } else {
        warning('storage.rules file not found');
      }
      
    } catch (err) {
      error(`Failed to deploy security rules: ${err.message}`);
      throw err;
    }
  }

  async setupHosting() {
    info('Configuring Firebase Hosting...');
    
    try {
      // Check if firebase.json exists and has hosting config
      if (fs.existsSync(this.firebaseConfigPath)) {
        const firebaseConfig = JSON.parse(fs.readFileSync(this.firebaseConfigPath, 'utf8'));
        
        if (!firebaseConfig.hosting) {
          firebaseConfig.hosting = {
            "public": "apps/web/build",
            "ignore": [
              "firebase.json",
              "**/.*",
              "**/node_modules/**"
            ],
            "rewrites": [
              {
                "source": "**",
                "destination": "/index.html"
              }
            ]
          };
          
          fs.writeFileSync(this.firebaseConfigPath, JSON.stringify(firebaseConfig, null, 2));
          success('Added hosting configuration to firebase.json');
        } else {
          success('Hosting configuration already exists');
        }
      } else {
        warning('firebase.json not found - please run firebase init first');
      }
    } catch (err) {
      warning(`Could not configure hosting: ${err.message}`);
    }
  }

  async verifySetup() {
    info('Verifying setup...');
    
    const checks = [
      {
        name: '.env file exists',
        check: () => fs.existsSync(this.envPath),
        fix: 'Create .env file with Firebase configuration'
      },
      {
        name: 'firebase.json exists',
        check: () => fs.existsSync(this.firebaseConfigPath),
        fix: 'Run firebase init in project root'
      },
      {
        name: 'Firestore rules exist',
        check: () => fs.existsSync(path.join(this.projectRoot, 'firestore.rules')),
        fix: 'Create firestore.rules file'
      },
      {
        name: 'Storage rules exist',
        check: () => fs.existsSync(path.join(this.projectRoot, 'storage.rules')),
        fix: 'Create storage.rules file'
      }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      if (check.check()) {
        success(check.name);
      } else {
        error(`${check.name} - ${check.fix}`);
        allPassed = false;
      }
    }
    
    if (!allPassed) {
      warning('Some setup checks failed - please review and fix');
    }
  }

  printNextSteps() {
    log('🎯 Next Steps:', 'bright');
    log('=============', 'cyan');
    log('');
    log('1. Update your .env file with actual Firebase config values', 'blue');
    log('   → Get these from Firebase Console > Project Settings', 'blue');
    log('');
    log('2. Build and test your app:', 'blue');
    log('   → npm run build:web', 'blue');
    log('   → npm start', 'blue');
    log('');
    log('3. Deploy to Firebase Hosting:', 'blue');
    log('   → firebase deploy', 'blue');
    log('');
    log('4. Set up data seeding:', 'blue');
    log('   → Use the admin dashboard to populate sample data', 'blue');
    log('');
    log('5. Start beta testing:', 'blue');
    log('   → Invite users to test your app', 'blue');
    log('');
    success('You\'re ready for production! 🚀');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new FirebaseSetup();
  setup.run().catch(console.error);
}

module.exports = FirebaseSetup;