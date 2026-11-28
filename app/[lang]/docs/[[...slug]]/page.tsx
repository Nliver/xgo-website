import { DocumentationPage, documentationMetadata } from '@/components/docs-page';
import { getDocsPages, resolveChineseDocs } from '@/lib/source';
import { notFound, redirect } from 'next/navigation';

type Locale = 'en' | 'zh-CN';
function getLocale(value?: string): Locale { if (value === 'zh-CN') return 'zh-CN'; if (!value || value === 'en') return 'en'; notFound(); }
function translatedPage(slug?: string[]) {
  const { page, redirectTo } = resolveChineseDocs(slug);
  if (page) return page;
  if (redirectTo) redirect(redirectTo.locale === 'en' ? redirectTo.url + '?translation=zh-CN' : redirectTo.url);
  notFound();
}
export default async function Page(props: { params: Promise<{ lang?: string; slug?: string[] }> }) {
  const { slug, lang } = await props.params;
  const locale = getLocale(lang);
  const page = locale === 'zh-CN' ? translatedPage(slug) : undefined;
  return <DocumentationPage slug={page?.slugs ?? slug} locale={locale} />;
}
export function generateStaticParams() { return getDocsPages().map((page) => ({ lang: page.locale, slug: page.slugs })); }
export async function generateMetadata(props: { params: Promise<{ lang?: string; slug?: string[] }> }) {
  const { slug, lang } = await props.params;
  const locale = getLocale(lang);
  const page = locale === 'zh-CN' ? translatedPage(slug) : undefined;
  return documentationMetadata(page?.slugs ?? slug, locale);
}
