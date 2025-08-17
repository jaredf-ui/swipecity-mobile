import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// Firebase configuration - replace with your actual config
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-api-key",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "your-app-id"
};
// Initialize Firebase
let app;
let auth;
let db;
let storage;
export const initializeFirebase = () => {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        console.log('Firebase initialized successfully');
        return { app, auth, db, storage };
    }
    catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
};
// Export initialized instances
export const getFirebaseInstances = () => {
    if (!app || !auth || !db || !storage) {
        throw new Error('Firebase not initialized. Call initializeFirebase() first.');
    }
    return { app, auth, db, storage };
};
