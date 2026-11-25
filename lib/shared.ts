import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'XGo Documentation';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').origin;

const getImageUrl = createGetUrl(docsImageRoute);

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png'];
  return { segments, url: getImageUrl(segments, page.locale) };
}
