
import { MetadataRoute } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { siteConfig } from '@/config/site';
import type { Blog } from '@/lib/types';
import { slugify } from '@/lib/helpers';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // 1. Get all published blogs to use for posts and tags
  const blogsCol = collection(db, 'blogs');
  const q = query(blogsCol, where('status', '==', 'published'));
  const snapshot = await getDocs(q);

  // 2. Create blog post URLs and count tag frequencies
  const tagCounts: Record<string, number> = {};
  const blogPosts = snapshot.docs.map(doc => {
    const data = doc.data() as Blog;
    if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim() !== '') {
            const cleanTag = tag.trim();
            tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
          }
        });
    }
    return {
      url: `${baseUrl}/blog/${data.slug}`,
      lastModified: data.publishedAt?.toDate() || data.createdAt?.toDate() || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });
  
  // 3. Get top 10 tags and create their page URLs
  const sortedTags = Object.entries(tagCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 10)
    .map(([tag]) => tag);

  const tagRoutes = sortedTags.map(tag => ({
    url: `${baseUrl}/tags/${slugify(tag)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }));

  // 4. Define static page routes
  const staticRoutes = [
    '', 
    'about-us',
    'how-it-works',
    'contact-us',
    'privacy-policy',
    'terms-and-conditions',
  ].map((route) => ({
    url: `${baseUrl}/${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  return [...staticRoutes, ...blogPosts, ...tagRoutes];
}
