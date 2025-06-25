
import { notFound } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Blog } from '@/lib/types';
import BlogCard from '@/components/blog/blog-card';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

interface TagPageProps {
  params: { tag: string };
}

// Helper to map a Firestore document to the Blog type, ensuring ID is included
const mapDocToBlog = (doc: DocumentData): Blog => {
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
    keywords: data.keywords || [],
    views: data.views || 0,
    readingTime: data.readingTime || 0,
    status: data.status || 'draft',
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
    publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt : null,
    coverImageUrl: data.coverImageUrl || null,
    metaDescription: data.metaDescription || null,
    likes: data.likes || 0,
    likedBy: data.likedBy || [],
  } as Blog;
};

async function getBlogsByTag(tag: string): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  
  const q = query(
    blogsCol,
    where('status', '==', 'published'),
    where('tags', 'array-contains', tag),
    orderBy('publishedAt', 'desc')
  );

  let snapshot: QuerySnapshot<DocumentData>;
  snapshot = await getDocs(q);

  // If the initial query returns no results, try a case-insensitive fallback (e.g., 'React' vs 'react')
  if (snapshot.empty) {
    const qCaseInsensitive = query(
        blogsCol,
        where('status', '==', 'published'),
        where('tags', 'array-contains', tag.charAt(0).toUpperCase() + tag.slice(1)),
        orderBy('publishedAt', 'desc')
      );
    snapshot = await getDocs(qCaseInsensitive);
  }

  // Use the helper function to ensure 'id' is always mapped correctly
  return snapshot.docs.map(mapDocToBlog);
}


export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const decodedTag = decodeURIComponent(params.tag);
  const capitalizedTag = decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1);

  return {
    title: `Posts tagged with "${capitalizedTag}"`,
    description: `Explore all blog posts tagged with "${capitalizedTag}" on ${siteConfig.name}.`,
    alternates: {
      canonical: `/tags/${params.tag}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  if (!params.tag) {
    notFound();
  }

  const decodedTag = decodeURIComponent(params.tag);
  const blogsFromDB = await getBlogsByTag(decodedTag);

  // Serialize the blogs array to make it safe to pass to the client component
  const blogs = blogsFromDB.map(blog => ({
    ...blog,
    // Convert Timestamps to plain objects that are JSON serializable
    createdAt: JSON.parse(JSON.stringify(blog.createdAt)),
    publishedAt: blog.publishedAt ? JSON.parse(JSON.stringify(blog.publishedAt)) : null,
  }));

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
