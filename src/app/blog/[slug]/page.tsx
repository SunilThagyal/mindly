"use client";

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import BlogPostView from '@/components/blog/blog-post-view';
import type { Blog, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

async function getBlogBySlug(slug: string): Promise<Blog | null> {
  const blogsCol = collection(db, 'blogs');
  const q = query(blogsCol, where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const blogDoc = snapshot.docs[0];
  const blogData = blogDoc.data();

  // Increment views - ensure this runs only once per "real" view if possible
  // For this simple version, it increments on every load of this component
  // A more robust solution would involve server-side logic or more complex client-side tracking
  if (blogData.status === 'published') {
     await updateDoc(doc(db, 'blogs', blogDoc.id), { views: increment(1) });
  }
  
  return { 
    id: blogDoc.id,
    ...blogData,
    // Ensure Timestamps are correctly handled
    createdAt: blogData.createdAt instanceof Timestamp ? blogData.createdAt : Timestamp.now(),
    publishedAt: blogData.publishedAt instanceof Timestamp ? blogData.publishedAt : null,
    views: (blogData.views || 0) + (blogData.status === 'published' ? 1: 0) // Optimistic update for UI
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

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      notFound(); // Or redirect to a 404 page
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
          notFound(); // Trigger 404 if blog not found
        }
      } catch (error) {
        console.error("Error fetching blog:", error);
        // Handle error (e.g., show toast or error message)
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
    // This case should ideally be handled by notFound() during fetch,
    // but as a fallback:
    return <div className="text-center py-10">Blog post not found.</div>;
  }
  
  if (blog.status === 'draft' && (!useAuth().user || useAuth().user?.uid !== blog.authorId)) {
     return <div className="text-center py-10">This blog post is currently a draft and not publicly visible.</div>;
  }


  return <BlogPostView blog={blog} authorProfile={authorProfile} />;
}
