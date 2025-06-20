
"use client";

import React, { useEffect, useRef } from 'react';
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

  const adContainerRef = useRef<HTMLDivElement>(null);

  let specificClass = "";
  let currentSlotId: string | null | undefined = null;
  let adFormat: string = "auto"; 

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
      adFormat = ""; 
      break;
  }

  useEffect(() => {
    // Check if the ref has an adsbygoogle element as a child
    if (adsEnabled && adsenseClientId && currentSlotId && typeof window !== 'undefined' && adContainerRef.current?.querySelector('.adsbygoogle')) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error(`Error pushing to adsbygoogle for slot ${currentSlotId} of type ${type}:`, e);
      }
    }
  }, [adsEnabled, adsenseClientId, currentSlotId, type]);

  if (loadingSettings) {
    return <div className={cn("ad-placeholder", specificClass, className, "bg-muted/50")}>Loading Ad Config...</div>;
  }

  if (!adsEnabled) {
    // If ads are globally disabled, render nothing.
    // Optionally, for development, you could show a message:
    // if (process.env.NODE_ENV === 'development') {
    //   return <div className={cn('ad-placeholder', specificClass, className)}>Ads Disabled (Admin)</div>;
    // }
    return null;
  }

  // Ads are enabled globally. Now determine what to show for this specific slot.
  const isSlotConfigured = adsenseClientId && currentSlotId;

  if (isSlotConfigured) {
    // Slot is configured for AdSense. Render the AdSense unit inside a styled placeholder.
    // The placeholder styling will be visible if AdSense doesn't load/fill.
    const adKey = `${type}-${adsenseClientId}-${currentSlotId || 'no-slot'}`; // Ensure currentSlotId is defined for key
    return (
      <div ref={adContainerRef} className={cn('ad-placeholder', specificClass, className)}>
        {/* Optional: A very subtle text hint, AdSense should cover this */}
        <span className="text-xs opacity-30 pointer-events-none absolute">Ad</span>
        <ins
          key={adKey}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={adsenseClientId}
          data-ad-slot={currentSlotId}
          data-ad-format={adFormat !== "" ? adFormat : undefined}
          data-full-width-responsive="true"
        ></ins>
      </div>
    );
  } else {
    // Ads are enabled globally, but this specific slot is NOT configured.
    // Show a clear "unconfigured" placeholder.
    return (
      <div className={cn('ad-placeholder', specificClass, className)}>
        Ad Unit Unconfigured ({type})
      </div>
    );
  }
};

export default AdPlaceholder;
