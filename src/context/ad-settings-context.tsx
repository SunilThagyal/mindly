
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { AdSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AdSettingsContextType extends AdSettings {
  loadingSettings: boolean;
}

const defaultAdSettings: AdSettings = {
  adsEnabled: true, // Default to ads being enabled
  adDensity: 'high',  // Default to high density
};

const AdSettingsContext = createContext<AdSettingsContextType | undefined>(undefined);

export const AdSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AdSettings>(defaultAdSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'ads');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AdSettings>;
        // Merge with defaults to ensure all properties are present
        setSettings({
            adsEnabled: typeof data.adsEnabled === 'boolean' ? data.adsEnabled : defaultAdSettings.adsEnabled,
            adDensity: data.adDensity || defaultAdSettings.adDensity,
        });
      } else {
        // If document doesn't exist, use defaults
        setSettings(defaultAdSettings);
        console.warn("Ad settings document ('settings/ads') not found in Firestore. Using default ad settings.");
      }
      setLoadingSettings(false);
    }, (error) => {
      console.error("Error fetching ad settings:", error);
      setSettings(defaultAdSettings); // Fallback to defaults on error
      setLoadingSettings(false);
    });

    return () => unsubscribe();
  }, []);

  // If settings are still loading, you might want to show a loader or render children with default settings
  // For simplicity here, we pass loading state.
  if (loadingSettings && Object.keys(settings).length === 0) { // Ensure settings has been populated at least once
     return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading ad configuration...</p>
      </div>
    );
  }


  return (
    <AdSettingsContext.Provider value={{ ...settings, loadingSettings }}>
      {children}
    </AdSettingsContext.Provider>
  );
};

export const useAdSettings = (): AdSettingsContextType => {
  const context = useContext(AdSettingsContext);
  if (context === undefined) {
    throw new Error('useAdSettings must be used within an AdSettingsProvider');
  }
  return context;
};
