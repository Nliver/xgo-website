import { BlogPage, blogMetadata } from '@/components/blog-page';
import { getBlogPosts } from '@/lib/source';

export default async function Page({ params }: PageProps<'/blog/[[...slug]]'>) {
  const { slug } = await params;
  return <BlogPage slug={slug} locale="en" />;
}

export function generateStaticParams() {
  return [{ slug: [] }, ...getBlogPosts('en').map((page) => ({ slug: page.slugs.slice(1) }))];
}

export async function generateMetadata({ params }: PageProps<'/blog/[[...slug]]'>) {
  return blogMetadata((await params).slug, 'en');
}
