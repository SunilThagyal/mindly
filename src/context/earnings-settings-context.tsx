
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { EarningsSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface EarningsSettingsContextType extends EarningsSettings {
  loadingSettings: boolean;
}

const defaultEarningsSettings: EarningsSettings = {
  baseEarningPerView: 0.01,
  minimumWithdrawalAmount: 10,
  minimumViewDuration: 5,
};

const EarningsSettingsContext = createContext<EarningsSettingsContextType | undefined>(undefined);

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
          minimumWithdrawalAmount: typeof data.minimumWithdrawalAmount === 'number'
            ? data.minimumWithdrawalAmount
            : defaultEarningsSettings.minimumWithdrawalAmount,
          minimumViewDuration: typeof data.minimumViewDuration === 'number'
            ? data.minimumViewDuration
            : defaultEarningsSettings.minimumViewDuration,
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

  return (
    <EarningsSettingsContext.Provider value={{ ...settings, loadingSettings }}>
      {children}
    </EarningsSettingsContext.Provider>
  );
};

export const useEarningsSettings = (): EarningsSettingsContextType => {
  const context = useContext(EarningsSettingsContext);
  if (context === undefined) {
    throw new Error('useEarningsSettings must be used within an EarningsSettingsProvider');
  }
  return context;
};
