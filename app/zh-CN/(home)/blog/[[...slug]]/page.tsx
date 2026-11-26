import { BlogPage, blogMetadata } from '@/components/blog-page';
import { generateStaticParams as englishParams } from '@/app/(english)/(home)/blog/[[...slug]]/page';

export default async function Page({ params }: PageProps<'/zh-CN/blog/[[...slug]]'>) {
  const { slug } = await params;
  return <BlogPage slug={slug} locale="zh-CN" />;
}

export const generateStaticParams = englishParams;

export async function generateMetadata({ params }: PageProps<'/zh-CN/blog/[[...slug]]'>) {
  return blogMetadata((await params).slug, 'zh-CN');
}
