
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect } from 'react';

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

const GoogleAnalytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_TRACKING_ID) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          'Google Analytics is disabled. Set NEXT_PUBLIC_GA_ID in your .env file to enable it.'
        );
      }
      return;
    }

    const url = pathname + searchParams.toString();
    
    if (window.gtag) {
      window.gtag('config', GA_TRACKING_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  if (!GA_TRACKING_ID) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
};

export default GoogleAnalytics;
