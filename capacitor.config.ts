import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jaredfeeny.swipecity',
  appName: 'SwipeCity',
  webDir: 'apps/web/build',
  server: {
    cleartext: true,
    allowNavigation: ['*']
  },
  ios: {
    scheme: 'SwipeCity',
    contentInset: 'automatic',
    backgroundColor: '#4F6EF7'
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
