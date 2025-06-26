import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// const firebaseConfig = {
//   apiKey: "AIzaSyB0lQyu2t7iVIBAC-xFJc60bTq6HMDhS38",
//   authDomain: "sample-ae266.firebaseapp.com",
//   databaseURL: "https://sample-ae266-default-rtdb.firebaseio.com",
//   projectId: "sample-ae266",
//   storageBucket: "sample-ae266.appspot.com",
//   messagingSenderId: "387363513257",
//   appId: "1:387363513257:web:7b1e260391fddd41145ab8",
//   measurementId: "G-BQ7Y89EH7C"
// };

const firebaseConfig = {
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

export { app, auth, db, storage };
