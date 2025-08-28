// Firebase services - Production configuration
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailLink, 
  sendSignInLinkToEmail, 
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  sendEmailVerification
} from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, where, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCgmWYvEGhC9F2mzJ-azIEWusxRvRS9V2I",
  authDomain: "swipecity-marketplace.firebaseapp.com",
  projectId: "swipecity-marketplace",
  storageBucket: "swipecity-marketplace.firebasestorage.app",
  messagingSenderId: "360980103663",
  appId: "1:360980103663:web:6c03696d617a6186fe361a",
  measurementId: "G-DK58FSTK7Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Auth Service
class AuthService {
  // Register new user with email and password
  async registerWithEmailPassword(email, password, displayName) {
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || email.split('@')[0],
        photoURL: null,
        emailVerified: user.emailVerified,
        onboardingComplete: false,
        preferences: {
          categories: [],
          priceRange: null,
          shoppingStyle: null,
          locationRadius: 10
        },
        savedItems: [],
        likedItems: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      await setDoc(doc(db, 'users', user.uid), userProfile);
      
      return { success: true, user, profile: userProfile };
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Sign in with email and password
  async signInWithEmailPassword(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let profile = userDoc.data();
      
      // If profile doesn't exist, create it
      if (!profile) {
        profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || email.split('@')[0],
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          onboardingComplete: false,
          preferences: {
            categories: [],
            priceRange: null,
            shoppingStyle: null,
            locationRadius: 10
          },
          savedItems: [],
          likedItems: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await setDoc(doc(db, 'users', user.uid), profile);
      }
      
      return { success: true, user, profile };
    } catch (error) {
      console.error('Sign in error:', error);
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please sign up first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let profile = userDoc.data();
      
      // If profile doesn't exist, create it
      if (!profile) {
        profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          onboardingComplete: false,
          preferences: {
            categories: [],
            priceRange: null,
            shoppingStyle: null,
            locationRadius: 10
          },
          savedItems: [],
          likedItems: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await setDoc(doc(db, 'users', user.uid), profile);
      }
      
      return { success: true, user, profile };
    } catch (error) {
      console.error('Google sign in error:', error);
      let errorMessage = 'Google sign in failed. Please try again.';
      
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Please allow popups for this site and try again.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in was cancelled.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send password reset email.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // Update user profile
  async updateUserProfile(updates) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      
      // Update auth profile if displayName or photoURL changed
      if (updates.displayName || updates.photoURL) {
        await updateProfile(user, {
          displayName: updates.displayName || user.displayName,
          photoURL: updates.photoURL || user.photoURL
        });
      }
      
      // Update Firestore profile
      await updateDoc(doc(db, 'users', user.uid), {
        ...updates,
        updatedAt: Date.now()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current user profile from Firestore
  async getCurrentUserProfile() {
    try {
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No user logged in' };
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        return { success: false, error: 'User profile not found' };
      }
      
      return { success: true, profile: userDoc.data() };
    } catch (error) {
      console.error('Get profile error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSignInLink(email) {
    try {
      const actionCodeSettings = {
        url: window.location.origin, // Redirect back to app
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem('emailForSignIn', email);
      
      return { success: true };
    } catch (error) {
      console.error('Send sign-in link error:', error);
      return { success: false, error: error.message };
    }
  }

  async signInWithLink(email, link) {
    try {
      const result = await signInWithEmailLink(auth, email, link);
      localStorage.removeItem('emailForSignIn');
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign in with link error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return auth.currentUser;
  }

  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }
}

// Firestore Service
class FirestoreService {
  // Users
  async createUser(userData) {
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        created_at: Date.now(),
        updated_at: Date.now()
      });
      return { success: true, data: docRef.id };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUser(userId, updates) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updated_at: Date.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Items/Listings
  async addItem(itemData) {
    try {
      const docRef = await addDoc(collection(db, 'items'), {
        ...itemData,
        created_at: Date.now(),
        updated_at: Date.now(),
        status: 'active'
      });
      return { success: true, data: docRef.id };
    } catch (error) {
      console.error('Add item error:', error);
      return { success: false, error: error.message };
    }
  }

  async getItems(categories = [], itemLimit = 50) {
    try {
      let q = query(
        collection(db, 'items'),
        where('status', '==', 'active'),
        orderBy('created_at', 'desc'),
        limit(itemLimit)
      );

      if (categories && categories.length > 0) {
        q = query(
          collection(db, 'items'),
          where('status', '==', 'active'),
          where('category', 'in', categories),
          orderBy('created_at', 'desc'),
          limit(itemLimit)
        );
      }

      const querySnapshot = await getDocs(q);
      const items = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, data: items };
    } catch (error) {
      console.error('Get items error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateItem(itemId, updates) {
    try {
      await updateDoc(doc(db, 'items', itemId), {
        ...updates,
        updated_at: Date.now()
      });
      return { success: true };
    } catch (error) {
      console.error('Update item error:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteItem(itemId) {
    try {
      await deleteDoc(doc(db, 'items', itemId));
      return { success: true };
    } catch (error) {
      console.error('Delete item error:', error);
      return { success: false, error: error.message };
    }
  }

  // Interests (matches/likes)
  async createInterest(interestData) {
    try {
      const docRef = await addDoc(collection(db, 'interests'), {
        ...interestData,
        created_at: Date.now()
      });
      return { success: true, data: docRef.id };
    } catch (error) {
      console.error('Create interest error:', error);
      return { success: false, error: error.message };
    }
  }

  // Reports
  async reportItem(itemId, userId, reason) {
    try {
      await addDoc(collection(db, 'reports'), {
        item_id: itemId,
        reporter_id: userId,
        reason,
        created_at: Date.now(),
        status: 'pending'
      });
      return { success: true };
    } catch (error) {
      console.error('Report item error:', error);
      return { success: false, error: error.message };
    }
  }

  // Count methods for admin dashboard
  async getUserCount() {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      console.error('Get user count error:', error);
      return { success: false, count: 0 };
    }
  }

  async getListingCount() {
    try {
      const q = query(collection(db, 'items'), where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      console.error('Get listing count error:', error);
      return { success: false, count: 0 };
    }
  }

  async getInterestCount() {
    try {
      const querySnapshot = await getDocs(collection(db, 'interests'));
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      console.error('Get interest count error:', error);
      return { success: false, count: 0 };
    }
  }

  async getReportCount() {
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      return { success: true, count: querySnapshot.size };
    } catch (error) {
      console.error('Get report count error:', error);
      return { success: false, count: 0 };
    }
  }
}

// Storage Service
class StorageService {
  async uploadImage(file, path) {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return { success: true, url: downloadURL };
    } catch (error) {
      console.error('Upload image error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadProfilePhoto(userId, file) {
    const path = `profile-photos/${userId}/${Date.now()}_${file.name}`;
    return this.uploadImage(file, path);
  }

  async uploadItemPhoto(itemId, file, index = 0) {
    const path = `item-photos/${itemId}/${Date.now()}_${index}_${file.name}`;
    return this.uploadImage(file, path);
  }

  async deleteImage(url) {
    try {
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
      return { success: true };
    } catch (error) {
      console.error('Delete image error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize services
let firebaseServices = null;

export const initializeFirebaseServices = () => {
  if (!firebaseServices) {
    try {
      firebaseServices = {
        auth: new AuthService(),
        firestore: new FirestoreService(),
        storage: new StorageService()
      };
      
      console.log('✅ Firebase services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase services:', error);
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

// Export Firebase instances for direct use if needed
export { auth, db, storage };