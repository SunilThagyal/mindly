
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
  likes?: number; // Added for post likes count
  likedBy?: string[]; // Added for list of user UIDs who liked the post
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
  parentId?: string | null; 
  blogId?: string; 
  likes?: string[]; // Array of user UIDs who liked the comment
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
  type: 'new_comment' | 'new_reply' | 'new_like' | 'new_post_like'; // Added 'new_post_like'
  blogId: string;
  blogSlug: string;
  blogTitle: string;
  commenterName?: string | null; 
  replierName?: string | null;   
  likerName?: string | null; 
  likedCommentTextSnippet?: string | null;
  commentId?: string | null; // Optional for post likes
  parentCommentId?: string | null; 
  parentCommentAuthorId?: string | null; 
  createdAt: Timestamp;
  isRead: boolean;
  link: string;
}
