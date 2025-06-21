
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

const SYSTEM_FONTS = ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif", "Georgia", "Times New Roman", "serif", "Courier New", "monospace"];

export const ThemeSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  useEffect(() => {
    if (loading) return;

    // --- Manage Fonts ---
    const fontBody = settings.fontBody || defaultThemeSettings.fontBody!;
    const fontHeadline = settings.fontHeadline || defaultThemeSettings.fontHeadline!;
    
    document.querySelectorAll('link[data-dynamic-font="true"]').forEach(el => el.remove());
    
    const googleFonts = [fontBody, fontHeadline].filter(f => !SYSTEM_FONTS.includes(f));
    const uniqueGoogleFonts = [...new Set(googleFonts)];

    if (uniqueGoogleFonts.length > 0) {
        const fontUrl = `https://fonts.googleapis.com/css2?${uniqueGoogleFonts.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;900`).join('&')}&display=swap`;
        const link = document.createElement('link');
        link.href = fontUrl;
        link.rel = 'stylesheet';
        link.setAttribute('data-dynamic-font', 'true');
        document.head.appendChild(link);
    }
    
    // --- Manage Colors and CSS Variables ---
    const styleId = 'dynamic-theme-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    
    const css = `
    :root {
        ${settings.backgroundColor ? `--background: ${settings.backgroundColor};` : ''}
        ${settings.foregroundColor ? `--foreground: ${settings.foregroundColor};` : ''}
        ${settings.cardColor ? `--card: ${settings.cardColor};` : ''}
        ${settings.cardForegroundColor ? `--card-foreground: ${settings.cardForegroundColor};` : ''}
        ${settings.primaryColor ? `--primary: ${settings.primaryColor};` : ''}
        ${settings.secondaryColor ? `--secondary: ${settings.secondaryColor};` : ''}
        ${settings.accentColor ? `--accent: ${settings.accentColor};` : ''}
        --font-body: "${fontBody}";
        --font-headline: "${fontHeadline}";
    }
    `;

    styleTag.innerHTML = css;

  }, [settings, loading]);

  if (loading) {
     return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ThemeSettingsContext.Provider value={{ settings, loading }}>
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
