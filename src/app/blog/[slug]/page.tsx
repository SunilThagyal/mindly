
"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import BlogPostView from '@/components/blog/blog-post-view';
import type { Blog, UserProfile, EarningsSettings } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';

async function getBlogBySlug(slug: string): Promise<Blog | null> {
  const blogsCol = collection(db, 'blogs');
  const q = query(blogsCol, where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const blogDoc = snapshot.docs[0];
  const blogData = blogDoc.data();
  let currentViews = blogData.views || 0;

  if (blogData.status === 'published') {
    // Increment blog views
    const blogRef = doc(db, 'blogs', blogDoc.id);
    await updateDoc(blogRef, { views: increment(1) });
    currentViews++; // Reflect incremented view for current load

    // If author is monetized, increment their earnings
    if (blogData.authorId) {
      const authorRef = doc(db, 'users', blogData.authorId);
      const authorSnap = await getDoc(authorRef);
      if (authorSnap.exists()) {
        const authorProfile = authorSnap.data() as UserProfile;
        if (authorProfile.isMonetizationApproved) {
          const earningsSettingsRef = doc(db, 'settings', 'earnings');
          const earningsSettingsSnap = await getDoc(earningsSettingsRef);
          let baseEarning = 0.01; // Default
          if (earningsSettingsSnap.exists()) {
            baseEarning = (earningsSettingsSnap.data() as EarningsSettings).baseEarningPerView || 0.01;
          }
          if (baseEarning > 0) { // Ensure earnings rate is positive
            await updateDoc(authorRef, { virtualEarnings: increment(baseEarning) });
          }
        }
      }
    }
  }

  return {
    id: blogDoc.id,
    ...blogData,
    title: blogData.title || '',
    content: blogData.content || '',
    slug: blogData.slug || '',
    authorId: blogData.authorId || '',
    authorDisplayName: blogData.authorDisplayName || null,
    authorPhotoURL: blogData.authorPhotoURL || null,
    tags: blogData.tags || [],
    views: currentViews, // Use the updated view count
    readingTime: blogData.readingTime || 0,
    status: blogData.status || 'draft',
    createdAt: blogData.createdAt instanceof Timestamp ? blogData.createdAt : Timestamp.now(),
    publishedAt: blogData.publishedAt instanceof Timestamp ? blogData.publishedAt : null,
    coverImageUrl: blogData.coverImageUrl || null,
    likes: blogData.likes || 0,
    likedBy: blogData.likedBy || [],
  } as Blog;
}

async function getAuthorProfile(authorId: string): Promise<UserProfile | null> {
  if (!authorId) return null;
  const userDocRef = doc(db, 'users', authorId);
  const userSnap = await getDoc(userDocRef);
  return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
}


export default function BlogPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const [blog, setBlog] = useState<Blog | null>(null);
  const [authorProfile, setAuthorProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth(); // Call useAuth at the top level

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      notFound();
      return;
    }

    async function fetchBlogData() {
      try {
        const fetchedBlog = await getBlogBySlug(slug);
        if (fetchedBlog) {
          setBlog(fetchedBlog);
          if (fetchedBlog.authorId) {
            const fetchedAuthor = await getAuthorProfile(fetchedBlog.authorId);
            setAuthorProfile(fetchedAuthor);
          }
        } else {
          notFound();
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
        // Consider setting an error state here to show a user-friendly message
      } finally {
        setLoading(false);
      }
    }
    fetchBlogData();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-8">
        <Skeleton className="h-96 w-full rounded-lg" />
        <Skeleton className="h-12 w-3/4" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-1/4" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!blog) {
    // This typically means notFound() was called or an error occurred
    // notFound() will render the not-found.tsx page
    return null; 
  }

  if (blog.status === 'draft' && (!authUser || authUser?.uid !== blog.authorId)) {
     return <div className="text-center py-10">This blog post is currently a draft and not publicly visible.</div>;
  }

  return <BlogPostView blog={blog} authorProfile={authorProfile} />;
}
