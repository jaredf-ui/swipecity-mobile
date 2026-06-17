import nativeHttp from './nativeHttp';

/**
 * Native Firebase Service - Uses Capacitor HTTP for all Firebase operations
 * This bypasses Firebase web SDK limitations on iOS WebView
 */

// Firebase configuration - Real production config
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCgmWYvEGhC9F2mzJ-azIEWusxRvRS9V2I",
  authDomain: "swipecity-marketplace.firebaseapp.com",
  projectId: "swipecity-marketplace",
  storageBucket: "swipecity-marketplace.firebasestorage.app",
  messagingSenderId: "360980103663",
  appId: "1:360980103663:web:6c03696d617a6186fe361a"
};

export class FirebaseNativeService {
  constructor() {
    this.projectId = FIREBASE_CONFIG.projectId;
    this.apiKey = FIREBASE_CONFIG.apiKey;
    this.authDomain = FIREBASE_CONFIG.authDomain;
    this.storageBucket = FIREBASE_CONFIG.storageBucket;
    
    // Firebase REST API endpoints
    this.authUrl = `https://identitytoolkit.googleapis.com/v1/accounts`;
    this.firestoreUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
    this.storageUrl = `https://firebasestorage.googleapis.com/v0/b/${this.storageBucket}/o`;
    
    // Current user state
    this.currentUser = null;
    this.idToken = null;
    this.refreshToken = null;
    this.tokenTimestamp = null; // when the current idToken was minted (for age-based refresh)

    console.log('[Firebase Native] Service initialized');
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Sign up with email and password
   */
  async signUp(email, password, displayName = '') {
    try {
      console.log('[Firebase Auth] Starting signUp process for:', email);
      console.log('[Firebase Auth] API Key exists:', !!this.apiKey);
      console.log('[Firebase Auth] Auth URL:', this.authUrl);
      console.log('[Firebase Auth] Full auth URL with key:', `${this.authUrl}:signUp?key=${this.apiKey}`);
      console.log('[Firebase Auth] Payload:', { email, password: '***', returnSecureToken: true });
      
      console.log('[Firebase Auth] About to make HTTP request to Firebase...');
      
      let response;
      try {
        console.log('[Firebase Auth] Calling nativeHttp.post...');
        response = await nativeHttp.post(`${this.authUrl}:signUp?key=${this.apiKey}`, {
          email: email,
          password: password,
          returnSecureToken: true
        });
        console.log('[Firebase Auth] nativeHttp.post completed successfully');
        console.log('[Firebase Auth] Response status:', response.status);
        console.log('[Firebase Auth] Response ok:', response.ok);
        console.log('[Firebase Auth] Response data:', response.data);
      } catch (httpError) {
        console.error('[Firebase Auth] HTTP request failed with error:', httpError);
        console.error('[Firebase Auth] HTTP error name:', httpError.name);
        console.error('[Firebase Auth] HTTP error message:', httpError.message);
        console.error('[Firebase Auth] HTTP error stack:', httpError.stack);
        throw new Error(`HTTP request failed: ${httpError.message}`);
      }

      if (!response.ok) {
        console.error('[Firebase Auth] Sign up failed - Response not ok');
        console.error('[Firebase Auth] Response status:', response.status);
        console.error('[Firebase Auth] Response data:', response.data);
        const errorMessage = response.data?.error?.message || `Sign up failed (Status: ${response.status})`;
        console.error('[Firebase Auth] Final error message:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('[Firebase Auth] Sign up API call successful, processing response...');
      const userData = response.data;
      console.log('[Firebase Auth] User data received:', {
        localId: userData.localId,
        email: userData.email,
        emailVerified: userData.emailVerified
      });

      this.currentUser = {
        uid: userData.localId,
        email: userData.email,
        emailVerified: userData.emailVerified === 'true',
        displayName: displayName || email.split('@')[0],
        photoURL: null
      };
      
      this.idToken = userData.idToken;
      this.refreshToken = userData.refreshToken;
      
      // Save auth state to localStorage
      this.saveAuthToStorage();

      console.log('[Firebase Auth] User object created, current user:', this.currentUser);

      // Update display name if provided
      if (displayName) {
        console.log('[Firebase Auth] Updating display name...');
        try {
          await this.updateProfile({ displayName });
          console.log('[Firebase Auth] Display name updated successfully');
        } catch (profileError) {
          console.error('[Firebase Auth] Display name update failed:', profileError);
          // Continue anyway - this is not critical
        }
      }

      // Create user profile in Firestore
      console.log('[Firebase Auth] Creating user profile in Firestore...');
      try {
        await this.createUserProfile({
          uid: this.currentUser.uid,
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
          emailVerified: this.currentUser.emailVerified,
          onboardingComplete: false,
          preferences: { categories: [], priceRange: null, shoppingStyle: null },
          createdAt: Date.now()
        });
        console.log('[Firebase Auth] User profile created successfully');
      } catch (firestoreError) {
        console.error('[Firebase Auth] Firestore profile creation failed:', firestoreError);
        // Continue anyway - this is not critical for sign up
      }

      console.log('[Firebase Auth] Sign up completely successful');
      return { success: true, user: this.currentUser };
      
    } catch (error) {
      console.error('[Firebase Auth] Sign up caught error:', error);
      console.error('[Firebase Auth] Error type:', typeof error);
      console.error('[Firebase Auth] Error constructor:', error.constructor.name);
      console.error('[Firebase Auth] Error name:', error.name);
      console.error('[Firebase Auth] Error message:', error.message);
      console.error('[Firebase Auth] Error stack:', error.stack);
      
      // Return detailed error information
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred',
        errorType: error.constructor.name,
        errorName: error.name
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      console.log('[Firebase Auth] Signing in user:', email);
      
      const response = await nativeHttp.post(`${this.authUrl}:signInWithPassword?key=${this.apiKey}`, {
        email: email,
        password: password,
        returnSecureToken: true
      });

      if (!response.ok) {
        console.error('[Firebase Auth] Sign in error details:', response.data);
        const errorMessage = response.data?.error?.message || 'Sign in failed';
        console.error('[Firebase Auth] Error message:', errorMessage);
        throw new Error(errorMessage);
      }

      const userData = response.data;
      this.idToken = userData.idToken;
      this.refreshToken = userData.refreshToken;
      
      // Save auth tokens to localStorage
      this.saveAuthToStorage();
      
      // Get user profile from Firestore
      const userProfile = await this.getUserProfile(userData.localId);
      console.log('[Firebase Auth] User profile loaded from Firestore:', userProfile);
      console.log('[Firebase Auth] Profile contains buyerChats?', !!userProfile?.buyerChats);
      console.log('[Firebase Auth] Profile contains sellerChats?', !!userProfile?.sellerChats);
      console.log('[Firebase Auth] Profile contains swipeStats?', !!userProfile?.swipeStats);
      
      this.currentUser = {
        uid: userData.localId,
        email: userData.email,
        emailVerified: userData.emailVerified === 'true',
        displayName: userProfile?.displayName || userData.displayName || email.split('@')[0],
        photoURL: userProfile?.photoURL || null,
        ...userProfile
      };

      console.log('[Firebase Auth] Sign in successful');
      console.log('[Firebase Auth] Final user object has buyerChats?', !!this.currentUser?.buyerChats);
      console.log('[Firebase Auth] Final user object has swipeStats?', !!this.currentUser?.swipeStats);
      return { success: true, user: this.currentUser };
      
    } catch (error) {
      console.error('[Firebase Auth] Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    this.currentUser = null;
    this.idToken = null;
    this.refreshToken = null;
    
    // Clear stored auth data
    localStorage.removeItem('swipecity_native_tokens');
    // Note: We keep 'swipecity_native_user' for the AuthContext to use
    
    console.log('[Firebase Auth] User signed out');
    return { success: true };
  }

  /**
   * Permanently delete the current user's account: their Firestore profile
   * document and their Firebase Auth (email/password) credential. Without the
   * auth deletion the email stays registered, so re-signup fails with
   * EMAIL_EXISTS even after local data and the profile doc are cleared.
   */
  async deleteAccount() {
    try {
      // accounts:delete rejects stale tokens. Firebase ID tokens expire after
      // ~1h, and ensureValidToken() only refreshes a *missing* token — not an
      // expired one — so a token restored from storage or minted at an earlier
      // sign-in is often stale by the time the user taps Delete, producing
      // INVALID_ID_TOKEN. Proactively refresh from the refresh token first.
      if (this.refreshToken) {
        try {
          await this.refreshIdToken();
        } catch (refreshError) {
          console.error('[Firebase Auth] Pre-delete token refresh failed:', refreshError);
          // Fall through; ensureValidToken/the retry below will surface the issue.
        }
      }
      await this.ensureValidToken();

      if (!this.idToken) {
        return { success: false, error: 'No authenticated user to delete' };
      }

      const uid = this.currentUser?.uid;

      // Best-effort: remove the Firestore profile document.
      if (uid) {
        try {
          await nativeHttp.delete(`${this.firestoreUrl}/users/${uid}?key=${this.apiKey}`, {
            headers: { 'Authorization': `Bearer ${this.idToken}` }
          });
          console.log('[Firebase Auth] User profile document deleted');
        } catch (firestoreError) {
          console.error('[Firebase Auth] Firestore profile deletion failed:', firestoreError);
          // Continue — deleting the auth credential is what unblocks re-signup.
        }
      }

      // Delete the Auth account itself. If the token is still stale, refresh
      // once more and retry (covers a token that expired between refresh and
      // this call, or a restore path that left ensureValidToken a no-op).
      let response = await nativeHttp.post(`${this.authUrl}:delete?key=${this.apiKey}`, {
        idToken: this.idToken
      });

      if (!response.ok && response.data?.error?.message?.includes('INVALID_ID_TOKEN') && this.refreshToken) {
        console.log('[Firebase Auth] Delete got INVALID_ID_TOKEN — refreshing and retrying...');
        await this.refreshIdToken();
        response = await nativeHttp.post(`${this.authUrl}:delete?key=${this.apiKey}`, {
          idToken: this.idToken
        });
      }

      if (!response.ok) {
        const errorMessage = response.data?.error?.message || `Account deletion failed (Status: ${response.status})`;
        console.error('[Firebase Auth] Delete account failed:', errorMessage);
        return { success: false, error: errorMessage };
      }

      // Clear all auth state so the app drops to a signed-out state.
      this.currentUser = null;
      this.idToken = null;
      this.refreshToken = null;
      localStorage.removeItem('swipecity_native_tokens');

      console.log('[Firebase Auth] ✅ Account deleted');
      return { success: true };
    } catch (error) {
      console.error('[Firebase Auth] Delete account error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Re-authenticate the current user with their password to get a token with a
   * fresh login time. Firebase requires this before sensitive actions like
   * account deletion (CREDENTIAL_TOO_OLD_LOGIN_AGAIN) once the session ages.
   */
  async reauthenticate(password) {
    try {
      const email = this.currentUser?.email;
      if (!email) {
        return { success: false, error: 'No current user to re-authenticate' };
      }

      const response = await nativeHttp.post(`${this.authUrl}:signInWithPassword?key=${this.apiKey}`, {
        email,
        password,
        returnSecureToken: true
      });

      if (!response.ok) {
        const errorMessage = response.data?.error?.message || 'Re-authentication failed';
        return { success: false, error: errorMessage };
      }

      // Adopt the fresh tokens (new login time) so the next sensitive call passes.
      this.idToken = response.data.idToken;
      this.refreshToken = response.data.refreshToken;
      this.saveAuthToStorage();

      return { success: true };
    } catch (error) {
      console.error('[Firebase Auth] Re-authentication error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh ID token using refresh token
   */
  async refreshIdToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      console.log('[Firebase Auth] Refreshing ID token...');
      
      const response = await nativeHttp.post(`https://securetoken.googleapis.com/v1/token?key=${this.apiKey}`, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.data?.error?.message || response.status}`);
      }

      const tokenData = response.data;
      this.idToken = tokenData.id_token;
      this.refreshToken = tokenData.refresh_token;
      
      // Save updated tokens to localStorage
      this.saveAuthToStorage();
      
      console.log('[Firebase Auth] ✅ ID token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[Firebase Auth] Token refresh failed:', error);
      // Clear invalid tokens
      this.idToken = null;
      this.refreshToken = null;
      this.currentUser = null;
      throw error;
    }
  }

  /**
   * Ensure we have a valid ID token, refresh if needed
   */
  async ensureValidToken() {
    console.log('[Firebase Auth] Checking token state:', {
      hasIdToken: !!this.idToken,
      hasRefreshToken: !!this.refreshToken,
      hasCurrentUser: !!this.currentUser
    });
    
    if (!this.idToken && this.refreshToken) {
      console.log('[Firebase Auth] No ID token, attempting refresh...');
      await this.refreshIdToken();
    } else if (!this.idToken && !this.refreshToken) {
      console.error('[Firebase Auth] No tokens available - user needs to sign in again');
      throw new Error('User not authenticated - no tokens available');
    } else if (this.idToken && this.refreshToken) {
      // We have an ID token, but Firebase ID tokens expire after ~1h. A token
      // restored from storage or minted at an earlier sign-in is frequently
      // stale, and the old code assumed any present token was valid — which made
      // getUserProfile/createUserProfile/etc. silently fail with INVALID_ID_TOKEN
      // for returning users. Proactively refresh when the token is older than
      // ~55 minutes.
      const TOKEN_MAX_AGE_MS = 55 * 60 * 1000;
      const age = this.tokenTimestamp ? (Date.now() - this.tokenTimestamp) : Infinity;
      if (age > TOKEN_MAX_AGE_MS) {
        console.log('[Firebase Auth] ID token is stale (age ms:', age, ') - refreshing...');
        await this.refreshIdToken();
      }
    }
    console.log('[Firebase Auth] Token validation successful');
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    if (!this.idToken) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await nativeHttp.post(`${this.authUrl}:update?key=${this.apiKey}`, {
        idToken: this.idToken,
        displayName: profileData.displayName,
        photoUrl: profileData.photoURL,
        returnSecureToken: true
      });

      if (response.ok) {
        // Update local user object
        if (this.currentUser) {
          this.currentUser.displayName = profileData.displayName || this.currentUser.displayName;
          this.currentUser.photoURL = profileData.photoURL || this.currentUser.photoURL;
        }
      }

      return response.ok;
    } catch (error) {
      console.error('[Firebase Auth] Profile update error:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email) {
    try {
      const response = await nativeHttp.post(`${this.authUrl}:sendOobCode?key=${this.apiKey}`, {
        requestType: "PASSWORD_RESET",
        email: email
      });

      return { success: response.ok, error: response.ok ? null : response.data?.error?.message };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== FIRESTORE ====================

  /**
   * Create user profile document
   */
  async createUserProfile(userData) {
    if (!this.idToken) {
      throw new Error('User not authenticated');
    }

    try {
      const document = this.createFirestoreDocument(userData);
      const response = await nativeHttp.post(
        `${this.firestoreUrl}/users/${userData.uid}?key=${this.apiKey}`,
        document,
        {
          headers: {
            'Authorization': `Bearer ${this.idToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.ok;
    } catch (error) {
      console.error('[Firestore] Create user profile error:', error);
      return false;
    }
  }

  /**
   * Get user profile document
   */
  async getUserProfile(uid) {
    try {
      // Ensure the token is fresh first. On app launch this runs with a token
      // restored from storage that is often >1h old; without a refresh the read
      // returns 401 and the user's latest profile/chats/saved items silently
      // fail to sync. ensureValidToken now refreshes stale tokens by age.
      try { await this.ensureValidToken(); } catch (e) { /* unauthenticated read; continue */ }

      const response = await nativeHttp.get(
        `${this.firestoreUrl}/users/${uid}?key=${this.apiKey}`,
        {
          headers: this.idToken ? { 'Authorization': `Bearer ${this.idToken}` } : {}
        }
      );

      if (response.ok && response.data.fields) {
        return this.parseFirestoreDocument(response.data);
      }
      return null;
    } catch (error) {
      console.error('[Firestore] Get user profile error:', error);
      return null;
    }
  }

  /**
   * Update user profile document
   */
  async updateUserProfile(uid, updates) {
    // Ensure we have a valid token
    try {
      await this.ensureValidToken();
    } catch (tokenError) {
      console.error('[Firestore] Token validation failed:', tokenError);
      throw new Error('User not authenticated');
    }

    try {
      console.log('[Firestore] Updating user profile with:', Object.keys(updates));
      console.log('[Firestore] Update data sample:', {
        buyerChats: updates.buyerChats ? `${updates.buyerChats.length} chats` : 'not included',
        sellerChats: updates.sellerChats ? `${updates.sellerChats.length} chats` : 'not included',
        swipeStats: updates.swipeStats ? 'included' : 'not included'
      });
      
      // First, get the existing profile
      const existingProfile = await this.getUserProfile(uid) || {};
      console.log('[Firestore] Existing profile keys:', Object.keys(existingProfile));
      
      // Merge updates with existing data
      const mergedData = { ...existingProfile, ...updates };
      console.log('[Firestore] Merged data keys:', Object.keys(mergedData));
      
      // Create the complete document
      const document = this.createFirestoreDocument(mergedData);
      console.log('[Firestore] Document to send (first 500 chars):', JSON.stringify(document, null, 2).substring(0, 500));
      
      // Use PATCH to update the entire document with retry logic
      let response;
      let retryCount = 0;
      const maxRetries = 1;
      
      while (retryCount <= maxRetries) {
        try {
          response = await nativeHttp.patch(
            `${this.firestoreUrl}/users/${uid}?key=${this.apiKey}`,
            document,
            {
              headers: {
                'Authorization': `Bearer ${this.idToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          // If successful, break out of retry loop
          if (response.ok) {
            break;
          }
          
          // Check if it's an authentication error
          if (response.status === 401 && retryCount < maxRetries) {
            console.log('[Firestore] Auth error, refreshing token and retrying...');
            await this.refreshIdToken();
            retryCount++;
            continue;
          }
          
          // Non-auth error or max retries reached
          break;
        } catch (requestError) {
          if (retryCount < maxRetries && (requestError.message?.includes('401') || requestError.message?.includes('unauthorized'))) {
            console.log('[Firestore] Request failed with auth error, refreshing token and retrying...');
            await this.refreshIdToken();
            retryCount++;
            continue;
          }
          throw requestError;
        }
      }

      console.log('[Firestore] Update response status:', response.status);
      console.log('[Firestore] Update response ok:', response.ok);
      
      if (!response.ok) {
        console.error('[Firestore] Update failed, response:', response.data);
      } else {
        console.log('[Firestore] ✅ User profile updated successfully');
      }

      return response.ok;
    } catch (error) {
      console.error('[Firestore] Update user profile error:', error);
      console.error('[Firestore] Error stack:', error.stack);
      return false;
    }
  }

  // ==================== STORAGE ====================

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(path, file) {
    // Make sure the token is fresh — like accounts:delete, a Storage upload
    // with an expired ID token is rejected (a token restored from storage or
    // minted at an earlier sign-in is often stale by upload time).
    if (this.refreshToken) {
      try {
        await this.refreshIdToken();
      } catch (refreshError) {
        console.error('[Storage] Pre-upload token refresh failed:', refreshError);
      }
    }
    try {
      await this.ensureValidToken();
    } catch (tokenError) {
      throw new Error('User not authenticated');
    }

    try {
      // Convert file to base64 for upload
      const base64Data = await this.fileToBase64(file);

      const doUpload = () => nativeHttp.post(
        `${this.storageUrl}/${encodeURIComponent(path)}?key=${this.apiKey}`,
        base64Data,
        {
          headers: {
            'Authorization': `Bearer ${this.idToken}`,
            'Content-Type': file.type
          }
        }
      );

      let response = await doUpload();

      // Refresh + retry once if the token was rejected mid-flight.
      if (!response.ok && (response.status === 401 || response.data?.error?.message?.includes('INVALID_ID_TOKEN')) && this.refreshToken) {
        console.log('[Storage] Upload auth error — refreshing token and retrying...');
        await this.refreshIdToken();
        response = await doUpload();
      }

      if (response.ok) {
        // Get download URL
        const downloadUrl = await this.getDownloadURL(path);
        return { success: true, url: downloadUrl };
      }

      return { success: false, error: response.data?.error?.message || 'Upload failed' };
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get download URL for uploaded file
   */
  async getDownloadURL(path) {
    try {
      const response = await nativeHttp.get(
        `${this.storageUrl}/${encodeURIComponent(path)}?key=${this.apiKey}`,
        {
          headers: this.idToken ? { 'Authorization': `Bearer ${this.idToken}` } : {}
        }
      );

      if (response.ok) {
        return response.data.downloadTokens 
          ? `${this.storageUrl}/${encodeURIComponent(path)}?alt=media&token=${response.data.downloadTokens}`
          : `${this.storageUrl}/${encodeURIComponent(path)}?alt=media`;
      }
      
      return null;
    } catch (error) {
      console.error('[Storage] Get download URL error:', error);
      return null;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Convert JavaScript object to Firestore document format
   */
  createFirestoreDocument(data) {
    const fields = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value === null || value === undefined) return;
      
      if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: value.toString() };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (Array.isArray(value)) {
        // Handle arrays properly - check if array contains objects or primitives
        fields[key] = { 
          arrayValue: { 
            values: value.map(v => {
              if (v === null || v === undefined) {
                return { nullValue: null };
              } else if (typeof v === 'string') {
                return { stringValue: v };
              } else if (typeof v === 'number') {
                return Number.isInteger(v) ? { integerValue: v.toString() } : { doubleValue: v };
              } else if (typeof v === 'boolean') {
                return { booleanValue: v };
              } else if (typeof v === 'object' && !Array.isArray(v)) {
                // Handle objects within arrays
                return { mapValue: { fields: this.createFirestoreDocument(v).fields } };
              } else if (Array.isArray(v)) {
                // Handle nested arrays
                return { arrayValue: { values: v.map(nv => ({ stringValue: nv.toString() })) } };
              } else {
                return { stringValue: v.toString() };
              }
            })
          }
        };
      } else if (typeof value === 'object') {
        fields[key] = { mapValue: { fields: this.createFirestoreDocument(value).fields } };
      }
    });
    
    return { fields };
  }

  /**
   * Parse Firestore document to JavaScript object
   */
  parseFirestoreDocument(doc) {
    if (!doc.fields) return {};
    
    const result = {};
    Object.keys(doc.fields).forEach(key => {
      const field = doc.fields[key];
      
      if (field.stringValue !== undefined) {
        result[key] = field.stringValue;
      } else if (field.integerValue !== undefined) {
        result[key] = parseInt(field.integerValue);
      } else if (field.doubleValue !== undefined) {
        result[key] = field.doubleValue;
      } else if (field.booleanValue !== undefined) {
        result[key] = field.booleanValue;
      } else if (field.nullValue !== undefined) {
        result[key] = null;
      } else if (field.arrayValue?.values) {
        // Handle arrays properly - parse each value based on its type
        result[key] = field.arrayValue.values.map(v => {
          if (v.stringValue !== undefined) return v.stringValue;
          if (v.integerValue !== undefined) return parseInt(v.integerValue);
          if (v.doubleValue !== undefined) return v.doubleValue;
          if (v.booleanValue !== undefined) return v.booleanValue;
          if (v.nullValue !== undefined) return null;
          if (v.mapValue?.fields) return this.parseFirestoreDocument({ fields: v.mapValue.fields });
          if (v.arrayValue?.values) return v.arrayValue.values.map(av => av.stringValue || av);
          return v;
        });
      } else if (field.mapValue?.fields) {
        result[key] = this.parseFirestoreDocument({ fields: field.mapValue.fields });
      }
    });
    
    return result;
  }

  /**
   * Convert file to base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // ==================== AUTH STATE MANAGEMENT ====================

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Restore authentication state from localStorage
   */
  restoreAuthFromStorage() {
    try {
      console.log('[Firebase Auth] Attempting to restore auth from storage...');
      
      const savedUser = localStorage.getItem('swipecity_native_user');
      const savedTokens = localStorage.getItem('swipecity_native_tokens');
      
      console.log('[Firebase Auth] Storage check:', {
        hasSavedUser: !!savedUser,
        hasSavedTokens: !!savedTokens
      });
      
      if (savedUser && savedTokens) {
        const userData = JSON.parse(savedUser);
        const tokenData = JSON.parse(savedTokens);
        
        console.log('[Firebase Auth] Parsed data:', {
          userEmail: userData.email,
          tokenTimestamp: tokenData.timestamp,
          hasIdToken: !!tokenData.idToken,
          hasRefreshToken: !!tokenData.refreshToken
        });
        
        this.currentUser = userData;
        this.idToken = tokenData.idToken;
        this.refreshToken = tokenData.refreshToken;
        this.tokenTimestamp = tokenData.timestamp || null;

        console.log('[Firebase Auth] ✅ Authentication state restored from storage');
        console.log('[Firebase Auth] User:', userData.email);
        console.log('[Firebase Auth] Has ID token:', !!this.idToken);
        console.log('[Firebase Auth] Has refresh token:', !!this.refreshToken);
        
        return true;
      }
      
      console.log('[Firebase Auth] ❌ No saved auth state found - user needs to sign in');
      return false;
    } catch (error) {
      console.error('[Firebase Auth] Failed to restore auth state:', error);
      return false;
    }
  }

  /**
   * Save authentication state to localStorage
   */
  saveAuthToStorage() {
    try {
      if (this.currentUser) {
        try { localStorage.setItem('swipecity_native_user', JSON.stringify(this.currentUser)); }
        catch (e) { console.warn('[Firebase Auth] could not persist user (quota?):', e?.message); }
      }

      if (this.idToken && this.refreshToken) {
        const now = Date.now();
        this.tokenTimestamp = now;
        localStorage.setItem('swipecity_native_tokens', JSON.stringify({
          idToken: this.idToken,
          refreshToken: this.refreshToken,
          timestamp: now
        }));
      }

      console.log('[Firebase Auth] Authentication state saved to storage');
    } catch (error) {
      console.error('[Firebase Auth] Failed to save auth state:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return this.currentUser !== null && this.idToken !== null;
  }
}

// Create singleton instance
export const firebaseNative = new FirebaseNativeService();

// Export as default
export default firebaseNative;