
"use client"; 

import { useEffect, useState } from 'react';
import BlogCard from '@/components/blog/blog-card';
import type { Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react'; // Added AlertTriangle

async function getTrendingBlogs(): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  const q = query(
    blogsCol,
    where('status', '==', 'published'),
    orderBy('views', 'desc'),
    limit(6)
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

export default function HomePage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError]  = useState<string | null>(null);


  useEffect(() => {
    async function fetchBlogs() {
      setLoading(true);
      setFetchError(null);
      try {
        const trendingBlogs = await getTrendingBlogs();
        setBlogs(trendingBlogs);
      } catch (error: any) {
        console.error("Error fetching trending blogs:", error);
         if (error.message && error.message.includes("firestore/failed-precondition") && error.message.includes("query requires an index")) {
          setFetchError(
            "ACTION REQUIRED: A Firestore index is missing to display trending blogs. Please:\n\n1. Open your browser's developer console.\n2. Find the error message from Firestore (it starts with 'FirebaseError: The query requires an index...').\n3. Click the link provided in that error message to go to the Firebase console and create the index.\n\nAfter creating the index, it may take a few minutes to build before blogs appear here."
          );
        } else {
          setFetchError("An error occurred while fetching trending blogs. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchBlogs();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-4 animate-fade-in">
          Discover Inspiring Stories
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{animationDelay: '0.2s'}}>
          Explore a universe of ideas, insights, and creativity on Blogchain.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-headline font-semibold mb-8 text-center sm:text-left text-foreground animate-fade-in" style={{animationDelay: '0.4s'}}>
          Trending Blogs
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, index) => (
              <div key={index} className="flex flex-col space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <div className="flex justify-between">
                   <Skeleton className="h-4 w-[50px]" />
                   <Skeleton className="h-4 w-[80px]" />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
             <div className="mt-6 text-center p-6 border border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p className="text-lg font-semibold mb-2">Error Loading Trending Blogs</p>
                <p className="text-sm whitespace-pre-wrap">{fetchError}</p>
                {fetchError.includes("ACTION REQUIRED") && (
                    <p className="text-xs mt-3">If the issue persists after creating the index and waiting a few minutes, please check the console again or contact support.</p>
                )}
             </div>
        ) : blogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-lg">No blogs available yet. Be the first to create one!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
