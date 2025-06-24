import { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/my-blogs/',
        '/monetization/',
        '/auth/',
        '/blog/create/',
        '/blog/edit/',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
