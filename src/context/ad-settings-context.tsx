
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
  adsenseClientId: null,
  adsenseHeaderSlotId: null,
  adsenseInContentSlotId: null,
  adsenseSidebarSlotId: null,
  adsenseBelowContentSlotId: null,
  adsenseMobileStickyFooterSlotId: null,
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
        setSettings({
            adsEnabled: typeof data.adsEnabled === 'boolean' ? data.adsEnabled : defaultAdSettings.adsEnabled,
            adDensity: data.adDensity || defaultAdSettings.adDensity,
            adsenseClientId: data.adsenseClientId !== undefined ? data.adsenseClientId : defaultAdSettings.adsenseClientId,
            adsenseHeaderSlotId: data.adsenseHeaderSlotId !== undefined ? data.adsenseHeaderSlotId : defaultAdSettings.adsenseHeaderSlotId,
            adsenseInContentSlotId: data.adsenseInContentSlotId !== undefined ? data.adsenseInContentSlotId : defaultAdSettings.adsenseInContentSlotId,
            adsenseSidebarSlotId: data.adsenseSidebarSlotId !== undefined ? data.adsenseSidebarSlotId : defaultAdSettings.adsenseSidebarSlotId,
            adsenseBelowContentSlotId: data.adsenseBelowContentSlotId !== undefined ? data.adsenseBelowContentSlotId : defaultAdSettings.adsenseBelowContentSlotId,
            adsenseMobileStickyFooterSlotId: data.adsenseMobileStickyFooterSlotId !== undefined ? data.adsenseMobileStickyFooterSlotId : defaultAdSettings.adsenseMobileStickyFooterSlotId,
        });
      } else {
        setSettings(defaultAdSettings);
        console.warn("Ad settings document ('settings/ads') not found in Firestore. Using default ad settings. Please create this document in Firestore if you want to manage settings centrally.");
      }
      setLoadingSettings(false);
    }, (error) => {
      console.error("Error fetching ad settings:", error);
      setSettings(defaultAdSettings); 
      setLoadingSettings(false);
    });

    return () => unsubscribe();
  }, []);

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
