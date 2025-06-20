
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

  isMonetizationApproved?: boolean; 
  paymentCountry?: 'India' | 'USA' | 'Other' | null;
  paymentContactDetails?: string | null; 
  paymentAddress?: string | null; 

  paymentUpiId?: string | null;
  paymentBankAccountHolderName?: string | null;
  paymentAccountNumber?: string | null;
  paymentBankName?: string | null;
  paymentIfscCode?: string | null;

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
  parentId?: string | null; // For replies
  blogId?: string; // Denormalizing blogId for easier notification queries if needed
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
  id?: string; 
  userId: string;
  userDisplayName: string | null; 
  userEmail: string | null; 
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  requestedAt: Timestamp;
  processedAt?: Timestamp | null;
  adminNotes?: string | null; 
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
    chosenPaymentMethod?: 'upi' | 'bank' | 'paypal'; 
  };
}

export interface Notification {
  id: string;
  type: 'new_comment' | 'new_reply';
  blogId: string;
  blogSlug: string;
  blogTitle: string;
  commenterName?: string | null; // For new_comment type
  replierName?: string | null;   // For new_reply type
  commentId: string; // ID of the new comment or reply
  parentCommentId?: string | null; // ID of the parent comment if it's a reply
  parentCommentAuthorId?: string | null; // Used to send notification to parent comment author
  createdAt: Timestamp;
  isRead: boolean;
  link: string;
}

