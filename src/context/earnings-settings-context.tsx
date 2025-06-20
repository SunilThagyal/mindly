
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { EarningsSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const defaultEarningsSettings: EarningsSettings = {
  baseEarningPerView: 0.01, // Default earning rate if not set in Firestore
};

const EarningsSettingsContext = createContext<EarningsSettings | undefined>(undefined);

export const EarningsSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<EarningsSettings>(defaultEarningsSettings);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'earnings');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<EarningsSettings>;
        setSettings({
          baseEarningPerView: typeof data.baseEarningPerView === 'number' 
            ? data.baseEarningPerView 
            : defaultEarningsSettings.baseEarningPerView,
        });
      } else {
        setSettings(defaultEarningsSettings);
        console.warn("Earnings settings document ('settings/earnings') not found in Firestore. Using default settings. Please create this document in Firestore if you want to manage earnings settings centrally.");
      }
      setLoadingSettings(false);
    }, (error) => {
      console.error("Error fetching earnings settings:", error);
      setSettings(defaultEarningsSettings); 
      setLoadingSettings(false);
    });

    return () => unsubscribe();
  }, []);

  if (loadingSettings && settings.baseEarningPerView === defaultEarningsSettings.baseEarningPerView) { 
     return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Loading earnings configuration...</p>
      </div>
    );
  }

  return (
    <EarningsSettingsContext.Provider value={settings}>
      {children}
    </EarningsSettingsContext.Provider>
  );
};

export const useEarningsSettings = (): EarningsSettings => {
  const context = useContext(EarningsSettingsContext);
  if (context === undefined) {
    throw new Error('useEarningsSettings must be used within an EarningsSettingsProvider');
  }
  return context;
};
