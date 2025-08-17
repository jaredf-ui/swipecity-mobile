import { 
  signInWithEmailLink, 
  sendSignInLinkToEmail, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseInstances } from '../config';
import { User, FIREBASE_COLLECTIONS, ERROR_MESSAGES } from '@swipecity/shared';

export class AuthService {
  private auth;
  private db;

  constructor() {
    const { auth, db } = getFirebaseInstances();
    this.auth = auth;
    this.db = db;
  }

  // Send sign-in link to email
  async sendSignInLink(email: string): Promise<void> {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/verify`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(this.auth, email, actionCodeSettings);
      
      // Save the email locally for the sign-in completion
      window.localStorage.setItem('emailForSignIn', email);
    } catch (error: any) {
      console.error('Error sending sign-in link:', error);
      throw new Error(error.message || ERROR_MESSAGES.AUTH_FAILED);
    }
  }

  // Complete sign-in with email link
  async completeSignInWithEmailLink(url: string): Promise<User> {
    try {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        throw new Error('No email found for sign-in completion');
      }

      const result = await signInWithEmailLink(this.auth, email, url);
      const firebaseUser = result.user;

      // Create or update user document
      const userData: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        username: firebaseUser.displayName || email.split('@')[0],
        avatar_url: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        onboardingComplete: false,
        verified: firebaseUser.emailVerified,
        created_at: Date.now()
      };

      await this.createOrUpdateUser(userData);
      
      // Clear the email from local storage
      window.localStorage.removeItem('emailForSignIn');

      return userData;
    } catch (error: any) {
      console.error('Error completing sign-in:', error);
      throw new Error(error.message || ERROR_MESSAGES.AUTH_FAILED);
    }
  }

  // Create or update user document in Firestore
  async createOrUpdateUser(userData: User): Promise<void> {
    try {
      const userDocRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, userData.id);
      
      // Check if user already exists
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        // Update existing user but preserve onboardingComplete status
        const existingData = userDoc.data() as User;
        userData.onboardingComplete = existingData.onboardingComplete;
        userData.preferences = existingData.preferences;
      }

      await setDoc(userDocRef, userData, { merge: true });
    } catch (error: any) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to save user data');
    }
  }

  // Get current user data from Firestore
  async getCurrentUser(): Promise<User | null> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return null;

      const userDocRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as User;
      }

      return null;
    } catch (error: any) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out');
    }
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData = await this.getCurrentUser();
        callback(userData);
      } else {
        callback(null);
      }
    });
  }

  // Update user preferences
  async updateUserPreferences(userId: string, preferences: User['preferences']): Promise<void> {
    try {
      const userDocRef = doc(this.db, FIREBASE_COLLECTIONS.USERS, userId);
      await setDoc(userDocRef, { 
        preferences,
        onboardingComplete: true 
      }, { merge: true });
    } catch (error: any) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }
}