
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const ADMIN_ENV_UID = process.env.ADMIN_USER_UID;

if (!ADMIN_ENV_UID || ADMIN_ENV_UID === "YOUR_ACTUAL_ADMIN_FIREBASE_UID_HERE") {
  console.warn(
    "********************************************************************\n" +
    "WARNING: Admin User UID is not configured or is using placeholder. \n" +
    "Please ensure ADMIN_USER_UID is set in your .env file and next.config.ts correctly exposes it.\n" +
    `The value currently read from process.env.ADMIN_USER_UID is: ${ADMIN_ENV_UID}\n` +
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
    // This effect runs once to set up the auth state listener.
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Cleanup the auth listener when the provider unmounts.
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // This effect runs whenever the user logs in or out.
    if (user) {
      // User is logged in, set up a real-time listener for their profile document.
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
        // This callback runs immediately and whenever the user's document changes.
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
            paymentBankAccountHolderName: null,
            paymentAccountNumber: null,
            paymentBankName: null,
            paymentIfscCode: null,
            paymentPaypalEmail: null,
        };

        if (docSnap.exists()) {
          const existingData = docSnap.data() as UserProfile;
          setUserProfile({ 
            ...defaultProfileValues, 
            ...existingData,
            uid: user.uid,
            email: user.email,
            displayName: existingData.displayName || user.displayName,
            photoURL: existingData.photoURL || user.photoURL,
          });
        } else {
          // This case handles first-time social logins where an auth entry exists
          // but a Firestore document has not been created yet.
          const newProfile: UserProfile = {
            ...defaultProfileValues, 
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          };
          await setDoc(userDocRef, newProfile);
          setUserProfile(newProfile);
        }
        setIsAdmin(!!ADMIN_ENV_UID && user.uid === ADMIN_ENV_UID);
      }, (error) => {
        console.error("Error listening to user profile:", error);
        setUserProfile(null);
        setIsAdmin(false);
      });
      
      // Cleanup this listener when the user logs out (when `user` becomes null).
      return () => unsubscribeProfile();
    } else {
      // User is logged out, clear all user-specific data.
      setUserProfile(null);
      setIsAdmin(false);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  }, [router]);

  const contextValue = useMemo(() => ({
    user,
    userProfile,
    loading,
    isAdmin,
    signOut,
  }), [user, userProfile, loading, isAdmin, signOut]);

  if (loading) {
    return (
      <div className="hidden md:flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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
