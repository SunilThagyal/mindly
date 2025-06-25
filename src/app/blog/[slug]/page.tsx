
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlogPostView from '@/components/blog/blog-post-view';
import type { Blog, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { cache } from 'react';
import JsonLd from '@/components/seo/json-ld';
import { siteConfig } from '@/config/site';

// Helper function to get the first 150 characters of plain text from HTML
function getHtmlExcerpt(html: string, length: number = 160): string {
    if (!html) return '';
    const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return plainText.length > length ? plainText.substring(0, length) + '...' : plainText;
}

const getBlogBySlug = cache(async (slug: string): Promise<Blog | null> => {
  const blogsCol = collection(db, 'blogs');
  const q = query(blogsCol, where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const blogDoc = snapshot.docs[0];
  const blogData = blogDoc.data();

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
    views: blogData.views || 0,
    readingTime: blogData.readingTime || 0,
    status: blogData.status || 'draft',
    createdAt: blogData.createdAt,
    publishedAt: blogData.publishedAt,
    coverImageUrl: blogData.coverImageUrl || null,
    coverMediaType: blogData.coverMediaType || null,
    metaDescription: blogData.metaDescription || null,
    keywords: blogData.keywords || [],
    likes: blogData.likes || 0,
    likedBy: blogData.likedBy || [],
  } as Blog;
});

const getAuthorProfile = cache(async (authorId: string): Promise<UserProfile | null> => {
  if (!authorId) return null;
  const userDocRef = doc(db, 'users', authorId);
  const userSnap = await getDoc(userDocRef);
  return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
});

// Dynamic Metadata Generation for SEO
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const blog = await getBlogBySlug(params.slug);

  if (!blog) {
    return {
      title: 'Blog Post Not Found',
      description: 'The blog post you are looking for could not be found.',
    };
  }

  const excerpt = blog.metaDescription || getHtmlExcerpt(blog.content);
  const publishedTime = blog.publishedAt ? new Date(blog.publishedAt.seconds * 1000).toISOString() : new Date().toISOString();

  return {
    title: blog.title,
    description: excerpt,
    keywords: blog.keywords && blog.keywords.length > 0 ? blog.keywords : undefined,
    alternates: {
      canonical: `/blog/${blog.slug}`,
    },
    openGraph: {
      title: blog.title,
      description: excerpt,
      url: `/blog/${blog.slug}`,
      images: [
        {
          url: blog.coverImageUrl || '/default-og-image.png', // Provide a fallback OG image
          width: 1200,
          height: 630,
          alt: blog.title,
        },
      ],
      type: 'article',
      publishedTime: publishedTime,
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
  
  if (!blogFromDB || blogFromDB.status !== 'published') {
    notFound();
  }

  const authorProfile = await getAuthorProfile(blogFromDB.authorId);
  
  // Serialize the blog object to make it safe to pass to the client component
  const blog = {
    ...blogFromDB,
    createdAt: JSON.parse(JSON.stringify(blogFromDB.createdAt)),
    publishedAt: blogFromDB.publishedAt ? JSON.parse(JSON.stringify(blogFromDB.publishedAt)) : null,
  };

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteConfig.url}/blog/${blog.slug}`,
    },
    headline: blog.title,
    description: blog.metaDescription || getHtmlExcerpt(blog.content),
    image: blog.coverImageUrl || `${siteConfig.url}/default-og-image.png`,
    author: {
      '@type': 'Person',
      name: authorProfile?.displayName || blog.authorDisplayName || 'Anonymous',
      url: authorProfile ? `${siteConfig.url}/profile/${authorProfile.uid}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/default-og-image.png`, // Consider a proper logo image
      },
    },
    datePublished: blog.publishedAt ? new Date(blog.publishedAt.seconds * 1000).toISOString() : new Date().toISOString(),
    dateModified: blog.createdAt ? new Date(blog.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
  };

  return (
    <>
      <JsonLd data={jsonLdData} />
      <BlogPostView blog={blog} authorProfile={authorProfile} />
    </>
  );
}
