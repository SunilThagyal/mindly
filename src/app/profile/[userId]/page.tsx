
"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import UserProfileView from '@/components/profile/user-profile-view';
import type { UserProfile, Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
}

async function getUserBlogs(userId: string): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  const q = query(
    blogsCol,
    where('authorId', '==', userId),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
     return {
      id: doc.id,
      ...data,
      title: data.title || '',
      content: data.content || '',
      slug: data.slug || '',
      authorId: data.authorId || '',
      authorDisplayName: data.authorDisplayName || null,
      authorPhotoURL: data.authorPhotoURL || null,
      tags: data.tags || [],
      views: data.views || 0,
      readingTime: data.readingTime || 0,
      status: data.status || 'draft',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
      publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt : null,
      coverImageUrl: data.coverImageUrl || null,
    } as Blog;
  });
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = typeof params.userId === 'string' ? params.userId : '';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      notFound();
      return;
    }

    async function fetchProfileData() {
      try {
        const userProfileData = await getUserProfile(userId);
        if (userProfileData) {
          setProfile(userProfileData);
          const userBlogsData = await getUserBlogs(userId);
          setBlogs(userBlogsData);
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        // Handle error (e.g., show toast)
      } finally {
        setLoading(false);
      }
    }
    fetchProfileData();
  }, [userId]);

  if (loading) {
    return (
       <div className="container mx-auto px-4 py-8 space-y-10">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-card rounded-xl shadow-lg">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-4 mt-2">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-6 w-1/4" />
            </div>
          </div>
        </div>
        <div>
            <Skeleton className="h-8 w-1/3 mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <div key={i} className="flex flex-col space-y-3">
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    // This case should be handled by notFound() during fetch
    return <div className="text-center py-10">User profile not found.</div>;
  }

  return <UserProfileView profile={profile} blogs={blogs} />;
}
