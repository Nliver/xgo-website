import { DocumentationPage, documentationMetadata } from '@/components/docs-page';
import { getDocsPages, resolveChineseDocs } from '@/lib/source';
import { notFound, redirect } from 'next/navigation';

function translatedPage(slug?: string[]) {
  const { page, redirectTo } = resolveChineseDocs(slug);
  if (page) return page;
  if (redirectTo) {
    redirect(redirectTo.locale === 'en' ? `${redirectTo.url}?translation=zh-CN` : redirectTo.url);
  }
  notFound();
}

export default async function Page(props: PageProps<'/zh-CN/docs/[[...slug]]'>) {
  const { slug } = await props.params;
  const page = translatedPage(slug);
  return <DocumentationPage slug={page.slugs} locale="zh-CN" />;
}

export function generateStaticParams() {
  const paths = new Map(getDocsPages().map((page) => [page.slugs.join('/'), page.slugs]));
  return Array.from(paths.values(), (slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<'/zh-CN/docs/[[...slug]]'>) {
  const { slug } = await props.params;
  const page = translatedPage(slug);
  return documentationMetadata(page.slugs, 'zh-CN');
}
