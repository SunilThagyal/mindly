
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
import { siteConfig } from '@/config/site';
import PageTransitionLoader from '@/components/layout/page-transition-loader';
import GoogleAnalytics from '@/components/analytics/google-analytics';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SeoSettings } from '@/lib/types';


const defaultKeywords = [
  "decentralized blogging", "Mindly blogging platform", "earn rewards",
  "content creation", "global community", "web3 blogging", "share ideas",
  "monetize content", "blog monetization", "decentralized content platform"
];

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
    // This can happen at build time if Firestore isn't accessible. Fallback to defaults.
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
