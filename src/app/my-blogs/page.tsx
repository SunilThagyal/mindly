
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import BlogCard from '@/components/blog/blog-card';
import type { Blog } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, FileText } from 'lucide-react';

async function getUserBlogs(userId: string, status?: 'published' | 'draft'): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  let q;
  if (status) {
    q = query(
      blogsCol,
      where('authorId', '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  } else {
     q = query(
      blogsCol,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  console.log(
    `[MyBlogsPage] Firestore query for ${status || 'all user'} blogs by user ${userId} returned ${snapshot.docs.length} documents.
    IF THIS IS UNEXPECTEDLY ZERO, **CHECK BROWSER CONSOLE FOR FIRESTORE INDEX ERRORS.**
    Firestore may require a composite index for this query (e.g., on authorId, status, createdAt). Look for a URL in the console error to create it.`
  );
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

export default function MyBlogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [publishedBlogs, setPublishedBlogs] = useState<Blog[]>([]);
  const [draftBlogs, setDraftBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }

    async function fetchMyBlogs() {
      setIsLoading(true);
      try {
        const [fetchedPublished, fetchedDrafts] = await Promise.all([
          getUserBlogs(user!.uid, 'published'),
          getUserBlogs(user!.uid, 'draft')
        ]);
        setPublishedBlogs(fetchedPublished);
        setDraftBlogs(fetchedDrafts);
      } catch (error) {
        console.error("Error fetching user's blogs:", error);
        // Handle error (e.g., show toast)
      } finally {
        setIsLoading(false);
      }
    }
    fetchMyBlogs();
  }, [user, authLoading, router]);

  const renderBlogList = (blogs: Blog[], type: string) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {Array(3).fill(0).map((_, index) => (
            <div key={index} className="flex flex-col space-y-3">
              <Skeleton className="h-[200px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (blogs.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg mb-4">No {type} blogs yet.</p>
          <Button asChild>
            <Link href="/blog/create" className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Blog
            </Link>
          </Button>
          <p className="mt-6 text-sm p-4 border border-dashed border-primary/50 rounded-md bg-primary/5">
            <strong>Important:</strong> If you've created blogs and they aren't appearing,
            please <strong className="text-primary">check your browser's developer console</strong> for any Firestore error messages.
            You might need to create a composite index in Firestore. Firestore usually provides a direct link in the error message to create it.
          </p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 mt-6">
        {blogs.map((blog) => (
          <BlogCard key={blog.id} blog={blog} />
        ))}
      </div>
    );
  };


  if (authLoading && !user) { 
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Skeleton className="h-10 w-1/4 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, index) => (
             <div key={index} className="flex flex-col space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
             </div>
          ))}
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-headline font-bold text-foreground mb-4 sm:mb-0">My Blogs</h1>
        <Button asChild>
          <Link href="/blog/create" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Blog
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="published" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
          <TabsTrigger value="published">Published ({publishedBlogs.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftBlogs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="published">
          {renderBlogList(publishedBlogs, "published")}
        </TabsContent>
        <TabsContent value="drafts">
          {renderBlogList(draftBlogs, "draft")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
