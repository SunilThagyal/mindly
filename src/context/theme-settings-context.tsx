
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { ThemeSettings } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ThemeSettingsContextType {
  settings: ThemeSettings;
  loading: boolean;
}

const defaultThemeSettings: ThemeSettings = {
  primaryColor: '48 100% 50%',
  backgroundColor: '0 0% 98%',
  foregroundColor: '0 0% 20%',
  cardColor: '0 0% 100%',
  cardForegroundColor: '0 0% 13%',
  secondaryColor: '0 0% 93%',
  accentColor: '18 100% 50%',
  fontBody: 'Merriweather',
  fontHeadline: 'Montserrat',
  itemsPerPage: 9,
};

const ThemeSettingsContext = createContext<ThemeSettingsContextType>({
  settings: defaultThemeSettings,
  loading: true,
});

export const ThemeSettingsProvider = ({ children, initialSettings }: { children: ReactNode, initialSettings: ThemeSettings }) => {
  const [settings, setSettings] = useState<ThemeSettings>(initialSettings || defaultThemeSettings);
  
  useEffect(() => {
    // This listener provides live data updates to client components
    // after the initial server-rendered page is loaded.
    const settingsDocRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // We merge with initialSettings to ensure defaults are always present
        setSettings({ ...initialSettings, ...data });
      }
    }, (error) => {
      console.error("Error with theme settings listener:", error);
    });

    return () => unsubscribe();
  }, [initialSettings]);

  return (
    <ThemeSettingsContext.Provider value={{ settings, loading: false }}>
      {children}
    </ThemeSettingsContext.Provider>
  );
};

export const useThemeSettings = (): ThemeSettingsContextType => {
  const context = useContext(ThemeSettingsContext);
  if (context === undefined) {
    throw new Error('useThemeSettings must be used within a ThemeSettingsProvider');
  }
  return context;
};
