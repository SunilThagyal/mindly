
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  bio?: string;
  virtualEarnings?: number;
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

export const VIRTUAL_CURRENCY_RATE_PER_VIEW = 0.01; // $0.01 virtual currency per view

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
}
