
import { notFound } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Blog } from '@/lib/types';
import BlogCard from '@/components/blog/blog-card';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

interface TagPageProps {
  params: { tag: string };
}

async function getBlogsByTag(tag: string): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  
  const q = query(
    blogsCol,
    where('status', '==', 'published'),
    where('tags', 'array-contains', tag),
    orderBy('publishedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    const qCaseInsensitive = query(
        blogsCol,
        where('status', '==', 'published'),
        where('tags', 'array-contains', tag.charAt(0).toUpperCase() + tag.slice(1)),
        orderBy('publishedAt', 'desc')
      );
    const snapshot2 = await getDocs(qCaseInsensitive);
    return snapshot2.docs.map(doc => doc.data() as Blog);
  }


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
      likes: data.likes || 0,
      likedBy: data.likedBy || [],
    } as Blog;
  });
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const decodedTag = decodeURIComponent(params.tag);
  const capitalizedTag = decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1);

  return {
    title: `Posts tagged with "${capitalizedTag}"`,
    description: `Explore all blog posts tagged with "${capitalizedTag}" on ${siteConfig.name}.`,
    robots: { index: true, follow: true },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  if (!params.tag) {
    notFound();
  }

  const decodedTag = decodeURIComponent(params.tag);
  const blogs = await getBlogsByTag(decodedTag);
  const capitalizedTag = decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12 text-center">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Category</p>
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-foreground mt-2">
          {capitalizedTag}
        </h1>
        <p className="text-lg text-muted-foreground mt-4">
          Showing {blogs.length} post{blogs.length !== 1 ? 's' : ''} tagged with "{capitalizedTag}".
        </p>
      </header>

      {blogs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {blogs.map((blog) => (
            <BlogCard key={blog.id} blog={blog} />
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-10">
          No posts found for this tag yet.
        </div>
      )}
    </div>
  );
}
