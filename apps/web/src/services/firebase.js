import { initializeFirebase } from '@swipecity/firebase';
import { AuthService } from '@swipecity/firebase/auth';
import { FirestoreService } from '@swipecity/firebase/firestore';
import { StorageService } from '@swipecity/firebase/storage';

// Initialize Firebase and services
let firebaseServices = null;

export const initializeFirebaseServices = () => {
  if (!firebaseServices) {
    try {
      initializeFirebase();
      
      firebaseServices = {
        auth: new AuthService(),
        firestore: new FirestoreService(),
        storage: new StorageService()
      };
      
      console.log('Firebase services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase services:', error);
      throw error;
    }
  }
  
  return firebaseServices;
};

export const getFirebaseServices = () => {
  if (!firebaseServices) {
    throw new Error('Firebase services not initialized. Call initializeFirebaseServices() first.');
  }
  return firebaseServices;
};

// Convenience exports
export const getAuthService = () => getFirebaseServices().auth;
export const getFirestoreService = () => getFirebaseServices().firestore;
export const getStorageService = () => getFirebaseServices().storage;