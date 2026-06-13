import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jaredfeeny.swipecity',
  appName: 'SwipeCity',
  webDir: 'apps/web/build',
  server: {
    cleartext: true,
    allowNavigation: [
      '*',
      'https://firebasestorage.googleapis.com',
      'https://*.googleapis.com',
      'https://storage.googleapis.com'
    ]
  },
  ios: {
    scheme: 'SwipeCity',
    contentInset: 'automatic',
    backgroundColor: '#4F6EF7',
    allowsLinkPreview: false,
    scrollEnabled: true,
    webSecurity: true,
    allowsInlineMediaPlayback: true,
    allowsBackForwardNavigationGestures: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      launchAutoHide: true,
      backgroundColor: '#4F6EF7',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#4F6EF7'
    }
  }
};

export default config;
