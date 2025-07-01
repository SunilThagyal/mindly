
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

const ThemeSettingsContext = createContext<ThemeSettingsContextType | undefined>(undefined);

export const ThemeSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This listener now primarily provides live data updates to client components
    // that might need it (e.g., itemsPerPage on the homepage).
    // The initial visual theme is now rendered on the server in RootLayout.
    const settingsDocRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({ ...defaultThemeSettings, ...data });
      } else {
        setSettings(defaultThemeSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching theme settings:", error);
      setSettings(defaultThemeSettings);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ThemeSettingsContext.Provider value={{ settings, loading }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
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
