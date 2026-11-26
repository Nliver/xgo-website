import { XGoLogo } from '@/components/xgo-logo';
import { notFound } from 'next/navigation';
import { generateOGImage } from 'fumadocs-ui/og';
import { source } from './source';
import { getPageImageUrl } from './shared';

export function documentImage(locale: string, slug: string[]) {
  const page = source.getPage(slug.slice(0, -1), locale);
  if (!page) notFound();

  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    icon: <XGoLogo width={128} height={64} color="white" />,
    site: locale === 'zh-CN' ? '文档' : 'Documentation',
  });
}

export function documentImageParams(locale: string) {
  return source.getPages(locale).map((page) => ({
    slug: getPageImageUrl(page).segments,
  }));
}
