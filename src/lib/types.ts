
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
  adsEnabledForUser?: boolean; // Example, not fully implemented for per-user ad display
  adIntensityForUser?: 'global' | 'light' | 'medium' | 'high'; // Example

  // Monetization and Payment Details
  isMonetizationApproved?: boolean; // Admin sets this
  paymentCountry?: 'India' | 'USA' | 'Other' | null;
  paymentContactDetails?: string | null; // e.g., phone number for communication
  paymentAddress?: string | null; // Full address for certain payout methods or records

  // India Specific (can be one or the other, or PayPal)
  paymentUpiId?: string | null;
  paymentBankAccountHolderName?: string | null;
  paymentAccountNumber?: string | null;
  paymentBankName?: string | null;
  paymentIfscCode?: string | null;

  // PayPal (primary for non-India, option for India)
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
  minimumWithdrawalAmount?: number;
}

export interface WithdrawalRequest {
  id?: string; // Firestore document ID
  userId: string;
  userDisplayName: string | null; // Store for admin convenience
  userEmail: string | null; // Store for admin convenience
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  requestedAt: Timestamp;
  processedAt?: Timestamp | null;
  adminNotes?: string | null; // For rejection reasons or other notes
  // Snapshot of payment details at the time of request
  paymentDetailsSnapshot: {
    country?: UserProfile['paymentCountry'];
    contact?: UserProfile['paymentContactDetails'];
    address?: UserProfile['paymentAddress'];
    upiId?: UserProfile['paymentUpiId'];
    bankAccountHolderName?: UserProfile['paymentBankAccountHolderName'];
    accountNumber?: UserProfile['paymentAccountNumber'];
    bankName?: UserProfile['paymentBankName'];
    ifscCode?: UserProfile['paymentIfscCode'];
    paypalEmail?: UserProfile['paymentPaypalEmail'];
    chosenPaymentMethod?: 'upi' | 'bank' | 'paypal'; // To clarify which method user chose if multiple were available/filled
  };
}

export interface Notification {
  id: string;
  type: 'new_comment'; // Can be expanded later for other notification types
  blogId: string;
  blogSlug: string;
  blogTitle: string;
  commenterName: string;
  commentId: string;
  createdAt: Timestamp;
  isRead: boolean;
  link: string; // e.g., /blog/[slug]#comment-[commentId]
}
