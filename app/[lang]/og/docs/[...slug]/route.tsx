import { documentImage, documentImageParams } from '@/lib/docs-image';
export const revalidate = false;
export const dynamicParams = false;
export async function GET(_req: Request, { params }: { params: Promise<{ lang?: string; slug: string[] }> }) {
  const { slug, lang } = await params;
  return documentImage(lang === 'zh-CN' ? 'zh-CN' : 'en', slug);
}
export function generateStaticParams() {
  return (['en', 'zh-CN'] as const).flatMap((lang) => documentImageParams(lang).map((params) => ({ lang, ...params })));
}
