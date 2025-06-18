import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bio?: string;
  // Virtual earnings, not real money
  virtualEarnings?: number; 
}

export interface Blog {
  id: string;
  title: string;
  content: string; // HTML content from rich text editor, or markdown
  slug: string;
  authorId: string;
  authorDisplayName: string | null;
  authorPhotoURL?: string | null;
  tags: string[];
  views: number;
  // Estimated reading time in minutes
  readingTime: number; 
  status: 'draft' | 'published';
  createdAt: Timestamp;
  publishedAt?: Timestamp | null;
  coverImageUrl?: string;
}

export interface BlogInput {
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'published';
  coverImageFile?: File | null;
  coverImageUrl?: string; // for updates if image not changed
}

export const VIRTUAL_CURRENCY_RATE_PER_VIEW = 0.01; // $0.01 virtual currency per view
