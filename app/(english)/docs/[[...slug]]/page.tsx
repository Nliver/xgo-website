import { DocumentationPage, documentationMetadata } from '@/components/docs-page';
import { source } from '@/lib/source';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const { slug } = await props.params;
  return <DocumentationPage slug={slug} locale="en" />;
}

export function generateStaticParams() {
  return source.getPages('en').map((page) => ({ slug: page.slugs }));
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>) {
  const { slug } = await props.params;
  return documentationMetadata(slug, 'en');
}
