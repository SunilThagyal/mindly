
// src/app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { AdSettingsProvider } from '@/context/ad-settings-context';
import { EarningsSettingsProvider } from '@/context/earnings-settings-context';
import { ThemeSettingsProvider } from '@/context/theme-settings-context';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import ConditionalFooterAd from '@/components/layout/conditional-footer-ad';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import PageTransitionLoader from '@/components/layout/page-transition-loader';
import GoogleAnalytics from '@/components/analytics/google-analytics';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SeoSettings, ThemeSettings } from '@/lib/types';

// Default theme settings to be used as a fallback
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

// Default SEO settings
const defaultKeywords = [
  "decentralized blogging", "Mindly blogging platform", "earn rewards",
  "content creation", "global community", "web3 blogging", "share ideas",
  "monetize content", "blog monetization", "decentralized content platform"
];

const SYSTEM_FONTS = ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif", "Georgia", "Times New Roman", "serif", "Courier New", "monospace"];

// Fetch theme settings on the server
async function getThemeSettings(): Promise<ThemeSettings> {
    try {
        const themeDoc = await getDoc(doc(db, 'settings', 'theme'));
        if (themeDoc.exists()) {
            return { ...defaultThemeSettings, ...themeDoc.data() };
        }
    } catch (error) {
        console.error("Failed to fetch theme settings for layout, using defaults:", error);
    }
    return defaultThemeSettings;
}

export async function generateMetadata(): Promise<Metadata> {
  let metaDescription = siteConfig.description;
  let metaKeywords: string[] | undefined = defaultKeywords;

  try {
    const seoSettingsDoc = await getDoc(doc(db, 'settings', 'seo'));
    if (seoSettingsDoc.exists()) {
      const seoData = seoSettingsDoc.data() as SeoSettings;
      metaDescription = seoData.metaDescription || metaDescription;
      metaKeywords = seoData.metaKeywords && seoData.metaKeywords.length > 0 ? seoData.metaKeywords : metaKeywords;
    }
  } catch (error) {
    console.error("Failed to fetch SEO settings for metadata, using defaults:", error);
  }

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: metaDescription,
    keywords: metaKeywords,
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/favicon.ico',
    },
    openGraph: {
      title: siteConfig.name,
      description: metaDescription,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: `${siteConfig.url}/default-og-image.png`,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteConfig.name,
      description: metaDescription,
      images: [`${siteConfig.url}/default-og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeSettings = await getThemeSettings();
  
  const fontBody = themeSettings.fontBody || defaultThemeSettings.fontBody!;
  const fontHeadline = themeSettings.fontHeadline || defaultThemeSettings.fontHeadline!;
  const googleFonts = [...new Set([fontBody, fontHeadline].filter(f => !SYSTEM_FONTS.includes(f)))];
  const fontUrl = googleFonts.length > 0 
    ? `https://fonts.googleapis.com/css2?${googleFonts.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;900`).join('&')}&display=swap`
    : null;

  // Generate CSS variables on the server to prevent layout shift
  const themeStyle = `
    :root {
        --background: ${themeSettings.backgroundColor};
        --foreground: ${themeSettings.foregroundColor};
        --card: ${themeSettings.cardColor};
        --card-foreground: ${themeSettings.cardForegroundColor};
        --primary: ${themeSettings.primaryColor};
        --secondary: ${themeSettings.secondaryColor};
        --accent: ${themeSettings.accentColor};
    }
    body {
        --font-body: "${fontBody}";
        --font-headline: "${fontHeadline}";
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style id="initial-theme-styles" dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      </head>
      <body className={cn("font-body antialiased flex flex-col min-h-screen")}>
        <AuthProvider>
          <AdSettingsProvider>
            <EarningsSettingsProvider>
              <ThemeSettingsProvider>
                <PageTransitionLoader />
                <GoogleAnalytics />
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
