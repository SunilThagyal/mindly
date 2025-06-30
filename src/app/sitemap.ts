import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { siteConfig } from '@/config/site';
import type { Blog } from '@/lib/types';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // 1. Get all published blogs to use for posts and tags
  const blogsCol = collection(db, 'blogs');
  const q = query(blogsCol, where('status', '==', 'published'));
  const snapshot = await getDocs(q);

  // 2. Create blog post URLs and gather all unique tags
  const allTags = new Set<string>();
  const blogPosts = snapshot.docs.map(doc => {
    const data = doc.data() as Blog;
    if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach(tag => allTags.add(tag));
    }
    return {
      url: `${baseUrl}/blog/${data.slug}`,
      lastModified: data.publishedAt?.toDate() || data.createdAt?.toDate() || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });
  
  // 3. Create tag page URLs
  const tagRoutes = Array.from(allTags).map(tag => ({
    url: `${baseUrl}/tags/${encodeURIComponent(tag.toLowerCase())}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // 4. Define static page routes
  const staticRoutes = [
    '', // Homepage
    '/about-us',
    '/how-it-works',
    '/contact-us',
    '/privacy-policy',
    '/terms-and-conditions',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return [...staticRoutes, ...blogPosts, ...tagRoutes];
}
