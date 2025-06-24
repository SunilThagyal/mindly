
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import type { UserProfile, EarningsSettings } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function incrementViewCount(blogId: string, authorId: string) {
  if (!blogId || !authorId) {
    return { success: false, message: 'Missing blogId or authorId.' };
  }

  // The client-side logic in BlogPostView now handles view de-duplication per session using sessionStorage.
  // This server action is now simplified to just perform the database increment.

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

    // Revalidate the path to ensure the new view count is shown on subsequent navigation.
    revalidatePath(`/blog/${blogId}`);
    return { success: true, message: 'View counted.' };
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return { success: false, message: 'Database error.' };
  }
}
