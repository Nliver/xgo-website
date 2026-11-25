import { siteOrigin } from '@/lib/shared';
import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: new URL('/', siteOrigin).href, changeFrequency: 'weekly', priority: 1 },
    ...source.getPages().map((page) => ({
      url: new URL(page.url, siteOrigin).href,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
