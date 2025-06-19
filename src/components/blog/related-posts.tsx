
"use client";

import { useEffect, useState } from 'react';
import type { Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, orderBy, Timestamp, documentId } from 'firebase/firestore';
import BlogCard from './blog-card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';

interface RelatedPostsProps {
  currentBlogId: string;
  tags: string[];
}

export default function RelatedPosts({ currentBlogId, tags }: RelatedPostsProps) {
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      setLoading(true);
      if (!tags || tags.length === 0) {
        setRelatedBlogs([]);
        setLoading(false);
        return;
      }

      try {
        // Use the first 10 tags for 'array-contains-any' due to Firestore limits (max 30, but keeping it safer)
        const tagsToQuery = tags.slice(0, 10);
        
        const q = query(
          collection(db, 'blogs'),
          where('status', '==', 'published'),
          where('tags', 'array-contains-any', tagsToQuery),
          orderBy('publishedAt', 'desc'),
          limit(4) // Fetch a bit more to filter out the current post
        );

        const snapshot = await getDocs(q);
        const blogsData = snapshot.docs
          .map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
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
          })
          .filter(blog => blog.id !== currentBlogId) // Exclude current post
          .slice(0, 3); // Take top 3 distinct related posts

        setRelatedBlogs(blogsData);
      } catch (error) {
        console.error("Error fetching related posts:", error);
        setRelatedBlogs([]); // Clear on error
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [currentBlogId, tags]);

  if (loading) {
    return (
      <section className="mt-12 pt-8 border-t">
        <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Related Posts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (relatedBlogs.length === 0) {
    return (
        <section className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Related Posts</h2>
            <div className="text-center py-6 text-muted-foreground bg-muted/50 rounded-lg">
                <FileText className="mx-auto h-10 w-10 mb-3 opacity-70" />
                <p>No related posts found.</p>
            </div>
        </section>
    );
  }

  return (
    <section className="mt-12 pt-8 border-t">
      <h2 className="text-2xl font-headline font-semibold mb-6 text-foreground">Related Posts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedBlogs.map(blog => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
      </div>
    </section>
  );
}
