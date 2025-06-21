
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostView from '@/components/blog/blog-post-view';
import type { Blog, UserProfile, EarningsSettings } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { cookies } from 'next/headers';

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

  // New cookie-based view counting logic
  if (blogData.status === 'published') {
    const cookieStore = cookies();
    const viewedCookie = cookieStore.get('viewedBlogs');
    let viewedBlogs: string[] = [];

    if (viewedCookie) {
      try {
        const parsed = JSON.parse(viewedCookie.value);
        if (Array.isArray(parsed)) {
          viewedBlogs = parsed;
        }
      } catch (e) {
        console.error("Failed to parse viewedBlogs cookie:", e);
        viewedBlogs = [];
      }
    }

    if (!viewedBlogs.includes(blogDoc.id)) {
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
      
      // Update cookie
      viewedBlogs.push(blogDoc.id);
      cookieStore.set('viewedBlogs', JSON.stringify(viewedBlogs), {
        maxAge: 12 * 60 * 60, // 12 hours
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
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
    createdAt: blogData.createdAt,
    publishedAt: blogData.publishedAt,
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
      publishedTime: blog.publishedAt ? new Date(blog.publishedAt.seconds * 1000).toISOString() : new Date().toISOString(),
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

  const blogFromDB = await getBlogBySlug(slug);
  
  if (!blogFromDB) {
    notFound();
  }

  const authorProfile = await getAuthorProfile(blogFromDB.authorId);
  
  // Serialize the blog object to make it safe to pass to the client component
  const blog = {
    ...blogFromDB,
    // Convert Timestamps to plain objects that are JSON serializable
    createdAt: JSON.parse(JSON.stringify(blogFromDB.createdAt)),
    publishedAt: blogFromDB.publishedAt ? JSON.parse(JSON.stringify(blogFromDB.publishedAt)) : null,
  };


  return <BlogPostView blog={blog} authorProfile={authorProfile} />;
}
