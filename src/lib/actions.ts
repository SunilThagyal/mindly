
'use server';

import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import type { UserProfile, EarningsSettings } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function incrementViewCount(blogId: string, authorId: string) {
  if (!blogId || !authorId) {
    return { success: false, message: 'Missing blogId or authorId.' };
  }

  const cookieStore = cookies();
  const viewedCookie = cookieStore.get('viewedBlogs');
  let viewedBlogs: string[] = [];

  if (viewedCookie) {
    try {
      const parsed = JSON.parse(viewedCookie.value);
      if (Array.isArray(parsed)) {
        viewedBlogs = parsed;
      }
    } catch (e) {
      console.error("Failed to parse viewedBlogs cookie:", e);
    }
  }

  if (viewedBlogs.includes(blogId)) {
    return { success: false, message: 'View already counted for this session.' };
  }

  try {
    const blogRef = doc(db, 'blogs', blogId);
    await updateDoc(blogRef, { views: increment(1) });

    const authorRef = doc(db, 'users', authorId);
    const authorSnap = await getDoc(authorRef);
    if (authorSnap.exists()) {
      const authorProfile = authorSnap.data() as UserProfile;
      if (authorProfile.isMonetizationApproved) {
        const earningsSettingsRef = doc(db, 'settings', 'earnings');
        const earningsSettingsSnap = await getDoc(earningsSettingsRef);
        let baseEarning = 0.01;
        if (earningsSettingsSnap.exists()) {
          baseEarning = (earningsSettingsSnap.data() as EarningsSettings).baseEarningPerView || 0.01;
        }
        if (baseEarning > 0) {
          await updateDoc(authorRef, { virtualEarnings: increment(baseEarning) });
        }
      }
    }
    
    viewedBlogs.push(blogId);
    cookieStore.set('viewedBlogs', JSON.stringify(viewedBlogs), {
      maxAge: 12 * 60 * 60, // 12 hours
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    revalidatePath(`/blog/${blogId}`);
    return { success: true, message: 'View counted.' };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { success: false, message: 'Database error.' };
  }
}
