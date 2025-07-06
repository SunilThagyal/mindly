import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: "AIzaSyBY7xyYvhfvH0u_3EiqxpFUVM33WVcPVcQ",
  authDomain: "mindly-b1d9e.firebaseapp.com",
  projectId: "mindly-b1d9e",
  storageBucket: "mindly-b1d9e.firebasestorage.app",
  messagingSenderId: "694533024913",
  appId: "1:694533024913:web:89930b27b97e2316b6e330",
  measurementId: "G-L42817BZFD"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export { app, auth, db, storage, analytics };
