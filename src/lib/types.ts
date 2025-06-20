
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bio?: string;
  virtualEarnings?: number;
  isBlocked?: boolean;
  postingRestricted?: boolean;
  postingRestrictionReason?: string | null;
  adsEnabledForUser?: boolean;
  adIntensityForUser?: 'global' | 'light' | 'medium' | 'high';

  // New fields for monetization and payment
  isMonetizationApproved?: boolean;
  paymentCountry?: string | null;
  paymentContactDetails?: string | null; // e.g., phone number
  paymentAddress?: string | null;
  paymentUpiId?: string | null; // India specific
  paymentAccountNumber?: string | null; // India specific
  paymentBankName?: string | null; // India specific
  paymentIfscCode?: string | null; // India specific
  paymentPaypalEmail?: string | null;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  slug: string;
  authorId: string;
  authorDisplayName: string | null;
  authorPhotoURL: string | null;
  tags: string[];
  views: number;
  readingTime: number;
  status: 'draft' | 'published';
  createdAt: Timestamp;
  publishedAt: Timestamp | null;
  coverImageUrl: string | null;
}

export interface BlogInput {
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'published';
  coverImageFile?: File | null;
  coverImageUrl: string | null;
}

// This constant will be superseded by a dynamic setting from EarningsSettingsContext
// export const VIRTUAL_CURRENCY_RATE_PER_VIEW = 0.01;

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  text: string;
  createdAt: Timestamp;
}

export interface AdSettings {
  adsEnabled: boolean;
  adDensity: 'high' | 'medium' | 'low';
  adsenseClientId?: string | null;
  adsenseHeaderSlotId?: string | null;
  adsenseInContentSlotId?: string | null;
  adsenseSidebarSlotId?: string | null;
  adsenseBelowContentSlotId?: string | null;
  adsenseMobileStickyFooterSlotId?: string | null;
}

export interface EarningsSettings {
  baseEarningPerView: number;
}

export interface WithdrawalRequest {
  id?: string;
  userId: string;
  userDisplayName: string | null;
  userEmail: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  requestedAt: Timestamp;
  processedAt?: Timestamp | null;
  adminNotes?: string | null;
  paymentDetailsSnapshot: { // Store a snapshot of payment details at time of request
    country?: string | null;
    contact?: string | null;
    address?: string | null;
    upiId?: string | null;
    accountNumber?: string | null;
    bankName?: string | null;
    ifscCode?: string | null;
    paypalEmail?: string | null;
  };
}
