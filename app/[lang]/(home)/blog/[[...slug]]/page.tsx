import { BlogPage, blogMetadata } from '@/components/blog-page';
import { getBlogPosts } from '@/lib/source';
type Locale = 'en' | 'zh-CN';
const localeOf = (lang: string): Locale => lang === 'zh-CN' ? 'zh-CN' : 'en';
export default async function Page({ params }: { params: Promise<{ lang?: string; slug?: string[] }> }) {
  const { slug, lang } = await params;
  return <BlogPage slug={slug} locale={localeOf(lang ?? 'en')} />;
}
export function generateStaticParams() { return (['en', 'zh-CN'] as const).flatMap((lang) => [{ lang, slug: [] }, ...getBlogPosts(lang).map((page) => ({ lang, slug: page.slugs.slice(1) }))]); }
export async function generateMetadata({ params }: { params: Promise<{ lang?: string; slug?: string[] }> }) { const { slug, lang } = await params; return blogMetadata(slug, localeOf(lang ?? 'en')); }
