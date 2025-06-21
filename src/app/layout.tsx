
// REMOVED "use client"; 

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { AdSettingsProvider } from '@/context/ad-settings-context';
import { EarningsSettingsProvider } from '@/context/earnings-settings-context'; 
import { ThemeSettingsProvider } from '@/context/theme-settings-context';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import ConditionalFooterAd from '@/components/layout/conditional-footer-ad'; // NEW
import { cn } from '@/lib/utils';
// Font imports are now handled dynamically by ThemeSettingsProvider
// import { Montserrat, Merriweather, Lora } from 'next/font/google';

export const metadata: Metadata = { // This is now valid
  title: 'Mindly',
  description: 'A decentralized blogging platform where your thoughts have value.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Dynamic fonts and styles will be injected here by ThemeSettingsProvider */}
      </head>
      <body className={cn("font-body antialiased flex flex-col min-h-screen")}>
        <AuthProvider>
          <AdSettingsProvider>
            <EarningsSettingsProvider>
              <ThemeSettingsProvider>
                <Header />
                <main className="flex-grow container mx-auto px-4 py-8">
                  {children}
                </main>
                <Footer />
                <ConditionalFooterAd />
                <Toaster />
              </ThemeSettingsProvider>
            </EarningsSettingsProvider>
          </AdSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
