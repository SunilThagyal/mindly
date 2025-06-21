
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostView from '@/components/blog/blog-post-view';
import type { Blog, UserProfile, EarningsSettings } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context'; // Keep for potential server-side auth checks in future

// Helper function to get the first 150 characters of plain text from HTML
function getHtmlExcerpt(html: string, length: number = 150): string {
    if (!html) return '';
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
}


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

  // This logic now runs on the server during the request for the page.
  // It's a good practice to avoid incrementing for every single server render,
  // especially by bots. A more robust solution might involve a separate API endpoint
  // called from the client, but for now, we'll keep the server-side increment.
  if (process.env.NODE_ENV === 'production' && blogData.status === 'published') {
    const blogRef = doc(db, 'blogs', blogDoc.id);
    await updateDoc(blogRef, { views: increment(1) });
    currentViews++; 

    if (blogData.authorId) {
      const authorRef = doc(db, 'users', blogData.authorId);
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
    views: currentViews,
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

// Dynamic Metadata Generation for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const blog = await getBlogBySlug(params.slug);

  if (!blog) {
    return {
      title: 'Blog Post Not Found',
      description: 'The blog post you are looking for could not be found.',
    };
  }

  const excerpt = getHtmlExcerpt(blog.content);

  return {
    title: blog.title,
    description: excerpt,
    openGraph: {
      title: blog.title,
      description: excerpt,
      images: [
        {
          url: blog.coverImageUrl || '/default-og-image.png', // Provide a fallback OG image
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
      type: 'article',
      publishedTime: blog.publishedAt ? blog.publishedAt.toDate().toISOString() : new Date().toISOString(),
      authors: [blog.authorDisplayName || 'Anonymous'],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.title,
      description: excerpt,
      images: [blog.coverImageUrl || '/default-og-image.png'],
    },
  };
}


export default async function BlogPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  if (!slug) {
    notFound();
  }

  const blog = await getBlogBySlug(slug);
  
  if (!blog) {
    notFound();
  }

  // NOTE: This check cannot be fully implemented on the server without knowing the current user.
  // The logic in BlogPostView will handle the final visibility check on the client.
  // We allow fetching here, but the client component will decide whether to render.
  // if (blog.status === 'draft') {
  //   // You might want to check user permissions here if you have server-side auth access
  // }
  
  const authorProfile = await getAuthorProfile(blog.authorId);

  return <BlogPostView blog={blog} authorProfile={authorProfile} />;
}
