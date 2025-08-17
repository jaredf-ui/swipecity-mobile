// Export Firebase configuration
export { initializeFirebase, getFirebaseInstances } from './config';

// Export Firebase services
export { AuthService } from './auth';
export { FirestoreService } from './firestore';
export { StorageService } from './storage';

// Re-export Firebase types that might be needed
export type { User as FirebaseUser } from 'firebase/auth';