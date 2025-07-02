
import { notFound } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Blog } from '@/lib/types';
import BlogCard from '@/components/blog/blog-card';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

interface TagPageProps {
  params: { tag: string }; // e.g., "web-development"
}

// Helper to convert slug back to a displayable, capitalized tag
function formatTagFromSlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
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
    coverMediaType: data.coverMediaType || null,
    metaDescription: data.metaDescription || null,
    likes: data.likes || 0,
    likedBy: data.likedBy || [],
  } as Blog;
};

// The tag parameter is now a slug, e.g., "web-development"
async function getBlogsByTag(tagSlug: string): Promise<Blog[]> {
  const blogsCol = collection(db, 'blogs');
  
  // "web-development" -> "web development"
  const originalTagText = tagSlug.replace(/-/g, ' ');

  // Firestore's `array-contains` is case-sensitive. To provide a better experience,
  // we'll check for a few common casings using `array-contains-any`.
  const possibleTags = [
    originalTagText, // exact match
    originalTagText.toLowerCase(),
    originalTagText.toUpperCase(),
    // "web development" -> "Web Development"
    originalTagText.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
  ];
  const uniquePossibleTags = [...new Set(possibleTags)];

  const q = query(
    blogsCol,
    where('status', '==', 'published'),
    where('tags', 'array-contains-any', uniquePossibleTags),
    orderBy('publishedAt', 'desc')
  );

  const snapshot = await getDocs(q);

  // Since `array-contains-any` could potentially match tags with similar words but different full text,
  // we perform a final filter in code to ensure we only show posts for the exact tag (case-insensitively).
  const matchingBlogs = snapshot.docs
    .map(mapDocToBlog)
    .filter(blog => 
      blog.tags.some(t => t.toLowerCase() === originalTagText.toLowerCase())
    );

  return matchingBlogs;
}


export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const capitalizedTag = formatTagFromSlug(params.tag);

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

  const blogsFromDB = await getBlogsByTag(params.tag);

  // Serialize the blogs array to make it safe to pass to the client component
  const blogs = blogsFromDB.map(blog => ({
    ...blog,
    // Convert Timestamps to plain objects that are JSON serializable
    createdAt: JSON.parse(JSON.stringify(blog.createdAt)),
    publishedAt: blog.publishedAt ? JSON.parse(JSON.stringify(blog.publishedAt)) : null,
  }));

  const capitalizedTag = formatTagFromSlug(params.tag);

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
