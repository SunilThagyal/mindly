
"use client";

import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAdSettings } from '@/context/ad-settings-context';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

interface AdPlaceholderProps {
  type: 'leaderboard-header' | 'in-content' | 'sidebar' | 'below-content' | 'mobile-sticky-footer';
  className?: string;
  // No children prop needed as we'll render the <ins> tag directly
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ type, className }) => {
  const {
    adsEnabled,
    loadingSettings,
    adsenseClientId,
    adsenseHeaderSlotId,
    adsenseInContentSlotId,
    adsenseSidebarSlotId,
    adsenseBelowContentSlotId,
    adsenseMobileStickyFooterSlotId,
  } = useAdSettings();

  const adContainerRef = React.useRef<HTMLDivElement>(null);

  let specificClass = "";
  let currentSlotId: string | null | undefined = null;
  let adFormat: string = "auto"; // Default format

  switch (type) {
    case 'leaderboard-header':
      specificClass = "ad-placeholder-leaderboard-header";
      currentSlotId = adsenseHeaderSlotId;
      break;
    case 'in-content':
      specificClass = "ad-placeholder-incontent";
      currentSlotId = adsenseInContentSlotId;
      break;
    case 'sidebar':
      specificClass = "ad-placeholder-sidebar";
      currentSlotId = adsenseSidebarSlotId;
      break;
    case 'below-content':
      specificClass = "ad-placeholder-below-content";
      currentSlotId = adsenseBelowContentSlotId;
      break;
    case 'mobile-sticky-footer':
      specificClass = "sm:hidden fixed bottom-0 left-0 right-0 h-12 bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center z-50 border-t border-border";
      currentSlotId = adsenseMobileStickyFooterSlotId;
      adFormat = ""; // Sticky ads often don't use 'auto' format, or have specific format from AdSense. AdSense usually handles this if responsive.
      break;
  }

  useEffect(() => {
    if (adsEnabled && adsenseClientId && currentSlotId && typeof window !== 'undefined' && adContainerRef.current && adContainerRef.current.firstChild) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error(`Error pushing to adsbygoogle for slot ${currentSlotId}:`, e);
      }
    }
  }, [adsEnabled, adsenseClientId, currentSlotId, type]); // re-run if these key properties change

  if (loadingSettings) {
    // Render a minimal skeleton or nothing to avoid layout shifts
    return <div className={cn("ad-placeholder-loading", specificClass, className, "bg-muted/50")}></div>;
  }

  if (!adsEnabled || !adsenseClientId || !currentSlotId) {
    // If ads are disabled, or no client/slot ID, don't render the ad.
    // Optionally, render a non-ad placeholder for layout purposes during development
    // if (process.env.NODE_ENV === 'development' && !adsEnabled) {
    //   return <div className={cn('ad-placeholder-dev-disabled', specificClass, className)}>Ads Disabled by Admin</div>;
    // }
    // if (process.env.NODE_ENV === 'development' && (!adsenseClientId || !currentSlotId)) {
    //    return <div className={cn('ad-placeholder-dev-unconfigured', specificClass, className)}>Ad Unit Unconfigured ({type})</div>;
    // }
    return null;
  }

  const adKey = `${type}-${adsenseClientId}-${currentSlotId}`;

  return (
    <div ref={adContainerRef} className={cn('ad-container-wrapper', specificClass, className)}>
      <ins
        key={adKey} // Adding a key helps React re-render if slot ID changes
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }} // Ensure ins takes up space for responsive ads
        data-ad-client={adsenseClientId}
        data-ad-slot={currentSlotId}
        data-ad-format={adFormat !== "" ? adFormat : undefined} // only add if not empty
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdPlaceholder;
