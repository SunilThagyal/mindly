
"use client";

import { usePathname } from 'next/navigation';
import AdPlaceholder from '@/components/layout/ad-placeholder';

export default function ConditionalFooterAd() {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith('/admin');

  if (isAdminPage) {
    return null;
  }

  return <AdPlaceholder type="mobile-sticky-footer" />;
}
