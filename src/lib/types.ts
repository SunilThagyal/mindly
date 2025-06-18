
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null; // Can remain optional here as userProfile might not always have it from auth
  bio?: string;
  // Virtual earnings, not real money
  virtualEarnings?: number;
}

export interface Blog {
  id: string;
  title: string;
  content: string; // HTML content from rich text editor
  slug: string;
  authorId: string;
  authorDisplayName: string | null;
  authorPhotoURL: string | null; // Changed from optional to string | null
  tags: string[];
  views: number;
  // Estimated reading time in minutes
  readingTime: number;
  status: 'draft' | 'published';
  createdAt: Timestamp;
  publishedAt: Timestamp | null; // Changed from optional to Timestamp | null
  coverImageUrl: string | null; // Changed from optional to string | null
}

export interface BlogInput {
  title: string;
  content: string; // This would be HTML string
  tags: string[];
  status: 'draft' | 'published';
  coverImageFile?: File | null;
  coverImageUrl: string | null; // Changed from optional string to string | null
}

export const VIRTUAL_CURRENCY_RATE_PER_VIEW = 0.01; // $0.01 virtual currency per view
