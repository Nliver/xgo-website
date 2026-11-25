import { homePaths, siteOrigin } from '@/lib/shared';
import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...Object.values(homePaths).map((path) => ({
      url: new URL(path, siteOrigin).href, changeFrequency: 'weekly' as const, priority: 1,
    })),
    ...source.getPages().map((page) => ({
      url: new URL(page.url, siteOrigin).href,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
