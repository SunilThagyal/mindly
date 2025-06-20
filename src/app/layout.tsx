
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { AdSettingsProvider } from '@/context/ad-settings-context';
import { EarningsSettingsProvider } from '@/context/earnings-settings-context'; // Import EarningsSettingsProvider
import Header from '@/components/layout/header';
import AdPlaceholder from '@/components/layout/ad-placeholder';
import { cn } from '@/lib/utils';
import { Montserrat, Merriweather, Lora } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const merriweather = Merriweather({
  subsets: ['latin'],
  variable: '--font-merriweather',
  weight: ['300', '400', '700', '900'],
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'Blogchain',
  description: 'A decentralized blogging platform where creativity pays.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(montserrat.variable, merriweather.variable, lora.variable)}>
      <head>
        {/* Google Fonts preconnect - Next/font handles optimal loading */}
        {/* Consider adding AdSense script here if using AdSense */}
        {/* <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=YOUR_ADSENSE_CLIENT_ID" crossOrigin="anonymous"></script> */}
      </head>
      <body className={cn("font-body antialiased flex flex-col min-h-screen")}>
        <AuthProvider>
          <AdSettingsProvider>
            <EarningsSettingsProvider> {/* Wrap with EarningsSettingsProvider */}
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8">
                {children}
              </main>
              <AdPlaceholder type="mobile-sticky-footer" />
              <Toaster />
            </EarningsSettingsProvider>
          </AdSettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
