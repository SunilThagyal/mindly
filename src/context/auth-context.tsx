
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Admin UID will be read from environment variable, passed via next.config.js
const ADMIN_ENV_UID = process.env.ADMIN_USER_UID;
console.log('[Auth Context - Top Level] Raw ADMIN_USER_UID from env:', process.env.ADMIN_USER_UID);


if (!ADMIN_ENV_UID || ADMIN_ENV_UID === "YOUR_ACTUAL_ADMIN_FIREBASE_UID_HERE") {
  console.warn(
    "********************************************************************\n" +
    "WARNING: Admin User UID is not configured or is using placeholder. \n" +
    "Please ensure ADMIN_USER_UID is set in your .env file and next.config.ts correctly exposes it.\n" +
    "The value currently read from process.env.ADMIN_USER_UID is: ", ADMIN_ENV_UID + "\n" +
    "Admin functionality will be limited until this is set correctly.\n" +
    "********************************************************************"
  );
}


interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('[Auth Context - useEffect] Initializing. ADMIN_ENV_UID from process.env:', ADMIN_ENV_UID);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log('[Auth Context - useEffect] User state changed. Current firebaseUser.uid:', firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        const defaultProfileValues: Omit<UserProfile, 'uid' | 'email' | 'displayName' | 'photoURL'> = {
            bio: '',
            virtualEarnings: 0,
            isBlocked: false,
            postingRestricted: false,
            postingRestrictionReason: null,
            adsEnabledForUser: true, 
            adIntensityForUser: 'global',
            isMonetizationApproved: false,
            paymentCountry: null,
            paymentContactDetails: null,
            paymentAddress: null,
            paymentUpiId: null,
            paymentBankAccountHolderName: null, // Added default
            paymentAccountNumber: null,
            paymentBankName: null,
            paymentIfscCode: null,
            paymentPaypalEmail: null,
        };

        if (userDocSnap.exists()) {
          const existingData = userDocSnap.data() as UserProfile;
          setUserProfile({ 
            ...defaultProfileValues, 
            ...existingData,
            uid: firebaseUser.uid, // ensure core fields are from firebaseUser
            email: firebaseUser.email,
            displayName: existingData.displayName || firebaseUser.displayName, // Prefer existing displayName
            photoURL: existingData.photoURL || firebaseUser.photoURL, // Prefer existing photoURL
          });
        } else {
          const newProfile: UserProfile = {
            ...defaultProfileValues, 
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);
          console.log('[Auth Context - useEffect] New user profile created in Firestore with defaults.');
        }
        
        const isAdminCheck = !!ADMIN_ENV_UID && firebaseUser.uid === ADMIN_ENV_UID;
        setIsAdmin(isAdminCheck);
        console.log('[Auth Context - useEffect] isAdmin determined as:', isAdminCheck, `(ADMIN_ENV_UID: ${ADMIN_ENV_UID}, User UID: ${firebaseUser.uid})`);
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        console.log('[Auth Context - useEffect] No user logged in, isAdmin set to false.');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const contextValue = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAdmin,
    signOut,
  }), [user, userProfile, loading, isAdmin, signOut]);


  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
